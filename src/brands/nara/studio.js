// Marca de Nara Studio: datos, textos de la landing, logos e imágenes.
// Para otro estudio: copia esta carpeta (src/brands/<id>) y cambia lo de aquí,
// theme.css (colores y letras) y meta.js (título, descripción y favicon).
import logoDark from './img/nara-logo-dark.webp'
import logoLight from './img/nara-logo-light.webp'
import imgBarre from './img/dancers-practicing-at-the-barre.webp'
import imgBallet from './img/ballet-at-the-paris-opera.webp'
import imgAcrobats from './img/acrobats-at-the-cirque-fernando-francisca-and.webp'
import imgCity from './img/azoteas-de-dolores-hidalgo-gto.webp'

// Foto y video reales del estudio (en /public)
const photoNadia = '/fotos/Nadia1.webp'
const videoBarre = '/Videos/clase%20de%20barre.mp4'

export const studio = {
  name: 'Nara Studio',
  // Nombre corto: el pin del mapa, "En Nara:" y el saludo de WhatsApp
  shortName: 'Nara',
  tagline: 'Fitness enfocado a ti',
  slogan: 'Habita tu cuerpo',
  address: 'Calle Salamanca 14, col. Sop',
  city: 'Dolores Hidalgo, Guanajuato · C.P. 37803',
  // Punto exacto tomado del enlace de Google Maps del estudio
  coords: [21.1621415, -100.9265285],
  mapsUrl: 'https://maps.app.goo.gl/e9Xo1NU29e2RSMzP9',
  // Grupo de WhatsApp de las alumnas (sección "Grupo de WhatsApp" del panel)
  whatsappGroup: 'https://chat.whatsapp.com/HjSiIHdYrVZLFPE6nD4TpY',
  // Contacto de Nadia (WhatsApp en formato internacional, sin signos)
  phone: '418 141 9587',
  whatsapp: '524181419587',
  instagram: 'https://www.instagram.com/nara_studio26/',
  tiktok: 'https://www.tiktok.com/@nadlesp',
  facebook: 'https://www.facebook.com/share/1DkzTX8Mvb/',
  // Logo oscuro (sobre fondo claro) y claro (pie de página, fondo oscuro)
  logo: { dark: logoDark, light: logoLight, alt: 'Nara Studio, habita tu cuerpo' },
  // Responsable legal (términos y aviso de privacidad) y correo de contacto
  legal: { name: 'Nadia Patrón López', email: 'hola@narastudio.website' },
  hours: [
    ['Lunes a viernes', '6:30 – 21:15'],
    ['Sábado', 'Cerrado'],
    ['Domingo', 'Cerrado'],
  ],
}

