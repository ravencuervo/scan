export interface WirelessAdapter {
  id: string;
  name: string;
  description: string;
  mac_address: string;
  guid?: string;
  status: 'connected' | 'disconnected' | 'disabled' | string;
  connected_ssid?: string | null;
  connected_bssid?: string | null;
  current_channel?: number | null;
  current_band?: string | null;
  radio_type?: string | null;
  is_physical?: boolean;
  driver?: string | null;
}

export interface ScannedAP {
  bssid: string;
  ssid: string;
  channel: number;
  frequency_mhz: number;
  band: string;
  rssi: number;
  signal_quality: number;
  security: string;
  channel_width: number;
  vendor: string;
  timestamp: number;
  adapter_name?: string | null;
}

export interface ChannelData {
  channel: number;
  band: string;
  center_freq_mhz: number;
  ap_count: number;
  aps: ScannedAP[];
  cci_score: number;
  aci_score: number;
  total_penalty: number;
  channel_health: number;
  is_standard?: boolean;
}

export interface SpectrumMetrics {
  total_aps: number;
  aps_24ghz_count: number;
  aps_5ghz_count: number;
  average_rssi_dbm: number;
  overall_health_score: number;
  channels_24ghz: Record<string, ChannelData>;
  channels_5ghz: Record<string, ChannelData>;
}

export interface Finding {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  channel: number | null;
  band: string;
  title: string;
  description: string;
  cci_score?: number;
  aci_score?: number;
}

export interface Recommendation {
  type: string;
  target_channel: number;
  band: string;
  title: string;
  detail: string;
  action: string;
}

export interface SpectrumRecommendations {
  summary: string;
  optimal_channel_24: number;
  optimal_channel_5: number;
  findings: Finding[];
  recommendations: Recommendation[];
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

export interface TelemetryPayload {
  type: string;
  session_id: number | null;
  engine_type: string;
  adapters?: WirelessAdapter[];
  selected_adapter?: string;
  metrics: SpectrumMetrics;
  recommendations: SpectrumRecommendations;
  access_points: ScannedAP[];
}
