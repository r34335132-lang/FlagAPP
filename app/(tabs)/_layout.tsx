import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // <-- 1. Importamos los "insets"
import { Colors } from "@/constants/colors"; 

export default function TabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  
  // 2. Calculamos los bordes seguros del dispositivo (incluyendo los botones de Android)
  const insets = useSafeAreaInsets();
  
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

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
          
          // 3. LA MAGIA: Sumamos el "insets.bottom" a la altura y al padding en Android
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
    </Tabs>
  );
}