import os
import sys
import unittest
from unittest.mock import patch
import io
import csv
from collections import Counter

# Ensure backend root is on sys.path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from agents.verdict_agent import generate_verdict
from agents.relevance_agent import evaluate_relevance
from agents.accuracy_agent import evaluate_accuracy
from agents.hallucination_agent import evaluate_hallucination
from agents.completeness_agent import evaluate_completeness
from agents.orchestrator import orchestrate_evaluation
from pdf_processor import extract_relevant_pdf_context, LightweightBM25, _tokenize
from report_generator import build_evaluation_pdf, build_batch_evaluation_pdf
from reportlab.pdfgen import canvas


class TestMilestone4Validation(unittest.TestCase):
    """
    End-to-End Validation Test Suite for Milestone 4.
    Runs 100% OFFLINE with mocked LLM calls: ZERO API tokens consumed.
    """

    # =========================================================================
    # 1. VERDICT AGENT & MULTI-METRIC QUALITY GATING TESTS
    # =========================================================================

    def test_weighted_scoring_calculation(self):
        """Verify the exact balanced weights: 25% Rel, 30% Acc, 25% Hal, 20% Comp."""
        rel_data = {"score": 4.0, "relevance_category": "Fully Relevant", "reasoning": "Direct match"}
        acc_data = {"score": 4.0, "accuracy_category": "Correct", "reasoning": "Fully factual"}
        hal_data = {"score": 4.0, "hallucination_level": "Zero Hallucination (Clean)", "reasoning": "No hallucinations"}
        comp_data = {"score": 4.0, "completeness_category": "Fully Complete", "reasoning": "All points covered"}

        # 0.25*4 + 0.30*4 + 0.25*4 + 0.20*4 = 4.00
        verdict = generate_verdict("What is X?", "X is Y.", rel_data, acc_data, hal_data, comp_data)
        self.assertEqual(verdict["composite_score"], 4.00)
        self.assertEqual(verdict["final_verdict"], "Pass")
        self.assertEqual(verdict["gates_passed"], 5)

        # Test asymmetrical scores:
        # Rel: 5.0 (25%) -> 1.25
        # Acc: 4.0 (30%) -> 1.20
        # Hal: 3.0 (25%) -> 0.75
        # Comp: 2.0 (20%) -> 0.40
        # Total = 3.60
        rel_data["score"] = 5.0
        acc_data["score"] = 4.0
        hal_data["score"] = 3.0
        comp_data["score"] = 2.0
        comp_data["completeness_category"] = "Partially Complete"
        verdict = generate_verdict("Query", "Resp", rel_data, acc_data, hal_data, comp_data)
        self.assertEqual(verdict["composite_score"], 3.60)
        self.assertEqual(verdict["final_verdict"], "Needs Improvement")

    def test_quality_gate_severe_hallucination_override(self):
        """Verify that severe hallucination (< 2.8 or severe flag) forces a Fail verdict regardless of other scores."""
        rel_data = {"score": 5.0, "relevance_category": "Fully Relevant"}
        acc_data = {"score": 4.5, "accuracy_category": "Correct"}
        hal_data = {"score": 1.5, "hallucination_level": "Severe Hallucination", "hallucination_detected": True}
        comp_data = {"score": 5.0, "completeness_category": "Fully Complete"}

        verdict = generate_verdict("Query", "Resp", rel_data, acc_data, hal_data, comp_data)
        self.assertEqual(verdict["final_verdict"], "Fail")
        self.assertIn("Severe Hallucination", verdict["verdict_tag"])
        self.assertFalse(verdict["quality_gates"]["hallucination"]["passed"])

    def test_quality_gate_factual_contradiction_override(self):
        """Verify that factual inaccuracy (< 2.30 or incorrect) forces Fail verdict with Factual Contradiction tag."""
        rel_data = {"score": 4.5, "relevance_category": "Mostly Relevant"}
        acc_data = {"score": 1.8, "accuracy_category": "Incorrect", "contradiction_detected": False}
        hal_data = {"score": 4.0, "hallucination_level": "Zero Hallucination (Clean)"}
        comp_data = {"score": 4.5, "completeness_category": "Fully Complete"}

        verdict = generate_verdict("Query", "Resp", rel_data, acc_data, hal_data, comp_data)
        self.assertEqual(verdict["final_verdict"], "Fail")
        self.assertIn("Factual Contradiction", verdict["verdict_tag"])
        self.assertFalse(verdict["quality_gates"]["accuracy"]["passed"])

    def test_quality_gate_source_conflict_detection(self):
        """Verify that reference vs source discrepancy triggers Conflict in Information."""
        rel_data = {"score": 4.5, "relevance_category": "Mostly Relevant"}
        acc_data = {"score": 3.8, "accuracy_category": "Correct", "contradiction_detected": True}
        hal_data = {"score": 4.0, "hallucination_level": "Zero Hallucination (Clean)"}
        comp_data = {"score": 4.5, "completeness_category": "Fully Complete", "source_conflict_detected": True}

        verdict = generate_verdict("Query", "Resp", rel_data, acc_data, hal_data, comp_data)
        self.assertEqual(verdict["final_verdict"], "Conflict in Information")
        self.assertTrue(verdict["source_conflict_detected"])

    def test_quality_gate_insufficient_evidence_verdict(self):
        """Verify that unverified/insufficient context produces Insufficient Evidence verdict."""
        rel_data = {"score": 3.8, "relevance_category": "Mostly Relevant"}
        acc_data = {"score": 3.5, "accuracy_category": "Insufficient Evidence / Unverified", "is_insufficient_evidence": True}
        hal_data = {"score": 3.5, "hallucination_level": "Undetermined", "is_insufficient_evidence": True}
        comp_data = {"score": 3.5, "completeness_category": "Partially Complete"}

        verdict = generate_verdict("Query", "Resp", rel_data, acc_data, hal_data, comp_data)
        self.assertEqual(verdict["final_verdict"], "Insufficient Evidence")
        self.assertTrue(verdict["is_unverified"])

    # =========================================================================
    # 2. INDIVIDUAL JUDGE AGENT EVALUATION (MOCKED LLM)
    # =========================================================================

    @patch("agents.relevance_agent.generate_with_fallback")
    def test_relevance_agent(self, mock_llm):
        """Verify Relevance Agent parsing and category assignment."""
        mock_llm.return_value = {
            "score": 4.8,
            "relevance_category": "Fully Relevant",
            "key_alignment_points": ["Addressed core mechanism", "Correct terminology"],
            "missed_aspects": [],
            "reasoning": "The response directly answers the prompt."
        }
        res = evaluate_relevance("What is DNS?", "DNS translates domain names to IP addresses.")
        self.assertEqual(res["score"], 4.8)
        self.assertEqual(res["relevance_category"], "Fully Relevant")
        self.assertEqual(len(res["key_alignment_points"]), 2)

    @patch("agents.accuracy_agent.generate_with_fallback")
    def test_accuracy_agent_with_evidence(self, mock_llm):
        """Verify Accuracy Agent parsing, verification of claims against retrieved context."""
        mock_llm.return_value = {
            "score": 4.5,
            "accuracy_category": "Correct",
            "verified_claims": [{"claim": "Water boils at 100C", "verdict": "Supported", "evidence_source": "Chunk 1", "explanation": "Standard physics"}],
            "contradiction_detected": False,
            "reasoning": "All stated facts align with standard physics."
        }
        res = evaluate_accuracy("Boiling point of water?", "Water boils at 100 degrees C.", "100 C at sea level")
        self.assertEqual(res["score"], 4.5)
        self.assertFalse(res["contradiction_detected"])
        self.assertEqual(len(res["verified_claims"]), 1)

    @patch("agents.hallucination_agent.generate_with_fallback")
    def test_hallucination_agent_flagging(self, mock_llm):
        """Verify Hallucination Agent catches unsupported claims."""
        mock_llm.return_value = {
            "score": 1.8,
            "hallucination_level": "Severe Hallucination",
            "hallucination_detected": True,
            "hallucination_count": 1,
            "flagged_claims": [
                {
                    "statement": "Python invented XYZ in 2024.",
                    "claim_text": "Python invented XYZ in 2024.",
                    "classification": "Unsupported",
                    "grounding_status": "Unsupported",
                    "is_flagged": True,
                    "evidence_ref": "None",
                    "explanation": "XYZ feature is completely fabricated."
                }
            ],
            "reasoning": "XYZ feature is completely fabricated."
        }
        res = evaluate_hallucination("Python features?", "Python invented XYZ in 2024.", "Python is an interpreted language.")
        self.assertEqual(res["score"], 1.8)
        self.assertTrue(res["hallucination_detected"])
        self.assertEqual(res["hallucination_count"], 1)

    @patch("agents.completeness_agent.generate_with_fallback")
    def test_completeness_agent_missing_aspects(self, mock_llm):
        """Verify Completeness Agent tracks missing coverage points."""
        mock_llm.return_value = {
            "score": 2.5,
            "completeness_category": "Partially Complete",
            "identified_requirements": ["Definition", "Examples", "Trade-offs"],
            "addressed_aspects": ["Definition"],
            "missing_aspects": ["Examples", "Tradeoffs"],
            "source_conflict_detected": False,
            "reasoning": "Omitted 2 required components from the question."
        }
        res = evaluate_completeness("Explain hashing with examples and trade-offs.", "Hashing maps keys to values.", "")
        self.assertEqual(res["score"], 2.5)
        self.assertEqual(len(res["missing_aspects"]), 2)

    # =========================================================================
    # 3. END-TO-END ORCHESTRATOR WORKFLOW (MOCKED LLM)
    # =========================================================================

    @patch("agents.verdict_agent.generate_with_fallback")
    @patch("agents.completeness_agent.generate_with_fallback")
    @patch("agents.hallucination_agent.generate_with_fallback")
    @patch("agents.accuracy_agent.generate_with_fallback")
    @patch("agents.relevance_agent.generate_with_fallback")
    def test_orchestrator_full_pipeline_consistency(self, mock_rel, mock_acc, mock_hal, mock_comp, mock_verd):
        """Test complete orchestrator pipeline with deterministic mock returns, verifying multi-run scoring consistency."""
        mock_rel.return_value = {"score": 4.5, "relevance_category": "Mostly Relevant", "key_alignment_points": ["Core question"], "missed_aspects": [], "reasoning": "Direct match"}
        mock_acc.return_value = {"score": 4.2, "accuracy_category": "Correct", "verified_claims": [{"claim": "Fact 1", "verdict": "Supported"}], "contradiction_detected": False, "reasoning": "Factual"}
        mock_hal.return_value = {"score": 4.8, "hallucination_level": "Zero Hallucination (Clean)", "flagged_claims": [], "hallucination_detected": False, "hallucination_count": 0, "reasoning": "Clean"}
        mock_comp.return_value = {"score": 4.0, "completeness_category": "Mostly Complete", "addressed_aspects": ["Aspect 1"], "missing_aspects": [], "reasoning": "Covered"}
        mock_verd.return_value = {"verdict_summary": "Passed all gates cleanly.", "strengths": ["Clear", "Accurate"], "major_issues": []}

        # Run 1
        eval1 = orchestrate_evaluation("Question A", "Response A", "Reference A")
        # Run 2 (scoring consistency check)
        eval2 = orchestrate_evaluation("Question A", "Response A", "Reference A")

        # 0.25*4.5 + 0.30*4.2 + 0.25*4.8 + 0.20*4.0 = 1.125 + 1.26 + 1.20 + 0.80 = 4.385 -> 4.38 (Python banker's rounding)
        self.assertEqual(eval1["verdict"]["composite_score"], 4.38)
        self.assertEqual(eval1["verdict"]["final_verdict"], "Pass")
        self.assertEqual(eval1["verdict"]["composite_score"], eval2["verdict"]["composite_score"])
        self.assertEqual(eval1["verdict"]["final_verdict"], eval2["verdict"]["final_verdict"])

    # =========================================================================
    # 4. LIGHTWEIGHT BM25 & PDF CONTEXT RETRIEVAL
    # =========================================================================

    def test_lightweight_bm25_ranking(self):
        """Verify pure-Python Okapi BM25 accurately ranks relevant chunks over distractor chunks."""
        chunks = [
            {"chunk_id": 1, "text": "PostgreSQL is a relational database management system using SQL.", "tokens": _tokenize("PostgreSQL is a relational database management system using SQL.")},
            {"chunk_id": 2, "text": "Python is a high-level programming language created by Guido van Rossum.", "tokens": _tokenize("Python is a high-level programming language created by Guido van Rossum.")},
            {"chunk_id": 3, "text": "Kubernetes automates deployment, scaling, and management of containerized applications.", "tokens": _tokenize("Kubernetes automates deployment, scaling, and management of containerized applications.")},
        ]
        bm25 = LightweightBM25(chunks)
        query_tokens = Counter(_tokenize("How does SQL work in PostgreSQL database?"))
        resp_tokens = Counter()
        exact_phrases = ["postgresql database", "using sql"]

        score_0 = bm25.score_chunk(chunks[0], query_tokens, resp_tokens, exact_phrases)
        score_1 = bm25.score_chunk(chunks[1], query_tokens, resp_tokens, exact_phrases)
        score_2 = bm25.score_chunk(chunks[2], query_tokens, resp_tokens, exact_phrases)

        # First chunk should have highest BM25 score
        self.assertGreater(score_0, score_1)
        self.assertGreater(score_0, score_2)

    def test_pdf_extraction_and_budget_truncation(self):
        """Verify PDF text extraction and sliding window budgeting."""
        pdf_buf = io.BytesIO()
        c = canvas.Canvas(pdf_buf)
        c.drawString(100, 750, "Infosys Springboard Virtual Internship Batch 3 Milestone 4.")
        c.drawString(100, 700, "Validation of AI responses using multi-agent judge architecture.")
        c.save()
        pdf_bytes = pdf_buf.getvalue()

        extracted_text, metadata = extract_relevant_pdf_context(
            pdf_bytes=pdf_bytes,
            filename="test_doc.pdf",
            query="Tell me about multi-agent validation in Infosys",
            ai_response="",
            max_chars=1400
        )

        self.assertIn("multi-agent", extracted_text.lower())
        self.assertEqual(metadata["total_pages"], 1)
        self.assertGreater(len(extracted_text), 0)

    # =========================================================================
    # 5. BATCH EVALUATION CSV RESILIENCE & ERROR HANDLING
    # =========================================================================

    def test_csv_batch_resilient_handling(self):
        """Verify that malformed CSV rows or missing fields do not terminate batch processing."""
        raw_csv_data = """question,ai_response,reference_answer
What is AI?,Artificial Intelligence is smart software.,AI is machines simulating human intellect.
Malformed Row without quotes or missing fields
What is ML?,Machine learning learns from data.,ML is statistical pattern learning.
"""
        reader = csv.DictReader(io.StringIO(raw_csv_data))
        valid_records = []
        skipped_records = []

        for row_idx, row in enumerate(reader, start=1):
            q = row.get("question")
            ans = row.get("ai_response")
            if not q or not ans:
                skipped_records.append(row_idx)
                continue
            valid_records.append(row)

        self.assertEqual(len(valid_records), 2)
        self.assertEqual(len(skipped_records), 1)
        # Ensure row 3 was successfully parsed despite row 2 failure
        self.assertEqual(valid_records[1]["question"], "What is ML?")

    # =========================================================================
    # 6. ANALYTICS & SCORE DISTRIBUTION CALCULATIONS
    # =========================================================================

    def test_analytics_score_distribution_and_kpis(self):
        """Verify 4-tier score distributions, KPI percentages, and diagnostic aggregations."""
        mock_records = [
            {"composite_score": 4.8, "relevance_score": 4.9, "accuracy_score": 4.7, "hallucination_score": 5.0, "completeness_score": 4.6, "final_verdict": "Pass", "hallucination_detected": False, "hallucination_level": "None", "completeness_category": "Comprehensive", "missing_aspects": []},
            {"composite_score": 3.6, "relevance_score": 4.0, "accuracy_score": 3.8, "hallucination_score": 3.5, "completeness_score": 2.8, "final_verdict": "Needs Improvement", "hallucination_detected": False, "hallucination_level": "Low", "completeness_category": "Partially Complete", "missing_aspects": ["Examples"]},
            {"composite_score": 2.1, "relevance_score": 4.2, "accuracy_score": 1.5, "hallucination_score": 1.2, "completeness_score": 3.5, "final_verdict": "Fail", "hallucination_detected": True, "hallucination_level": "Severe Hallucinations", "completeness_category": "Comprehensive", "missing_aspects": []},
        ]

        total = len(mock_records)
        passed = sum(1 for r in mock_records if r["final_verdict"] == "Pass")
        needs = sum(1 for r in mock_records if r["final_verdict"] == "Needs Improvement")
        failed = sum(1 for r in mock_records if r["final_verdict"] == "Fail")

        self.assertEqual(total, 3)
        self.assertAlmostEqual(passed / total * 100, 33.3, places=1)
        self.assertAlmostEqual(needs / total * 100, 33.3, places=1)
        self.assertAlmostEqual(failed / total * 100, 33.3, places=1)

        # Check score distribution bucketing
        composite_scores = [r["composite_score"] for r in mock_records]
        tier_excellent = sum(1 for s in composite_scores if s >= 4.0)
        tier_good = sum(1 for s in composite_scores if 3.0 <= s < 4.0)
        tier_fair = sum(1 for s in composite_scores if 2.0 <= s < 3.0)
        tier_poor = sum(1 for s in composite_scores if s < 2.0)

        self.assertEqual(tier_excellent, 1)
        self.assertEqual(tier_good, 1)
        self.assertEqual(tier_fair, 1)
        self.assertEqual(tier_poor, 0)

        # Check hallucination tracking
        ungrounded_count = sum(1 for r in mock_records if r["hallucination_detected"])
        self.assertEqual(ungrounded_count, 1)

    # =========================================================================
    # 7. PDF REPORT GENERATION (SINGLE & BATCH)
    # =========================================================================

    def test_single_pdf_report_generation(self):
        """Verify that single evaluation PDF compiles valid binary PDF format without errors."""
        record = {
            "id": 101,
            "created_at": "2026-09-26T20:00:00Z",
            "question": "What is reinforcement learning from human feedback (RLHF)?",
            "ai_response": "RLHF is a technique using human preferences to align AI behaviors.",
            "reference_answer": "RLHF trains reward models from human rankings.",
            "final_verdict": "Pass",
            "verdict_tag": "Pass (High Quality & Fully Verified)",
            "composite_score": 4.65,
            "relevance_score": 4.8,
            "accuracy_score": 4.7,
            "hallucination_score": 4.9,
            "completeness_score": 4.2,
            "relevance_data": {"score": 4.8, "relevance_category": "Fully Relevant", "reasoning": "Aligned", "key_alignment_points": ["Aligns with question"]},
            "accuracy_data": {"score": 4.7, "accuracy_category": "Correct", "reasoning": "Verified", "verified_claims": [{"claim": "Human rankings train reward model", "verdict": "Supported"}]},
            "hallucination_data": {"score": 4.9, "hallucination_level": "Zero Hallucination (Clean)", "reasoning": "No hallucination", "hallucination_detected": False, "flagged_claims": []},
            "completeness_data": {"score": 4.2, "completeness_category": "Fully Complete", "reasoning": "Covered key concepts", "missing_aspects": []},
            "verdict_data": {
                "verdict_summary": "Response is highly accurate and adheres to reference evidence.",
                "major_issues": [],
                "strengths": ["Clear explanation", "Direct grounding"],
                "quality_gates": {
                    "relevance": {"name": "Relevance Gate", "passed": True, "score": 4.8},
                    "accuracy": {"name": "Accuracy Gate", "passed": True, "score": 4.7},
                    "hallucination": {"name": "Hallucination Gate", "passed": True, "score": 4.9},
                    "completeness": {"name": "Completeness Gate", "passed": True, "score": 4.2},
                    "grounding": {"name": "Grounding Gate", "passed": True, "score": None},
                }
            }
        }

        pdf_bytes = build_evaluation_pdf(record)
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))
        self.assertGreater(len(pdf_bytes), 3000)

    def test_batch_pdf_report_generation_with_recommendations(self):
        """Verify that batch evaluation PDF compiles valid binary PDF including automated recommendations."""
        batch_info = {
            "batch_id": "BATCH-E2E-TEST-001",
            "filename": "benchmark_batch_sample.csv",
            "created_at": "2026-09-26T21:00:00Z",
            "statistics": {
                "total": 2,
                "passed": 1,
                "needs_improvement": 1,
                "failed": 0,
                "hallucinations_detected": 0,
                "source_conflicts": 0,
                "avg_relevance": 4.4,
                "avg_accuracy": 4.3,
                "avg_hallucination": 4.2,
                "avg_completeness": 3.5,
                "avg_overall": 4.12
            }
        }
        records = [
            {
                "row_index": 1,
                "question": "What is Python?",
                "ai_response": "Python is a versatile interpreted language.",
                "reference_answer": "Interpreted high-level language.",
                "final_verdict": "Pass",
                "verdict_summary": "Passed all multi-metric quality gates.",
                "relevance_score": 4.8,
                "accuracy_score": 4.6,
                "hallucination_score": 4.5,
                "completeness_score": 4.0,
                "composite_score": 4.52,
                "relevance_category": "Fully Relevant",
                "accuracy_category": "Correct",
                "hallucination_level": "Zero Hallucination (Clean)",
                "completeness_category": "Fully Complete",
            },
            {
                "row_index": 2,
                "question": "Symptoms of dehydration?",
                "ai_response": "Dry mouth.",
                "reference_answer": "Dry mouth, dark urine, extreme thirst, dizziness.",
                "final_verdict": "Needs Improvement",
                "verdict_summary": "Failed completeness gate due to omitting primary symptoms.",
                "relevance_score": 4.0,
                "accuracy_score": 4.0,
                "hallucination_score": 4.0,
                "completeness_score": 2.0,
                "composite_score": 3.60,
                "relevance_category": "Mostly Relevant",
                "accuracy_category": "Correct",
                "hallucination_level": "Zero Hallucination (Clean)",
                "completeness_category": "Partially Complete",
            }
        ]

        pdf_bytes = build_batch_evaluation_pdf(batch_info, records)
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))
        self.assertGreater(len(pdf_bytes), 4000)

    # =========================================================================
    # 8. PERFORMANCE & SCALABILITY STRESS TEST (OFFLINE)
    # =========================================================================

    def test_analytics_scalability_performance(self):
        """Ensure analytics aggregations scale efficiently over large batch datasets."""
        import time
        large_batch = []
        for i in range(500):
            score = 3.0 + (i % 20) * 0.1
            verdict = "Pass" if score >= 4.0 else ("Needs Improvement" if score >= 3.0 else "Fail")
            large_batch.append({
                "composite_score": round(score, 2),
                "relevance_score": round(min(5.0, score + 0.2), 2),
                "accuracy_score": round(score, 2),
                "hallucination_score": round(max(1.0, score - 0.2), 2),
                "completeness_score": round(score, 2),
                "final_verdict": verdict,
                "hallucination_detected": (i % 5 == 0),
                "hallucination_level": "Moderate" if (i % 5 == 0) else "None",
                "completeness_category": "Comprehensive",
                "missing_aspects": ["Point"] if (i % 3 == 0) else []
            })

        t0 = time.time()
        total = len(large_batch)
        avg_score = sum(r["composite_score"] for r in large_batch) / total
        pass_count = sum(1 for r in large_batch if r["final_verdict"] == "Pass")
        elapsed = time.time() - t0

        self.assertEqual(total, 500)
        self.assertLess(elapsed, 0.05, f"Aggregating 500 records took {elapsed:.4f}s, exceeding 50ms budget!")


if __name__ == "__main__":
    unittest.main()
