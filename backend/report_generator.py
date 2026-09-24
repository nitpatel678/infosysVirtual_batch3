import io
import json
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


def safe_parse(val, fallback=None):
    if fallback is None:
        fallback = {}
    if not val:
        return fallback
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return fallback


def xml_escape(text):
    if not text:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def build_evaluation_pdf(record: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f172a'),
    )

    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748b'),
    )

    section_heading = ParagraphStyle(
        'SecHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=10,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155'),
    )

    bold_label = ParagraphStyle(
        'BoldLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0f172a'),
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#1e293b'),
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#0f172a'),
    )

    quote_style = ParagraphStyle(
        'DocQuote',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#475569'),
    )

    story = []

    # 1. Header Section
    eval_id = record.get('id', 'N/A')
    created_at = record.get('created_at')
    date_str = (
        created_at.strftime("%B %d, %Y - %I:%M %p")
        if hasattr(created_at, "strftime")
        else str(created_at or datetime.now().strftime("%B %d, %Y"))
    )

    header_data = [
        [
            Paragraph("<b>INFOSYS SPRINGBOARD • AI QUALITY AUDITOR</b><br/><font size=8 color='#64748b'>Milestone 3 Quality Assurance & Verification System</font>", title_style),
            Paragraph(f"<para align=right><b>Audit Record #{eval_id}</b><br/><font size=8 color='#64748b'>{date_str}</font></para>", subtitle_style)
        ]
    ]
    t_header = Table(header_data, colWidths=[340, 200])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#4f46e5'), spaceAfter=10))

    # Parse JSON detail fields safely
    rel_details = safe_parse(record.get('relevance_details'))
    acc_details = safe_parse(record.get('accuracy_details'))
    hal_details = safe_parse(record.get('hallucination_details'))
    comp_details = safe_parse(record.get('completeness_details'))
    verd_details = safe_parse(record.get('verdict_details'))
    evidence_list = safe_parse(record.get('retrieved_evidence'), [])

    verdict_raw = record.get('final_verdict') or verdDetails_status if (verdDetails_status := verd_details.get('status')) else 'EVALUATED'
    verdict_str = verdict_raw.upper()

    verdict_color = '#16a34a' if 'PASS' in verdict_str else '#d97706' if 'NEEDS' in verdict_str or 'MODERATE' in verdict_str else '#64748b' if 'UNVERIFIED' in verdict_str else '#dc2626'
    verdict_bg = '#f0fdf4' if 'PASS' in verdict_str else '#fefce8' if 'NEEDS' in verdict_str or 'MODERATE' in verdict_str else '#f8fafc' if 'UNVERIFIED' in verdict_str else '#fef2f2'

    composite_score = float(record.get('composite_score') or 0.0)

    # 2. Executive Summary & Verdict Callout
    verdict_card_data = [
        [
            Paragraph(f"<font color='{verdict_color}'><b>OVERALL VERDICT: {verdict_str}</b></font>", ParagraphStyle('VTitle', fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=colors.HexColor(verdict_color))),
            Paragraph(f"<para align=right><b>Quality Score: {composite_score:.2f} / 5.00</b></para>", ParagraphStyle('VScore', fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=colors.HexColor('#0f172a')))
        ],
        [
            Paragraph(f"<b>Formula:</b> 25% Relevance + 35% Accuracy + 25% Hallucination + 15% Completeness", subtitle_style),
            Paragraph(f"<para align=right><font size=8 color='#64748b'>Benchmark Threshold: 3.50</font></para>", subtitle_style)
        ],
        [
            Paragraph(f"<b>Executive Summary:</b> {record.get('verdict_summary') or verd_details.get('summary', 'Evaluation concluded.')}", body_style),
            ""
        ]
    ]

    t_verdict = Table(verdict_card_data, colWidths=[360, 180])
    t_verdict.setStyle(TableStyle([
        ('SPAN', (0, 2), (1, 2)),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(verdict_bg)),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(verdict_color)),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_verdict)
    story.append(Spacer(1, 10))

    # Key Issues & Strengths if present
    issues = verd_details.get('major_issues', [])
    strengths = verd_details.get('strengths', [])
    if issues or strengths:
        issue_text = ""
        if issues:
            issue_text += f"<font color='#dc2626'><b>Identified Issues:</b></font> {'; '.join(issues)}<br/>"
        if strengths:
            issue_text += f"<font color='#16a34a'><b>Identified Strengths:</b></font> {'; '.join(strengths)}"
        
        t_issues = Table([[Paragraph(issue_text, body_style)]], colWidths=[540])
        t_issues.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(t_issues)
        story.append(Spacer(1, 10))

    # 3. Context & Inputs Section
    story.append(Paragraph("1. Evaluated Context & Source Inputs", section_heading))
    context_rows = [
        [Paragraph("<b>User Question:</b>", bold_label), Paragraph(str(record.get('question', '')), body_style)],
        [Paragraph("<b>AI Response:</b>", bold_label), Paragraph(str(record.get('ai_response', '')), quote_style)],
    ]
    if record.get('reference_answer'):
        context_rows.append([
            Paragraph("<b>Reference Truth:</b>", bold_label),
            Paragraph(str(record.get('reference_answer', '')), body_style)
        ])
    if record.get('source_document_name'):
        context_rows.append([
            Paragraph("<b>Source Document:</b>", bold_label),
            Paragraph(str(record.get('source_document_name', '')), body_style)
        ])

    t_context = Table(context_rows, colWidths=[100, 440])
    t_context.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_context)
    story.append(Spacer(1, 10))

    # 4. Multi-Agent Evaluation Scores Summary Table
    story.append(Paragraph("2. Dimension Scoring & Reasoning Matrix", section_heading))

    rel_score = float(record.get('relevance_score') or 0.0)
    acc_score = float(record.get('accuracy_score') or 0.0)
    hal_score = float(record.get('hallucination_score') or 0.0)
    comp_score = float(record.get('completeness_score') or 0.0)

    acc_cat = acc_details.get('accuracy_category', 'Incorrect' if acc_score <= 2.0 else 'Correct')
    rel_cat = rel_details.get('relevance_category', 'Relevant' if rel_score >= 3.5 else 'Irrelevant')
    hal_level = hal_details.get('hallucination_level', 'High Risk' if hal_score <= 2.0 else 'Low Risk')
    comp_cat = comp_details.get('completeness_category', 'Complete' if comp_score >= 3.5 else 'Incomplete')

    matrix_data = [
        [
            Paragraph("Agent Dimension", table_header),
            Paragraph("Weight", table_header),
            Paragraph("Score", table_header),
            Paragraph("Category", table_header),
            Paragraph("Evaluator Reasoning Summary", table_header),
        ],
        [
            Paragraph("<b>Relevance Judge</b>", table_cell_bold),
            Paragraph("25%", table_cell),
            Paragraph(f"<b>{rel_score:.1f}</b> / 5.0", table_cell),
            Paragraph(rel_cat, table_cell),
            Paragraph(record.get('relevance_reasoning') or rel_details.get('reasoning', ''), table_cell),
        ],
        [
            Paragraph("<b>Accuracy Judge</b>", table_cell_bold),
            Paragraph("35%", table_cell),
            Paragraph(f"<b>{acc_score:.1f}</b> / 5.0", table_cell),
            Paragraph(acc_cat, table_cell),
            Paragraph(record.get('accuracy_reasoning') or acc_details.get('reasoning', ''), table_cell),
        ],
        [
            Paragraph("<b>Hallucination Detection</b>", table_cell_bold),
            Paragraph("25%", table_cell),
            Paragraph(f"<b>{hal_score:.1f}</b> / 5.0", table_cell),
            Paragraph(hal_level, table_cell),
            Paragraph(record.get('hallucination_reasoning') or hal_details.get('reasoning', ''), table_cell),
        ],
        [
            Paragraph("<b>Completeness Judge</b>", table_cell_bold),
            Paragraph("15%", table_cell),
            Paragraph(f"<b>{comp_score:.1f}</b> / 5.0", table_cell),
            Paragraph(comp_cat, table_cell),
            Paragraph(record.get('completeness_reasoning') or comp_details.get('reasoning', ''), table_cell),
        ],
    ]

    t_matrix = Table(matrix_data, colWidths=[110, 45, 55, 95, 235])
    t_matrix.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#ffffff'), colors.HexColor('#f8fafc')]),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_matrix)
    story.append(Spacer(1, 10))

    # 5. Statement-by-Statement Fact-Check Claims Table (if any)
    verified_claims = acc_details.get('verified_claims', [])
    if verified_claims:
        story.append(Paragraph("3. Accuracy Judge: Fact-Checked Claims Audit", section_heading))
        claims_table_data = [
            [
                Paragraph("Extracted Factual Assertion", table_header),
                Paragraph("Verdict", table_header),
                Paragraph("Evidence Source", table_header),
                Paragraph("Verification Rationale", table_header),
            ]
        ]
        for c in verified_claims:
            v_color = '#dc2626' if (c.get('verdict') or '').lower() in ['incorrect', 'contradicted'] else '#16a34a' if (c.get('verdict') or '').lower() == 'supported' else '#d97706'
            claims_table_data.append([
                Paragraph(f"\"{c.get('claim', '')}\"", table_cell),
                Paragraph(f"<font color='{v_color}'><b>{c.get('verdict', 'Unverified')}</b></font>", table_cell),
                Paragraph(c.get('evidence_source', 'None'), table_cell),
                Paragraph(c.get('explanation', ''), table_cell),
            ])

        t_claims = Table(claims_table_data, colWidths=[180, 65, 95, 200])
        t_claims.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#ffffff'), colors.HexColor('#f8fafc')]),
            ('PADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(t_claims)
        story.append(Spacer(1, 10))

    # 6. Hallucination Statements Audit Table (if any)
    flagged_hal = hal_details.get('flagged_claims', [])
    if flagged_hal:
        story.append(Paragraph("4. Hallucination Detection: Statement Audit", section_heading))
        hal_table_data = [
            [
                Paragraph("Statement in Response", table_header),
                Paragraph("Classification", table_header),
                Paragraph("Evidence Ref", table_header),
                Paragraph("Audit Explanation", table_header),
            ]
        ]
        for h in flagged_hal:
            cls_name = h.get('classification') or h.get('grounding_status', 'Ungrounded')
            is_bad = cls_name.lower() in ['unsupported', 'fabricated', 'contradictory', 'ungrounded']
            c_color = '#dc2626' if is_bad else '#16a34a'
            hal_table_data.append([
                Paragraph(f"\"{h.get('statement') or h.get('claim_text', '')}\"", table_cell),
                Paragraph(f"<font color='{c_color}'><b>{cls_name}</b></font>", table_cell),
                Paragraph(h.get('evidence_ref', 'None'), table_cell),
                Paragraph(h.get('explanation', ''), table_cell),
            ])

        t_hal = Table(hal_table_data, colWidths=[180, 75, 85, 200])
        t_hal.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#ffffff'), colors.HexColor('#f8fafc')]),
            ('PADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(t_hal)
        story.append(Spacer(1, 10))

    # 7. Completeness Breakdown
    reqs = comp_details.get('identified_requirements', [])
    addr = comp_details.get('addressed_aspects', [])
    miss = comp_details.get('missing_aspects', [])
    if reqs or addr or miss:
        story.append(Paragraph("5. Completeness Judge: Requirements & Omissions", section_heading))
        comp_rows = []
        if reqs:
            comp_rows.append([
                Paragraph("<b>Identified Requirements:</b>", bold_label),
                Paragraph("<br/>".join([f"• {r}" for r in reqs]), body_style)
            ])
        if addr:
            comp_rows.append([
                Paragraph("<font color='#16a34a'><b>Addressed Aspects:</b></font>", bold_label),
                Paragraph("<br/>".join([f"✓ {a}" for a in addr]), body_style)
            ])
        if miss:
            comp_rows.append([
                Paragraph("<font color='#dc2626'><b>Missing / Omitted:</b></font>", bold_label),
                Paragraph("<br/>".join([f"⚠ {m}" for m in miss]), body_style)
            ])

        t_comp = Table(comp_rows, colWidths=[130, 410])
        t_comp.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('PADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(t_comp)
        story.append(Spacer(1, 10))

    # 8. Grounding Evidence Excerpts (from Benchmark FAISS)
    if evidence_list:
        story.append(Paragraph("6. Benchmark Grounding Evidence (FAISS Chunks)", section_heading))
        ev_rows = [
            [
                Paragraph("Source & Match Score", table_header),
                Paragraph("Benchmark Grounding Content", table_header),
            ]
        ]
        for ev in evidence_list[:4]:  # Top chunks
            src = ev.get('source', 'Knowledge Base')
            score_val = ev.get('score', 0.0)
            score_txt = f"{score_val*100:.1f}% Match" if score_val else "Sem. Evidence"
            passage = ev.get('text') or ev.get('answer', '')
            q_txt = f"<b>Q:</b> {ev.get('question')}<br/>" if ev.get('question') else ""
            ev_rows.append([
                Paragraph(f"<b>{src}</b><br/><font size=7.5 color='#64748b'>{score_txt}</font>", table_cell),
                Paragraph(f"{q_txt}{passage[:300]}...", table_cell),
            ])

        t_ev = Table(ev_rows, colWidths=[130, 410])
        t_ev.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#ffffff'), colors.HexColor('#f8fafc')]),
            ('PADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(t_ev)
        story.append(Spacer(1, 12))

    # 9. Sign-off & Audit Stamp
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=8))
    footer_data = [
        [
            Paragraph("<b>Infosys Springboard Virtual Internship Batch 3</b><br/><font size=7.5 color='#64748b'>Project #M-3-5 • SentryAI Response Validation Platform</font>", subtitle_style),
            Paragraph("<para align=right><b>Lead Auditor: Nitin Patel</b><br/><font size=7.5 color='#64748b'>Strict Closed-World Grounding Framework</font></para>", subtitle_style),
        ]
    ]
    t_foot = Table(footer_data, colWidths=[300, 240])
    t_foot.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(t_foot)

    doc.build(story)
    return buffer.getvalue()


def build_batch_evaluation_pdf(batch_info: dict, records: list) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'BatchDocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f172a'),
    )

    subtitle_style = ParagraphStyle(
        'BatchDocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748b'),
    )

    section_heading = ParagraphStyle(
        'BatchSecHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=12,
        spaceAfter=5,
    )

    table_header = ParagraphStyle(
        'BatchTableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )

    table_cell = ParagraphStyle(
        'BatchTableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1e293b'),
    )

    table_cell_muted = ParagraphStyle(
        'BatchTableCellMuted',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#64748b'),
    )

    badge_pass = ParagraphStyle(
        'BadgePass',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#15803d'),
    )

    badge_needs = ParagraphStyle(
        'BadgeNeeds',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#b45309'),
    )

    badge_fail = ParagraphStyle(
        'BadgeFail',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#b91c1c'),
    )

    entry_title_style = ParagraphStyle(
        'BatchEntryTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    entry_title_right = ParagraphStyle(
        'BatchEntryTitleRight',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=2,
    )

    detail_label = ParagraphStyle(
        'BatchDetailLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#0f172a'),
    )

    detail_body = ParagraphStyle(
        'BatchDetailBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#334155'),
    )

    dim_cell_style = ParagraphStyle(
        'BatchDimCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#1e293b'),
        alignment=1,
    )

    story = []

    # 1. Header & Metadata
    batch_id = batch_info.get("batch_id", "N/A")
    filename = batch_info.get("filename", "Dataset CSV")
    created_at = batch_info.get("created_at", datetime.now().isoformat())
    if isinstance(created_at, str):
        try:
            created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            date_str = created_dt.strftime("%d %b %Y • %H:%M:%S UTC")
        except Exception:
            date_str = created_at
    elif hasattr(created_at, "strftime"):
        date_str = created_at.strftime("%d %b %Y • %H:%M:%S UTC")
    else:
        date_str = str(created_at)

    story.append(Paragraph("Batch Multi-Agent Evaluation Report", title_style))
    story.append(Paragraph(
        f"<b>Batch ID:</b> {batch_id} &nbsp;|&nbsp; <b>File:</b> {filename} &nbsp;|&nbsp; <b>Evaluated At:</b> {date_str}",
        subtitle_style,
    ))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#3b82f6'), spaceAfter=10))

    # 2. Compute Aggregates
    stats = batch_info.get("statistics") or {}
    total_eval = len(records)
    passed_count = stats.get("passed", sum(1 for r in records if "pass" in (r.get("final_verdict") or "").lower()))
    needs_count = stats.get("needs_improvement", sum(1 for r in records if "needs" in (r.get("final_verdict") or "").lower()))
    failed_count = stats.get("failed", sum(1 for r in records if "fail" in (r.get("final_verdict") or "").lower()))
    hal_count = stats.get("hallucinations_detected", sum(1 for r in records if r.get("hallucination_detected")))
    conflict_count = stats.get("source_conflicts", sum(1 for r in records if r.get("source_conflict_detected")))

    pass_pct = round((passed_count / total_eval * 100) if total_eval > 0 else 0, 1)
    needs_pct = round((needs_count / total_eval * 100) if total_eval > 0 else 0, 1)
    fail_pct = round((failed_count / total_eval * 100) if total_eval > 0 else 0, 1)
    hal_pct = round((hal_count / total_eval * 100) if total_eval > 0 else 0, 1)

    avg_rel = stats.get("avg_relevance", round(sum(float(r.get("relevance_score") or 0) for r in records) / total_eval, 2) if total_eval > 0 else 0.0)
    avg_acc = stats.get("avg_accuracy", round(sum(float(r.get("accuracy_score") or 0) for r in records) / total_eval, 2) if total_eval > 0 else 0.0)
    avg_hal = stats.get("avg_hallucination", round(sum(float(r.get("hallucination_score") or 0) for r in records) / total_eval, 2) if total_eval > 0 else 0.0)
    avg_comp = stats.get("avg_completeness", round(sum(float(r.get("completeness_score") or 0) for r in records) / total_eval, 2) if total_eval > 0 else 0.0)
    avg_over = stats.get("avg_overall", round(sum(float(r.get("composite_score") or 0) for r in records) / total_eval, 2) if total_eval > 0 else 0.0)

    # 3. KPI Summary Table
    story.append(Paragraph("1. Executive Summary & Quality Rates", section_heading))
    kpi_rows = [
        [
            Paragraph("Total Evaluated", table_header),
            Paragraph("Pass Rate", table_header),
            Paragraph("Needs Improvement", table_header),
            Paragraph("Fail Rate", table_header),
            Paragraph("Hallucination Freq", table_header),
            Paragraph("Source Conflicts", table_header),
        ],
        [
            Paragraph(f"<b>{total_eval}</b> Rows", table_cell),
            Paragraph(f"<b>{pass_pct}%</b> ({passed_count})", table_cell),
            Paragraph(f"<b>{needs_pct}%</b> ({needs_count})", table_cell),
            Paragraph(f"<b>{fail_pct}%</b> ({failed_count})", table_cell),
            Paragraph(f"<b>{hal_pct}%</b> ({hal_count})", table_cell),
            Paragraph(f"<b>{conflict_count}</b> Discrepancies", table_cell),
        ]
    ]
    t_kpi = Table(kpi_rows, colWidths=[90, 90, 90, 90, 90, 90])
    t_kpi.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f8fafc')),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_kpi)
    story.append(Spacer(1, 8))

    # Dimension Averages Table
    avg_rows = [
        [
            Paragraph("Overall Composite", table_header),
            Paragraph("Relevance (25%)", table_header),
            Paragraph("Accuracy (35%)", table_header),
            Paragraph("Hallucination (25%)", table_header),
            Paragraph("Completeness (15%)", table_header),
        ],
        [
            Paragraph(f"<b>{avg_over:.2f} / 5.00</b>", table_cell),
            Paragraph(f"<b>{avg_rel:.2f} / 5.00</b>", table_cell),
            Paragraph(f"<b>{avg_acc:.2f} / 5.00</b>", table_cell),
            Paragraph(f"<b>{avg_hal:.2f} / 5.00</b>", table_cell),
            Paragraph(f"<b>{avg_comp:.2f} / 5.00</b>", table_cell),
        ]
    ]
    t_avg = Table(avg_rows, colWidths=[108, 108, 108, 108, 108])
    t_avg.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f1f5f9')),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_avg)
    story.append(Spacer(1, 12))

    # 4. Item-by-Item Breakdown Table
    story.append(Paragraph("2. Evaluated Dataset Entries Breakdown", section_heading))
    item_rows = [
        [
            Paragraph("#", table_header),
            Paragraph("Question & Summary", table_header),
            Paragraph("Rel", table_header),
            Paragraph("Acc", table_header),
            Paragraph("Hal", table_header),
            Paragraph("Comp", table_header),
            Paragraph("Score", table_header),
            Paragraph("Verdict", table_header),
        ]
    ]

    for idx, r in enumerate(records, 1):
        q_text = (r.get("question") or "")[:90]
        sum_text = (r.get("verdict_summary") or "")[:120]
        q_cell = Paragraph(f"<b>{q_text}</b><br/><font color='#64748b'>{sum_text}</font>", table_cell)

        v_raw = (r.get("final_verdict") or "Pass").strip()
        v_low = v_raw.lower()
        if "pass" in v_low:
            v_style = badge_pass
        elif "needs" in v_low:
            v_style = badge_needs
        else:
            v_style = badge_fail

        rel_sc = float(r.get("relevance_score") or 0.0)
        acc_sc = float(r.get("accuracy_score") or 0.0)
        hal_sc = float(r.get("hallucination_score") or 0.0)
        comp_sc = float(r.get("completeness_score") or 0.0)
        comp_tot = float(r.get("composite_score") or 0.0)

        item_rows.append([
            Paragraph(f"{r.get('row_index') or idx}", table_cell),
            q_cell,
            Paragraph(f"{rel_sc:.1f}", table_cell),
            Paragraph(f"{acc_sc:.1f}", table_cell),
            Paragraph(f"{hal_sc:.1f}", table_cell),
            Paragraph(f"{comp_sc:.1f}", table_cell),
            Paragraph(f"<b>{comp_tot:.2f}</b>", table_cell),
            Paragraph(f"<b>{v_raw}</b>", v_style),
        ])

    t_items = Table(item_rows, colWidths=[24, 256, 40, 40, 40, 40, 45, 55])
    t_items.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#ffffff'), colors.HexColor('#f8fafc')]),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_items)
    story.append(Spacer(1, 14))

    # 3. Detailed Per-Entry Evaluation Dossiers
    story.append(Paragraph("3. Detailed Per-Entry Evaluation Dossiers", section_heading))
    story.append(Paragraph(
        "Complete multi-agent validation audit logs showing full question context, AI generated response, reference grounding, individual agent scores, and verdict rationale for each evaluated record.",
        subtitle_style
    ))
    story.append(Spacer(1, 8))

    for idx, r in enumerate(records, 1):
        row_num = r.get("row_index") or idx
        q_text = xml_escape(r.get("question") or "")
        ans_text = xml_escape(r.get("ai_response") or "")
        ref_text = xml_escape(r.get("reference_answer") or "")
        v_raw = (r.get("final_verdict") or "Pass").strip()
        v_low = v_raw.lower()
        if "pass" in v_low:
            v_color = "#4ade80"
            banner_bg = "#064e3b"
        elif "needs" in v_low:
            v_color = "#fde047"
            banner_bg = "#78350f"
        elif "unverified" in v_low:
            v_color = "#38bdf8"
            banner_bg = "#075985"
        else:
            v_color = "#f87171"
            banner_bg = "#7f1d1d"

        sum_text = xml_escape(r.get("verdict_summary") or "")
        rel_sc = float(r.get("relevance_score") or 0.0)
        acc_sc = float(r.get("accuracy_score") or 0.0)
        hal_sc = float(r.get("hallucination_score") or 0.0)
        comp_sc = float(r.get("completeness_score") or 0.0)
        comp_tot = float(r.get("composite_score") or 0.0)

        verd_det = safe_parse(r.get("verdict_details"))
        issues = verd_det.get("major_issues") or []
        has_conflict = bool(r.get("source_conflict_detected") or verd_det.get("source_conflict_detected"))
        has_hal = bool(r.get("hallucination_detected"))

        header_table = Table([
            [
                Paragraph(f"<b>ENTRY #{row_num}</b> &nbsp;|&nbsp; Verdict: <font color='{v_color}'><b>{v_raw.upper()}</b></font>", entry_title_style),
                Paragraph(f"Overall Composite: <b>{comp_tot:.2f} / 5.00</b>", entry_title_right),
            ]
        ], colWidths=[340, 200])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(banner_bg)),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))

        dim_data = [
            [
                Paragraph("<b>Relevance (25%)</b>", dim_cell_style),
                Paragraph("<b>Accuracy (35%)</b>", dim_cell_style),
                Paragraph("<b>Hallucination (25%)</b>", dim_cell_style),
                Paragraph("<b>Completeness (15%)</b>", dim_cell_style),
            ],
            [
                Paragraph(f"<b>{rel_sc:.1f}</b> / 5.0", dim_cell_style),
                Paragraph(f"<b>{acc_sc:.1f}</b> / 5.0", dim_cell_style),
                Paragraph(f"<b>{hal_sc:.1f}</b> / 5.0", dim_cell_style),
                Paragraph(f"<b>{comp_sc:.1f}</b> / 5.0", dim_cell_style),
            ]
        ]
        dim_table = Table(dim_data, colWidths=[130, 130, 130, 130])
        dim_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f8fafc')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 3),
        ]))

        body_rows = [
            [Paragraph("<b>User Question:</b>", detail_label)],
            [Paragraph(f"{q_text}", detail_body)],
            [Paragraph("<b>Evaluated AI Response:</b>", detail_label)],
            [Paragraph(f"{ans_text}", detail_body)],
        ]

        if ref_text:
            body_rows.extend([
                [Paragraph("<b>Reference Ground Truth:</b>", detail_label)],
                [Paragraph(f"{ref_text}", detail_body)],
            ])

        body_rows.append([dim_table])

        if sum_text:
            body_rows.extend([
                [Paragraph("<b>Verdict Synthesis & Reasoning:</b>", detail_label)],
                [Paragraph(f"{sum_text}", detail_body)],
            ])

        flags_text = []
        if has_conflict:
            flags_text.append("<font color='#b45309'><b>[!] Ground Truth Conflict Detected</b></font>")
        if has_hal:
            flags_text.append("<font color='#b91c1c'><b>[X] Hallucination Flagged</b></font>")
        if issues:
            for iss in issues[:2]:
                flags_text.append(f"<font color='#64748b'>• {xml_escape(str(iss))}</font>")

        if flags_text:
            body_rows.extend([
                [Paragraph("<b>Audit Flags & Key Issues:</b>", detail_label)],
                [Paragraph("<br/>".join(flags_text), detail_body)],
            ])

        content_table = Table(body_rows, colWidths=[520])
        content_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ffffff')),
            ('PADDING', (0, 0), (-1, -1), 3),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        entry_card = Table([
            [header_table],
            [content_table],
        ], colWidths=[540])
        entry_card.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#94a3b8')),
            ('PADDING', (0, 0), (-1, -1), 0),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        story.append(KeepTogether([entry_card, Spacer(1, 10)]))

    story.append(Spacer(1, 6))

    # 5. Sign-off & Audit Stamp
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=8))
    footer_data = [
        [
            Paragraph("<b>Infosys Springboard Virtual Internship Batch 3</b><br/><font size=7.5 color='#64748b'>Project #M-3-5 • SentryAI Response Validation Platform</font>", subtitle_style),
            Paragraph("<para align=right><b>Lead Auditor: Nitin Patel</b><br/><font size=7.5 color='#64748b'>Strict Closed-World Grounding Framework</font></para>", subtitle_style),
        ]
    ]
    t_foot = Table(footer_data, colWidths=[300, 240])
    t_foot.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(t_foot)

    doc.build(story)
    return buffer.getvalue()

