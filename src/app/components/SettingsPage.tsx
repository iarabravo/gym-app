import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  CircleHelp,
  Mail,
  Moon,
  Shield,
  Sun,
} from 'lucide-react';
import { useTheme } from './ThemeContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const helpItems = [
    {
      icon: Shield,
      label: 'Privacidad y seguridad',
      description: 'Controlá el acceso a tu cuenta',
    },
    {
      icon: CircleHelp,
      label: 'Centro de ayuda',
      description: 'Preguntas frecuentes y soporte',
    },
    {
      icon: Mail,
      label: 'Contactar soporte',
      description: 'studio-bravo.com.ar',
    },
  ];

  return (
    <div className="size-full bg-slate-950 text-white overflow-auto">
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Configuración</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-sm text-slate-400 mb-4">Elegí cómo querés ver la app.</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`rounded-xl border px-4 py-4 text-left transition-all ${
                theme === 'light'
                  ? 'border-blue-500 bg-blue-500/15'
                  : 'border-slate-700 bg-slate-800'
              }`}
            >
              <Sun className="w-5 h-5 mb-2 text-amber-400" />
              <p className="font-semibold">Modo claro</p>
              <p className="text-sm text-slate-400 mt-1">Fondo blanco y tonos suaves</p>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`rounded-xl border px-4 py-4 text-left transition-all ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-500/15'
                  : 'border-slate-700 bg-slate-800'
              }`}
            >
              <Moon className="w-5 h-5 mb-2 text-blue-300" />
              <p className="font-semibold">Modo oscuro</p>
              <p className="text-sm text-slate-400 mt-1">El estilo actual de la app</p>
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-400 mb-3 px-2">Privacidad y ayuda</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {helpItems.map((item) => (
              <div
                key={item.label}
                className="w-full text-left p-4 border-b last:border-b-0 border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-slate-300" />
                  </div>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-slate-400">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
