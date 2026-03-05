import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Colors } from "@/constants/colors"; // <-- Importamos nuestra nueva paleta dinámica

export default function TabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  
  // 1. Detectamos si el celular está en modo claro u oscuro
  const theme = useColorScheme() ?? "light";
  
  // 2. Obtenemos el diccionario de colores para el tema actual
  const currentColors = Colors[theme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Color activo dinámico (Naranja)
        tabBarActiveTintColor: currentColors.tabIconSelected, 
        // Color inactivo dinámico (Gris clarito o gris oscuro dependiendo del tema)
        tabBarInactiveTintColor: currentColors.tabIconDefault, 
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : currentColors.card, // Fondo dinámico para Android
          borderTopWidth: 1,
          borderTopColor: currentColors.border, // Borde dinámico
          elevation: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          // En modo oscuro le damos un poco más de sombra para que resalte
          shadowOpacity: theme === "dark" ? 0.3 : 0.05, 
          shadowRadius: 10,
          height: isWeb ? 84 : (isIOS ? 88 : 70),
          paddingBottom: isIOS ? 28 : 10,
          paddingTop: 10,
        },
        tabBarBackground: () =>
          isIOS ? (
            // Efecto cristalino que cambia de claro a oscuro automáticamente en iPhone
            <BlurView intensity={80} tint={theme === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : (
            // Fondo sólido en Android/Web dinámico
            <View style={[StyleSheet.absoluteFill, { backgroundColor: currentColors.card }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: "Equipos",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "shield" : "shield-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Partidos",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "american-football" : "american-football-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: "Estadísticas",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}