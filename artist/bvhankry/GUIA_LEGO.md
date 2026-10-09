# PRIMERA DIVISIÓN FUNCIONAL — BVros

Esta carpeta conserva el aspecto y el funcionamiento de tu página. La lógica original no se borró: únicamente se extrajeron el CSS y el JavaScript que estaban dentro de `index.html`.

## Los siete bloques esenciales

1. `index.html`: estructura visible de la página.
2. `assets/css/main.css`: puerta de entrada de los estilos.
3. `assets/js/main.js`: funcionamiento original de reproductor, tienda, menú y PWA.
4. `assets/data/catalog.json`: primer modelo separado de datos musicales. Todavía no controla el HTML.
5. `manifest.webmanifest`: identidad instalable de BVros.
6. `sw.js`: service worker sin almacenamiento; no guarda audio ni otros recursos.
7. `GUIA_LEGO.md`: instrucciones de montaje.

## Cómo reemplazar el repositorio sin perder nada

1. Crea una rama o copia de seguridad del repositorio actual.
2. Sube el contenido de esta carpeta a la raíz del repositorio.
3. Conserva las carpetas existentes `audio`, `fondo`, `iconos`, `merch` y `multimedia`.
4. Verifica que `index.html`, `manifest.webmanifest` y `sw.js` queden en la raíz.
5. Verifica que exista `assets/css/main.css` y `assets/js/main.js`.
6. Haz el despliegue en Render.
7. Abre DevTools > Application > Service Workers. Debe aparecer `bvros-network-only-v1`.
8. En Cache Storage no debe quedar contenido creado por BVros.

## Importante

Esta carpeta todavía usa las direcciones públicas de GitHub para las tres canciones, porque su objetivo es una separación sin alterar el funcionamiento. Para retirar esas direcciones usa la carpeta `02_ESTRUCTURA_SUPERIOR_BVROS`, que incorpora el modo privado con Supabase.
