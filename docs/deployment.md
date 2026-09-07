# Despliegue

## Estado

Proyecto destino: `Tuxtla_reporta`, ref `xfqkicnhqhbmbcedgmvy`. Falta autenticación administrativa. No se aplicaron migraciones ni se desplegaron funciones. No se dispone de proveedor estático ni cuentas EAS/Apple/Google configuradas para publicación.

## Inspección previa

Autenticar la CLI, listar proyectos y enlazar el ref correcto. Revisar la ayuda de cada comando (`pnpm exec supabase db query --help`) antes de usarlo. Guardar un respaldo desde el dashboard y comprobar:

```sql
select table_schema,table_name from information_schema.tables
where table_schema in ('public','private') order by 1,2;
select extname,extversion from pg_extension;
select schemaname,tablename,policyname,roles,cmd from pg_policies
where schemaname in ('public','storage');
```

Si existen tablas homónimas, adaptar las migraciones a su estructura y datos. `PGRST205` no prueba que toda la base esté vacía.

## Aplicación

Una vez validada la compatibilidad:

```powershell
pnpm exec supabase db push --dry-run
pnpm exec supabase db push --include-seed
pnpm exec supabase functions deploy --project-ref xfqkicnhqhbmbcedgmvy --use-api
pnpm exec supabase db advisors --help
```

No usar `--prune`: podría borrar funciones de otra aplicación. Configurar el esquema público como expuesto y conservar `private` fuera de la Data API.

## Secretos de funciones

Supabase inyecta `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. Configurar adicionalmente:

| Variable               | Valor                                                       |
| ---------------------- | ----------------------------------------------------------- |
| WEB_ORIGIN             | Origen HTTPS exacto de la PWA; localhost durante desarrollo |
| MOBILE_AUTH_REDIRECT   | `tuxtlareporta://auth`                                      |
| STAFF_AUTH_REDIRECT    | URL de la PWA terminada en `/auth/recovery`                 |
| PRIVACY_NOTICE_VERSION | Versión aprobada del aviso institucional                    |
| CURP_HASH_SECRET       | Secreto aleatorio largo, privado y respaldado               |
| PUSH_PROVIDER_SECRET   | Secreto independiente para invocar dispatcher               |
| EXPO_ACCESS_TOKEN      | Opcional: token para seguridad reforzada de Expo Push       |

Guardar secretos con el dashboard o `supabase secrets set --env-file` después de revisar su ayuda. No copiarlos al chat ni a variables públicas.

## Auth

Activar confirmación de correo, contraseña mínima de 12 caracteres y rotación de refresh token. Configurar SMTP y allowlist exacta para redirect web/móvil. Crear el primer administrador con `bootstrap-admin.sql` y las siguientes cuentas desde Personal. Probar con direcciones de correo controladas.

## PWA

```powershell
pnpm build
```

Publicar **solo** `apps/web/dist` en un proveedor estático con HTTPS. `_redirects` y `_headers` se incluyen para proveedores compatibles; traducirlos al formato del proveedor elegido. Aplicar CSP, headers, fallback SPA y no-cache a `sw.js`. Mantener las claves de cliente como publicables, nunca `service_role`.

## Android / iOS

Configurar `EXPO_PUBLIC_EAS_PROJECT_ID` y, para el mapa Android, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` restringida al package/firma de la app. iOS utiliza mapas nativos Apple por defecto. `app.config.ts` inserta estos valores de configuración.

`eas.json` incluye perfiles development, preview y production. Instalar y autenticar EAS CLI estable, inicializar el proyecto EAS y ejecutar los builds Android/iOS con el perfil elegido. Se requieren las cuentas de publicación y certificados respectivos. No se generó APK/AAB/IPA en esta entrega.

Antes de enviar a tiendas: comprobar permisos, GPS rechazado y manual, cámara/galería, recodificación, envío interrumpido, reintento sin duplicados, recuperación de cuenta, áreas y resolución en dispositivos reales.

## Push

Configurar credenciales push Android/iOS en EAS. El usuario acepta notificaciones desde la app. Programar desde Supabase Cron una petición POST cada minuto a `functions/v1/notify-status-change` con el secreto guardado en Vault; no colocar el secreto en SQL versionado. La función reclama un lote con `SKIP LOCKED` y lease de cinco minutos; reintenta con espera incremental hasta ocho intentos.

Esta programación no se ha creado en el proyecto remoto. El dispatcher consulta recibos a partir de 15 minutos y elimina tokens con `DeviceNotRegistered`. `push_outbox.delivered_at` indica aceptación del envío; `push_receipts.result` registra el resultado diferido. La aceptación del ticket no es garantía de entrega al dispositivo.
