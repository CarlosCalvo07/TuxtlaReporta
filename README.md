# Tuxtla Reporta

Plataforma de incidencias urbanas con dos clientes TypeScript: PWA de administración/mantenimiento y aplicación Expo para ciudadano, administrador y mantenimiento. Supabase concentra Auth, PostgreSQL/PostGIS, Storage privado, Realtime y Edge Functions.

## Estado de esta entrega

El código de ambos clientes, las migraciones, los servicios y las funciones están implementados. Los archivos locales de entorno apuntan al proyecto proporcionado (`xfqkicnhqhbmbcedgmvy`), con clave publicable y fuera de control de versiones.

**La migración remota y el despliegue todavía no están realizados.** Auth respondió HTTP 200; la consulta a `incident_categories` devolvió `PGRST205` (tabla no disponible en la API). Falta autenticar acceso administrativo para inspeccionar el esquema existente y aplicar las migraciones. No se han creado cuentas ni enviado correos reales.

Los bundles de Expo verifican JavaScript/Hermes para Android/iOS; no sustituyen la compilación nativa, firma ni las pruebas físicas de cámara, GPS y push. Consulta [docs/acceptance.md](docs/acceptance.md) para los límites de validación.

## Requisitos

- Node.js 24 LTS. Esta máquina tiene 24.19.0; el documento recomienda 24.20.x. El código no requiere APIs adicionales de esa revisión. Se admite `>=24.19 <25` y se recomienda validar el despliegue con 24.20.x.
- pnpm 11.19.0, fijado en `packageManager`.
- Docker Desktop para ejecutar el stack completo de Supabase local (no está instalado en esta máquina).
- Android nativo: Android Studio/SDK o EAS Build. iOS nativo: macOS/Xcode o EAS Build con credenciales Apple.

## Instalación y ejecución

```powershell
cd C:\Tuxtla_reporta
pnpm install --frozen-lockfile
pnpm dev:web
```

Vite muestra su URL local, normalmente `http://127.0.0.1:5173`. El acceso requiere las migraciones y una cuenta con rol de personal. No hay modo de demostración ni datos simulados en producción.

En otra terminal:

```powershell
pnpm dev:mobile
```

Las variables de ejemplo están en `.env.example`. Copia solo las variables `VITE_*` a `apps/web/.env` y las `EXPO_PUBLIC_*` a `apps/mobile/.env`. Usa la URL y clave publicable del mismo proyecto. No pongas `service_role`, contraseñas ni secretos de servidor en esos archivos.

## Supabase local

```powershell
pnpm exec supabase start
pnpm exec supabase db reset --local
```

`db reset --local` borra exclusivamente la base local. No lo utilices contra la base remota. El seed solo crea áreas y categorías, sin credenciales ni CURP reales. Los correos locales se inspeccionan en el servidor SMTP local que indica Supabase.

Configura variables públicas con los valores locales que indique `supabase status`. Usa una clave publicable compatible: la validación de entorno rechaza claves secretas y acepta claves `sb_publishable_`.

Copia `supabase/functions/.env.example` a `supabase/functions/.env`, configura los secretos y ejecuta:

```powershell
pnpm exec supabase functions serve --env-file supabase/functions/.env
```

## Proyecto remoto existente

```powershell
pnpm exec supabase login
pnpm exec supabase projects list
pnpm exec supabase link --project-ref xfqkicnhqhbmbcedgmvy
```

Primero inspecciona el esquema existente siguiendo [docs/deployment.md](docs/deployment.md). Las migraciones son de instalación inicial; no deben superponerse a tablas homónimas existentes. Después de revisar la compatibilidad:

```powershell
pnpm exec supabase db push --dry-run
pnpm exec supabase db push --include-seed
pnpm exec supabase functions deploy --project-ref xfqkicnhqhbmbcedgmvy --use-api
```

Configura Auth, SMTP, redirects y secretos como se describe en despliegue. Las funciones públicas validan estructura y límites; las de usuario verifican el JWT con `getUser` y consultan rol en base. `verify_jwt=false` evita depender del verificador legado de la pasarela, no elimina los controles dentro de las funciones.

## Primer administrador

Crea una cuenta Auth desde el dashboard de Supabase y verifica el correo. Ejecuta `supabase/bootstrap-admin.sql` desde SQL Editor sustituyendo el UUID por el de esa cuenta. Es una operación administrativa explícita, no una función pública ni un usuario predefinido. Después usa Personal para crear tres cuentas de mantenimiento y asignar un área a cada una.

## Pruebas y builds

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:db
pnpm test:mobile
pnpm test:e2e
pnpm build
pnpm --filter @tuxtla/mobile export
```

- `test:db` ejecuta SQL, RLS, PostGIS y negocio en PostgreSQL/PGlite. Emula los esquemas Auth/Storage; no verifica los servicios HTTP de Supabase. PostGIS para PGlite es experimental y se usa solo en pruebas.
- Playwright utiliza Chrome instalado. Las pruebas con cuenta administrativa real se omiten si faltan `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD`.
- Los flujos Maestro en `tests/mobile` requieren una app nativa instalada y cuentas de prueba; no se ejecutaron en esta máquina.
- Edge Functions: `deno check --config supabase/functions/deno.json supabase/functions/*/index.ts` con Deno 2.9.6.
- `pnpm db:types` genera tipos desde las migraciones locales. Tras aplicar el esquema, contrasta con `supabase gen types typescript --linked`.

## Documentación

- [Arquitectura y decisiones](docs/architecture.md)
- [Modelo, RPC y almacenamiento](docs/database.md)
- [Seguridad y límites](docs/security.md)
- [Despliegue y configuración](docs/deployment.md)
- [Etapas y aceptación](docs/acceptance.md)

## Errores habituales

| Error                           | Acción                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------- |
| No se puede verificar el perfil | Aplicar migraciones y provisionar un rol. Una cuenta Auth sola no tiene acceso. |
| `PGRST205`                      | Verificar tabla, esquema expuesto y migraciones.                                |
| Responsable incompatible        | Elegir el área/categoría y un miembro autorizado.                               |
| El reporte cambió               | Recargar detalle y repetir con la versión nueva.                                |
| No llega el correo              | Revisar SMTP, confirmaciones, redirects, rate limits y spam.                    |
| Edge Function falla             | Verificar secretos y logs; nunca imprimir CURP, contraseña o tokens.            |
| GPS rechazado                   | Seleccionar y confirmar el punto en el mapa.                                    |
| Push no disponible              | Configurar EAS project ID, credenciales nativas, dispatcher y permisos.         |
