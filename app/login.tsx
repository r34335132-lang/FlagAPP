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
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BRAND_GRADIENT } from "@/constants/colors";

// 🚨 IMPORTANTE: CAMBIA ESTO POR LA IP LOCAL DE TU COMPUTADORA (ej: 192.168.1.75)
const API_URL = "https://www.flagdurango.com.mx/api/auth/login"; 

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Ingresa correo y contraseña");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (data.success) {
        await AsyncStorage.setItem("userSession", JSON.stringify(data.user));

        if (data.user.role === "coach") {
          router.replace("/(coach)/dashboard");
        } else if (data.user.role === "admin") {
          alert("Eres Administrador. Usa la versión web.");
          router.replace("/(tabs)/");
        } else {
          router.replace("/(player)/dashboard");
        }
      } else {
        setError(data.message || "Error de credenciales");
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <View style={styles.inner}>
        <Pressable style={styles.closeBtn} onPress={() => router.replace("/(tabs)/")}>
          <Ionicons name="close" size={28} color="#64748B" />
        </Pressable>

        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Ionicons name="american-football" size={40} color={BRAND_GRADIENT[0]} />
          </View>
          <Text style={styles.title}>Inicia Sesión</Text>
          <Text style={styles.subtitle}>Accede a tu perfil de la Liga Flag Durango.</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 5 }}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          <Pressable 
            style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.8 }]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginBtnText}>Entrar a mi Cuenta</Text>}
          </Pressable>

          {/* ── BOTÓN PARA IR A REGISTRARSE ── */}
          <Pressable style={styles.registerLink} onPress={() => router.push("/register")}>
            <Text style={styles.registerText}>¿No tienes cuenta? <Text style={styles.registerTextBold}>Regístrate aquí</Text></Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  inner: { flex: 1, padding: 24, justifyContent: "center" },
  closeBtn: { position: "absolute", top: 60, right: 20, zIndex: 10, padding: 8, backgroundColor: "#FFFFFF", borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  
  header: { alignItems: "center", marginBottom: 40 },
  logoWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginBottom: 20, shadowColor: BRAND_GRADIENT[0], shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 5 },
  title: { fontSize: 32, fontWeight: "900", color: "#0F172A", letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#64748B", textAlign: "center", paddingHorizontal: 20, lineHeight: 22 },

  form: { backgroundColor: "#FFFFFF", padding: 24, borderRadius: 24, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.04, shadowRadius: 20, elevation: 3, borderWidth: 1, borderColor: "#E2E8F0" },
  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2", padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#FECACA" },
  errorText: { color: "#EF4444", fontWeight: "600", marginLeft: 8, flex: 1 },
  
  inputGroup: { marginBottom: 20 },
  label: { color: "#0F172A", fontSize: 13, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  inputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: "#0F172A", fontSize: 16, fontWeight: "600" },

  loginBtn: { backgroundColor: BRAND_GRADIENT[0], height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 10, shadowColor: BRAND_GRADIENT[0], shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 },
  loginBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },

  registerLink: { marginTop: 24, alignItems: "center", paddingVertical: 10 },
  registerText: { color: "#64748B", fontSize: 14, fontWeight: "600" },
  registerTextBold: { color: BRAND_GRADIENT[0], fontWeight: "900" },
});