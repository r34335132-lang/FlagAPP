import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTeam } from "@/hooks/useTeams";
import { useMatches } from "@/hooks/useMatches";
import { useStats } from "@/hooks/useStats";
import { TeamLogo } from "@/components/TeamLogo";
import { MatchCard } from "@/components/MatchCard";
import { Skeleton } from "@/components/SkeletonLoader";
import C from "@/constants/colors";

function StatBox({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <View style={detailStyles.statBox}>
      <Text style={[detailStyles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={detailStyles.statLabel}>{label}</Text>
    </View>
  );
}

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: team, isLoading: teamLoading } = useTeam(id);
  const { data: games } = useMatches();
  const { data: stats } = useStats();

  const color1 = team?.color1 || C.primary;
  const color2 = team?.color2 || C.blue;

  const teamGames = games?.filter(
    (g) =>
      g.home_team?.toLowerCase() === team?.name?.toLowerCase() ||
      g.away_team?.toLowerCase() === team?.name?.toLowerCase()
  ) ?? [];

  const teamStat = stats?.find(
    (s) => s.team_name?.toLowerCase() === team?.name?.toLowerCase()
  );

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (teamLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <Skeleton width="60%" height={24} borderRadius={6} style={{ margin: 20 }} />
        <Skeleton width="100%" height={200} borderRadius={0} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Equipo no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[color1 + "EE", color2 + "AA", C.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: topPad + 16 }]}
        >
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { top: topPad + 12 }]}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>

          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.05)"]}
                style={styles.logoBg}
              >
                <TeamLogo logoUrl={team.logo_url} size={96} color={color1 + "44"} />
              </LinearGradient>
            </View>

            <Text style={styles.teamName}>{team.name}</Text>

            <View style={styles.badgeRow}>
              {team.category && (
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{team.category}</Text>
                </View>
              )}
              {team.season && (
                <View style={styles.seasonBadge}>
                  <Text style={styles.seasonText}>{team.season}</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {teamStat && (
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Estadísticas</Text>
              <View style={styles.statsGrid}>
                <StatBox value={teamStat.points} label="Puntos" color={C.primary} />
                <StatBox value={teamStat.games_played} label="PJ" />
                <StatBox value={teamStat.games_won} label="Ganados" color={C.win} />
                <StatBox value={teamStat.games_tied} label="Empates" color={C.tie} />
                <StatBox value={teamStat.games_lost} label="Perdidos" color={C.loss} />
                {teamStat.points_for != null && (
                  <StatBox value={teamStat.points_for} label="Pts Favor" />
                )}
              </View>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Información</Text>
            {team.coach_name && (
              <View style={styles.infoRow}>
                <Feather name="user" size={16} color={C.textMuted} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Entrenador</Text>
                  <Text style={styles.infoValue}>{team.coach_name}</Text>
                </View>
              </View>
            )}
            {team.captain_name && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="star" size={16} color={C.gold} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Capitán</Text>
                  <Text style={styles.infoValue}>{team.captain_name}</Text>
                </View>
              </View>
            )}
            {team.status && (
              <View style={styles.infoRow}>
                <Feather name="activity" size={16} color={C.textMuted} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Estado</Text>
                  <Text style={styles.infoValue}>{team.status}</Text>
                </View>
              </View>
            )}
          </View>

          {teamGames.length > 0 && (
            <View style={styles.gamesSection}>
              <Text style={styles.sectionTitle}>Partidos</Text>
              {teamGames.slice(0, 5).map((game) => (
                <MatchCard key={game.id} game={game} teams={[team]} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  statBox: {
    flex: 1,
    minWidth: "30%",
    alignItems: "center",
    backgroundColor: C.bgSecondary,
    borderRadius: 12,
    padding: 12,
  },
  statValue: {
    color: C.text,
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 2,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: C.textSecondary,
    fontSize: 16,
  },
  header: {
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  headerContent: {
    alignItems: "center",
    gap: 12,
    paddingTop: 32,
  },
  logoContainer: {
    borderRadius: 56,
    overflow: "hidden",
  },
  logoBg: {
    padding: 8,
    borderRadius: 56,
  },
  teamName: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  catBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  catBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  seasonBadge: {
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  seasonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
  },
  body: {
    padding: 16,
    gap: 16,
  },
  statsCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  infoValue: {
    color: C.text,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  gamesSection: {
    gap: 0,
  },
});
