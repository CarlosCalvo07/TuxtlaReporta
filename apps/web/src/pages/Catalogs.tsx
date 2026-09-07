import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { priorities, type Category, type Area, type Json } from "@tuxtla/types";
import { api } from "../backend";
import { ErrorNotice } from "../components";
export default function Catalogs({ kind }: { kind: "category" | "area" }) {
  const cache = useQueryClient();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: api.catalogs.categories,
  });
  const areas = useQuery({ queryKey: ["areas"], queryFn: api.catalogs.areas });
  const [editing, setEditing] = useState<Category | Area | null>(null),
    [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: (data: Json) => api.catalogs.save(kind, data),
    onSuccess: () => {
      void cache.invalidateQueries();
      setOpen(false);
    },
  });
  const rows = kind === "category" ? categories.data : areas.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONFIGURACIÓN</p>
          <h1>
            {kind === "category"
              ? "Categorías de incidencias"
              : "Áreas de atención"}
          </h1>
          <p>Organiza el trabajo y su enrutamiento al personal responsable.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          + {kind === "category" ? "Nueva categoría" : "Nueva área"}
        </button>
      </div>
      <ErrorNotice error={mutation.error || categories.error || areas.error} />
      {open && (
        <section className="panel">
          <h2>
            {editing ? "Editar" : "Crear"}{" "}
            {kind === "category" ? "categoría" : "área"}
          </h2>
          <form
            key={editing?.id ?? "new"}
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              mutation.mutate({
                ...Object.fromEntries(data.entries()),
                ...(editing ? { id: editing.id } : {}),
                is_active: data.get("is_active") === "on",
                maintenance_area_id: data.get("maintenance_area_id") || null,
              } as Json);
            }}
          >
            <div className="filters">
              <label>
                Nombre
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  defaultValue={editing?.name}
                />
              </label>
              <label>
                Identificador
                <input
                  name="slug"
                  required
                  pattern="[a-z0-9_\-]+"
                  defaultValue={editing?.slug}
                />
              </label>
              {kind === "category" && (
                <>
                  <label>
                    Área responsable
                    <select
                      name="maintenance_area_id"
                      defaultValue={
                        editing && "maintenance_area_id" in editing
                          ? (editing.maintenance_area_id ?? "")
                          : ""
                      }
                    >
                      <option value="">Sin clasificar</option>
                      {areas.data
                        ?.filter((a) => a.is_active)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Prioridad predeterminada
                    <select
                      name="default_priority"
                      defaultValue={
                        editing && "default_priority" in editing
                          ? editing.default_priority
                          : "media"
                      }
                    >
                      {priorities.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
            <label>
              Descripción
              <textarea
                name="description"
                maxLength={2000}
                defaultValue={editing?.description ?? ""}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editing?.is_active ?? true}
              />{" "}
              Activa
            </label>
            <div className="actions">
              <button disabled={mutation.isPending}>Guardar</button>
              <button
                type="button"
                className="secondary"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Identificador</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows?.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.slug}</td>
                <td>{row.is_active ? "Activa" : "Inactiva"}</td>
                <td>
                  <button
                    className="secondary"
                    onClick={() => {
                      setEditing(row);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