export const disciplines = [
  {
    id: 'barre',
    name: 'Barre',
    // Color de fondo de las coaches de esta disciplina y quién la imparte si el backend no responde
    tone: '#e7c9c2',
    profile: 'nadia',
    image: imgBarre,
    imageAlt: 'Pintura de Degas: dos bailarinas estiran la pierna sobre la barra de ensayo',
    // Si hay video, se reproduce en silencio en lugar de la imagen (la imagen queda de portada)
    video: videoBarre,
    classes: 'Barre & Sculpt · Barre Restore',
    details: ['60 minutos', 'Todos los niveles', 'Calcetas antiderrapantes'],
    styles: [
      {
        name: 'Barre',
        text: 'Entrenamiento de bajo impacto inspirado en el ballet, el Pilates y el acondicionamiento físico. Con movimientos controlados, equilibrio y fuerza, fortalece y tonifica piernas, glúteos, brazos y abdomen, y trabaja la postura y la conexión entre cuerpo y mente.',
        inStudio: 'Aprender a moverte con intención, desarrollar fuerza desde el control y sentirte fuerte desde adentro hacia afuera.',
      },
      {
        name: 'Sculpt',
        text: 'Fortalecimiento y acondicionamiento muscular con fuerza funcional, resistencia, peso y pequeños intervalos cardiovasculares, en secuencias dinámicas que trabajan distintos grupos musculares.',
        inStudio: 'La fuerza, la determinación y la capacidad de descubrir todo lo que tu cuerpo puede lograr.',
      },
    ],
    plans: [
      { label: 'Mes', price: 700 },
      { label: '12 clases', price: 500 },
      { label: 'Clase individual', price: 90 },
    ],
  },
  {
    id: 'trampolin',
    name: 'Trampolín',
    tone: '#d8c3ae',
    profile: 'juana',
    image: imgAcrobats,
    imageAlt: 'Pintura de Renoir: dos jóvenes acróbatas en la pista del circo',
    classes: 'Jump',
    details: ['60 minutos', 'Todos los niveles', 'Tenis limpios'],
    styles: [
      {
        name: 'Jump',
        text: 'Disciplina cardiovascular sobre un trampolín individual, con secuencias de saltos y desplazamientos al ritmo de la música. Mejora la resistencia, la coordinación y la agilidad, y permite un trabajo intenso de bajo impacto relativo gracias a la superficie elástica.',
        inStudio: 'Energía, diversión y movimiento. Una forma diferente de desafiarte, liberar energía y disfrutar mientras entrenas.',
      },
    ],
    plans: [
      { label: 'Mes', price: 500 },
      { label: 'Semana', price: 180 },
      { label: 'Clase individual', price: 70 },
    ],
  },
]

// Plan que combina las dos disciplinas
export const combo = { label: 'Barre + Trampolín ilimitado', price: 900 }

// Horario semanal. day: 1 = lunes … 5 = viernes. name es el tipo de clase.
const BS = 'Barre & Sculpt', BR = 'Barre Restore', JUMP = 'Jump'
const row = (time, discipline, days, names = {}) =>
  days.map((day) => ({
    day,
    time,
    discipline,
    name: names[day] || (discipline === 'barre' ? BS : JUMP),
    instructor: discipline === 'barre' ? 'nadia' : 'juana',
  }))

export const schedule = [
  ...row('06:50', 'barre', [2, 3, 5]),
  ...row('08:00', 'trampolin', [1, 3, 4, 5]),
  ...row('09:15', 'barre', [1, 2, 3, 4, 5], { 3: BR }),
  ...row('18:00', 'trampolin', [1, 2, 3, 4, 5]),
  ...row('19:00', 'barre', [1, 2, 3, 4, 5], { 5: BR }),
  ...row('20:10', 'trampolin', [1, 2, 3, 4]),
]

