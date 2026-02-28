import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMatches } from "@/hooks/useMatches";
import { useTeams } from "@/hooks/useTeams";
import { MatchCard } from "@/components/MatchCard";
import { MatchCardSkeleton } from "@/components/SkeletonLoader";
import { Ionicons } from "@expo/vector-icons";
import C from "@/constants/colors";

type Filter = "all" | "live" | "finished" | "upcoming";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "live", label: "En Vivo" },
  { key: "finished", label: "Finalizados" },
  { key: "upcoming", label: "Próximos" },
];

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const { data: games, isLoading: gamesLoading, refetch: refetchGames } = useMatches();
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams();
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const isLoading = gamesLoading || teamsLoading;
  const safeTeams = teams ?? [];

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const filtered = useMemo(() => {
    if (!games) return [];
    switch (activeFilter) {
      case "live":
        return games.filter((g) => {
          const s = g.status?.toLowerCase() ?? "";
          return s === "en vivo" || s === "live";
        });
      case "finished":
        return games.filter((g) => {
          const s = g.status?.toLowerCase() ?? "";
          return s === "finalizado" || s === "final";
        });
      case "upcoming":
        return games.filter((g) => {
          const s = g.status?.toLowerCase() ?? "";
          return s === "programado" || s === "scheduled" || (g.home_score === null && g.away_score === null);
        });
      default:
        return games;
    }
  }, [games, activeFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchGames(), refetchTeams()]);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={isLoading ? [] : filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPad + 8, paddingBottom: bottomPad + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isLoading || !!filtered.length}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.screenTitle}>Partidos</Text>
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  style={[
                    styles.filterChip,
                    activeFilter === f.key && styles.filterChipActive,
                  ]}
                >
                  {f.key === "live" && activeFilter === f.key && (
                    <View style={styles.liveDot} />
                  )}
                  <Text
                    style={[
                      styles.filterLabel,
                      activeFilter === f.key && styles.filterLabelActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {isLoading && (
              <View style={{ gap: 12 }}>
                {[1, 2, 3, 4].map((k) => (
                  <View key={k} style={skeletonWrapStyle}>
                    <MatchCardSkeleton />
                  </View>
                ))}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="football-outline" size={48} color={C.textMuted} />
              <Text style={styles.emptyTitle}>Sin partidos</Text>
              <Text style={styles.emptySubtitle}>
                {activeFilter !== "all"
                  ? "No hay partidos en esta categoría"
                  : "No hay partidos disponibles"}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <MatchCard game={item} teams={safeTeams} />
        )}
      />
    </View>
  );
}

const skeletonWrapStyle = {
  width: "100%",
  marginBottom: 12,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  list: {
    paddingHorizontal: 16,
  },
  screenTitle: {
    color: C.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    gap: 5,
  },
  filterChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterLabel: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  filterLabelActive: {
    color: "#fff",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    color: C.textSecondary,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySubtitle: {
    color: C.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
});
