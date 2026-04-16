import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";

const API_BASE = "https://www.flagdurango.com.mx/api";

export default function ForgotPasswordScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  // PASO 1: Solicitar que el servidor envíe un código al correo
  const handleSendCode = async () => {
    if (!email) return Alert.alert("Error", "Ingresa tu correo electrónico.");

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        Alert.alert("Correo Enviado", "Revisa tu bandeja de entrada o spam. Te hemos enviado un código de 6 dígitos.");
        setStep(2);
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={[styles.container, { backgroundColor: currentColors.bg }]}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* Envolveremos el contenido en una tarjeta limpia y centrada */}
        <View style={[
          styles.card, 
          { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: theme === 'dark' ? '#000' : '#475569' },
          isTablet && { maxWidth: 480, alignSelf: 'center', width: '100%', elevation: 15, shadowOpacity: 0.15, shadowRadius: 30 }
        ]}>
          
          <View style={styles.header}>
            <Pressable 
              onPress={() => step === 2 ? setStep(1) : router.back()} 
              style={({ pressed }) => [styles.backBtn, { backgroundColor: currentColors.bgSecondary, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="arrow-back" size={22} color={currentColors.text} />
            </Pressable>

            <View style={[styles.iconWrap, { backgroundColor: `${BRAND_GRADIENT[0]}15` }]}>
              <Ionicons name={step === 1 ? "mail-outline" : "key-outline"} size={32} color={BRAND_GRADIENT[0]} />
            </View>
          </View>

          <Text style={[styles.title, { color: currentColors.text }]}>
            {step === 1 ? "Recuperar Cuenta" : "Crear Contraseña"}
          </Text>
          <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>
            {step === 1 
              ? "Ingresa el correo con el que te registraste. Te enviaremos un código de 6 dígitos para verificar tu identidad." 
              : `Ingresa el código que enviamos a ${email} y elige tu nueva contraseña.`}
          </Text>

          <View style={styles.form}>
            
            {step === 1 && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: currentColors.textMuted }]}>Correo Electrónico</Text>
                  <View style={[styles.inputContainer, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
                    <Ionicons name="mail-outline" size={20} color={currentColors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: currentColors.text }]}
                      placeholder="ejemplo@correo.com"
                      placeholderTextColor={currentColors.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <Pressable 
                  style={({ pressed }) => [styles.submitBtn, { opacity: pressed ? 0.8 : 1 }]} 
                  onPress={handleSendCode} 
                  disabled={loading}
                >
                  <LinearGradient 
                    colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} 
                    start={{x: 0, y: 0}} end={{x: 1, y: 1}} 
                    style={styles.submitBtnGradient}
                  >
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Enviar Código</Text>}
                  </LinearGradient>
                </Pressable>
              </>
            )}

            {step === 2 && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: currentColors.textMuted, textAlign: 'center' }]}>Código de Seguridad</Text>
                  <View style={[styles.inputContainer, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, justifyContent: 'center' }]}>
                    <TextInput
                      style={[styles.input, styles.codeInput, { color: currentColors.text }]}
                      placeholder="000000"
                      placeholderTextColor={currentColors.textMuted}
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: currentColors.textMuted }]}>Nueva Contraseña</Text>
                  <View style={[styles.inputContainer, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={currentColors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: currentColors.text }]}
                      placeholder="••••••••"
                      placeholderTextColor={currentColors.textMuted}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={currentColors.textMuted} />
                    </Pressable>
                  </View>
                </View>

                <Pressable 
                  style={({ pressed }) => [styles.submitBtn, { opacity: pressed ? 0.8 : 1 }]} 
                  onPress={handleVerifyAndReset} 
                  disabled={loading}
                >
                  <LinearGradient 
                    colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} 
                    start={{x: 0, y: 0}} end={{x: 1, y: 1}} 
                    style={styles.submitBtnGradient}
                  >
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Actualizar Contraseña</Text>}
                  </LinearGradient>
                </Pressable>
              </>
            )}

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  
  card: {
    borderRadius: 36,
    padding: 30,
    borderWidth: 1,
    elevation: 4,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },

  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: "500", lineHeight: 22, marginBottom: 35 },
  
  form: { gap: 20 },
  inputGroup: { gap: 10 },
  label: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginLeft: 4 },
  
  inputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 20, paddingHorizontal: 18, height: 60 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: "600", height: "100%" },
  eyeIcon: { padding: 5, paddingRight: 0 },
  
  codeInput: { fontSize: 28, letterSpacing: 8, textAlign: 'center', fontWeight: '900' },

  submitBtn: { borderRadius: 20, marginTop: 15, overflow: 'hidden', elevation: 4, shadowColor: BRAND_GRADIENT[0], shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  submitBtnGradient: { height: 60, justifyContent: "center", alignItems: "center" },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
});