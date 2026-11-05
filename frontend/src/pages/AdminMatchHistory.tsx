import { useState, useEffect } from 'react';
import { getMatches, getMembers, cancelMatch } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import type { Match, Member } from '../types';
import { Calendar, Ban, History as HistoryIcon } from 'lucide-react';

type Period = 'all' | 'monthly';

const AdminMatchHistory = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [matches, setMatches] = useState<Match[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Match | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    const [mt, m] = await Promise.all([getMatches(), getMembers()]);
    setMatches(mt);
    setMembers(m);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || '不明';

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const now = new Date();
  const filteredMatches = period === 'monthly'
    ? matches.filter(m => {
        const d = new Date(m.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
    : matches;

  const handleCancelConfirm = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancelling(true);
    await cancelMatch(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setCancelReason('');
    await load();
    setCancelling(false);
  };

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h2 style={{ marginBottom: 0 }}>
          <HistoryIcon size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          対戦履歴
        </h2>
        <div className="period-toggle">
          <button className={`period-btn ${period === 'all' ? 'active' : ''}`} onClick={() => setPeriod('all')}>全期間</button>
          <button className={`period-btn ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>今月</button>
        </div>
      </div>
      <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
        入力済みの対戦結果一覧です。{isAdmin && '誤入力の対戦はここから取消できます。'}
      </p>

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
                      <>
                        <div className="badge" style={{ background: '#F2F2F7' }}>{match.player_count ?? 3}人戦</div>
                        {isAdmin && (
                          <button className="btn-icon-danger" onClick={() => { setCancelTarget(match); setCancelReason(''); }} title="取消">
                            <Ban size={14} />
                          </button>
                        )}
                      </>
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

      {cancelTarget && (
        <div className="modal-overlay" onClick={() => setCancelTarget(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem' }}>この対戦を取消しますか？</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
              {formatDate(cancelTarget.date)} · {cancelTarget.player_count}人戦
            </p>
            <div className="form-group">
              <label className="form-label">取消理由（必須）</label>
              <input type="text" className="form-control" value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="例：誤入力のため" autoFocus />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn w-full"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '0.85rem' }}
                onClick={() => setCancelTarget(null)}>キャンセル</button>
              <button className="btn w-full"
                style={{ background: 'var(--danger)', color: 'white', padding: '0.85rem', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: cancelReason.trim() ? 'pointer' : 'not-allowed', opacity: cancelReason.trim() ? 1 : 0.5 }}
                disabled={!cancelReason.trim() || cancelling}
                onClick={handleCancelConfirm}>
                {cancelling ? '取消中...' : '取消する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMatchHistory;
