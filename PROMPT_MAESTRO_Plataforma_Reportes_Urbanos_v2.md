# PROMPT MAESTRO — Plataforma de Reportes Ciudadanos de Incidencias Urbanas

> **Objetivo de este archivo:** usar este documento como prompt técnico principal para construir el sistema completo.  
> **Proyecto:** Plataforma de reportes ciudadanos de incidencias urbanas para Tuxtla Gutiérrez, Chiapas.  
> **Fecha de referencia tecnológica:** 06 de septiembre de 2026.  
> **Regla principal:** usar versiones estables y compatibles entre sí; no utilizar versiones `alpha`, `beta`, `rc`, `canary` ni paquetes abandonados.

---

# 1. Rol que debe asumir el agente de desarrollo

Actúa como **arquitecto de software senior, desarrollador full-stack, especialista en React/React Native, PostgreSQL/PostGIS, Supabase, seguridad, PWA, diseño de bases de datos, UX móvil y pruebas**.

Debes construir una solución de nivel producción formada por **dos aplicaciones cliente** que compartan el mismo backend en Supabase:

1. **Sistema Web PWA** para administración y gestión de reportes.
2. **Aplicación móvil React Native para Android e iOS** con navegación y permisos diferentes según el rol autenticado.

No entregues únicamente ejemplos, pseudocódigo, componentes aislados o pantallas simuladas. La implementación debe quedar preparada para ejecutarse de extremo a extremo, conectada a Supabase y con una estructura mantenible.

Cuando exista una ambigüedad menor, toma una decisión técnica razonable, documéntala y continúa. No reemplaces funciones reales por datos mock después de integrar Supabase.

---

# 2. Contexto funcional del proyecto

La plataforma debe permitir que habitantes de **Tuxtla Gutiérrez, Chiapas** registren incidencias urbanas como:

- Baches.
- Fallas de alumbrado público.
- Acumulación de basura.
- Otras incidencias urbanas configurables por el administrador.

Cada reporte ciudadano debe poder contener:

- Identificador único.
- Folio legible para el usuario.
- Categoría.
- Descripción.
- Evidencia fotográfica.
- Geolocalización.
- Fecha y hora de creación.
- Estado actual.
- Historial de cambios.
- Asignación a la persona responsable de atenderlo.
- Evidencia de atención/resolución.
- Tiempos de atención.

El sistema debe centralizar la información, facilitar la clasificación y priorización, permitir ubicar las incidencias en un mapa, permitir la asignación de trabajos y mantener trazabilidad completa de cada reporte.

---

# 3. Arquitectura general obligatoria

Construir un **monorepo TypeScript** con una organización similar a:

```text
urban-reports/
├─ apps/
│  ├─ web/
│  └─ mobile/
├─ packages/
│  ├─ shared/
│  ├─ validation/
│  ├─ types/
│  └─ config/
├─ supabase/
│  ├─ migrations/
│  ├─ seed.sql
│  ├─ functions/
│  │  ├─ register-citizen/
│  │  ├─ validate-curp/
│  │  ├─ assign-report/
│  │  ├─ change-report-status/
│  │  └─ notify-status-change/
│  └─ config.toml
├─ docs/
│  ├─ architecture.md
│  ├─ database.md
│  ├─ security.md
│  └─ deployment.md
├─ .env.example
├─ package.json
├─ pnpm-workspace.yaml
└─ README.md
```

Usar `pnpm` como gestor del workspace.

No duplicar tipos, enumeraciones ni esquemas de validación entre web y móvil. Todo lo reutilizable debe vivir en `packages/shared`, `packages/types` o `packages/validation`.

---

# 4. Stack tecnológico requerido

## 4.1 Base de ejecución

- **Node.js 24.20.x LTS** para herramientas de desarrollo, builds y scripts.
- **TypeScript 5+** en modo estricto.
- `pnpm` estable.
- ESLint y Prettier.
- Variables de entorno tipadas y validadas al arrancar.

## 4.2 Aplicación web PWA

Usar:

- **React 19.2.x**.
- **Vite 8.x**.
- **Tailwind CSS 4.3.x**.
- TypeScript.
- React Router estable.
- TanStack Query estable para estado remoto/cache.
- React Hook Form estable.
- Zod estable para validaciones.
- `@supabase/supabase-js` **2.115.x o una versión estable posterior compatible de la rama 2.x**.
- `vite-plugin-pwa` estable y compatible con Vite 8.
- **Leaflet 1.9.4 estable** para mapas.
- No utilizar una versión alpha de Leaflet.
- Para integrar Leaflet con React, preferir integración directa encapsulada en componentes React si el adaptador disponible obliga a usar dependencias prerelease.
- Vitest + React Testing Library para pruebas unitarias/integración.
- Playwright para E2E.

## 4.3 Aplicación móvil

Usar una combinación estable y oficialmente compatible:

- **Expo SDK 57**.
- **React Native 0.86** dentro del ecosistema estable de Expo SDK 57.
- **React 19.2.x** compatible con el SDK.
- TypeScript.
- Expo Router.
- Hermes.
- `@supabase/supabase-js` rama 2.x estable.
- `expo-location`.
- `expo-camera` y/o `expo-image-picker`.
- `expo-notifications`.
- `expo-secure-store` para almacenamiento seguro de sesión/token cuando corresponda.
- `react-native-maps` mediante la versión recomendada por `expo install`.
- React Hook Form + Zod cuando la compatibilidad lo permita.
- React Native Testing Library.
- Pruebas E2E con Maestro cuando sea viable.

La aplicación debe compilar para:

- **Android**.
- **iOS**.

No utilizar bibliotecas web como Leaflet dentro de la app nativa.

## 4.4 Backend administrado

Usar **Supabase** como backend principal:

- Supabase Auth.
- PostgreSQL.
- PostGIS.
- Supabase Storage.
- Supabase Realtime.
- Supabase Edge Functions.
- Row Level Security (RLS).
- Migraciones SQL versionadas.
- Supabase CLI para desarrollo local.

Las operaciones privilegiadas nunca deben depender solamente de validaciones del cliente.

---

# 5. Restricción de arquitectura

La solución visible al usuario debe tener exactamente **dos aplicaciones**:

1. `apps/web`: PWA.
2. `apps/mobile`: Android/iOS.

Supabase actúa como backend administrado.

No crear un tercer frontend.

No crear un backend Node.js separado salvo que exista una necesidad técnica demostrable. Las operaciones que requieren secreto, privilegios elevados o integración con servicios externos deben implementarse mediante **Supabase Edge Functions**.

Node.js se utiliza como runtime de desarrollo/build y puede utilizarse para scripts internos, pero no se debe introducir un API server adicional sin necesidad.

---

# 6. Roles del sistema

Deben existir exactamente estos tres roles de negocio:

```ts
type AppRole = 'citizen' | 'admin' | 'maintenance'
```

Nombres visibles:

- `citizen` → **Ciudadano**
- `admin` → **Administrador**
- `maintenance` → **Mantenimiento**

El rol `maintenance` representa al personal operativo que atiende físicamente las incidencias. Además del rol, cada usuario de mantenimiento debe estar asociado a una o más **áreas de mantenimiento** autorizadas.

Áreas iniciales obligatorias:

```ts
type MaintenanceAreaSlug =
  | 'pothole_repair'
  | 'public_lighting'
  | 'waste_management'
```

Nombres visibles:

- `pothole_repair` → **Bacheo**
- `public_lighting` → **Alumbrado público**
- `waste_management` → **Basura**

Un usuario de mantenimiento debe tener al menos un área activa antes de recibir reportes. Por defecto se recomienda una sola área principal por persona; el modelo puede permitir varias áreas únicamente cuando el administrador lo configure explícitamente.

