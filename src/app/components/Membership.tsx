import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from './AuthContext';
import { 
  ArrowLeft, 
  CreditCard, 
  Check, 
  Crown, 
  Star,
  Zap,
  Calendar,
  DollarSign,
  History
} from 'lucide-react';
import { functionsUrl } from '@project-supabase/config';

export default function Membership() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [membership, setMembership] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPayments, setShowPayments] = useState(false);

  useEffect(() => {
    fetchMembership();
    fetchPayments();
  }, []);

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

  const fetchPayments = async () => {
    try {
      const response = await fetch(
        functionsUrl('/payments'),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      const data = await response.json();
      setPayments(data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    try {
      const response = await fetch(
        functionsUrl('/membership/subscribe'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            plan: selectedPlan,
            paymentMethod: 'card'
          })
        }
      );

      if (!response.ok) {
        throw new Error('Error al suscribirse');
      }

      await fetchMembership();
      setSelectedPlan(null);
      alert('¡Suscripción exitosa!');
    } catch (error) {
      console.error('Error subscribing:', error);
      alert('Error al procesar la suscripción');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'basic',
      name: 'Básico',
      price: 29,
      icon: Zap,
      color: 'from-blue-500 to-cyan-500',
      features: [
        'Acceso al gimnasio 24/7',
        'Área de pesas y cardio',
        'Vestidores y duchas',
        'App móvil'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 49,
      icon: Star,
      color: 'from-purple-500 to-pink-500',
      popular: true,
      features: [
        'Todo lo del plan Básico',
        'Clases grupales ilimitadas',
        'Rutinas personalizadas',
        'Nutricionista mensual',
        'Invitado gratis semanal'
      ]
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 79,
      icon: Crown,
      color: 'from-yellow-500 to-orange-500',
      features: [
        'Todo lo del plan Premium',
        'Entrenador personal 2x/semana',
        'Acceso a zona VIP',
        'Masajes terapéuticos',
        'Plan nutricional completo',
        'Parking preferencial'
      ]
    }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
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
            <h1 className="text-xl font-bold">Membresía</h1>
          </div>
          <button
            onClick={() => setShowPayments(!showPayments)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            <History className="w-4 h-4" />
            Historial
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24">
        {/* Current Membership */}
        {membership && (
          <div className="mb-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Membresía Actual</p>
                <h3 className="text-2xl font-bold capitalize">{membership.plan}</h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                membership.status === 'active' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {membership.status === 'active' ? 'Activa' : 'Inactiva'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-xs mb-1">Inicio</p>
                <p className="text-sm font-medium">{formatDate(membership.startDate)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Próximo pago</p>
                <p className="text-sm font-medium">{formatDate(membership.endDate)}</p>
              </div>
            </div>

            {membership.autoRenew && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-400">
                <Check className="w-4 h-4" />
                <span>Renovación automática activada</span>
              </div>
            )}
          </div>
        )}

        {/* Payment History */}
        {showPayments && payments.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3">Historial de Pagos</h2>
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{payment.concept}</p>
                    <p className="text-lg font-bold text-green-400">${payment.amount}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{formatDate(payment.date)}</span>
                    <span className="capitalize">{payment.paymentMethod}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plans */}
        {!showPayments && (
          <>
            <h2 className="text-lg font-bold mb-4">
              {membership ? 'Cambiar Plan' : 'Selecciona tu Plan'}
            </h2>

            <div className="space-y-4 mb-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-slate-900 border-2 rounded-2xl p-5 transition-all ${
                    selectedPlan === plan.id
                      ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                      : 'border-slate-800 hover:border-slate-700'
                  } ${plan.popular ? 'relative' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-bold">
                      MÁS POPULAR
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center`}>
                        <plan.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        <p className="text-2xl font-bold mt-1">
                          ${plan.price}
                          <span className="text-sm text-slate-400 font-normal">/mes</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedPlan === plan.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700'
                      }`}
                    >
                      {selectedPlan === plan.id ? 'Seleccionado' : 'Seleccionar'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Subscribe Button */}
            {selectedPlan && (
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                {loading ? 'Procesando...' : 'Suscribirse Ahora'}
              </button>
            )}
          </>
        )}

        {/* Info */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-400 font-medium mb-2">ℹ️ Información</p>
          <p className="text-sm text-slate-300">
            Todos los planes incluyen acceso a la app móvil con seguimiento de progreso y notificaciones. Cancela cuando quieras sin penalización.
          </p>
        </div>
      </div>
    </div>
  );
}
