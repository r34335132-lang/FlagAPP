import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_GRADIENT } from "@/constants/colors";

const BASE_URL = "https://www.flagdurango.com.mx";

export default function RegisterScreen() {
  const router = useRouter();
  
  // Estados Generales
  const [role, setRole] = useState<"player" | "coach">("player");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Estados Exclusivos de Jugador
  const [playerName, setPlayerName] = useState("");
  const [position, setPosition] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert("Error", "Usuario, correo y contraseña son obligatorios.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (role === "player" && (!playerName || !jerseyNumber)) {
      Alert.alert("Error", "El nombre completo y número de jersey son requeridos para jugadores.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: username.trim(),
        email: email.trim(),
        password,
        role,
        ...(role === "player" && {
          playerName: playerName.trim(),
          position: position || "Libre",
          jerseyNumber: parseInt(jerseyNumber, 10)
        })
      };

      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Error al registrarse");
      }

      Alert.alert(
        "¡Registro Exitoso!",
        data.message,
        [{ text: "Ir al Login", onPress: () => router.replace("/login") }]
      );

    } catch (error: any) {
      Alert.alert("Error al registrar", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={styles.topBackground}>
        <Image 
          source={{ uri: "https://www.flagdurango.com.mx/images/logo-flag-durango.png" }} 
          style={styles.logo} 
          resizeMode="contain" 
        />
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Crear Cuenta</Text>
              <Text style={styles.subtitle}>Únete a la liga de Flag Durango</Text>
            </View>

            {/* SELECTOR DE ROL */}
            <View style={styles.roleSelector}>
              <Pressable 
                style={[styles.roleBtn, role === "player" && styles.roleBtnActive]}
                onPress={() => setRole("player")}
              >
                <Text style={[styles.roleText, role === "player" && styles.roleTextActive]}>Jugador</Text>
              </Pressable>
              <Pressable 
                style={[styles.roleBtn, role === "coach" && styles.roleBtnActive]}
                onPress={() => setRole("coach")}
              >
                <Text style={[styles.roleText, role === "coach" && styles.roleTextActive]}>Coach </Text>
              </Pressable>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre de Usuario (App)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="at-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Ej. jperez99" value={username} onChangeText={setUsername} autoCapitalize="none" />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo Electrónico</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="ejemplo@correo.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="••••••" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94A3B8" />
                  </Pressable>
                </View>
              </View>

              {/* CAMPOS EXTRA PARA JUGADOR */}
              {role === "player" && (
                <View style={styles.playerFieldsCard}>
                  <Text style={styles.playerFieldsTitle}>Datos del Campo</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nombre Completo (Real)</Text>
                    <View style={styles.inputContainer}>
                      <TextInput style={styles.input} placeholder="Juan Pérez" value={playerName} onChangeText={setPlayerName} autoCapitalize="words" />
                    </View>
                  </View>

                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Posición</Text>
                      <View style={styles.inputContainer}>
                        <TextInput style={styles.input} placeholder="Ej. QB, WR" value={position} onChangeText={setPosition} autoCapitalize="characters" />
                      </View>
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Jersey #</Text>
                      <View style={styles.inputContainer}>
                        <TextInput style={styles.input} placeholder="Ej. 10" value={jerseyNumber} onChangeText={setJerseyNumber} keyboardType="numeric" maxLength={2} />
                      </View>
                    </View>
                  </View>
                </View>
              )}

              <Pressable style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.registerBtnText}>Registrarme</Text>}
              </Pressable>

              <View style={styles.footerLinks}>
                <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
                <Pressable onPress={() => router.back()}>
                  <Text style={styles.linkText}>Inicia Sesión</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  topBackground: { height: "35%", width: "100%", position: "absolute", top: 0, justifyContent: "center", alignItems: "center", paddingBottom: 20 },
  logo: { width: 160, height: 60, tintColor: "#FFFFFF" },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "flex-end" },
  card: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingTop: 30, minHeight: "75%", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 4, fontWeight: "500" },
  
  roleSelector: { flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 16, padding: 6, marginBottom: 25 },
  roleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  roleBtnActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  roleText: { fontSize: 13, fontWeight: "700", color: "#64748B" },
  roleTextActive: { color: BRAND_GRADIENT[0], fontWeight: "900" },

  form: { gap: 15 },
  inputGroup: { gap: 8 },
  rowInputs: { flexDirection: "row", gap: 15 },
  label: { fontSize: 11, fontWeight: "800", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, paddingHorizontal: 16, height: 50 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: "#0F172A", fontWeight: "500" },
  eyeIcon: { padding: 5 },

  playerFieldsCard: { backgroundColor: "#F8FAFC", padding: 15, borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", gap: 15, marginTop: 5 },
  playerFieldsTitle: { fontSize: 12, fontWeight: "800", color: BRAND_GRADIENT[0], textTransform: "uppercase", letterSpacing: 0.5 },
  
  registerBtn: { backgroundColor: "#0F172A", height: 54, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 15, shadowColor: "#0F172A", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  registerBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  footerLinks: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 10, marginBottom: 10 },
  footerText: { color: "#64748B", fontSize: 14, fontWeight: "500" },
  linkText: { color: BRAND_GRADIENT[0], fontSize: 14, fontWeight: "800" },
});