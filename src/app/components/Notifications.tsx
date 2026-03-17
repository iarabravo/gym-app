import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from './AuthContext';
import { 
  ArrowLeft, 
  Bell,
  CreditCard,
  Calendar,
  Users,
  TrendingUp,
  Check,
  Trash2,
  Filter
} from 'lucide-react';
import { functionsUrl } from '@project-supabase/config';

export default function Notifications() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

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
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        functionsUrl(`/notifications/${notificationId}/read`),
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: any = {
      'payment': CreditCard,
      'class': Calendar,
      'occupancy': Users,
      'recommendation': TrendingUp
    };
    return icons[type] || Bell;
  };

  const getNotificationColor = (type: string) => {
    const colors: any = {
      'payment': 'text-green-400',
      'class': 'text-blue-400',
      'occupancy': 'text-orange-400',
      'recommendation': 'text-purple-400'
    };
    return colors[type] || 'text-slate-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `Hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Sample notifications for demo
  const sampleNotifications = [
    {
      id: 'notif-1',
      title: 'Pago Procesado',
      message: 'Tu pago mensual de $49 ha sido procesado exitosamente.',
      type: 'payment',
      read: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'notif-2',
      title: 'Clase Reservada',
      message: 'Tu clase de Yoga está confirmada para mañana a las 18:00.',
      type: 'class',
      read: false,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'notif-3',
      title: 'Gimnasio Tranquilo',
      message: 'El gimnasio está al 30% de capacidad. ¡Es un buen momento para entrenar!',
      type: 'occupancy',
      read: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'notif-4',
      title: 'Recomendación Personalizada',
      message: 'Basado en tu ritmo cardíaco, te recomendamos una rutina de cardio moderado.',
      type: 'recommendation',
      read: true,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'notif-5',
      title: 'Recordatorio de Pago',
      message: 'Tu próximo pago se procesará en 3 días.',
      type: 'payment',
      read: true,
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
    }
  ];

  const allNotifications = [...notifications, ...sampleNotifications];
  const displayNotifications = filter === 'unread' 
    ? allNotifications.filter(n => !n.read)
    : allNotifications;

  const unreadCount = allNotifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    const unreadNotifs = allNotifications.filter(n => !n.read);
    for (const notif of unreadNotifs) {
      await markAsRead(notif.id);
    }
  };

  const handleBack = () => {
    navigate(location.state?.from || '/');
  };

  return (
    <div className="size-full bg-slate-950 text-white overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">Notificaciones</h1>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-400">{unreadCount} sin leer</p>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                Marcar todas
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'unread'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              No leídas {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24">
        {displayNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">
              {filter === 'unread' 
                ? 'No tienes notificaciones sin leer' 
                : 'No tienes notificaciones'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const iconColor = getNotificationColor(notification.type);

              return (
                <div
                  key={notification.id}
                  className={`bg-slate-900 border rounded-xl p-4 transition-all ${
                    notification.read 
                      ? 'border-slate-800' 
                      : 'border-blue-500/50 bg-blue-500/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 ${
                      notification.read ? 'bg-slate-800' : 'bg-blue-500/20'
                    } rounded-full flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold">{notification.title}</h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{notification.message}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {!notification.read && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Marcar como leída
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Notification Settings */}
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Configuración de Notificaciones</h3>
          
          <div className="space-y-3">
            {[
              { label: 'Recordatorios de pago', enabled: true },
              { label: 'Confirmación de clases', enabled: true },
              { label: 'Ocupación del gimnasio', enabled: true },
              { label: 'Recomendaciones personalizadas', enabled: true },
              { label: 'Promociones y ofertas', enabled: false }
            ].map((setting, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm">{setting.label}</span>
                <button
                  className={`w-12 h-6 rounded-full transition-colors ${
                    setting.enabled ? 'bg-blue-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    setting.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-400 font-medium mb-2">🔔 Notificaciones Push</p>
          <p className="text-sm text-slate-300">
            Mantente informado sobre tus pagos, clases reservadas y cuando el gimnasio está menos ocupado para optimizar tu entrenamiento.
          </p>
        </div>
      </div>
    </div>
  );
}
