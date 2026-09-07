# Arquitectura

```text
apps/web                 React 19.2.3, Vite 8.2.2, Tailwind 4.3.3, PWA, Leaflet
apps/mobile              Expo 57.0.20, React Native 0.86.3, Expo Router, Hermes
packages/types           Tipos generados, enums y contratos de dominio
packages/validation      Zod, nombres, edad, CURP y coordenadas
packages/shared          Servicios Supabase, errores y presentación de fechas
packages/config          TypeScript estricto
supabase/migrations      Esquema, permisos, RPC, índices y outbox
supabase/functions       Registro, personal, fotos, estados, asignación, push
scripts                  Generación de tipos y pruebas SQL
tests                    Playwright y flujos Maestro
docs                     Operación y decisiones
```

Solo existen dos aplicaciones. No hay API Node adicional; Node se usa en desarrollo y pruebas. La PWA utiliza alojamiento estático SPA y la app móvil usa EAS o compilación nativa. Se conserva la arquitectura solicitada sin sustituir Supabase Auth ni introducir otro servicio de persistencia.

## Flujo del reporte

1. Auth identifica al ciudadano; el rol se resuelve desde tablas protegidas.
2. El ciudadano selecciona categoría, descripción, fotos y confirma un punto GPS/manual.
3. `upload-media` valida identidad, límite de tamaño y firma de imagen, y guarda un objeto privado temporal.
4. `create_report` bloquea la clave de idempotencia, comprueba propiedad de las fotos y crea reporte, medios, historial y notificación en una transacción.
5. El administrador revisa y asigna personal compatible. Cada cambio utiliza la versión esperada.
6. El responsable inicia atención, aporta evidencia y resuelve. La función SQL valida transición, asignación, área y nota/evidencia obligatorias.

## Decisiones documentadas

- El runtime disponible es Node 24.19.0; el requisito 24.20.x se mantiene como objetivo de despliegue. TypeScript 5.9.3 satisface el requisito 5+ y evita una migración innecesaria al compilador 7.
- Expo se instaló consultando `bundledNativeModules.json` y `expo install`. React 19.2.3 coincide con la matriz del SDK. Se fijaron los paquetes y se resolvieron los requisitos de peers.
- Las fotos iniciales se suben a `uploads/{uid}/{uuid}.jpg` antes de crear el reporte. Esto permite exigir una foto real dentro de la transacción. Las fotos de resolución usan `reports/{reportId}/{uid}/{uuid}.jpg`. Los identificadores son aleatorios y no contienen CURP, nombre o correo.
- El folio usa una secuencia global y ocho dígitos como mínimo. La fecha se toma del servidor en `America/Mexico_City`; los timestamps permanecen en UTC.
- Las asignaciones completadas conservan la asociación activa para que el responsable pueda consultar su trabajo concluido. Las reasignaciones cierran el registro anterior. La carga de trabajo excluye solucionados.
- Las operaciones privilegiadas viven en funciones `private` con identidad, rol y `search_path` explícitos. Wrappers invoker en `public` exponen únicamente la API autorizada. Las funciones de aprovisionamiento y push solo admiten `service_role`.
- `report_list` es una vista invoker: permite filtrar responsable en servidor y paginar sin descargar todos los IDs de asignación.
- Los tipos se generan por introspección de la migración ejecutada en PostgreSQL local. Tras desplegar deben compararse con la generación oficial de Supabase.
- PGlite/PostGIS es una comprobación SQL suplementaria de desarrollo; no sustituye al stack Supabase ni se incluye en los clientes.

## Referencias verificadas

- [Matriz Expo SDK](https://docs.expo.dev/versions/latest/)
- [RLS y grants](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Seguridad de Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Storage y control de acceso](https://supabase.com/docs/guides/storage/security/access-control)
- [Changelog de Supabase](https://supabase.com/changelog)
- [CURP: Secretaría de Gobernación](https://www.gob.mx/segob/acciones-y-programas/clave-unica-de-registro-de-poblacion-curp)

La validación algorítmica no certifica identidad oficial. Nombres y excepciones no resueltos por el algoritmo requieren revisión autorizada; no se consulta RENAPO ni se simula una respuesta oficial.
