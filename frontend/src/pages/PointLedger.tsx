import { useState, useEffect } from 'react';
import { getPointHistory } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import type { PointHistory } from '../types';
import { Coins, TrendingUp, TrendingDown } from 'lucide-react';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`;
};

const PointLedger = () => {
  const { profile } = useAuth();
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.member_id) { setLoading(false); return; }
    getPointHistory(profile.member_id)
      .then(h => setHistory(h))
      .finally(() => setLoading(false));
  }, [profile]);

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  if (!profile?.member_id) {
    return (
      <div className="animate-fade">
        <div className="card text-center">
          <p className="text-muted">ポイント履歴を表示するには会員登録が必要です。</p>
        </div>
      </div>
    );
  }

  const active = history.filter(h => !h.cancelled);
  const total = active.reduce((sum, h) => sum + h.points_changed, 0);

  // build running balance from oldest to newest, then reverse for display
  const withBalance: (PointHistory & { balance: number })[] = [];
  let running = 0;
  for (const h of [...active].reverse()) {
    running += h.points_changed;
    withBalance.push({ ...h, balance: running });
  }
  withBalance.reverse();

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h2 style={{ marginBottom: 0 }}>ポイント通帳</h2>
      </div>

      {/* Total balance card */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '0.75rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Coins size={20} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>合計ポイント</span>
        </div>
        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
          {total.toLocaleString()}
          <span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: '0.3rem' }}>pt</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          {active.length} 件の明細
        </div>
      </div>

      {/* Ledger rows */}
      <div className="card" style={{ padding: '0.5rem 1rem' }}>
        {withBalance.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '1.5rem 0' }}>
            ポイント履歴がありません。
          </p>
        ) : (
          withBalance.map(h => (
            <div key={h.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 0',
              borderBottom: '1px solid var(--border)',
              gap: '0.5rem',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {h.points_changed >= 0
                    ? <TrendingUp size={14} color="var(--success)" />
                    : <TrendingDown size={14} color="var(--danger)" />}
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                    {h.point_type}
                  </span>
                </div>
                {h.reason && h.reason !== h.point_type && (
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.1rem', paddingLeft: '1.2rem' }}>
                    {h.reason}
                  </div>
                )}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem', paddingLeft: '1.2rem' }}>
                  {formatDate(h.created_at)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontWeight: 800,
                  fontSize: '1rem',
                  color: h.points_changed >= 0 ? 'var(--success)' : 'var(--danger)',
                }}>
                  {h.points_changed > 0 ? '+' : ''}{h.points_changed} pt
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  残高 {h.balance.toLocaleString()} pt
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PointLedger;
