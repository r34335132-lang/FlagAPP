import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  useColorScheme 
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";

const API_BASE = "https://www.flagdurango.com.mx/api";

export default function ForgotPasswordScreen() {
  // Estados de la interfaz
  const [step, setStep] = useState<1 | 2>(1); // 1: Pedir Correo | 2: Ingresar Código y Nueva Contraseña
  const [loading, setLoading] = useState(false);

  // Estados de los datos
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  // PASO 1: Solicitar que el servidor envíe un código al correo
  const handleSendCode = async () => {
    if (!email) return Alert.alert("Error", "Ingresa tu correo electrónico.");

    setLoading(true);
    try {
      // ⚠️ Tendrás que crear este endpoint en tu servidor web
      const res = await fetch(`${API_BASE}/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        Alert.alert("Correo Enviado", "Revisa tu bandeja de entrada o spam. Te hemos enviado un código de 6 dígitos.");
        setStep(2); // Avanzamos al paso 2
      } else {
        Alert.alert("Error", data.message || "No encontramos una cuenta con ese correo.");
      }
    } catch (error) {
      Alert.alert("Error", "Problema de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // PASO 2: Verificar el código y guardar la nueva contraseña
  const handleVerifyAndReset = async () => {
    if (!verificationCode || !newPassword) return Alert.alert("Error", "Llena todos los campos.");
    if (newPassword.length < 6) return Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.");

    setLoading(true);
    try {
      // ⚠️ Tu endpoint actual debe ser modificado para requerir el código
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim(), 
          code: verificationCode.trim(), 
          newPassword 
        }),
      });
      const data = await res.json();

      if (data.success) {
        Alert.alert("¡Éxito!", "Tu contraseña ha sido restablecida de forma segura.", [
          { text: "Ir a Iniciar Sesión", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Error", data.message || "El código es incorrecto o ha expirado.");
      }
    } catch (error) {
      Alert.alert("Error", "Problema de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <Pressable 
        onPress={() => step === 2 ? setStep(1) : router.back()} 
        style={styles.backBtn}
      >
        <Ionicons name="chevron-back" size={28} color={currentColors.text} />
      </Pressable>

      <Text style={[styles.title, { color: currentColors.text }]}>
        {step === 1 ? "Recuperar Cuenta" : "Crear Contraseña"}
      </Text>
      <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>
        {step === 1 
          ? "Ingresa el correo con el que te registraste. Te enviaremos un código de seguridad para verificar tu identidad." 
          : `Ingresa el código que enviamos a ${email} y elige tu nueva contraseña.`}
      </Text>

      <View style={styles.form}>
        
        {step === 1 && (
          <>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: currentColors.card, borderColor: currentColors.border, color: currentColors.text }
              ]}
              placeholder="Correo electrónico"
              placeholderTextColor={currentColors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable style={styles.submitBtn} onPress={handleSendCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Enviar Código</Text>}
            </Pressable>
          </>
        )}

        {step === 2 && (
          <>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: currentColors.card, borderColor: currentColors.border, color: currentColors.text, fontSize: 24, textAlign: 'center', letterSpacing: 5 }
              ]}
              placeholder="000000"
              placeholderTextColor={currentColors.textMuted}
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: currentColors.card, borderColor: currentColors.border, color: currentColors.text }
              ]}
              placeholder="Nueva Contraseña"
              placeholderTextColor={currentColors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <Pressable style={styles.submitBtn} onPress={handleVerifyAndReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Actualizar Contraseña</Text>}
            </Pressable>
          </>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, paddingTop: 60 },
  backBtn: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 10 },
  subtitle: { fontSize: 15, marginBottom: 30, lineHeight: 22 },
  form: { gap: 15 },
  input: { borderWidth: 1, padding: 16, borderRadius: 12, fontSize: 16, fontWeight: '600' },
  submitBtn: { backgroundColor: BRAND_GRADIENT[0], padding: 18, borderRadius: 12, alignItems: "center", marginTop: 10 },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" }
});