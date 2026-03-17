import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from './AuthContext';
import { 
  QrCode, 
  CreditCard, 
  Calendar, 
  Dumbbell, 
  TrendingUp, 
  User, 
  Bell,
  Users,
  Activity,
  Clock,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { functionsUrl, supabaseAnonKey } from '@project-supabase/config';
import { supabase } from '@project-supabase/client';

export default function Home() {
  const { user, accessToken, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [occupancy, setOccupancy] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && accessToken) {
      fetchProfile();
      fetchOccupancy();
      fetchNotifications();
    }
  }, [user, accessToken]);

  const fetchProfile = async () => {
    try {
      console.log('Home: Fetching profile...');
      // Get fresh session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('Home: No active session found');
        return;
      }

      console.log('Home: Session found, user ID:', session.user.id);
      console.log('Home: User metadata:', session.user.user_metadata);

      const response = await fetch(
        functionsUrl('/profile'),
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );
      
      console.log('Home: Profile fetch response status:', response.status);
      const data = await response.json();
      console.log('Home: Profile data received:', data);
      
      setProfile(data.profile);
    } catch (error) {
      console.error('Home: Error fetching profile:', error);
    }
  };

  const fetchOccupancy = async () => {
    try {
      const response = await fetch(
        functionsUrl('/gym/occupancy'),
        {
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        }
      );
      const data = await response.json();
      setOccupancy(data);
    } catch (error) {
      console.error('Error fetching occupancy:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        functionsUrl('/notifications'),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      const data = await response.json();
      setNotifications(data.notifications?.filter((n: any) => !n.read) || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    { icon: QrCode, label: 'Acceso', path: '/access', color: 'bg-blue-500' },
    { icon: CreditCard, label: 'Membresía', path: '/membership', color: 'bg-purple-500' },
    { icon: Calendar, label: 'Clases', path: '/classes', color: 'bg-green-500' },
    { icon: Dumbbell, label: 'Rutinas', path: '/routines', color: 'bg-orange-500' },
    { icon: TrendingUp, label: 'Progreso', path: '/progress', color: 'bg-pink-500' },
    { icon: User, label: 'Perfil', path: '/profile', color: 'bg-indigo-500' },
  ];

  return (
    <div className="size-full bg-slate-950 text-white overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
              {profile?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="text-lg font-bold">Hola, {profile?.name || 'Usuario'}</h1>
              <p className="text-xs text-slate-400">Bienvenido de vuelta</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/notifications')}
              className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors md:hidden"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24">
        {/* Occupancy Card */}
        {occupancy && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 mb-6 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Ocupación del Gimnasio</p>
                <h3 className="text-2xl font-bold">{occupancy.percentage}%</h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                occupancy.status === 'busy' ? 'bg-red-500/20 text-red-400' :
                occupancy.status === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {occupancy.status === 'busy' ? 'Lleno' :
                 occupancy.status === 'moderate' ? 'Moderado' : 'Tranquilo'}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Users className="w-4 h-4" />
              <span>{occupancy.current} / {occupancy.capacity} personas</span>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {profile?.progress && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <Activity className="w-5 h-5 text-blue-400 mb-2" />
              <p className="text-2xl font-bold">{profile.progress.workoutsCompleted}</p>
              <p className="text-xs text-slate-400">Entrenamientos</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <Clock className="w-5 h-5 text-green-400 mb-2" />
              <p className="text-2xl font-bold">{profile.progress.totalMinutes}</p>
              <p className="text-xs text-slate-400">Minutos</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <TrendingUp className="w-5 h-5 text-orange-400 mb-2" />
              <p className="text-2xl font-bold">{profile.progress.streak}</p>
              <p className="text-xs text-slate-400">Racha días</p>
            </div>
          </div>
        )}

        {/* Quick Access */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4">Acceso Rápido</h2>
          <div className="grid grid-cols-2 gap-3">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 transition-colors text-left group"
              >
                <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <p className="font-semibold">{item.label}</p>
                <ChevronRight className="w-4 h-4 text-slate-400 mt-1" />
              </button>
            ))}
          </div>
        </div>

        {/* Notifications Preview */}
        {notifications.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">Notificaciones</h2>
              <button 
                onClick={() => navigate('/notifications')}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Ver todas
              </button>
            </div>
            <div className="space-y-2">
              {notifications.slice(0, 3).map((notification) => (
                <div 
                  key={notification.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{notification.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{notification.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-400 mb-1">💡 Consejo del día</p>
          <p className="text-sm text-slate-300">
            Mantente hidratado durante tus entrenamientos. Bebe al menos 500ml de agua por cada hora de ejercicio.
          </p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800">
        <div className="max-w-md mx-auto px-2 py-2">
          <div className="flex items-center justify-around">
            {[
              { icon: QrCode, label: 'Acceso', path: '/access' },
              { icon: Calendar, label: 'Clases', path: '/classes' },
              { icon: Dumbbell, label: 'Rutinas', path: '/routines' },
              { icon: TrendingUp, label: 'Progreso', path: '/progress' },
              { icon: User, label: 'Perfil', path: '/profile' },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
