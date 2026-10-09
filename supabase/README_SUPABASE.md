# GUÍA SUPABASE — BASE DE DATOS Y AUDIO PRIVADO

## Por qué Supabase

Para este MVP reúne PostgreSQL, autenticación, Storage privado y funciones de servidor. Google Drive puede servir como archivo personal, pero no reemplaza una base de datos relacional ni un sistema de URLs firmadas.

## Montaje paso a paso

1. Crea un proyecto gratuito en Supabase.
2. Abre **SQL Editor**.
3. Ejecuta `migrations/001_bvros_schema.sql`.
4. Ejecuta `migrations/002_pilot_seed.sql`.
5. Abre **Storage** y confirma que existen:
   - `bvros-stream-private`
   - `bvros-masters-private`
6. Sube copias de streaming MP3 a las rutas exactas del archivo seed. No subas el WAV maestro al bucket de streaming.
7. Instala Supabase CLI en tu computador.
8. En esta carpeta ejecuta:
   - `supabase login`
   - `supabase link --project-ref TU_PROJECT_REF`
   - `supabase secrets set ALLOWED_ORIGINS=https://TU-SITIO.onrender.com,http://localhost:8000`
   - `supabase functions deploy get-audio-url --no-verify-jwt`
9. En `assets/js/config.js` pega:
   - Project URL
   - Publishable key o anon key
10. No pegues nunca la clave `service_role` en HTML, JavaScript público, GitHub o Render Static Site.
11. Abre `artist/bvhankry/index.html` desde un servidor local o Render y prueba una canción.

## Qué mejora esta arquitectura

El HTML ya no contiene la dirección permanente del MP3. Al pulsar reproducir, el navegador pide a una función de servidor una URL temporal. El máster queda en otro bucket y jamás se entrega al reproductor.

## Límite real

Una persona que puede escuchar audio puede capturarlo. Una URL firmada reduce exposición, enlaces permanentes y descargas masivas, pero no es DRM.
