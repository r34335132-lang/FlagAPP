import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
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
import { SeasonSelector } from "@/components/SeasonSelector";
import { useSelectedSeason } from "@/hooks/useSeasons";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { useStats } from "@/hooks/useStats";
import { useTeams } from "@/hooks/useTeams";

const DASH_BG = "#F7F9FC";

const TOP_ACCENTS = {
  1: { bg: "#FFFBEB", bgDark: "rgba(245,158,11,0.15)", color: "#F59E0B", label: "Oro" },
  2: { bg: "#F8FAFC", bgDark: "rgba(148,163,184,0.15)", color: "#94A3B8", label: "Plata" },
  3: { bg: "#FFF7ED", bgDark: "rgba(217,119,6,0.15)", color: "#D97706", label: "Bronce" },
} as const;

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

const softShadow = Platform.select({
  ios: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
  default: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
});

const FadeInView = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 380,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [delay, fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

const getInitials = (name?: string | null) => {
  if (!name) return "FD";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const getPlayerTag = (player: PlayerRankingItem, rank: number) => {
  if (rank === 1 || (player.mvps || 0) > 0) return "MVP";
  if ((player.touchdowns_totales || 0) >= 3) return "Destacado";
  return "Rising";
};

function ProgressBar({
  value,
  max,
  color,
  trackColor,
}: {
  value: number;
  max: number;
  color: string;
  trackColor: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View style={[styles.barTrack, { backgroundColor: trackColor }]}>
      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

export default function PowerRankingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";
  const screenBg = isDark ? currentColors.bg : DASH_BG;

  const { selectedSeasonId } = useSelectedSeason();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useStats(selectedSeasonId);
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams(selectedSeasonId);
  const { data: playerStats, isLoading: playersLoading, refetch: refetchPlayers } = usePlayerStats(selectedSeasonId);
  const [activeTab, setActiveTab] = useState<RankingTab>("teams");
  const [refreshing, setRefreshing] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 20 : 10);
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
          Number(player.touchdowns_totales || 0) * 60 + Number(player.puntos_extra || 0) * 10;
        const passingScore = Number(player.pases_completos || 0) * 2;
        const defenseScore =
          Number(player.intercepciones || 0) * 35 +
          Number(player.sacks || 0) * 25 +
          Number(player.banderas_jaladas || 0) * 8;
        const score = mvpScore + scoringScore + passingScore + defenseScore;

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
  const maxTeamScore = useMemo(
    () => Math.max(1, ...teamRanking.map((t) => t.score || 0)),
    [teamRanking]
  );
  const maxPlayerScore = useMemo(
    () => Math.max(1, ...playerRanking.map((p) => p.score || 0)),
    [playerRanking]
  );

  const leaderName =
    activeTab === "teams"
      ? teamRanking[0]?.name
      : playerRanking[0]?.name;

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: screenBg }]}>
        <View style={styles.headerInner}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.eyebrow, { color: currentColors.textMuted }]}>FLAG DURANGO</Text>
              <Text style={[styles.screenTitle, { color: currentColors.text }]}>Power Ranking</Text>
            </View>
            <Pressable
              onPress={onRefresh}
              hitSlop={8}
              style={({ pressed }) => [
                styles.refreshButton,
                softShadow,
                {
                  backgroundColor: currentColors.card,
                  borderColor: currentColors.borderLight,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons name="refresh" size={18} color={currentColors.textSecondary} />
            </Pressable>
          </View>

          <SeasonSelector compact style={styles.seasonSelector} />

          <LinearGradient
            colors={isDark ? ["#1A2440", "#141C2E"] : ["#FFFFFF", "#F0F5FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, softShadow, { borderColor: currentColors.borderLight }]}
          >
            <View style={styles.heroTop}>
              <View style={[styles.heroIcon, { backgroundColor: `${BRAND_GRADIENT[0]}14` }]}>
                <Ionicons name="podium-outline" size={18} color={BRAND_GRADIENT[0]} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.heroTitle, { color: currentColors.text }]} numberOfLines={1}>
                  {rankingCount > 0 ? `${rankingCount} contendientes` : "Sin datos aún"}
                </Text>
                <Text style={[styles.heroSubtitle, { color: currentColors.textSecondary }]} numberOfLines={1}>
                  {leaderName ? `Líder: ${leaderName}` : "Ranking con estadísticas de temporada"}
                </Text>
              </View>
            </View>
            <View style={styles.miniStatsRow}>
              <MiniStat
                label="Equipos"
                value={teamRanking.length}
                colors={currentColors}
              />
              <View style={[styles.miniDivider, { backgroundColor: currentColors.borderLight }]} />
              <MiniStat
                label="Jugadores"
                value={playerRanking.length}
                colors={currentColors}
              />
              <View style={[styles.miniDivider, { backgroundColor: currentColors.borderLight }]} />
              <MiniStat
                label="Top score"
                value={
                  activeTab === "teams"
                    ? teamRanking[0]?.score ?? "—"
                    : playerRanking[0]?.score ?? "—"
                }
                colors={currentColors}
                accent
              />
            </View>
          </LinearGradient>

          <View style={[styles.toggleWrap, softShadow, { backgroundColor: currentColors.card }]}>
            <Pressable
              style={[styles.toggleBtn, activeTab === "teams" && { backgroundColor: BRAND_GRADIENT[0] }]}
              onPress={() => setActiveTab("teams")}
            >
              <Ionicons
                name="shield"
                size={15}
                color={activeTab === "teams" ? "#FFF" : currentColors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  { color: activeTab === "teams" ? "#FFF" : currentColors.textSecondary },
                ]}
              >
                Equipos
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, activeTab === "players" && { backgroundColor: BRAND_GRADIENT[0] }]}
              onPress={() => setActiveTab("players")}
            >
              <Ionicons
                name="people"
                size={15}
                color={activeTab === "players" ? "#FFF" : currentColors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  { color: activeTab === "players" ? "#FFF" : currentColors.textSecondary },
                ]}
              >
                Jugadores
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isTablet ? insets.bottom + 100 : insets.bottom + 88 },
        ]}
      >
        <View style={styles.contentInner}>
          {isLoading && !refreshing ? (
            <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} style={{ marginTop: 48 }} />
          ) : activeTab === "teams" ? (
            teamRanking.length > 0 ? (
              <View style={styles.listGap}>
                {teamRanking.map((team, index) => (
                  <FadeInView key={team.id} delay={(index % 8) * 40}>
                    <TeamRankCard
                      team={team}
                      rank={index + 1}
                      maxScore={maxTeamScore}
                      colors={currentColors}
                      isDark={isDark}
                    />
                  </FadeInView>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="analytics-outline"
                title="Power Ranking pendiente"
                subtitle="Aún no hay resultados suficientes para ordenar equipos. Cuando existan puntos, victorias o marcadores, esta lista se activará sola."
                colors={currentColors}
              />
            )
          ) : playerRanking.length > 0 ? (
            <View style={styles.listGap}>
              {playerRanking.map((player, index) => (
                <FadeInView key={player.id} delay={(index % 8) * 40}>
                  <PlayerRankCard
                    player={player}
                    rank={index + 1}
                    maxScore={maxPlayerScore}
                    colors={currentColors}
                    isDark={isDark}
                  />
                </FadeInView>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="person-add-outline"
              title="Jugadores por conectar"
              subtitle="No hay estadísticas acumuladas suficientes para crear ranking de jugadores. La estructura ya queda lista para datos reales."
              colors={currentColors}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function MiniStat({
  label,
  value,
  colors,
  accent = false,
}: {
  label: string;
  value: string | number;
  colors: any;
  accent?: boolean;
}) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatValue, { color: accent ? BRAND_GRADIENT[0] : colors.text }]}>
        {value}
      </Text>
      <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function TeamRankCard({
  team,
  rank,
  maxScore,
  colors,
  isDark,
}: {
  team: TeamRankingItem;
  rank: number;
  maxScore: number;
  colors: any;
  isDark: boolean;
}) {
  const accent = TOP_ACCENTS[rank as 1 | 2 | 3];
  const diff = team.points_for - team.points_against;
  const record = `${team.games_won}-${team.games_lost}${team.games_tied ? `-${team.games_tied}` : ""}`;
  const hasLogo = !!team.logo_url && !team.logo_url.startsWith("blob:");

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/team/[id]", params: { id: team.id } })}
      style={({ pressed }) => [
        styles.rankCard,
        softShadow,
        {
          backgroundColor: colors.card,
          borderColor: accent ? `${accent.color}55` : colors.borderLight,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.rankCardTop}>
        <View
          style={[
            styles.positionBadge,
            {
              backgroundColor: accent
                ? isDark
                  ? accent.bgDark
                  : accent.bg
                : colors.bgSecondary,
            },
          ]}
        >
          <Text style={[styles.positionText, { color: accent ? accent.color : colors.textMuted }]}>
            {rank}
          </Text>
        </View>

        <View
          style={[
            styles.logoWrap,
            { backgroundColor: team.color1 || colors.bgSecondary },
          ]}
        >
          {hasLogo ? (
            <Image source={{ uri: team.logo_url as string }} style={styles.logo} resizeMode="contain" />
          ) : (
            <Text style={styles.logoInitials}>{getInitials(team.name)}</Text>
          )}
        </View>

        <View style={styles.rankInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
              {team.name}
            </Text>
            {accent && (
              <View style={[styles.topChip, { backgroundColor: isDark ? accent.bgDark : accent.bg }]}>
                <Text style={[styles.topChipText, { color: accent.color }]}>{accent.label}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.itemSub, { color: colors.textMuted }]} numberOfLines={1}>
            {team.category?.replace("-", " ").toUpperCase() || "SIN CATEGORÍA"} · {record}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricBlock}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{team.points}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>PTS</Text>
        </View>
        <View style={styles.metricBlock}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{team.points_for}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>PF</Text>
        </View>
        <View style={styles.metricBlock}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{team.points_against}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>PC</Text>
        </View>
        <View style={styles.metricBlock}>
          <Text
            style={[
              styles.metricValue,
              {
                color:
                  diff > 0 ? Colors.light.green : diff < 0 ? Colors.light.loss : colors.textMuted,
              },
            ]}
          >
            {diff > 0 ? `+${diff}` : diff}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>DIF</Text>
        </View>
      </View>

      <View style={styles.scoreBarWrap}>
        <View style={styles.scoreBarHeader}>
          <Text style={[styles.scoreBarLabel, { color: colors.textMuted }]}>Score relativo</Text>
          <Text style={[styles.scoreBarNum, { color: BRAND_GRADIENT[0] }]}>{team.score}</Text>
        </View>
        <ProgressBar
          value={team.score}
          max={maxScore}
          color={accent?.color || BRAND_GRADIENT[0]}
          trackColor={colors.bgSecondary}
        />
      </View>
    </Pressable>
  );
}

function PlayerRankCard({
  player,
  rank,
  maxScore,
  colors,
  isDark,
}: {
  player: PlayerRankingItem;
  rank: number;
  maxScore: number;
  colors: any;
  isDark: boolean;
}) {
  const accent = TOP_ACCENTS[rank as 1 | 2 | 3];
  const tag = getPlayerTag(player, rank);
  const hasPhoto = !!player.photo_url && !player.photo_url?.startsWith("blob:");
  const photoUrl = player.photo_url as string;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/player/[id]", params: { id: player.id } })}
      style={({ pressed }) => [
        styles.rankCard,
        softShadow,
        {
          backgroundColor: colors.card,
          borderColor: accent ? `${accent.color}55` : colors.borderLight,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.rankCardTop}>
        <View
          style={[
            styles.positionBadge,
            {
              backgroundColor: accent
                ? isDark
                  ? accent.bgDark
                  : accent.bg
                : colors.bgSecondary,
            },
          ]}
        >
          <Text style={[styles.positionText, { color: accent ? accent.color : colors.textMuted }]}>
            {rank}
          </Text>
        </View>

        <View style={styles.avatarWrap}>
          {hasPhoto ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: colors.bgSecondary,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Text style={[styles.avatarInitials, { color: colors.textMuted }]}>
                {getInitials(player.name)}
              </Text>
            </View>
          )}
          {player.teams?.logo_url && !player.teams.logo_url.startsWith("blob:") && (
            <View style={[styles.teamMini, { borderColor: colors.card, backgroundColor: colors.card }]}>
              <Image
                source={{ uri: player.teams.logo_url }}
                style={styles.teamMiniLogo}
                resizeMode="contain"
              />
            </View>
          )}
        </View>

        <View style={styles.rankInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
              {player.name}
            </Text>
            <View
              style={[
                styles.topChip,
                {
                  backgroundColor: accent
                    ? isDark
                      ? accent.bgDark
                      : accent.bg
                    : colors.bgSecondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.topChipText,
                  { color: accent ? accent.color : BRAND_GRADIENT[0] },
                ]}
              >
                {accent ? accent.label : tag}
              </Text>
            </View>
          </View>
          <Text style={[styles.itemSub, { color: colors.textMuted }]} numberOfLines={1}>
            {player.teams?.name || "Equipo pendiente"}
            {player.jersey_number ? ` · #${player.jersey_number}` : ""}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricBlock}>
          <Text style={[styles.metricValue, { color: BRAND_GRADIENT[0] }]}>{player.mvps || 0}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>MVP</Text>
        </View>
        <View style={styles.metricBlock}>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {player.touchdowns_totales || 0}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>TD</Text>
        </View>
        <View style={styles.metricBlock}>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {player.pases_completos || 0}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>QB</Text>
        </View>
        <View style={styles.metricBlock}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{player.sacks || 0}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>SACK</Text>
        </View>
        <View style={styles.metricBlock}>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {player.intercepciones || 0}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>INT</Text>
        </View>
      </View>

      <View style={styles.scoreBarWrap}>
        <View style={styles.scoreBarHeader}>
          <Text style={[styles.scoreBarLabel, { color: colors.textMuted }]}>Score relativo</Text>
          <Text style={[styles.scoreBarNum, { color: BRAND_GRADIENT[0] }]}>{player.score}</Text>
        </View>
        <ProgressBar
          value={player.score}
          max={maxScore}
          color={accent?.color || BRAND_GRADIENT[0]}
          trackColor={colors.bgSecondary}
        />
      </View>
    </Pressable>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  colors,
}: {
  icon: any;
  title: string;
  subtitle: string;
  colors: any;
}) {
  return (
    <FadeInView delay={80}>
      <View
        style={[
          styles.emptyCard,
          softShadow,
          { backgroundColor: colors.card, borderColor: colors.borderLight },
        ]}
      >
        <View style={[styles.emptyIcon, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name={icon} size={36} color={colors.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { zIndex: 10, paddingBottom: 4 },
  headerInner: { width: "100%", maxWidth: 800, alignSelf: "center" },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  seasonSelector: { paddingHorizontal: 20, marginTop: 10 },

  heroCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  heroSubtitle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  miniStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniStat: { flex: 1, alignItems: "center" },
  miniStatValue: { fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  miniStatLabel: { fontSize: 10, fontWeight: "700", marginTop: 2, letterSpacing: 0.3 },
  miniDivider: { width: 1, height: 28 },

  toggleWrap: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 16,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  toggleText: { fontSize: 13, fontWeight: "800" },

  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  contentInner: { width: "100%", maxWidth: 800, alignSelf: "center" },
  listGap: { gap: 12 },

  rankCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  rankCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  positionBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  positionText: { fontSize: 13, fontWeight: "900" },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: { width: "100%", height: "100%" },
  logoInitials: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  avatarWrap: { width: 44, height: 44 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarInitials: { fontSize: 13, fontWeight: "800" },
  teamMini: {
    position: "absolute",
    bottom: -2,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    overflow: "hidden",
    padding: 1,
  },
  teamMiniLogo: { width: "100%", height: "100%" },
  rankInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemName: { flex: 1, fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  itemSub: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  topChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  topChipText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },

  metricsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  metricBlock: { flex: 1, alignItems: "center" },
  metricValue: { fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  metricLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5, marginTop: 2 },

  scoreBarWrap: { gap: 6 },
  scoreBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreBarLabel: { fontSize: 10, fontWeight: "700" },
  scoreBarNum: { fontSize: 12, fontWeight: "800" },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },

  emptyCard: {
    alignItems: "center",
    paddingVertical: 48,
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 420,
  },
});
