import { useState } from 'react';
import { Smartphone, AlertTriangle, ExternalLink } from 'lucide-react';

type DeviceTab = 'ios' | 'android';

const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua);
const isLine = /Line\//i.test(ua);
const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
const isChromeiOS = /CriOS/.test(ua);

const STEPS_IOS_SAFARI = [
  { icon: '⬆️', text: '画面下部の共有ボタン（四角と上矢印）をタップ' },
  { icon: '📲', text: 'メニューを下にスクロールして「ホーム画面に追加」をタップ' },
  { icon: '✅', text: '右上の「追加」をタップして完了' },
];

const STEPS_IOS_LINE = [
  { icon: '⋯', text: '右下の「…」ボタンをタップ' },
  { icon: '🌐', text: '「Safariで開く」を選択' },
  { icon: '⬆️', text: 'Safari下部の共有ボタンをタップ' },
  { icon: '📲', text: '「ホーム画面に追加」を選択して「追加」をタップ' },
];

const STEPS_IOS_CHROME = [
  { icon: '⚠️', text: 'iPhoneのChromeはホーム画面追加に非対応です' },
  { icon: '🌐', text: 'このURLをコピーしてSafariで開いてください' },
  { icon: '⬆️', text: 'Safari下部の共有ボタンをタップ' },
  { icon: '📲', text: '「ホーム画面に追加」を選択して「追加」をタップ' },
];

const STEPS_ANDROID = [
  { icon: '⋮', text: 'Chrome右上のメニュー（縦三点）をタップ' },
  { icon: '📲', text: '「ホーム画面に追加」または「アプリをインストール」を選択' },
  { icon: '✅', text: '「追加」をタップして完了' },
];

const STEPS_ANDROID_LINE = [
  { icon: '⋯', text: '右下の「…」ボタンをタップ' },
  { icon: '🌐', text: '「外部ブラウザで開く」を選択（Chromeが開きます）' },
  { icon: '⋮', text: 'Chrome右上のメニュー（縦三点）をタップ' },
  { icon: '📲', text: '「ホーム画面に追加」を選択して「追加」をタップ' },
];

const PWAInstallPage = () => {
  const [tab, setTab] = useState<DeviceTab>(isIOS ? 'ios' : 'android');

  const getSteps = () => {
    if (tab === 'ios') {
      if (isLine) return { steps: STEPS_IOS_LINE, warn: 'LINEブラウザでは直接追加できません。まずSafariで開いてください。' };
      if (isChromeiOS) return { steps: STEPS_IOS_CHROME, warn: 'iPhoneのChromeは非対応です。Safariで開き直してください。' };
      return { steps: STEPS_IOS_SAFARI, warn: null };
    } else {
      if (isLine) return { steps: STEPS_ANDROID_LINE, warn: 'LINEブラウザでは直接追加できません。外部ブラウザ（Chrome）で開いてください。' };
      return { steps: STEPS_ANDROID, warn: null };
    }
  };

  const { steps, warn } = getSteps();
  const currentUrl = window.location.origin;

  const getSubtitle = () => {
    if (tab === 'ios') {
      if (isLine) return 'LINE → Safariで開く → ホーム画面に追加';
      if (isChromeiOS) return 'SafariでこのURLを開いてください';
      if (isSafari) return 'このまま下の手順で追加できます';
      return 'Safariで開いてください';
    }
    if (isLine) return 'LINE → 外部ブラウザ(Chrome)で開く → ホーム画面に追加';
    return 'Chromeで追加できます';
  };

  return (
    <div className="animate-fade">
      <h2 style={{ marginBottom: '0.5rem' }}>アプリをインストール</h2>
      <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        ホーム画面に追加するとアプリのように使えます。
      </p>

      {/* Device tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['ios', 'android'] as DeviceTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '0.65rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
            border: `2px solid ${tab === t ? 'var(--primary)' : 'var(--border)'}`,
            background: tab === t ? 'var(--primary)' : 'var(--bg-elevated)',
            color: tab === t ? 'white' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
          }}>
            <Smartphone size={16} /> {t === 'ios' ? 'iPhone / iPad' : 'Android'}
          </button>
        ))}
      </div>

      {/* Browser warning banner */}
      {warn && (
        <div style={{
          background: '#FFF3CD', border: '1.5px solid #FFC107', borderRadius: '12px',
          padding: '0.85rem 1rem', marginBottom: '1rem',
          display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
        }}>
          <AlertTriangle size={18} color="#E65100" style={{ flexShrink: 0, marginTop: '1px' }} />
          <p style={{ fontSize: '0.82rem', color: '#7B4100', margin: 0, lineHeight: 1.55, fontWeight: 600 }}>
            {warn}
          </p>
        </div>
      )}

      {/* Subtitle / browser status */}
      <div style={{
        fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)',
        marginBottom: '0.75rem', paddingLeft: '0.1rem',
      }}>
        {getSubtitle()}
      </div>

      {/* Steps */}
      <div className="card">
        {steps.map((step, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '0.8rem 0',
            borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'var(--primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.8rem', flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
              <span style={{ fontSize: '0.875rem', lineHeight: 1.55 }}>{step.text}</span>
            </div>
          </div>
        ))}
      </div>

      {/* URL copy for iOS Chrome */}
      {tab === 'ios' && isChromeiOS && (
        <div className="card" style={{ marginTop: '0.75rem', background: '#F3F0FF' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>アプリのURL</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <code style={{ fontSize: '0.8rem', flex: 1, wordBreak: 'break-all', color: 'var(--primary)' }}>{currentUrl}</code>
            <button
              onClick={() => navigator.clipboard.writeText(currentUrl)}
              style={{ flexShrink: 0, padding: '0.4rem 0.7rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, border: '1.5px solid var(--primary)', background: 'white', color: 'var(--primary)', cursor: 'pointer' }}>
              コピー
            </button>
          </div>
        </div>
      )}

      {/* LINE open in browser button */}
      {isLine && (
        <div className="card" style={{ marginTop: '0.75rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            または下のボタンから外部ブラウザで開く
          </p>
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.75rem 1.5rem', borderRadius: '10px',
              background: 'var(--primary)', color: 'white',
              fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none',
            }}>
            <ExternalLink size={15} /> ブラウザで開く
          </a>
        </div>
      )}

      <div className="card" style={{ marginTop: '0.75rem', background: '#FFF9F0' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          インストール後はホーム画面のアイコンからアプリを起動できます。インターネット接続が必要です。
        </p>
      </div>
    </div>
  );
};

export default PWAInstallPage;
