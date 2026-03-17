import { Outlet } from 'react-router';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';

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
          <Outlet />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
