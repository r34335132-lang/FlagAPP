import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  useWindowDimensions,
  Modal,
  Image,
  Animated,
  TouchableOpacity
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMatches } from "@/hooks/useMatches";
import { useTeams } from "@/hooks/useTeams";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";

// Ramas principales
const MAIN_CATEGORIES = [
  { id: "all", label: "TODOS" },
  { id: "en_vivo", label: "🔴 EN VIVO" },
  { id: "varonil", label: "VARONIL" },
  { id: "femenil", label: "FEMENIL" },
  { id: "mixto", label: "MIXTO" },
  { id: "teens", label: "TEENS" },
];

// --- Animación Simple ---
const FadeInView = ({ children, delay = 0 }: { children: any, delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true })
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>{children}</Animated.View>;
};

const LivePulse = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />;
};

// --- Tarjeta de Partido Premium ---
const MatchCard = ({ game, teams }: { game: any, teams: any[] }) => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const router = useRouter();

  if (!game) return null;
  const homeTeam = teams.find((t) => t.name === game.home_team);
  const awayTeam = teams.find((t) => t.name === game.away_team);
  const isLive = ["en vivo", "en_vivo", "en curso"].includes(game.status?.toLowerCase() ?? "");
  const isFinished = ["finalizado", "final"].includes(game.status?.toLowerCase() ?? "");

  const TeamRow = ({ team, name, score, isWinner }: any) => (
    <View style={styles.teamRow}>
      <View style={styles.teamInfo}>
        <View style={[styles.logoContainer, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
          {team?.logo_url ? (
            <Image source={{ uri: team.logo_url }} style={styles.teamLogo} resizeMode="contain" />
          ) : (
            <Text style={[styles.logoFallback, { color: currentColors.textMuted }]}>{name?.substring(0,2).toUpperCase() || "?"}</Text>
          )}
        </View>
        <Text style={[styles.teamName, { color: isWinner || isLive ? currentColors.text : currentColors.textSecondary }, isWinner && styles.teamNameWinner]} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={[styles.scoreBox, isWinner && { backgroundColor: `${BRAND_GRADIENT[0]}15`, borderColor: `${BRAND_GRADIENT[0]}30` }]}>
        <Text style={[styles.scoreText, { color: isWinner ? BRAND_GRADIENT[0] : currentColors.text }, isWinner && styles.scoreTextWinner]}>
          {score !== null && score !== undefined ? score : "-"}
        </Text>
      </View>
    </View>
  );

  return (
    <Pressable 
      onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
      style={[styles.matchCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, shadowColor: theme === 'dark' ? '#000' : '#334155' }]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.statusBadgeWrap}>
          {isLive ? (
            <View style={styles.liveBadge}><LivePulse /><Text style={styles.liveBadgeText}>EN VIVO</Text></View>
          ) : (
            <Text style={[styles.statusText, { color: currentColors.textSecondary }]}>{isFinished ? "FINALIZADO" : game.game_time?.substring(0, 5) || "TBD"}</Text>
          )}
        </View>
        <Text style={[styles.categoryText, { color: BRAND_GRADIENT[0] }]}>{game.category?.replace("-", " ").toUpperCase()} • J{game.jornada || "?"}</Text>
      </View>
      <View style={styles.cardBody}>
        <TeamRow team={homeTeam} name={game.home_team} score={game.home_score} isWinner={isFinished && game.home_score > game.away_score} />
        <View style={styles.middleDividerContainer}>
          <View style={[styles.teamDivider, { backgroundColor: currentColors.border }]} />
          <Text style={[styles.vsText, { color: currentColors.textMuted, backgroundColor: currentColors.card }]}>VS</Text>
        </View>
        <TeamRow team={awayTeam} name={game.away_team} score={game.away_score} isWinner={isFinished && game.away_score > game.home_score} />
      </View>
    </Pressable>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  
  // 🔥 Dimensiones para Tablets 🔥
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { data: games, isLoading, refetch } = useMatches();
  const { data: teams } = useTeams();
  
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";

  // Estados Base
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMainCat, setSelectedMainCat] = useState("all");
  
  // Estados Avanzados de Filtro
  const [selectedJornada, setSelectedJornada] = useState("all");
  const [selectedSubCat, setSelectedSubCat] = useState("all");
  const [selectedTeam, setSelectedTeam] = useState("all");

  // Modal
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [tempJornada, setTempJornada] = useState("all");
  const [tempSubCat, setTempSubCat] = useState("all");
  const [tempTeam, setTempTeam] = useState("all");

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  // Si cambiamos la pestaña principal (ej. de Varonil a Femenil), reseteamos los filtros avanzados
  useEffect(() => {
    setSelectedJornada("all");
    setSelectedSubCat("all");
    setSelectedTeam("all");
  }, [selectedMainCat]);

  // 1. Filtrar por Rama Principal
  const filteredByMain = useMemo(() => {
    if (!games) return [];
    if (selectedMainCat === "all") return games;
    if (selectedMainCat === "en_vivo") {
      return games.filter((g) => ["en vivo", "en_vivo", "live"].includes(g.status?.toLowerCase() || ""));
    }
    return games.filter((g) => g.category?.toLowerCase().startsWith(selectedMainCat.toLowerCase()));
  }, [games, selectedMainCat]);

  // 2. Extraer opciones dinámicas para los filtros avanzados
  const availableSubCats = useMemo(() => {
    if (selectedMainCat === "all" || selectedMainCat === "en_vivo") return [];
    const subs = new Set<string>();
    filteredByMain.forEach(g => {
      const parts = g.category?.split("-"); 
      if (parts && parts.length > 1) subs.add(parts[1].toLowerCase());
    });
    return Array.from(subs).sort(); 
  }, [filteredByMain, selectedMainCat]);

  const availableJornadas = useMemo(() => {
    const j = new Set<string>();
    filteredByMain.forEach(g => { if (g.jornada) j.add(String(g.jornada)); });
    return Array.from(j).sort((a, b) => parseInt(a) - parseInt(b));
  }, [filteredByMain]);

  const availableTeams = useMemo(() => {
    const t = new Set<string>();
    filteredByMain.forEach(g => {
      if (g.home_team) t.add(g.home_team);
      if (g.away_team) t.add(g.away_team);
    });
    return Array.from(t).sort();
  }, [filteredByMain]);

  // 3. Filtro Final (Aplicando Modal)
  const finalFilteredGames = useMemo(() => {
    let filtered = filteredByMain;
    
    if (selectedSubCat !== "all") {
      filtered = filtered.filter(g => {
        const parts = g.category?.split("-");
        return parts && parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
      });
    }
    if (selectedJornada !== "all") {
      filtered = filtered.filter(g => String(g.jornada) === selectedJornada);
    }
    if (selectedTeam !== "all") {
      filtered = filtered.filter(g => g.home_team === selectedTeam || g.away_team === selectedTeam);
    }
    
    return filtered;
  }, [filteredByMain, selectedSubCat, selectedJornada, selectedTeam]);

  // 4. Agrupar por Jornada
  const groupedByJornada = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    finalFilteredGames.forEach((game) => {
      const jKey = selectedMainCat === "en_vivo" ? "JUGANDO AHORA" : (game.jornada ? `JORNADA ${game.jornada}` : "POR DEFINIR");
      if (!groups[jKey]) groups[jKey] = [];
      groups[jKey].push(game);
    });

    return Object.keys(groups).sort((a, b) => {
        if (a === "JUGANDO AHORA") return -1; 
        const numA = parseInt(a.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.replace(/\D/g, "")) || 0;
        return numA - numB;
    }).map(jornada => ({ title: jornada, data: groups[jornada] }));
  }, [finalFilteredGames, selectedMainCat]);

  const openFilters = () => {
    setTempJornada(selectedJornada);
    setTempSubCat(selectedSubCat);
    setTempTeam(selectedTeam);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setSelectedJornada(tempJornada);
    setSelectedSubCat(tempSubCat);
    setSelectedTeam(tempTeam);
    setFilterModalVisible(false);
  };

  const FilterOption = ({ label, isSelected, onPress }: any) => (
    <Pressable
      onPress={onPress}
      style={[styles.filterOptionModal, { backgroundColor: isSelected ? BRAND_GRADIENT[0] : currentColors.bgSecondary, borderColor: isSelected ? 'transparent' : currentColors.borderLight }]}
    >
      <Text style={[styles.filterOptionTextModal, { color: isSelected ? '#FFFFFF' : currentColors.text }]}>{label}</Text>
    </Pressable>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.loading, { backgroundColor: currentColors.bg }]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      
      {/* --- HEADER Y TABS PRINCIPALES --- */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10, backgroundColor: currentColors.card, borderBottomColor: currentColors.border, shadowColor: isDark ? '#000' : '#0F172A' }]}>
        <View style={styles.contentWrapper}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: currentColors.text }]}>Partidos</Text>
            <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={20} color={currentColors.textMuted} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.mainCategoryScroll, isTablet && { justifyContent: "center", flexGrow: 1 }]}>
            {MAIN_CATEGORIES.map((cat) => {
              const isActive = selectedMainCat === cat.id;
              return (
                <Pressable key={cat.id} style={[styles.mainTab, isActive && styles.mainTabActive]} onPress={() => setSelectedMainCat(cat.id)}>
                  <Text style={[styles.mainTabText, { color: currentColors.textMuted }, isActive && styles.mainTabTextActive, cat.id === "en_vivo" && {color: isActive ? "#EF4444" : (isDark ? '#991B1B' : '#FCA5A5')}]}>
                    {cat.label}
                  </Text>
                  {isActive && <View style={[styles.activeIndicator, cat.id === "en_vivo" && {backgroundColor: "#EF4444"}]} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* --- LISTA DE PARTIDOS --- */}
      <FlatList
        data={groupedByJornada}
        keyExtractor={(item) => item.title}
        contentContainerStyle={[styles.listContent, { paddingBottom: isTablet ? insets.bottom + 100 : insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />}
        
        // 🔥 BARRA DE FILTROS FLOTANTE 🔥
        ListHeaderComponent={
          selectedMainCat !== "en_vivo" ? (
            <View style={[styles.contentWrapper, { marginBottom: 15 }]}>
              <BlurView intensity={isDark ? 40 : 80} tint={isDark ? "dark" : "light"} style={[styles.glassFilterBox, { borderColor: currentColors.borderLight, backgroundColor: isDark ? 'rgba(30,41,59,0.4)' : 'rgba(255,255,255,0.6)' }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillScroll}>
                  
                  <View style={[styles.filterPill, { backgroundColor: currentColors.card }]}>
                    <Ionicons name="calendar-outline" size={14} color={BRAND_GRADIENT[0]} />
                    <Text style={[styles.filterPillText, { color: currentColors.text }]}>{selectedJornada === "all" ? "Jornadas" : `Jornada ${selectedJornada}`}</Text>
                  </View>

                  {selectedMainCat !== "all" && (
                    <View style={[styles.filterPill, { backgroundColor: currentColors.card }]}>
                      <Ionicons name="trophy-outline" size={14} color={BRAND_GRADIENT[0]} />
                      <Text style={[styles.filterPillText, { color: currentColors.text }]}>{selectedSubCat === "all" ? "Nivel" : selectedSubCat.toUpperCase()}</Text>
                    </View>
                  )}

                  <View style={[styles.filterPill, { backgroundColor: currentColors.card }]}>
                    <Ionicons name="shield-outline" size={14} color={BRAND_GRADIENT[0]} />
                    <Text style={[styles.filterPillText, { color: currentColors.text }]} numberOfLines={1} ellipsizeMode="tail">
                      {selectedTeam === "all" ? "Equipos" : selectedTeam}
                    </Text>
                  </View>

                </ScrollView>
                <TouchableOpacity style={styles.adjustBtn} onPress={openFilters}>
                  <Ionicons name="options" size={20} color={BRAND_GRADIENT[0]} />
                </TouchableOpacity>
              </BlurView>
            </View>
          ) : null
        }

        renderItem={({ item, index }) => (
          <View style={[styles.jornadaSection, styles.contentWrapper]}>
            <FadeInView delay={index * 100}>
              <View style={styles.jornadaHeader}>
                <Text style={[styles.jornadaTitle, { color: currentColors.textSecondary }, item.title === "JUGANDO AHORA" && {color: "#EF4444"}]}>{item.title}</Text>
                <View style={[styles.line, { backgroundColor: currentColors.border }]} />
              </View>
              {item.data.map((game) => (
                <MatchCard key={game.id} game={game} teams={teams || []} />
              ))}
            </FadeInView>
          </View>
        )}

        ListEmptyComponent={
          <View style={[styles.emptyState, styles.contentWrapper]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: currentColors.bgSecondary }]}>
              <Ionicons name={selectedMainCat === "en_vivo" ? "american-football-outline" : "calendar-clear-outline"} size={40} color={BRAND_GRADIENT[0]} />
            </View>
            <Text style={[styles.emptyTitle, { color: currentColors.text }]}>
              {selectedMainCat === "en_vivo" ? "No hay juegos en vivo" : "Sin partidos"}
            </Text>
            <Text style={[styles.emptySub, { color: currentColors.textSecondary }]}>
              {selectedMainCat === "en_vivo" ? "Vuelve más tarde para seguir la acción minuto a minuto." : "No encontramos partidos con los filtros que seleccionaste."}
            </Text>
          </View>
        }
      />

      {/* --- MODAL DE FILTROS AVANZADOS --- */}
      <Modal visible={isFilterModalVisible} animationType="slide" transparent={true} onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.bg }, isTablet && { width: 500, alignSelf: 'center', borderRadius: 32, marginBottom: 'auto', marginTop: 'auto', maxHeight: '85%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currentColors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>Filtros de Partidos</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={[styles.modalCloseBtn, { backgroundColor: currentColors.bgSecondary }]}>
                <Ionicons name="close" size={20} color={currentColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              
              <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>JORNADA</Text>
              <View style={styles.filterGroup}>
                <FilterOption label="Todas las Jornadas" isSelected={tempJornada === "all"} onPress={() => setTempJornada("all")} currentColors={currentColors} />
                {availableJornadas.map(j => (
                  <FilterOption key={j} label={`Jornada ${j}`} isSelected={tempJornada === j} onPress={() => setTempJornada(j)} currentColors={currentColors} />
                ))}
              </View>

              {availableSubCats.length > 0 && (
                <>
                  <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>NIVEL / SUBCATEGORÍA</Text>
                  <View style={styles.filterGroup}>
                    <FilterOption label="Todos los Niveles" isSelected={tempSubCat === "all"} onPress={() => setTempSubCat("all")} currentColors={currentColors} />
                    {availableSubCats.map(sub => (
                      <FilterOption key={sub} label={sub.toUpperCase()} isSelected={tempSubCat === sub} onPress={() => setTempSubCat(sub)} currentColors={currentColors} />
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>EQUIPO</Text>
              <View style={styles.filterGroup}>
                <FilterOption label="Cualquier Equipo" isSelected={tempTeam === "all"} onPress={() => setTempTeam("all")} currentColors={currentColors} />
                {availableTeams.map(t => (
                  <FilterOption key={t} label={t} isSelected={tempTeam === t} onPress={() => setTempTeam(t)} currentColors={currentColors} />
                ))}
              </View>

            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: currentColors.borderLight, backgroundColor: currentColors.card }]}>
              <TouchableOpacity style={styles.resetBtn} onPress={() => { setTempJornada("all"); setTempSubCat("all"); setTempTeam("all"); }}>
                <Text style={[styles.resetBtnText, { color: currentColors.textSecondary }]}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={styles.applyBtnGradient}>
                  <Text style={styles.applyBtnText}>Aplicar Filtros</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  contentWrapper: { width: "100%", maxWidth: 800, alignSelf: "center" },

  // Barra superior fija
  topBar: { borderBottomWidth: 1, zIndex: 10, elevation: 4, shadowOpacity: 0.05, shadowRadius: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 10 },
  headerTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  refreshBtn: { padding: 8, backgroundColor: 'rgba(150,150,150,0.1)', borderRadius: 12 },

  // Tabs Principales
  mainCategoryScroll: { paddingHorizontal: 20, paddingBottom: 10, gap: 20 },
  mainTab: { paddingVertical: 8, position: "relative", alignItems: "center" },
  mainTabActive: {},
  mainTabText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  mainTabTextActive: { color: BRAND_GRADIENT[0] },
  activeIndicator: { position: "absolute", bottom: -10, width: "100%", height: 3, backgroundColor: BRAND_GRADIENT[0], borderRadius: 2 },

  // Glass Filter Bar
  glassFilterBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, padding: 6, paddingLeft: 8, borderWidth: 1, overflow: 'hidden' },
  filterPillScroll: { alignItems: 'center', gap: 8, paddingRight: 10 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, elevation: 2, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  filterPillText: { fontSize: 12, fontWeight: '800', maxWidth: 120 },
  adjustBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: `${BRAND_GRADIENT[0]}15` },

  listContent: { paddingHorizontal: 20, paddingTop: 20 },
  jornadaSection: { marginBottom: 25 },
  jornadaHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  jornadaTitle: { fontSize: 13, fontWeight: "900", letterSpacing: 1.5, textTransform: 'uppercase' },
  line: { flex: 1, height: 1, opacity: 0.5 },

  // MATCH CARD (Bento Box)
  matchCard: { borderRadius: 28, marginBottom: 16, borderWidth: 1, overflow: 'hidden', elevation: 3, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
  statusBadgeWrap: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  categoryText: { fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  cardBody: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  middleDividerContainer: { flexDirection: 'row', alignItems: 'center', paddingLeft: 50, paddingRight: 10, marginVertical: -2 },
  teamDivider: { flex: 1, height: 1, opacity: 0.5 },
  vsText: { fontSize: 10, fontWeight: '900', paddingHorizontal: 8, letterSpacing: 1 },
  teamRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  logoContainer: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden", marginRight: 14 },
  teamLogo: { width: "100%", height: "100%" },
  logoFallback: { fontSize: 14, fontWeight: "900" },
  teamName: { fontSize: 17, fontWeight: "700", flex: 1, paddingRight: 10, letterSpacing: -0.3 },
  teamNameWinner: { fontWeight: "900" },
  scoreBox: { minWidth: 46, paddingVertical: 6, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  scoreText: { fontSize: 22, fontWeight: "700" },
  scoreTextWinner: { fontSize: 24, fontWeight: "900" },
  liveBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#FEF2F2' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444", marginRight: 6 },
  liveBadgeText: { color: "#EF4444", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },

  // ESTADOS VACÍOS
  emptyState: { alignItems: "center", marginTop: 60, paddingVertical: 40, borderRadius: 32, borderWidth: 1, borderStyle: "dashed", borderColor: 'rgba(150,150,150,0.3)' },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 15 },
  emptyTitle: { fontSize: 18, fontWeight: "900", marginBottom: 8, textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", paddingHorizontal: 40, lineHeight: 22 },

  // MODAL DE FILTROS
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 22, borderBottomWidth: 1 },
  modalTitle: { fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  modalCloseBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { padding: 24, paddingBottom: 40 },
  filterGroupTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 14, marginTop: 10, textTransform: 'uppercase' },
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  filterOptionModal: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  filterOptionTextModal: { fontSize: 13, fontWeight: '800' },
  modalFooter: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, paddingBottom: 40, alignItems: 'center' },
  resetBtn: { paddingVertical: 14, paddingHorizontal: 20, justifyContent: 'center' },
  resetBtnText: { fontSize: 14, fontWeight: '800' },
  applyBtn: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  applyBtnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }
});