El rol nunca debe confiarse a un valor enviado por el frontend.

El rol y las áreas autorizadas deben mantenerse en tablas controladas por backend o en claims administrados de forma segura.

Un usuario nunca puede autoconvertirse en administrador ni en personal de mantenimiento, ni modificar por sí mismo sus áreas.

---

# 7. Matriz de acceso por aplicación

| Función | Ciudadano | Administrador | Mantenimiento |
|---|---:|---:|---:|
| Iniciar sesión en móvil | Sí | Sí | Sí |
| Iniciar sesión en PWA web | No | Sí | Sí |
| Crear reporte ciudadano | Sí | No por flujo normal | No |
| Ver información de su reporte | Solo la necesaria para seguimiento | Todos | Solo asignados |
| Ver todos los reportes | No | Sí | No |
| Asignar reporte | No | Sí | No |
| Reasignar reporte | No | Sí | No |
| Filtrar personal por área de mantenimiento | No | Sí | No |
| Cambiar prioridad | No | Sí | No |
| Comenzar atención | No | Sí/soporte | Sí, si está asignado |
| Marcar solucionado | No | Sí/soporte | Sí, si está asignado |
| Subir evidencia de atención | No | Sí/soporte | Sí |
| Gestionar categorías | No | Sí | No |
| Gestionar áreas de mantenimiento | No | Sí | No |
| Gestionar usuarios de personal | No | Sí | No |
| Ver analítica global | No | Sí | No |

La aplicación web debe bloquear inmediatamente el acceso si el usuario autenticado tiene rol `citizen`.

La aplicación móvil debe permitir los tres roles y montar una navegación distinta según `citizen`, `admin` o `maintenance`.

---

# 8. Flujos de la aplicación móvil

La app móvil debe presentar **tres experiencias claramente separadas por rol**.

## 8.1 Vista/flujo Ciudadano

El ciudadano entra únicamente al flujo de creación de reporte.

No debe visualizar módulos administrativos, asignaciones, usuarios, métricas globales ni reportes de otras personas.

Pantallas mínimas:

1. Splash/loading de sesión.
2. Login.
3. Registro de ciudadano.
4. Crear reporte.
5. Confirmación de reporte creado con folio/ID.
6. Consulta puntual del estado del reporte recién creado o mediante su folio, sin convertir la app en un panel administrativo.

La navegación principal del ciudadano debe mantener el enfoque en **Reportar incidencia**.

## 8.2 Vista/flujo Administrador móvil

El administrador también debe poder iniciar sesión en la aplicación móvil.

La experiencia móvil de administrador será principalmente operativa y debe incluir:

1. Login.
2. Resumen de reportes por estado.
3. Lista de todos los reportes.
4. Filtros por categoría, área de mantenimiento, estado, prioridad y fecha.
5. Detalle del reporte.
6. Fotografías y ubicación.
7. Consulta del personal de mantenimiento disponible.
8. Asignación y reasignación de reportes.
9. Cambio de prioridad.
10. Ejecución de transiciones administrativas de estado válidas.
11. Consulta del historial del reporte.
12. Consulta de la carga de trabajo del personal por área.

La PWA continúa siendo el panel administrativo principal para tareas más amplias como gestión de usuarios, categorías, áreas, métricas avanzadas y configuración.

## 8.3 Vista/flujo Mantenimiento

El personal de mantenimiento debe disponer de:

1. Login.
2. Identificación visible de su área o áreas autorizadas: Bacheo, Alumbrado público y/o Basura.
3. Lista de reportes que le fueron asignados.
4. Filtros por estado/prioridad.
5. Detalle del reporte.
6. Mapa y navegación hacia la ubicación.
7. Fotografías originales.
8. Botón para iniciar atención.
9. Campo para observaciones.
10. Captura de evidencia antes/después, si aplica.
11. Botón para marcar como solucionado.
12. Historial cronológico del reporte.

Nunca debe ver reportes asignados a otra persona, salvo autorización adicional explícita del administrador.

El sistema debe impedir que un usuario de mantenimiento reciba un reporte correspondiente a un área para la que no está autorizado, salvo que el administrador primero actualice formalmente sus áreas.

---

# 9. Aplicación web PWA

La PWA debe ser responsive, instalable y utilizable en escritorio, tablet y móvil.

Debe incluir:

## 9.1 Login administrativo

Campos:

- Correo electrónico.
- Contraseña.

Después del login:

- `admin` → dashboard completo.
- `maintenance` → panel limitado a sus reportes asignados.
- `citizen` → cerrar/bloquear acceso web y mostrar mensaje de que su acceso corresponde a la aplicación móvil.

## 9.2 Dashboard administrador

Mostrar:

- Total de reportes.
- Reportes recibidos.
- Reportes en revisión.
- Reportes en atención.
- Reportes solucionados.
- Reportes sin asignar.
- Reportes por categoría.
- Reportes por colonia/zona cuando exista información suficiente.
- Tiempo promedio de atención.
- Tiempo promedio hasta primera asignación.
- Reportes creados en las últimas 24 h / 7 días / 30 días.
- Mapa de incidencias.
- Tabla de reportes recientes.

## 9.3 Lista de reportes

Tabla con:

- Folio.
- Fecha.
- Categoría.
- Ciudadano.
- Colonia/zona.
- Estado.
- Prioridad.
- Responsable.
- Tiempo transcurrido.
- Acción para abrir detalle.

Filtros:

- Folio.
- Texto.
- Categoría.
- Estado.
- Prioridad.
- Responsable.
- Fecha inicial/final.
- Reportes sin asignar.
- Zona/colonia.

Soportar paginación real desde base de datos.

## 9.4 Detalle del reporte

Mostrar:

- Folio.
- UUID interno solo donde sea útil.
- Datos básicos del ciudadano, minimizando datos personales.
- Categoría.
- Descripción.
- Fotografías.
- Mapa con marcador.
- Coordenadas.
- Dirección aproximada si fue resuelta.
- Fecha/hora de creación.
- Estado.
- Prioridad.
- Persona asignada.
- Historial.
- Evidencia de resolución.
- Tiempos de atención.

Acciones de administrador:

- Cambiar prioridad.
- Asignar.
- Reasignar.
- Ver historial de asignaciones.
- Corregir categoría.
- Cambiar estado únicamente mediante transiciones válidas.
- Reabrir un caso solucionado si se implementa esta función.
- Añadir nota administrativa.

## 9.5 Módulo de asignación a Mantenimiento

El administrador debe poder:

1. Seleccionar un reporte.
2. Identificar el área de mantenimiento relacionada con su categoría.
3. Consultar únicamente personal activo con rol `maintenance` que esté autorizado para esa área.
4. Ver la carga de trabajo aproximada de cada responsable.
5. Asignar.
6. Reasignar.
7. Registrar quién realizó la asignación.
8. Registrar fecha/hora.
9. Notificar al responsable.

Reglas de enrutamiento inicial:

- Categoría **Bache** → área **Bacheo**.
- Categoría **Alumbrado público** → área **Alumbrado público**.
- Categoría **Basura** → área **Basura**.
- Categoría **Otra incidencia** → no debe asignarse automáticamente; el administrador debe clasificarla o seleccionar primero un área válida.

Ninguna asignación debe sobreescribir el historial anterior.

## 9.6 Usuarios

Solo administrador.

Permitir:

- Crear usuario de personal.
- Asignar rol `admin` o `maintenance`.
- Cuando el rol sea `maintenance`, asignar una o más áreas autorizadas.
- Activar/desactivar personal.
- No mostrar contraseña actual.
- Restablecimiento de acceso mediante mecanismos de Supabase Auth.
- Nunca permitir que un ciudadano se asigne un rol privilegiado desde el cliente.

