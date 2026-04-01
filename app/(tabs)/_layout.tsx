import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors"; 
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function TabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  // Estado real conectado a tu sistema de login
  const [isAdmin, setIsAdmin] = useState(false);

  // Verificamos quién inició sesión en cuanto carga la aplicación
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          // Cambia "admin" por el nombre exacto del rol que usas en tu base de datos
          setIsAdmin(user.role === "admin");
        }
      } catch (error) {
        console.error("Error verificando la sesión del usuario:", error);
      }
    };

    checkUserRole();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: currentColors.tabIconSelected, 
        tabBarInactiveTintColor: currentColors.tabIconDefault, 
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : currentColors.card, 
          borderTopWidth: 1,
          borderTopColor: currentColors.border, 
          elevation: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: theme === "dark" ? 0.3 : 0.05, 
          shadowRadius: 10,
          
          height: isWeb ? 84 : (isIOS ? 88 : 65 + insets.bottom),
          paddingBottom: isIOS ? 28 : 10 + insets.bottom,
          paddingTop: 10,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint={theme === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : (
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
      
      {/* 🔥 PESTAÑA DE ADMIN (Solo visible si isAdmin es true) 🔥 */}
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: isAdmin ? "/admin" : null, // Si es un jugador normal, esta pestaña desaparece
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}