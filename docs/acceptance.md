# Etapas y aceptación

La plataforma aún no se considera terminada conforme al documento maestro: falta aplicación/verificación en Supabase y validación nativa real.

| Etapa                    | Archivos principales                               | Cómo probar                               | Resultado esperado                                  | Estado                                                    |
| ------------------------ | -------------------------------------------------- | ----------------------------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| Arquitectura y workspace | package.json, pnpm-workspace.yaml, packages/config | pnpm install, pnpm typecheck              | Dependencias coherentes y tipos estrictos           | Implementado                                              |
| Esquema, roles y RLS     | supabase/migrations, seed.sql                      | pnpm test:db                              | Casos de acceso positivo y negativo                 | Verificado en PostgreSQL/PGlite; pendiente Supabase real  |
| Auth y registro          | functions/register-citizen, validation, sesiones   | Confirmar correo y registro de prueba     | Solo ciudadano, CURP estructural, edad 17+          | Implementado; SMTP/JWT reales pendientes                  |
| PWA                      | apps/web                                           | pnpm build, pnpm test:e2e                 | Login, rutas protegidas y layout responsive         | Build y smoke tests verificados                           |
| Ciudadano móvil          | apps/mobile/src/Citizen.tsx                        | Expo + dispositivo y Supabase configurado | Foto, GPS/manual, creación, folio y consulta propia | Bundle verificado; flujo nativo pendiente                 |
| Admin móvil              | apps/mobile/src/Operations.tsx, app/report         | Cuenta admin real                         | Listado, métricas, asignación y estado              | Implementado; E2E real pendiente                          |
| Mantenimiento móvil      | app/report, Operations                             | Cuenta compatible asignada                | Solo propios, evidencia y solución                  | Bundle verificado; E2E real pendiente                     |
| Funciones                | supabase/functions                                 | deno check y pruebas HTTP reales          | JWT/rol/estructura y manejo de errores              | Tipos verificados; despliegue pendiente                   |
| Realtime y push          | servicios, notifications, push_outbox              | Dos sesiones y dispositivos EAS           | Invalidación de detalle y actualización genérica    | Entrega y recibos implementados; verificación real pendiente |
| Despliegue               | docs/deployment, eas.json, headers                 | Supabase, hosting y EAS                   | Sistema accesible extremo a extremo                 | Pendiente credenciales/configuración                      |

## Evidencia de verificación

- Última ejecución local: 48 comprobaciones de base de datos, 16 pruebas unitarias/web, 5 pruebas de roles móviles y 6 pruebas Playwright aprobadas. Otras 2 pruebas Playwright se omitieron por requerir credenciales reales.
- Las comprobaciones SQL cubren: creación con foto obligatoria, folio, reintento idempotente, rol, lectura ajena, escritura directa denegada, área incompatible, asignación, versión obsoleta, secuencia de estados, evidencia de resolución, historial, notas privadas, Storage, métricas y desactivación.
- Unitarias: nombres Unicode, cumpleaños/edad, nombres compuestos, CURP sintética, dígito y coordenadas.
- Playwright: acceso sin autenticar, rutas protegidas, aviso y ausencia de desbordamiento horizontal en escritorio/móvil. Las pruebas que dependen de credenciales no se contaron como ejecutadas.
- TypeScript en ambos clientes; Deno en las siete funciones; build PWA; bundles Hermes Android e iOS.

## Variables requeridas por etapa

Clientes: URL, clave publicable y ambiente. Funciones: secretos y redirects de `functions/.env.example`. Móvil nativo: EAS project ID y clave de mapas Android. Pruebas reales: cuentas del entorno de prueba.

## Pendientes materiales

1. Autenticar administración de Supabase, inspeccionar esquema, adaptar/aplicar migraciones y generar tipos oficiales del proyecto.
2. Configurar SMTP, aviso integral, secreto HMAC, redirects, primer administrador y dispatcher de notificaciones.
3. Probar registro/confirmación/recuperación y carga real de imágenes con la pasarela de Supabase.
4. Completar pruebas E2E de asignación/reasignación, catálogos, mantenimiento y ciudadano sobre datos de prueba reales.
5. Construir y probar APK/AAB/IPA con cámara, GPS, permisos y push reales. Los bundles no verifican código nativo ni certificados.
6. Definir retención, limpieza de huérfanos y proceso institucional de eliminación de cuenta; verificar recibos push con el proveedor real.
7. Validar accesibilidad completa, rendimiento con volumen real, planes de consulta y asesores de seguridad.
8. Validar los indicadores por rango, zona, categoría, prioridad y responsable con datos operativos representativos.

Estas limitaciones se registran como pendientes, sin sustituir funciones operativas por datos simulados ni afirmar una certificación de producción.