## 9.7 Categorías

Tabla configurable:

- `id`.
- `name`.
- `slug`.
- `description`.
- `icon`.
- `default_priority`.
- `maintenance_area_id` nullable.
- `is_active`.
- `created_at`.
- `updated_at`.

Semillas iniciales:

- Bache.
- Alumbrado público.
- Basura.
- Otra incidencia.

## 9.8 Áreas de mantenimiento

El administrador debe poder gestionar y consultar las áreas responsables de atender los reportes.

Áreas mínimas obligatorias:

| Área visible | Slug interno | Categoría inicial |
|---|---|---|
| Bacheo | `pothole_repair` | Bache |
| Alumbrado público | `public_lighting` | Alumbrado público |
| Basura | `waste_management` | Basura |

Reglas:

- Cada categoría puede apuntar a una `maintenance_area_id`.
- Cada usuario con rol `maintenance` debe estar relacionado con una o más áreas autorizadas.
- Al asignar un reporte, el selector de personal debe filtrarse por el área correspondiente.
- Un usuario fuera del área no debe aparecer como opción válida.
- El backend debe volver a validar esta compatibilidad aunque el frontend haya filtrado correctamente.
- La categoría `Otra incidencia` puede dejar `maintenance_area_id = NULL` hasta que el administrador la clasifique.
- El administrador puede cambiar el área de una categoría de forma controlada, conservando auditoría.
- La carga de trabajo debe poder consultarse por usuario y por área.

---

# 10. Registro y autenticación del ciudadano

## 10.1 Separar autenticación de perfil

El login debe utilizar credenciales reales, por ejemplo:

- Correo electrónico.
- Contraseña.

El registro del ciudadano debe solicitar además sus datos personales.

No usar únicamente nombre/edad/CURP como mecanismo de autenticación.

## 10.2 Datos obligatorios de registro

Solicitar:

### Nombre completo

Para validar correctamente contra CURP, la interfaz debe capturar internamente:

- Nombre(s).
- Apellido paterno.
- Apellido materno.

Puede mostrarse visualmente bajo el encabezado **Nombre completo**.

Reglas:

- Obligatorio.
- Permitir letras Unicode, incluyendo `ÁÉÍÓÚÜÑ` y minúsculas equivalentes.
- Permitir espacios.
- No permitir números.
- Normalizar espacios duplicados.
- Eliminar espacios al inicio/final.
- No convertir destructivamente el nombre almacenado a mayúsculas; conservar una forma de presentación y crear una versión normalizada para comparación.

### Edad

El requisito del proyecto solicita edad y el ciudadano debe ser **mayor de 16 años**.

Reglas:

- Edad mínima válida: **17 años**.
- No aceptar edades negativas.
- Máximo razonable: 120.
- La validación definitiva debe realizarse también en servidor.

Para evitar que el dato se vuelva obsoleto:

- Mostrar/capturar `edad` si así lo requiere la interfaz.
- Derivar y almacenar preferentemente `birth_date`.
- Calcular la edad al consultar.
- Comparar la edad introducida con la fecha codificada en la CURP.

### Sexo

Usar un valor controlado compatible con la información que contiene la CURP.

Como mínimo:

```ts
type Sex = 'H' | 'M'
```

Si la aplicación ofrece etiquetas completas:

- H → Hombre.
- M → Mujer.

No inferir ni modificar este campo silenciosamente; validar consistencia con la CURP.

### CURP

- Obligatoria.
- Convertir a mayúsculas antes de validar.
- Eliminar espacios.
- Longitud exacta: 18 caracteres.
- No aceptar caracteres no permitidos.
- Validar formato.
- Validar fecha codificada.
- Validar código de sexo.
- Validar código de entidad federativa.
- Validar consonantes internas.
- Validar carácter diferenciador/homoclave según reglas aplicables.
- Validar dígito verificador.
- Validar coherencia con nombre.
- Validar coherencia con edad/fecha de nacimiento.
- Validar coherencia con sexo seleccionado.
- Validar duplicidad en la base de datos.

---

# 11. Validación técnica de CURP

Implementar la validación en **dos capas obligatorias** y una tercera capa opcional/oficial.

## 11.1 Capa cliente

Objetivo: dar feedback rápido.

Debe comprobar:

- 18 caracteres.
- Patrón alfanumérico esperado.
- Fecha válida.
- Sexo.
- Entidad.
- Dígito verificador.
- Coherencia preliminar con los campos del formulario.

Nunca considerar la validación del cliente como suficiente.

## 11.2 Capa servidor

Crear Supabase Edge Function:

```text
validate-curp
```

La función debe:

1. Normalizar los datos.
2. Volver a ejecutar todas las validaciones.
3. Calcular la fecha de nacimiento.
4. Calcular edad actual.
5. Rechazar si edad <= 16.
6. Comparar sexo.
7. Comparar componentes de nombre/apellidos que sean verificables algorítmicamente.
8. Validar dígito verificador.
9. Consultar duplicidad sin exponer CURPs existentes.
10. Devolver un resultado estructurado.

Ejemplo conceptual:

```json
{
  "valid": true,
  "verificationLevel": "structural",
  "checks": {
    "format": true,
    "birthDate": true,
    "age": true,
    "sex": true,
    "nameComponents": true,
    "checkDigit": true,
    "notDuplicated": true
  }
}
```

## 11.3 Verificación de CURP "verdadera"

No afirmar que una CURP es oficialmente auténtica únicamente porque pasa el algoritmo local.

Distinguir:

- `invalid`: no cumple reglas.
- `structural_valid`: cumple reglas y coincide con los datos capturados.
- `officially_verified`: validada contra un servicio gubernamental autorizado.

Para declarar `officially_verified` se requiere una integración oficial/autorizada con la autoridad correspondiente y credenciales válidas.

Si no existe acceso autorizado a ese servicio:

- No simular la consulta.
- No hacer scraping.
- No mostrar "CURP verificada oficialmente".
- Mostrar "CURP validada estructuralmente".
- Mantener la integración oficial detrás de una interfaz/servicio reemplazable.

---

# 12. Protección de la CURP y datos personales

La CURP es información personal y debe protegerse.

Requisitos:

- No incluir la CURP en URLs.
- No incluirla en logs.
- No incluirla en nombres de archivos.
- No exponerla en Realtime.
- No mostrarla completa al personal que no la necesite.
- En UI administrativa, enmascarar por defecto, por ejemplo: `GOCX******HCSR**`.
- Mantener una versión normalizada solo donde sea indispensable.
- Para búsquedas de duplicidad, preferir un hash determinista realizado en servidor.
- Si es necesario almacenar la CURP completa, hacerlo cifrada o en una zona con acceso estrictamente limitado.
- Documentar finalidad y retención del dato.
- Solicitar consentimiento/aviso de privacidad antes del registro.
- Nunca usar `service_role` en web o móvil.

---

# 13. Modelo de datos

Usar UUID como identificador primario interno.

## 13.1 Enumeraciones

```sql
app_role:
- citizen
- admin
- maintenance

report_status:
- recibido
- en_revision
- en_atencion
- solucionado

report_priority:
- baja
- media
- alta
- urgente

assignment_status:
- asignado
- aceptado
- en_proceso
- completado
- reasignado
- cancelado

location_source:
- gps
- manual_map

media_type:
- initial
- before_service
- after_service
- resolution
```

## 13.2 `profiles`

Campos:

```text
id uuid PK -> auth.users.id
display_name text not null
is_active boolean not null default true
created_at timestamptz
updated_at timestamptz
```

No guardar aquí un rol editable directamente por el usuario.

## 13.3 `user_roles`

```text
user_id uuid PK/FK -> profiles.id
role app_role not null
created_at timestamptz
created_by uuid nullable
```

