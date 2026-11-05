import { useState, useEffect } from 'react';
import { getMembers, getMatches, getPointHistory, computeRanking, getStoreSettings } from '../lib/db';
import type { StatsPeriod, RankingMetric, RankingFilter, MemberStats } from '../lib/db';
import type { Member, Match, PointHistory, StoreSettings } from '../types';
import { Medal, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type PeriodTab = 'monthly' | 'yearly' | 'all';

const METRICS: { key: RankingMetric; label: string; getValue: (s: MemberStats) => string; hint: string }[] = [
  {
    key: 'avgRank',
    label: '平均着順',
    getValue: s => s.totalMatches === 0 ? '---' : s.avgRank.toFixed(2),
    hint: '平均着順が低いほど上位（同率の場合は試合数が多い方が上位）',
  },
  {
    key: 'topRate',
    label: 'トップ率',
    getValue: s => s.totalMatches === 0 ? '---' : `${(s.topRate * 100).toFixed(1)}%`,
    hint: '1着回数の割合（同率の場合は試合数が多い方が上位）',
  },
  {
    key: 'maxStreak',
    label: '最大連勝',
    getValue: s => s.maxWinStreak > 0 ? `${s.maxWinStreak}` : '---',
    hint: '通算の最大連続1着数（負けるまで継続）',
  },
  {
    key: 'totalMatches',
    label: '打半荘数',
    getValue: s => `${s.totalMatches}`,
    hint: '期間内の半荘数が多いほど上位',
  },
];

const Ranking = () => {
  const { profile } = useAuth();
  const isStaff = profile?.role === 'admin' || profile?.role === 'staff';
  const [members, setMembers] = useState<Member[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [metric, setMetric] = useState<RankingMetric>('avgRank');
  const [periodTab, setPeriodTab] = useState<PeriodTab>('monthly');
  const [customMonth, setCustomMonth] = useState<{ year: number; month: number } | null>(null);
  const [filter, setFilter] = useState<RankingFilter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMembers(), getMatches(), getPointHistory(), getStoreSettings()])
      .then(([m, mt, h, s]) => { setMembers(m); setMatches(mt); setHistory(h); setSettings(s); })
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const displayMonth = customMonth ?? { year: now.getFullYear(), month: now.getMonth() };
  const isCurrentMonth = displayMonth.year === now.getFullYear() && displayMonth.month === now.getMonth();

  const period: StatsPeriod =
    periodTab === 'all' ? 'all' :
    periodTab === 'yearly' ? 'yearly' :
    customMonth ?? 'monthly';

  const shiftMonth = (dir: -1 | 1) => {
    const base = customMonth ?? { year: now.getFullYear(), month: now.getMonth() };
    let m = base.month + dir;
    let y = base.year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCustomMonth({ year: y, month: m });
  };

  // General members are capped at top 10 max (no 全員 display).
  // Staff/admin respect the full store setting (including 9999 = 全員).
  const effectiveTopN = settings
    ? (isStaff ? settings.display_top_n : Math.min(settings.display_top_n, 10))
    : 10;

  const ranked = settings
    ? computeRanking(members, matches, history, period, metric, filter, settings.required_match_count, effectiveTopN)
    : [];

  const getRankIcon = (index: number, hasMatches: boolean) => {
    if (!hasMatches) return <span style={{ fontSize: '0.8rem', color: '#8E8E93' }}>--</span>;
    if (index === 0) return <Crown size={20} color="#FFD700" fill="#FFD700" />;
    if (index === 1) return <Medal size={20} color="#C0C0C0" fill="#C0C0C0" />;
    if (index === 2) return <Medal size={20} color="#CD7F32" fill="#CD7F32" />;
    return <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#8E8E93' }}>{index + 1}</span>;
  };

  const currentMetric = METRICS.find(m => m.key === metric)!;

  if (loading) return <div className="loading-center"><div className="loading-spinner" /></div>;

  return (
    <div className="animate-fade">
      <div className="page-header">
        <h2 style={{ marginBottom: 0 }}>ランキング</h2>
        <div className="period-toggle">
          {(['monthly', 'yearly', 'all'] as PeriodTab[]).map(p => (
            <button key={p}
              className={`period-btn ${periodTab === p ? 'active' : ''}`}
              onClick={() => { setPeriodTab(p); if (p !== 'monthly') setCustomMonth(null); }}>
              {p === 'monthly' ? '今月' : p === 'yearly' ? '今年' : '通算'}
            </button>
          ))}
        </div>
      </div>

      {/* Metric tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '2px' }}>
        {METRICS.map(m => (
          <button key={m.key}
            onClick={() => setMetric(m.key)}
            style={{
              flexShrink: 0,
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              border: `1.5px solid ${metric === m.key ? 'var(--primary)' : 'var(--border)'}`,
              background: metric === m.key ? 'var(--primary)' : 'var(--bg-elevated)',
              color: metric === m.key ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>
            {m.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.75rem', marginTop: '0.35rem', paddingLeft: '0.1rem' }}>
        ※ {currentMetric.hint}
      </div>

      {/* Month navigation */}
      {periodTab === 'monthly' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <button onClick={() => shiftMonth(-1)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.3rem 0.5rem', cursor: 'pointer' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            {displayMonth.year}年{displayMonth.month + 1}月
          </span>
          <button onClick={() => shiftMonth(1)} disabled={isCurrentMonth}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.3rem 0.5rem', cursor: isCurrentMonth ? 'default' : 'pointer', opacity: isCurrentMonth ? 0.3 : 1 }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Filter toggle + info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['all', 'qualified'] as RankingFilter[]).map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.3rem 0.7rem',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: `1.5px solid ${filter === f ? 'var(--primary)' : 'var(--border)'}`,
                background: filter === f ? 'var(--primary)' : 'transparent',
                color: filter === f ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}>
              {f === 'all' ? '全体' : '規定達成'}
            </button>
          ))}
        </div>
        {settings && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            規定: {settings.required_match_count}試合
          </span>
        )}
      </div>

      <div className="list-container">
        {ranked.length === 0 ? (
          <div className="card text-center">
            <p className="text-muted">
              {filter === 'qualified' ? '規定試合数を達成した会員がいません。' : '会員データがありません。'}
            </p>
          </div>
        ) : (
          ranked.map((s, index) => (
            <div key={s.member.id} className="card" style={{
              padding: '1rem',
              borderLeft: index < 3 && s.totalMatches > 0
                ? `4px solid ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}`
                : '',
            }}>
              <div className="flex align-center justify-between">
                <div className="flex align-center gap-4">
                  <div style={{ width: '32px', display: 'flex', justifyContent: 'center' }}>
                    {getRankIcon(index, s.totalMatches > 0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem' }}>{s.member.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {s.totalMatches} 試合
                      {metric === 'avgRank' && ` ・ 1着率 ${s.totalMatches > 0 ? (s.topRate * 100).toFixed(1) : '--'}%`}
                      {metric === 'topRate' && ` ・ 平均着 ${s.totalMatches > 0 ? s.avgRank.toFixed(2) : '--'}`}
                      {metric === 'maxStreak' && ` ・ 現在 ${s.currentWinStreak}連勝`}
                      {metric === 'totalMatches' && ` ・ 平均着 ${s.totalMatches > 0 ? s.avgRank.toFixed(2) : '--'}`}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
                    {currentMetric.getValue(s)}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>{currentMetric.label}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Ranking;
