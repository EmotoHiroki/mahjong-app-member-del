import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua);
const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
const isInApp = /Line\//i.test(ua) || /FBAN|FBAV/.test(ua);

// Show only on iOS Safari, not already installed, not in-app browser
const shouldShow = isIOS && !isStandalone && !isInApp;

const IOSInstallBanner = () => {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('ios-banner-dismissed') === '1'
  );
  const navigate = useNavigate();

  if (!shouldShow || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem('ios-banner-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '70px', // above bottom nav
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 2rem)',
      maxWidth: '480px',
      background: '#1C1C1E',
      color: 'white',
      borderRadius: '14px',
      padding: '0.85rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      zIndex: 9999,
      boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
    }}>
      {/* Share icon */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '8px',
        background: '#0A84FF', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, fontSize: '1.1rem',
      }}>
        ⬆️
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.15rem' }}>
          ホーム画面に追加できます
        </div>
        <button
          onClick={() => { dismiss(); navigate('/install'); }}
          style={{
            fontSize: '0.75rem', color: '#0A84FF', background: 'none',
            border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600,
          }}>
          追加方法を見る →
        </button>
      </div>

      <button onClick={dismiss} style={{
        background: 'none', border: 'none', color: '#8E8E93',
        cursor: 'pointer', flexShrink: 0, padding: '0.2rem',
      }}>
        <X size={16} />
      </button>
    </div>
  );
};

export default IOSInstallBanner;