// Instructoras. Cuando tengas fotos, ponlas en /public/instructoras y llena `photo`.
// POR COMPLETAR: years, experience, certificates (PDF en /public/docs) y social.
// Las secciones vacías no se muestran en la página.
export const instructors = [
  {
    id: 'nadia',
    name: 'Nadia Patrón López',
    role: 'Fundadora y Head Coach',
    photo: null,
    tone: '#e7c9c2',
    years: null,
    look: { skin: '#e9b99a', hair: 'bun', hairColor: '#3b2a22', top: '#d9958a' },
    short:
      'Licenciada en Artes Escénicas, con formación en danza, expresión corporal y entrenamiento físico. Certificada en Barre y Sculpt & Burn por The Body Method.',
    // Historia completa: se muestra en su perfil
    bio: [
      'Apasionada por el movimiento y el bienestar, Nadia cuenta con una Licenciatura en Artes Escénicas y una trayectoria vinculada al entrenamiento físico, la danza y la expresión corporal. Su formación le ha permitido desarrollar una comprensión integral del cuerpo, el movimiento y sus posibilidades.',
      'Su encuentro con Barre llegó durante su maternidad, cuando encontró en esta disciplina una nueva forma de reconectar con su cuerpo y experimentar los beneficios del movimiento consciente. Esta experiencia personal despertó en ella el deseo de compartirlo con otras mujeres y dio origen a Nara Studio.',
      'Nara nació de su deseo de crear un espacio donde las mujeres, especialmente aquellas que han vivido la transformación de la maternidad, puedan volver a dedicarse tiempo, fortalecer su cuerpo y reconectar consigo mismas.',
    ],
    approach:
      'Su enfoque integra el conocimiento del movimiento corporal, el control, la fuerza y la conciencia física, buscando ofrecer experiencias de entrenamiento que permitan desarrollar capacidades físicas y fortalecer la conexión con el propio cuerpo.',
    quote:
      'Nara nació de mi propia necesidad de volver a conectar conmigo, y de mi deseo de crear un espacio donde otras mujeres también pudieran hacerlo.',
    experience: [
      'Licenciatura en Artes Escénicas.',
      'Formación en danza, expresión corporal y entrenamiento físico.',
      'Imparte Barre & Sculpt y Barre Restore en Nara Studio.',
    ],
    // Cuando tengas los PDF, ponlos en /public/docs y escribe la ruta en file
    certificates: [
      { title: 'Barre · The Body Method', file: null },
      { title: 'Sculpt & Burn · The Body Method', file: null },
    ],
    social: [],
  },
  {
    id: 'juana',
    name: 'Juana Arcos',
    role: 'Jump · Trampolín',
    photo: null,
    tone: '#d8c3ae',
    years: null,
    look: { skin: '#c99272', hair: 'ponytail', hairColor: '#24180f', top: '#8a6553' },
    short:
      'Guía las clases de Jump: energía, música y saltos sobre el trampolín para desafiarte y disfrutar mientras entrenas.',
    experience: [],
    certificates: [],
    social: [],
  },
]

// La esencia de Nara
export const philosophy = [
  ['Conexión', 'Escuchar, reconocer y respetar nuestro cuerpo.'],
  ['Fuerza', 'Desarrollar capacidades físicas y confianza personal.'],
  ['Bienestar', 'Entender el ejercicio como parte de una vida saludable.'],
  ['Disciplina', 'Construir hábitos a través de la constancia.'],
  ['Comunidad', 'Crecer, compartir y motivarnos unas a otras.'],
  ['Autenticidad', 'Cada cuerpo tiene su propio proceso y cada avance merece reconocerse.'],
]

export const mission =
  'Crear un espacio de entrenamiento y bienestar donde las mujeres puedan fortalecer su cuerpo, desarrollar hábitos saludables y conectar consigo mismas a través del movimiento. Ofrecemos experiencias dinámicas, conscientes y accesibles, con disciplinas que combinan fuerza, resistencia y trabajo cardiovascular, acompañadas de una comunidad que inspira, motiva y celebra cada logro.'

export const vision =
  'Ser un estudio boutique de referencia en bienestar y entrenamiento femenino, reconocido por ofrecer experiencias de calidad, una atención cercana y una comunidad que promueve el movimiento, la confianza y el amor propio. Buscamos crecer, innovar y ampliar nuestras experiencias sin perder nuestra esencia: crear espacios donde cada mujer descubra su fuerza, disfrute su proceso y conecte con su cuerpo.'


// Imágenes de la galería. Reemplazar por fotos reales del estudio en /public/estudio.
export const gallery = [
  { src: imgBarre, alt: 'Dos bailarinas estirando en la barra, pintura de Degas', caption: 'La barra: de los salones de ensayo del ballet a nuestra sala.' },
  { src: imgBallet, alt: 'Bailarinas en escena en la Ópera de París, pastel de Degas', caption: 'Postura, ritmo y grupo: lo que el barre toma del ballet.' },
  { src: imgAcrobats, alt: 'Dos acróbatas en la pista de un circo, pintura de Renoir', caption: 'El rebote y el equilibrio vienen de la acrobacia.' },
  { src: imgCity, alt: 'Azoteas de Dolores Hidalgo con la parroquia al fondo', caption: 'A unas cuadras de la parroquia de Dolores.' },
]

