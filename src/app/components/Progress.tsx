import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from './AuthContext';
import { 
  ArrowLeft, 
  TrendingUp,
  Calendar,
  Flame,
  Clock,
  Activity,
  Award,
  Target,
  Plus
} from 'lucide-react';
import { functionsUrl } from '@project-supabase/config';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Progress() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await fetch(
        functionsUrl('/progress'),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      const data = await response.json();
      setWorkouts(data.workouts || []);
      setSummary(data.summary || {
        workoutsCompleted: 0,
        totalMinutes: 0,
        streak: 0
      });
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  // Generate mock chart data
  const generateChartData = () => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        calories: Math.floor(Math.random() * 300) + 200,
        duration: Math.floor(Math.random() * 45) + 15,
        heartRate: Math.floor(Math.random() * 30) + 120
      });
    }
    
    return data;
  };

  const chartData = generateChartData();

  const stats = [
    {
      label: 'Entrenamientos',
      value: summary.workoutsCompleted || 0,
      icon: Activity,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20'
    },
    {
      label: 'Minutos totales',
      value: summary.totalMinutes || 0,
      icon: Clock,
      color: 'text-green-400',
      bg: 'bg-green-500/20'
    },
    {
      label: 'Racha actual',
      value: `${summary.streak || 0} días`,
      icon: Flame,
      color: 'text-orange-400',
      bg: 'bg-orange-500/20'
    },
    {
      label: 'Calorías quemadas',
      value: '12,450',
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/20'
    }
  ];

  const achievements = [
    { id: 1, name: 'Primera semana', icon: '🎯', unlocked: true },
    { id: 2, name: '10 entrenamientos', icon: '💪', unlocked: true },
    { id: 3, name: 'Racha de 7 días', icon: '🔥', unlocked: false },
    { id: 4, name: '100 horas', icon: '⏱️', unlocked: false },
    { id: 5, name: 'Madrugador', icon: '🌅', unlocked: true },
    { id: 6, name: 'Guerrero nocturno', icon: '🌙', unlocked: false }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="size-full bg-slate-950 text-white overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Mi Progreso</h1>
          </div>
          <button className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-4">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>

        {/* Charts */}
        <div className="space-y-4 mb-6">
          {/* Calories Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              Calorías Quemadas
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="#f97316" 
                  fillOpacity={1} 
                  fill="url(#colorCalories)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Duration Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-400" />
              Duración de Entrenamientos (min)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="duration" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Heart Rate Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-400" />
              Frecuencia Cardíaca Promedio
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} domain={[100, 160]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="heartRate" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Achievements */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Logros
            </h2>
            <span className="text-sm text-slate-400">
              {achievements.filter(a => a.unlocked).length}/{achievements.length}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-2 ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/50'
                    : 'bg-slate-800 border border-slate-700 opacity-50'
                }`}
              >
                <span className="text-3xl">{achievement.icon}</span>
                <p className="text-xs text-center font-medium px-2">{achievement.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Workouts */}
        <div>
          <h2 className="text-lg font-bold mb-3">Entrenamientos Recientes</h2>
          {workouts.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
              <Target className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400">Aún no has registrado entrenamientos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workouts.slice(0, 5).map((workout) => (
                <div
                  key={workout.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{workout.routineName}</p>
                      <p className="text-xs text-slate-400">{formatDate(workout.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-orange-400">{workout.calories} cal</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{workout.duration} min</span>
                    </div>
                    {workout.heartRate && (
                      <div className="flex items-center gap-1">
                        <Activity className="w-4 h-4 text-red-400" />
                        <span>{workout.heartRate} bpm</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Smartwatch Integration Info */}
        <div className="mt-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-400 font-medium mb-2">⌚ Sincronización con Smartwatch</p>
          <p className="text-sm text-slate-300">
            Conecta tu Apple Watch, Garmin o Fitbit para obtener recomendaciones personalizadas basadas en tu frecuencia cardíaca, sueño y nivel de actividad.
          </p>
        </div>
      </div>
    </div>
  );
}
