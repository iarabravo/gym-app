import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from './AuthContext';
import { 
  ArrowLeft, 
  Calendar, 
  Clock,
  Users,
  MapPin,
  Filter,
  X,
  Check
} from 'lucide-react';
import { functionsUrl } from '@project-supabase/config';

export default function Classes() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'my-bookings'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchBookings();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch(
        functionsUrl('/classes'),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      const data = await response.json();
      setClasses(data.classes || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await fetch(
        functionsUrl('/bookings'),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleBookClass = async (classId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        functionsUrl('/classes/book'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ classId })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      await fetchClasses();
      await fetchBookings();
      alert('¡Clase reservada exitosamente!');
    } catch (error: any) {
      console.error('Error booking class:', error);
      alert(error.message || 'Error al reservar clase');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;

    setLoading(true);
    try {
      const response = await fetch(
        functionsUrl(`/bookings/${bookingId}`),
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al cancelar reserva');
      }

      await fetchClasses();
      await fetchBookings();
      alert('Reserva cancelada');
    } catch (error) {
      console.error('Error canceling booking:', error);
      alert('Error al cancelar reserva');
    } finally {
      setLoading(false);
    }
  };

  const isClassBooked = (classId: string) => {
    return bookings.some(b => b.classId === classId);
  };

  const getClassTypeColor = (type: string) => {
    const colors: any = {
      'yoga': 'from-purple-500 to-pink-500',
      'spinning': 'from-red-500 to-orange-500',
      'crossfit': 'from-yellow-500 to-orange-500',
      'pilates': 'from-green-500 to-teal-500',
      'zumba': 'from-pink-500 to-rose-500',
      'boxing': 'from-slate-500 to-slate-700'
    };
    return colors[type.toLowerCase()] || 'from-blue-500 to-cyan-500';
  };

  const formatSchedule = (schedule: string) => {
    const date = new Date(schedule);
    return {
      day: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const displayClasses = filter === 'my-bookings' 
    ? classes.filter(c => isClassBooked(c.id))
    : classes;

  return (
    <div className="size-full bg-slate-950 text-white overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Clases Grupales</h1>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-sm">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>{bookings.length} reservas</span>
            </div>
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
              Todas las clases
            </button>
            <button
              onClick={() => setFilter('my-bookings')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'my-bookings'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Mis reservas
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24">
        {displayClasses.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">
              {filter === 'my-bookings' 
                ? 'No tienes reservas aún' 
                : 'No hay clases disponibles'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayClasses.map((classItem) => {
              const schedule = formatSchedule(classItem.schedule);
              const booked = isClassBooked(classItem.id);
              const isFull = classItem.enrolled >= classItem.capacity;
              const booking = bookings.find(b => b.classId === classItem.id);

              return (
                <div
                  key={classItem.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
                >
                  {/* Class Header */}
                  <div className={`h-2 bg-gradient-to-r ${getClassTypeColor(classItem.type)}`}></div>

                  <div className="p-5">
                    {/* Title and Type */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold mb-1">{classItem.name}</h3>
                        <p className="text-sm text-slate-400 capitalize">{classItem.type}</p>
                      </div>
                      {booked && (
                        <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Reservada
                        </div>
                      )}
                    </div>

                    {/* Instructor */}
                    <p className="text-sm text-slate-300 mb-4">
                      Con <span className="font-semibold">{classItem.instructor}</span>
                    </p>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">{schedule.day}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">{schedule.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">
                          {classItem.enrolled}/{classItem.capacity} personas
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">{classItem.duration} min</span>
                      </div>
                    </div>

                    {/* Capacity Bar */}
                    <div className="mb-4">
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isFull ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${(classItem.enrolled / classItem.capacity) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {booked ? (
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={loading}
                        className="w-full bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500 text-red-400 font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
                      >
                        {loading ? 'Cancelando...' : 'Cancelar Reserva'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBookClass(classItem.id)}
                        disabled={loading || isFull}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-3 rounded-lg transition-all"
                      >
                        {loading ? 'Reservando...' : isFull ? 'Clase Llena' : 'Reservar Clase'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-400 font-medium mb-2">💡 Consejo</p>
          <p className="text-sm text-slate-300">
            Llega 10 minutos antes de tu clase. Puedes cancelar hasta 2 horas antes sin penalización.
          </p>
        </div>
      </div>
    </div>
  );
}
