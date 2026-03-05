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
  Alert,
  useColorScheme
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_GRADIENT, Colors } from "@/constants/colors"; // <-- Importamos paleta dinámica

// 👇 Cambia esto por tu IP local si pruebas en tu PC
const BASE_URL = "https://www.flagdurango.com.mx"; 

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Aviso", "Por favor ingresa correo/usuario y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim(), 
          password 
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Credenciales inválidas");
      }

      // Guardamos la sesión
      if (data.user) {
        await AsyncStorage.setItem("userSession", JSON.stringify(data.user));
        
        // Redirigimos según el rol
        if (data.user.role === "coach") {
          router.replace("/(coach)/dashboard");
        } else if (data.user.role === "admin") {
          Alert.alert("Eres Admin", "Por favor usa la versión web para administrar.");
          router.replace("/");
        } else {
          router.replace("/(player)/dashboard");
        }
      }
    } catch (error: any) {
      Alert.alert("Error al iniciar sesión", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={styles.topBackground}>
        <Image 
          source={{ uri: "https://www.flagdurango.com.mx/images/logo-flag-durango.png" }} 
          style={styles.logo} 
          resizeMode="contain" 
        />
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={[
            styles.card, 
            { backgroundColor: currentColors.card, shadowColor: theme === 'dark' ? '#000' : '#0F172A' }
          ]}>
            
            <View style={styles.header}>
              <Text style={[styles.title, { color: currentColors.text }]}>Bienvenido de vuelta</Text>
              <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>Inicia sesión para ver tu gafete y stats</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentColors.textMuted }]}>Usuario o Correo</Text>
                <View style={[styles.inputContainer, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
                  <Ionicons name="person-outline" size={20} color={currentColors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: currentColors.text }]}
                    placeholder="ejemplo@correo.com"
                    placeholderTextColor={currentColors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentColors.textMuted }]}>Contraseña</Text>
                <View style={[styles.inputContainer, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={currentColors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: currentColors.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={currentColors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={currentColors.textMuted} />
                  </Pressable>
                </View>
              </View>

              <Pressable style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loginBtnText}>Iniciar Sesión</Text>}
              </Pressable>

              <View style={styles.footerLinks}>
                <Text style={[styles.footerText, { color: currentColors.textSecondary }]}>¿No tienes cuenta?</Text>
                <Pressable onPress={() => router.push("/register")}>
                  <Text style={styles.linkText}>Regístrate aquí</Text>
                </Pressable>
              </View>
              
              <Pressable onPress={() => router.push("/forgot-password")} style={{ marginTop: 15, alignItems: "center" }}>
               <Text style={{ color: BRAND_GRADIENT[0], fontWeight: "700" }}>¿Olvidaste tu contraseña?</Text>
              </Pressable>

              <Pressable style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={16} color={currentColors.textMuted} />
                <Text style={[styles.backBtnText, { color: currentColors.textSecondary }]}>Volver al Inicio</Text>
              </Pressable>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Retiramos colores fijos para que actúen los dinámicos
const styles = StyleSheet.create({
  container: { flex: 1 },
  topBackground: { height: "45%", width: "100%", position: "absolute", top: 0, justifyContent: "center", alignItems: "center", paddingBottom: 50 },
  logo: { width: 220, height: 80, tintColor: "#FFFFFF" },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "flex-end" },
  card: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 30, paddingTop: 40, minHeight: "65%", shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
  header: { marginBottom: 30 },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 6, fontWeight: "500" },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  inputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, height: 54 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: "500" },
  eyeIcon: { padding: 5 },
  loginBtn: { backgroundColor: BRAND_GRADIENT[0], height: 54, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 10, shadowColor: BRAND_GRADIENT[0], shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  loginBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  footerLinks: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 10 },
  footerText: { fontSize: 14, fontWeight: "500" },
  linkText: { color: BRAND_GRADIENT[0], fontSize: 14, fontWeight: "800" },
  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20 },
  backBtnText: { fontSize: 14, fontWeight: "700" },
});