import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, Store, ClipboardList, Settings, Trophy, History, Users, LogOut, QrCode, Download, XCircle, BookOpen, SlidersHorizontal, Coins } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import IOSInstallBanner from './components/IOSInstallBanner';
import UserDashboard from './pages/UserDashboard';
import Ranking from './pages/Ranking';
import MatchHistory from './pages/MatchHistory';
import AdminMembers from './pages/AdminMembers';
import AdminMatches from './pages/AdminMatches';
import AdminMatchHistory from './pages/AdminMatchHistory';
import AdminPoints from './pages/AdminPoints';
import AdminSettings from './pages/AdminSettings';
import AdminPointTypes from './pages/AdminPointTypes';
import AdminCancelLog from './pages/AdminCancelLog';
import QRPage from './pages/QRPage';
import PWAInstallPage from './pages/PWAInstallPage';
import PointLedger from './pages/PointLedger';
import LoginPage from './pages/LoginPage';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

const AppRoutes = () => {
  const { user, profile, signOut, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const isAdminArea = location.pathname.startsWith('/admin') || location.pathname === '/qr';
    document.body.classList.toggle('admin-mode', isAdminArea);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p style={{ marginTop: '1rem', color: '#8E8E93', fontWeight: 600 }}>読み込み中...</p>
      </div>
    );
  }

  const isStaff = profile?.role === 'admin' || profile?.role === 'staff';

  return (
    <>
      <IOSInstallBanner />
      {user && (
        <div className="app-header">
          <h1>
            <img src="/DANRAN_2048.png" alt="麻雀DANRAN" className="header-logo-img" />
            麻雀DANRAN
          </h1>
          <div className="flex gap-2">
            {isStaff && (
              <Link
                to="/admin"
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
              >
                店舗管理
              </Link>
            )}
            <button
              onClick={() => signOut()}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
              title="ログアウト"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      )}

      <div className={user ? 'main-container' : ''}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <UserLayout><UserDashboard /></UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ranking"
            element={
              <ProtectedRoute>
                <UserLayout><Ranking /></UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <UserLayout><MatchHistory /></UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/install"
            element={<PWAInstallPage />}
          />
          <Route
            path="/points"
            element={
              <ProtectedRoute>
                <UserLayout><PointLedger /></UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireStaff>
                <AdminLayout><AdminMembers /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/matches"
            element={
              <ProtectedRoute requireStaff>
                <AdminLayout><AdminMatches /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/match-history"
            element={
              <ProtectedRoute requireStaff>
                <AdminLayout><AdminMatchHistory /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/points"
            element={
              <ProtectedRoute requireStaff>
                <AdminLayout><AdminPoints /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout><AdminSettings /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/point-types"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout><AdminPointTypes /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/cancel-log"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout><AdminCancelLog /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/qr"
            element={
              <ProtectedRoute requireStaff>
                <AdminLayout><QRPage /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
};

const UserLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const path = location.pathname;
  const { profile } = useAuth();
  const isStaff = profile?.role === 'admin' || profile?.role === 'staff';

  return (
    <div>
      {isStaff && (
        <div className="staff-view-banner">
          スタッフ表示（個人成績の確認画面です）
        </div>
      )}
      {children}
      <div className="bottom-nav">
        <Link to="/" className={`nav-item ${path === '/' ? 'active' : ''}`}>
          <Home size={22} strokeWidth={path === '/' ? 2.5 : 2} />
          <span>成績</span>
        </Link>
        <Link to="/ranking" className={`nav-item ${path === '/ranking' ? 'active' : ''}`}>
          <Trophy size={22} strokeWidth={path === '/ranking' ? 2.5 : 2} />
          <span>順位</span>
        </Link>
        <Link to="/history" className={`nav-item ${path === '/history' ? 'active' : ''}`}>
          <History size={22} strokeWidth={path === '/history' ? 2.5 : 2} />
          <span>履歴</span>
        </Link>
        {!isStaff && (
          <>
            <Link to="/points" className={`nav-item ${path === '/points' ? 'active' : ''}`}>
              <BookOpen size={22} strokeWidth={path === '/points' ? 2.5 : 2} />
              <span>通帳</span>
            </Link>
            <Link to="/install" className={`nav-item ${path === '/install' ? 'active' : ''}`}>
              <Download size={22} strokeWidth={path === '/install' ? 2.5 : 2} />
              <span>DL</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const path = location.pathname;
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return (
    <div>
      <div className="admin-nav-group-label">日常業務</div>
      <div className="admin-nav">
        <Link to="/admin" className={`admin-tab ${path === '/admin' ? 'active' : ''}`}>
          <Users size={16} /> 会員管理
        </Link>
        <Link to="/admin/matches" className={`admin-tab ${path === '/admin/matches' ? 'active' : ''}`}>
          <ClipboardList size={16} /> 対戦入力
        </Link>
        <Link to="/admin/match-history" className={`admin-tab ${path === '/admin/match-history' ? 'active' : ''}`}>
          <History size={16} /> 対戦履歴
        </Link>
        <Link to="/admin/points" className={`admin-tab ${path === '/admin/points' ? 'active' : ''}`}>
          <Coins size={16} /> ポイント付与
        </Link>
      </div>

      {isAdmin && (
        <>
          <div className="admin-nav-group-label">設定・管理</div>
          <div className="admin-nav">
            <Link to="/admin/point-types" className={`admin-tab ${path === '/admin/point-types' ? 'active' : ''}`}>
              <SlidersHorizontal size={16} /> 項目設定
            </Link>
            <Link to="/admin/cancel-log" className={`admin-tab ${path === '/admin/cancel-log' ? 'active' : ''}`}>
              <XCircle size={16} /> 取消履歴
            </Link>
            <Link to="/admin/settings" className={`admin-tab ${path === '/admin/settings' ? 'active' : ''}`}>
              <Settings size={16} /> 店舗設定
            </Link>
            <Link to="/qr" className={`admin-tab ${path === '/qr' ? 'active' : ''}`}>
              <QrCode size={16} /> QR
            </Link>
          </div>
        </>
      )}
      {!isAdmin && (
        <div className="admin-nav">
          <Link to="/qr" className={`admin-tab ${path === '/qr' ? 'active' : ''}`}>
            <QrCode size={16} /> QR
          </Link>
        </div>
      )}

      {children}
      <div className="bottom-nav">
        <Link to="/" className="nav-item">
          <Home size={22} />
          <span>ホーム</span>
        </Link>
        <Link to="/admin" className="nav-item active">
          <Store size={22} strokeWidth={2.5} />
          <span>店舗管理</span>
        </Link>
      </div>
    </div>
  );
};

export default App;