// Videos demo. Pon el archivo en /public/video y escribe la ruta en `src`.
export const demos = [
  { id: 'barre', title: 'Así se siente una clase de barre', src: videoBarre, poster: null },
  { id: 'trampolin', title: 'Así se siente una clase de trampolín', src: null, poster: imgAcrobats },
]

export const credits = [
  '“Dancers Practicing at the Barre”, Edgar Degas, 1877, dominio público (CC0), The Metropolitan Museum of Art',
  '“Ballet at the Paris Opéra”, Edgar Degas, 1877, dominio público (CC0), Art Institute of Chicago',
  '“Acrobats at the Cirque Fernando”, Pierre-Auguste Renoir, 1879, dominio público (CC0), Art Institute of Chicago',
  '“Azoteas de Dolores Hidalgo, Gto”, Juan Carlos Fonseca Mata, CC BY-SA 4.0, Wikimedia Commons',
  'Mapa © colaboradores de OpenStreetMap',
]

// Tipos de clase del horario, en orden: cada uno toma un color (1.º --rose, 2.º --sand, 3.º --earth).
// match: nombre de la clase o slug de la disciplina (el nombre gana).
export const classKinds = [
  { match: 'barre', label: 'Barre & Sculpt' },
  { match: 'Barre Restore', label: 'Barre Restore' },
  { match: 'trampolin', label: 'Jump (trampolín)' },
]

// Textos de la landing
export const copy = {
  heroTitle: 'Habita tu cuerpo',
  heroLead:
    'Un espacio de movimiento, bienestar y conexión personal en Dolores Hidalgo, para que cada mujer fortalezca su cuerpo y disfrute su proceso.',
  heroImage: { src: photoNadia, alt: 'Nadia en la sala de Nara Studio, apoyada en la barra con la pierna extendida y una mancuerna en la mano' },
  heroChips: ['Barre · 60 min', 'Trampolín · 60 min'],
  marquee: ['Barre', 'Sculpt', 'Jump', 'Habita tu cuerpo', 'Fortalece tu esencia', 'Honra tu proceso', 'Crece a tu manera'],
  aboutTitle: 'Más que un estudio, somos una familia',
  aboutImage: { src: imgBallet, alt: 'Pastel de Degas: bailarinas en escena en la Ópera de París' },
  motto: ['Habita tu cuerpo.', 'Honra tu proceso.', 'Crece a tu manera.'],
  classesLead: 'Clases de 60 minutos, de lunes a viernes. Elige el plan que va con tu ritmo.',
  comboLead: 'Las dos disciplinas, todas las clases que quieras.',
  scheduleLine: 'Mueve tu cuerpo, transforma tu día',
  teamTitle: 'Nuestras instructoras',
  teamLead: 'Pasa el cursor o desliza entre las tarjetas. Abre su perfil para ver sus horarios y más sobre ella.',
  essenceTitle: 'Volver a ti a través del movimiento',
  essenceLead:
    'Un lugar donde la fuerza física se encuentra con el bienestar personal. Entrenar no tiene que ser un castigo ni una obligación: puede ser un acto de amor propio, disciplina, constancia y conexión contigo.',
  essenceLine: 'Habita tu cuerpo, fortalece tu esencia.',
  galleryLead:
    'Una sala amplia con barra de pared a pared, espejos y trampolines individuales. Ven a una clase muestra o pasa a conocernos en horario de recepción.',
  galleryFact: ['60', 'minutos por clase, de lunes a viernes.'],
  demosLead: 'Un vistazo a la música, el ritmo y el tipo de ejercicio de cada disciplina.',
  locationLead: 'A tres cuadras al sur de la parroquia de Nuestra Señora de los Dolores.',
}
