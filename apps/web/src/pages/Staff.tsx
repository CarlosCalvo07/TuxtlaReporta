import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../backend";
import { ErrorNotice } from "../components";
export default function Staff() {
  const cache = useQueryClient(),
    [open, setOpen] = useState(false);
  const staff = useQuery({ queryKey: ["staff"], queryFn: api.staff.list });
  const areas = useQuery({ queryKey: ["areas"], queryFn: api.catalogs.areas });
  const workload = useQuery({
    queryKey: ["workload"],
    queryFn: () => api.staff.workload(),
  });
  const mutation = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => {
      void cache.invalidateQueries();
      setOpen(false);
    },
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EQUIPO OPERATIVO</p>
          <h1>Personal y carga de trabajo</h1>
          <p>Asigna las áreas que cada integrante está autorizado a atender.</p>
        </div>
        <button onClick={() => setOpen(!open)}>+ Incorporar personal</button>
      </div>
      <ErrorNotice error={staff.error || mutation.error} />
      {open && (
        <section className="panel">
          <h2>Crear cuenta de personal</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              mutation.mutate(() =>
                api.staff.create({
                  email: String(f.get("email")),
                  name: String(f.get("name")),
                  role: f.get("role") as "admin" | "maintenance",
                  areas: f.getAll("areas").map(String),
                }),
              );
            }}
          >
            <div className="filters">
              <label>
                Nombre
                <input name="name" required minLength={2} />
              </label>
              <label>
                Correo
                <input name="email" type="email" required />
              </label>
              <label>
                Rol
                <select name="role">
                  <option value="maintenance">Mantenimiento</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
            </div>
            <fieldset>
              <legend>Áreas autorizadas</legend>
              {areas.data
                ?.filter((a) => a.is_active)
                .map((a) => (
                  <label className="check" key={a.id}>
                    <input type="checkbox" name="areas" value={a.id} />
                    {a.name}
                  </label>
                ))}
            </fieldset>
            <button disabled={mutation.isPending}>Crear y enviar acceso</button>
          </form>
        </section>
      )}
      <div className="staff-grid">
        {staff.data?.map((p) => (
          <section className="panel" key={p.id}>
            <span className="avatar">{p.display_name.slice(0, 1)}</span>
            <h2>{p.display_name}</h2>
            <p>
              {p.role === "admin" ? "Administrador" : "Mantenimiento"} ·{" "}
              {p.is_active ? "Activo" : "Inactivo"}
            </p>
            <p>
              {workload.data
                ?.filter((w) => w.user_id === p.id)
                .reduce((a, w) => a + w.open_count, 0) ?? 0}{" "}
              reportes activos
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                mutation.mutate(() =>
                  api.staff.update(
                    p.id,
                    f.get("active") === "on",
                    f.getAll("areas").map(String),
                  ),
                );
              }}
            >
              {p.role === "maintenance" && (
                <fieldset>
                  <legend>Áreas autorizadas</legend>
                  {areas.data?.map((a) => (
                    <label className="check" key={a.id}>
                      <input
                        type="checkbox"
                        name="areas"
                        value={a.id}
                        defaultChecked={p.areas.includes(a.id)}
                      />
                      {a.name}
                    </label>
                  ))}
                </fieldset>
              )}
              <label className="check">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={p.is_active}
                />
                Cuenta activa
              </label>
              <button className="secondary" disabled={mutation.isPending}>
                Guardar permisos
              </button>
            </form>
          </section>
        ))}
      </div>
    </>
  );
}
