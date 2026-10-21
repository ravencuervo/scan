import math
from typing import List, Dict, Any, Tuple
from app.capture.hal import ScannedAP
from app.core.config import CHANNELS_24_GHZ, NON_OVERLAPPING_CHANNELS_24, CHANNELS_5_GHZ

# Engineering weights for spectrum health and interference
WEIGHT_CO_CHANNEL = 1.0
WEIGHT_ADJACENT_CHANNEL = 1.6  # ACI causes non-decodable CRC collisions, more harmful than CCI
WEIGHT_AP_DENSITY = 2.0

def dbm_to_milliwatts(rssi_dbm: float) -> float:
    """Convert dBm to linear milliwatts."""
    return 10.0 ** (rssi_dbm / 10.0)

def milliwatts_to_dbm(mw: float) -> float:
    """Convert linear milliwatts back to dBm."""
    if mw <= 0:
        return -100.0
    return 10.0 * math.log10(mw)

def calculate_spectral_overlap_24(ch1: int, ch2: int) -> float:
    """
    Calculate spectral overlap factor between two 2.4 GHz channels.
    Wi-Fi 802.11 b/g/n channels are 20/22 MHz wide with 5 MHz spacing.
    """
    if ch1 == ch2:
        return 1.0
    
    # Channel 14 has special spacing (12 MHz from ch 13)
    if ch1 == 14 or ch2 == 14:
        diff_mhz = abs(2484 - CHANNELS_24_GHZ.get(min(ch1, ch2), 2412))
    else:
        diff_mhz = abs(ch1 - ch2) * 5

    if diff_mhz >= 22:
        return 0.0
    
    # Overlap fraction based on spectral mask
    return max(0.0, 1.0 - (diff_mhz / 22.0))

