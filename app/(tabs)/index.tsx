import React, { useRef } from "react";
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
import { MatchCardSkeleton, StatsRowSkeleton, Skeleton } from "@/components/SkeletonLoader";
import C from "@/constants/colors";

function SectionHeader({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      {onPress && (
        <Pressable onPress={onPress} style={sectionStyles.more}>
          <Text style={sectionStyles.moreText}>Ver todo</Text>
          <Ionicons name="chevron-forward" size={14} color={C.primary} />
        </Pressable>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  title: {
    color: C.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
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

  const isLoading = teamsLoading || gamesLoading;
  const [refreshing, setRefreshing] = React.useState(false);

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
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad, paddingBottom: bottomPad + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        <View style={styles.headerBranding}>
          <LinearGradient
            colors={[C.primary + "22", "transparent"]}
            style={styles.headerGradient}
          >
            <Text style={styles.leagueName}>LIGA DURANGO</Text>
            <Text style={styles.leagueSubtitle}>Temporada 2024-2025</Text>
          </LinearGradient>
        </View>

        {liveGames && liveGames.length > 0 && (
          <>
            <SectionHeader title="En Vivo" />
            {liveGames.slice(0, 1).map((game) => (
              <MatchCard key={game.id} game={game} teams={safeTeams} hero />
            ))}
          </>
        )}

        {heroGame && (!liveGames || liveGames.length === 0) && (
          <>
            <SectionHeader title="Partido Destacado" />
            <MatchCard game={heroGame} teams={safeTeams} hero />
          </>
        )}

        <SectionHeader title="Resultados Recientes" onPress={() => router.push("/(tabs)/matches")} />
        {isLoading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {[1, 2, 3].map((k) => <MatchCardSkeleton key={k} />)}
          </ScrollView>
        ) : recentGames.length > 0 ? (
          <FlatList
            horizontal
            data={recentGames.slice(0, 8)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.horizontalList}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <MatchCard game={item} teams={safeTeams} compact />
            )}
            scrollEnabled={recentGames.length > 0}
          />
        ) : (
          <View style={styles.emptyHorizontal}>
            <Text style={styles.emptyText}>Sin resultados recientes</Text>
          </View>
        )}

        <SectionHeader title="Próximos Partidos" onPress={() => router.push("/(tabs)/matches")} />
        {isLoading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {[1, 2, 3].map((k) => <MatchCardSkeleton key={k} />)}
          </ScrollView>
        ) : upcomingGames.length > 0 ? (
          <FlatList
            horizontal
            data={upcomingGames.slice(0, 8)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.horizontalList}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <MatchCard game={item} teams={safeTeams} compact />
            )}
            scrollEnabled={!!upcomingGames.length}
          />
        ) : (
          <View style={styles.emptyHorizontal}>
            <Text style={styles.emptyText}>Sin partidos programados</Text>
          </View>
        )}

        <SectionHeader title="Tabla de Posiciones" onPress={() => router.push("/(tabs)/standings")} />
        {statsLoading ? (
          <View style={styles.statsSkeletonContainer}>
            {[1, 2, 3, 4, 5].map((k) => <StatsRowSkeleton key={k} />)}
          </View>
        ) : safeStats.length > 0 ? (
          <View style={styles.tableContainer}>
            <StandingsTable stats={safeStats} limit={5} />
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
  scrollContent: {
    paddingBottom: 100,
  },
  headerBranding: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 16,
    overflow: "hidden",
  },
  headerGradient: {
    padding: 16,
    paddingBottom: 8,
  },
  leagueName: {
    color: C.text,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 2,
  },
  leagueSubtitle: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 2,
  },
  horizontalList: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  statsSkeletonContainer: {
    marginHorizontal: 16,
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: "hidden",
  },
  tableContainer: {
    marginHorizontal: 16,
  },
  emptyHorizontal: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
    marginHorizontal: 16,
    backgroundColor: C.card,
    borderRadius: 16,
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 14,
    fontStyle: "italic",
  },
});
