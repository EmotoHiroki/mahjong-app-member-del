import { QRCodeSVG } from 'qrcode.react';

const APP_URL = 'https://mahjong-appp.vercel.app';

const QRPage = () => {
  return (
    <div className="animate-fade" style={{ textAlign: 'center' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>アプリQRコード</h2>
      <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        スキャンしてアプリにアクセス
      </p>
      <div style={{ display: 'inline-block', padding: '1.5rem', background: 'white', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <QRCodeSVG value={APP_URL} size={200} />
      </div>
      <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
        {APP_URL}
      </p>
    </div>
  );
};

export default QRPage;
