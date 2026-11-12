// Enlace público de un archivo de Supabase Storage (bucket público, como las fotos de coaches).
// Se arma con texto para no cargar supabase-js en la landing.
const STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public`

export const publicUrl = (path, bucket = 'coaches') =>
  path ? `${STORAGE_URL}/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}` : null
