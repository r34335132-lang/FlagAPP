import React, { useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TeamLogo } from "./TeamLogo";
import { BRAND_GRADIENT } from "@/constants/colors";

export function JornadaCardLight({ game, teams }: { game?: any; teams?: any[] }) {
  const scale = useRef(new Animated.Value(1)).current;

  // Si no hay partido destacado, no mostramos nada
  if (!game) return null;

  const homeTeam = teams?.find((t) => t.name === game.home_team);
  const awayTeam = teams?.find((t) => t.name === game.away_team);

  const handlePressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  // Formatear la fecha
  const dateObj = new Date(game.game_date);
  const dateString = dateObj.toLocaleDateString("es-ES", { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 24 }}>
      <Pressable 
        onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <LinearGradient
          colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Etiqueta superior */}
          <View style={styles.badgeWrap}>
            <View style={styles.badge}>
              <Ionicons name="star" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>JUEGO DE LA SEMANA</Text>
            </View>
          </View>

          {/* Equipos y VS */}
          <View style={styles.teamsRow}>
            <View style={styles.team}>
              <View style={styles.logoWrap}>
                <TeamLogo logoUrl={homeTeam?.logo_url} size={64} />
              </View>
              <Text style={styles.teamName} numberOfLines={1}>{game.home_team}</Text>
            </View>

            <View style={styles.vsWrap}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.team}>
              <View style={styles.logoWrap}>
                <TeamLogo logoUrl={awayTeam?.logo_url} size={64} />
              </View>
              <Text style={styles.teamName} numberOfLines={1}>{game.away_team}</Text>
            </View>
          </View>

          {/* Info del partido (Fecha y Lugar) */}
          <View style={styles.footer}>
            <View style={styles.footerItem}>
              <Ionicons name="calendar" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.footerText}>{dateString} • {game.game_time.substring(0, 5)}</Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerItem}>
              <Ionicons name="location" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.footerText} numberOfLines={1}>{game.field}</Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    shadowColor: BRAND_GRADIENT[0],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  badgeWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  team: {
    flex: 1,
    alignItems: "center",
  },
  logoWrap: {
    backgroundColor: "#FFFFFF",
    padding: 4,
    borderRadius: 40,
    marginBottom: 10,
  },
  teamName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  vsWrap: {
    paddingHorizontal: 16,
  },
  vsText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 20,
    fontWeight: "900",
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingVertical: 12,
    borderRadius: 16,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  footerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  footerDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});