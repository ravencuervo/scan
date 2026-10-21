from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.core.config import REPORTS_DIR

class ExcelReportExporter:
    """
    Exports comprehensive Wi-Fi audit data, spectrum metrics, and raw samples to Microsoft Excel (.xlsx).
    """

    @staticmethod
    def export(
        session_data: Dict[str, Any],
        analysis: Dict[str, Any],
        recommendations: Dict[str, Any],
        ap_list: List[Dict[str, Any]],
        output_filename: Optional[str] = None
    ) -> Path:
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        if not output_filename:
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"AeroScan_Datos_Sesion_{session_data.get('id', 1)}_{timestamp_str}.xlsx"

        wb = openpyxl.Workbook()
        file_path = REPORTS_DIR / output_filename

        # Styles
        font_header = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
        font_title = Font(name="Segoe UI", size=14, bold=True, color="0F172A")
        font_sub = Font(name="Segoe UI", size=10, italic=True, color="64748B")
        font_cell = Font(name="Segoe UI", size=10)
        font_bold = Font(name="Segoe UI", size=10, bold=True)

        fill_header = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        fill_accent = PatternFill(start_color="0284C7", end_color="0284C7", fill_type="solid")
        fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1")
        )

        # ==========================================
        # Sheet 1: Resumen y Auditoría
        # ==========================================
        ws1 = wb.active
        ws1.title = "Resumen de Auditoría"
        ws1.views.sheetView[0].showGridLines = True

        ws1["A1"] = "AeroScan - Auditoría de Espectro WiFi"
        ws1["A1"].font = font_title
        ws1["A2"] = f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"
        ws1["A2"].font = font_sub

        summary_rows = [
            ("ID de Sesión", f"#{session_data.get('id', 1)}"),
            ("Nombre de Auditoría", session_data.get("name", "Sesión")),
            ("Ubicación", session_data.get("location", "Laboratorio")),
            ("Motor de Captura", session_data.get("engine_type", "Windows").upper()),
            ("Total de APs Detectados", analysis.get("total_aps", len(ap_list))),
            ("APs en 2.4 GHz", analysis.get("aps_24ghz_count", 0)),
            ("APs en 5 GHz", analysis.get("aps_5ghz_count", 0)),
            ("Salud Global del Espectro", f"{analysis.get('overall_health_score', 0)} / 100"),
            ("Canal Óptimo 2.4 GHz", f"Canal {recommendations.get('optimal_channel_24', 1)}"),
            ("Canal Óptimo 5 GHz", f"Canal {recommendations.get('optimal_channel_5', 36)}"),
            ("Diagnóstico General", recommendations.get("summary", ""))
        ]

        row_idx = 4
        for k, v in summary_rows:
            ws1.cell(row=row_idx, column=1, value=k).font = font_bold
            ws1.cell(row=row_idx, column=2, value=v).font = font_cell
            ws1.cell(row=row_idx, column=1).border = thin_border
            ws1.cell(row=row_idx, column=2).border = thin_border
            row_idx += 1

        # ==========================================
        # Sheet 2: Métricas por Canal
        # ==========================================
        ws2 = wb.create_sheet(title="Métricas de Canales")
        ws2.views.sheetView[0].showGridLines = True

        headers_c = ["Banda", "Canal", "Frecuencia (MHz)", "APs Detectados", "Interf. Co-Canal (CCI)", "Interf. Adyacente (ACI)", "Penalización Total", "Salud de Canal (%)", "Estándar"]
        for col_idx, h in enumerate(headers_c, 1):
            cell = ws2.cell(row=1, column=col_idx, value=h)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = Alignment(horizontal="center", vertical="center")

        curr_r = 2
        c24 = analysis.get("channels_24ghz", {})
        for ch in range(1, 15):
            if ch in c24:
                d = c24[ch]
                row_vals = [
                    "2.4 GHz",
                    ch,
                    d["center_freq_mhz"],
                    d["ap_count"],
                    d["cci_score"],
                    d["aci_score"],
                    d["total_penalty"],
                    f"{d['channel_health']}%",
                    "Sí" if d.get("is_standard") else "No (Solapado)"
                ]
                for col_idx, val in enumerate(row_vals, 1):
                    c = ws2.cell(row=curr_r, column=col_idx, value=val)
                    c.font = font_cell
                    c.border = thin_border
                    if curr_r % 2 == 0:
                        c.fill = fill_zebra
                    if col_idx in [2, 3, 4, 5, 6, 7, 8]:
                        c.alignment = Alignment(horizontal="center")
                curr_r += 1

        c5 = analysis.get("channels_5ghz", {})
        for ch, d in c5.items():
            row_vals = [
                "5 GHz",
                ch,
                d["center_freq_mhz"],
                d["ap_count"],
                d["cci_score"],
                d["aci_score"],
                d["total_penalty"],
                f"{d['channel_health']}%",
                "Sí"
            ]
            for col_idx, val in enumerate(row_vals, 1):
                c = ws2.cell(row=curr_r, column=col_idx, value=val)
                c.font = font_cell
                c.border = thin_border
                if curr_r % 2 == 0:
                    c.fill = fill_zebra
                if col_idx in [2, 3, 4, 5, 6, 7, 8]:
                    c.alignment = Alignment(horizontal="center")
            curr_r += 1

        # ==========================================
        # Sheet 3: Inventario de Redes AP
        # ==========================================
        ws3 = wb.create_sheet(title="Inventario de APs")
        ws3.views.sheetView[0].showGridLines = True

        headers_ap = ["SSID", "BSSID (MAC)", "Fabricante", "Canal", "Frecuencia (MHz)", "Banda", "Señal RSSI (dBm)", "Calidad (%)", "Seguridad", "Ancho (MHz)"]
        for col_idx, h in enumerate(headers_ap, 1):
            cell = ws3.cell(row=1, column=col_idx, value=h)
            cell.font = font_header
            cell.fill = fill_accent
            cell.alignment = Alignment(horizontal="center", vertical="center")

        curr_r = 2
        for ap in sorted(ap_list, key=lambda x: x.get("rssi", -100), reverse=True):
            row_vals = [
                ap.get("ssid", "<Oculta>"),
                ap.get("bssid", ""),
                ap.get("vendor", "Desconocido"),
                ap.get("channel", 1),
                ap.get("frequency_mhz", 2412),
                ap.get("band", "2.4GHz"),
                ap.get("rssi", -80),
                f"{ap.get('signal_quality', 50)}%",
                ap.get("security", "WPA2"),
                ap.get("channel_width", 20)
            ]
            for col_idx, val in enumerate(row_vals, 1):
                c = ws3.cell(row=curr_r, column=col_idx, value=val)
                c.font = font_cell
                c.border = thin_border
                if curr_r % 2 == 0:
                    c.fill = fill_zebra
                if col_idx in [4, 5, 6, 7, 8, 10]:
                    c.alignment = Alignment(horizontal="center")
            curr_r += 1

        # ==========================================
        # Sheet 4: Recomendaciones y Hallazgos
        # ==========================================
        ws4 = wb.create_sheet(title="Recomendaciones")
        ws4.views.sheetView[0].showGridLines = True

        headers_rec = ["Tipo / Severidad", "Canal Afectado", "Título del Hallazgo", "Diagnóstico Técnico", "Acción de Mitigación"]
        for col_idx, h in enumerate(headers_rec, 1):
            cell = ws4.cell(row=1, column=col_idx, value=h)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = Alignment(horizontal="center", vertical="center")

        curr_r = 2
        for f in recommendations.get("findings", []):
            row_vals = [
                f.get("severity", "INFO"),
                f.get("channel", "Múltiples"),
                f.get("title", ""),
                f.get("description", ""),
                "Revisar planificación de frecuencias en el área"
            ]
            for col_idx, val in enumerate(row_vals, 1):
                c = ws4.cell(row=curr_r, column=col_idx, value=val)
                c.font = font_cell
                c.border = thin_border
            curr_r += 1

        for r in recommendations.get("recommendations", []):
            row_vals = [
                "RECOMENDACIÓN",
                f"Canal {r.get('target_channel')}",
                r.get("title", ""),
                r.get("detail", ""),
                r.get("action", "")
            ]
            for col_idx, val in enumerate(row_vals, 1):
                c = ws4.cell(row=curr_r, column=col_idx, value=val)
                c.font = font_cell
                c.border = thin_border
            curr_r += 1

        # Auto-adjust column widths for all sheets
        for sheet in wb.worksheets:
            for col in sheet.columns:
                max_len = 0
                col_letter = get_column_letter(col[0].column)
                for cell in col:
                    if cell.value:
                        lines = str(cell.value).split("\n")
                        line_max = max(len(l) for l in lines)
                        if line_max > max_len:
                            max_len = line_max
                sheet.column_dimensions[col_letter].width = min(50, max(max_len + 3, 12))

        wb.save(str(file_path))
        return file_path
