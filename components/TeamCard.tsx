import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { TeamLogo } from "./TeamLogo";
import { Team } from "@/hooks/useTeams";
import C from "@/constants/colors";

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  const color1 = team.color1 || C.primary;
  const color2 = team.color2 || C.blue;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/team/[id]", params: { id: team.id } })}
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.85 }]}
    >
      <LinearGradient
        colors={[color1 + "33", C.card, color2 + "22"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.colorBar, { backgroundColor: color1 }]} />

        <View style={styles.content}>
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={[color1 + "44", color2 + "22"]}
              style={styles.logoBg}
            >
              <TeamLogo logoUrl={team.logo_url} size={56} color={color1 + "44"} />
            </LinearGradient>
          </View>

          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{team.name}</Text>
            <View style={styles.metaRow}>
              {team.category && (
                <View style={[styles.categoryBadge, { backgroundColor: color1 + "33" }]}>
                  <Text style={[styles.categoryText, { color: color1 }]}>{team.category}</Text>
                </View>
              )}
              {team.status && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{team.status}</Text>
                </View>
              )}
            </View>
            {team.coach_name && (
              <View style={styles.coachRow}>
                <Feather name="user" size={11} color={C.textMuted} />
                <Text style={styles.coachText} numberOfLines={1}>{team.coach_name}</Text>
              </View>
            )}
          </View>

          <Feather name="chevron-right" size={18} color={C.textMuted} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 0,
  },
  colorBar: {
    width: 4,
    height: "100%",
    minHeight: 80,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingLeft: 12,
    gap: 12,
  },
  logoWrapper: {
    borderRadius: 32,
    overflow: "hidden",
  },
  logoBg: {
    padding: 4,
    borderRadius: 32,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusBadge: {
    backgroundColor: C.cardLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: C.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  coachRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  coachText: {
    color: C.textMuted,
    fontSize: 11,
  },
});
