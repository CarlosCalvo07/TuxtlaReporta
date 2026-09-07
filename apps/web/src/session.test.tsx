// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { SessionProvider, useSession } from "./session";
const state = vi.hoisted(() => ({
  logged: true,
  role: "admin" as string | null,
  handler: () => {},
  logout: vi.fn(),
}));
vi.mock("./backend", () => ({
  client: {
    auth: {
      getSession: async () => ({
        data: { session: state.logged ? { user: { id: "test-user" } } : null },
      }),
      onAuthStateChange: (handler: () => void) => {
        state.handler = handler;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
  api: {
    auth: {
      role: async () => state.role,
      profile: async () => ({
        id: "test-user",
        display_name: "Usuario de prueba",
      }),
      logout: async () => {
        state.logout();
        state.logged = false;
        state.handler();
      },
    },
  },
}));
function Probe() {
  const s = useSession();
  return (
    <>
      <span>{s.loading ? "Verificando" : (s.role ?? "Sin acceso")}</span>
      <p>{s.message}</p>
    </>
  );
}
beforeEach(() => {
  state.logged = true;
  state.role = "admin";
  state.logout.mockClear();
});
afterEach(cleanup);
describe("role bootstrap", () => {
  it("does not expose an admin role before bootstrap finishes", async () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    expect(screen.queryByText("admin")).toBeNull();
    await screen.findByText("admin");
  });
  it("signs citizens out and preserves their explanation after auth events", async () => {
    state.role = "citizen";
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await screen.findByText(
      "Tu acceso ciudadano está disponible en la aplicación móvil.",
    );
    await waitFor(() => expect(state.logout).toHaveBeenCalled());
    await screen.findByText("Sin acceso");
    expect(screen.queryByText("citizen")).toBeNull();
  });
  it("blocks an account with no active role", async () => {
    state.role = null;
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await screen.findByText("Sin acceso");
    expect(screen.queryByText("admin")).toBeNull();
  });
  it("does not load a role without a session", async () => {
    state.logged = false;
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await screen.findByText("Sin acceso");
    expect(screen.queryByText("admin")).toBeNull();
  });
});
