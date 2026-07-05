import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { useStats } from "@/hooks/useStats";
import { useTeams } from "@/hooks/useTeams";

type RankingTab = "teams" | "players";

type TeamRankingItem = {
  id: string;
  name: string;
  category?: string | null;
  logo_url?: string | null;
  color1?: string | null;
  color2?: string | null;
  games_played: number;
  games_won: number;
  games_lost: number;
  games_tied: number;
  points_for: number;
  points_against: number;
  points: number;
  score: number;
};

type PlayerRankingItem = {
  id: number;
  name: string;
  jersey_number?: number | null;
  photo_url?: string | null;
  teams?: {
    name?: string | null;
    category?: string | null;
    logo_url?: string | null;
    color1?: string | null;
  };
  touchdowns_totales?: number;
  pases_completos?: number;
  puntos_extra?: number;
  sacks?: number;
  intercepciones?: number;
  banderas_jaladas?: number;
  mvps?: number;
  score: number;
};

const FadeInView = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 420,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [delay, fadeAnim, slideAnim]);

  return <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>{children}</Animated.View>;
};

const getInitials = (name?: string | null) => {
  if (!name) return "FD";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const getRankBadge = (rank: number) => {
  if (rank === 1) return { label: "Top 1", icon: "trophy" };
  if (rank === 2) return { label: "Top 2", icon: "medal" };
  if (rank === 3) return { label: "Top 3", icon: "medal-outline" };
  return { label: `#${rank}`, icon: null };
};

const getPlayerTag = (player: PlayerRankingItem, rank: number) => {
  if (rank === 1 || (player.mvps || 0) > 0) return "MVP";
  if ((player.touchdowns_totales || 0) >= 3) return "Jugador destacado";
  return "Rising star";
};

export default function PowerRankingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useStats();
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams();
  const { data: playerStats, isLoading: playersLoading, refetch: refetchPlayers } = usePlayerStats();
  const [activeTab, setActiveTab] = useState<RankingTab>("teams");
  const [refreshing, setRefreshing] = useState(false);

  const topPad = insets.top + 10;
  const isLoading = statsLoading || teamsLoading || playersLoading;

  const teamRanking = useMemo<TeamRankingItem[]>(() => {
    const statsMap = new Map((stats || []).map((item: any) => [item.team_name, item]));

    return (teams || [])
      .map((team: any) => {
        const stat = statsMap.get(team.name) || {};
        const gamesWon = Number(stat.games_won ?? stat.wins ?? 0);
        const gamesLost = Number(stat.games_lost ?? stat.losses ?? 0);
        const gamesTied = Number(stat.games_tied ?? stat.draws ?? 0);
        const pointsFor = Number(stat.points_for ?? 0);
        const pointsAgainst = Number(stat.points_against ?? 0);
        const points = Number(stat.points ?? 0);
        const gamesPlayed = Number(stat.games_played ?? gamesWon + gamesLost + gamesTied);

        return {
          id: team.id,
          name: team.name,
          category: team.category,
          logo_url: team.logo_url,
          color1: team.color1,
          color2: team.color2,
          games_played: gamesPlayed,
          games_won: gamesWon,
          games_lost: gamesLost,
          games_tied: gamesTied,
          points_for: pointsFor,
          points_against: pointsAgainst,
          points,
          score: points * 100 + gamesWon * 10 + (pointsFor - pointsAgainst),
        };
      })
      .filter((team) => team.games_played > 0 || team.points > 0 || team.points_for > 0 || team.games_won > 0)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.games_won !== a.games_won) return b.games_won - a.games_won;
        const diffA = a.points_for - a.points_against;
        const diffB = b.points_for - b.points_against;
        if (diffB !== diffA) return diffB - diffA;
        return b.points_for - a.points_for;
      })
      .slice(0, 25);
  }, [stats, teams]);

  const playerRanking = useMemo<PlayerRankingItem[]>(() => {
    return (playerStats || [])
      .map((player: any) => {
        const mvpScore = Number(player.mvps || 0) * 1000;
        const scoringScore =
          Number(player.touchdowns_totales || 0) * 60 +
          Number(player.puntos_extra || 0) * 10;
        const passingScore = Number(player.pases_completos || 0) * 2;
        const defenseScore =
          Number(player.intercepciones || 0) * 35 +
          Number(player.sacks || 0) * 25 +
          Number(player.banderas_jaladas || 0) * 8;
        const score =
          mvpScore +
          scoringScore +
          passingScore +
          defenseScore;

        return { ...player, score };
      })
      .filter((player: PlayerRankingItem) => player.score > 0)
      .sort((a: PlayerRankingItem, b: PlayerRankingItem) => {
        if ((b.mvps || 0) !== (a.mvps || 0)) return (b.mvps || 0) - (a.mvps || 0);
        if ((b.touchdowns_totales || 0) !== (a.touchdowns_totales || 0)) {
          return (b.touchdowns_totales || 0) - (a.touchdowns_totales || 0);
        }
        if ((b.pases_completos || 0) !== (a.pases_completos || 0)) {
          return (b.pases_completos || 0) - (a.pases_completos || 0);
        }
        return b.score - a.score;
      })
      .slice(0, 25);
  }, [playerStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchTeams(), refetchPlayers()]);
    setRefreshing(false);
  };

  const rankingCount = activeTab === "teams" ? teamRanking.length : playerRanking.length;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad,
            backgroundColor: currentColors.card,
            borderBottomColor: currentColors.borderLight,
            shadowColor: isDark ? "#000" : "#475569",
          },
        ]}
      >
        <View style={styles.headerInner}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.eyebrow, { color: currentColors.textMuted }]}>FLAG DURANGO</Text>
              <Text style={[styles.title, { color: currentColors.text }]}>Power Ranking</Text>
            </View>
            <Pressable
              onPress={onRefresh}
              style={({ pressed }) => [
                styles.refreshButton,
                { backgroundColor: currentColors.bgSecondary, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Ionicons name="refresh" size={20} color={currentColors.text} />
            </Pressable>
          </View>

          <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.heroStrip}>
            <View style={styles.heroIcon}>
              <Ionicons name="podium" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>{rankingCount > 0 ? `${rankingCount} contendientes` : "Listo para datos reales"}</Text>
              <Text style={styles.heroSubtitle}>Ranking vivo con estadisticas disponibles en Supabase.</Text>
            </View>
          </LinearGradient>

          <View style={[styles.segment, { backgroundColor: currentColors.bgSecondary }]}>
            <SegmentButton
              active={activeTab === "teams"}
              icon="shield"
              label="Equipos"
              onPress={() => setActiveTab("teams")}
              colors={currentColors}
              isDark={isDark}
            />
            <SegmentButton
              active={activeTab === "players"}
              icon="people"
              label="Jugadores"
              onPress={() => setActiveTab("players")}
              colors={currentColors}
              isDark={isDark}
            />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: isTablet ? insets.bottom + 110 : insets.bottom + 90,
          },
        ]}
      >
        <View style={styles.contentInner}>
          {isLoading && !refreshing ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
            </View>
          ) : activeTab === "teams" ? (
            teamRanking.length > 0 ? (
              teamRanking.map((team, index) => (
                <FadeInView key={team.id} delay={(index % 8) * 45}>
                  <TeamRankCard team={team} rank={index + 1} colors={currentColors} isDark={isDark} />
                </FadeInView>
              ))
            ) : (
              <EmptyState
                icon="analytics-outline"
                title="Power Ranking pendiente"
                subtitle="Aun no hay resultados suficientes para ordenar equipos. Cuando existan puntos, victorias o marcadores, esta lista se activara sola."
                colors={currentColors}
              />
            )
          ) : playerRanking.length > 0 ? (
            playerRanking.map((player, index) => (
              <FadeInView key={player.id} delay={(index % 8) * 45}>
                <PlayerRankCard player={player} rank={index + 1} colors={currentColors} isDark={isDark} />
              </FadeInView>
            ))
          ) : (
            <EmptyState
              icon="person-add-outline"
              title="Jugadores por conectar"
              subtitle="No hay estadisticas acumuladas suficientes para crear ranking de jugadores. La estructura ya queda lista para datos reales."
              colors={currentColors}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SegmentButton({ active, icon, label, onPress, colors, isDark }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segmentButton,
        active && [styles.segmentButtonActive, { backgroundColor: colors.card, shadowColor: isDark ? "#000" : "#475569" }],
      ]}
    >
      <Ionicons name={active ? icon : `${icon}-outline`} size={18} color={active ? BRAND_GRADIENT[0] : colors.textSecondary} />
      <Text style={[styles.segmentText, { color: active ? colors.text : colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function TeamRankCard({ team, rank, colors, isDark }: { team: TeamRankingItem; rank: number; colors: any; isDark: boolean }) {
  const isLeader = rank === 1;
  const badge = getRankBadge(rank);
  const diff = team.points_for - team.points_against;
  const record = `${team.games_won}-${team.games_lost}${team.games_tied ? `-${team.games_tied}` : ""}`;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/team/[id]", params: { id: team.id } })}
      style={({ pressed }) => [
        styles.rankCard,
        isLeader && styles.rankCardLeader,
        {
          backgroundColor: colors.card,
          borderColor: isLeader ? BRAND_GRADIENT[0] : colors.borderLight,
          shadowColor: isLeader ? BRAND_GRADIENT[0] : isDark ? "#000" : "#475569",
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {isLeader && <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.leaderBar} />}
      <View style={styles.rankLeft}>
        <View style={[styles.positionBadge, rank <= 3 && { backgroundColor: colors.text }]}>
          {badge.icon ? (
            <Ionicons name={badge.icon as any} size={16} color={rank <= 3 ? colors.bg : colors.textMuted} />
          ) : (
            <Text style={[styles.positionText, { color: colors.textSecondary }]}>{rank}</Text>
          )}
        </View>
        <View style={[styles.logoWrap, { backgroundColor: team.color1 || colors.bgSecondary, borderColor: colors.borderLight }]}>
          {team.logo_url ? (
            <Image source={{ uri: team.logo_url }} style={styles.logo} resizeMode="contain" />
          ) : (
            <Text style={styles.logoInitials}>{getInitials(team.name)}</Text>
          )}
        </View>
      </View>

      <View style={styles.rankInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
            {team.name}
          </Text>
          {rank <= 3 && (
            <View style={[styles.smallBadge, { backgroundColor: colors.bgSecondary }]}>
              <Text style={[styles.smallBadgeText, { color: BRAND_GRADIENT[0] }]}>{badge.label}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.itemSub, { color: colors.textSecondary }]} numberOfLines={1}>
          {team.category?.replace("-", " ").toUpperCase() || "SIN CATEGORIA"} · Record {record}
        </Text>
        <View style={styles.statRow}>
          <Metric label="PTS" value={team.points} colors={colors} featured />
          <Metric label="PF" value={team.points_for} colors={colors} />
          <Metric label="PC" value={team.points_against} colors={colors} />
          <Metric label="DIF" value={diff > 0 ? `+${diff}` : diff} colors={colors} />
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function PlayerRankCard({ player, rank, colors, isDark }: { player: PlayerRankingItem; rank: number; colors: any; isDark: boolean }) {
  const isLeader = rank === 1;
  const badge = getRankBadge(rank);
  const tag = getPlayerTag(player, rank);
  const hasPhoto = !!player.photo_url && !player.photo_url?.startsWith("blob:");
  const photoUrl = player.photo_url as string;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/player/[id]", params: { id: player.id } })}
      style={({ pressed }) => [
        styles.rankCard,
        isLeader && styles.rankCardLeader,
        {
          backgroundColor: colors.card,
          borderColor: isLeader ? BRAND_GRADIENT[1] : colors.borderLight,
          shadowColor: isLeader ? BRAND_GRADIENT[1] : isDark ? "#000" : "#475569",
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {isLeader && <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.leaderBar} />}
      <View style={styles.rankLeft}>
        <View style={[styles.positionBadge, rank <= 3 && { backgroundColor: colors.text }]}>
          {badge.icon ? (
            <Ionicons name={badge.icon as any} size={16} color={rank <= 3 ? colors.bg : colors.textMuted} />
          ) : (
            <Text style={[styles.positionText, { color: colors.textSecondary }]}>{rank}</Text>
          )}
        </View>
        <View style={[styles.avatarWrap, { backgroundColor: colors.bgSecondary, borderColor: colors.borderLight }]}>
          {hasPhoto ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <Text style={[styles.avatarInitials, { color: colors.text }]}>{getInitials(player.name)}</Text>
          )}
          {player.teams?.logo_url && (
            <View style={[styles.teamMini, { borderColor: colors.card }]}>
              <Image source={{ uri: player.teams.logo_url }} style={styles.teamMiniLogo} resizeMode="contain" />
            </View>
          )}
        </View>
      </View>

      <View style={styles.rankInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
            {player.name}
          </Text>
          <View style={[styles.smallBadge, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.smallBadgeText, { color: BRAND_GRADIENT[1] }]}>{tag}</Text>
          </View>
        </View>
        <Text style={[styles.itemSub, { color: colors.textSecondary }]} numberOfLines={1}>
          {player.teams?.name || "Equipo pendiente"}
          {player.jersey_number ? ` · #${player.jersey_number}` : ""}
        </Text>
        <View style={styles.statRow}>
          <Metric label="MVP" value={player.mvps || 0} colors={colors} featured />
          <Metric label="TD" value={player.touchdowns_totales || 0} colors={colors} />
          <Metric label="QB" value={player.pases_completos || 0} colors={colors} />
          <Metric label="SACK" value={player.sacks || 0} colors={colors} />
          <Metric label="INT" value={player.intercepciones || 0} colors={colors} />
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function Metric({ label, value, colors, featured = false }: { label: string; value: string | number; colors: any; featured?: boolean }) {
  return (
    <View style={[styles.metric, { backgroundColor: featured ? `${BRAND_GRADIENT[0]}18` : colors.bgSecondary }]}>
      <Text style={[styles.metricValue, { color: featured ? BRAND_GRADIENT[0] : colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function EmptyState({ icon, title, subtitle, colors }: { icon: any; title: string; subtitle: string; colors: any }) {
  return (
    <FadeInView delay={100}>
      <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name={icon} size={42} color={BRAND_GRADIENT[0]} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    elevation: 8,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  headerInner: { width: "100%", maxWidth: 800, alignSelf: "center", paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 1.2, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: "900" },
  refreshButton: { width: 42, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  heroStrip: { minHeight: 86, borderRadius: 24, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 14 },
  heroIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginRight: 14 },
  heroTextBlock: { flex: 1 },
  heroTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", marginBottom: 4 },
  heroSubtitle: { color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  segment: { flexDirection: "row", padding: 6, borderRadius: 18, gap: 6 },
  segmentButton: { flex: 1, height: 44, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  segmentButtonActive: { elevation: 3, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  segmentText: { fontSize: 13, fontWeight: "900" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 18 },
  contentInner: { width: "100%", maxWidth: 800, alignSelf: "center" },
  loadingWrap: { paddingVertical: 60 },
  rankCard: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 3,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  rankCardLeader: { paddingTop: 18, elevation: 8, shadowOpacity: 0.14, shadowRadius: 18 },
  leaderBar: { position: "absolute", top: 0, left: 0, right: 0, height: 5 },
  rankLeft: { flexDirection: "row", alignItems: "center", marginRight: 14 },
  positionBadge: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginRight: 10 },
  positionText: { fontSize: 13, fontWeight: "900" },
  logoWrap: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1 },
  logo: { width: "100%", height: "100%" },
  logoInitials: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  avatarWrap: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  avatar: { width: "100%", height: "100%", borderRadius: 29 },
  avatarInitials: { fontSize: 16, fontWeight: "900" },
  teamMini: { position: "absolute", bottom: -2, right: -3, width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 2, padding: 2 },
  teamMiniLogo: { width: "100%", height: "100%" },
  rankInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  itemName: { flex: 1, fontSize: 16, fontWeight: "900" },
  itemSub: { fontSize: 12, fontWeight: "700", marginBottom: 10 },
  smallBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  smallBadgeText: { fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  statRow: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  metric: { minWidth: 48, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, alignItems: "center" },
  metricValue: { fontSize: 14, fontWeight: "900" },
  metricLabel: { fontSize: 9, fontWeight: "900", marginTop: 2 },
  emptyCard: { borderWidth: 1, borderStyle: "dashed", borderRadius: 30, alignItems: "center", paddingHorizontal: 24, paddingVertical: 52, marginTop: 26 },
  emptyIcon: { width: 82, height: 82, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontWeight: "600", lineHeight: 22, textAlign: "center", maxWidth: 420 },
});
