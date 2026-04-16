import React, { useState, useMemo, useEffect, useRef } from "react";
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
  useColorScheme,
  useWindowDimensions,
  Animated,
  Easing
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router"; 
import { Ionicons } from "@expo/vector-icons";
import { useStats } from "@/hooks/useStats";
import { useTeams } from "@/hooks/useTeams";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { StandingsTable } from "@/components/StandingsTable";
import { BRAND_GRADIENT, Colors } from "@/constants/colors"; 

const BASE_URL = "https://www.flagdurango.com.mx";

const MAIN_CATEGORIES = [
  { id: "all", label: "TODOS" },
  { id: "varonil", label: "VARONIL" },
  { id: "femenil", label: "FEMENIL" },
  { id: "mixto", label: "MIXTO" },
  { id: "teens", label: "TEENS" },
];

type StatType = "touchdowns_totales" | "pases_completos" | "puntos_extra" | "sacks" | "intercepciones" | "banderas_jaladas" | "mvps";
type StatCategory = "ofensiva" | "defensa" | "premios"; // 🔥 Cambiado a 'ofensiva'

// ─────────────────────────────────────────────────────────────────────────────
// ANIMACIÓN CASCADA
// ─────────────────────────────────────────────────────────────────────────────
const FadeInView = ({ children, delay = 0 }: { children: any, delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) })
    ]).start();
  }, [delay]);

  return <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>{children}</Animated.View>;
};

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function StandingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter(); 
  
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useStats();
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams();
  const { data: playerStats, isLoading: playersLoading, refetch: refetchPlayers } = usePlayerStats();
  
  const [mvpStats, setMvpStats] = useState<any[]>([]);
  const [mvpLoading, setMvpLoading] = useState(false);
  
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"teams" | "players">("teams");
  
  const [activeStatCategory, setActiveStatCategory] = useState<StatCategory>("ofensiva"); // 🔥 Por defecto Ofensiva
  const [statType, setStatType] = useState<StatType>("touchdowns_totales");
  
  const [selectedMainCat, setSelectedMainCat] = useState("varonil"); 
  const [selectedSubCat, setSelectedSubCat] = useState("all");

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";

  const topPad = insets.top + (Platform.OS === "web" ? 20 : 10);
  const isLoading = statsLoading || teamsLoading || playersLoading || mvpLoading;

  useEffect(() => {
    setSelectedSubCat("all");
  }, [selectedMainCat]);

  // 🔥 Cargar Datos de MVPs desde su propia API 🔥
  const fetchMvps = async () => {
    setMvpLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/mvps/stats`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setMvpStats(json.data);
      }
    } catch (e) {
      console.log("Error al cargar MVPs", e);
    } finally {
      setMvpLoading(false);
    }
  };

  useEffect(() => {
    fetchMvps();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchTeams(), refetchPlayers(), fetchMvps()]);
    setRefreshing(false);
  };

  // Lógica de datos de equipos
  const statsWithZeros = useMemo(() => {
    if (!teams) return stats || [];
    const statsMap = new Map((stats || []).map((s: any) => [s.team_name || s.name, s]));
    
    const allStats = teams.map((team: any) => {
      if (statsMap.has(team.name)) return statsMap.get(team.name);
      return { 
        team_id: team.id, team_name: team.name, team_category: team.category, 
        games_played: 0, wins: 0, losses: 0, draws: 0, 
        points_for: 0, points_against: 0, points_difference: 0, points: 0 
      };
    });

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
    statsByMainCat.forEach((s: any) => {
      const parts = s.team_category?.split("-");
      if (parts && parts.length > 1) subs.add(parts[1].toLowerCase());
    });
    return Array.from(subs).sort();
  }, [statsByMainCat, selectedMainCat]);

  const finalFilteredStats = useMemo(() => {
    if (selectedSubCat === "all") return statsByMainCat;
    return statsByMainCat.filter((s: any) => {
      const parts = s.team_category?.split("-");
      return parts && parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
    });
  }, [statsByMainCat, selectedSubCat]);

  // 🔥 LÓGICA CONSOLIDADA DE LÍDERES (Soporta Normal y MVPs) 🔥
  const topPlayers = useMemo(() => {
    if (statType === "mvps") {
      // 🏆 Filtrado especial para la lista de MVPs
      let filtered = mvpStats;
      if (selectedMainCat !== "all") {
        filtered = filtered.filter(p => p.categories?.some((c: string) => c.toLowerCase().startsWith(selectedMainCat.toLowerCase())));
      }
      if (selectedSubCat !== "all") {
        filtered = filtered.filter(p => p.categories?.some((c: string) => {
          const parts = c.split("-");
          return parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
        }));
      }

      // Mapeamos los datos para que el componente Card los lea igual que a un jugador normal
      return filtered.map(m => ({
        id: m.player_id,
        name: m.player_name,
        photo_url: m.photo_url,
        teams: { name: m.team_name, logo_url: m.team_logo },
        mvps: m.mvp_count,
        weighted_mvps: m.weighted_mvp_count,
      })).sort((a, b) => b.weighted_mvps - a.weighted_mvps).slice(0, 50);

    } else {
      // 🏈 Filtrado normal para Estadísticas de Juego (TDs, INTs, etc.)
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
      return filtered.sort((a, b) => (b[statType] || 0) - (a[statType] || 0)).slice(0, 50); 
    }
  }, [playerStats, mvpStats, selectedMainCat, selectedSubCat, statType]);

  // 🔥 Estilos de Podio Premium 🔥
  const getRankStyle = (index: number) => {
    if (index === 0) return { bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB', color: '#F59E0B', border: '#FDE68A', icon: "trophy" }; 
    if (index === 1) return { bg: isDark ? 'rgba(148, 163, 184, 0.15)' : '#F8FAFC', color: '#94A3B8', border: '#E2E8F0', icon: "medal" }; 
    if (index === 2) return { bg: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FFF7ED', color: '#D97706', border: '#FFEDD5', icon: "medal" }; 
    return { bg: isDark ? currentColors.bgSecondary : '#F1F5F9', color: currentColors.textMuted, border: isDark ? currentColors.borderLight : '#E2E8F0', icon: null };
  };

  const getStatLabel = (type: StatType) => {
    switch(type) {
      case 'touchdowns_totales': return 'TDs';
      case 'pases_completos': return 'COMP';
      case 'puntos_extra': return 'PTS EX';
      case 'sacks': return 'SACKS';
      case 'intercepciones': return 'INTs';
      case 'banderas_jaladas': return 'SAF';
      case 'mvps': return 'MVPs';
      default: return '';
    }
  };

  const handleCategoryPress = (category: StatCategory) => {
    setActiveStatCategory(category);
    if (category === "ofensiva") setStatType("touchdowns_totales"); // 🔥 Corregido a 'ofensiva'
    if (category === "defensa") setStatType("sacks");
    if (category === "premios") setStatType("mvps");
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      
      {/* ── HEADER PREMIUM ── */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: currentColors.card, borderBottomColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#475569' }]}>
        <View style={styles.headerContentWrapper}>
          
          <View style={styles.headerTopRow}>
            <Text style={[styles.screenTitle, { color: currentColors.text }]}>Clasificación</Text>
          </View>

          {/* Toggle Teams / Players */}
          <View style={styles.toggleWrapper}>
            <View style={[styles.toggleContainer, { backgroundColor: currentColors.bgSecondary }]}>
              <Pressable 
                style={[styles.toggleBtn, viewMode === "teams" && [styles.toggleBtnActive, { backgroundColor: currentColors.text, shadowColor: isDark ? '#000' : '#475569' }]]}
                onPress={() => setViewMode("teams")}
              >
                <Ionicons name="shield" size={16} color={viewMode === "teams" ? currentColors.bg : currentColors.textSecondary} />
                <Text style={[styles.toggleText, { color: currentColors.textSecondary }, viewMode === "teams" && [styles.toggleTextActive, { color: currentColors.bg }]]}>Equipos</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.toggleBtn, viewMode === "players" && [styles.toggleBtnActive, { backgroundColor: currentColors.text, shadowColor: isDark ? '#000' : '#475569' }]]}
                onPress={() => setViewMode("players")}
              >
                <Ionicons name="people" size={18} color={viewMode === "players" ? currentColors.bg : currentColors.textSecondary} />
                <Text style={[styles.toggleText, { color: currentColors.textSecondary }, viewMode === "players" && [styles.toggleTextActive, { color: currentColors.bg }]]}>Líderes</Text>
              </Pressable>
            </View>
          </View>

          {/* Menú Principal */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.mainCategoryScroll, isTablet && { justifyContent: "center", flexGrow: 1 }]}>
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
        </View>

        {/* Menú Secundario */}
        {selectedMainCat !== "all" && availableSubCats.length > 0 && (
          <View style={[styles.subCategoryWrapper, { backgroundColor: currentColors.bgSecondary, borderTopColor: currentColors.borderLight }]}>
            <View style={styles.headerContentWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.subCategoryScroll, isTablet && { justifyContent: "center", flexGrow: 1 }]}>
                
                <Pressable 
                  style={[styles.subChip, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }, selectedSubCat === "all" && { backgroundColor: currentColors.text, borderColor: currentColors.text }]} 
                  onPress={() => setSelectedSubCat("all")}
                >
                  <Text style={[styles.subChipText, { color: currentColors.textSecondary }, selectedSubCat === "all" && { color: currentColors.bg }]}>Todas</Text>
                </Pressable>
                
                {availableSubCats.map(sub => (
                  <Pressable 
                    key={sub} 
                    style={[styles.subChip, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }, selectedSubCat === sub && { backgroundColor: currentColors.text, borderColor: currentColors.text }]} 
                    onPress={() => setSelectedSubCat(sub)}
                  >
                    <Text style={[styles.subChipText, { color: currentColors.textSecondary }, selectedSubCat === sub && { color: currentColors.bg }]}>{sub.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Filtros de Jugador */}
        {viewMode === "players" && (
          <View style={[styles.filterContainer, { backgroundColor: currentColors.card, borderTopColor: currentColors.borderLight }]}>
            <View style={styles.headerContentWrapper}>
              
              <View style={styles.filterMainRow}>
                <Pressable 
                  style={[styles.filterMainBtn, {backgroundColor: isDark ? currentColors.bgSecondary : '#F8FAFC'}, activeStatCategory === "ofensiva" && [styles.filterMainBtnActive, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF', borderColor: '#3B82F6' }]]} 
                  onPress={() => handleCategoryPress("ofensiva")}
                >
                  <Text style={[styles.filterMainText, { color: currentColors.textMuted }, activeStatCategory === "ofensiva" && { color: '#3B82F6' }]}>⚔️ OFENSIVA</Text> 
                  {/* 🔥 Cambio visual de ATAQUE a OFENSIVA */}
                </Pressable>
                
                <Pressable 
                  style={[styles.filterMainBtn, {backgroundColor: isDark ? currentColors.bgSecondary : '#F8FAFC'}, activeStatCategory === "defensa" && [styles.filterMainBtnActive, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2', borderColor: '#EF4444' }]]} 
                  onPress={() => handleCategoryPress("defensa")}
                >
                  <Text style={[styles.filterMainText, { color: currentColors.textMuted }, activeStatCategory === "defensa" && { color: '#EF4444' }]}>🛡️ DEFENSA</Text>
                </Pressable>

                <Pressable 
                  style={[styles.filterMainBtn, {backgroundColor: isDark ? currentColors.bgSecondary : '#F8FAFC'}, activeStatCategory === "premios" && [styles.filterMainBtnActive, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB', borderColor: '#F59E0B' }]]} 
                  onPress={() => handleCategoryPress("premios")}
                >
                  <Text style={[styles.filterMainText, { color: currentColors.textMuted }, activeStatCategory === "premios" && { color: '#F59E0B' }]}>🏆 PREMIOS</Text>
                </Pressable>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterSubScroll, isTablet && { justifyContent: "center", flexGrow: 1 }]}>
                {activeStatCategory === "ofensiva" && ( // 🔥 Corregido condicional
                  <>
                    <StatChip type="touchdowns_totales" label="🏈 Anotaciones" active={statType} onPress={setStatType} colors={currentColors} />
                    <StatChip type="pases_completos" label="🎯 QB Pass" active={statType} onPress={setStatType} colors={currentColors} />
                  </>
                )}
                {activeStatCategory === "defensa" && (
                  <>
                    <StatChip type="sacks" label="🛑 Sacks" active={statType} onPress={setStatType} colors={currentColors} />
                    <StatChip type="intercepciones" label="🤲 Intercepciones" active={statType} onPress={setStatType} colors={currentColors} />
                  </>
                )}
                {activeStatCategory === "premios" && (
                  <>
                    <StatChip type="mvps" label="⭐ MVPs" active={statType} onPress={setStatType} colors={currentColors} />
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      {/* ── CUERPO PRINCIPAL ── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: isTablet ? insets.bottom + 100 : insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />}
      >
        <View style={styles.mainContentWrapper}>
          {isLoading && !refreshing ? (
             <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} style={{ marginTop: 50 }} />
          ) : viewMode === "teams" ? (
            
            // 🔥 VISTA EQUIPOS
            finalFilteredStats.length > 0 ? (
              <FadeInView delay={100}>
                <View style={[styles.tableContainer, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#475569' }]}>
                  <StandingsTable stats={finalFilteredStats} teams={teams || []} />
                </View>
              </FadeInView>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}>
                <Ionicons name="trophy-outline" size={48} color={currentColors.textMuted} />
                <Text style={[styles.emptyTitle, { color: currentColors.text }]}>Sin datos</Text>
                <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>No hay equipos registrados en esta categoría</Text>
              </View>
            )

          ) : (

            // 🔥 VISTA JUGADORES
            topPlayers.length > 0 ? (
              <View style={styles.playersList}>
                {topPlayers.map((player, index) => {
                  const rankStyles = getRankStyle(index);
                  const hasPhoto = player.photo_url && !player.photo_url.startsWith("blob:");

                  return (
                    <FadeInView key={player.id} delay={(index % 10) * 50}>
                      <Pressable 
                        // 🔥 NAVEGACIÓN A PERFIL DE JUGADOR 🔥
                        onPress={() => router.push(`/player/${player.id}`)}
                        style={({pressed}) => [
                          styles.playerCard, 
                          { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#475569' },
                          pressed && { transform: [{ scale: 0.98 }] }
                        ]}
                      >
                        
                        {/* PODIO */}
                        <View style={[styles.rankBadge, { backgroundColor: rankStyles.bg, borderColor: rankStyles.border }]}>
                          {rankStyles.icon ? (
                            <Ionicons name={rankStyles.icon as any} size={16} color={rankStyles.color} />
                          ) : (
                            <Text style={[styles.rankText, { color: rankStyles.color }]}>{index + 1}</Text>
                          )}
                        </View>
                        
                        {/* AVATAR Y EQUIPO */}
                        <View style={styles.playerAvatarWrapper}>
                          {hasPhoto ? (
                            <Image source={{ uri: player.photo_url }} style={[styles.playerAvatar, { borderColor: currentColors.borderLight }]} />
                          ) : (
                            <View style={[styles.playerAvatar, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, justifyContent: 'center', alignItems: 'center' }]}>
                              <Ionicons name="person" size={22} color={currentColors.textMuted} />
                            </View>
                          )}
                          
                          {player.teams?.logo_url && (
                            <View style={[styles.tinyTeamLogoWrapper, { borderColor: currentColors.card }]}>
                              <Image source={{ uri: player.teams.logo_url }} style={styles.tinyTeamLogo} />
                            </View>
                          )}
                        </View>

                        {/* INFO JUGADOR */}
                        <View style={styles.playerInfo}>
                          <Text style={[styles.playerName, { color: currentColors.text }]} numberOfLines={1}>{player.name}</Text>
                          <Text style={[styles.playerTeam, { color: currentColors.textSecondary }]} numberOfLines={1}>
                            {player.teams?.name} 
                            {player.jersey_number ? <Text style={{color: BRAND_GRADIENT[0]}}> #{player.jersey_number}</Text> : null}
                          </Text>
                        </View>

                        {/* STATS DESTACADA */}
                        <View style={styles.statValueBox}>
                          <Text style={[styles.statValueNumber, { color: currentColors.text }]}>{player[statType] || 0}</Text>
                          <Text style={[styles.statValueLabel, { color: currentColors.textMuted }]}>{getStatLabel(statType)}</Text>
                        </View>
                        
                        <Ionicons name="chevron-forward" size={16} color={currentColors.textMuted} style={{marginLeft: 8}} />

                      </Pressable>
                    </FadeInView>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}>
                <Ionicons name="medal-outline" size={48} color={currentColors.textMuted} />
                <Text style={[styles.emptyTitle, { color: currentColors.text }]}>Sin jugadores</Text>
                <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>Aún no hay registros para esta estadística.</Text>
              </View>
            )

          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE CHIP
// ─────────────────────────────────────────────────────────────────────────────
const StatChip = ({ type, label, active, onPress, colors }: any) => {
  const isActive = active === type;
  return (
    <Pressable 
      style={[
        styles.statChip, 
        { backgroundColor: colors.bgSecondary, borderColor: colors.borderLight },
        isActive && styles.statChipActive
      ]} 
      onPress={() => onPress(type)}
    >
      <Text style={[
        styles.statChipText, 
        { color: colors.textSecondary },
        isActive && styles.statChipTextActive
      ]}>{label}</Text>
    </Pressable>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS PREMIUM
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingBottom: 10, zIndex: 10, elevation: 6, shadowOpacity: 0.1, shadowRadius: 12 },
  headerContentWrapper: { width: "100%", maxWidth: 800, alignSelf: "center" },
  
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24 },
  screenTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  
  toggleWrapper: { paddingHorizontal: 24, marginVertical: 15 },
  toggleContainer: { flexDirection: "row", borderRadius: 16, padding: 6 },
  toggleBtn: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 10, borderRadius: 12, gap: 8 },
  toggleBtnActive: { elevation: 3, shadowOpacity: 0.1, shadowRadius: 6 },
  toggleText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  toggleTextActive: {},

  mainCategoryScroll: { paddingHorizontal: 24, paddingBottom: 5, gap: 24 },
  mainTab: { paddingVertical: 10, position: "relative", alignItems: "center" },
  mainTabActive: {},
  mainTabText: { fontSize: 13, fontWeight: "800", letterSpacing: 1, textTransform: 'uppercase' },
  mainTabTextActive: { color: BRAND_GRADIENT[0] },
  activeIndicator: { position: "absolute", bottom: -5, width: "100%", height: 3, backgroundColor: BRAND_GRADIENT[0], borderRadius: 2 },

  subCategoryWrapper: { paddingVertical: 14, borderTopWidth: 1, marginTop: 10 },
  subCategoryScroll: { paddingHorizontal: 20, gap: 10 },
  subChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  subChipText: { fontSize: 12, fontWeight: "800", textTransform: 'uppercase', letterSpacing: 0.5 },

  filterContainer: { paddingTop: 15, paddingBottom: 10, borderTopWidth: 1 },
  filterMainRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 15 },
  filterMainBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "transparent" },
  filterMainBtnActive: { elevation: 1 },
  filterMainText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  
  filterSubScroll: { paddingHorizontal: 20, gap: 8 },
  statChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
  statChipActive: { backgroundColor: BRAND_GRADIENT[0], borderColor: BRAND_GRADIENT[0], elevation: 2 },
  statChipText: { fontSize: 12, fontWeight: "800" },
  statChipTextActive: { color: "#FFFFFF" },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  mainContentWrapper: { width: "100%", maxWidth: 800, alignSelf: "center" },

  // --- TABLA EQUIPOS ---
  tableContainer: { borderRadius: 28, borderWidth: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 3, overflow: "hidden", marginBottom: 20 },
  
  // --- LISTA JUGADORES BENTO BOX ---
  playersList: { gap: 12 },
  playerCard: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, elevation: 2, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 },
  
  rankBadge: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", marginRight: 14, borderWidth: 1 },
  rankText: { fontSize: 14, fontWeight: "900" },
  
  playerAvatarWrapper: { position: "relative", marginRight: 16 },
  playerAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2 },
  
  tinyTeamLogoWrapper: { position: "absolute", bottom: -2, right: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', padding: 2 },
  tinyTeamLogo: { width: '100%', height: '100%', resizeMode: 'contain' },
  
  playerInfo: { flex: 1, justifyContent: "center" },
  playerName: { fontSize: 16, fontWeight: "900", marginBottom: 2, letterSpacing: -0.3 },
  playerTeam: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  
  statValueBox: { alignItems: "flex-end", minWidth: 45 },
  statValueNumber: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  statValueLabel: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },

  emptyCard: { alignItems: "center", paddingVertical: 50, marginTop: 40, borderRadius: 32, borderWidth: 1, borderStyle: "dashed" },
  emptyTitle: { fontSize: 19, fontWeight: "900", marginTop: 12, letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 14, fontWeight: "600", marginTop: 6, paddingHorizontal: 40, textAlign: 'center' },
});