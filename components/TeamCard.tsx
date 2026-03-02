import React, { useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { TeamLogo } from "./TeamLogo";
import { Team } from "@/hooks/useTeams";
import C, { BRAND_GRADIENT } from "@/constants/colors";

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  const color1 = team.color1 || BRAND_GRADIENT[0];
  const color2 = team.color2 || BRAND_GRADIENT[2];

  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => router.push({ pathname: "/team/[id]", params: { id: team.id } })}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <LinearGradient
          colors={[color1 + "30", C.card, color2 + "18"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Left accent bar */}
          <LinearGradient
            colors={[color1, color2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.accentBar}
          />

          <View style={styles.content}>
            {/* Logo circle with color1 ring */}
            <View style={[styles.logoRing, { borderColor: color1 + "88" }]}>
              <View style={[styles.logoBg, { backgroundColor: color1 + "22" }]}>
                <TeamLogo logoUrl={team.logo_url} size={72} color={color1 + "44"} />
              </View>
            </View>

            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{team.name}</Text>

              <View style={styles.tagRow}>
                {team.category && (
                  <View style={[styles.catPill, { backgroundColor: color1 + "2A", borderColor: color1 + "55" }]}>
                    <Text style={[styles.catText, { color: color1 }]}>{team.category.toUpperCase()}</Text>
                  </View>
                )}
                {team.season && (
                  <View style={styles.seasonPill}>
                    <Text style={styles.seasonText}>{team.season}</Text>
                  </View>
                )}
              </View>

              <View style={styles.staffRow}>
                {team.coach_name && (
                  <View style={styles.staffItem}>
                    <Feather name="user" size={11} color={C.textMuted} />
                    <Text style={styles.staffText} numberOfLines={1}>{team.coach_name}</Text>
                  </View>
                )}
                {team.captain_name && (
                  <View style={styles.staffItem}>
                    <MaterialCommunityIcons name="star" size={11} color={C.brandOrange} />
                    <Text style={styles.staffText} numberOfLines={1}>{team.captain_name}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.chevronWrap}>
              <Feather name="chevron-right" size={18} color={color1 + "99"} />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  accentBar: {
    width: 5,
    minHeight: 90,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 14,
  },
  logoRing: {
    borderRadius: 42,
    borderWidth: 2,
    padding: 3,
  },
  logoBg: {
    borderRadius: 38,
    overflow: "hidden",
  },
  info: {
    flex: 1,
    gap: 5,
  },
  name: {
    color: C.text,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
  },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  catText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  seasonPill: {
    backgroundColor: C.cardLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  seasonText: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  staffRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  staffItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  staffText: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "500",
    maxWidth: 120,
  },
  chevronWrap: {
    paddingLeft: 4,
  },
});
