// Datos del <head> de la página (vite.config.js los pone en index.html al compilar).
export default {
  title: 'Nara Studio · Habita tu cuerpo · Barre y trampolín en Dolores Hidalgo',
  description:
    'Nara Studio, fitness enfocado a ti: clases de barre y trampolín en Calle Salamanca 14, Dolores Hidalgo, Guanajuato. Horarios, instructoras y ubicación.',
  themeColor: '#f4eee8',
  // Nombre del acceso directo (pantalla de inicio del celular o escritorio)
  appName: 'Nara Studio',
  shortName: 'Nara',
  // Íconos, dentro de esta carpeta. favicon: la pestaña (null = el genérico de /public).
  // apple: acceso directo en iPhone; 192/512: Android y escritorio;
  // maskable: versión con más margen para los íconos redondos de Android. null = sin accesos directos.
  icons: {
    favicon: 'img/favicon-32.png',
    apple: 'img/apple-touch-icon.png',
    192: 'img/icon-192.png',
    512: 'img/icon-512.png',
    maskable: 'img/icon-maskable-512.png',
  },
  // Las letras van dentro de la marca (fonts.css + ./fonts). Solo si un estudio usa una hoja
  // externa (Google Fonts…), se pone aquí su URL; si no, null.
  fonts: null,
}
