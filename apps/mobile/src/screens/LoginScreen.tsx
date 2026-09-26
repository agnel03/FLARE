import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../auth-context";
import { ApiClientError } from "../api-client";
import { colors, space, type } from "../theme";

export function LoginScreen({ onDone, onSwitchToRegister }: { onDone: () => void; onSwitchToRegister: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      onDone();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log in to FLARE</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log in</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={onSwitchToRegister} style={{ marginTop: space.md }}>
        <Text style={{ color: colors.textSecondary }}>
          No account? <Text style={{ color: colors.brand }}>Create one</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: space.lg, justifyContent: "center" },
  title: { fontSize: type.heading1.fontSize, fontWeight: "800", color: colors.textPrimary, marginBottom: space.lg },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: space.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    marginBottom: space.sm,
  },
  button: {
    minHeight: 48,
    backgroundColor: colors.brand,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.xs,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: type.body.fontSize },
  error: { color: colors.danger, marginBottom: space.xs },
});
