import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../auth-context";
import { ApiClientError } from "../api-client";
import { colors, space, type } from "../theme";

export function RegisterScreen({ onDone, onSwitchToLogin }: { onDone: () => void; onSwitchToLogin: () => void }) {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, displayName);
      onDone();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your profile</Text>
      <TextInput
        style={styles.input}
        placeholder="Display name"
        placeholderTextColor={colors.textSecondary}
        value={displayName}
        onChangeText={setDisplayName}
      />
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
        placeholder="Password (min 8 characters)"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create account</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={onSwitchToLogin} style={{ marginTop: space.md }}>
        <Text style={{ color: colors.textSecondary }}>
          Already have an account? <Text style={{ color: colors.brand }}>Log in</Text>
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
