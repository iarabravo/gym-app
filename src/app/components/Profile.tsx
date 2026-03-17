import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from './AuthContext';
import { 
  ArrowLeft, 
  User,
  Mail,
  CreditCard,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Edit
} from 'lucide-react';
import { functionsUrl } from '@project-supabase/config';

export default function Profile() {
  const navigate = useNavigate();
  const { user, accessToken, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
    fetchMembership();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(
        functionsUrl('/profile'),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      const data = await response.json();
      setProfile(data.profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchMembership = async () => {
    try {
      const response = await fetch(
        functionsUrl('/membership'),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      const data = await response.json();
      setMembership(data.membership);
    } catch (error) {
      console.error('Error fetching membership:', error);
    }
  };

  const handleSignOut = async () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      await signOut();
      navigate('/login');
    }
  };

  const menuSections = [
    {
      title: 'Cuenta',
      items: [
        { icon: User, label: 'Información personal', action: () => navigate('/profile/edit') },
        { icon: Mail, label: 'Email y contraseña', action: () => navigate('/profile/security') },
        { icon: CreditCard, label: 'Métodos de pago', action: () => navigate('/membership') }
      ]
    },
    {
      title: 'Preferencias',
      items: [
        { icon: Bell, label: 'Notificaciones', action: () => navigate('/notifications') },
        { icon: Settings, label: 'Configuración', action: () => {} },
        { icon: Shield, label: 'Privacidad y seguridad', action: () => {} }
      ]
    },
    {
      title: 'Soporte',
      items: [
        { icon: HelpCircle, label: 'Centro de ayuda', action: () => {} },
        { icon: Mail, label: 'Contactar soporte', action: () => {} }
      ]
    }
  ];

  return (
    <div className="size-full bg-slate-950 text-white overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Mi Perfil</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold">
                {profile?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{profile?.name || 'Usuario'}</h2>
                <p className="text-slate-400 text-sm">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/profile/edit')}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>

          {/* Member Since */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <div>
              <p className="text-xs text-slate-400 mb-1">Miembro desde</p>
              <p className="font-semibold">
                {profile?.createdAt 
                  ? new Date(profile.createdAt).toLocaleDateString('es-ES', { 
                      month: 'long', 
                      year: 'numeric' 
                    })
                  : 'Marzo 2026'
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">DNI</p>
              <p className="font-semibold">{profile?.dni || '12345678'}</p>
            </div>
          </div>
        </div>

        {/* Membership Status */}
        {membership && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-slate-400 mb-1">Plan Actual</p>
                <h3 className="text-xl font-bold capitalize">{membership.plan}</h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                membership.status === 'active' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {membership.status === 'active' ? 'Activo' : 'Inactivo'}
              </div>
            </div>
            <button
              onClick={() => navigate('/membership')}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Ver detalles de membresía
            </button>
          </div>
        )}

        {/* Stats */}
        {profile?.progress && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-400 mb-1">
                {profile.progress.workoutsCompleted}
              </p>
              <p className="text-xs text-slate-400">Entrenamientos</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400 mb-1">
                {profile.progress.totalMinutes}
              </p>
              <p className="text-xs text-slate-400">Minutos</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-400 mb-1">
                {profile.progress.streak}
              </p>
              <p className="text-xs text-slate-400">Racha días</p>
            </div>
          </div>
        )}

        {/* Menu Sections */}
        {menuSections.map((section, index) => (
          <div key={index} className="mb-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 px-2">
              {section.title}
            </h3>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {section.items.map((item, itemIndex) => (
                <button
                  key={itemIndex}
                  onClick={item.action}
                  className={`w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors ${
                    itemIndex !== section.items.length - 1 ? 'border-b border-slate-800' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-slate-400" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>

        {/* App Version */}
        <p className="text-center text-xs text-slate-500 mt-6">
          GymApp v1.0.0
        </p>
      </div>
    </div>
  );
}
