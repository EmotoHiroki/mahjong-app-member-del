import { useState, useEffect } from 'react';
import { getMembers, addPointHistory, getPointHistory, cancelPointHistory, getPointTypeConfig } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import type { Member, PointHistory, PointTypeConfig } from '../types';
import { Coins, Clock, Ban, CheckCircle } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  '基本': '#007AFF',
  '登録系': '#34C759',
  '店舗イベント': '#9B59B6',
  '月間MVP': '#FFD700',
  '季節イベント': '#FF9500',
  'その他': '#8E8E93',
};

const AdminPoints = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [members, setMembers] = useState<Member[]>([]);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [pointTypes, setPointTypes] = useState<PointTypeConfig[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [pointType, setPointType] = useState('');
  const [pointDelta, setPointDelta] = useState<number | ''>(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [cancelTarget, setCancelTarget] = useState<PointHistory | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    const [m, h, pt] = await Promise.all([getMembers(), getPointHistory(), getPointTypeConfig()]);
    setMembers(m);
    setPointHistory(h);
    setPointTypes(pt);
    if (!pointType && pt.length > 0) {
      setPointType(pt[0].type_key);
      setPointDelta(pt[0].default_points);
    }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleTypeChange = (cfg: PointTypeConfig) => {
    setPointType(cfg.type_key);
    setPointDelta(cfg.default_points);
  };

  const handleUpdatePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || pointDelta === '' || pointDelta === 0) return;
    setSaving(true);
    await addPointHistory(selectedMemberId, Number(pointDelta), pointType, reason.trim());
    const memberName = members.find(m => m.id === selectedMemberId)?.name || '';
    setSuccess(`${memberName} に ${Number(pointDelta) > 0 ? '+' : ''}${pointDelta} pt（${pointType}）を付与しました。`);
    const cfg = pointTypes.find(p => p.type_key === pointType);
    setPointDelta(cfg?.default_points ?? 0);
    setReason('');
    await load();
    setSaving(false);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancelling(true);
    await cancelPointHistory(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setCancelReason('');
    await load();
    setCancelling(false);
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || '不明';

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const categories = [...new Set(pointTypes.map(p => p.category))];

  if (loading) {
    return <div className="loading-center"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="animate-fade admin-two-col">
    <div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Coins size={20} color="var(--primary)" />
          <h2 style={{ marginBottom: 0 }}>ポイント付与</h2>
        </div>
        <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
          来店ポイント・各種キャンペーンポイントを会員に付与します。
        </p>

        {success && (
          <div className="alert-success" style={{ marginBottom: '1rem' }}>
            <CheckCircle size={15} /> {success}
          </div>
        )}

        <form onSubmit={handleUpdatePoints}>
          <div className="form-group">
            <label className="form-label">会員を選択</label>
            <select className="form-control" value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)} required>
              <option value="">-- 会員を選択してください --</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">ポイント種別</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {categories.map(cat => {
                const catTypes = pointTypes.filter(p => p.category === cat);
                const color = CATEGORY_COLORS[cat] || '#8E8E93';
                const isReserve = cat === '季節イベント';
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {cat}
                      </span>
                      {isReserve && (
                        <span style={{ fontSize: '0.6rem', background: '#FF950020', color: '#FF9500', padding: '0.05rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                          予備
                        </span>
                      )}
                    </div>
                    <div className="point-type-grid">
                      {catTypes.map(cfg => (
                        <button key={cfg.type_key} type="button"
                          className={`point-type-btn ${pointType === cfg.type_key ? 'active' : ''}`}
                          style={pointType === cfg.type_key
                            ? { borderColor: color, color, background: color + '14' }
                            : { opacity: isReserve ? 0.7 : 1 }}
                          onClick={() => handleTypeChange(cfg)}>
                          <span style={{ fontSize: '0.82rem' }}>{cfg.label}</span>
                          <span style={{ fontSize: '0.65rem', color: pointType === cfg.type_key ? color : 'var(--text-muted)' }}>
                            {cfg.default_points > 0 ? `${cfg.default_points}pt` : '任意'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">ポイント数</label>
            <input type="number" className="form-control" value={pointDelta}
              onChange={e => setPointDelta(e.target.value === '' ? '' : parseInt(e.target.value))}
              placeholder="例：100" required style={{ fontWeight: 800, fontSize: '1.1rem' }} />
            <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.35rem' }}>
              ※減算する場合はマイナスで入力（例：-100）
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">
              理由・メモ{pointType !== 'その他' ? '（任意）' : ''}
            </label>
            <input type="text" className="form-control" value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="例：キャンペーンボーナス"
              required={pointType === 'その他'} />
          </div>

          <button type="submit" className="btn btn-primary w-full" style={{ padding: '1rem' }}
            disabled={saving || !selectedMemberId || pointDelta === '' || pointDelta === 0 || !pointType}>
            {saving ? '付与中...' : `${selectedMemberId ? getMemberName(selectedMemberId) + ' に' : ''}ポイントを付与する`}
          </button>
        </form>
      </div>
    </div>

    <div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Clock size={17} color="var(--text-muted)" />
          <h2 style={{ fontSize: '1rem', marginBottom: 0 }}>ポイント付与履歴</h2>
        </div>
        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          {pointHistory.length === 0 ? (
            <p className="text-muted text-center" style={{ padding: '1.5rem' }}>履歴がありません。</p>
          ) : (
            pointHistory.map(h => (
              <div key={h.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.7rem 0', borderBottom: '1px solid var(--border)', gap: '0.5rem',
                opacity: h.cancelled ? 0.5 : 1,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700, fontSize: '0.88rem',
                    textDecoration: h.cancelled ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {getMemberName(h.member_id)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    <span className="history-type-badge">{h.cancelled ? '取消済' : (h.point_type || h.reason)}</span>
                    {h.cancel_reason && <span style={{ marginLeft: '0.35rem' }}>· {h.cancel_reason}</span>}
                    {!h.cancelled && h.reason && h.reason !== h.point_type && (
                      <span style={{ marginLeft: '0.35rem' }}>· {h.reason}</span>
                    )}
                    <span style={{ marginLeft: '0.35rem' }}>· {formatDate(h.created_at)}</span>
                    {h.created_by_email && (
                      <span style={{ marginLeft: '0.35rem' }}>· 付与: {h.created_by_email}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{
                    fontWeight: 800, fontSize: '0.95rem',
                    color: h.cancelled ? 'var(--text-muted)' : (h.points_changed >= 0 ? 'var(--success)' : 'var(--danger)'),
                    textDecoration: h.cancelled ? 'line-through' : 'none',
                  }}>
                    {h.points_changed > 0 ? '+' : ''}{h.points_changed} pt
                  </span>
                  {isAdmin && !h.cancelled && (
                    <button className="btn-icon-danger" onClick={() => { setCancelTarget(h); setCancelReason(''); }} title="取消">
                      <Ban size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>

      {cancelTarget && (
        <div className="modal-overlay" onClick={() => setCancelTarget(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem' }}>ポイントを取消しますか？</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
              {getMemberName(cancelTarget.member_id)} · {cancelTarget.points_changed > 0 ? '+' : ''}{cancelTarget.points_changed} pt
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

export default AdminPoints;
