import { supabase } from './supabase';
import type { Member, Match, PointHistory, PointType, PointTypeConfig, StoreSettings } from '../types';

export const getMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const addMember = async (name: string): Promise<Member> => {
  const { data, error } = await supabase
    .from('members')
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateMemberName = async (id: string, name: string): Promise<void> => {
  const { error } = await supabase.from('members').update({ name }).eq('id', id);
  if (error) throw error;
};

export const deleteMember = async (id: string): Promise<void> => {
  const { data, error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data?.length) {
    throw new Error('会員を削除できませんでした。削除権限または会員の登録状態を確認してください。');
  }
};

export const getMatches = async (): Promise<Match[]> => {
  const { data, error } = await supabase
    .from('matches')
    .select('*, results:match_results(*)')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []) as Match[];
};

export const addMatch = async (
  results: { member_id: string; placement: 1 | 2 | 3 | 4 }[],
  player_count: 3 | 4,
  table_number?: string
): Promise<void> => {
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({ date: new Date().toISOString(), player_count, table_number: table_number || null })
    .select()
    .single();
  if (matchError) throw matchError;

  const { error: resultsError } = await supabase
    .from('match_results')
    .insert(results.map(r => ({ ...r, match_id: match.id })));
  if (resultsError) throw resultsError;
};

export const cancelMatch = async (id: string, cancel_reason: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  const { error } = await supabase
    .from('matches')
    .update({
      cancelled: true,
      cancelled_at: new Date().toISOString(),
      cancelled_by: session?.user?.id ?? null,
      cancel_reason,
    })
    .eq('id', id);
  if (error) throw error;
};

