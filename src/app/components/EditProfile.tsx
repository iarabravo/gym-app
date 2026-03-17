import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from './AuthContext';
import { ArrowLeft, Camera, Phone, Save, User } from 'lucide-react';
import { functionsUrl } from '@project-supabase/config';
import { supabase } from '@project-supabase/client';

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dni: '',
    birthdate: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    avatarUrl: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // Get fresh session token
      const { data: { session } } = await supabase.auth.getSession();
      const freshToken = session?.access_token;

      const response = await fetch(
        functionsUrl('/profile'),
        {
          headers: {
            'Authorization': `Bearer ${freshToken}`
          }
        }
      );
      const data = await response.json();
      if (data.profile) {
        setProfile(data.profile);
        // Split name into firstName and lastName
        const nameParts = (data.profile.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        setFormData({
          firstName,
          lastName,
          phone: data.profile.phone || '',
          dni: data.profile.dni || '',
          birthdate: data.profile.birthdate || '',
          address: data.profile.address || '',
          emergencyContact: data.profile.emergencyContact || '',
          emergencyPhone: data.profile.emergencyPhone || '',
          avatarUrl: data.profile.avatarUrl || ''
        });
        setAvatarPreview(data.profile.avatarUrl || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Get fresh session token
      const { data: { session } } = await supabase.auth.getSession();
      const freshToken = session?.access_token;

      console.log('Submitting profile update...');
      console.log('Fresh token present:', !!freshToken);
      console.log('User ID:', user?.id);

      // Combine firstName and lastName
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      let avatarUrl = formData.avatarUrl;

      if (avatarFile && user?.id) {
        const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: avatarFile.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        avatarUrl = publicUrlData.publicUrl;
      }

      const response = await fetch(
        functionsUrl('/profile'),
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${freshToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: fullName,
            phone: formData.phone,
            dni: formData.dni,
            birthdate: formData.birthdate,
            address: formData.address,
            emergencyContact: formData.emergencyContact,
            emergencyPhone: formData.emergencyPhone,
            avatarUrl
          })
        }
      );

      const responseData = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', responseData);

      if (response.ok) {
        setFormData((current) => ({ ...current, avatarUrl }));
        setAvatarFile(null);
        setSuccessMessage('Perfil actualizado exitosamente.');
        navigate('/profile');
      } else {
        console.error('Error updating profile:', responseData);
        alert(`Error al actualizar el perfil: ${responseData.error || 'Error desconocido'}\n${responseData.details || ''}`);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(error?.message || 'Error al actualizar el perfil. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  if (loading) {
    return (
      <div className="size-full bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full bg-slate-950 text-white overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Editar Perfil</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24">
        {/* Profile Picture */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Foto de perfil"
                className="w-24 h-24 rounded-full object-cover border-2 border-slate-700 mb-3"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl font-bold mb-3">
                {formData.firstName?.charAt(0) || formData.lastName?.charAt(0) || 'U'}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Cambiar foto
          </button>
          {avatarFile && (
            <p className="text-xs text-slate-400 mt-2">
              La foto se subira cuando guardes el perfil.
            </p>
          )}
          {successMessage && (
            <p className="text-sm text-green-400 mt-2">{successMessage}</p>
          )}
          <p className="text-sm text-slate-400 mt-2">{user?.email}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Información Personal
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Juan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Apellido *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  DNI *
                </label>
                <input
                  type="text"
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="12345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="+54 9 11 1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Av. Corrientes 1234, CABA"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-red-400" />
              Contacto de Emergencia
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre del contacto
                </label>
                <input
                  type="text"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="María Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Teléfono de emergencia
                </label>
                <input
                  type="tel"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="+54 9 11 8765-4321"
                />
              </div>
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              * Los campos marcados son obligatorios. Tu información está protegida y segura.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Guardando cambios...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