class SpectrumAnalyzer:
    """
    Advanced mathematical analyzer for Wi-Fi radio spectrum.
    Calculates CCI, ACI, channel occupancy, and signal stability metrics.
    """

    @staticmethod
    def compute_channel_metrics(ap_list: List[ScannedAP]) -> Dict[str, Any]:
        """
        Compute comprehensive channel metrics for both 2.4 GHz and 5 GHz bands.
        """
        # Separate by band
        aps_24 = [ap for ap in ap_list if ap.channel <= 14]
        aps_5 = [ap for ap in ap_list if ap.channel >= 36]

        metrics_24 = SpectrumAnalyzer._analyze_24ghz(aps_24)
        metrics_5 = SpectrumAnalyzer._analyze_5ghz(aps_5)

        total_aps = len(ap_list)
        avg_signal = sum(ap.rssi for ap in ap_list) / total_aps if total_aps > 0 else -100

        # General Environment Health Score (0 - 100)
        overall_health = SpectrumAnalyzer._compute_global_health(metrics_24, metrics_5)

        return {
            "total_aps": total_aps,
            "aps_24ghz_count": len(aps_24),
            "aps_5ghz_count": len(aps_5),
            "average_rssi_dbm": round(avg_signal, 1),
            "overall_health_score": overall_health,
            "channels_24ghz": metrics_24,
            "channels_5ghz": metrics_5
        }

    @staticmethod
    def _analyze_24ghz(aps: List[ScannedAP]) -> Dict[int, Dict[str, Any]]:
        channel_data: Dict[int, Dict[str, Any]] = {}

        # Initialize all 14 channels
        for ch in range(1, 15):
            channel_data[ch] = {
                "channel": ch,
                "band": "2.4GHz",
                "center_freq_mhz": CHANNELS_24_GHZ.get(ch, 2412),
                "ap_count": 0,
                "aps": [],
                "co_channel_power_mw": 0.0,
                "adjacent_channel_power_mw": 0.0,
                "cci_score": 0.0,
                "aci_score": 0.0,
                "total_interference_penalty": 0.0,
                "channel_health": 100,  # 0 to 100%
                "max_rssi": -100,
                "avg_rssi": -100,
                "is_standard": ch in NON_OVERLAPPING_CHANNELS_24
            }

        # Step 1: Accumulate APs and Co-Channel power
        for ap in aps:
            ch = ap.channel
            if 1 <= ch <= 14:
                cd = channel_data[ch]
                cd["ap_count"] += 1
                cd["aps"].append(ap.to_dict())
                mw = dbm_to_milliwatts(ap.rssi)
                cd["co_channel_power_mw"] += mw
                if ap.rssi > cd["max_rssi"]:
                    cd["max_rssi"] = ap.rssi

        # Step 2: Calculate Adjacent Channel Interference (ACI) and scores
        for target_ch in range(1, 15):
            target = channel_data[target_ch]
            aci_mw = 0.0

            for other_ch in range(1, 15):
                if target_ch == other_ch:
                    continue
                overlap = calculate_spectral_overlap_24(target_ch, other_ch)
                if overlap > 0:
                    other_mw = channel_data[other_ch]["co_channel_power_mw"]
                    aci_mw += (other_mw * overlap)

            target["adjacent_channel_power_mw"] = aci_mw

            # Normalized engineering scores (scaled 0 to 100)
            # 1e-4 mW = -40 dBm (very high interference), 1e-7 mW = -70 dBm (low interference)
            cci_val = min(100.0, (target["co_channel_power_mw"] / 1e-5) * 20.0 + (target["ap_count"] * 10.0))
            aci_val = min(100.0, (target["adjacent_channel_power_mw"] / 1e-5) * 25.0)

            penalty = (cci_val * WEIGHT_CO_CHANNEL) + (aci_val * WEIGHT_ADJACENT_CHANNEL) + (target["ap_count"] * WEIGHT_AP_DENSITY)
            target["cci_score"] = round(cci_val, 1)
            target["aci_score"] = round(aci_val, 1)
            target["total_penalty"] = round(penalty, 1)

            # Channel health score
            health = max(5, int(100.0 - min(95.0, penalty * 0.45)))
            target["channel_health"] = health

            if target["ap_count"] > 0:
                total_rssi = sum(a["rssi"] for a in target["aps"])
                target["avg_rssi"] = round(total_rssi / target["ap_count"], 1)

        return channel_data

    @staticmethod
    def _analyze_5ghz(aps: List[ScannedAP]) -> Dict[int, Dict[str, Any]]:
        channel_data: Dict[int, Dict[str, Any]] = {}

        for ch in CHANNELS_5_GHZ:
            channel_data[ch] = {
                "channel": ch,
                "band": "5GHz",
                "center_freq_mhz": 5000 + (ch * 5),
                "ap_count": 0,
                "aps": [],
                "co_channel_power_mw": 0.0,
                "cci_score": 0.0,
                "aci_score": 0.0,
                "total_penalty": 0.0,
                "channel_health": 100,
                "max_rssi": -100,
                "avg_rssi": -100
            }

        for ap in aps:
            ch = ap.channel
            if ch in channel_data:
                cd = channel_data[ch]
                cd["ap_count"] += 1
                cd["aps"].append(ap.to_dict())
                mw = dbm_to_milliwatts(ap.rssi)
                cd["co_channel_power_mw"] += mw
                if ap.rssi > cd["max_rssi"]:
                    cd["max_rssi"] = ap.rssi

        # 5GHz channels generally do not overlap at 20MHz; co-channel dominates
        for ch, cd in channel_data.items():
            cci_val = min(100.0, (cd["co_channel_power_mw"] / 1e-5) * 20.0 + (cd["ap_count"] * 8.0))
            penalty = cci_val + (cd["ap_count"] * 2.0)
            cd["cci_score"] = round(cci_val, 1)
            cd["total_penalty"] = round(penalty, 1)
            cd["channel_health"] = max(10, int(100.0 - min(90.0, penalty * 0.5)))
            if cd["ap_count"] > 0:
                total_rssi = sum(a["rssi"] for a in cd["aps"])
                cd["avg_rssi"] = round(total_rssi / cd["ap_count"], 1)

        return channel_data

    @staticmethod
    def _compute_global_health(metrics_24: Dict[int, Dict[str, Any]], metrics_5: Dict[int, Dict[str, Any]]) -> int:
        """Calculate weighted spectrum health of the scanned environment."""
        # 2.4 GHz channels 1, 6, 11 are most representative
        health_24 = [metrics_24[ch]["channel_health"] for ch in [1, 6, 11] if ch in metrics_24]
        avg_24 = sum(health_24) / len(health_24) if health_24 else 70.0

        # 5 GHz sample
        health_5 = [m["channel_health"] for m in metrics_5.values() if m["ap_count"] > 0]
        avg_5 = sum(health_5) / len(health_5) if health_5 else 90.0

        combined = (avg_24 * 0.6) + (avg_5 * 0.4)
        return int(max(10, min(100, combined)))
