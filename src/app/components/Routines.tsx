import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from './AuthContext';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { 
  ArrowLeft, 
  Dumbbell,
  Plus,
  Play,
  Clock,
  TrendingUp,
  Heart,
  Zap,
  Target,
  ChevronRight
} from 'lucide-react';
import { functionsUrl } from '@project-supabase/config';

export default function Routines() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [myRoutines, setMyRoutines] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<any>(null);
  const [tab, setTab] = useState<'my' | 'recommended'>('recommended');

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    try {
      const response = await fetch(
        functionsUrl('/routines'),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      const data = await response.json();
      setMyRoutines(data.myRoutines || []);
      setRecommended(data.recommended || []);
    } catch (error) {
      console.error('Error fetching routines:', error);
    }
  };

  const handleStartWorkout = (routine: any) => {
    setSelectedRoutine(routine);
  };

  const getLevelColor = (level: string) => {
    const colors: any = {
      'beginner': 'bg-green-500/20 text-green-400',
      'intermediate': 'bg-yellow-500/20 text-yellow-400',
      'advanced': 'bg-red-500/20 text-red-400'
    };
    return colors[level.toLowerCase()] || 'bg-blue-500/20 text-blue-400';
  };

  const getLevelText = (level: string) => {
    const texts: any = {
      'beginner': 'Principiante',
      'intermediate': 'Intermedio',
      'advanced': 'Avanzado'
    };
    return texts[level.toLowerCase()] || level;
  };

  const sampleRoutines = [
    {
      id: 'routine:recommended:1',
      name: 'Fuerza Total',
      description: 'Rutina completa de fuerza para todo el cuerpo',
      duration: 45,
      level: 'intermediate',
      image: 'https://images.unsplash.com/photo-1591291621164-2c6367723315?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlbmd0aCUyMHRyYWluaW5nJTIwd2VpZ2h0c3xlbnwxfHx8fDE3NzM2MDc4NzN8MA&ixlib=rb-4.1.0&q=80&w=1080',
      exercises: [
        { name: 'Sentadillas', sets: 4, reps: 12, video: 'squat-demo' },
        { name: 'Press de banca', sets: 4, reps: 10, video: 'bench-press-demo' },
        { name: 'Peso muerto', sets: 3, reps: 8, video: 'deadlift-demo' },
        { name: 'Remo con barra', sets: 3, reps: 12, video: 'row-demo' }
      ]
    },
    {
      id: 'routine:recommended:2',
      name: 'Cardio Intenso',
      description: 'Quema calorías con esta rutina de alta intensidad',
      duration: 30,
      level: 'beginner',
      image: 'https://images.unsplash.com/photo-1761971974992-6df33df97c3a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXJkaW8lMjBydW5uaW5nJTIwdHJlYWRtaWxsfGVufDF8fHx8MTc3MzU5MTA1MHww&ixlib=rb-4.1.0&q=80&w=1080',
      exercises: [
        { name: 'Saltos de cuerda', sets: 3, reps: '2 min', video: 'jump-rope-demo' },
        { name: 'Burpees', sets: 4, reps: 15, video: 'burpee-demo' },
        { name: 'Mountain climbers', sets: 3, reps: 20, video: 'mountain-climber-demo' },
        { name: 'Sprint en cinta', sets: 5, reps: '1 min', video: 'sprint-demo' }
      ]
    },
    {
      id: 'routine:recommended:3',
      name: 'Yoga & Flexibilidad',
      description: 'Mejora tu flexibilidad y equilibrio mental',
      duration: 40,
      level: 'beginner',
      image: 'https://images.unsplash.com/photo-1607909599990-e2c4778e546b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b2dhJTIwc3RyZXRjaGluZyUyMGZsZXhpYmlsaXR5fGVufDF8fHx8MTc3MzU1NzAxNXww&ixlib=rb-4.1.0&q=80&w=1080',
      exercises: [
        { name: 'Saludo al sol', sets: 3, reps: '5 min', video: 'sun-salutation-demo' },
        { name: 'Guerrero I', sets: 2, reps: '30 seg', video: 'warrior-demo' },
        { name: 'Postura del árbol', sets: 2, reps: '1 min', video: 'tree-pose-demo' },
        { name: 'Savasana', sets: 1, reps: '5 min', video: 'savasana-demo' }
      ]
    },
    {
      id: 'routine:recommended:4',
      name: 'Hipertrofia Avanzada',
      description: 'Rutina para ganancia muscular avanzada',
      duration: 60,
      level: 'advanced',
      image: 'https://images.unsplash.com/photo-1584827386916-b5351d3ba34b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwd29ya291dCUyMGV4ZXJjaXNlJTIwZ3ltfGVufDF8fHx8MTc3MzUxNjk0Mnww&ixlib=rb-4.1.0&q=80&w=1080',
      exercises: [
        { name: 'Sentadilla búlgara', sets: 4, reps: 10, video: 'bulgarian-squat-demo' },
        { name: 'Press militar', sets: 4, reps: 8, video: 'military-press-demo' },
        { name: 'Curl de bíceps', sets: 4, reps: 12, video: 'bicep-curl-demo' },
        { name: 'Extensión de tríceps', sets: 4, reps: 12, video: 'tricep-demo' }
      ]
    }
  ];

  const displayRoutines = tab === 'my' ? myRoutines : [...recommended, ...sampleRoutines];

  if (selectedRoutine) {
    return (
      <div className="size-full bg-slate-950 text-white overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setSelectedRoutine(null)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">{selectedRoutine.name}</h1>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6">
          {/* Routine Header */}
          <div className="relative h-48 rounded-2xl overflow-hidden mb-6">
            <ImageWithFallback
              src={selectedRoutine.image}
              alt={selectedRoutine.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-slate-300 mb-2">{selectedRoutine.description}</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{selectedRoutine.duration} min</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(selectedRoutine.level)}`}>
                  {getLevelText(selectedRoutine.level)}
                </div>
              </div>
            </div>
          </div>

          {/* Exercises */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-4">Ejercicios ({selectedRoutine.exercises.length})</h2>
            <div className="space-y-3">
              {selectedRoutine.exercises.map((exercise: any, index: number) => (
                <div
                  key={index}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-lg">{exercise.name}</p>
                      <p className="text-sm text-slate-400">
                        {exercise.sets} series × {exercise.reps} {typeof exercise.reps === 'number' ? 'reps' : ''}
                      </p>
                    </div>
                    <button className="w-10 h-10 bg-blue-500/20 hover:bg-blue-500/30 rounded-full flex items-center justify-center transition-colors">
                      <Play className="w-5 h-5 text-blue-400 ml-0.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">Video: {exercise.video}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2">
            <Play className="w-5 h-5" />
            Comenzar Entrenamiento
          </button>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold">Rutinas</h1>
            </div>
            <button className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab('recommended')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                tab === 'recommended'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Recomendadas
            </button>
            <button
              onClick={() => setTab('my')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                tab === 'my'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Mis Rutinas
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24">
        {/* Smart Recommendation */}
        {tab === 'recommended' && (
          <div className="mb-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-purple-400 mb-1">Recomendación Inteligente</p>
                <p className="text-sm text-slate-300">
                  Basado en tus datos de smartwatch, recomendamos una rutina de cardio moderado hoy.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Heart className="w-4 h-4 text-red-400" />
              <span>FC promedio: 72 bpm</span>
              <span>•</span>
              <span>Recuperación: Óptima</span>
            </div>
          </div>
        )}

        {/* Routines Grid */}
        {displayRoutines.length === 0 ? (
          <div className="text-center py-12">
            <Dumbbell className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">
              {tab === 'my' 
                ? 'Crea tu primera rutina personalizada' 
                : 'No hay rutinas disponibles'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayRoutines.map((routine) => (
              <div
                key={routine.id}
                onClick={() => handleStartWorkout(routine)}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all cursor-pointer group"
              >
                {/* Image */}
                <div className="relative h-40 overflow-hidden">
                  <ImageWithFallback
                    src={routine.image}
                    alt={routine.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                  <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(routine.level)}`}>
                    {getLevelText(routine.level)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-bold mb-1">{routine.name}</h3>
                  <p className="text-sm text-slate-400 mb-3">{routine.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{routine.duration} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        <span>{routine.exercises.length} ejercicios</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-400 font-medium mb-2">📱 Videos Explicativos</p>
          <p className="text-sm text-slate-300">
            Cada ejercicio incluye un video demostrativo para asegurar la técnica correcta y prevenir lesiones.
          </p>
        </div>
      </div>
    </div>
  );
}
