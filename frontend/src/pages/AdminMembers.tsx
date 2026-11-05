import { useState, useEffect } from 'react';
import { getMembers, addMember, updateMemberName, deleteMember, getLinkedMemberIds, promoteTempMember } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Member } from '../types';
import { UserPlus, List, Pencil, Check, X, ArrowUpCircle, Trash2 } from 'lucide-react';

type RegisterMode = 'temp' | 'full';

const AdminMembers = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isStaff = profile?.role === 'admin' || profile?.role === 'staff';
  const [members, setMembers] = useState<Member[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<RegisterMode>('temp');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promotePassword, setPromotePassword] = useState('');
  const [promoteError, setPromoteError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  const load = async () => {
    const [m, ids] = await Promise.all([getMembers(), getLinkedMemberIds()]);
    setMembers(m);
    setLinkedIds(ids);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    setSaving(true);
    setAddError('');
    setAddSuccess('');

    if (mode === 'temp') {
      try {
        await addMember(newMemberName.trim());
        setAddSuccess(`${newMemberName.trim()} さんを仮会員として登録しました。`);
        setNewMemberName('');
        await load();
      } catch (err: unknown) {
        setAddError(err instanceof Error ? err.message : '登録に失敗しました');
      }
    } else {
      if (!newMemberEmail.trim() || !newMemberPassword.trim()) { setSaving(false); return; }
      try {
        // create-member edge function: no member_id = create new full member
        const { data, error } = await supabase.functions.invoke('create-member', {
          body: { name: newMemberName.trim(), email: newMemberEmail.trim(), password: newMemberPassword.trim() },
        });
        if (error || data?.error) {
          setAddError(data?.error || error?.message || '登録に失敗しました');
          setSaving(false);
          return;
        }
        setAddSuccess(`${newMemberName.trim()} さんを正式会員として登録しました。`);
        setNewMemberName('');
        setNewMemberEmail('');
        setNewMemberPassword('');
        await load();
      } catch (err: unknown) {
        setAddError(err instanceof Error ? err.message : '登録に失敗しました');
      }
    }
    setSaving(false);
    setTimeout(() => setAddSuccess(''), 4000);
  };

  const startEdit = (member: Member) => { setEditingId(member.id); setEditingName(member.name); };
  const cancelEdit = () => { setEditingId(null); setEditingName(''); };
  const saveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setSaving(true);
    await updateMemberName(id, editingName.trim());
    setEditingId(null);
    await load();
    setSaving(false);
  };

  const startPromote = (member: Member) => {
    setPromotingId(member.id);
    setPromoteEmail('');
    setPromotePassword('');
    setPromoteError('');
  };
  const cancelPromote = () => { setPromotingId(null); setPromoteError(''); };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingId || !promoteEmail.trim() || !promotePassword.trim()) return;
    setSaving(true);
    setPromoteError('');
    try {
      await promoteTempMember(promotingId, promoteEmail.trim(), promotePassword.trim());
      setPromotingId(null);
      setAddSuccess('正式会員化が完了しました。');
      await load();
      setTimeout(() => setAddSuccess(''), 4000);
    } catch (err: unknown) {
      setPromoteError(err instanceof Error ? err.message : '正式会員化に失敗しました');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!isAdmin || !deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteMember(deleteTarget.id);
      setMembers(current => current.filter(member => member.id !== deleteTarget.id));
      setLinkedIds(current => {
        const next = new Set(current);
        next.delete(deleteTarget.id);
        return next;
      });
      if (promotingId === deleteTarget.id) cancelPromote();
      if (editingId === deleteTarget.id) cancelEdit();
      setDeleteSuccess(`${deleteTarget.name} さんを削除しました。`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : '会員の削除に失敗しました。もう一度お試しください。');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  return (
    <div className="animate-fade admin-two-col">
    <div>
      {isStaff && (
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
            <UserPlus size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            新規会員登録
          </h2>

          {/* Mode toggle: only admin can create 正式会員. Staff is limited to 仮会員. */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button type="button"
                onClick={() => { setMode('temp'); setAddError(''); setAddSuccess(''); }}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  border: `2px solid ${mode === 'temp' ? 'var(--primary)' : 'var(--border)'}`,
                  background: mode === 'temp' ? 'var(--primary)' : 'var(--bg-elevated)',
                  color: mode === 'temp' ? 'white' : 'var(--text-secondary)',
                }}>
                仮会員（名前のみ）
              </button>
              <button type="button"
                onClick={() => { setMode('full'); setAddError(''); setAddSuccess(''); }}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  border: `2px solid ${mode === 'full' ? 'var(--primary)' : 'var(--border)'}`,
                  background: mode === 'full' ? 'var(--primary)' : 'var(--bg-elevated)',
                  color: mode === 'full' ? 'white' : 'var(--text-secondary)',
                }}>
                正式会員（メール+PW）
              </button>
            </div>
          )}

          {mode === 'temp' && (
            <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: '1rem', lineHeight: 1.5 }}>
              名前のみで登録します。対戦結果・ポイントはそのまま管理できます。後からメールアドレスを追加して正式会員化できます。
            </p>
          )}

          {addSuccess && (
            <div className="alert-success" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
              {addSuccess}
            </div>
          )}

          <form onSubmit={handleAddMember}>
            <div className="form-group">
              <label className="form-label">会員名</label>
              <input type="text" className="form-control" placeholder="例：田中 太郎"
                value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required />
            </div>

            {mode === 'full' && (
              <>
                <div className="form-group">
                  <label className="form-label">メールアドレス</label>
                  <input type="email" className="form-control" placeholder="example@email.com"
                    value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">パスワード</label>
                  <input type="password" className="form-control" placeholder="••••••••"
                    value={newMemberPassword} onChange={e => setNewMemberPassword(e.target.value)} required minLength={6} />
                </div>
              </>
            )}

            {addError && <p className="error-msg">{addError}</p>}

            <button type="submit" className="btn btn-primary w-full" style={{ padding: '1rem' }} disabled={saving}>
              {saving ? '登録中...' : mode === 'temp' ? '仮会員として登録する' : '正式会員として登録する'}
            </button>
          </form>
        </div>
      )}

      {/* Promote dialog */}
      {promotingId && (
        <div className="card" style={{ borderLeft: '4px solid var(--primary)', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
            <ArrowUpCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--primary)' }} />
            正式会員化: {members.find(m => m.id === promotingId)?.name}
          </h3>
          <form onSubmit={handlePromote}>
            <div className="form-group">
              <label className="form-label">メールアドレス</label>
              <input type="email" className="form-control" placeholder="example@email.com"
                value={promoteEmail} onChange={e => setPromoteEmail(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">パスワード</label>
              <input type="password" className="form-control" placeholder="••••••• (6文字以上)"
                value={promotePassword} onChange={e => setPromotePassword(e.target.value)} required minLength={6} />
            </div>
            {promoteError && <p className="error-msg">{promoteError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }} disabled={saving}>
                {saving ? '処理中...' : '正式会員化する'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={cancelPromote} disabled={saving}>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}
    </div>

    <div>
      <div className="card">
        <h2 style={{ fontSize: '1.2rem' }}>
          <List size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          登録済み会員一覧
          <span className="badge" style={{ marginLeft: '0.5rem', fontWeight: 600, fontSize: '0.75rem' }}>
            {members.length} 名
          </span>
        </h2>
        {deleteSuccess && <div className="alert-success" role="status" style={{ marginTop: '1rem' }}>{deleteSuccess}</div>}
        <div className="list-container mt-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {members.length === 0 ? (
            <p className="text-muted text-center py-4">登録されている会員はいません。</p>
          ) : (
            members.map(member => {
              const isLinked = linkedIds.has(member.id);
              return (
                <div key={member.id} className="card"
                  style={{ padding: '0.75rem 1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {editingId === member.id ? (
                    <>
                      <input type="text" className="form-control"
                        style={{ marginRight: '0.5rem', padding: '0.4rem 0.75rem', fontSize: '0.9rem', flex: 1 }}
                        value={editingName} onChange={e => setEditingName(e.target.value)} autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(member.id); if (e.key === 'Escape') cancelEdit(); }} />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(member.id)} className="btn-icon btn-icon-success" disabled={saving}><Check size={16} /></button>
                        <button onClick={cancelEdit} className="btn-icon"><X size={16} /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span style={{ fontWeight: 700 }}>{member.name}</span>
                        <span
                          style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.7rem',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '8px',
                            background: isLinked ? '#E8F5E9' : '#FFF3E0',
                            color: isLinked ? '#2E7D32' : '#E65100',
                            fontWeight: 700,
                          }}>
                          {isLinked ? '正式' : '仮'}
                        </span>
                      </div>
                      <div className="flex align-center gap-2">
                        <span className="badge" style={{ fontSize: '0.7rem' }}>{member.id.slice(0, 8)}</span>
                        {isAdmin && !isLinked && (
                          <button
                            onClick={() => startPromote(member)}
                            className="btn-icon"
                            title="正式会員化"
                            style={{ color: 'var(--primary)' }}>
                            <ArrowUpCircle size={15} />
                          </button>
                        )}
                        {isAdmin && <button onClick={() => startEdit(member)} className="btn-icon"><Pencil size={14} /></button>}
                        {isAdmin && (
                          <button type="button" className="btn-icon-danger"
                            style={{ width: 'auto', padding: '0 0.5rem', gap: '0.25rem' }}
                            disabled={saving || deleting}
                            aria-label={`${member.name} さんを削除`}
                            onClick={() => { setDeleteTarget(member); setDeleteError(''); setDeleteSuccess(''); }}>
                            <Trash2 size={14} /> 削除
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
    {isAdmin && deleteTarget && (
      <div className="modal-overlay">
        <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-member-title" aria-describedby="delete-member-description">
          <h3 id="delete-member-title" style={{ marginBottom: '0.75rem' }}>会員を削除しますか？</h3>
          <div id="delete-member-description">
            <p style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{deleteTarget.name} さん</p>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>会員ID: {deleteTarget.id}</p>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: '1rem 0' }}>
              この会員の対戦結果とポイント履歴も削除されます。他の会員の対戦結果は残ります。この操作は取り消せません。
            </p>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
              ログインアカウントは残り、会員データとの紐付けが解除されます。
            </p>
          </div>
          {deleteError && <p className="error-msg" role="alert">{deleteError}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary w-full" autoFocus disabled={deleting}
              onClick={() => { setDeleteTarget(null); setDeleteError(''); }}>キャンセル</button>
            <button type="button" className="btn w-full" disabled={deleting}
              style={{ background: 'var(--danger)', color: 'white' }} onClick={handleDelete}>
              {deleting ? '削除中...' : '削除する'}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default AdminMembers;
