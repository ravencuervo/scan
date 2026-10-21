import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from app.core.config import REPORTS_DIR

class PDFReportGenerator:
    """
    Generates formal network engineering audit and diagnostic PDF reports for AeroScan.
    """

    @staticmethod
    def generate(
        session_data: Dict[str, Any],
        analysis: Dict[str, Any],
        recommendations: Dict[str, Any],
        ap_list: List[Dict[str, Any]],
        output_filename: Optional[str] = None
    ) -> Path:
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        if not output_filename:
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"AeroScan_Reporte_Sesion_{session_data.get('id', 1)}_{timestamp_str}.pdf"

        file_path = REPORTS_DIR / output_filename
        doc = SimpleDocTemplate(
            str(file_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom palette & typography
        primary_color = colors.HexColor("#0f172a")    # Slate 900
        accent_color = colors.HexColor("#0284c7")     # Sky 600
        warning_color = colors.HexColor("#d97706")    # Amber 600
        critical_color = colors.HexColor("#dc2626")   # Red 600
        success_color = colors.HexColor("#16a34a")    # Emerald 600
        light_bg = colors.HexColor("#f8fafc")

        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=22,
            leading=26,
            textColor=primary_color,
            spaceAfter=4,
            alignment=1  # Centered
        )

        subtitle_style = ParagraphStyle(
            "DocSubTitle",
            parent=styles["Normal"],
            fontSize=11,
            leading=15,
            textColor=accent_color,
            spaceAfter=12,
            alignment=1
        )

        h2_style = ParagraphStyle(
            "SectionH2",
            parent=styles["Heading2"],
            fontSize=13,
            leading=17,
            textColor=primary_color,
            spaceBefore=12,
            spaceAfter=6,
            keepWithNext=True
        )

        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor("#334155")
        )

        callout_style = ParagraphStyle(
            "Callout",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#0f172a"),
            backColor=colors.HexColor("#f0f9ff"),
            borderColor=accent_color,
            borderWidth=1,
            borderPadding=8,
            spaceAfter=10
        )

        story = []

        # Header Title
        story.append(Paragraph("AEROSCAN", title_style))
        story.append(Paragraph("INFORME TÉCNICO DE DIAGNÓSTICO DEL ESPECTRO RADIOELÉCTRICO WIFI", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceAfter=10))

        # Metadata table
        now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        meta_data = [
            [
                Paragraph(f"<b>Sesión ID:</b> #{session_data.get('id', 1)}", body_style),
                Paragraph(f"<b>Fecha de Auditoría:</b> {now_str}", body_style)
            ],
            [
                Paragraph(f"<b>Ubicación:</b> {session_data.get('location', 'Laboratorio')}", body_style),
                Paragraph(f"<b>Motor de Captura:</b> {session_data.get('engine_type', 'Windows').upper()}", body_style)
            ],
            [
                Paragraph(f"<b>Redes Detectadas:</b> {analysis.get('total_aps', len(ap_list))} APs", body_style),
                Paragraph(f"<b>Salud del Espectro:</b> <font color='{success_color if analysis.get('overall_health_score', 0) >= 70 else critical_color}'><b>{analysis.get('overall_health_score', 0)} / 100</b></font>", body_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[270, 270])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), light_bg),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 10))

        # Executive Summary
        story.append(Paragraph("1. Resumen Ejecutivo y Diagnóstico Espectral", h2_style))
        story.append(Paragraph(recommendations.get("summary", ""), callout_style))

        # Optimal Channel Callout Box
        opt_24 = recommendations.get("optimal_channel_24", 1)
        opt_5 = recommendations.get("optimal_channel_5", 36)
        opt_data = [
            [
                Paragraph("<b>Canal Óptimo Recomendado en 2.4 GHz</b>", body_style),
                Paragraph(f"<font size='14' color='{accent_color}'><b>Canal {opt_24}</b></font>", body_style)
            ],
            [
                Paragraph("<b>Canal Óptimo Recomendado en 5 GHz</b>", body_style),
                Paragraph(f"<font size='14' color='{accent_color}'><b>Canal {opt_5}</b></font>", body_style)
            ]
        ]
        opt_table = Table(opt_data, colWidths=[340, 200])
        opt_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 1, accent_color),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ALIGN", (1, 0), (1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(opt_table)
        story.append(Spacer(1, 10))

        # Critical Findings
        findings = recommendations.get("findings", [])
        if findings:
            story.append(Paragraph("2. Hallazgos Críticos de Ingeniería", h2_style))
            for f in findings:
                sev = f.get("severity", "INFO")
                badge_color = critical_color if sev == "CRITICAL" else warning_color
                f_title = f"<font color='{badge_color}'><b>[{sev}]</b></font> <b>{f.get('title', '')}</b>"
                story.append(Paragraph(f_title, body_style))
                story.append(Paragraph(f.get("description", ""), ParagraphStyle("desc", parent=body_style, leftIndent=12, spaceAfter=6)))
            story.append(Spacer(1, 6))

        # Channel Analysis Table (2.4 GHz)
        story.append(Paragraph("3. Métricas Detalladas por Canal (Banda 2.4 GHz)", h2_style))
        c24 = analysis.get("channels_24ghz", {})
        table_24_data = [
            ["Canal", "Frecuencia", "APs Activos", "Interf. Co-Canal", "Interf. Adyacente", "Salud"]
        ]
        for ch in range(1, 14):
            if ch in c24:
                d = c24[ch]
                health_txt = f"{d['channel_health']}%"
                table_24_data.append([
                    f"Canal {ch}{' (Estándar)' if d['is_standard'] else ''}",
                    f"{d['center_freq_mhz']} MHz",
                    str(d["ap_count"]),
                    f"{d['cci_score']}/100",
                    f"{d['aci_score']}/100",
                    health_txt
                ])

        t24 = Table(table_24_data, colWidths=[95, 85, 75, 95, 95, 95])
        t24.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), primary_color),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, light_bg]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(t24)
        story.append(Spacer(1, 12))

        # Access Point Inventory (Top visible networks)
        story.append(KeepTogether([
            Paragraph("4. Inventario de Puntos de Acceso Detectados", h2_style),
            Paragraph("A continuación se listan las principales redes inalámbricas capturadas por el motor de radio:", body_style),
            Spacer(1, 6)
        ]))

        ap_table_data = [
            ["SSID", "BSSID (MAC)", "Fabricante", "Canal", "Banda", "RSSI (dBm)", "Seguridad"]
        ]
        sorted_aps = sorted(ap_list, key=lambda x: x.get("rssi", -100), reverse=True)[:25]
        for ap in sorted_aps:
            ap_table_data.append([
                Paragraph(ap.get("ssid", "<Oculta>")[:22], body_style),
                ap.get("bssid", ""),
                ap.get("vendor", "Desconocido")[:14],
                str(ap.get("channel", 1)),
                ap.get("band", "2.4GHz"),
                f"{ap.get('rssi', -80)} dBm",
                ap.get("security", "WPA2")[:10]
            ])

        ap_table = Table(ap_table_data, colWidths=[120, 105, 80, 45, 55, 65, 70])
        ap_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (3, 0), (5, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, light_bg]),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(ap_table)
        story.append(Spacer(1, 14))

        # Actionable Recommendations
        recs = recommendations.get("recommendations", [])
        if recs:
            story.append(KeepTogether([
                Paragraph("5. Recomendaciones de Configuración y Mitigación", h2_style),
                HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#cbd5e1"), spaceAfter=6)
            ]))
            for idx, r in enumerate(recs, 1):
                story.append(Paragraph(f"<b>5.{idx}. {r.get('title', '')}</b>", body_style))
                story.append(Paragraph(f"<i>Diagnóstico:</i> {r.get('detail', '')}", ParagraphStyle("d", parent=body_style, leftIndent=10)))
                story.append(Paragraph(f"<b>Acción recomendada:</b> {r.get('action', '')}", ParagraphStyle("a", parent=body_style, leftIndent=10, textColor=accent_color, spaceAfter=8)))

        # Build PDF
        doc.build(story)
        return file_path
