# Dar de alta un estudio nuevo

Todos los estudios usan el mismo código (este repo y el del backend). Cada uno tiene su propia
base de datos, su propio backend y su propio frontend, y se distingue por su **marca**.

## 1. La marca (este repo)

Copia `src/brands/nara` a `src/brands/<id>` (ej. `src/brands/zen`) y cambia:

| Archivo | Qué tiene |
| --- | --- |
| `studio.js` | Nombre, nombre corto, dirección, mapa, WhatsApp, redes, horario de recepción, logo, responsable legal, disciplinas, horario de respaldo, instructoras de respaldo, misión, visión, galería, tipos de clase (`classKinds`) y **todos los textos de la landing** (`copy`). |
| `theme.css` | Colores (mismos nombres de variable) y familias de letra. Los `*-rgb` son los mismos colores en canales R G B. |
| `meta.js` | Título y descripción para Google, color de la barra del navegador, íconos (pestaña y accesos directos: `img/favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) y hoja de letras. |
| `img/` | Logos (oscuro y claro) e imágenes. Borra las de Nara que no uses. |

El `id` de cada disciplina en `studio.js` debe ser igual al `slug` de la disciplina en la base de datos.

Para verla en local: `VITE_BRAND=<id>` en `frontend/.env.development.local` y `npm run dev`.

## 2. Supabase (proyecto nuevo)

1. Crea el proyecto y copia la URL, la publishable key, la secret key y las URLs de Postgres (Connect → ORMs → Prisma).
2. Desde `backend/`, con esos datos en un `.env` temporal: `npm run db:deploy` (aplica todas las migraciones).
   La base nace con las disciplinas Barre y Trampolín: cámbialas en el panel (Admin → Disciplinas) o crea las tuyas.
3. Auth → URL Configuration: Site URL = dominio del estudio; Redirect URLs = `https://<dominio>/**`.
4. Auth → Providers: Google (si se usa) con su propio cliente OAuth; requisitos de contraseña y OTP como en Nara.
5. La admin se registra en la app y luego: `npm run auth:role -- <correo> admin <slug-disciplina>`.

## 3. Backend (Render, servicio nuevo con el mismo repo)

Mismas variables que Nara (`SUPABASE_URL`, `DATABASE_URL`, `DIRECT_URL`, `DATABASE_SSL`,
`SUPABASE_SECRET_KEY`, `APP_URL`, `RESEND_API_KEY`, `MAIL_FROM`) con los datos del estudio nuevo, más:

- `STUDIO_NAME` y `STUDIO_SLOGAN`: aparecen en los correos.
- `MAIL_COLOR_BG`, `MAIL_COLOR_INK`, `MAIL_COLOR_ACCENT`: colores de los correos (fondo, texto, botón).
- `HEALTH_DATA_KEY`: llave para cifrar los datos de salud (`openssl rand -base64 32`). Una por estudio y
  **nunca se cambia**: lo cifrado con otra llave ya no se puede leer. Guárdala también fuera de Render.
- `CORS_ORIGINS` (opcional): dominios extra que pueden llamar a la API, separados por coma (por ejemplo
  el dominio sin `www`). Por defecto solo `APP_URL`.

**Región:** crea el servicio de Render en la misma región que la base de datos de Supabase (si
Supabase está en `us-east-1`, Render en *Virginia (US East)*). Si están lejos, cada consulta tarda
~70 ms más y una página hace varias.

En Resend, verifica el dominio del estudio para `MAIL_FROM`.

## 4. Frontend (Vercel, proyecto nuevo con el mismo repo)

Variables: `VITE_BRAND=<id>` más las de Supabase y la API del estudio nuevo (las mismas que usa Nara).
Agrega el dominio del estudio al proyecto.

- `VITE_TURNSTILE_SITE_KEY` (recomendado): protección contra bots en entrar, crear cuenta y recuperar
  contraseña. Crea el sitio en Cloudflare → Turnstile, pon aquí la *site key* y la *secret key* en
  Supabase → Authentication → Attack Protection → Enable CAPTCHA (Turnstile).
- La política de seguridad de contenido (CSP) se arma sola al compilar con `VITE_SUPABASE_URL`,
  `VITE_API_URL` y `VITE_TURNSTILE_SITE_KEY`; las demás cabeceras están en `vercel.json`.

## 5. Ajustes de seguridad en Supabase (una vez por proyecto)

- Authentication → Sign In / Providers → Email: *Confirm email* activado.
- Authentication → Passwords: mínimo 8 caracteres con mayúscula, minúscula, número y símbolo, y
  *Leaked password protection* activado.
- Authentication → Rate Limits: deja los límites de inicio de sesión y de correos (los de fábrica
  sirven).
- Authentication → Attack Protection: CAPTCHA con Turnstile (ver arriba).
- Las migraciones activan RLS en todas las tablas y dejan privado el bucket de fotos de alumnas.
- Después de la migración `20261112000000_privacy_security`, corre `npm run db:encrypt-health`
  (con la `HEALTH_DATA_KEY` del estudio) para cifrar los datos de salud que ya existían.
