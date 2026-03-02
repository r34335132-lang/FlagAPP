import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTeams } from "@/hooks/useTeams";
import { useMatches, useRecentMatches, useUpcomingMatches, useLiveMatches } from "@/hooks/useMatches";
import { useStats } from "@/hooks/useStats";
import { MatchCard } from "@/components/MatchCard";
import { StandingsTable } from "@/components/StandingsTable";
import { MatchCardSkeleton, StatsRowSkeleton } from "@/components/SkeletonLoader";
import C, { BRAND_GRADIENT } from "@/constants/colors";

function SectionHeader({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <View style={sS.row}>
      <View style={sS.titleGroup}>
        <View style={sS.accent} />
        <Text style={sS.title}>{title}</Text>
      </View>
      {onPress && (
        <Pressable onPress={onPress} style={sS.more}>
          <Text style={sS.moreText}>Ver todo</Text>
          <Ionicons name="chevron-forward" size={13} color={C.primary} />
        </Pressable>
      )}
    </View>
  );
}

const sS = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 28,
    marginBottom: 14,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accent: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: BRAND_GRADIENT[1],
  },
  title: {
    color: C.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  more: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  moreText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: "600",
  },
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams();
  const { data: allGames, isLoading: gamesLoading, refetch: refetchGames } = useMatches();
  const { data: recentGames } = useRecentMatches();
  const { data: upcomingGames } = useUpcomingMatches();
  const { data: liveGames } = useLiveMatches();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useStats();

  const [refreshing, setRefreshing] = React.useState(false);
  const isLoading = teamsLoading || gamesLoading;

  const heroGame = liveGames?.[0] ?? allGames?.[0];
  const safeTeams = teams ?? [];
  const safeStats = stats ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchTeams(), refetchGames(), refetchStats()]);
    setRefreshing(false);
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad + 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        {/* ── Brand Header ───────────────────────────────────────────── */}
        <LinearGradient
          colors={[BRAND_GRADIENT[0] + "60", BRAND_GRADIENT[1] + "30", BRAND_GRADIENT[2] + "44"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.brandHeader}
        >
          <View style={styles.brandInner}>
            <View style={styles.brandIconWrap}>
              <LinearGradient
                colors={[BRAND_GRADIENT[2], BRAND_GRADIENT[1]]}
                style={styles.brandIconGrad}
              >
                <Ionicons name="american-football" size={22} color="#fff" />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.leagueName}>LIGA DURANGO</Text>
              <Text style={styles.leagueSub}>Temporada 2024–2025</Text>
            </View>
          </View>
          {liveGames && liveGames.length > 0 && (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{liveGames.length} EN VIVO</Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Hero Match ─────────────────────────────────────────────── */}
        {isLoading ? (
          <View style={styles.heroSkeleton}>
            <View style={styles.heroSkeletonInner} />
          </View>
        ) : heroGame ? (
          <>
            <SectionHeader
              title={liveGames && liveGames.length > 0 ? "En Vivo" : "Partido Destacado"}
            />
            <MatchCard game={heroGame} teams={safeTeams} hero />
          </>
        ) : null}

        {/* ── Recent Results ─────────────────────────────────────────── */}
        <SectionHeader title="Resultados Recientes" onPress={() => router.push("/(tabs)/matches")} />
        {isLoading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
            {[1, 2, 3].map((k) => <MatchCardSkeleton key={k} />)}
          </ScrollView>
        ) : (recentGames ?? []).length > 0 ? (
          <FlatList
            horizontal
            data={(recentGames ?? []).slice(0, 8)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.hList}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => <MatchCard game={item} teams={safeTeams} compact />}
            scrollEnabled={!!(recentGames ?? []).length}
          />
        ) : (
          <View style={styles.emptyH}>
            <Ionicons name="time-outline" size={20} color={C.textMuted} />
            <Text style={styles.emptyText}>Sin resultados recientes</Text>
          </View>
        )}

        {/* ── Upcoming ───────────────────────────────────────────────── */}
        <SectionHeader title="Próximos Partidos" onPress={() => router.push("/(tabs)/matches")} />
        {isLoading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
            {[1, 2, 3].map((k) => <MatchCardSkeleton key={k} />)}
          </ScrollView>
        ) : (upcomingGames ?? []).length > 0 ? (
          <FlatList
            horizontal
            data={(upcomingGames ?? []).slice(0, 8)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.hList}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => <MatchCard game={item} teams={safeTeams} compact />}
            scrollEnabled={!!(upcomingGames ?? []).length}
          />
        ) : (
          <View style={styles.emptyH}>
            <Ionicons name="calendar-outline" size={20} color={C.textMuted} />
            <Text style={styles.emptyText}>Sin partidos programados</Text>
          </View>
        )}

        {/* ── Standings Preview ──────────────────────────────────────── */}
        <SectionHeader title="Tabla de Posiciones" onPress={() => router.push("/(tabs)/standings")} />
        {statsLoading ? (
          <View style={styles.statsWrap}>
            {[1, 2, 3, 4, 5].map((k) => <StatsRowSkeleton key={k} />)}
          </View>
        ) : safeStats.length > 0 ? (
          <View style={styles.tableWrap}>
            <StandingsTable stats={safeStats} limit={5} />
            <Pressable
              onPress={() => router.push("/(tabs)/standings")}
              style={styles.seeAllBtn}
            >
              <LinearGradient
                colors={[BRAND_GRADIENT[0] + "33", BRAND_GRADIENT[2] + "22"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.seeAllGrad}
              >
                <Text style={styles.seeAllText}>Ver tabla completa</Text>
                <Ionicons name="chevron-forward" size={14} color={C.primary} />
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={32} color={C.textMuted} />
            <Text style={styles.emptyText}>Sin datos de tabla</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  brandHeader: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandIconWrap: {
    borderRadius: 14,
    overflow: "hidden",
  },
  brandIconGrad: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  leagueName: {
    color: C.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2,
  },
  leagueSub: {
    color: C.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,50,50,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,80,80,0.3)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF4444",
  },
  liveText: {
    color: "#FF6666",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  heroSkeleton: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 22,
    overflow: "hidden",
    height: 220,
    backgroundColor: C.card,
  },
  heroSkeletonInner: {
    flex: 1,
    opacity: 0.5,
  },

  hList: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },

  statsWrap: {
    marginHorizontal: 16,
    backgroundColor: C.card,
    borderRadius: 18,
    overflow: "hidden",
  },
  tableWrap: {
    marginHorizontal: 16,
    gap: 0,
    borderRadius: 18,
    overflow: "hidden",
  },
  seeAllBtn: {
    overflow: "hidden",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  seeAllGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 13,
  },
  seeAllText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  emptyH: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
    marginHorizontal: 16,
    backgroundColor: C.card,
    borderRadius: 18,
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 14,
    fontStyle: "italic",
  },
});
