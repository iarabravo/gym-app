import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from './AuthContext';
import { ArrowLeft, QrCode, Wallet, CreditCard, Fingerprint, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { functionsUrl } from '@project-supabase/config';
import QRCodeLib from 'qrcode';
import { supabase } from '@project-supabase/client';

export default function Access() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [accessMethod, setAccessMethod] = useState<'qr' | 'wallet' | 'dni' | 'fingerprint'>('qr');
  const [profile, setProfile] = useState<any>(null);
  const [qrCode, setQrCode] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState<'apple' | 'google' | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [noMembership, setNoMembership] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (accessToken) {
      fetchProfile();
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessMethod === 'qr' || accessMethod === 'wallet') {
      generateQRCode();
    }
  }, [accessMethod]);

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
      console.error('Error fetching access profile:', error);
    }
  };

  const generateQRCode = async () => {
    setLoading(true);
    setError('');
    setNoMembership(false);
    try {
      // Get fresh session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        throw new Error('Por favor inicia sesión nuevamente');
      }

      const freshToken = session.access_token;
      console.log('Using fresh token for QR generation');

      const response = await fetch(
        functionsUrl('/access/qr'),
        {
          headers: {
            'Authorization': `Bearer ${freshToken}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('QR generation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        if (response.status === 403 && errorData.error?.includes('membership')) {
          setNoMembership(true);
          throw new Error('No tienes una membresía activa');
        }
        throw new Error(errorData.error || 'Error al generar código QR');
      }

      const data = await response.json();
      console.log('QR generated successfully:', data);
      setAccessCode(data.accessCode);
      setExpiresAt(data.expiresAt);
      setQrCode('');

      // Generate QR code
      if (canvasRef.current) {
        await QRCodeLib.toCanvas(canvasRef.current, data.accessCode, {
          width: 280,
          margin: 2,
          color: {
            dark: '#3B82F6',
            light: '#FFFFFF'
          }
        });
      }

      const qrDataUrl = await QRCodeLib.toDataURL(data.accessCode, {
        width: 280,
        margin: 2,
        color: {
          dark: '#3B82F6',
          light: '#FFFFFF'
        }
      });
      setQrCode(qrDataUrl);
    } catch (error: any) {
      console.error('Error generating QR:', error);
      setError(error.message || 'Error al generar código QR');
    } finally {
      setLoading(false);
    }
  };

  const handleAccess = async () => {
    setLoading(true);
    try {
      // Get fresh session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        throw new Error('Por favor inicia sesión nuevamente');
      }

      const freshToken = session.access_token;

      const response = await fetch(
        functionsUrl('/access/entry'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${freshToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al registrar entrada');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error logging entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const openWalletPass = async (provider: 'apple' | 'google') => {
    setWalletLoading(provider);
    try {
      const response = await fetch(
        functionsUrl(`/access/wallet/${provider}`),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `No se pudo abrir ${provider === 'apple' ? 'Apple Wallet' : 'Google Wallet'}`);
      }

      const destinationUrl = data.passUrl || data.saveUrl;
      const openedWindow = window.open(destinationUrl, '_blank', 'noopener,noreferrer');
      if (!openedWindow) {
        window.location.assign(destinationUrl);
      }
    } catch (error: any) {
      alert(error?.message || 'No se pudo abrir el wallet');
    } finally {
      setWalletLoading(null);
    }
  };

  const getTimeRemaining = () => {
    if (!expiresAt) return '';
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const accessMethods = [
    { id: 'qr', label: 'Código QR', icon: QrCode },
    { id: 'wallet', label: 'Wallet Pass', icon: Wallet },
    { id: 'dni', label: 'DNI', icon: CreditCard },
    { id: 'fingerprint', label: 'Huella', icon: Fingerprint },
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
          <h1 className="text-xl font-bold">Acceso al Gimnasio</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-green-400">¡Acceso Concedido!</p>
              <p className="text-sm text-green-300">Bienvenido al gimnasio</p>
            </div>
          </div>
        )}

        {/* Access Method Selector */}
        <div className="mb-6">
          <p className="text-sm text-slate-400 mb-3">Selecciona tu método de acceso</p>
          <div className="grid grid-cols-4 gap-2">
            {accessMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setAccessMethod(method.id as any)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  accessMethod === method.id
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <method.icon className="w-6 h-6" />
                <span className="text-xs text-center">{method.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* QR Code Display */}
        {accessMethod === 'qr' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            {noMembership ? (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Membresía Requerida</h3>
                <p className="text-slate-400 mb-6">
                  Necesitas una membresía activa para generar tu código de acceso
                </p>
                <button
                  onClick={() => navigate('/membership')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-semibold transition-all"
                >
                  Ver Planes de Membresía
                </button>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-slate-400">Generando código QR...</p>
              </div>
            ) : accessCode ? (
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-2xl mb-4">
                  <canvas ref={canvasRef} />
                </div>

                <div className="text-center mb-6">
                  <p className="text-sm text-slate-400 mb-1">Código de acceso</p>
                  <p className="font-mono text-lg font-bold">{accessCode}</p>
                  {expiresAt && (
                    <p className="text-sm text-slate-500 mt-2">
                      Expira en: {getTimeRemaining()}
                    </p>
                  )}
                </div>

                <button
                  onClick={generateQRCode}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Renovar código
                </button>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Error</h3>
                <p className="text-slate-400 mb-6">{error}</p>
                <button
                  onClick={generateQRCode}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-all"
                >
                  Intentar de nuevo
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Wallet Pass */}
        {accessMethod === 'wallet' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Wallet className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-xl font-bold">Wallet Pass</h3>
                  <p className="text-sm text-slate-400">Tarjeta visual para Apple Wallet o Google Wallet</p>
                </div>
              </div>

              <div className="rounded-3xl overflow-hidden border border-blue-500/30 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-950 p-5 shadow-xl">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-blue-100/80 mb-2">GymApp</p>
                    <h4 className="text-2xl font-bold">Acceso al Gym</h4>
                    <p className="text-sm text-blue-100/80 mt-1">{profile?.name || 'Usuario'}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
                  <div>
                    <p className="text-xs text-blue-100/70 mb-1">Documento</p>
                    <p className="text-lg font-semibold">{profile?.dni || 'Sin DNI cargado'}</p>
                    <p className="text-xs text-blue-100/70 mt-4 mb-1">Codigo de acceso</p>
                    <p className="font-mono text-sm break-all">{accessCode || 'Generando...'}</p>
                  </div>

                  <div className="bg-white p-2 rounded-2xl">
                    {qrCode ? (
                      <img
                        src={qrCode}
                        alt="QR de acceso al gym"
                        className="w-24 h-24 rounded-xl"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs text-center px-2">
                        Generando QR
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-slate-400 text-sm">
                Esta es la tarjeta de acceso del gimnasio. La dejamos diseñada para luego conectarla de verdad con Apple Wallet o Google Wallet.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => openWalletPass('apple')}
                  disabled={walletLoading !== null}
                  className="flex-1 px-4 py-3 bg-slate-950 rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-60"
                >
                  {walletLoading === 'apple' ? 'Abriendo...' : 'Apple Wallet'}
                </button>
                <button
                  onClick={() => openWalletPass('google')}
                  disabled={walletLoading !== null}
                  className="flex-1 px-4 py-3 bg-slate-950 rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-60"
                >
                  {walletLoading === 'google' ? 'Abriendo...' : 'Google Wallet'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DNI */}
        {accessMethod === 'dni' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex flex-col items-center text-center">
              <CreditCard className="w-16 h-16 text-green-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Acceso con DNI</h3>
              <p className="text-slate-400 mb-6">
                Acerca tu DNI al lector en la entrada del gimnasio
              </p>
              <div className="bg-slate-950 rounded-xl p-4 w-full">
                <p className="text-sm text-slate-500 mb-1">Tu documento registrado</p>
                <p className="text-2xl font-mono font-bold">{profile?.dni || 'Sin DNI cargado'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fingerprint */}
        {accessMethod === 'fingerprint' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full"></div>
                <Fingerprint className="w-24 h-24 text-purple-400 relative" />
              </div>
              <h3 className="text-xl font-bold mb-2">Acceso Biométrico</h3>
              <p className="text-slate-400 mb-6">
                Coloca tu dedo en el lector biométrico del gimnasio
              </p>
              <button
                onClick={handleAccess}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-semibold disabled:opacity-50 transition-all"
              >
                {loading ? 'Verificando...' : 'Simular Acceso'}
              </button>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-400 font-medium mb-2">💡 Consejo</p>
          <p className="text-sm text-slate-300">
            Para mayor seguridad, tu código QR expira cada 5 minutos. Genera uno nuevo si es necesario.
          </p>
        </div>
      </div>
    </div>
  );
}
