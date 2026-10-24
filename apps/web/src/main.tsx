import React, { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  Navigate,
  Link,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { SessionProvider, useSession } from "./session";
import { api, client } from "./backend";
import { friendlyError } from "@tuxtla/shared";
import "./style.css";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reports = lazy(() => import("./pages/Reports"));
const Detail = lazy(() => import("./pages/Detail"));
const Catalogs = lazy(() => import("./pages/Catalogs"));
const Staff = lazy(() => import("./pages/Staff"));
const query = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 20000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (
      (localStorage.getItem("tuxtla_theme") as "dark" | "light") || "dark"
    );
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("tuxtla_theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

function Login() {
  const session = useSession();
  const { theme, toggle: toggleTheme } = useTheme();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <section className="login-story">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div className="brand">
            <img src="/logo.png" alt="Tuxtla Reporta" className="brand-logo" />
            <div className="brand-text">
              <span className="brand-title">TUXTLA</span>
              <span className="brand-sub">REPORTA</span>
            </div>
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            title="Cambiar tema"
          >
            {theme === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
          </button>
        </div>
        <div>
          <p className="eyebrow">SERVICIOS URBANOS · TUXTLA GUTIÉRREZ</p>
          <h1>
            Una ciudad mejor.
            <br />
            <em>Reporte a reporte.</em>
          </h1>
          <p>
            Coordina la atención de incidencias y acompaña cada solución, desde
            el primer aviso hasta el trabajo terminado.
          </p>
        </div>
        <span>
          Chiapas, México <span aria-hidden="true">↗</span>
        </span>
      </section>
      <section className="login-form">
        <p className="eyebrow">ESPACIO DE TRABAJO</p>
        <h2>Bienvenido de nuevo</h2>
        <p>Acceso para administración y mantenimiento.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              await api.auth.login(email, password);
            } catch {
              setMessage(
                "No se pudo iniciar sesión. Revisa el correo y la contraseña.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {(message || session.message) && (
            <p role="alert" className="notice">
              {message || session.message}
            </p>
          )}
          <button disabled={busy}>
            {busy ? "Verificando…" : "Entrar al panel →"}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={async () => {
              try {
                await api.auth.reset(email, `${location.origin}/auth/recovery`);
                setMessage(
                  "Si existe una cuenta, recibirás un correo de recuperación.",
                );
              } catch {
                setMessage("Introduce un correo válido e inténtalo de nuevo.");
              }
            }}
          >
            Recuperar contraseña
          </button>
        </form>
        <p className="small">
          ¿Quieres reportar una incidencia? Utiliza la aplicación móvil
          ciudadana.
        </p>
        <Link to="/privacy">Aviso de privacidad</Link>
      </section>
    </main>
  );
}
function Recovery() {
  const [password, setPassword] = useState(""),
    [message, setMessage] = useState("");
  return (
    <main className="recovery panel">
      <h1>Establecer contraseña</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.auth.password(password);
            setMessage("Contraseña actualizada. Ya puedes entrar al panel.");
          } catch (error) {
            setMessage(friendlyError(error));
          }
        }}
      >
        <label>
          Nueva contraseña
          <input
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button>Guardar contraseña</button>
        <p role="status">{message}</p>
        <Link to="/">Ir al panel</Link>
      </form>
    </main>
  );
}
function Privacy() {
  return (
    <main className="recovery panel">
      <h1>Privacidad y uso de datos</h1>
      <p>
        Los datos de cuenta permiten identificar al remitente y dar seguimiento
        a sus reportes. La ubicación y las fotografías se utilizan para
        localizar y atender la incidencia.
      </p>
      <p>
        La CURP se valida estructuralmente; se conserva una huella criptográfica
        y los últimos cuatro caracteres para prevenir registros duplicados. Esta
        validación no acredita identidad oficial.
      </p>
      <p>
        Las evidencias son privadas y su acceso se limita al ciudadano, la
        administración y el personal asignado.
      </p>
      <p className="notice">
        El responsable del servicio debe publicar el aviso integral, contacto
        para derechos de privacidad y plazo de retención antes de abrir el
        registro al público.
      </p>
      <Link to="/">Volver</Link>
    </main>
  );
}
function Workspace() {
  const s = useSession(),
    cache = useQueryClient();
  const { theme, toggle: toggleTheme } = useTheme();
  const [online, setOnline] = useState(navigator.onLine),
    [menu, setMenu] = useState(false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    cache.clear();
    if (!s.uid) return;
    return api.notifications.subscribe(
      s.uid,
      () => void cache.invalidateQueries(),
    );
  }, [s.uid, cache]);
  if (s.loading)
    return (
      <main className="loading" role="status">
        Verificando acceso…
      </main>
    );
  if (!s.role) return <Login />;
  return (
    <div className="workspace">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <Link to="/" className="brand">
          <img src="/logo.png" alt="Tuxtla Reporta" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-title">TUXTLA</span>
            <span className="brand-sub">REPORTA</span>
          </div>
        </Link>
        <span className="nav-caption">GESTIÓN URBANA</span>
        <nav onClick={() => setMenu(false)}>
          {s.role === "admin" && (
            <NavLink to="/" end>
              ◫ <span>Resumen</span>
            </NavLink>
          )}
          <NavLink to="/reports">
            ▤{" "}
            <span>{s.role === "admin" ? "Reportes" : "Mis asignaciones"}</span>
          </NavLink>
          {s.role === "admin" && (
            <>
              <NavLink to="/staff">
                ♧ <span>Personal</span>
              </NavLink>
              <NavLink to="/categories">
                ▦ <span>Categorías</span>
              </NavLink>
              <NavLink to="/areas">
                ⌘ <span>Áreas de atención</span>
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="telemetry-status">
            <span className="pulse-dot"></span> SISTEMA EN LÍNEA
          </div>
          <p>
            Tuxtla Gutiérrez
            <br />
            <span>Chiapas, México</span>
          </p>
          <Link to="/privacy">Privacidad</Link>
          <button
            className="secondary"
            onClick={async () => {
              await api.auth.logout();
              cache.clear();
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button
            className="menu-button secondary"
            aria-label="Abrir menú"
            onClick={() => setMenu(!menu)}
          >
            ☰
          </button>
          <div className="topbar-tag">
            <span className="pulse-dot"></span> GOBIERNO MUNICIPAL · CENTRO DE MANDO Y ATENCIÓN
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              title="Cambiar entre modo claro y modo oscuro"
            >
              {theme === "dark" ? "☀️ Modo Claro" : "🌙 Modo Oscuro"}
            </button>
            <div className="user">
              <span className="avatar">{s.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{s.name}</strong>
                <small>
                  {s.role === "admin" ? "Administración" : "Mantenimiento"}
                </small>
              </div>
            </div>
          </div>
        </header>
        {!online && (
          <p className="offline" role="alert">
            Sin conexión. Las operaciones requieren conexión activa.
          </p>
        )}
        <div className="content">
          <Suspense fallback={<p role="status">Cargando módulo…</p>}>
            <Routes>
              <Route
                path="/"
                element={
                  s.role === "admin" ? (
                    <Dashboard />
                  ) : (
                    <Navigate to="/reports" replace />
                  )
                }
              />
              <Route path="/reports" element={<Reports />} />
              <Route path="/reports/:id" element={<Detail />} />
              {s.role === "admin" && (
                <>
                  <Route path="/staff" element={<Staff />} />
                  <Route
                    path="/categories"
                    element={<Catalogs kind="category" />}
                  />
                  <Route path="/areas" element={<Catalogs kind="area" />} />
                </>
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
function App() {
  return (
    <QueryClientProvider client={query}>
      <BrowserRouter>
        <SessionProvider>
          <Routes>
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/auth/recovery" element={<Recovery />} />
            <Route path="*" element={<Workspace />} />
          </Routes>
        </SessionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
void client;
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