Cambios de rol solo por una operación privilegiada.

## 13.4 `maintenance_areas`

Catálogo de áreas operativas:

```text
id uuid PK
name text not null
slug text unique not null
description text nullable
is_active boolean not null default true
created_at timestamptz
updated_at timestamptz
```

Semillas obligatorias:

```text
Bacheo              -> pothole_repair
Alumbrado público   -> public_lighting
Basura               -> waste_management
```

## 13.5 `maintenance_user_areas`

Relación entre usuarios de mantenimiento y áreas autorizadas:

```text
user_id uuid FK -> profiles.id
maintenance_area_id uuid FK -> maintenance_areas.id
is_primary boolean not null default false
created_at timestamptz
created_by uuid
PRIMARY KEY (user_id, maintenance_area_id)
```

Reglas:

- `user_id` debe pertenecer a un usuario con rol `maintenance`.
- Debe existir como máximo un área primaria por usuario.
- Un usuario de mantenimiento debe tener al menos un área activa para poder recibir nuevas asignaciones.

## 13.6 `citizen_profiles`

```text
user_id uuid PK/FK
first_names text not null
paternal_surname text not null
maternal_surname text nullable
full_name text not null
normalized_name text not null
birth_date date not null
sex char(1) not null
curp_hash text unique not null
curp_encrypted text nullable
curp_last4 text not null
curp_verification_status text not null
curp_verified_at timestamptz nullable
privacy_notice_accepted_at timestamptz not null
created_at timestamptz
updated_at timestamptz
```

No guardar `edad` como fuente principal; calcularla desde `birth_date`.

## 13.7 `incident_categories`

Campos definidos en la sección de categorías.

## 13.8 `reports`

```text
id uuid PK default gen_random_uuid()
folio text UNIQUE NOT NULL
citizen_id uuid FK -> profiles.id
category_id uuid FK -> incident_categories.id
description text not null
status report_status not null default 'recibido'
priority report_priority not null default 'media'
location geography(Point,4326) not null
location_source location_source not null
location_accuracy_m numeric nullable
address_text text nullable
neighborhood text nullable
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
first_reviewed_at timestamptz nullable
first_assigned_at timestamptz nullable
attention_started_at timestamptz nullable
resolved_at timestamptz nullable
```

Restricciones:

- Descripción mínima 20 caracteres.
- Descripción máxima definida, por ejemplo 2000.
- Coordenadas válidas.
- La fecha/hora de creación se genera automáticamente en PostgreSQL con `created_at DEFAULT now()`; no debe recibirse desde el dispositivo como fuente de verdad.
- La ubicación debe existir, pero el ciudadano decide si autoriza la captura automática por GPS.
- Si autoriza GPS, guardar `location_source = 'gps'`.
- Si no autoriza GPS o la captura falla, debe indicar manualmente la ubicación moviendo/colocando un marcador en el mapa; guardar `location_source = 'manual_map'`.
- No permitir enviar un reporte sin una ubicación GPS o manual confirmada.
- `resolved_at` solo si estado solucionado.
- Mantener timestamps consistentes.

Índices:

- Estado.
- Categoría.
- Prioridad.
- Fecha.
- Ciudadano.
- Índice espacial GIST sobre `location`.

## 13.9 `report_media`

```text
id uuid PK
report_id uuid FK
uploaded_by uuid FK
media_type media_type
storage_bucket text
storage_path text
mime_type text
size_bytes bigint
width int nullable
height int nullable
created_at timestamptz
```

## 13.10 `report_assignments`

```text
id uuid PK
report_id uuid FK
maintenance_user_id uuid FK -> profiles.id
maintenance_area_id uuid FK -> maintenance_areas.id
assigned_by uuid FK
status assignment_status
assignment_note text nullable
assigned_at timestamptz
accepted_at timestamptz nullable
started_at timestamptz nullable
completed_at timestamptz nullable
ended_at timestamptz nullable
```

Reglas:

- `maintenance_user_id` debe tener rol `maintenance`.
- El usuario debe estar autorizado en `maintenance_area_id`.
- El área debe ser compatible con la categoría del reporte.
- La asignación debe conservar quién la realizó.
- La fecha/hora `assigned_at` debe generarse en servidor.
- Debe permitir conservar historial de reasignaciones.

Un reporte puede tener múltiples registros históricos de asignación, pero solo una asignación activa.

## 13.11 `report_status_history`

Tabla append-only:

```text
id uuid PK
report_id uuid FK
from_status report_status nullable
to_status report_status not null
changed_by uuid FK
note text nullable
created_at timestamptz
```

No permitir editar o borrar historial desde clientes.

## 13.12 `report_notes`

```text
id uuid PK
report_id uuid FK
author_id uuid FK
note text not null
visibility text not null
created_at timestamptz
```

Valores de `visibility`:

- `internal`
- `citizen_visible`

## 13.13 `audit_log`

Registrar operaciones sensibles:

- Cambio de rol.
- Alta/baja de personal.
- Asignación.
- Reasignación.
- Cambio de estado.
- Cambio de prioridad.
- Acceso privilegiado a datos personales si se implementa.

Campos:

```text
id bigint/uuid
actor_user_id uuid
action text
entity_type text
entity_id uuid/text
metadata jsonb
created_at timestamptz
```

No almacenar secretos ni CURP completa en `metadata`.

---

# 14. ID y folio obligatorio por cada reporte

Cada reporte debe tener **dos identificadores**:

## 14.1 UUID interno

Ejemplo:

```text
d9428888-122b-11e1-b85c-61cd3cbb3210
```

Usado para relaciones internas.

## 14.2 Folio público

Formato recomendado:

```text
TGZ-INC-AAAAMMDD-000001
```

Ejemplo:

```text
TGZ-INC-20260906-000123
```

Reglas:

- Único.
- Inmutable.
- Generado en base de datos/servidor, nunca en el cliente.
- Seguro frente a concurrencia.
- Usar secuencia PostgreSQL o función transaccional.
- No reutilizar folios eliminados.
- Mostrarlo al ciudadano inmediatamente después de crear el reporte.
- Permitir búsqueda administrativa por folio.

---

# 15. Flujo completo de un reporte

## 15.1 Creación

1. Ciudadano inicia sesión.
2. Sistema valida que rol = `citizen`.
3. Ciudadano elige categoría.
4. Escribe descripción.
5. Toma o selecciona fotografías.
6. El sistema prepara automáticamente la fecha/hora; la fuente de verdad será `created_at = now()` en PostgreSQL y el ciudadano no podrá editarla.
7. Solicitar permiso para obtener la ubicación actual del dispositivo.
8. Si el ciudadano acepta, capturar automáticamente latitud/longitud y precisión.
9. Mostrar la ubicación capturada en un mapa para confirmación y permitir ajustar el marcador si detecta un error.
10. Si el ciudadano rechaza el permiso, la ubicación automática deja de ser obligatoria, pero debe indicar manualmente dónde está la incidencia colocando un marcador en el mapa.
11. No permitir enviar el reporte sin una ubicación confirmada, ya sea automática o manual.
12. Opcionalmente resolver y mostrar una dirección aproximada.
13. Validar formulario.
14. Comprimir imágenes antes de subir cuando sea apropiado.
15. Crear reporte de forma transaccional.
16. Generar folio en servidor.
17. PostgreSQL genera automáticamente `created_at`.
18. Guardar `location_source = 'gps'` o `location_source = 'manual_map'`.
19. Subir medios al bucket privado.
20. Crear registros `report_media`.
21. Crear historial inicial `recibido`.
22. Mostrar confirmación con folio, fecha/hora y ubicación.

## 15.2 Revisión administrativa

