import { useState, useEffect } from 'react';
import { getMembers, getMatches, getPointHistory, computeStats } from '../lib/db';
import type { StatsPeriod } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import type { Member, Match, PointHistory } from '../types';
import { ChevronLeft, ChevronRight, Coins, Flame, Trophy, Dices } from 'lucide-react';

const RANK_CLASS = ['rank-1', 'rank-2', 'rank-3', 'rank-4'] as const;

const pct = (count: number, total: number) =>
  total === 0 ? '---' : `${((count / total) * 100).toFixed(1)}%`;

type QuickPeriod = 'today' | 'monthly' | 'yearly' | 'all';

const UserDashboard = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [members, setMembers] = useState<Member[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('monthly');
  const [customMonth, setCustomMonth] = useState<{ year: number; month: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSelectedMemberId('');
    Promise.all([getMembers(), getMatches(), getPointHistory()])
      .then(([m, mt, h]) => {
        setMembers(m);
        setMatches(mt);
        setHistory(h);
        const defaultId = profile?.member_id || (m.length > 0 ? m[0].id : '');
        setSelectedMemberId(defaultId);
      })
      .finally(() => setLoading(false));
  }, [profile]);

  const period: StatsPeriod = customMonth ?? quickPeriod;

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const stats = selectedMember ? computeStats(selectedMember, matches, history, period) : null;

  const now = new Date();
  const displayMonth = customMonth ?? { year: now.getFullYear(), month: now.getMonth() };

  const shiftMonth = (dir: -1 | 1) => {
    const base = customMonth ?? { year: now.getFullYear(), month: now.getMonth() };
    let m = base.month + dir;
    let y = base.year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCustomMonth({ year: y, month: m });
    setQuickPeriod('monthly');
  };

  const isCurrentMonth = displayMonth.year === now.getFullYear() && displayMonth.month === now.getMonth();

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  if (!isAdmin && !profile?.member_id) {
    return (
      <div className="animate-fade">
        <div className="card text-center">
          <p className="text-muted">成績データが紐付けられていません。店舗スタッフにお問い合わせください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h2 style={{ marginBottom: 0 }}>個人成績</h2>
        <div className="period-toggle">
          {(['today', 'monthly', 'yearly', 'all'] as QuickPeriod[]).map(p => (
            <button key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => { setQuickPeriod(p); setCustomMonth(null); }}>
              {p === 'today' ? '本日' : p === 'monthly' ? '月間' : p === 'yearly' ? '年間' : '通算'}
            </button>
          ))}
        </div>
      </div>

      {/* Past month navigation - shows when monthly or customMonth */}
      {(quickPeriod === 'monthly' || customMonth) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <button onClick={() => shiftMonth(-1)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.3rem 0.5rem', cursor: 'pointer' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            {displayMonth.year}年{displayMonth.month + 1}月
          </span>
          <button onClick={() => shiftMonth(1)}
            disabled={isCurrentMonth}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.3rem 0.5rem', cursor: isCurrentMonth ? 'default' : 'pointer', opacity: isCurrentMonth ? 0.3 : 1 }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {members.length === 0 ? (
        <div className="card text-center">
          <p className="text-muted">会員がいません。店舗にお問い合わせください。</p>
        </div>
      ) : (
        <>
          {isAdmin && (
            <div className="form-group mb-4">
              <select className="form-control" value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)}>
                {members.map(m => <option key={m.id} value={m.id}>{m.name} さん</option>)}
              </select>
            </div>
          )}

          {!isAdmin && selectedMember && (
            <div className="mb-4" style={{ fontWeight: 700, fontSize: '1rem', padding: '0.5rem 0' }}>
              {selectedMember.name} さんの成績
            </div>
          )}

          {stats && (
            <>
              {/* Hero: total points */}
              <div className="card card-hero" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Coins size={13} /> 合計ポイント
                  </div>
                  <div className="stat-value" style={{ color: 'var(--primary)' }}>
                    {stats.totalPoints}<span className="stat-unit">pt</span>
                  </div>
                </div>
                <Coins size={40} strokeWidth={1.4} style={{ color: 'var(--primary)', opacity: 0.25 }} />
              </div>

              {/* Core stats */}
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-label">平均着順</div>
                  <div className="stat-value">
                    {stats.totalMatches === 0 ? <span className="text-muted" style={{ fontSize: '1.1rem' }}>---</span> : stats.avgRank.toFixed(2)}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Dices size={12} /> 打半荘数
                  </div>
                  <div className="stat-value">{stats.totalMatches}<span className="stat-unit">回</span></div>
                </div>
                <div className="stat-card">
                  <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Flame size={12} /> 現在連勝
                  </div>
                  <div className="stat-value">{stats.currentWinStreak}<span className="stat-unit">連勝</span></div>
                </div>
                <div className="stat-card">
                  <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Trophy size={12} /> 最大連勝
                  </div>
                  <div className="stat-value">{stats.maxWinStreak}<span className="stat-unit">連勝</span></div>
                </div>
              </div>

              {/* Placement breakdown */}
              <div className="card" style={{ padding: '0.9rem 1rem' }}>
                <div className="stat-label" style={{ marginBottom: '0.7rem' }}>着順内訳</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {([1, 2, 3, 4] as const).map(place => (
                    <div key={place} className={`rank-pill ${RANK_CLASS[place - 1]}`}>
                      <span style={{ fontWeight: 800 }}>{place}着</span>
                      <span>
                        <span style={{ fontWeight: 800 }}>{stats.placements[place]}</span>
                        <span style={{ fontSize: '0.75rem', marginLeft: '0.15rem' }}>回</span>
                        <span style={{ fontSize: '0.75rem', marginLeft: '0.4rem', opacity: 0.75 }}>
                          ({pct(stats.placements[place], stats.totalMatches)})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default UserDashboard;
