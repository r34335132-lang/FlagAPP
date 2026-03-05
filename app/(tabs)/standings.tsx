import React, { useState, useMemo, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  Pressable, 
  RefreshControl, 
  ActivityIndicator, 
  Image,
  useColorScheme 
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStats } from "@/hooks/useStats";
import { useTeams } from "@/hooks/useTeams";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { StandingsTable } from "@/components/StandingsTable";
import { BRAND_GRADIENT, Colors } from "@/constants/colors"; // <-- Importamos paleta dinámica

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

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchTeams(), refetchPlayers()]);
    setRefreshing(false);
  };

  // ------------------------------------------------------------------
  // MEDALLAS ADAPTATIVAS (Oscuro vs Claro)
  // ------------------------------------------------------------------
  const getRankStyle = (index: number) => {
    const isDark = theme === 'dark';
    if (index === 0) return { 
      bg: isDark ? '#78350F' : '#FEF3C7', 
      color: isDark ? '#FDE68A' : '#D97706', 
      border: isDark ? '#92400E' : '#FDE68A' 
    }; // Oro
    if (index === 1) return { 
      bg: isDark ? '#334155' : '#F1F5F9', 
      color: isDark ? '#E2E8F0' : '#64748B', 
      border: isDark ? '#475569' : '#E2E8F0' 
    }; // Plata
    if (index === 2) return { 
      bg: isDark ? '#7C2D12' : '#FFEDD5', 
      color: isDark ? '#FED7AA' : '#C2410C', 
      border: isDark ? '#9A3412' : '#FED7AA' 
    }; // Bronce
    return { 
      bg: isDark ? currentColors.bgSecondary : '#F8FAFC', 
      color: currentColors.textMuted, 
      border: isDark ? currentColors.borderLight : 'transparent' 
    };
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <View style={[styles.header, { 
        paddingTop: topPad, 
        backgroundColor: currentColors.card, 
        borderBottomColor: currentColors.border,
        shadowColor: theme === 'dark' ? '#000' : '#0F172A'
      }]}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.screenTitle, { color: currentColors.text }]}>Clasificación</Text>
        </View>

        <View style={styles.toggleWrapper}>
          <View style={[styles.toggleContainer, { backgroundColor: currentColors.bgSecondary }]}>
            <Pressable 
              style={[
                styles.toggleBtn, 
                viewMode === "teams" && [styles.toggleBtnActive, { backgroundColor: currentColors.text }]
              ]}
              onPress={() => setViewMode("teams")}
            >
              <Ionicons name="shield" size={16} color={viewMode === "teams" ? currentColors.bg : currentColors.textSecondary} />
              <Text style={[
                styles.toggleText, 
                { color: currentColors.textSecondary },
                viewMode === "teams" && [styles.toggleTextActive, { color: currentColors.bg }]
              ]}>Equipos</Text>
            </Pressable>
            <Pressable 
              style={[
                styles.toggleBtn, 
                viewMode === "players" && [styles.toggleBtnActive, { backgroundColor: currentColors.text }]
              ]}
              onPress={() => setViewMode("players")}
            >
              <Ionicons name="people" size={18} color={viewMode === "players" ? currentColors.bg : currentColors.textSecondary} />
              <Text style={[
                styles.toggleText, 
                { color: currentColors.textSecondary },
                viewMode === "players" && [styles.toggleTextActive, { color: currentColors.bg }]
              ]}>Líderes</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mainCategoryScroll}>
          {MAIN_CATEGORIES.map((cat) => {
            const isActive = selectedMainCat === cat.id;
            return (
              <Pressable key={cat.id} style={[styles.mainTab, isActive && styles.mainTabActive]} onPress={() => setSelectedMainCat(cat.id)}>
                <Text style={[styles.mainTabText, { color: currentColors.textMuted }, isActive && styles.mainTabTextActive]}>{cat.label}</Text>
                {isActive && <View style={styles.activeIndicator} />}
              </Pressable>
            );
          })}
        </ScrollView>

        {selectedMainCat !== "all" && availableSubCats.length > 0 && (
          <View style={[styles.subCategoryWrapper, { backgroundColor: currentColors.bgSecondary, borderTopColor: currentColors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subCategoryScroll}>
              <Pressable 
                style={[
                  styles.subChip, 
                  { backgroundColor: currentColors.card, borderColor: currentColors.border },
                  selectedSubCat === "all" && { backgroundColor: currentColors.text, borderColor: currentColors.text }
                ]} 
                onPress={() => setSelectedSubCat("all")}
              >
                <Text style={[
                  styles.subChipText, 
                  { color: currentColors.textSecondary },
                  selectedSubCat === "all" && { color: currentColors.bg }
                ]}>Todas</Text>
              </Pressable>
              {availableSubCats.map(sub => (
                <Pressable 
                  key={sub} 
                  style={[
                    styles.subChip, 
                    { backgroundColor: currentColors.card, borderColor: currentColors.border },
                    selectedSubCat === sub && { backgroundColor: currentColors.text, borderColor: currentColors.text }
                  ]} 
                  onPress={() => setSelectedSubCat(sub)}
                >
                  <Text style={[
                    styles.subChipText, 
                    { color: currentColors.textSecondary },
                    selectedSubCat === sub && { color: currentColors.bg }
                  ]}>{sub.toUpperCase()}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {viewMode === "players" && (
          <View style={[styles.statsSelectorWrapper, { backgroundColor: currentColors.card, borderTopColor: currentColors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
              <Pressable 
                style={[
                  styles.statChip, 
                  { backgroundColor: currentColors.bg, borderColor: currentColors.border },
                  statType === "touchdowns" && styles.statChipActive
                ]} 
                onPress={() => setStatType("touchdowns")}
              >
                <Text style={[
                  styles.statChipText, 
                  { color: currentColors.textSecondary },
                  statType === "touchdowns" && styles.statChipTextActive
                ]}>🏈 Anotaciones</Text>
              </Pressable>
              <Pressable 
                style={[
                  styles.statChip, 
                  { backgroundColor: currentColors.bg, borderColor: currentColors.border },
                  statType === "interceptions" && styles.statChipActive
                ]} 
                onPress={() => setStatType("interceptions")}
              >
                <Text style={[
                  styles.statChipText, 
                  { color: currentColors.textSecondary },
                  statType === "interceptions" && styles.statChipTextActive
                ]}>🤲 Intercepciones</Text>
              </Pressable>
              <Pressable 
                style={[
                  styles.statChip, 
                  { backgroundColor: currentColors.bg, borderColor: currentColors.border },
                  statType === "mvps" && styles.statChipActive
                ]} 
                onPress={() => setStatType("mvps")}
              >
                <Text style={[
                  styles.statChipText, 
                  { color: currentColors.textSecondary },
                  statType === "mvps" && styles.statChipTextActive
                ]}>⭐ MVPs</Text>
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
            <View style={[styles.tableContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border, shadowColor: theme === 'dark' ? '#000' : '#0F172A' }]}>
              {/* COMPONENTE EXTERNO: Posiblemente requiera adaptación también */}
              <StandingsTable stats={finalFilteredStats} teams={teams || []} />
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
              <Ionicons name="trophy-outline" size={48} color={currentColors.textMuted} />
              <Text style={[styles.emptyTitle, { color: currentColors.text }]}>Sin datos</Text>
              <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>No hay equipos registrados en esta categoría</Text>
            </View>
          )

        ) : (

          topPlayers.length > 0 ? (
            <View style={[styles.leaderboardContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
              {topPlayers.map((player, index) => {
                const rankStyles = getRankStyle(index);
                const hasPhoto = player.photo_url && !player.photo_url.startsWith("blob:");

                return (
                  <View key={player.id} style={[styles.playerCard, { borderBottomColor: currentColors.bgSecondary }]}>
                    <View style={[styles.rankCircle, { backgroundColor: rankStyles.bg, borderColor: rankStyles.border }]}>
                      <Text style={[styles.rankText, { color: rankStyles.color }]}>{index + 1}</Text>
                    </View>
                    
                    <View style={styles.playerAvatarWrapper}>
                      {hasPhoto ? (
                        <Image source={{ uri: player.photo_url }} style={[styles.playerAvatar, { borderColor: currentColors.card }]} />
                      ) : (
                        <View style={[styles.playerAvatar, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.card, justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="person" size={20} color={currentColors.textMuted} />
                        </View>
                      )}
                      {player.teams?.logo_url && (
                        <Image source={{ uri: player.teams.logo_url }} style={[styles.tinyTeamLogo, { borderColor: currentColors.border, backgroundColor: currentColors.card }]} />
                      )}
                    </View>

                    <View style={styles.playerInfo}>
                      <Text style={[styles.playerName, { color: currentColors.text }]} numberOfLines={1}>{player.name}</Text>
                      <Text style={[styles.playerTeam, { color: currentColors.textSecondary }]} numberOfLines={1}>
                        {player.teams?.name} <Text style={{color: BRAND_GRADIENT[0]}}>#{player.jersey_number}</Text>
                      </Text>
                    </View>

                    <View style={styles.statValueBox}>
                      <Text style={[styles.statValueNumber, { color: currentColors.text }]}>{player[statType] || 0}</Text>
                      <Text style={[styles.statValueLabel, { color: currentColors.textMuted }]}>
                        {statType === 'touchdowns' ? 'TDs' : statType === 'interceptions' ? 'INTs' : 'MVPs'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
              <Ionicons name="medal-outline" size={48} color={currentColors.textMuted} />
              <Text style={[styles.emptyTitle, { color: currentColors.text }]}>Sin jugadores</Text>
              <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>Aún no hay jugadores registrados aquí.</Text>
            </View>
          )

        )}
      </ScrollView>
    </View>
  );
}

// Retiramos colores fijos del StyleSheet
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingBottom: 10, zIndex: 10, elevation: 4, shadowOpacity: 0.05, shadowRadius: 10 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20 },
  screenTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -1 },
  
  toggleWrapper: { paddingHorizontal: 20, marginVertical: 15 },
  toggleContainer: { flexDirection: "row", borderRadius: 12, padding: 4 },
  toggleBtn: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 8, borderRadius: 8, gap: 6 },
  toggleBtnActive: { elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4 },
  toggleText: { fontSize: 13, fontWeight: "700" },
  toggleTextActive: {},

  mainCategoryScroll: { paddingHorizontal: 20, paddingBottom: 10, gap: 20 },
  mainTab: { paddingVertical: 8, position: "relative", alignItems: "center" },
  mainTabActive: {},
  mainTabText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  mainTabTextActive: { color: BRAND_GRADIENT[0] },
  activeIndicator: { position: "absolute", bottom: -10, width: "100%", height: 3, backgroundColor: BRAND_GRADIENT[0], borderRadius: 2 },

  subCategoryWrapper: { paddingVertical: 12, borderTopWidth: 1, marginTop: 10 },
  subCategoryScroll: { paddingHorizontal: 20, gap: 8 },
  subChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  subChipActive: {},
  subChipText: { fontSize: 12, fontWeight: "700" },
  subChipTextActive: {},

  statsSelectorWrapper: { paddingVertical: 10, borderTopWidth: 1 },
  statsScroll: { paddingHorizontal: 20, gap: 10 },
  statChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  statChipActive: { backgroundColor: BRAND_GRADIENT[0], borderColor: BRAND_GRADIENT[0] },
  statChipText: { fontSize: 12, fontWeight: "800" },
  statChipTextActive: { color: "#FFFFFF" },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 },
  tableContainer: { borderRadius: 22, borderWidth: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, overflow: "hidden" },
  
  leaderboardContainer: { borderRadius: 24, borderWidth: 1, paddingVertical: 5 },
  playerCard: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1 },
  rankCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center", marginRight: 12, borderWidth: 1 },
  rankText: { fontSize: 13, fontWeight: "900" },
  
  playerAvatarWrapper: { position: "relative", marginRight: 15 },
  playerAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2 },
  tinyTeamLogo: { position: "absolute", bottom: -2, right: -4, width: 18, height: 18, borderRadius: 9, borderWidth: 1 },
  
  playerInfo: { flex: 1, justifyContent: "center" },
  playerName: { fontSize: 15, fontWeight: "800", marginBottom: 2 },
  playerTeam: { fontSize: 11, fontWeight: "600" },
  
  statValueBox: { alignItems: "flex-end", minWidth: 45 },
  statValueNumber: { fontSize: 18, fontWeight: "900" },
  statValueLabel: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },

  emptyCard: { alignItems: "center", paddingVertical: 50, marginTop: 40, borderRadius: 24, borderWidth: 1, borderStyle: "dashed" },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: 12 },
  emptySubtitle: { fontSize: 14, fontWeight: "500", marginTop: 4 },
});