import { useState } from "react";
import { Text } from "react-native";
import { useSession } from "../src/session";
import { Screen, Button, Field, styles } from "../src/ui";
import { api } from "../src/backend";
import Auth from "../src/Auth";
import Citizen from "../src/Citizen";
import Operations from "../src/Operations";
export default function Home() {
  const s = useSession(),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false);
  if (s.loading)
    return (
      <Screen>
        <Text>Verificando sesión…</Text>
      </Screen>
    );
  if (s.recovery && !done)
    return (
      <Screen>
        <Text style={styles.title}>Establecer contraseña</Text>
        <Field
          label="Contraseña (12 caracteres mínimo)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button
          title="Guardar contraseña"
          disabled={password.length < 12}
          onPress={() => {
            void api.auth
              .password(password)
              .then(() => setDone(true))
              .catch(() =>
                setMessage(
                  "No se pudo actualizar. Abre de nuevo el enlace del correo.",
                ),
              );
          }}
        />
        <Text>{message}</Text>
      </Screen>
    );
  if (!s.role)
    return (
      <>
        <Auth />
        {s.message && <Text style={styles.error}>{s.message}</Text>}
      </>
    );
  return s.role === "citizen" ? <Citizen /> : <Operations />;
}
