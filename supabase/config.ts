const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const functionsPrefix =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_PREFIX || 'make-server-5dacf80d';

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY');
}

export { supabaseUrl, supabaseAnonKey, functionsPrefix };

export const functionsBaseUrl = `${supabaseUrl}/functions/v1/${functionsPrefix}`;

export function functionsUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${functionsBaseUrl}/${normalizedPath}`;
}
