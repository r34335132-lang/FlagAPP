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
import C, { BRAND_GRADIENT } from "@/constants/colors";

function StatBox({ value, label, color, accent }: {
  value: string | number;
  label: string;
  color?: string;
  accent?: boolean;
}) {
  return (
    <View style={[detailS.statBox, accent && detailS.statBoxAccent]}>
      <Text style={[detailS.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={detailS.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, iconColor }: {
  icon: React.ComponentProps<typeof Feather>["name"] | string;
  label: string;
  value: string;
  iconColor?: string;
}) {
  return (
    <View style={detailS.infoRow}>
      <View style={[detailS.infoIconWrap, { backgroundColor: (iconColor ?? C.primary) + "22" }]}>
        <Feather name={icon as any} size={15} color={iconColor ?? C.primary} />
      </View>
      <View style={detailS.infoText}>
        <Text style={detailS.infoLabel}>{label}</Text>
        <Text style={detailS.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: team, isLoading: teamLoading } = useTeam(id);
  const { data: games } = useMatches();
  const { data: stats } = useStats();

  const color1 = team?.color1 || BRAND_GRADIENT[0];
  const color2 = team?.color2 || BRAND_GRADIENT[2];

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
        <Skeleton width="100%" height={240} borderRadius={0} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={40} color={C.textMuted} />
        <Text style={styles.errorText}>Equipo no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Gradient Header ──────────────────────────────────────── */}
        <LinearGradient
          colors={[color1 + "F0", color2 + "C0", C.bg + "00"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: topPad + 20 }]}
        >
          {/* Dark overlay at bottom for smooth fade */}
          <LinearGradient
            colors={["transparent", C.bg]}
            style={styles.headerFade}
          />

          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { top: topPad + 12 }]}
          >
            <View style={styles.backBtnInner}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </View>
          </Pressable>

          <View style={styles.headerContent}>
            {/* Logo with ring + glow */}
            <View style={[styles.logoRing, { borderColor: "rgba(255,255,255,0.5)" }]}>
              <View style={styles.logoInner}>
                <TeamLogo logoUrl={team.logo_url} size={100} color={color1 + "44"} />
              </View>
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

        {/* ── Body ─────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* Stats Card */}
          {teamStat && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardAccent, { backgroundColor: color1 }]} />
                <Text style={styles.cardTitle}>Estadísticas</Text>
              </View>
              <View style={styles.statsGrid}>
                <StatBox
                  value={teamStat.points}
                  label="PUNTOS"
                  color={color1}
                  accent
                />
                <StatBox value={teamStat.games_played} label="PJ" />
                <StatBox value={teamStat.games_won} label="GANADOS" color={C.win} />
                <StatBox value={teamStat.games_tied} label="EMPATES" color={C.tie} />
                <StatBox value={teamStat.games_lost} label="PERDIDOS" color={C.loss} />
                {teamStat.points_for != null && (
                  <StatBox value={teamStat.points_for} label="PTS FAV" />
                )}
              </View>

              {/* Win % bar */}
              {teamStat.games_played > 0 && (
                <View style={styles.winBar}>
                  <View style={styles.winBarLabels}>
                    <Text style={styles.winBarLabel}>Efectividad</Text>
                    <Text style={styles.winBarPct}>
                      {Math.round((teamStat.games_won / teamStat.games_played) * 100)}%
                    </Text>
                  </View>
                  <View style={styles.winBarTrack}>
                    <LinearGradient
                      colors={[color1, color2]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.winBarFill,
                        { width: `${Math.round((teamStat.games_won / teamStat.games_played) * 100)}%` },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Info Card */}
          {(team.coach_name || team.captain_name || team.status) && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardAccent, { backgroundColor: color2 }]} />
                <Text style={styles.cardTitle}>Información</Text>
              </View>
              <View style={styles.infoList}>
                {team.coach_name && (
                  <InfoRow icon="user" label="Entrenador" value={team.coach_name} iconColor={C.primary} />
                )}
                {team.captain_name && (
                  <InfoRow
                    icon="star"
                    label="Capitán"
                    value={team.captain_name}
                    iconColor={C.brandOrange}
                  />
                )}
                {team.status && (
                  <InfoRow icon="activity" label="Estado" value={team.status} iconColor={C.win} />
                )}
              </View>
            </View>
          )}

          {/* Recent Matches */}
          {teamGames.length > 0 && (
            <View style={styles.matchesSection}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardAccent, { backgroundColor: BRAND_GRADIENT[1] }]} />
                <Text style={styles.cardTitle}>Partidos</Text>
              </View>
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

const detailS = StyleSheet.create({
  statBox: {
    flex: 1,
    minWidth: "28%",
    alignItems: "center",
    backgroundColor: C.bgSecondary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 4,
  },
  statBoxAccent: {
    backgroundColor: C.primary + "18",
  },
  statValue: {
    color: C.text,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statLabel: {
    color: C.textMuted,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    color: C.text,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
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
    gap: 12,
  },
  errorText: {
    color: C.textSecondary,
    fontSize: 16,
  },

  header: {
    paddingBottom: 0,
    paddingHorizontal: 20,
    minHeight: 280,
    position: "relative",
  },
  headerFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },

  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  backBtnInner: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerContent: {
    alignItems: "center",
    gap: 14,
    paddingTop: 24,
    paddingBottom: 32,
  },
  logoRing: {
    borderRadius: 60,
    borderWidth: 3,
    padding: 4,
  },
  logoInner: {
    borderRadius: 56,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  teamName: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  catBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  catBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  seasonBadge: {
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  seasonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
  },

  body: {
    padding: 16,
    gap: 14,
    marginTop: -20,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  cardTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  winBar: {
    gap: 6,
  },
  winBarLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  winBarLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  winBarPct: {
    color: C.text,
    fontSize: 11,
    fontWeight: "700",
  },
  winBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.cardLight,
    overflow: "hidden",
  },
  winBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  infoList: {
    gap: 2,
  },

  matchesSection: {
    gap: 0,
  },
});
