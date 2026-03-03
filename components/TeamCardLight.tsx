import React, { useRef } from "react";
import { View, Text, StyleSheet, Image, Pressable, Animated } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export function TeamCardLight({ team }: { team: any }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable 
        style={styles.card}
        onPress={() => router.push({ pathname: "/team/[id]", params: { id: team.id } })}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.inner}>
          <View style={[styles.logoContainer, { borderColor: team.color1 || "#E2E8F0" }]}>
            {team.logo_url ? (
              <Image source={{ uri: team.logo_url }} style={styles.logo} />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: team.color1 || "#F1F5F9" }]}>
                <Text style={styles.logoText}>{team.name?.charAt(0)}</Text>
              </View>
            )}
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{team.name}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.category}>{team.category}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, marginBottom: 12, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: "#F1F5F9" },
  inner: { padding: 16, flexDirection: "row", alignItems: "center" },
  logoContainer: { width: 56, height: 56, borderRadius: 28, marginRight: 16, overflow: "hidden", backgroundColor: "#F8FAFC", borderWidth: 2 },
  logo: { width: "100%", height: "100%", resizeMode: "cover" },
  logoPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  info: { flex: 1, justifyContent: "center" },
  name: { fontSize: 17, fontWeight: "800", color: "#0F172A", marginBottom: 6 },
  categoryBadge: { alignSelf: "flex-start", backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  category: { fontSize: 11, fontWeight: "700", color: "#475569", textTransform: "capitalize" }
});