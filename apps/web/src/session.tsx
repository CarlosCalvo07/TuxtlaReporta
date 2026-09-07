import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AppRole } from "@tuxtla/types";
import { api, client } from "./backend";
type SessionState = {
  loading: boolean;
  role: AppRole | null;
  uid: string;
  name: string;
  message: string;
};
const initial: SessionState = {
  loading: true,
  role: null,
  uid: "",
  name: "",
  message: "",
};
const Context = createContext(initial);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    let active = true,
      epoch = 0;
    async function load() {
      const version = ++epoch;
      setState((s) => ({ ...s, loading: true, role: null }));
      try {
        const { data } = await client.auth.getSession();
        if (!data.session) {
          if (active && version === epoch)
            setState((previous) => ({
              ...initial,
              loading: false,
              message: previous.message,
            }));
          return;
        }
        const role = await api.auth.role();
        if (role === "citizen") {
          await api.auth.logout();
          if (active)
            setState({
              ...initial,
              loading: false,
              message:
                "Tu acceso ciudadano está disponible en la aplicación móvil.",
            });
          return;
        }
        if (!role) throw new Error("No role");
        const profile = await api.auth.profile();
        if (active && version === epoch)
          setState({
            loading: false,
            role,
            uid: profile.id,
            name: profile.display_name,
            message: "",
          });
      } catch {
        if (active && version === epoch)
          setState({
            ...initial,
            loading: false,
            message:
              "No se pudo verificar el acceso. Comprueba que la base esté configurada y tu cuenta esté activa.",
          });
      }
    }
    void load();
    const { data } = client.auth.onAuthStateChange(() => {
      setTimeout(() => void load(), 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export const useSession = () => useContext(Context);
