// Documentos legales del sitio. Conviene que un abogado revise los textos.
// Al cambiar un documento, sube LEGAL_VERSION aquí y TERMS_VERSION en el backend
// (backend/src/common/legal.ts): todas las cuentas tendrán que aceptarlo de nuevo.
import { studio } from '@brand/studio.js'

export const LEGAL_VERSION = '2026-11-12'
const UPDATED = '12 de noviembre de 2026'

export const owner = {
  // Responsable de los datos personales (en src/brands/<estudio>/studio.js)
  legalName: studio.legal.name,
  address: `${studio.address}, ${studio.city}`,
  // Correo del estudio (el mismo desde el que salen los avisos)
  email: studio.legal.email,
}

const contact = `Escríbenos a ${owner.email} o acude al estudio en ${owner.address}.`

export const LEGAL = {
  terminos: {
    title: 'Términos y condiciones',
    lead: `Las reglas para usar el sitio y la app de ${studio.name}, reservar clases y contratar planes.`,
    sections: [
      ['1. Quiénes somos', [
        `${studio.name} es un estudio de entrenamiento ubicado en ${owner.address}, operado por ${owner.legalName} (“${studio.name}”, “nosotras”).`,
        'Al crear una cuenta, reservar una clase o contratar un plan, aceptas estos términos. Si no estás de acuerdo, no uses la app.',
      ]],
      ['2. Tu cuenta', [
        'Para reservar necesitas una cuenta con datos verdaderos y actualizados.',
        'Edad: para tener una cuenta necesitas al menos 12 años. Si tienes entre 12 y 17 años, tu madre, padre o tutor debe darnos su nombre y su celular y autorizar tu registro; al hacerlo, acepta estos términos por ti y se hace responsable de tu cuenta.',
        'Tu cuenta es personal: no la compartas ni prestes tus créditos. Cuida tu contraseña; lo que se haga con tu cuenta es tu responsabilidad.',
        'Si una coach te registra en el estudio, te llega una invitación por correo para crear tu contraseña. Tu cuenta queda activa aunque no uses la app, para que la coach pueda anotarte en clase y venderte planes.',
        'Podemos suspender una cuenta que se use para fines distintos a los del estudio, que dañe la app o que falte al respeto a otras personas.',
        'Puedes borrar tu cuenta cuando quieras desde “Mi perfil” → “Borrar mi cuenta”. Al hacerlo pierdes las clases y planes que te queden (ver la Política de reembolsos).',
      ]],
      ['3. Clases y reservas', [
        'Los lugares de cada clase son limitados y se apartan en orden de reserva. Las reservas de la semana siguiente se abren el sábado a las 6:00 a.m. (hora del centro de México).',
        'Puedes cancelar tu reserva desde la app hasta antes de que empiece la clase; si la clase la pagaste con un crédito, lo recuperas.',
        'Si no asistes y no cancelaste, se aplica la política de inasistencias vigente que se muestra en la app: según esa política, la clase puede contar como usada.',
        'Llega a tiempo: la coach pasa lista y, por seguridad, puede no permitir que entres a una clase muy avanzada.',
        `${studio.name} puede cancelar una clase, cambiar su horario o la coach que la imparte por causas de fuerza mayor, salud o cierre del estudio. Si cancelamos una clase que reservaste, te avisamos por correo y recuperas tu crédito; si la ibas a pagar en efectivo, no pagas nada.`,
      ]],
      ['4. Planes, membresías y pagos', [
        'Los precios se muestran en pesos mexicanos y pueden cambiar; el precio que pagas es el vigente al contratar.',
        'El precio que ves es el total que pagas: no agregamos comisiones por pagar con tarjeta, cargos por servicio ni cobros automáticos o recurrentes. Ningún plan se renueva solo.',
        'Cada plan tiene una vigencia que empieza al activarse (al pagarlo). Los créditos o clases que no uses antes de que venza el plan se pierden, y los planes no se transfieren a otra persona.',
        { list: [
          'Pago en efectivo: pides el plan en la app y lo pagas el día que asistas, al llegar a tu clase. La clase individual aparta tu lugar desde que la pides. Una membresía pedida en efectivo te deja apartar una clase y, al pagarla, se activan las demás.',
          'Si no pagas, la solicitud se cancela sola: la de una clase individual (y su lugar), 2 horas después de que termina la clase; la de una membresía, cuando vence el plazo que se indica en la app.',
          'Al pagar recibes tu comprobante por correo.',
          'Pago con tarjeta de crédito o débito: pagas en la página segura de Stripe y tu plan se activa (o tu lugar queda confirmado) en cuanto se aprueba el cargo. Los datos de tu tarjeta los recibe Stripe; nosotros no los vemos ni los guardamos. Si no terminas el pago, la solicitud se cancela sola en unos minutos.',
        ] },
        `Los reembolsos se rigen por nuestra Política de reembolsos: en general los pagos no se reembolsan, salvo cuando ${studio.name} cancela una clase, hay un cobro duplicado o equivocado, o lo marca la ley. Esto no limita los derechos que te otorga la Ley Federal de Protección al Consumidor.`,
      ]],
      ['5. Salud y seguridad', [
        'Barre, Sculpt y Jump son actividades físicas y, como toda actividad física, tienen riesgos. Antes de empezar, y si tienes alguna lesión, embarazo, enfermedad o condición médica, consulta a tu médico.',
        'Si quieres, puedes compartirnos tus datos de salud (lesiones, alergias u otras condiciones) para que tu coach adapte los ejercicios; es opcional. Si los compartes, mantenlos actualizados y avísale a tu coach de cualquier cambio antes de la clase.',
        `Sigue las indicaciones de la coach, respeta tus límites y detente si sientes dolor o malestar. En la medida que lo permita la ley, ${studio.name} no es responsable de lesiones causadas por no seguir las indicaciones o por no informar una condición de salud.`,
      ]],
      ['6. En el estudio', [
        'Trata con respeto a las coaches y a las demás alumnas. Usa calcetas antiderrapantes en Barre y sigue las reglas de uso del equipo.',
        'Cuida tus objetos personales: el estudio no se hace responsable de objetos olvidados o perdidos.',
      ]],
      ['7. Tu foto, tu nombre y tu racha', [
        'Si subes una foto de perfil, la ven tus coaches en la lista de la clase. En la racha y el ranking de la app se muestra el nombre público que elijas en tu perfil.',
      ]],
      ['8. Propiedad intelectual', [
        `Los textos, el logotipo, el diseño, las fotos y los videos del sitio y la app son de ${studio.name} o de sus autoras, y no puedes usarlos sin permiso.`,
      ]],
      ['9. Cambios a estos términos', [
        'Podemos actualizar estos términos. Cuando lo hagamos, cambiaremos la fecha de esta página y te pediremos aceptarlos de nuevo al entrar a la app.',
      ]],
      ['10. Ley aplicable', [
        'Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a los tribunales de Dolores Hidalgo, Guanajuato, sin perjuicio de que acudas a la Procuraduría Federal del Consumidor (Profeco).',
      ]],
      ['11. Contacto', [contact]],
    ],
  },

  privacidad: {
    title: 'Aviso de privacidad',
    lead: 'Qué datos personales recabamos, para qué los usamos, con quién los compartimos y cómo ejercer tus derechos.',
    sections: [
      ['1. Responsable', [
        `${owner.legalName}, que opera ${studio.name}, con domicilio en ${owner.address}, es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.`,
      ]],
      ['2. Datos que recabamos', [
        { list: [
          'Identificación y contacto: nombre, correo electrónico, celular, fecha de nacimiento (solo para saber si eres menor de edad) y, si la subes, tu foto. Si entras con Google, recibimos tu nombre y tu correo de tu cuenta de Google. No pedimos tu dirección.',
          'Si eres menor de edad (12 a 17 años): nombre, celular y, si nos lo da, correo de tu madre, padre o tutor, y la fecha en que autorizó tu registro.',
          'Tu actividad en el estudio: planes, pagos, reservas, asistencias, racha y el nombre público que elijas.',
          'Datos sensibles de salud, solo si decides compartirlos: peso, estatura, lesiones, alergias u otras condiciones.',
          'Datos técnicos: los que guarda tu navegador para mantener tu sesión (ver la Política de cookies y almacenamiento) y los registros básicos del servidor, como la dirección IP.',
        ] },
        'Tu contraseña no la conocemos: la guarda cifrada nuestro proveedor de autenticación.',
      ]],
      ['3. Para qué los usamos', [
        'Finalidades necesarias para darte el servicio:',
        { list: [
          'Crear y administrar tu cuenta e identificarte al entrar.',
          'Apartar tus clases, pasar lista, registrar tus pagos y la vigencia de tus planes.',
          'Enviarte correos sobre tu cuenta: invitación, confirmaciones, comprobantes de pago y avisos de clases canceladas.',
          'Que tu coach adapte los ejercicios a tu salud y te cuide durante la clase.',
          'Llevar la contabilidad del estudio y cumplir obligaciones legales y fiscales.',
          'Mantener la seguridad de la app y prevenir usos indebidos.',
        ] },
        'Finalidades adicionales: mostrar tu racha y tu nombre público en el ranking de alumnas. Si no quieres aparecer, déjanos saber con los datos de contacto de este aviso; no afecta tu servicio.',
      ]],
      ['4. Tus datos de salud', [
        'Los datos de salud son sensibles y compartirlos es opcional: no los necesitas para reservar. Solo los recabamos con tu consentimiento expreso, que nos das al marcar la casilla correspondiente. Solo los ven tú y tus coaches, solo los usamos para cuidar tu entrenamiento y los guardamos cifrados.',
        'Puedes borrarlos cuando quieras desde “Mi perfil” → “Borrar mis datos de salud”; eso revoca tu consentimiento.',
      ]],
      ['5. Menores de edad', [
        'Solo aceptamos cuentas de personas de 12 años o más. De los 12 a los 17 años, necesitamos el consentimiento de la madre, padre o tutor, que nos da sus datos de contacto y autoriza el registro y el tratamiento de los datos de la menor. Si detectamos una cuenta de alguien menor de 12 años, la borramos.',
      ]],
      ['6. Con quién los compartimos', [
        'No vendemos ni rentamos tus datos. Para que la app funcione, los procesan por nuestra cuenta estos proveedores, que no pueden usarlos para otros fines:',
        { list: [
          'Supabase: base de datos, inicio de sesión y almacenamiento de fotos y documentos.',
          'Render: servidor de la app.',
          'Vercel: publicación del sitio web.',
          'Resend: envío de correos.',
          'Stripe: cobro con tarjeta (recibe tu nombre, tu correo y los datos de tu tarjeta).',
          'Google: solo si eliges entrar con tu cuenta de Google.',
          'Cloudflare (Turnstile): verifica que quien entra o crea una cuenta no sea un robot.',
          'OpenStreetMap: muestra el mapa de la ubicación del estudio cuando llegas a esa sección de la página.',
        ] },
        'Algunos de estos proveedores guardan la información en servidores fuera de México, principalmente en Estados Unidos. Solo compartiríamos tus datos con autoridades cuando una ley o un mandato judicial lo exija.',
      ]],
      ['7. Tus derechos (ARCO) y cómo revocar tu consentimiento', [
        'Puedes acceder a tus datos, rectificarlos, cancelarlos u oponerte a su uso (derechos ARCO), revocar tu consentimiento o limitar su uso o divulgación. Muchos datos los puedes corregir tú misma en “Mi perfil”.',
        'Para cancelar tus datos no necesitas escribirnos: en “Mi perfil” → “Borrar mi cuenta” borras tu cuenta, tus datos personales, tu foto y tus datos de salud en ese momento. Los registros de pagos y asistencias se conservan sin tu nombre, como lo exige la ley fiscal.',
        `Para cualquier otra solicitud, escribe a ${owner.email} con tu nombre, el correo de tu cuenta, una identificación oficial y qué derecho quieres ejercer. Te respondemos en un máximo de 20 días hábiles y, si procede, lo hacemos efectivo en los 15 días hábiles siguientes.`,
        'Si revocas tu consentimiento o cancelas tus datos, es posible que ya no podamos darte el servicio. Algunos datos, como los pagos, los conservamos el tiempo que exige la ley.',
      ]],
      ['8. Cuánto tiempo los guardamos', [
        'Mientras tengas una cuenta en el estudio. Al borrarla eliminamos tus datos personales, y los registros de pagos quedan anónimos el tiempo que marque la ley (en general, cinco años para fines fiscales).',
      ]],
      ['9. Cookies y almacenamiento del navegador', [
        'La app guarda algunos datos en tu navegador para mantener tu sesión y cargar más rápido. Los detalles están en la Política de cookies y almacenamiento.',
      ]],
      ['10. Cambios a este aviso', [
        'Si cambiamos este aviso, actualizaremos la fecha de esta página y te pediremos aceptarlo de nuevo al entrar a la app.',
      ]],
      ['11. Contacto', [
        `${contact} Si consideras que no atendimos tu solicitud, puedes acudir a la autoridad competente en materia de protección de datos personales.`,
      ]],
    ],
  },

  reembolsos: {
    title: 'Política de reembolsos',
    lead: 'Cuándo devolvemos tu dinero, cómo pedirlo y en cuánto tiempo.',
    sections: [
      ['1. La regla general', [
        'Los lugares en cada clase son limitados y los apartamos para ti al reservar. Por eso, una vez que tu plan se activa o tu clase queda pagada, el pago no se reembolsa por cambio de opinión, por no usar las clases o por faltar.',
        'Lo que sí puedes hacer: cancelar tu reserva desde la app antes de que empiece la clase para recuperar tu crédito y usarlo en otra clase mientras tu plan esté vigente.',
      ]],
      ['2. Cuándo sí te devolvemos el dinero', [
        { list: [
          `${studio.name} cancela una clase individual que pagaste y no puedes (o no quieres) tomarla en otro horario: te devolvemos lo que pagaste por esa clase.`,
          `${studio.name} deja de dar el servicio de tu membresía por causas del estudio (por ejemplo, cierre del estudio o de la disciplina): te devolvemos la parte proporcional de lo que no pudiste usar.`,
          'Cobro duplicado o por un monto equivocado: te devolvemos la diferencia completa.',
          'Un cargo que no reconoces o que no autorizaste.',
          'Cualquier otro caso en que la Ley Federal de Protección al Consumidor lo exija.',
        ] },
        'Si el estudio cancela una clase que reservaste con un crédito de tu membresía, recuperas el crédito y te avisamos por correo; en ese caso no hay cobro que devolver.',
      ]],
      ['3. Pagos en efectivo', [
        'Las solicitudes en efectivo se pagan el día de la clase. Si no asistes, no pagas nada: la solicitud se cancela sola. Si pagaste en efectivo y aplica un reembolso, te lo damos en efectivo en el estudio o por transferencia, como prefieras.',
      ]],
      ['4. Cómo pedir un reembolso', [
        `Escríbenos a ${owner.email} dentro de los 30 días siguientes al cobro (o a la cancelación de la clase) con tu nombre, el correo de tu cuenta, la fecha y el monto del pago y el motivo. También puedes pedirlo en el estudio.`,
        'Te respondemos en un máximo de 5 días hábiles. Si procede, lo hacemos en los 5 días hábiles siguientes.',
      ]],
      ['5. Cuánto tarda en llegar', [
        'Pagos con tarjeta: el reembolso se hace a la misma tarjeta a través de Stripe. Según tu banco, puede tardar de 5 a 10 días hábiles en verse en tu estado de cuenta.',
        'Pagos en efectivo: en el estudio, el mismo día, o por transferencia en un máximo de 5 días hábiles.',
      ]],
      ['6. Sin cargos ocultos', [
        'El precio que ves en la app es el total que pagas. No cobramos comisiones por pagar con tarjeta, cargos por servicio ni renovaciones automáticas: ningún plan se cobra solo.',
      ]],
      ['7. Tus derechos', [
        'Esta política no limita los derechos que te da la Ley Federal de Protección al Consumidor. Si no estás de acuerdo con nuestra respuesta, puedes acudir a la Procuraduría Federal del Consumidor (Profeco).',
        contact,
      ]],
    ],
  },

  cookies: {
    title: 'Política de cookies y almacenamiento',
    lead: 'Qué guarda la app en tu navegador, para qué sirve y cómo borrarlo.',
    sections: [
      ['1. Qué usamos', [
        'No usamos cookies de publicidad ni herramientas de rastreo o analítica de terceros. Usamos el almacenamiento local de tu navegador (localStorage), que funciona como una cookie: guarda datos en tu dispositivo.',
      ]],
      ['2. Necesario (siempre activo)', [
        { list: [
          'Tu sesión: te mantiene dentro de tu cuenta mientras no salgas. Lo guarda nuestro proveedor de autenticación, Supabase.',
          'Tu elección sobre este aviso, para no volver a preguntarte.',
        ] },
        'Sin estos datos no podrías entrar a tu cuenta.',
      ]],
      ['3. Rendimiento (opcional)', [
        'Si lo aceptas, guardamos por un tiempo corto (de 5 a 30 minutos) una copia de información que cambia poco: planes y precios, perfiles de las coaches, clases, disciplinas, días cerrados y el ranking. Así la app carga más rápido y hace menos peticiones al servidor.',
        'Nunca guardamos así tus reservas, cupos de las clases, pagos, membresías ni datos de salud: eso siempre se consulta en el momento.',
        'Si eliges “Solo lo necesario”, la app funciona igual, solo un poco más lenta.',
      ]],
      ['4. Servicios de terceros en la página', [
        'Las tipografías, imágenes y videos se sirven desde nuestro propio sitio. Solo al llegar a la sección de ubicación, tu navegador descarga el mapa de OpenStreetMap; al entrar o crear una cuenta, Cloudflare Turnstile puede verificar que no eres un robot, y al pagar con tarjeta pasas a la página de Stripe. Esos servicios reciben datos técnicos de la conexión, como tu dirección IP, según sus propias políticas. Ninguno se usa para publicidad.',
      ]],
      ['5. Cómo cambiar tu elección o borrar los datos', [
        'Puedes cambiar tu elección cuando quieras desde el enlace “Preferencias de almacenamiento” al pie de la página. También puedes borrar todo desde la configuración de tu navegador (datos de sitios); al hacerlo, se cierra tu sesión.',
      ]],
      ['6. Contacto', [contact]],
    ],
  },
}

export { LEGAL_PATHS } from './legal-paths.js'
export { UPDATED as LEGAL_UPDATED }
