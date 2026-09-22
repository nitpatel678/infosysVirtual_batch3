import os
import sys
import json
import time

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from agents.orchestrator import orchestrate_evaluation


def run_benchmark_validation():
    print("=" * 75, flush=True)
    print("AI Response Validation System - Milestone 3 Benchmark Validation", flush=True)
    print("Evaluating 5 Dimensions: Relevance | Accuracy | Hallucination | Completeness | Verdict", flush=True)
    print("=" * 75, flush=True)

    test_cases_path = os.path.join(os.path.dirname(__file__), "test_cases.json")
    with open(test_cases_path, "r", encoding="utf-8") as f:
        test_cases = json.load(f)

    # Run only 2 test cases as instructed by user
    test_cases = test_cases[:2]
    print(f"Loaded {len(test_cases)} curated benchmark test cases (limited to 2).\n", flush=True)

    passed_tests = 0
    total_tests = len(test_cases)
    results = []

    for case in test_cases:
        tc_id = case["id"]
        name = case["name"]
        q = case["question"]
        resp = case["ai_response"]
        ref = case.get("reference_answer")
        expected_verdict = case.get("expected_verdict", "Pass")

        print(f"Running [{tc_id}] {name}...", flush=True)

        t0 = time.time()
        try:
            eval_data = orchestrate_evaluation(
                question=q,
                ai_response=resp,
                reference_answer=ref,
            )
        except Exception as e:
            print(f"  Evaluation error: {e}", flush=True)
            continue

        elapsed = round(time.time() - t0, 2)
        rel = eval_data.get("relevance", {})
        acc = eval_data.get("accuracy", {})
        hal = eval_data.get("hallucination", {})
        comp = eval_data.get("completeness", {})
        verdict_obj = eval_data.get("verdict", {})

        rel_s = rel.get("score", 0.0)
        acc_s = acc.get("score", 0.0)
        hal_s = hal.get("score", 0.0)
        comp_s = comp.get("score", 0.0)
        composite_s = verdict_obj.get("composite_score", 0.0)
        final_verdict = verdict_obj.get("final_verdict") or "Unknown"

        match = (final_verdict.strip().lower() == expected_verdict.strip().lower())
        if match:
            passed_tests += 1
            verdict_badge = f"MATCH ({final_verdict})"
        else:
            verdict_badge = f"MISMATCH (Got: {final_verdict}, Expected: {expected_verdict})"

        print(f"  Relevance:     {rel_s:.1f}/5.0 [{rel.get('relevance_category', 'N/A')}] | Alignments: {len(rel.get('key_alignment_points', []))}", flush=True)
        print(f"  Accuracy:      {acc_s:.1f}/5.0 [{acc.get('accuracy_category', 'N/A')}] | Verified Claims: {len(acc.get('verified_claims', []))}", flush=True)
        print(f"  Hallucination: {hal_s:.1f}/5.0 [{hal.get('hallucination_level', 'N/A')}] | Flagged: {hal.get('hallucination_count', 0)} claims", flush=True)
        print(f"  Completeness:  {comp_s:.1f}/5.0 [{comp.get('completeness_category', 'N/A')}] | Missing: {len(comp.get('missing_aspects', []))} aspects", flush=True)
        print(f"  Verdict:       {final_verdict} (Weighted Score: {composite_s:.2f}/5.00) in {elapsed}s -> {verdict_badge}", flush=True)
        print(f"  Summary:       {verdict_obj.get('verdict_summary', '')[:120]}...", flush=True)
        print(flush=True)

        results.append({
            "test_case": case,
            "evaluation": eval_data,
            "elapsed": elapsed,
            "match": match,
        })

    print("=" * 75, flush=True)
    print(f"VALIDATION SUMMARY: {passed_tests}/{total_tests} test cases matched expected verdicts.", flush=True)
    print("=" * 75, flush=True)
    return results


if __name__ == "__main__":
    run_benchmark_validation()
