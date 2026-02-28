import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStats } from "@/hooks/useStats";
import { StandingsTable } from "@/components/StandingsTable";
import { StatsRowSkeleton } from "@/components/SkeletonLoader";
import C from "@/constants/colors";

export default function StandingsScreen() {
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading, refetch } = useStats();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const categories = useMemo(() => {
    if (!stats) return [];
    const cats = Array.from(new Set(stats.map((s) => s.team_category).filter(Boolean))) as string[];
    return cats;
  }, [stats]);

  const filtered = useMemo(() => {
    if (!stats) return [];
    if (!selectedCategory) return stats;
    return stats.filter((s) => s.team_category === selectedCategory);
  }, [stats, selectedCategory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPad + 8, paddingBottom: bottomPad + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        <Text style={styles.screenTitle}>Tabla de Posiciones</Text>

        {categories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            <Pressable
              onPress={() => setSelectedCategory(null)}
              style={[styles.catChip, !selectedCategory && styles.catChipActive]}
            >
              <Text style={[styles.catLabel, !selectedCategory && styles.catLabelActive]}>Todos</Text>
            </Pressable>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
              >
                <Text style={[styles.catLabel, selectedCategory === cat && styles.catLabelActive]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.win }]} />
            <Text style={styles.legendText}>Victoria</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.tie }]} />
            <Text style={styles.legendText}>Empate</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.loss }]} />
            <Text style={styles.legendText}>Derrota</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.skeletonContainer}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => <StatsRowSkeleton key={k} />)}
          </View>
        ) : filtered.length > 0 ? (
          <View style={styles.tableContainer}>
            <StandingsTable stats={filtered} />
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={48} color={C.textMuted} />
            <Text style={styles.emptyTitle}>Sin datos</Text>
            <Text style={styles.emptySubtitle}>No hay estadísticas disponibles</Text>
          </View>
        )}

        {!isLoading && filtered.length > 0 && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>PJ: Partidos Jugados · G: Ganados · E: Empatados · P: Perdidos · PTS: Puntos</Text>
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
    paddingHorizontal: 16,
  },
  screenTitle: {
    color: C.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 12,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  catChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  catLabel: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  catLabelActive: {
    color: "#fff",
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: C.textSecondary,
    fontSize: 12,
  },
  skeletonContainer: {
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: "hidden",
  },
  tableContainer: {
    flex: 1,
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
  },
  footer: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  footerText: {
    color: C.textMuted,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 16,
  },
});
