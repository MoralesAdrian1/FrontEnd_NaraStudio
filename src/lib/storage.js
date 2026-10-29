import { supabase } from './supabase.js'

const BUCKET = 'coaches'
const EXT = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
export const MAX_BYTES = 5 * 1024 * 1024

/** Sube un archivo a la carpeta de la coach y devuelve su ruta en el bucket. */
export async function uploadCoachFile(file, kind) {
  if (!EXT[file.type]) throw new Error('Solo se aceptan PDF, JPG, PNG o WEBP')
  if (file.size > MAX_BYTES) throw new Error('El archivo pesa más de 5 MB')
  const { data } = await supabase.auth.getUser()
  const path = `${data.user.id}/${kind}-${Date.now()}.${EXT[file.type]}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`)
  return path
}

export const publicUrl = (path, bucket = BUCKET) => (path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null)

const STUDENTS = 'students'
const PHOTO_PX = 320

/**
 * Recorta la foto al centro en un cuadrado de 320 px y la guarda en WEBP (unos 15–30 KB).
 * Así pesa poco en Storage y carga rápido en la lista de la clase.
 */
async function squarePhoto(file) {
  if (!file.type.startsWith('image/')) throw new Error('Elige una imagen (JPG, PNG o WEBP)')
  if (file.size > 15 * 1024 * 1024) throw new Error('La imagen pesa más de 15 MB')
  const img = await createImageBitmap(file).catch(() => {
    throw new Error('No se pudo leer la imagen. Prueba con otra foto.')
  })
  const side = Math.min(img.width, img.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = PHOTO_PX
  canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, PHOTO_PX, PHOTO_PX)
  img.close()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8))
  // Safari viejo no genera WEBP: entonces JPEG
  if (blob?.type === 'image/webp') return blob
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
}

/** Sube la foto de la alumna (ya comprimida) y borra la anterior. Devuelve la ruta nueva. */
export async function uploadStudentPhoto(file, previousPath) {
  const blob = await squarePhoto(file)
  const { data } = await supabase.auth.getUser()
  const path = `${data.user.id}/foto-${Date.now()}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
  const { error } = await supabase.storage.from(STUDENTS).upload(path, blob, { contentType: blob.type })
  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`)
  if (previousPath) await supabase.storage.from(STUDENTS).remove([previousPath])
  return path
}

export const studentPhotoUrl = (path) => publicUrl(path, STUDENTS)
