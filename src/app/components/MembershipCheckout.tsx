import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, ExternalLink, LoaderCircle, ShieldCheck, Wallet } from 'lucide-react';
import { useAuth } from './AuthContext';
import { functionsUrl } from '@project-supabase/config';

const plans = [
  { id: 'basic', name: 'Basico', price: 100 },
  { id: 'premium', name: 'Premium', price: 49 },
  { id: 'vip', name: 'VIP', price: 79 },
];

const PENDING_PAYMENT_KEY = 'gymapp_pending_payment';

export default function MembershipCheckout() {
  const navigate = useNavigate();
  const { planId } = useParams();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [pendingReference, setPendingReference] = useState<string | null>(null);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === planId) || plans[0],
    [planId]
  );

  useEffect(() => {
    const rawValue = window.localStorage.getItem(PENDING_PAYMENT_KEY);
    if (!rawValue) {
      return;
    }

    try {
      const parsed = JSON.parse(rawValue);
      if (parsed?.planId === selectedPlan.id && parsed?.externalReference) {
        setPendingReference(parsed.externalReference);
      }
    } catch (error) {
      console.error('Error reading pending Mercado Pago payment:', error);
    }
  }, [selectedPlan.id]);

  useEffect(() => {
    if (!pendingReference || !accessToken) {
      return;
    }

    const tryConfirm = async () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      setVerifying(true);

      try {
        const response = await fetch(functionsUrl('/payments/mercadopago/confirm'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            externalReference: pendingReference,
          }),
        });

        const data = await response.json();

        if (response.ok && data.paymentStatus === 'approved') {
          window.localStorage.removeItem(PENDING_PAYMENT_KEY);
          navigate('/membership', {
            state: {
              paymentSuccess: true,
              planName: data.planName || selectedPlan.name,
            },
          });
          return;
        }

        if (data.paymentStatus === 'rejected' || data.paymentStatus === 'cancelled') {
          window.localStorage.removeItem(PENDING_PAYMENT_KEY);
          setPendingReference(null);
          setStatusMessage('El pago fue cancelado o rechazado. Puedes volver a generar el link.');
          return;
        }

        setStatusMessage('Estamos verificando tu pago automaticamente. Cuando Mercado Pago lo apruebe, activaremos tu membresia.');
      } catch (error) {
        console.error('Error auto-verifying Mercado Pago payment:', error);
      } finally {
        setVerifying(false);
      }
    };

    const intervalId = window.setInterval(() => {
      void tryConfirm();
    }, 4000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void tryConfirm();
      }
    };

    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    void tryConfirm();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [accessToken, navigate, pendingReference, selectedPlan.name]);

  const handleOpenMercadoPago = async () => {
    if (!accessToken) {
      alert('Necesitas iniciar sesion para continuar.');
      return;
    }

    setLoading(true);
    setStatusMessage('');

    try {
      const response = await fetch(functionsUrl('/payments/mercadopago/preference'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo generar el link de pago');
      }

      window.localStorage.setItem(
        PENDING_PAYMENT_KEY,
        JSON.stringify({
          externalReference: data.externalReference,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
        })
      );
      setPendingReference(data.externalReference);
      setStatusMessage('Checkout de Mercado Pago listo. Cuando vuelvas a la app vamos a verificar el pago automaticamente.');

      const openedWindow = window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      if (!openedWindow) {
        window.location.assign(data.checkoutUrl);
      }
    } catch (error: any) {
      alert(error?.message || 'No se pudo abrir Mercado Pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="size-full bg-slate-950 text-white overflow-auto">
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/membership')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Pago del plan</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24 space-y-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5">
          <p className="text-sm text-slate-400 mb-2">Plan elegido</p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{selectedPlan.name}</h2>
              <p className="text-slate-400">Membresia mensual</p>
            </div>
            <p className="text-3xl font-bold">${selectedPlan.price}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-sky-400" />
            <h2 className="font-semibold">Pagar con Mercado Pago</h2>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>La app genera un link real de Mercado Pago. La membresia se activa solo despues de validar que el pago fue aprobado.</span>
          </div>

          {statusMessage && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200">
              {statusMessage}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleOpenMercadoPago}
              disabled={loading}
              className="w-full bg-[#009ee3] hover:bg-[#0087c2] disabled:opacity-50 rounded-xl py-4 font-semibold flex items-center justify-center gap-2 transition-all"
            >
              {loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              {loading ? 'Generando link...' : 'Abrir Mercado Pago'}
            </button>

            {verifying && (
              <div className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 font-semibold flex items-center justify-center gap-2 text-slate-200">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Verificando pago automaticamente...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
