import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Download } from 'lucide-react';

const LoginPage = () => {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError('メールアドレスまたはパスワードが正しくありません。');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-header">
          <img src="/DANRAN_2048.png" alt="麻雀DANRAN" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '18px' }} />
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0.5rem 0 0.25rem' }}>
            麻雀DANRAN
          </h1>
          <p className="text-muted">会員IDでログインしてください</p>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">メールアドレス</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">パスワード</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: '1rem', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <Link to="/install" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none',
          }}>
            <Download size={15} />
            ホーム画面への追加方法はこちら
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
