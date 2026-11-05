import { useState, useEffect } from 'react';
import { getStoreSettings, updateStoreSettings } from '../lib/db';
import type { StoreSettings } from '../types';
import { Settings } from 'lucide-react';

const AdminSettings = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [requiredCount, setRequiredCount] = useState(50);
  const [displayTopN, setDisplayTopN] = useState<number>(10);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getStoreSettings().then(s => {
      setSettings(s);
      setRequiredCount(s.required_match_count);
      setDisplayTopN(s.display_top_n);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateStoreSettings({ required_match_count: requiredCount, display_top_n: displayTopN });
      setSettings(prev => prev ? { ...prev, required_match_count: requiredCount, display_top_n: displayTopN } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    }
    setSaving(false);
  };

  if (!settings) return <div className="loading-center"><div className="loading-spinner" /></div>;

  return (
    <div className="animate-fade">
      <div className="card">
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
          <Settings size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          店舗設定
        </h2>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">規定試合数（ランキング資格）</label>
            <input
              type="number"
              className="form-control"
              min={0}
              value={requiredCount}
              onChange={e => setRequiredCount(Number(e.target.value))}
            />
            <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.25rem', lineHeight: 1.5 }}>
              この試合数以上の会員が「規定達成」フィルターに表示されます。
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">ランキング表示人数</label>
            <select
              className="form-control"
              value={displayTopN}
              onChange={e => setDisplayTopN(Number(e.target.value))}>
              <option value={5}>上位5名</option>
              <option value={10}>上位10名</option>
              <option value={9999}>全員</option>
            </select>
          </div>

          {saved && (
            <div className="alert-success" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
              設定を保存しました。
            </div>
          )}
          {error && <p className="error-msg">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: '0.75rem' }}
            disabled={saving}>
            {saving ? '保存中...' : '設定を保存する'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
