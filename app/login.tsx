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
  useColorScheme,
  useWindowDimensions // <-- Importamos para responsividad
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_GRADIENT, Colors } from "@/constants/colors"; 

const BASE_URL = "https://www.flagdurango.com.mx"; 

export default function LoginScreen() {
  const router = useRouter();
  
  // 🔥 Detección de Tablet 🔥
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

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

      if (data.user) {
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
        await AsyncStorage.setItem("userSession", JSON.stringify(data.user));
        
        if (data.user.role === "coach") {
          router.replace("/(coach)/dashboard");
        } else if (data.user.role === "admin") {
          router.replace("/admin");
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
      
      {/* Fondo Superior (Gradiente) */}
      <LinearGradient 
        colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} 
        style={[styles.topBackground, isTablet && { height: "50%" }]}
      >
        <Image 
          source={{ uri: "https://www.flagdurango.com.mx/images/logo-flag-durango.png" }} 
          style={styles.logo} 
          resizeMode="contain" 
        />
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        {/* 🔥 Si es tablet, centramos el contenido verticalmente. Si es celular, lo empujamos abajo 🔥 */}
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, isTablet && { justifyContent: 'center' }]} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
        >
          
          <View style={[
            styles.card, 
            { 
              backgroundColor: currentColors.bg, 
              shadowColor: theme === 'dark' ? '#000' : '#334155',
              borderColor: currentColors.borderLight
            },
            // 🔥 Magia Responsiva: Limita el ancho y redondea todo en tablets 🔥
            isTablet && {
              maxWidth: 480,
              width: "100%",
              alignSelf: 'center',
              borderRadius: 36,
              borderWidth: 1,
              minHeight: 'auto',
              paddingVertical: 50,
              elevation: 10,
              shadowOpacity: 0.15,
              shadowRadius: 30,
              shadowOffset: { width: 0, height: 10 }
            }
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
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={currentColors.textMuted} />
                  </Pressable>
                </View>
              </View>

              <Pressable 
                style={({ pressed }) => [styles.loginBtn, { opacity: pressed ? 0.8 : 1 }]} 
                onPress={handleLogin} 
                disabled={loading}
              >
                <LinearGradient 
                  colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} 
                  start={{x: 0, y: 0}} end={{x: 1, y: 1}} 
                  style={styles.loginBtnGradient}
                >
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loginBtnText}>Iniciar Sesión</Text>}
                </LinearGradient>
              </Pressable>

              <View style={styles.footerLinks}>
                <Text style={[styles.footerText, { color: currentColors.textSecondary }]}>¿No tienes cuenta?</Text>
                <Pressable onPress={() => router.push("/register")}>
                  <Text style={styles.linkText}>Regístrate aquí</Text>
                </Pressable>
              </View>
              
              <Pressable onPress={() => router.push("/forgot-password")} style={{ marginTop: 5, alignItems: "center" }}>
               <Text style={[styles.forgotText, { color: currentColors.textSecondary }]}>¿Olvidaste tu contraseña?</Text>
              </Pressable>

              <Pressable
                style={styles.backBtn}
                onPress={() => router.replace("/")}
              >
                <View style={[styles.backBtnCircle, { backgroundColor: currentColors.bgSecondary }]}>
                  <Ionicons name="arrow-back" size={16} color={currentColors.text} />
                </View>
                <Text style={[styles.backBtnText, { color: currentColors.textSecondary }]}>Volver al Inicio</Text>
              </Pressable>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  topBackground: { height: "45%", width: "100%", position: "absolute", top: 0, justifyContent: "center", alignItems: "center", paddingBottom: 50 },
  logo: { width: 220, height: 80, tintColor: "#FFFFFF" },
  
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "flex-end" },
  
  // Diseño de la tarjeta base (Celular)
  card: { 
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40, 
    padding: 32, 
    paddingTop: 45, 
    minHeight: "70%", 
    shadowOpacity: 0.1, 
    shadowRadius: 20, 
    elevation: 15,
    borderWidth: 1,
    borderBottomWidth: 0 // Evita borde abajo en celulares
  },
  
  header: { marginBottom: 35, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: "600", textAlign: 'center' },
  
  form: { gap: 22 },
  inputGroup: { gap: 10 },
  label: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginLeft: 4 },
  inputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 20, paddingHorizontal: 18, height: 60 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: "600", height: "100%" },
  eyeIcon: { padding: 5, paddingRight: 0 },
  
  // Botón Principal
  loginBtn: { borderRadius: 20, marginTop: 10, overflow: 'hidden', elevation: 4, shadowColor: BRAND_GRADIENT[0], shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  loginBtnGradient: { height: 60, justifyContent: "center", alignItems: "center" },
  loginBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
  
  footerLinks: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 15 },
  footerText: { fontSize: 14, fontWeight: "600" },
  linkText: { color: BRAND_GRADIENT[0], fontSize: 14, fontWeight: "900" },
  forgotText: { fontSize: 13, fontWeight: "700" },
  
  // Botón Volver
  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 25 },
  backBtnCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 14, fontWeight: "800" },
});