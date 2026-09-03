from concurrent.futures import ThreadPoolExecutor
from agents.relevance_agent import evaluate_relevance
from agents.accuracy_agent import evaluate_accuracy
from agents.hallucination_agent import evaluate_hallucination
from agents.completeness_agent import evaluate_completeness
from agents.verdict_agent import generate_verdict


def orchestrate_evaluation(
    question,
    ai_response,
    reference_answer=None,
    source_document_text=None,
    retrieved_evidence=None,
):
    with ThreadPoolExecutor(max_workers=4) as executor:
        f_rel = executor.submit(evaluate_relevance, question, ai_response)
        f_acc = executor.submit(
            evaluate_accuracy,
            question,
            ai_response,
            reference_answer,
            source_document_text,
            retrieved_evidence,
        )
        f_hal = executor.submit(
            evaluate_hallucination,
            question,
            ai_response,
            reference_answer,
            source_document_text,
            retrieved_evidence,
        )
        f_comp = executor.submit(
            evaluate_completeness, question, ai_response, reference_answer
        )

        rel_data = f_rel.result()
        acc_data = f_acc.result()
        hal_data = f_hal.result()
        comp_data = f_comp.result()

    verdict_data = generate_verdict(
        question=question,
        ai_response=ai_response,
        relevance_data=rel_data,
        accuracy_data=acc_data,
        hallucination_data=hal_data,
        completeness_data=comp_data,
    )

    return {
        "relevance": rel_data,
        "accuracy": acc_data,
        "hallucination": hal_data,
        "completeness": comp_data,
        "composite_score": verdict_data["composite_score"],
        "final_verdict": verdict_data["final_verdict"],
        "verdict_summary": verdict_data["verdict_summary"],
    }