1. Admin ve nuevo reporte en tiempo real o al refrescar.
2. Abre detalle.
3. Revisa evidencia y ubicación.
4. Ajusta categoría/prioridad si corresponde.
5. Cambia a `en_revision`.
6. Asigna a un responsable.

## 15.3 Atención

1. Responsable recibe asignación.
2. Abre el reporte desde la app móvil.
3. Ve ubicación, descripción y evidencia.
4. Registra inicio.
5. Estado pasa a `en_atencion`.
6. Puede añadir observación y evidencia.
7. Al concluir, sube evidencia final.
8. Marca `solucionado`.
9. Se registra `resolved_at`.
10. El ciudadano puede consultar el nuevo estado.
11. Se genera notificación si está habilitada.

---

# 16. Máquina de estados

Transiciones base permitidas:

```text
recibido -> en_revision
en_revision -> en_atencion
en_atencion -> solucionado
```

No permitir:

```text
recibido -> solucionado
solucionado -> en_atencion
```

salvo una función explícita de reapertura controlada por administrador.

Las transiciones deben validarse en servidor.

Nunca permitir que el frontend envíe arbitrariamente cualquier estado.

Crear una función/RPC o Edge Function `change-report-status` que:

- Verifique usuario.
- Obtenga rol.
- Obtenga asignación actual.
- Verifique transición.
- Actualice el reporte.
- Inserte historial.
- Actualice timestamps.
- Genere auditoría.
- Dispare notificación.

Todo en una operación consistente.

---

# 17. Geolocalización, ubicación manual y PostGIS

Habilitar PostGIS en Supabase.

La **captura automática por GPS es opcional para el ciudadano**. El sistema debe solicitar permiso; si el ciudadano lo concede, debe obtener la ubicación automáticamente. Si no lo concede, no se debe bloquear el uso de la aplicación, pero antes de enviar el reporte el ciudadano debe indicar manualmente la ubicación de la incidencia mediante el mapa.

Por lo tanto:

- GPS automático: opcional.
- Ubicación de la incidencia en el reporte: obligatoria.
- Fuente: `gps` o `manual_map`.
- Fecha/hora: siempre automática desde servidor.

Guardar ubicación con:

```text
geography(Point, 4326)
```

Construir el punto siempre como:

```text
POINT(longitud latitud)
```

No invertir latitud y longitud.

Crear índice espacial GIST.

Funciones/RPC necesarias:

- Reportes dentro de un radio.
- Reportes dentro del viewport/bounding box del mapa.
- Conteo por zona.
- Distancia entre responsable y reporte si posteriormente se requiere.
- Agrupación geográfica para analítica.

Validar rangos:

```text
latitud:  -90  a  90
longitud: -180 a 180
```

Para este proyecto, mostrar mapas centrados inicialmente en Tuxtla Gutiérrez, pero nunca forzar coordenadas falsas.

---

# 18. Fotografías y Supabase Storage

Crear bucket privado:

```text
report-media
```

No usar bucket público.

Estructura:

```text
reports/{reportId}/initial/{uuid}.jpg
reports/{reportId}/before/{uuid}.jpg
reports/{reportId}/after/{uuid}.jpg
reports/{reportId}/resolution/{uuid}.jpg
```

Reglas:

- JPG/PNG/WebP según compatibilidad.
- Rechazar ejecutables.
- Definir límite, por ejemplo 8 MB por archivo antes de compresión.
- Máximo sugerido ciudadano: 5 imágenes.
- Máximo sugerido evidencia de atención: 10 imágenes.
- Generar nombre aleatorio/UUID.
- Nunca usar nombre, CURP o correo en path.
- Usar signed URLs de corta duración para visualizar archivos privados.
- Aplicar RLS a `storage.objects`.
- El ciudadano solo puede subir archivos al reporte que está creando/le pertenece.
- El responsable solo puede leer/subir evidencia de reportes asignados.
- Admin puede acceder a medios según política administrativa.
- Eliminar metadatos EXIF innecesarios cuando sea viable para reducir exposición de información personal.

---

# 19. RLS obligatoria

Activar Row Level Security en **todas las tablas expuestas**.

Nunca dejar una tabla operativa del esquema público sin políticas.

## 19.1 Ciudadano

Puede:

- Leer su propio perfil.
- Actualizar únicamente campos permitidos de su perfil.
- Crear reportes cuyo `citizen_id = auth.uid()`.
- Leer únicamente sus propios reportes cuando la función de seguimiento lo requiera.
- Crear medios asociados únicamente a sus reportes.
- Leer historial visible correspondiente a sus propios reportes.

No puede:

- Leer reportes ajenos.
- Cambiar prioridad.
- Asignar.
- Cambiar rol.
- Cambiar estado por sí mismo.
- Leer notas internas.
- Acceder a usuarios de personal.

## 19.2 Administrador

Puede:

- Leer todos los reportes.
- Gestionar categorías.
- Gestionar personal mediante operaciones seguras.
- Asignar/reasignar.
- Cambiar prioridad.
- Ejecutar transiciones administrativas válidas.
- Consultar analítica.
- Leer evidencias.

Operaciones que requieran `service_role` deben ejecutarse exclusivamente en Edge Functions.

## 19.3 Mantenimiento

Puede:

- Leer su propio perfil.
- Leer únicamente reportes con asignación activa a su usuario.
- Leer únicamente asignaciones correspondientes a sus áreas autorizadas.
- Leer ubicación/evidencia necesarias.
- Registrar inicio de atención.
- Subir evidencia.
- Añadir notas de trabajo.
- Marcar como solucionado cuando la transición sea válida.

No puede:

- Asignarse trabajos.
- Reasignar.
- Modificar roles.
- Ver reportes de otros responsables.
- Recibir reportes de un área que no tenga autorizada.
- Modificar sus propias áreas.
- Gestionar categorías.

---

# 20. Seguridad de Supabase

Reglas obligatorias:

- En frontend usar solamente URL del proyecto y clave pública/publicable.
- Nunca publicar `service_role`.
- `service_role` solo en entorno server/Edge Function cuando sea indispensable.
- Validar JWT en funciones.
- Validar rol en servidor.
- Añadir rate limiting en endpoints sensibles.
- Evitar enumeración de usuarios/CURP.
- Mensajes de error de login genéricos.
- No registrar contraseñas/tokens.
- Rotar secretos si se exponen.
- Configurar expiración de signed URLs.
- Usar HTTPS.
- Validar MIME real de archivos.
- Sanitizar texto mostrado.
- No confiar en `role`, `user_id`, `status`, `assigned_to` recibidos del cliente.
- No permitir mass assignment.
- Todas las mutaciones sensibles deben tener auditoría.

---

# 21. Supabase Realtime

Usar Realtime selectivamente.

Casos:

- Admin recibe nuevos reportes.
- Admin recibe cambios de estado.
- Personal de mantenimiento recibe nuevas asignaciones.
- Detalle abierto se actualiza al cambiar el reporte.
- Ciudadano puede recibir actualización del estado de su reporte si la vista está activa.

No suscribirse indiscriminadamente a toda la base.

Usar filtros por:

- `report_id`.
- `citizen_id`.
- `maintenance_user_id`.

Las políticas RLS deben seguir aplicándose.

---

# 22. Notificaciones

Implementar una capa de notificaciones desacoplada.

Eventos:

- Reporte recibido.
- Reporte pasa a revisión.
- Reporte asignado.
- Inicio de atención.
- Reporte solucionado.

Para móvil:

- Usar `expo-notifications`.
- Guardar tokens de dispositivo asociados al usuario.
- Permitir múltiples dispositivos.
- Invalidar tokens fallidos.
- No incluir datos personales sensibles en la notificación.

Ejemplo:

