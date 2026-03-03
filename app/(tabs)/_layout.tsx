import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { BRAND_GRADIENT } from "@/constants/colors";

export default function TabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // El color de la pestaña activa tomará tu color principal
        tabBarActiveTintColor: BRAND_GRADIENT[0], 
        // Color de las pestañas inactivas (Gris Premium)
        tabBarInactiveTintColor: "#94A3B8", 
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#FFFFFF", // Fondo blanco
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0", // Borde sutil
          elevation: 10,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          height: isWeb ? 84 : (isIOS ? 88 : 70),
          paddingBottom: isIOS ? 28 : 10,
          paddingTop: 10,
        },
        tabBarBackground: () =>
          isIOS ? (
            // Efecto cristalino claro en iOS
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            // Fondo sólido en Android/Web
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }]} />
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
            // Aquí está el balón de americano
            <Ionicons name={focused ? "american-football" : "american-football-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: "Estadísticas", // Regresamos el nombre a Estadísticas
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}