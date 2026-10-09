# GUÍA LEGO — BVros Módulo 01

## Qué contiene el paquete

- `00_ORIGINAL_INTACTO`: copia exacta de tus tres archivos recibidos.
- `01_PRIMERA_DIVISION_FUNCIONAL`: tu página actual separada en HTML, CSS y JavaScript, sin cambiar su lógica.
- `02_ESTRUCTURA_SUPERIOR_BVROS`: cabeza del ecosistema, rutas futuras, perfil piloto y modo de audio privado con Supabase.

## Orden recomendado

### Pieza A — Respaldo
No elimines la versión que actualmente funciona. Crea una rama en GitHub llamada, por ejemplo, `bvros-modular-v1`.

### Pieza B — Separación segura
Prueba primero la carpeta `01_PRIMERA_DIVISION_FUNCIONAL`. Debe verse y funcionar como la página actual.

### Pieza C — PWA sin almacenamiento
El nuevo `sw.js` no guarda nada. Al activarse elimina cachés antiguos del service worker anterior.

### Pieza D — Base de datos
Crea Supabase y ejecuta los dos SQL de `02_ESTRUCTURA_SUPERIOR_BVROS/supabase/migrations`.

### Pieza E — Audio
Sube COPIAS de streaming al bucket `bvros-stream-private`. Conserva los másteres WAV/FLAC en `bvros-masters-private` o fuera de línea.

### Pieza F — Función firmadora
Despliega `get-audio-url`. La clave privada se queda dentro de Supabase.

### Pieza G — Estructura superior
Cuando el audio privado funcione, publica el contenido de `02_ESTRUCTURA_SUPERIOR_BVROS` como nuevo sitio o en una rama de prueba.

## No hagas todavía

- No migres a React o Next.js todavía.
- No uses el contador local de plays para pagos.
- No conectes cobros hasta definir condiciones y pruebas.
- No publiques claves privadas.
- No borres la página que hoy funciona antes de probar la rama nueva.
