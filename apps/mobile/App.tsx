import { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/auth-context";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { MatchScreen } from "./src/screens/MatchScreen";
import { colors, space } from "./src/theme";

type Screen = "match" | "login" | "register";

function Root() {
  const { me, loading, logout } = useAuth();
  const [screen, setScreen] = useState<Screen>("match");

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <View style={styles.header}>
        <Text style={styles.logo}>FLARE</Text>
        {me ? (
          <TouchableOpacity onPress={logout}>
            <Text style={styles.headerAction}>Log out</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setScreen(screen === "login" ? "match" : "login")}>
            <Text style={styles.headerAction}>{screen === "login" ? "Back" : "Log in"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {screen === "login" && !me && (
        <LoginScreen onDone={() => setScreen("match")} onSwitchToRegister={() => setScreen("register")} />
      )}
      {screen === "register" && !me && (
        <RegisterScreen onDone={() => setScreen("match")} onSwitchToLogin={() => setScreen("login")} />
      )}
      {(screen === "match" || me) && <MatchScreen />}

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: { color: colors.brand, fontWeight: "800", fontSize: 20, letterSpacing: 1 },
  headerAction: { color: colors.textSecondary, fontWeight: "600" },
});