```text
Tu reporte TGZ-INC-20260906-000123 cambió a "En atención".
```

Si la infraestructura push no se configura durante desarrollo, mantener el código preparado y documentar las credenciales requeridas, sin simular envíos exitosos.

---

# 23. UI/UX ciudadano

## 23.1 Crear reporte

Formulario:

### Categoría
Selector obligatorio.

### Descripción
- Obligatoria.
- 20–2000 caracteres.
- Mostrar contador.
- Evitar contenido vacío o solo espacios.

### Evidencia fotográfica
- 1 fotografía mínima.
- Hasta 5.
- Cámara o galería.
- Preview.
- Eliminar/reemplazar antes de enviar.

### Fecha y hora
- No solicitar fecha ni hora al ciudadano.
- Mostrar, si se desea, una vista previa no editable de la hora actual.
- La fecha/hora definitiva se genera en servidor al crear el reporte con `created_at DEFAULT now()`.
- Mostrar en la interfaz con la zona horaria configurada para Tuxtla Gutiérrez.
- Guardar en base de datos como `timestamptz`.

### Ubicación
- Botón "Usar mi ubicación".
- Solicitar permiso de ubicación de forma clara.
- Si el usuario acepta, capturar automáticamente latitud/longitud.
- Mostrar precisión si está disponible.
- Mostrar mapa y marcador.
- Permitir mover el marcador antes de enviar.
- Permitir reintentar la captura automática.
- El ciudadano puede rechazar el uso de GPS.
- Si rechaza el permiso o la captura automática falla, debe seleccionar manualmente la ubicación colocando el marcador en el mapa.
- El sistema debe registrar si la fuente fue `gps` o `manual_map`.
- No enviar el reporte hasta que exista una ubicación confirmada.

### Enviar
Antes de enviar:

- Mostrar resumen.
- Prevenir doble submit.
- Mostrar progreso de carga.
- Manejar fallos parciales.
- No crear duplicados por reintentos.

Después:

```text
Reporte enviado correctamente
Folio: TGZ-INC-20260906-000123
Estado: Recibido
```

---

# 24. UI/UX del personal de mantenimiento

## Lista

Cada tarjeta:

- Folio.
- Categoría.
- Prioridad.
- Estado.
- Distancia aproximada si hay permisos y se implementa.
- Fecha asignada.
- Zona.
- Indicador visual de tiempo transcurrido.

## Detalle

- Fotos.
- Descripción.
- Mapa.
- Abrir navegación externa.
- Historial.
- Observaciones.
- Estado.

Acciones:

```text
Aceptar
Iniciar atención
Agregar evidencia
Agregar nota
Marcar solucionado
```

El botón debe habilitarse solo cuando la transición sea válida.

Para solucionar un reporte:

- Requerir al menos una evidencia final si la regla de negocio está activa.
- Solicitar nota de resolución.
- Confirmación antes de finalizar.
- Registrar fecha/hora.
- Impedir doble envío.

---

# 25. Diseño PWA

Crear una interfaz moderna y sobria, orientada a gobierno/servicio ciudadano.

Debe incluir:

- Sidebar colapsable.
- Header.
- Breadcrumbs.
- Dashboard.
- Tablas accesibles.
- Modales accesibles.
- Toasts.
- Skeleton loaders.
- Empty states.
- Error states.
- Confirmaciones destructivas.
- Diseño responsive.

No depender únicamente de colores para representar estados.

Cumplir buenas prácticas WCAG:

- Labels.
- Navegación por teclado.
- `aria-*` cuando corresponda.
- Contraste.
- Focus visible.
- Mensajes de validación asociados al campo.

---

# 26. PWA real

La web debe ser una PWA válida:

- `manifest.webmanifest`.
- Nombre y nombre corto.
- Iconos.
- `theme_color`.
- `background_color`.
- `display: standalone`.
- Service Worker.
- Estrategia de cache.

No cachear indiscriminadamente:

- Tokens.
- Respuestas con CURP.
- Información privada sensible.
- Signed URLs expiradas.

Cachear principalmente:

- App shell.
- CSS.
- JS.
- Fuentes/íconos locales.
- Recursos estáticos.

Las mutaciones de administración deben requerir conexión activa.

---

# 27. Manejo de red y errores

Crear una estrategia consistente.

Errores esperados:

- Sin internet.
- Timeout.
- Token expirado.
- Permiso de ubicación rechazado.
- Cámara rechazada.
- Archivo demasiado grande.
- Formato de imagen inválido.
- Sesión inválida.
- RLS denegó operación.
- Reporte ya reasignado.
- Transición de estado inválida.
- CURP duplicada.
- CURP estructuralmente inválida.

No mostrar mensajes SQL crudos al usuario.

Mantener errores técnicos en un logger controlado y mensajes amigables en UI.

---

# 28. Concurrencia e integridad

Evitar condiciones de carrera.

Casos críticos:

- Dos administradores intentando asignar el mismo reporte.
- Dos cambios de estado simultáneos.
- Reintento de creación por red.
- Doble toque en "Enviar".
- Doble cierre de reporte.

Usar:

- Transacciones.
- Restricciones únicas.
- Funciones SQL/RPC atómicas.
- `SELECT ... FOR UPDATE` cuando sea necesario.
- Idempotency key para creación de reporte si la arquitectura lo requiere.
- Unique partial index para una sola asignación activa por reporte.

---

# 29. Analítica e indicadores

Administrador debe visualizar:

- Número total de reportes.
- Por estado.
- Por categoría.
- Por prioridad.
- Por responsable.
- Por rango de fechas.
- Tiempo medio de:
  - creación -> revisión;
  - revisión -> asignación;
  - asignación -> inicio;
  - inicio -> solución;
  - creación -> solución.
- Zonas con mayor concentración.
- Reportes resueltos por periodo.

Para geodatos:

- Usar PostGIS.
- No descargar todos los registros al cliente para agregarlos.
- Crear vistas/RPCs agregadas.
- Limitar información personal en resultados analíticos.

---

# 30. Validaciones de negocio

## Usuario

- Email válido.
- Contraseña conforme a política.
- Nombre obligatorio.
- Edad >16.
- Sexo obligatorio.
- CURP válida.
- CURP no duplicada.
- Consentimiento de privacidad obligatorio.

## Reporte

- Categoría activa.
- Descripción válida.
- Al menos una foto.
- Ubicación válida obtenida por GPS o seleccionada manualmente.
- `location_source` válido.
- Ciudadano autenticado.
- Fecha/hora generada en servidor.
- Folio generado en servidor.

## Asignación

- Reporte existente.
- Responsable activo.
- Rol del responsable = `maintenance`.
- El responsable debe estar autorizado para el área de mantenimiento correspondiente.
- Admin autenticado.
- No duplicar asignación activa.

## Solución

- Responsable debe ser el asignado activo o admin.
- Reporte debe estar `en_atencion`.
- Evidencia de solución obligatoria si la regla está activa.
- Nota de resolución.
- Registrar historial y auditoría.

---

# 31. API/servicios a encapsular

Crear una capa de repositorios/servicios, no llamar Supabase directamente desde cada componente.

Ejemplo:

```text
authService
citizenService
reportService
assignmentService
categoryService
mediaService
notificationService
analyticsService
curpService
```

Cada servicio debe:

- Tener tipos.
- Manejar errores.
- No filtrar secretos.
- Ser testeable.
- Separar transformación de datos de UI.

---

# 32. Tipado compartido

Generar tipos de Supabase desde el esquema.

Mantener:

```text
packages/types/src/database.types.ts
```

Compartir enums y DTOs:

```ts
ReportStatus
ReportPriority
AppRole
CreateReportInput
ReportDetail
AssignmentSummary
CitizenRegistrationInput
CurpValidationResult
```

