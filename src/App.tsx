import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import ForgotPasswordPage from './components/Auth/ForgotPasswordPage';
import Navbar from './components/Layout/Navbar';
import MessengerPage from './components/Messenger/MessengerPage';
import AdminPanel from './components/Messenger/AdminPanel';
import ClassListPage from './components/ClassList/ClassListPage';
import TimetablePage from './components/Timetable/TimetablePage';
import HomeworkPage from './components/Homework/HomeworkPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

function AppRoutes() {
  const { currentUser } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={currentUser ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/forgot-password" element={currentUser ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Navigate to="/messenger" replace />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messenger"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MessengerPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AdminPanel />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/klassenliste"
        element={
          <ProtectedRoute>
            <AppLayout>
              <div className="py-6">
                <ClassListPage />
              </div>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stundenplan"
        element={
          <ProtectedRoute>
            <AppLayout>
              <div className="py-6">
                <TimetablePage />
              </div>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hausaufgaben"
        element={
          <ProtectedRoute>
            <AppLayout>
              <div className="py-6">
                <HomeworkPage />
              </div>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
