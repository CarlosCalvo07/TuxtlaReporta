# Base de datos

## Tablas y privacidad

| Esquema | Entidades                               | Acceso                                                                  |
| ------- | --------------------------------------- | ----------------------------------------------------------------------- |
| public  | profiles, user_roles                    | Propio perfil o administrador; sin escritura directa                    |
| public  | maintenance_areas, incident_categories  | Catálogos para usuarios con rol; gestión por RPC de admin               |
| public  | maintenance_user_areas                  | Propias áreas o administrador                                           |
| public  | reports                                 | Propio ciudadano, admin o responsable activo compatible                 |
| public  | report_assignments                      | Admin o responsable; historial conservado                               |
| public  | report_media, report_status_history     | RLS del reporte                                                         |
| public  | report_notes                            | RLS del reporte y visibilidad interna/ciudadano                         |
| public  | audit_log                               | Solo administrador                                                      |
| public  | notifications                           | Solo destinatario activo                                                |
| private | citizen_profiles                        | Solo servidor; HMAC de CURP, últimos cuatro caracteres y consentimiento |
| private | device_tokens, push_outbox, push_receipts, rate_limits | Solo servidor                                                           |

Las vistas `report_list` y `staff_directory` usan `security_invoker=true`. No agregan permisos a las tablas subyacentes; el directorio de personal requiere rol administrador. La información geográfica se almacena como `geography(Point,4326)` y se crea siempre con longitud antes que latitud.

## Integridad

- Un usuario tiene un único rol; mantenimiento puede tener varias áreas y una primaria.
- Índice parcial: una sola asignación con `ended_at is null` por reporte.
- `SELECT FOR UPDATE` protege cada mutación de reporte. `version` rechaza cambios con estado obsoleto.
- `unique(citizen_id,idempotency_key)` y bloqueo consultivo serializan reintentos de creación.
- Ni el folio ni fechas ni ciudadano se toman del cuerpo enviado por el cliente.
- Resolución exige `en_atencion`, nota de al menos cinco caracteres y foto de tipo `resolution`.
- Cambiar de área/categoría es rechazado cuando contradice una asignación existente. Desactivar personal con trabajo pendiente exige reasignar antes.
- Clientes no tienen permisos INSERT/UPDATE/DELETE en reportes, asignaciones, historial, roles, medios ni auditoría.

## API

| RPC                                                    | Usuario autorizado                     |
| ------------------------------------------------------ | -------------------------------------- |
| get_my_role                                            | Usuario autenticado                    |
| create_report                                          | Ciudadano activo                       |
| assign_report                                          | Administrador                          |
| change_report_status                                   | Administrador o responsable compatible |
| update_report                                          | Administrador                          |
| add_media, add_note                                    | Administrador o responsable compatible |
| manage_catalog, update_staff                           | Administrador                          |
| get_maintenance_workload, get_report_metrics           | Administrador                          |
| get_reports_in_bbox                                    | Filtrado por RLS, máximo 500 registros |
| register_device                                        | Usuario activo                         |
| provision_citizen, provision_staff, consume_rate_limit | service_role                           |
| claim_push_batch, finish_push                          | service_role                           |
| record_push_receipts, claim_push_receipts, finish_push_receipt | service_role                     |

## Storage

Bucket `report-media`, privado, máximo 8 MiB por archivo, JPEG/PNG/WebP. La función de subida usa el secreto del servidor después de validar la petición. No existe política de inserción directa para clientes. La política SELECT comprueba un registro `report_media` autorizado. Las URLs firmadas duran 120 segundos y no se guardan en cache persistente.

Los archivos subidos cuyo reporte no llega a crearse no son visibles para otros usuarios. La operación de limpieza de huérfanos requiere definir una ventana de retención y verificar referencias antes de borrar mediante Storage API; no borrar solo metadata SQL de objetos.

## Migración segura de una base existente

No ejecutar `db reset` remoto. Inspeccionar tablas, enums, extensiones, grants y políticas actuales; obtener respaldo y adaptar una migración incremental si hay nombres existentes. Aplicar solo después de revisar el diff. Ejecutar asesores y las pruebas de permisos sobre una rama o entorno de prueba Supabase antes de abrir acceso real.
