import React, { useEffect, useRef, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ImageBackground, 
  Pressable, 
  Animated,
  StatusBar,
  Image,
  ActivityIndicator,
  useWindowDimensions
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // 🔥 Detección de Tablet 🔥
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [isChecking, setIsChecking] = useState(true);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await AsyncStorage.getItem("userSession");
        if (session) {
          router.replace("/(tabs)/");
        } else {
          setIsChecking(false);
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 800,
              delay: 100, 
              useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
              toValue: 0,
              tension: 50,
              friction: 7,
              delay: 100,
              useNativeDriver: true,
            })
          ]).start();
        }
      } catch (error) {
        setIsChecking(false);
      }
    };

    checkSession();
  }, []);

  if (isChecking) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* IMAGEN HERO: Cubre el 100% de la pantalla, sea tablet o celular */}
      <ImageBackground 
        source={{ uri: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?q=80&w=2000&auto=format&fit=crop" }} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* DEGRADADO OSCURO (NTC STYLE) */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)', '#000000']}
          locations={[0, 0.45, 0.95]}
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
            {/* 🔥 CONTENEDOR CENTRALIZADO (EVITA ESTIRAMIENTO EN TABLETS) 🔥 */}
            <View style={styles.tabletWrapper}>
              
              {/* Logo de la liga */}
              <Image 
                source={{ uri: "https://www.flagdurango.com.mx/images/logo-flag-durango.png" }}
                style={[styles.splashLogo, isTablet && { width: 280, height: 75 }]}
                resizeMode="contain"
              />

              {/* TEXTOS */}
              <View style={styles.textContainer}>
                <Text style={[styles.headline, isTablet && { fontSize: 64, lineHeight: 64, letterSpacing: -2 }]}>
                  ELEVA TU JUEGO.
                </Text>
                <Text style={[styles.subtitle, isTablet && { fontSize: 18, lineHeight: 28, maxWidth: '100%' }]}>
                  La comunidad oficial de Flag Football en Durango. Sigue resultados, revisa estadísticas y domina la liga.
                </Text>
              </View>

              {/* BOTONES */}
              <View style={styles.buttonContainer}>
                <Pressable 
                  style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => router.replace("/(tabs)/")}
                >
                  <Text style={styles.primaryButtonText}>ENTRAR A LA LIGA</Text>
                </Pressable>
                
                <Pressable 
                  style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.6 : 1 }]}
                  onPress={() => router.push("/login")}
                >
                  <Text style={styles.secondaryButtonText}>INICIAR SESIÓN</Text>
                </Pressable>
              </View>

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
  
  // 🔥 ESTE CONTENEDOR ES LA MAGIA PARA LAS TABLETS 🔥
  tabletWrapper: { 
    width: '100%', 
    maxWidth: 500, // Límite perfecto para botones
    alignSelf: 'center', // Lo centra en la pantalla gigante
    alignItems: 'flex-start' // Mantiene los textos alineados a la izquierda
  },

  splashLogo: { width: 220, height: 60, tintColor: '#FFF', marginBottom: 25 },
  
  textContainer: { marginBottom: 45 },
  headline: { color: '#FFFFFF', fontSize: 48, lineHeight: 48, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1.5, marginBottom: 15 },
  subtitle: { color: 'rgba(255, 255, 255, 0.75)', fontSize: 16, lineHeight: 24, fontWeight: '500', maxWidth: '90%' },
  
  buttonContainer: { gap: 16, width: '100%' },
  primaryButton: { backgroundColor: '#FFFFFF', height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', width: '100%', elevation: 5, shadowColor: "#FFF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
  primaryButtonText: { color: '#000000', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  
  secondaryButton: { backgroundColor: 'rgba(0,0,0,0.3)', height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.4)', justifyContent: 'center', alignItems: 'center', width: '100%' },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});