No usar `any` salvo una justificación documentada.

TypeScript:

```text
strict = true
noUncheckedIndexedAccess = true
exactOptionalPropertyTypes = true
```

cuando la compatibilidad lo permita.

---

# 33. Gestión de sesión

## Web

- Restaurar sesión.
- Mostrar loader mientras se resuelve.
- Redirigir a login si no existe.
- Consultar rol.
- Bloquear rutas.
- Cerrar sesión correctamente.

## Móvil

- Persistencia segura.
- Restauración al abrir app.
- Resolver rol.
- Montar navigator correspondiente.
- Limpiar cache al cerrar sesión.
- Nunca mostrar una pantalla de otro rol durante el bootstrap.

---

# 34. Administración de roles

No permitir signup público para:

- `admin`.
- `maintenance`.

Estos usuarios deben ser creados por un administrador mediante una Edge Function privilegiada.

Ejemplo:

```text
create-staff-user
```

La función:

1. Valida JWT.
2. Confirma que solicitante es admin.
3. Crea usuario Auth.
4. Crea profile.
5. Inserta rol.
6. Si el rol es `maintenance`, inserta sus áreas autorizadas.
7. Registra auditoría.
8. Envía mecanismo de establecimiento/restablecimiento de contraseña.
9. Nunca devuelve una contraseña permanente en texto plano.

---

# 35. Funciones/RPC sugeridas

Implementar, según convenga, funciones SQL o Edge Functions para:

```text
generate_report_folio
create_report
assign_report
reassign_report
change_report_status
get_my_role
get_maintenance_workload
get_maintenance_users_by_area
get_reports_in_bbox
get_report_metrics
validate_curp
register_citizen
create_staff_user
deactivate_staff_user
```

Elegir SQL/RPC para transacciones cercanas a la base de datos y Edge Functions para:

- Operaciones de Auth administrativas.
- Secretos.
- Integraciones externas.
- CURP oficial si existe proveedor autorizado.
- Push notifications.
- Rate limiting avanzado.

---

# 36. Datos iniciales

Crear `seed.sql`.

Categorías mínimas:

```text
Bache
Alumbrado público
Basura
Otra incidencia
```

No crear credenciales reales en el repositorio.

Para demo local, documentar un mecanismo seguro para crear:

- 1 admin.
- 3 usuarios de mantenimiento de prueba: uno de Bacheo, uno de Alumbrado público y uno de Basura.
- 1 ciudadano de prueba.

No utilizar CURP real de una persona en datos de demostración.

---

# 37. Pruebas obligatorias

## Unitarias

Probar:

- Normalización de nombres.
- Edad.
- Fecha.
- CURP.
- Dígito verificador.
- Estado de reporte.
- Formateo de folio.
- Validaciones Zod.
- Transformaciones de coordenadas.

## Integración

Probar:

- Registro ciudadano.
- Crear reporte.
- RLS ciudadano.
- RLS admin.
- RLS maintenance.
- Restricciones por área de mantenimiento.
- Asignación.
- Reasignación.
- Cambio de estado.
- Storage.
- Historial.
- Analítica básica.

## E2E web

Casos:

1. Admin login.
2. Ver reportes.
3. Filtrar.
4. Abrir detalle.
5. Asignar.
6. Ver cambio de estado.
7. Gestionar categoría.

## E2E móvil ciudadano

1. Registro.
2. CURP inválida.
3. Edad <=16 rechazada.
4. Login.
5. Permisos.
6. Crear reporte.
7. Tomar foto.
8. Geolocalizar.
9. Enviar.
10. Mostrar folio.

## E2E móvil mantenimiento

1. Login.
2. Ver solo asignados.
3. Abrir.
4. Iniciar.
5. Subir evidencia.
6. Solucionar.
7. Ver historial.

---

# 38. Casos de seguridad que deben probarse

Intentar y confirmar que falle:

- Ciudadano accediendo a PWA administrativa.
- Ciudadano leyendo reporte ajeno.
- Ciudadano cambiando su rol.
- Ciudadano modificando `status`.
- Usuario de mantenimiento leyendo reporte no asignado.
- Usuario de mantenimiento leyendo un reporte de un área no autorizada.
- Usuario de mantenimiento asignándose un reporte.
- Usuario de mantenimiento cambiando prioridad.
- Usuario manipulando `citizen_id`.
- Usuario subiendo archivo a folder ajeno.
- Uso de ID válido de otro usuario.
- Intento de insertar `admin` desde frontend.
- Intento de llamar función administrativa sin rol.
- Doble creación por reintento.
- SQL injection.
- XSS en descripción/notas.
- Archivo con extensión falsa.
- Lectura directa de bucket privado.

---

# 39. Performance

- Paginar listados.
- No seleccionar `*` si no es necesario.
- Índices adecuados.
- Lazy loading de rutas.
- Lazy loading de imágenes.
- Thumbnails.
- Debounce en búsqueda.
- Consultas PostGIS limitadas al viewport.
- Realtime filtrado.
- Evitar renders innecesarios.
- Comprimir fotografías.
- No cargar fotografías completas en tablas.

Objetivo inicial razonable:

- Interfaz perceptiblemente rápida en 4G.
- Dashboard sin bloquear UI.
- Listados administrativos con paginación.
- Query plans revisados para filtros frecuentes.

---

# 40. Observabilidad

Preparar:

- Logs de Edge Functions.
- Auditoría de eventos de negocio.
- Manejo centralizado de errores.
- IDs de correlación cuando sea útil.
- Integración opcional con Sentry.

Nunca enviar:

- CURP completa.
- Password.
- JWT.
- Service role.
- Fotografías privadas.

a herramientas de observabilidad sin una justificación y política de privacidad.

---

# 41. Variables de entorno

Crear `.env.example`.

Web:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_APP_ENV=
```

Móvil:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_APP_ENV=
```

