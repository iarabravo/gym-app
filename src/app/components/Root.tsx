import { Dumbbell } from 'lucide-react';
import { Outlet } from 'react-router';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider } from './ThemeContext';

function AppBootSplash() {
  return (
    <div className="app-boot-splash min-h-dvh flex items-center justify-center px-6">
      <div className="text-center">
        <div className="app-boot-logo-shell mx-auto mb-6">
          <div className="app-boot-logo-pulse" />
          <div className="app-boot-logo-mark">
            <Dumbbell className="w-9 h-9" strokeWidth={2.2} />
          </div>
        </div>
        <p className="app-boot-brand">GymApp</p>
        <p className="app-boot-tagline">Tu gimnasio en tu bolsillo</p>
        <div className="app-boot-loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

function RootContent() {
  const { loading } = useAuth();

  if (loading) {
    return <AppBootSplash />;
  }

  return <Outlet />;
}

export default function Root() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div
          className="min-h-dvh bg-slate-950"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingRight: 'env(safe-area-inset-right)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
          }}
        >
          <RootContent />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
