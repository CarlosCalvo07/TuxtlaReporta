import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import * as Linking from "expo-linking";
import type { AppRole } from "@tuxtla/types";
import { client, api } from "./backend";
type State = {
  loading: boolean;
  role: AppRole | null;
  uid: string;
  message: string;
  recovery: boolean;
};
const initial: State = {
  loading: true,
  role: null,
  uid: "",
  message: "",
  recovery: false,
};
const Context = createContext(initial);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    let active = true,
      epoch = 0;
    async function load() {
      const n = ++epoch;
      setState((s) => ({ ...s, loading: true, role: null }));
      try {
        const { data } = await client.auth.getSession();
        if (!data.session) {
          if (active && n === epoch) setState({ ...initial, loading: false });
          return;
        }
        const role = await api.auth.role();
        if (!role) throw new Error("Missing profile");
        if (active && n === epoch)
          setState((s) => ({
            ...s,
            loading: false,
            role,
            uid: data.session!.user.id,
            message: "",
          }));
      } catch {
        if (active && n === epoch)
          setState({
            ...initial,
            loading: false,
            message:
              "No se pudo verificar tu perfil. Revisa la conexión o confirma tu correo.",
          });
      }
    }
    async function link(url: string | null) {
      if (!url) return;
      const params = new URLSearchParams(
        url.split("#")[1] ?? url.split("?")[1] ?? "",
      );
      if (params.get("type") === "recovery")
        setState((s) => ({ ...s, recovery: true }));
      const access_token = params.get("access_token"),
        refresh_token = params.get("refresh_token");
      if (access_token && refresh_token)
        await client.auth.setSession({ access_token, refresh_token });
      const code = params.get("code");
      if (code) await client.auth.exchangeCodeForSession(code);
    }
    void Linking.getInitialURL().then(link);
    const links = Linking.addEventListener("url", ({ url }) => void link(url));
    void load();
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY")
        setState((s) => ({ ...s, recovery: true }));
      setTimeout(() => void load(), 0);
    });
    const app = AppState.addEventListener("change", (s) => {
      if (s === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
      app.remove();
      links.remove();
    };
  }, []);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export const useSession = () => useContext(Context);
