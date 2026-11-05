export interface Member {
  id: string;
  name: string;
  internal_id?: string;
  created_at: string;
}

export interface StoreSettings {
  id: number;
  required_match_count: number;
  display_top_n: number;
  updated_at: string;
}

export interface MatchResult {
  id: string;
  match_id: string;
  member_id: string;
  placement: 1 | 2 | 3 | 4;
}

export interface Match {
  id: string;
  date: string;
  player_count: 3 | 4;
  table_number?: string;
  cancelled?: boolean;
  cancelled_at?: string;
  cancelled_by?: string;
  cancel_reason?: string;
  created_by?: string;
  created_at: string;
  results?: MatchResult[];
}

export type PointType = string;

export interface PointTypeConfig {
  id: string;
  type_key: string;
  label: string;
  default_points: number;
  display_order: number;
  category: string;
  is_active: boolean;
  updated_at: string;
}

export interface PointHistory {
  id: string;
  member_id: string;
  points_changed: number;
  point_type: PointType;
  reason: string;
  cancelled?: boolean;
  cancelled_at?: string;
  cancelled_by?: string;
  cancel_reason?: string;
  created_by?: string;
  created_by_email?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  role: 'admin' | 'staff' | 'user';
  member_id: string | null;
  created_at: string;
}
