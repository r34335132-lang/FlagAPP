import React, { useState, useMemo, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, RefreshControl, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStats } from "@/hooks/useStats";
import { useTeams } from "@/hooks/useTeams";
import { usePlayerStats } from "@/hooks/usePlayerStats";
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
  
  // Hooks de datos
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useStats();
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams();
  const { data: playerStats, isLoading: playersLoading, refetch: refetchPlayers } = usePlayerStats();
  
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados de UI
  const [viewMode, setViewMode] = useState<"teams" | "players">("teams");
  const [statType, setStatType] = useState<"touchdowns" | "interceptions" | "mvps">("touchdowns");
  const [selectedMainCat, setSelectedMainCat] = useState("varonil"); 
  const [selectedSubCat, setSelectedSubCat] = useState("all");

  const topPad = insets.top + (Platform.OS === "web" ? 20 : 10);
  const isLoading = statsLoading || teamsLoading || playersLoading;

  useEffect(() => {
    setSelectedSubCat("all");
  }, [selectedMainCat]);

  // ------------------------------------------------------------------
  // LÓGICA PARA EQUIPOS (Inyectando 0s a los que no han jugado)
  // ------------------------------------------------------------------
  const statsWithZeros = useMemo(() => {
    if (!teams) return stats || [];
    
    // Mapeamos los que sí tienen estadísticas
    const statsMap = new Map((stats || []).map((s: any) => [s.team_name || s.name, s]));
    
    // Recorremos TODOS los equipos
    const allStats = teams.map((team: any) => {
      if (statsMap.has(team.name)) {
        return statsMap.get(team.name);
      }
      // Si el equipo no ha jugado, le inyectamos estadísticas en cero
      return {
        team_id: team.id,
        team_name: team.name,
        team_category: team.category,
        games_played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points_for: 0,
        points_against: 0,
        points_difference: 0,
        points: 0
      };
    });

    // Ordenamos la tabla (Puntos -> Diferencia -> Puntos a favor)
    return allStats.sort((a, b) => {
      if (b.points !== a.points) return (b.points || 0) - (a.points || 0);
      if (b.points_difference !== a.points_difference) return (b.points_difference || 0) - (a.points_difference || 0);
      return (b.points_for || 0) - (a.points_for || 0);
    });
  }, [stats, teams]);

  const statsByMainCat = useMemo(() => {
    if (!statsWithZeros) return [];
    if (selectedMainCat === "all") return statsWithZeros;
    return statsWithZeros.filter((s: any) => s.team_category?.toLowerCase().startsWith(selectedMainCat.toLowerCase()));
  }, [statsWithZeros, selectedMainCat]);

  const availableSubCats = useMemo(() => {
    if (selectedMainCat === "all") return [];
    const subs = new Set<string>();
    
    const extractSubs = (category?: string) => {
      const parts = category?.split("-");
      if (parts && parts.length > 1) subs.add(parts[1].toLowerCase());
    };

    statsByMainCat.forEach((s: any) => extractSubs(s.team_category));
    return Array.from(subs).sort();
  }, [statsByMainCat, selectedMainCat]);

  const finalFilteredStats = useMemo(() => {
    if (selectedSubCat === "all") return statsByMainCat;
    return statsByMainCat.filter((s: any) => {
      const parts = s.team_category?.split("-");
      return parts && parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
    });
  }, [statsByMainCat, selectedSubCat]);

  // ------------------------------------------------------------------
  // LÓGICA PARA JUGADORES (Mostrar aunque tengan 0)
  // ------------------------------------------------------------------
  const topPlayers = useMemo(() => {
    if (!playerStats) return [];
    let filtered = playerStats;

    if (selectedMainCat !== "all") {
      filtered = filtered.filter(p => p.teams?.category?.toLowerCase().startsWith(selectedMainCat.toLowerCase()));
    }
    
    if (selectedSubCat !== "all") {
      filtered = filtered.filter(p => {
        const parts = p.teams?.category?.split("-");
        return parts && parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
      });
    }

    return filtered
      .sort((a, b) => (b[statType] || 0) - (a[statType] || 0))
      // Muestra hasta 50 jugadores (incluso si tienen 0)
      .slice(0, 50); 
  }, [playerStats, selectedMainCat, selectedSubCat, statType]);

  // ------------------------------------------------------------------

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchTeams(), refetchPlayers()]);
    setRefreshing(false);
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' }; // Oro
    if (index === 1) return { bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' }; // Plata
    if (index === 2) return { bg: '#FFEDD5', color: '#C2410C', border: '#FED7AA' }; // Bronce
    return { bg: '#F8FAFC', color: '#94A3B8', border: 'transparent' };
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerTopRow}>
          <Text style={styles.screenTitle}>Clasificación</Text>
        </View>

        <View style={styles.toggleWrapper}>
          <View style={styles.toggleContainer}>
            <Pressable 
              style={[styles.toggleBtn, viewMode === "teams" && styles.toggleBtnActive]}
              onPress={() => setViewMode("teams")}
            >
              <Ionicons name="shield" size={16} color={viewMode === "teams" ? "#FFF" : "#64748B"} />
              <Text style={[styles.toggleText, viewMode === "teams" && styles.toggleTextActive]}>Equipos</Text>
            </Pressable>
            <Pressable 
              style={[styles.toggleBtn, viewMode === "players" && styles.toggleBtnActive]}
              onPress={() => setViewMode("players")}
            >
              <Ionicons name="people" size={18} color={viewMode === "players" ? "#FFF" : "#64748B"} />
              <Text style={[styles.toggleText, viewMode === "players" && styles.toggleTextActive]}>Líderes</Text>
            </Pressable>
          </View>
        </View>

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

        {viewMode === "players" && (
          <View style={styles.statsSelectorWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
              <Pressable style={[styles.statChip, statType === "touchdowns" && styles.statChipActive]} onPress={() => setStatType("touchdowns")}>
                <Text style={[styles.statChipText, statType === "touchdowns" && styles.statChipTextActive]}>🏈 Anotaciones</Text>
              </Pressable>
              <Pressable style={[styles.statChip, statType === "interceptions" && styles.statChipActive]} onPress={() => setStatType("interceptions")}>
                <Text style={[styles.statChipText, statType === "interceptions" && styles.statChipTextActive]}>🤲 Intercepciones</Text>
              </Pressable>
              <Pressable style={[styles.statChip, statType === "mvps" && styles.statChipActive]} onPress={() => setStatType("mvps")}>
                <Text style={[styles.statChipText, statType === "mvps" && styles.statChipTextActive]}>⭐ MVPs</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />}
      >
        {isLoading && !refreshing ? (
           <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} style={{ marginTop: 50 }} />
        ) : viewMode === "teams" ? (
          
          finalFilteredStats.length > 0 ? (
            <View style={styles.tableContainer}>
              <StandingsTable stats={finalFilteredStats} teams={teams || []} />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="trophy-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Sin datos</Text>
              <Text style={styles.emptySubtitle}>No hay equipos registrados en esta categoría</Text>
            </View>
          )

        ) : (

          topPlayers.length > 0 ? (
            <View style={styles.leaderboardContainer}>
              {topPlayers.map((player, index) => {
                const rankStyles = getRankStyle(index);
                const hasPhoto = player.photo_url && !player.photo_url.startsWith("blob:");

                return (
                  <View key={player.id} style={styles.playerCard}>
                    <View style={[styles.rankCircle, { backgroundColor: rankStyles.bg, borderColor: rankStyles.border }]}>
                      <Text style={[styles.rankText, { color: rankStyles.color }]}>{index + 1}</Text>
                    </View>
                    
                    <View style={styles.playerAvatarWrapper}>
                      {hasPhoto ? (
                        <Image source={{ uri: player.photo_url }} style={styles.playerAvatar} />
                      ) : (
                        <View style={[styles.playerAvatar, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="person" size={20} color="#CBD5E1" />
                        </View>
                      )}
                      {player.teams?.logo_url && (
                        <Image source={{ uri: player.teams.logo_url }} style={styles.tinyTeamLogo} />
                      )}
                    </View>

                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
                      <Text style={styles.playerTeam} numberOfLines={1}>
                        {player.teams?.name} <Text style={{color: BRAND_GRADIENT[0]}}>#{player.jersey_number}</Text>
                      </Text>
                    </View>

                    <View style={styles.statValueBox}>
                      <Text style={styles.statValueNumber}>{player[statType] || 0}</Text>
                      <Text style={styles.statValueLabel}>
                        {statType === 'touchdowns' ? 'TDs' : statType === 'interceptions' ? 'INTs' : 'MVPs'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="medal-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Sin jugadores</Text>
              <Text style={styles.emptySubtitle}>Aún no hay jugadores registrados aquí.</Text>
            </View>
          )

        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderColor: "#E2E8F0", paddingBottom: 10, zIndex: 10, elevation: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20 },
  screenTitle: { color: "#0F172A", fontSize: 26, fontWeight: "900", letterSpacing: -1 },
  
  toggleWrapper: { paddingHorizontal: 20, marginVertical: 15 },
  toggleContainer: { flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 12, padding: 4 },
  toggleBtn: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 8, borderRadius: 8, gap: 6 },
  toggleBtnActive: { backgroundColor: "#0F172A", elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4 },
  toggleText: { fontSize: 13, fontWeight: "700", color: "#64748B" },
  toggleTextActive: { color: "#FFFFFF" },

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

  statsSelectorWrapper: { backgroundColor: "#FFFFFF", paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  statsScroll: { paddingHorizontal: 20, gap: 10 },
  statChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  statChipActive: { backgroundColor: BRAND_GRADIENT[0], borderColor: BRAND_GRADIENT[0] },
  statChipText: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  statChipTextActive: { color: "#FFFFFF" },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 },
  tableContainer: { backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, overflow: "hidden" },
  
  leaderboardContainer: { backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", paddingVertical: 5 },
  playerCard: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  rankCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center", marginRight: 12, borderWidth: 1 },
  rankText: { fontSize: 13, fontWeight: "900" },
  
  playerAvatarWrapper: { position: "relative", marginRight: 15 },
  playerAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: "#FFF" },
  tinyTeamLogo: { position: "absolute", bottom: -2, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0" },
  
  playerInfo: { flex: 1, justifyContent: "center" },
  playerName: { fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  playerTeam: { fontSize: 11, fontWeight: "600", color: "#64748B" },
  
  statValueBox: { alignItems: "flex-end", minWidth: 45 },
  statValueNumber: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  statValueLabel: { fontSize: 9, fontWeight: "800", color: "#94A3B8", textTransform: "uppercase" },

  emptyCard: { alignItems: "center", paddingVertical: 50, marginTop: 40, backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", borderStyle: "dashed" },
  emptyTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800", marginTop: 12 },
  emptySubtitle: { color: "#64748B", fontSize: 14, fontWeight: "500", marginTop: 4 },
});