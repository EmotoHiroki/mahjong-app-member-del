import { useState, useEffect } from 'react';
import { getMatches, getPointHistory, getMembers } from '../lib/db';
import type { Match, PointHistory, Member } from '../types';
import { XCircle } from 'lucide-react';

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '---';

const AdminCancelLog = () => {
  const [cancelledMatches, setCancelledMatches] = useState<Match[]>([]);
  const [cancelledPoints, setCancelledPoints] = useState<PointHistory[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMatches(), getPointHistory(), getMembers()])
      .then(([mt, h, m]) => {
        setCancelledMatches(mt.filter(x => x.cancelled));
        setCancelledPoints(h.filter(x => x.cancelled));
        setMembers(m);
      })
      .finally(() => setLoading(false));
  }, []);

  const memberName = (id: string) => members.find(m => m.id === id)?.name ?? id.slice(0, 8);

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  return (
    <div className="animate-fade">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
          <XCircle size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: '#FF3B30' }} />
          キャンセル済み対戦
          <span className="badge" style={{ marginLeft: '0.5rem' }}>{cancelledMatches.length}</span>
        </h2>
        {cancelledMatches.length === 0 ? (
          <p className="text-muted text-center" style={{ fontSize: '0.85rem' }}>キャンセル済みの対戦はありません。</p>
        ) : (
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {cancelledMatches.map(m => (
              <div key={m.id} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem', borderLeft: '3px solid #FF3B30' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{fmt(m.date)}</span>
                  <span style={{ fontSize: '0.75rem', color: '#FF3B30', fontWeight: 700 }}>取消済み</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  取消日: {fmt(m.cancelled_at)}
                  {m.table_number && ` ・ テーブル: ${m.table_number}`}
                </div>
                {(m.results || []).length > 0 && (
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                    参加: {(m.results || []).map(r => memberName(r.member_id)).join('、')}
                  </div>
                )}
                {m.cancel_reason && (
                  <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>理由: {m.cancel_reason}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
          <XCircle size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: '#FF3B30' }} />
          キャンセル済みポイント
          <span className="badge" style={{ marginLeft: '0.5rem' }}>{cancelledPoints.length}</span>
        </h2>
        {cancelledPoints.length === 0 ? (
          <p className="text-muted text-center" style={{ fontSize: '0.85rem' }}>キャンセル済みのポイントはありません。</p>
        ) : (
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {cancelledPoints.map(h => (
              <div key={h.id} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem', borderLeft: '3px solid #FF3B30' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{memberName(h.member_id)}</span>
                  <span style={{ fontWeight: 700, color: h.points_changed >= 0 ? '#34C759' : '#FF3B30', fontSize: '0.9rem' }}>
                    {h.points_changed >= 0 ? '+' : ''}{h.points_changed}pt
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {h.point_type} ・ {fmt(h.created_at)} ・ 取消: {fmt(h.cancelled_at)}
                </div>
                {h.reason && h.reason !== h.point_type && (
                  <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>備考: {h.reason}</div>
                )}
                {h.cancel_reason && (
                  <div style={{ fontSize: '0.78rem', marginTop: '0.2rem', color: '#FF3B30' }}>取消理由: {h.cancel_reason}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCancelLog;
