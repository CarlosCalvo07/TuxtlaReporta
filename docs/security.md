# Seguridad

## Controles implementados

- Roles y áreas fuera de `user_metadata`; el backend consulta tablas protegidas y el estado activo en cada operación.
- Registro crea exclusivamente `citizen`. Alta de personal exige admin y `service_role` permanece solo en Edge Functions.
- RLS en todas las tablas públicas y privadas. Grants mínimos, wrappers invoker, funciones privadas con `search_path=''`.
- Protección de concurrencia por versión, bloqueos de fila e idempotencia.
- Auditoría y tablas de historial sin escritura directa del cliente.
- Privacidad de CURP: validación compartida, HMAC-SHA256 con secreto de servidor y últimos cuatro caracteres. No se almacena la CURP completa.
- No se expone la CURP en URL, archivos, respuestas administrativas ni Realtime.
- Storage privado, firma de formato de imagen y tamaño revisados en servidor. Compresión y recodificación en clientes eliminan metadatos EXIF del flujo normal.
- Sesión móvil almacenada por partes en SecureStore. La PWA bloquea ciudadanos antes de montar módulos operativos.
- Realtime se suscribe a reportes específicos y notificaciones por usuario; RLS sigue aplicándose.
- Service worker cachea únicamente assets estáticos. No guarda las respuestas Supabase, tokens ni signed URLs.
- React presenta las descripciones como texto, sin `dangerouslySetInnerHTML`. SQL usa parámetros y conversiones tipadas.
- Las notificaciones push llevan un texto genérico; no incluyen datos del ciudadano, fotos o ubicaciones.

## Límites de la verificación

Las pruebas SQL corren con PostgreSQL/PGlite y PostGIS, con esquemas mínimos de Auth/Storage. Comprueban RLS, grants, transiciones, permisos, evidencia, métricas e idempotencia. No sustituyen pruebas de JWT, pasarela de funciones, Storage HTTP, SMTP y Realtime contra Supabase real.

Antes de producción se requiere:

1. Ejecutar asesores de Supabase y pruebas con los tres roles en un proyecto de prueba real.
2. Verificar confirmación de correo, alta duplicada, recuperación, reintentos parciales y protección contra abuso del registro.
3. Probar las rutas de upload con archivos grandes, firmas falsas y usuarios ajenos, incluyendo peticiones directas fuera de la UI.
4. Configurar SMTP, secretos aleatorios, backup, vigencia JWT y monitoreo operativo. No enviar datos sensibles a logs.
5. Publicar aviso integral de privacidad del responsable real, contacto y plazo de retención. El texto incluido es informativo y no sustituye ese aviso.
6. Definir limpieza de cargas huérfanas y política de conservación/eliminación de cuentas y reportes. No se inventó una política institucional.
7. Probar push en dispositivos reales. El dispatcher maneja tickets, recibos diferidos y `DeviceNotRegistered`; estas rutas de proveedor deben verificarse con credenciales EAS reales.

## Rotación

El secreto `CURP_HASH_SECRET` no debe rotarse sin un plan de migración: cambiarlo hace que una CURP produzca otro HMAC y afecta la detección de duplicados. Los tokens de acceso se administran mediante Supabase; la desactivación del perfil bloquea RLS aun cuando un JWT anterior siga vigente.

## Acceso web por rol

El bloqueo de ciudadanos en la PWA es un control de interfaz. La seguridad real es RLS y RPC: un ciudadano que use directamente la API continúa limitado a sus reportes y no obtiene capacidades administrativas.
