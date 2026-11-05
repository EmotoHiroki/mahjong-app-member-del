import { useState, useEffect } from 'react';
import { getPointTypeConfig, updatePointTypeDefault } from '../lib/db';
import type { PointTypeConfig } from '../types';
import { SlidersHorizontal, CheckCircle } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  '基本': '#007AFF',
  '登録系': '#34C759',
  '店舗イベント': '#9B59B6',
  '月間MVP': '#FFD700',
  '季節イベント': '#FF9500',
  'その他': '#8E8E93',
};

const AdminPointTypes = () => {
  const [types, setTypes] = useState<PointTypeConfig[]>([]);
  const [editing, setEditing] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPointTypeConfig()
      .then(data => {
        setTypes(data);
        const init: Record<string, number> = {};
        data.forEach(t => { init[t.id] = t.default_points; });
        setEditing(init);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (t: PointTypeConfig) => {
    const newVal = editing[t.id];
    if (newVal === t.default_points) return;
    setSaving(t.id);
    await updatePointTypeDefault(t.id, newVal);
    setTypes(prev => prev.map(p => p.id === t.id ? { ...p, default_points: newVal } : p));
    setSaving(null);
    setSaved(t.id);
    setTimeout(() => setSaved(null), 2000);
  };

  const categories = [...new Set(types.map(t => t.category))];

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  return (
    <div className="animate-fade">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <SlidersHorizontal size={20} color="var(--primary)" />
          <h2 style={{ marginBottom: 0 }}>ポイント項目管理</h2>
        </div>
        <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.5rem' }}>
          各ポイント種別のデフォルト値を変更できます。付与時に個別変更も可能です。
        </p>

        {categories.map(cat => {
          const catTypes = types.filter(t => t.category === cat);
          const color = CATEGORY_COLORS[cat] || '#8E8E93';
          const isReserve = cat === '季節イベント';

          return (
            <div key={cat} style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <div style={{ width: '3px', height: '14px', background: color, borderRadius: '2px' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>
                  {cat}
                </span>
                {isReserve && (
                  <span style={{ fontSize: '0.62rem', background: '#FF950020', color: '#FF9500', padding: '0.05rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                    予備項目
                  </span>
                )}
              </div>

              {catTypes.map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0', borderBottom: '1px solid var(--border)',
                  opacity: isReserve ? 0.75 : 1,
                }}>
                  <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>
                    {t.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number"
                      value={editing[t.id] ?? t.default_points}
                      onChange={e => setEditing(prev => ({ ...prev, [t.id]: parseInt(e.target.value) || 0 }))}
                      style={{
                        width: '80px', textAlign: 'right', fontWeight: 700,
                        border: '1px solid var(--border)', borderRadius: '8px',
                        padding: '0.35rem 0.5rem', fontSize: '0.9rem',
                        background: 'var(--bg-surface)', color: 'var(--text-primary)',
                      }}
                    />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>pt</span>
                    <button
                      onClick={() => handleSave(t)}
                      disabled={saving === t.id || editing[t.id] === t.default_points}
                      style={{
                        padding: '0.35rem 0.7rem', fontSize: '0.75rem', fontWeight: 700,
                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                        background: saved === t.id ? 'var(--success)' : color,
                        color: 'white',
                        opacity: (saving === t.id || editing[t.id] === t.default_points) ? 0.45 : 1,
                        transition: 'background 0.2s',
                        minWidth: '52px',
                      }}>
                      {saved === t.id ? <CheckCircle size={13} /> : saving === t.id ? '...' : '保存'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.5rem' }}>
          ※ デフォルト値を変更しても過去の付与記録には影響しません。
        </p>
      </div>
    </div>
  );
};

export default AdminPointTypes;