export const getPointHistory = async (memberId?: string): Promise<PointHistory[]> => {
  let query = supabase
    .from('point_history')
    .select('*')
    .order('created_at', { ascending: false });
  if (memberId) query = query.eq('member_id', memberId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const addPointHistory = async (
  member_id: string,
  points_changed: number,
  point_type: PointType,
  reason: string
): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  const { error } = await supabase
    .from('point_history')
    .insert({
      member_id,
      points_changed,
      point_type,
      reason: reason || point_type,
      created_by: session?.user?.id ?? null,
      created_by_email: session?.user?.email ?? null,
    });
  if (error) throw error;
};

export const cancelPointHistory = async (id: string, cancel_reason: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  const { error } = await supabase
    .from('point_history')
    .update({
      cancelled: true,
      cancelled_at: new Date().toISOString(),
      cancelled_by: session?.user?.id ?? null,
      cancel_reason,
    })
    .eq('id', id);
  if (error) throw error;
};

export const getStoreSettings = async (): Promise<StoreSettings> => {
  const { data, error } = await supabase.from('store_settings').select('*').single();
  if (error) return { id: 1, required_match_count: 50, display_top_n: 10, updated_at: new Date().toISOString() };
  return data;
};

export const updateStoreSettings = async (
  settings: Partial<Pick<StoreSettings, 'required_match_count' | 'display_top_n'>>
): Promise<void> => {
  const { error } = await supabase
    .from('store_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw error;
};

export const getPointTypeConfig = async (): Promise<PointTypeConfig[]> => {
  const { data, error } = await supabase
    .from('point_type_config')
    .select('*')
    .order('display_order');
  if (error) throw error;
  return data || [];
};

export const updatePointTypeDefault = async (id: string, default_points: number): Promise<void> => {
  const { error } = await supabase
    .from('point_type_config')
    .update({ default_points, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

export const getLinkedMemberIds = async (): Promise<Set<string>> => {
  const { data } = await supabase
    .from('profiles')
    .select('member_id')
    .not('member_id', 'is', null);
  return new Set((data || []).map(p => p.member_id as string));
};

export const promoteTempMember = async (
  memberId: string,
  email: string,
  password: string
): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('create-member', {
    body: { member_id: memberId, email, password },
  });
  if (error || data?.error) throw new Error(data?.error || error?.message || '正式会員化に失敗しました');
};

export interface MemberStats {
  member: Member;
  totalMatches: number;
  placements: { 1: number; 2: number; 3: number; 4: number };
  totalPoints: number;
  avgRank: number;
  topRate: number;
  maxWinStreak: number;
  currentWinStreak: number;
}

export type StatsPeriod = 'all' | 'today' | 'monthly' | 'yearly' | { year: number; month: number };
export type RankingMetric = 'avgRank' | 'topRate' | 'maxStreak' | 'totalMatches';
export type RankingFilter = 'all' | 'qualified';

export const computeStats = (
  member: Member,
  allMatches: Match[],
  allHistory: PointHistory[],
  period: StatsPeriod
): MemberStats => {
  const now = new Date();

  const isInPeriod = (iso: string) => {
    const d = new Date(iso);
    if (period === 'all') return true;
    if (period === 'today') {
      return d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
    }
    if (period === 'yearly') return d.getFullYear() === now.getFullYear();
    if (period === 'monthly') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    return d.getFullYear() === period.year && d.getMonth() === period.month;
  };

  const myResults = allMatches
    .filter(m => !m.cancelled && isInPeriod(m.date))
    .flatMap(m => m.results || [])
    .filter(r => r.member_id === member.id);

  const myHistory = allHistory.filter(
    h => !h.cancelled && h.member_id === member.id && isInPeriod(h.created_at)
  );

  const placements: { 1: number; 2: number; 3: number; 4: number } = { 1: 0, 2: 0, 3: 0, 4: 0 };
  myResults.forEach(r => { placements[r.placement as 1 | 2 | 3 | 4]++; });

  // win streaks are always computed across all-time (not period-filtered)
  const chronoMatches = allMatches
    .filter(m => !m.cancelled)
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let maxStreak = 0;
  let streak = 0;
  for (const m of chronoMatches) {
    const res = (m.results || []).find(r => r.member_id === member.id);
    if (res?.placement === 1) {
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    } else if (res) {
      streak = 0;
    }
  }
  const currentWinStreak = streak;

  const totalPoints = myHistory.reduce((sum, h) => sum + h.points_changed, 0);
  const totalMatches = myResults.length;
  const totalRank = placements[1] * 1 + placements[2] * 2 + placements[3] * 3 + placements[4] * 4;
  const avgRank = totalMatches > 0 ? totalRank / totalMatches : 0;
  const topRate = totalMatches > 0 ? placements[1] / totalMatches : 0;

  return { member, totalMatches, placements, totalPoints, avgRank, topRate, maxWinStreak: maxStreak, currentWinStreak };
};

export const computeRanking = (
  members: Member[],
  allMatches: Match[],
  allHistory: PointHistory[],
  period: StatsPeriod,
  metric: RankingMetric,
  filter: RankingFilter,
  requiredMatchCount: number,
  displayTopN: number
): MemberStats[] => {
  let stats = members.map(m => computeStats(m, allMatches, allHistory, period));

  if (filter === 'qualified') {
    stats = stats.filter(s => s.totalMatches >= requiredMatchCount);
  }

  stats.sort((a, b) => {
    const hasA = a.totalMatches > 0;
    const hasB = b.totalMatches > 0;
    if (!hasA && !hasB) return 0;
    if (!hasA) return 1;
    if (!hasB) return -1;

    switch (metric) {
      case 'avgRank':
        return a.avgRank !== b.avgRank ? a.avgRank - b.avgRank : b.totalMatches - a.totalMatches;
      case 'topRate':
        return a.topRate !== b.topRate ? b.topRate - a.topRate : b.totalMatches - a.totalMatches;
      case 'maxStreak':
        return a.maxWinStreak !== b.maxWinStreak ? b.maxWinStreak - a.maxWinStreak : b.totalMatches - a.totalMatches;
      case 'totalMatches':
        return b.totalMatches - a.totalMatches;
    }
  });

  return displayTopN === 9999 ? stats : stats.slice(0, displayTopN);
};
