import { useState, useEffect } from 'react';
import { getMembers, addMatch } from '../lib/db';
import type { Member } from '../types';
import { CheckCircle, AlertCircle, RotateCcw, Plus, X } from 'lucide-react';

const PLACEMENT_LABELS = ['1着', '2着', '3着', '4着'];
const PLACEMENT_COLORS = ['#FF3B30', '#007AFF', '#FF9500', '#8E8E93'];

const AdminMatches = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [playerCount, setPlayerCount] = useState<3 | 4>(3);
  const [selected, setSelected] = useState<(string | null)[]>([null, null, null, null]);
  const [step, setStep] = useState(0); // which placement we're selecting
  const [tableNumber, setTableNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    getMembers().then(setMembers);
  }, []);

  const totalSteps = playerCount;
  const currentSlots = selected.slice(0, playerCount);
  const allFilled = currentSlots.every(s => s !== null);

  const handleTap = (memberId: string) => {
    if (step >= totalSteps) return;
    if (selected.includes(memberId)) return;
    const next = [...selected];
    next[step] = memberId;
    setSelected(next);
    if (step + 1 < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleUndo = () => {
    if (step === 0) return;
    const prev = step - 1;
    const next = [...selected];
    next[prev] = null;
    setSelected(next);
    setStep(prev);
  };

  const handleReset = () => {
    setSelected([null, null, null, null]);
    setStep(0);
    setError('');
  };

  const togglePlayerCount = () => {
    const next = playerCount === 3 ? 4 : 3;
    setPlayerCount(next);
    handleReset();
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setSaving(true);
    setError('');
    try {
      await addMatch(
        currentSlots.map((id, i) => ({ member_id: id!, placement: (i + 1) as 1 | 2 | 3 | 4 })),
        playerCount,
        tableNumber.trim() || undefined
      );
      setSuccess(true);
      handleReset();
      setTableNumber('');
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('保存中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || '';

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ marginBottom: 0 }}>対戦結果入力</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={togglePlayerCount}
            className={`player-count-btn ${playerCount === 4 ? 'active' : ''}`}>
            {playerCount === 3 ? <><Plus size={13} /> 4人目</>  : <><X size={13} /> 3人</>}
          </button>
          <button type="button" onClick={handleReset}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Table number */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          className="form-control"
          placeholder="卓番号（任意）例：1卓"
          value={tableNumber}
          onChange={e => setTableNumber(e.target.value)}
          style={{ fontSize: '0.9rem' }}
        />
      </div>

      {success && (
        <div className="alert-success" style={{ marginBottom: '1rem' }}>
          <CheckCircle size={16} /> 対戦結果を保存しました！
        </div>
      )}
      {error && (
        <div className="alert-error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Selected placements display */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {Array.from({ length: playerCount }).map((_, i) => (
          <div key={i} style={{
            flex: 1,
            padding: '0.5rem 0.25rem',
            borderRadius: '10px',
            border: `2px solid ${i === step && !allFilled ? PLACEMENT_COLORS[i] : 'var(--border)'}`,
            background: selected[i] ? PLACEMENT_COLORS[i] + '18' : 'var(--bg-elevated)',
            textAlign: 'center',
            transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: PLACEMENT_COLORS[i] }}>{PLACEMENT_LABELS[i]}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--text-primary)', minHeight: '1rem' }}>
              {selected[i] ? getMemberName(selected[i]!) : '---'}
            </div>
          </div>
        ))}
      </div>

      {/* Current step label */}
      {!allFilled && (
        <div style={{ textAlign: 'center', fontWeight: 700, color: PLACEMENT_COLORS[step], marginBottom: '0.75rem', fontSize: '0.95rem' }}>
          {PLACEMENT_LABELS[step]}の会員をタップ
        </div>
      )}

      {/* Member tap grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
        {members.map(m => {
          const selectedIndex = selected.indexOf(m.id);
          const isSelected = selectedIndex !== -1 && selectedIndex < playerCount;
          return (
            <button
              key={m.id}
              onClick={() => handleTap(m.id)}
              disabled={isSelected || allFilled}
              style={{
                padding: '0.85rem 0.5rem',
                borderRadius: '12px',
                border: `2px solid ${isSelected ? PLACEMENT_COLORS[selectedIndex] : 'var(--border)'}`,
                background: isSelected ? PLACEMENT_COLORS[selectedIndex] + '20' : 'var(--bg-elevated)',
                cursor: isSelected || allFilled ? 'default' : 'pointer',
                opacity: isSelected ? 0.5 : 1,
                fontWeight: 800,
                fontSize: '0.95rem',
                color: isSelected ? PLACEMENT_COLORS[selectedIndex] : 'var(--text-primary)',
                textAlign: 'center',
                transition: 'all 0.12s',
              }}
            >
              {m.name}
              {isSelected && (
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: PLACEMENT_COLORS[selectedIndex], marginTop: '0.15rem' }}>
                  {PLACEMENT_LABELS[selectedIndex]}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Undo + Submit */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={handleUndo} disabled={step === 0}
          className="btn w-full"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '0.85rem', opacity: step === 0 ? 0.4 : 1 }}>
          1つ戻す
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!allFilled || saving}
          className="btn btn-primary w-full"
          style={{ padding: '0.85rem' }}
        >
          {saving ? '保存中...' : '確認して登録'}
        </button>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem' }}>この内容で登録しますか？</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
              {playerCount}人対戦 {tableNumber ? `· ${tableNumber}` : ''} · {new Date().toLocaleDateString('ja-JP')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {currentSlots.map((id, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: '10px' }}>
                  <span style={{ fontWeight: 800, color: PLACEMENT_COLORS[i], fontSize: '0.85rem', width: '28px' }}>{PLACEMENT_LABELS[i]}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{getMemberName(id!)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn w-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', padding: '0.85rem', border: '1px solid var(--border)' }}
                onClick={() => setShowConfirm(false)}>修正する</button>
              <button className="btn btn-primary w-full" style={{ padding: '0.85rem' }} onClick={handleConfirm}>登録する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMatches;