Supabase Functions:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CURP_PROVIDER_URL=
CURP_PROVIDER_API_KEY=
PUSH_PROVIDER_SECRET=
```

Las variables secretas no deben utilizar prefijos públicos.

Nunca commitear `.env`.

---

# 42. Flujo de desarrollo local

Documentar desde cero:

```bash
pnpm install
supabase start
supabase db reset
pnpm dev:web
pnpm dev:mobile
```

Los scripts reales pueden variar, pero README debe explicar exactamente:

- Requisitos.
- Instalación.
- Variables.
- Supabase local.
- Migraciones.
- Seed.
- Web.
- Android.
- iOS.
- Tests.
- Build.
- Deploy.

---

# 43. Deploy

## Web

Generar build PWA optimizado.

Puede desplegarse en proveedor estático compatible con SPA/PWA.

Configurar:

- Rewrites de rutas.
- HTTPS.
- Variables de entorno.
- Headers de seguridad.
- Cache correcto.

## Móvil

Usar EAS Build o proceso oficial compatible.

Generar:

- Android.
- iOS.

Configurar:

- App ID/package.
- Permisos.
- Iconos.
- Splash.
- Ubicación.
- Cámara.
- Galería.
- Notificaciones.

No incluir claves secretas dentro del bundle.

## Supabase

- Migraciones.
- RLS.
- Storage.
- Functions.
- Secrets.
- Realtime.
- Backups según plan.

---

# 44. Diseño visual sugerido

Estilo:

- Institucional.
- Claro.
- Moderno.
- Accesible.
- Sin exceso de animaciones.

Estados:

- Recibido.
- En revisión.
- En atención.
- Solucionado.

Cada estado debe tener:

- Texto.
- Icono.
- Badge.
- Color complementario, pero nunca depender exclusivamente del color.

En móvil, botones principales grandes y aptos para uso en calle.

---

# 45. Privacidad

Agregar:

- Aviso de privacidad.
- Consentimiento.
- Finalidad del uso de ubicación.
- Finalidad del uso de fotografías.
- Finalidad de CURP.
- Política de retención.
- Función de cierre/eliminación de cuenta cuando la política del proyecto lo defina.
- Minimización de datos.

No solicitar datos que no sean necesarios para el objetivo del proyecto.

---

# 46. Requisitos de calidad de código

- TypeScript estricto.
- Componentes pequeños.
- Separación UI/dominio/datos.
- Hooks reutilizables.
- No lógica de permisos únicamente en componentes.
- Manejo central de sesión.
- Manejo central de errores.
- Sin secretos hardcodeados.
- Sin `console.log` con datos sensibles.
- Sin TODOs críticos.
- Sin funciones vacías.
- Sin mocks en producción.
- Sin dependencias prerelease.
- Sin copiar código duplicado entre web/móvil.
- Comentarios solo cuando aporten contexto.
- Nombres en inglés para código y esquema; textos visibles en español.
- Fechas en UTC en base de datos.
- Mostrar fechas en zona horaria de Tuxtla Gutiérrez en UI.

---

# 47. Requisitos de entrega del agente

El agente debe entregar el proyecto por etapas, pero cada etapa debe ser funcional.

Orden:

1. Arquitectura.
2. Árbol de archivos.
3. Configuración del monorepo.
4. Supabase local.
5. SQL de migraciones.
6. RLS.
7. Storage.
8. Auth.
9. Tipos compartidos.
10. PWA.
11. App móvil ciudadano.
12. App móvil administrador.
13. App móvil mantenimiento.
14. Edge Functions.
15. Realtime.
16. Notificaciones.
17. Tests.
18. Seed.
19. README.
20. Deploy.
21. Revisión de seguridad.

No saltar las migraciones ni dejar la seguridad "para después".

---

# 48. Criterios de aceptación

La solución no se considera terminada hasta que se cumpla lo siguiente:

- [ ] Existe PWA React + Tailwind funcional.
- [ ] Existe app React Native para Android.
- [ ] Existe app React Native para iOS.
- [ ] Ambas usan el mismo proyecto Supabase.
- [ ] Existen roles citizen/admin/maintenance.
- [ ] Ciudadano no accede a web.
- [ ] Admin puede iniciar sesión en la aplicación móvil.
- [ ] Admin tiene flujo móvil operativo para consultar, asignar y dar seguimiento.
- [ ] Mantenimiento tiene flujo móvil de atención.
- [ ] Existen las áreas Bacheo, Alumbrado público y Basura.
- [ ] Cada usuario de mantenimiento tiene al menos un área autorizada.
- [ ] Las asignaciones validan la compatibilidad entre categoría, área y usuario de mantenimiento.
- [ ] Registro ciudadano valida nombre.
- [ ] Registro valida edad >16.
- [ ] Registro valida sexo.
- [ ] Registro valida CURP estructuralmente.
- [ ] CURP se contrasta con nombre/fecha/edad/sexo en lo técnicamente verificable.
- [ ] No se afirma verificación oficial sin integración autorizada.
- [ ] Cada reporte tiene UUID.
- [ ] Cada reporte tiene folio único visible.
- [ ] Reporte requiere descripción.
- [ ] Reporte tiene fotografía.
- [ ] Reporte registra fecha/hora automáticamente desde PostgreSQL.
- [ ] El ciudadano no puede editar la fecha/hora del reporte.
- [ ] La captura automática por GPS es opcional.
- [ ] Si no se usa GPS, el ciudadano debe indicar manualmente la ubicación en el mapa.
- [ ] Todo reporte conserva una ubicación confirmada y su `location_source`.
- [ ] PostGIS está habilitado.
- [ ] Admin ve mapa.
- [ ] Admin puede asignar.
- [ ] Mantenimiento solo ve reportes asignados y compatibles con sus áreas autorizadas.
- [ ] Existe historial de estados.
- [ ] Existe historial de asignaciones.
- [ ] Estados implementados: recibido, en revisión, en atención, solucionado.
- [ ] Mantenimiento puede adjuntar evidencia de resolución.
- [ ] Ciudadano puede conocer el estado de su reporte.
- [ ] Existe Realtime en puntos útiles.
- [ ] Existen RLS completas.
- [ ] Storage es privado.
- [ ] No existe service role en clientes.
- [ ] Existen pruebas de permisos.
- [ ] Existe README reproducible.
- [ ] No hay dependencias alpha/beta/rc/canary.
- [ ] No hay secretos hardcodeados.
- [ ] No hay datos mock en el flujo final.
- [ ] La solución compila.
- [ ] Los tests críticos pasan.

---

# 49. Plan de trabajo Scrum sugerido

Usar sprints de **2 semanas**.

## Sprint 1 — Base

- Monorepo.
- Supabase.
- Auth.
- Roles.
- Schema.
- RLS inicial.
- Diseño base.

## Sprint 2 — Ciudadano

- Registro.
- CURP.
- Login.
- Crear reporte.
- Cámara/galería.
- Ubicación.
- Folio.

## Sprint 3 — Administración

- Dashboard.
- Tabla.
- Filtros.
- Mapa.
- Detalle.
- Categorías.

## Sprint 4 — Mantenimiento y asignaciones

- Asignar/reasignar.
- App móvil de mantenimiento.
- Áreas Bacheo, Alumbrado público y Basura.
- Enrutamiento por área.
- Inicio de atención.
- Evidencias.
- Solución.

## Sprint 5 — Seguimiento

- Historial.
- Realtime.
- Notificaciones.
- Métricas.
- PostGIS avanzado.

## Sprint 6 — Calidad

- E2E.
- Seguridad.
- Performance.
- Accesibilidad.
- Documentación.
- Deploy.

---

# 50. Decisiones técnicas que no deben cambiarse sin justificar

1. Supabase es la fuente de verdad.
2. RLS es obligatoria.
3. Roles privilegiados no se crean desde cliente.
4. CURP se valida nuevamente en servidor.
5. La validación algorítmica de CURP no equivale a verificación oficial.
6. Folio se genera en servidor/base de datos.
7. UUID es la PK interna.
8. Reportes guardan ubicación geoespacial PostGIS.
9. Fotografías se almacenan en bucket privado.
10. Realtime se filtra.
11. Web y móvil comparten tipos y reglas.
12. Estado se modifica con máquina de estados.
13. Historial es append-only.
14. Las asignaciones a mantenimiento conservan trazabilidad y área responsable.
15. No se usan dependencias prerelease en producción.

---

# 51. Instrucción final para el agente de código

Construye la plataforma completa descrita en este documento.

Antes de escribir pantallas, implementa correctamente:

- modelo de datos;
- migraciones;
- RLS;
- roles;
- autenticación;
- funciones de negocio;
- seguridad de Storage.

Después desarrolla las interfaces web y móvil contra ese backend real.

No omitas archivos de configuración necesarios.

Cuando proporciones código:

- indica la ruta exacta del archivo;
- entrega su contenido completo;
- no uses fragmentos incompletos;
- no escribas “resto del código igual”;
- no dejes variables sin definir;
- no uses secretos reales;
- incluye comandos reproducibles;
- valida compatibilidad de dependencias antes de instalarlas;
- mantén todas las versiones en canales estables.

Al finalizar cada etapa, incluye:

1. Archivos creados/modificados.
2. Comandos a ejecutar.
3. Variables requeridas.
4. Cómo probar.
5. Resultado esperado.
6. Errores comunes.
7. Criterios para considerar la etapa terminada.

La prioridad es **seguridad, integridad de datos, trazabilidad, facilidad de uso, geolocalización correcta, control de acceso por roles y reproducibilidad del proyecto**.
