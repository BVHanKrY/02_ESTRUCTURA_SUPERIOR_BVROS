# MAPA DE ARCHIVOS

## Raíz
- `index.html`: cabeza de BVros.
- `stream.html`: catálogo global.
- `distribution.html`: recepción y gestión de lanzamientos.
- `academy.html`: formación.
- `artists.html`: directorio.
- `privacy.html`, `terms.html`: páginas legales.
- `manifest.webmanifest`: identidad de la aplicación.
- `sw.js`: service worker sin caché.

## Perfil y release
- `artist/bvhankry/index.html`: página actual transformada en perfil piloto con audio privado.
- `release/raiz-de-mi-ser/index.html`: ficha del lanzamiento experimental.

## CSS
- `variables.css`: colores, fuentes y medidas.
- `base.css`: reinicio y cuerpo.
- `layout.css`: navegación, cabecera, tracks, embeds e información.
- `player.css`: reproductor fijo.
- `store.css`: merch y lightbox.
- `responsive.css`: celulares y accesibilidad de movimiento.
- `hub.css`: páginas superiores de BVros.

## JavaScript
- `main-secure.js`: comportamiento actual con autorización temporal del audio.
- `config.js`: URL y clave pública de Supabase.
- `services/audio-service.js`: solicita URL firmada.
- `modules/*`: espacios preparados para la siguiente migración.

## Supabase
- `001_bvros_schema.sql`: tablas, RLS y buckets.
- `002_pilot_seed.sql`: BVHanKrY, Pulso y Raíz de mi ser.
- `functions/get-audio-url/index.ts`: función de URLs temporales.
