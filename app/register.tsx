import React, { useState } from "react";
import { 
  View, Text, StyleSheet, TextInput, Pressable, 
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert 
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BRAND_GRADIENT } from "@/constants/colors";

// 🚨 IMPORTANTE: CAMBIA ESTO POR LA IP LOCAL DE TU COMPUTADORA
const API_URL = "https://www.flagdurango.com.mx/api/auth/register"; 

const POSITIONS = ["QB", "WR", "RB", "OL", "DL", "LB", "DB", "K", "TE", "S", "CB", "C", "DE", "DT"];

export default function RegisterScreen() {
  // Datos comunes
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"player" | "coach">("player"); 
  
  // Datos específicos de jugador
  const [playerName, setPlayerName] = useState("");
  const [position, setPosition] = useState("QB");
  const [jerseyNumber, setJerseyNumber] = useState("");

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validaciones básicas
    if (!username || !email || !password || !confirmPassword) {
      return Alert.alert("Error", "Llena todos los campos básicos.");
    }
    if (password !== confirmPassword) {
      return Alert.alert("Error", "Las contraseñas no coinciden.");
    }
    if (password.length < 6) {
      return Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.");
    }

    // Validaciones de jugador (las mismas que tienes en la web)
    if (role === "player") {
      if (!playerName.trim()) {
        return Alert.alert("Error", "El nombre completo es requerido para jugadores.");
      }
      const num = parseInt(jerseyNumber, 10);
      if (!num || num < 1 || num > 99) {
        return Alert.alert("Error", "El número de jersey debe ser entre 1 y 99.");
      }
    }

    setLoading(true);

    try {
      // Construir el payload tal cual lo espera tu API de Next.js
      const payload: any = {
        username,
        email: email.trim(),
        password,
        role
      };

      if (role === "player") {
        payload.playerName = playerName.trim();
        payload.position = position;
        payload.jerseyNumber = parseInt(jerseyNumber, 10);
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.success) {
        Alert.alert("¡Registro Exitoso!", data.message || "Cuenta creada con éxito.");
        router.replace("/login");
      } else {
        Alert.alert("Error", data.message || "Error al registrar");
      }
    } catch (err) {
      Alert.alert("Error", "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        
        <Pressable style={styles.closeBtn} onPress={() => router.replace("/(tabs)/")}>
          <Ionicons name="close" size={28} color="#64748B" />
        </Pressable>

        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Ionicons name="person-add" size={32} color={BRAND_GRADIENT[0]} />
          </View>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Únete a la Liga Flag Durango</Text>
        </View>

        <View style={styles.form}>
          {/* Selector de Rol */}
          <View style={styles.roleContainer}>
            <Pressable style={[styles.roleBtn, role === "player" && styles.roleBtnActive]} onPress={() => setRole("player")}>
              <Text style={[styles.roleText, role === "player" && styles.roleTextActive]}>Soy Jugador</Text>
            </Pressable>
            <Pressable style={[styles.roleBtn, role === "coach" && styles.roleBtnActive]} onPress={() => setRole("coach")}>
              <Text style={[styles.roleText, role === "coach" && styles.roleTextActive]}>Soy Coach</Text>
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre de Usuario (Login)</Text>
            <TextInput style={styles.input} placeholder="ej. juanperez99" placeholderTextColor="#94A3B8" value={username} onChangeText={setUsername} autoCapitalize="none" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput style={styles.input} placeholder="ejemplo@correo.com" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>

          {/* ── CAMPOS EXTRA SOLO PARA JUGADORES ── */}
          {role === "player" && (
            <View style={styles.playerFieldsBox}>
              <Text style={styles.playerFieldsTitle}>Datos Deportivos</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre Completo (Real)</Text>
                <TextInput style={styles.input} placeholder="Juan Pérez Gómez" placeholderTextColor="#94A3B8" value={playerName} onChangeText={setPlayerName} />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.label}>No. Jersey</Text>
                  <TextInput style={styles.input} placeholder="1-99" placeholderTextColor="#94A3B8" keyboardType="numeric" maxLength={2} value={jerseyNumber} onChangeText={setJerseyNumber} />
                </View>
              </View>

              <Text style={styles.label}>Posición Principal</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.positionScroll} contentContainerStyle={{ gap: 8, paddingRight: 10 }}>
                {POSITIONS.map(pos => (
                  <Pressable 
                    key={pos} 
                    style={[styles.posChip, position === pos && styles.posChipActive]}
                    onPress={() => setPosition(pos)}
                  >
                    <Text style={[styles.posText, position === pos && styles.posTextActive]}>{pos}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput style={styles.input} placeholder="Mínimo 6 caracteres" placeholderTextColor="#94A3B8" value={password} onChangeText={setPassword} secureTextEntry />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Contraseña</Text>
            <TextInput style={styles.input} placeholder="Repite tu contraseña" placeholderTextColor="#94A3B8" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          </View>

          <Pressable style={styles.loginBtn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginBtnText}>{role === "player" ? "Crear Perfil Jugador" : "Registrarme como Coach"}</Text>}
          </Pressable>
          
          <Pressable onPress={() => router.push("/login")} style={styles.linkBtn}>
            <Text style={styles.linkText}>¿Ya tienes cuenta? <Text style={{color: BRAND_GRADIENT[0], fontWeight: '900'}}>Inicia Sesión</Text></Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  inner: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
  closeBtn: { position: "absolute", top: 40, right: 20, zIndex: 10, padding: 8, backgroundColor: "#FFFFFF", borderRadius: 20, elevation: 2 },
  
  header: { alignItems: "center", marginBottom: 25 },
  logoWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginBottom: 15, elevation: 3 },
  title: { fontSize: 32, fontWeight: "900", color: "#0F172A", letterSpacing: -1 },
  subtitle: { fontSize: 15, color: "#64748B", marginTop: 5 },
  
  form: { backgroundColor: "#FFFFFF", padding: 24, borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", elevation: 2 },
  
  roleContainer: { flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 12, padding: 4, marginBottom: 20 },
  roleBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  roleBtnActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  roleText: { color: "#64748B", fontWeight: "700" },
  roleTextActive: { color: "#0F172A", fontWeight: "900" },
  
  inputGroup: { marginBottom: 16 },
  rowInputs: { flexDirection: "row", alignItems: "center" },
  label: { color: "#0F172A", fontSize: 12, fontWeight: "800", marginBottom: 6, textTransform: "uppercase" },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 16, height: 50, color: "#0F172A", fontWeight: "600" },
  
  playerFieldsBox: { backgroundColor: "#F8FAFC", padding: 15, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0", borderStyle: "dashed" },
  playerFieldsTitle: { fontSize: 14, fontWeight: "900", color: BRAND_GRADIENT[0], marginBottom: 15, textTransform: "uppercase" },
  
  positionScroll: { marginBottom: 10 },
  posChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  posChipActive: { backgroundColor: BRAND_GRADIENT[0], borderColor: BRAND_GRADIENT[0] },
  posText: { fontWeight: "700", color: "#64748B" },
  posTextActive: { color: "#FFFFFF" },

  loginBtn: { backgroundColor: BRAND_GRADIENT[0], height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 10 },
  loginBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  
  linkBtn: { marginTop: 24, alignItems: "center" },
  linkText: { color: "#64748B", fontWeight: "600" },
});