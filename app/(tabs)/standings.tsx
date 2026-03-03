import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStats } from "@/hooks/useStats";
import { StandingsTable } from "@/components/StandingsTable";
import { BRAND_GRADIENT } from "@/constants/colors";

export default function StandingsScreen() {
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading, refetch } = useStats();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const categories = useMemo(() => {
    if (!stats) return [];
    return Array.from(new Set(stats.map((s) => s.team_category).filter(Boolean))) as string[];
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

  const renderCategoryChip = (keyId: string, label: string, isActive: boolean, onPress: () => void) => (
    <Pressable key={keyId} onPress={onPress}>
      <View style={[styles.catChip, isActive && styles.catChipActive]}>
        <Text style={[styles.catLabel, isActive && styles.catLabelActive]}>{label}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 12, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />}
      >
        <Text style={styles.screenTitle}>Estadísticas</Text>

        {categories.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {renderCategoryChip("all", "Todos", !selectedCategory, () => setSelectedCategory(null))}
            {categories.map((cat) => renderCategoryChip(cat, cat, selectedCategory === cat, () => setSelectedCategory(cat)))}
          </ScrollView>
        )}

        {filtered.length > 0 ? (
          <View style={styles.tableContainer}>
            <StandingsTable stats={filtered} />
          </View>
        ) : !isLoading ? (
          <View style={styles.emptyCard}>
            <Ionicons name="trophy-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Sin datos</Text>
            <Text style={styles.emptySubtitle}>No hay estadísticas disponibles</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingHorizontal: 16 },
  screenTitle: { color: "#0F172A", fontSize: 32, fontWeight: "900", letterSpacing: -1, marginBottom: 20 },
  categoryRow: { gap: 10, paddingBottom: 20 },
  catChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  catChipActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  catLabel: { color: "#64748B", fontSize: 13, fontWeight: "700" },
  catLabelActive: { color: "#FFFFFF" },
  tableContainer: { backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, overflow: "hidden" },
  emptyCard: { alignItems: "center", paddingVertical: 50, marginTop: 20, backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", borderStyle: "dashed" },
  emptyTitle: { color: "#0F172A", fontSize: 20, fontWeight: "800", marginTop: 12 },
  emptySubtitle: { color: "#64748B", fontSize: 14, fontWeight: "500", marginTop: 4 },
});