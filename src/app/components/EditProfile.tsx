import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Camera,
  FileHeart,
  Phone,
  Save,
  ShieldPlus,
  User,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { functionsUrl } from '@project-supabase/config';
import { supabase } from '@project-supabase/client';

type ProfileSection = 'personal' | 'medical';

type FormData = {
  firstName: string;
  lastName: string;
  phone: string;
  dni: string;
  birthdate: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  avatarUrl: string;
  medicalInsurance: string;
  bloodType: string;
  allergies: string;
  medicalConditions: string;
  medications: string;
  recentInjuries: string;
  doctorClearance: string;
  medicalNotes: string;
};

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  phone: '',
  dni: '',
  birthdate: '',
  address: '',
  emergencyContact: '',
  emergencyPhone: '',
  avatarUrl: '',
  medicalInsurance: '',
  bloodType: '',
  allergies: '',
  medicalConditions: '',
  medications: '',
  recentInjuries: '',
  doctorClearance: '',
  medicalNotes: '',
};

export default function EditProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeSection, setActiveSection] = useState<ProfileSection>('personal');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const freshToken = session?.access_token;

      const response = await fetch(functionsUrl('/profile'), {
        headers: {
          Authorization: `Bearer ${freshToken}`,
        },
      });
      const data = await response.json();

      if (data.profile) {
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
          avatarUrl: data.profile.avatarUrl || '',
          medicalInsurance: data.profile.medicalInsurance || '',
          bloodType: data.profile.bloodType || '',
          allergies: data.profile.allergies || '',
          medicalConditions: data.profile.medicalConditions || '',
          medications: data.profile.medications || '',
          recentInjuries: data.profile.recentInjuries || '',
          doctorClearance: data.profile.doctorClearance || '',
          medicalNotes: data.profile.medicalNotes || '',
        });
        setAvatarPreview(data.profile.avatarUrl || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    setSuccessMessage('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const freshToken = session?.access_token;

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      let avatarUrl = formData.avatarUrl;

      if (avatarFile && user?.id) {
        const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: avatarFile.type,
        });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = publicUrlData.publicUrl;
      }

      const response = await fetch(functionsUrl('/profile'), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${freshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fullName,
          phone: formData.phone,
          dni: formData.dni,
          birthdate: formData.birthdate,
          address: formData.address,
          emergencyContact: formData.emergencyContact,
          emergencyPhone: formData.emergencyPhone,
          medicalInsurance: formData.medicalInsurance,
          bloodType: formData.bloodType,
          allergies: formData.allergies,
          medicalConditions: formData.medicalConditions,
          medications: formData.medications,
          recentInjuries: formData.recentInjuries,
          doctorClearance: formData.doctorClearance,
          medicalNotes: formData.medicalNotes,
          avatarUrl,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setFormData((current) => ({ ...current, avatarUrl }));
        setAvatarFile(null);
        setSuccessMessage('Perfil actualizado exitosamente.');
        navigate('/profile');
      } else {
        alert(`Error al actualizar el perfil: ${responseData.error || 'Error desconocido'}\n${responseData.details || ''}`);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(error?.message || 'Error al actualizar el perfil. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
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
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  const renderInput = (
    label: string,
    name: keyof FormData,
    type = 'text',
    placeholder = '',
    required = false,
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        type={type}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        required={required}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        placeholder={placeholder}
      />
    </div>
  );

  const renderTextArea = (
    label: string,
    name: keyof FormData,
    placeholder: string,
    rows = 4,
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <textarea
        name={name}
        value={formData[name]}
        onChange={handleChange}
        rows={rows}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="size-full bg-slate-950 text-white overflow-auto">
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
            onClick={() => handleSubmit()}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-24">
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
            <p className="text-xs text-slate-400 mt-2">La foto se subira cuando guardes el perfil.</p>
          )}
          {successMessage && <p className="text-sm text-green-400 mt-2">{successMessage}</p>}
          <p className="text-sm text-slate-400 mt-2">{user?.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <button
              type="button"
              onClick={() => setActiveSection('personal')}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                activeSection === 'personal'
                  ? 'bg-blue-500/15 border-blue-500'
                  : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-400" />
                <span className="font-semibold">Información personal</span>
              </div>
              <p className="text-sm text-slate-400">Datos básicos y contacto.</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('medical')}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                activeSection === 'medical'
                  ? 'bg-blue-500/15 border-blue-500'
                  : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileHeart className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">Planilla médica</span>
              </div>
              <p className="text-sm text-slate-400">Salud, cobertura y observaciones.</p>
            </button>
          </div>

          {activeSection === 'personal' ? (
            <>
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  Información Personal
                </h2>
                <div className="space-y-4">
                  {renderInput('Nombre', 'firstName', 'text', 'Juan', true)}
                  {renderInput('Apellido', 'lastName', 'text', 'Pérez', true)}
                  {renderInput('DNI', 'dni', 'text', '12345678', true)}
                  {renderInput('Fecha de nacimiento', 'birthdate', 'date')}
                  {renderInput('Teléfono', 'phone', 'tel', '+54 9 11 1234-5678')}
                  {renderInput('Dirección', 'address', 'text', 'Av. Corrientes 1234, CABA')}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-red-400" />
                  Contacto de Emergencia
                </h2>
                <div className="space-y-4">
                  {renderInput('Nombre del contacto', 'emergencyContact', 'text', 'María Pérez')}
                  {renderInput('Teléfono de emergencia', 'emergencyPhone', 'tel', '+54 9 11 8765-4321')}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileHeart className="w-5 h-5 text-emerald-400" />
                  Planilla médica
                </h2>
                <div className="space-y-4">
                  {renderInput('Obra social / cobertura médica', 'medicalInsurance', 'text', 'OSDE, Swiss Medical, particular')}
                  {renderInput('Grupo sanguíneo', 'bloodType', 'text', 'A+, O-, AB+')}
                  {renderInput('¿Tenés apto médico vigente?', 'doctorClearance', 'text', 'Sí / No / En trámite')}
                  {renderTextArea('Alergias', 'allergies', 'Medicamentos, alimentos o alergias relevantes')}
                  {renderTextArea('Antecedentes o condiciones médicas', 'medicalConditions', 'Asma, hipertensión, lesiones previas, etc.')}
                  {renderTextArea('Medicaciones actuales', 'medications', 'Medicamentos que tomás actualmente')}
                  {renderTextArea('Lesiones o molestias recientes', 'recentInjuries', 'Rodilla, hombro, espalda, etc.')}
                  {renderTextArea('Observaciones médicas', 'medicalNotes', 'Cualquier dato adicional importante para tu entrenamiento')}
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ShieldPlus className="w-5 h-5 text-emerald-300 mt-0.5" />
                  <p className="text-sm text-emerald-100">
                    Esta información nos ayuda a cuidar tu entrenamiento y adaptar mejor las rutinas a tu salud.
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              * Los campos marcados son obligatorios. Tu información está protegida y segura.
            </p>
          </div>

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
