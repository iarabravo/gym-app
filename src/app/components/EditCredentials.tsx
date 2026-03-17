import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Lock, Mail, Save } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase } from '@project-supabase/client';

export default function EditCredentials() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailMessage('');
    setLoadingEmail(true);

    try {
      const trimmedEmail = email.trim();

      if (!trimmedEmail) {
        throw new Error('Ingresá un correo válido');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        email: trimmedEmail,
      });

      if (updateError) {
        throw updateError;
      }

      setEmailMessage('Te enviamos un correo de confirmación para actualizar tu email.');
    } catch (err: any) {
      setError(err.message || 'No se pudo actualizar el correo');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordMessage('');
    setLoadingPassword(true);

    try {
      if (password.length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
      }

      if (password !== confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setPassword('');
      setConfirmPassword('');
      setPasswordMessage('Contrasena actualizada correctamente.');
    } catch (err: any) {
      setError(err.message || 'No se pudo actualizar la contrasena');
    } finally {
      setLoadingPassword(false);
    }
  };

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
          <h1 className="text-xl font-bold">Email y Contrasena</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form
          onSubmit={handleEmailUpdate}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold">Cambiar correo</h2>
              <p className="text-sm text-slate-400">Actualizá el email de tu cuenta.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nuevo correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="nuevo@email.com"
              required
            />
          </div>

          {emailMessage && <p className="text-sm text-green-400">{emailMessage}</p>}

          <button
            type="submit"
            disabled={loadingEmail}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg py-3 font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loadingEmail ? 'Actualizando...' : 'Actualizar correo'}
          </button>
        </form>

        <form
          onSubmit={handlePasswordUpdate}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <Lock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold">Cambiar contrasena</h2>
              <p className="text-sm text-slate-400">Elegí una nueva clave para tu cuenta.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nueva contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Minimo 6 caracteres"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirmar contrasena</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Repetí la nueva contrasena"
              required
            />
          </div>

          {passwordMessage && <p className="text-sm text-green-400">{passwordMessage}</p>}

          <button
            type="submit"
            disabled={loadingPassword}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 rounded-lg py-3 font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loadingPassword ? 'Guardando...' : 'Actualizar contrasena'}
          </button>
        </form>
      </div>
    </div>
  );
}
