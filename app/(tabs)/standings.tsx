import React, { useState, useMemo, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStats } from "@/hooks/useStats";
import { useTeams } from "@/hooks/useTeams";
import { StandingsTable } from "@/components/StandingsTable";
import { BRAND_GRADIENT } from "@/constants/colors";

const MAIN_CATEGORIES = [
  { id: "all", label: "TODOS" },
  { id: "varonil", label: "VARONIL" },
  { id: "femenil", label: "FEMENIL" },
  { id: "mixto", label: "MIXTO" },
  { id: "teens", label: "TEENS" },
];

export default function StandingsScreen() {
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useStats();
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams();
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedMainCat, setSelectedMainCat] = useState("varonil"); // Por defecto Varonil
  const [selectedSubCat, setSelectedSubCat] = useState("all");

  const topPad = insets.top + (Platform.OS === "web" ? 20 : 10);
  const isLoading = statsLoading || teamsLoading;

  // Resetear subcategoría al cambiar rama
  useEffect(() => {
    setSelectedSubCat("all");
  }, [selectedMainCat]);

  // 1. Filtrar estadísticas por rama principal
  const statsByMainCat = useMemo(() => {
    if (!stats) return [];
    if (selectedMainCat === "all") return stats;
    return stats.filter((s) => s.team_category?.toLowerCase().startsWith(selectedMainCat.toLowerCase()));
  }, [stats, selectedMainCat]);

  // 2. Extraer subniveles (Gold, Silver, etc.) dinámicamente
  const availableSubCats = useMemo(() => {
    if (selectedMainCat === "all") return [];
    const subs = new Set<string>();
    statsByMainCat.forEach(s => {
      const parts = s.team_category?.split("-");
      if (parts && parts.length > 1) subs.add(parts[1].toLowerCase());
    });
    return Array.from(subs).sort();
  }, [statsByMainCat, selectedMainCat]);

  // 3. Aplicar filtro final
  const finalFilteredStats = useMemo(() => {
    if (selectedSubCat === "all") return statsByMainCat;
    return statsByMainCat.filter(s => {
      const parts = s.team_category?.split("-");
      return parts && parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
    });
  }, [statsByMainCat, selectedSubCat]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchTeams()]);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* HEADER FIJO CON FILTROS */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={styles.screenTitle}>Posiciones</Text>

        {/* SELECTOR PRINCIPAL */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mainCategoryScroll}>
          {MAIN_CATEGORIES.map((cat) => {
            const isActive = selectedMainCat === cat.id;
            return (
              <Pressable key={cat.id} style={[styles.mainTab, isActive && styles.mainTabActive]} onPress={() => setSelectedMainCat(cat.id)}>
                <Text style={[styles.mainTabText, isActive && styles.mainTabTextActive]}>{cat.label}</Text>
                {isActive && <View style={styles.activeIndicator} />}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* SELECTOR SECUNDARIO */}
        {selectedMainCat !== "all" && availableSubCats.length > 0 && (
          <View style={styles.subCategoryWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subCategoryScroll}>
              <Pressable style={[styles.subChip, selectedSubCat === "all" && styles.subChipActive]} onPress={() => setSelectedSubCat("all")}>
                <Text style={[styles.subChipText, selectedSubCat === "all" && styles.subChipTextActive]}>Todas</Text>
              </Pressable>
              {availableSubCats.map(sub => (
                <Pressable key={sub} style={[styles.subChip, selectedSubCat === sub && styles.subChipActive]} onPress={() => setSelectedSubCat(sub)}>
                  <Text style={[styles.subChipText, selectedSubCat === sub && styles.subChipTextActive]}>{sub.toUpperCase()}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />}
      >
        {isLoading ? (
           <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} style={{ marginTop: 50 }} />
        ) : finalFilteredStats.length > 0 ? (
          <View style={styles.tableContainer}>
            {/* Pasamos los equipos a la tabla para poder renderizar los logos */}
            <StandingsTable stats={finalFilteredStats} teams={teams || []} />
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="trophy-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Sin datos</Text>
            <Text style={styles.emptySubtitle}>No hay equipos registrados en esta categoría</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderColor: "#E2E8F0", paddingBottom: 10, zIndex: 10, elevation: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 },
  screenTitle: { color: "#0F172A", fontSize: 28, fontWeight: "900", letterSpacing: -1, marginBottom: 15, paddingHorizontal: 20 },
  
  mainCategoryScroll: { paddingHorizontal: 20, paddingBottom: 10, gap: 20 },
  mainTab: { paddingVertical: 8, position: "relative", alignItems: "center" },
  mainTabActive: {},
  mainTabText: { fontSize: 13, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5 },
  mainTabTextActive: { color: BRAND_GRADIENT[0] },
  activeIndicator: { position: "absolute", bottom: -10, width: "100%", height: 3, backgroundColor: BRAND_GRADIENT[0], borderRadius: 2 },

  subCategoryWrapper: { backgroundColor: "#F8FAFC", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0", marginTop: 10 },
  subCategoryScroll: { paddingHorizontal: 20, gap: 8 },
  subChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  subChipActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  subChipText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  subChipTextActive: { color: "#FFFFFF" },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 },
  tableContainer: { backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, overflow: "hidden" },
  emptyCard: { alignItems: "center", paddingVertical: 50, marginTop: 40, backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", borderStyle: "dashed" },
  emptyTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800", marginTop: 12 },
  emptySubtitle: { color: "#64748B", fontSize: 14, fontWeight: "500", marginTop: 4 },
});