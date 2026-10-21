from typing import Dict, Any, List, Tuple
from app.core.config import NON_OVERLAPPING_CHANNELS_24

class SpectrumOptimizer:
    """
    Automated network engineering diagnostic and channel recommendation engine.
    Produces findings and recommendations matching AeroScan Module 6 requirements.
    """

    @staticmethod
    def generate_recommendations(analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze spectrum metrics, find optimal channels, and generate actionable technical recommendations.
        """
        c24 = analysis.get("channels_24ghz", {})
        c5 = analysis.get("channels_5ghz", {})

        # 1. Optimal 2.4 GHz Channel Evaluation (prioritizing non-overlapping 1, 6, 11)
        best_ch_24 = 1
        lowest_penalty_24 = float("inf")

        for ch in NON_OVERLAPPING_CHANNELS_24:
            if ch in c24:
                penalty = c24[ch]["total_penalty"]
                if penalty < lowest_penalty_24:
                    lowest_penalty_24 = penalty
                    best_ch_24 = ch

        # 2. Optimal 5 GHz Channel Evaluation
        best_ch_5 = 36
        lowest_penalty_5 = float("inf")
        # Priority standard 5GHz channels
        candidates_5 = [36, 40, 44, 48, 149, 153, 157, 161]
        for ch in candidates_5:
            if ch in c5:
                penalty = c5[ch]["total_penalty"]
                if penalty < lowest_penalty_5:
                    lowest_penalty_5 = penalty
                    best_ch_5 = ch

        # 3. Detect critical engineering findings
        findings: List[Dict[str, Any]] = []
        recommendations: List[Dict[str, Any]] = []

        # Check for congested 2.4 GHz channels
        for ch, data in c24.items():
            ap_count = data["ap_count"]
            if ap_count >= 5:
                findings.append({
                    "severity": "CRITICAL",
                    "channel": ch,
                    "band": "2.4GHz",
                    "title": f"Saturación Severa en Canal {ch}",
                    "description": f"Se detectaron {ap_count} Puntos de Acceso operando simultáneamente en el canal {ch}. La contención de medio CSMA/CA degrada la latencia y el throughput.",
                    "cci_score": data["cci_score"],
                    "aci_score": data["aci_score"]
                })
            elif ap_count >= 3:
                findings.append({
                    "severity": "WARNING",
                    "channel": ch,
                    "band": "2.4GHz",
                    "title": f"Congestión Moderada en Canal {ch}",
                    "description": f"{ap_count} redes detectadas compitiendo por tiempo de transmisión.",
                    "cci_score": data["cci_score"],
                    "aci_score": data["aci_score"]
                })

        # Check for non-standard overlapping channel usage in 2.4 GHz (channels 2, 3, 4, 5, 7, 8, 9, 10, 12, 13)
        overlapping_offenders = []
        for ch in [2, 3, 4, 5, 7, 8, 9, 10, 12, 13]:
            if ch in c24 and c24[ch]["ap_count"] > 0:
                overlapping_offenders.append((ch, c24[ch]["ap_count"]))

        if overlapping_offenders:
            ch_list_str = ", ".join([f"Canal {ch} ({cnt} APs)" for ch, cnt in overlapping_offenders])
            findings.append({
                "severity": "CRITICAL",
                "channel": None,
                "band": "2.4GHz",
                "title": "Uso de Canales Superpuestos No Estándar (ACI Destructiva)",
                "description": f"Se detectaron redes operando en canales intermedios: {ch_list_str}. Esto genera interferencia de canal adyacente (ACI) con colisiones CRC en canales 1, 6 y 11.",
                "cci_score": 0,
                "aci_score": max(c24[ch]["aci_score"] for ch, _ in overlapping_offenders)
            })

        # Generate actionable migration recommendations
        if best_ch_24:
            curr_best_info = c24.get(best_ch_24, {})
            recommendations.append({
                "type": "MIGRACION_CANAL_24",
                "target_channel": best_ch_24,
                "band": "2.4GHz",
                "title": f"Recomendación para 2.4 GHz: Migrar al Canal {best_ch_24}",
                "detail": f"El Canal {best_ch_24} presenta la menor penalización espectral ({curr_best_info.get('total_penalty', 0)} pts) con una pureza de canal estimada del {curr_best_info.get('channel_health', 100)}%.",
                "action": f"Reconfigurar APs principales de 2.4 GHz al Canal {best_ch_24} con ancho de banda fijo de 20 MHz."
            })

        if best_ch_5:
            curr_5_info = c5.get(best_ch_5, {})
            recommendations.append({
                "type": "MIGRACION_CANAL_5",
                "target_channel": best_ch_5,
                "band": "5GHz",
                "title": f"Recomendación para 5 GHz: Asignar Canal {best_ch_5}",
                "detail": f"Banda de 5 GHz con alta capacidad y mínimo ruido. El canal {best_ch_5} ofrece {curr_5_info.get('channel_health', 100)}% de salud de canal.",
                "action": f"Habilitar Band Steering para migrar clientes 802.11ac/ax hacia el canal {best_ch_5} en 5 GHz (ancho de 40 u 80 MHz)."
            })

        # General summary formulation
        summary = (
            f"Diagnóstico de Espectro AeroScan: Se escanearon {analysis.get('total_aps', 0)} redes WiFi. "
            f"Salud global del entorno evaluada en {analysis.get('overall_health_score', 0)}/100. "
            f"El canal óptimo para 2.4 GHz es el Canal {best_ch_24} y para 5 GHz es el Canal {best_ch_5}."
        )

        return {
            "summary": summary,
            "optimal_channel_24": best_ch_24,
            "optimal_channel_5": best_ch_5,
            "findings": findings,
            "recommendations": recommendations
        }
