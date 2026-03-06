import React, { useEffect, useRef, useState, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ImageBackground, 
  Pressable, 
  Animated,
  StatusBar,
  Image,
  ActivityIndicator
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Estado para evitar que la pantalla "parpadee" mientras revisamos la sesión
  const [isChecking, setIsChecking] = useState(true);

  // Animaciones de entrada
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useFocusEffect(
    useCallback(() => {
      // Revisamos si el usuario ya inició sesión previamente
      AsyncStorage.getItem("userSession").then(res => {
        if (res) {
          // Si ya hay sesión, lo mandamos directo a los partidos sin mostrar el Splash
          router.replace("/(tabs)/");
        } else {
          // Si no hay sesión, quitamos el loader y disparamos la animación
          setIsChecking(false);
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 800,
              delay: 300,
              useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
              toValue: 0,
              tension: 50,
              friction: 7,
              delay: 300,
              useNativeDriver: true,
            })
          ]).start();
        }
      });
    }, [])
  );

  // Mientras verifica la sesión, mostramos un fondo negro limpio
  if (isChecking) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* StatusBar transparente para que la imagen llegue hasta arriba en Android e iOS */}
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* IMAGEN HERO: Cambia el URL por una foto chida de tu liga */}
      <ImageBackground 
        source={{ uri: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?q=80&w=2000&auto=format&fit=crop" }} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* DEGRADADO NTC STYLE: Oscuro abajo, transparente arriba */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', '#000000']}
          locations={[0, 0.4, 0.9]}
          style={styles.gradientOverlay}
        >
          <Animated.View 
            style={[
              styles.contentContainer, 
              { 
                paddingBottom: Math.max(insets.bottom + 40, 50),
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            
            {/* Logo de la liga */}
            <Image 
              source={{ uri: "https://www.flagdurango.com.mx/images/logo-flag-durango.png" }}
              style={styles.splashLogo}
              resizeMode="contain"
            />

            {/* TEXTOS */}
            <View style={styles.textContainer}>
              <Text style={styles.headline}>ELEVA TU JUEGO.</Text>
              <Text style={styles.subtitle}>
                La comunidad oficial de Flag Football en Durango. Sigue resultados, revisa estadísticas y domina la liga.
              </Text>
            </View>

            {/* BOTÓN PRINCIPAL */}
            <View style={styles.buttonContainer}>
              <Pressable 
                style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.8 : 1 }]}
                // Usamos replace para que no puedan darle "Atrás" y volver a esta pantalla
                onPress={() => router.replace("/(tabs)/")}
              >
                <Text style={styles.primaryButtonText}>ENTRAR A LA LIGA</Text>
              </Pressable>
              
              {/* Botón sutil por si quieren iniciar sesión directamente */}
              <Pressable 
                style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.6 : 1 }]}
                onPress={() => router.push("/login")}
              >
                <Text style={styles.secondaryButtonText}>INICIAR SESIÓN</Text>
              </Pressable>
            </View>
            
          </Animated.View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  gradientOverlay: { flex: 1, justifyContent: 'flex-end' },
  contentContainer: { paddingHorizontal: 25, width: '100%' },
  splashLogo: { width: 220, height: 60, tintColor: '#FFF', marginBottom: 20 },
  textContainer: { marginBottom: 40 },
  headline: { color: '#FFFFFF', fontSize: 48, lineHeight: 48, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1.5, marginBottom: 15 },
  subtitle: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 16, lineHeight: 24, fontWeight: '500', maxWidth: '90%' },
  buttonContainer: { gap: 15, width: '100%' },
  
  primaryButton: { backgroundColor: '#FFFFFF', height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', width: '100%' },
  primaryButtonText: { color: '#000000', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  
  secondaryButton: { backgroundColor: 'transparent', height: 60, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', justifyContent: 'center', alignItems: 'center', width: '100%' },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});