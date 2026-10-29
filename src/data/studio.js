// Contenido del sitio. Todo lo marcado "EJEMPLO" debe reemplazarse con datos reales antes de publicar.

export const studio = {
  name: 'Nara Studio',
  tagline: 'Fitness enfocado a ti',
  slogan: 'Habita tu cuerpo',
  address: 'Calle Salamanca 14, col. Sop',
  city: 'Dolores Hidalgo, Guanajuato · C.P. 37803',
  // Punto exacto tomado del enlace de Google Maps del estudio
  coords: [21.1621415, -100.9265285],
  mapsUrl: 'https://maps.app.goo.gl/e9Xo1NU29e2RSMzP9',
  // EJEMPLO: número de WhatsApp en formato internacional, sin signos
  whatsapp: '524180000000',
  instagram: 'https://instagram.com/narastudio', // EJEMPLO
  hours: [
    ['Lunes a viernes', '6:30 – 21:15'], // EJEMPLO: confirmar
    ['Sábado', 'Cerrado'],
    ['Domingo', 'Cerrado'],
  ],
}

export const disciplines = [
  {
    id: 'barre',
    name: 'Barre',
    image: '/img/dancers-practicing-at-the-barre.jpg',
    imageAlt: 'Pintura de Degas: dos bailarinas estiran la pierna sobre la barra de ensayo',
    classes: 'Barre & Sculpt · Barre Restore',
    details: ['60 minutos', 'Todos los niveles', 'Calcetas antiderrapantes'],
    styles: [
      {
        name: 'Barre',
        text: 'Entrenamiento de bajo impacto inspirado en el ballet, el Pilates y el acondicionamiento físico. Con movimientos controlados, equilibrio y fuerza, fortalece y tonifica piernas, glúteos, brazos y abdomen, y trabaja la postura y la conexión entre cuerpo y mente.',
        inNara: 'Aprender a moverte con intención, desarrollar fuerza desde el control y sentirte fuerte desde adentro hacia afuera.',
      },
      {
        name: 'Sculpt',
        text: 'Fortalecimiento y acondicionamiento muscular con fuerza funcional, resistencia, peso y pequeños intervalos cardiovasculares, en secuencias dinámicas que trabajan distintos grupos musculares.',
        inNara: 'La fuerza, la determinación y la capacidad de descubrir todo lo que tu cuerpo puede lograr.',
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
    image: '/img/acrobats-at-the-cirque-fernando-francisca-and.jpg',
    imageAlt: 'Pintura de Renoir: dos jóvenes acróbatas en la pista del circo',
    classes: 'Jump',
    details: ['60 minutos', 'Todos los niveles', 'Tenis limpios'],
    styles: [
      {
        name: 'Jump',
        text: 'Disciplina cardiovascular sobre un trampolín individual, con secuencias de saltos y desplazamientos al ritmo de la música. Mejora la resistencia, la coordinación y la agilidad, y permite un trabajo intenso de bajo impacto relativo gracias a la superficie elástica.',
        inNara: 'Energía, diversión y movimiento. Una forma diferente de desafiarte, liberar energía y disfrutar mientras entrenas.',
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
  { src: '/img/dancers-practicing-at-the-barre.jpg', alt: 'Dos bailarinas estirando en la barra, pintura de Degas', caption: 'La barra: de los salones de ensayo del ballet a nuestra sala.' },
  { src: '/img/ballet-at-the-paris-opera.jpg', alt: 'Bailarinas en escena en la Ópera de París, pastel de Degas', caption: 'Postura, ritmo y grupo: lo que el barre toma del ballet.' },
  { src: '/img/acrobats-at-the-cirque-fernando-francisca-and.jpg', alt: 'Dos acróbatas en la pista de un circo, pintura de Renoir', caption: 'El rebote y el equilibrio vienen de la acrobacia.' },
  { src: '/img/azoteas-de-dolores-hidalgo-gto.jpg', alt: 'Azoteas de Dolores Hidalgo con la parroquia al fondo', caption: 'A unas cuadras de la parroquia de Dolores.' },
]

// Videos demo. Pon el archivo en /public/video y escribe la ruta en `src`.
export const demos = [
  { id: 'barre', title: 'Así se siente una clase de barre', src: null, poster: '/img/dancers-practicing-at-the-barre.jpg' },
  { id: 'trampolin', title: 'Así se siente una clase de trampolín', src: null, poster: '/img/acrobats-at-the-cirque-fernando-francisca-and.jpg' },
]

export const credits = [
  '“Dancers Practicing at the Barre”, Edgar Degas, 1877, dominio público (CC0), The Metropolitan Museum of Art',
  '“Ballet at the Paris Opéra”, Edgar Degas, 1877, dominio público (CC0), Art Institute of Chicago',
  '“Acrobats at the Cirque Fernando”, Pierre-Auguste Renoir, 1879, dominio público (CC0), Art Institute of Chicago',
  '“Azoteas de Dolores Hidalgo, Gto”, Juan Carlos Fonseca Mata, CC BY-SA 4.0, Wikimedia Commons',
  'Mapa © colaboradores de OpenStreetMap',
]
