import { useState, useEffect } from 'react';
import { getMatches, getMembers } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import type { Match, Member } from '../types';
import { Calendar } from 'lucide-react';

type Period = 'all' | 'monthly';

const MatchHistory = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [matches, setMatches] = useState<Match[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [mt, m] = await Promise.all([getMatches(), getMembers()]);
    setMatches(mt);
    setMembers(m);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [profile]);

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || '不明';

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const myMemberId = profile?.member_id;
  const now = new Date();

  // General members only see their own ACTIVE matches (cancelled matches are hidden).
  const visibleMatches = isAdmin
    ? matches
    : matches.filter(m => !m.cancelled && m.results?.some(r => r.member_id === myMemberId));

  const filteredMatches = period === 'monthly'
    ? visibleMatches.filter(m => {
        const d = new Date(m.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
    : visibleMatches;

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h2 style={{ marginBottom: 0 }}>対戦履歴</h2>
        <div className="period-toggle">
          <button className={`period-btn ${period === 'all' ? 'active' : ''}`} onClick={() => setPeriod('all')}>全期間</button>
          <button className={`period-btn ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>今月</button>
        </div>
      </div>

      <div className="mt-4">
        {filteredMatches.length === 0 ? (
          <div className="card text-center"><p className="text-muted">履歴がありません。</p></div>
        ) : (
          filteredMatches.map(match => {
            const sortedResults = [...(match.results || [])].sort((a, b) => a.placement - b.placement);
            return (
              <div key={match.id} className="history-item" style={{ opacity: match.cancelled ? 0.55 : 1 }}>
                <div className="history-header">
                  <div className="flex align-center gap-2 text-muted" style={{ fontWeight: 700 }}>
                    <Calendar size={14} />
                    <span style={{ textDecoration: match.cancelled ? 'line-through' : 'none' }}>
                      {formatDate(match.date)}
                    </span>
                    {match.table_number && (
                      <span style={{ fontSize: '0.72rem', background: 'var(--bg-elevated)', padding: '0.1rem 0.4rem', borderRadius: '6px' }}>
                        {match.table_number}
                      </span>
                    )}
                  </div>
                  <div className="flex align-center gap-2">
                    {match.cancelled ? (
                      <span style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 700, background: '#FF3B3014', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                        取消済
                      </span>
                    ) : (
                      <div className="badge" style={{ background: '#F2F2F7' }}>{match.player_count ?? 3}人戦</div>
                    )}
                  </div>
                </div>
                {match.cancel_reason && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginBottom: '0.35rem' }}>
                    取消理由: {match.cancel_reason}
                  </div>
                )}
                <div className="history-grid" style={{ opacity: match.cancelled ? 0.6 : 1 }}>
                  {sortedResults.map((res, idx) => (
                    <div key={res.id || idx} className={`rank-pill rank-${res.placement}`}>
                      <span>{res.placement}着</span>
                      <span style={{ fontWeight: 800 }}>{getMemberName(res.member_id)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MatchHistory;
