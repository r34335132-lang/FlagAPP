import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BRAND_GRADIENT } from "@/constants/colors";

const API_BASE = "https://www.flagdurango.com.mx/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email || !newPassword) return Alert.alert("Error", "Llena todos los campos.");
    if (newPassword.length < 6) return Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.");

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), newPassword }),
      });
      const data = await res.json();

      if (data.success) {
        Alert.alert("¡Éxito!", "Tu contraseña ha sido restablecida.", [
          { text: "Ir a Iniciar Sesión", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Error", data.message || "No pudimos restablecer la contraseña.");
      }
    } catch (error) {
      Alert.alert("Error", "Problema de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={28} color="#0F172A" />
      </Pressable>

      <Text style={styles.title}>Restablecer Contraseña</Text>
      <Text style={styles.subtitle}>Ingresa el correo con el que te registraste y escribe tu nueva contraseña.</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Nueva Contraseña"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />

        <Pressable style={styles.submitBtn} onPress={handleReset} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Actualizar Contraseña</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 25, paddingTop: 60 },
  backBtn: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "900", color: "#0F172A", marginBottom: 10 },
  subtitle: { fontSize: 15, color: "#64748B", marginBottom: 30, lineHeight: 22 },
  form: { gap: 15 },
  input: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0", padding: 16, borderRadius: 12, fontSize: 16 },
  submitBtn: { backgroundColor: BRAND_GRADIENT[0], padding: 18, borderRadius: 12, alignItems: "center", marginTop: 10 },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" }
});