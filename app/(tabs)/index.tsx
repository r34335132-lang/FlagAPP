import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
  RefreshControl,
  Pressable,
  SectionList,
  ScrollView,
  Linking,
  useColorScheme,
  Animated,
  Easing,
  Modal,
  TouchableOpacity,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaskedView from "@react-native-masked-view/masked-view";
import { useMatches } from "@/hooks/useMatches";
import { isSeasonActive, seasonLabel, useSelectedSeason } from "@/hooks/useSeasons";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { useStats } from "@/hooks/useStats";
import { useTeams } from "@/hooks/useTeams";
import { MatchCardSkeleton } from "@/components/SkeletonLoader";
import { Colors } from "@/constants/colors";

// Colores de la liga
const LEAGUE_GRADIENT: [string, string, string] = ['#3B82F6', '#8B5CF6', '#EC4899']; // Azul -> Morado -> Rosa

const navigateFromHome = (path: string) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.assign(path);
    return;
  }
  router.push(path as any);
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. ANIMACIONES BASE
// ─────────────────────────────────────────────────────────────────────────────

const FadeInView = ({ children, delay = 0, style }: { children: any, delay?: number, style?: any }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: delay, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: delay, useNativeDriver: true, easing: Easing.out(Easing.exp) })
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

const LivePulse = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />;
};

function useLiveTimer(game: any) {
  const [displayTime, setDisplayTime] = useState("");

  useEffect(() => {
    if (!game) return;
    const status = game.status?.toLowerCase() ?? "";
    if (status !== "en vivo" && status !== "en_vivo") {
      setDisplayTime("EN VIVO");
      return;
    }

    const updateClock = () => {
      let remaining = game.seconds_remaining ?? 1200;
      if (game.clock_running && game.clock_last_started_at) {
        const startedAt = new Date(game.clock_last_started_at).getTime();
        const now = new Date().getTime();
        remaining = Math.max(0, remaining - Math.floor((now - startedAt) / 1000));
      }
      const m = Math.floor(remaining / 60).toString().padStart(2, '0');
      const s = (remaining % 60).toString().padStart(2, '0');
      setDisplayTime(`${game.current_period ?? '1H'} • ${m}:${s}`);
    };

    updateClock();
    let interval: ReturnType<typeof setInterval>;
    if (game.clock_running) interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [game]);

  return displayTime;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMPONENTES DE UI MODERNOS
// ─────────────────────────────────────────────────────────────────────────────

// TOP NAV BAR: Efecto cristal fijo arriba, ocupa mínimo espacio
const FloatingTopNav = ({ user, topPad, onProfilePress, isTablet }: any) => {
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";

  return (
    <BlurView 
      intensity={isDark ? 40 : 80} 
      tint={isDark ? "dark" : "light"} 
      style={[styles.floatingNavContainer, { paddingTop: topPad + 10 }]}
    >
      <View style={[styles.navInner, isTablet && { paddingHorizontal: 20 }]}>
        <Image
          source={{ uri: "https://www.flagdurango.com.mx/images/logo-flag-durango.png" }}
          style={[styles.headerLogoModern, { tintColor: isDark ? "#FFFFFF" : "#111827" }]}
          resizeMode="contain"
        />
        <Pressable onPress={onProfilePress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
          {user ? (
             <View style={[styles.avatarMini, { backgroundColor: LEAGUE_GRADIENT[1] }]}>
               <Text style={styles.avatarMiniText}>{user.username.charAt(0).toUpperCase()}</Text>
             </View>
          ) : (
            <Ionicons name="person-circle" size={32} color={LEAGUE_GRADIENT[1]} />
          )}
        </Pressable>
      </View>
    </BlurView>
  );
};

// GREETING: Ahora vive dentro de la lista para hacer scroll
const GreetingScrollable = ({ user, dateStr }: any) => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  return (
    <View style={styles.greetingContainerModern}>
      <Text style={[styles.dateTextModern, { color: currentColors.textMuted }]}>{dateStr.toUpperCase()}</Text>
      <Text style={[styles.greetingTextModern, { color: currentColors.text }]}>¿Listo para jugar,</Text>
      <View style={styles.gradientTextWrapper}>
        <MaskedView maskElement={<Text style={styles.greetingTextGradient}>{user ? user.username : "Campeón"}? 🏈</Text>}>
          <LinearGradient colors={LEAGUE_GRADIENT} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
            <Text style={[styles.greetingTextGradient, { opacity: 0 }]}>{user ? user.username : "Campeón"}? 🏈</Text>
          </LinearGradient>
        </MaskedView>
      </View>
    </View>
  );
};

const FilterOption = ({ label, isSelected, onPress, currentColors }: any) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.filterOptionModal,
      { backgroundColor: isSelected ? LEAGUE_GRADIENT[1] : currentColors.bgSecondary }
    ]}
  >
    <Text style={[styles.filterOptionTextModal, { color: isSelected ? '#FFFFFF' : currentColors.text }]}>{label}</Text>
  </Pressable>
);

// NUEVA FILTER BAR: Píldoras independientes y limpias
const ActiveFiltersBar = ({ onOpenModal, activeJornada, activeCategory, activeField }: any) => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  return (
    <View style={styles.filterBarContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillScroll}>
        
        {/* Botón de Ajustes Circular Elegante */}
        <TouchableOpacity style={[styles.adjustBtnCircle, { backgroundColor: currentColors.card, shadowColor: theme === 'dark' ? '#000' : '#cbd5e1' }]} onPress={onOpenModal}>
          <Ionicons name="options-outline" size={20} color={currentColors.text} />
        </TouchableOpacity>
        
        {/* Píldoras Activas con Gradiente */}
        <View style={[styles.modernPill, activeJornada === "TODAS" ? { backgroundColor: currentColors.card } : {}]}>
          {activeJornada === "TODAS" ? (
             <Text style={[styles.modernPillText, { color: currentColors.text }]}>Jornadas</Text>
          ) : (
             <LinearGradient colors={LEAGUE_GRADIENT} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.pillGradient}>
               <Text style={[styles.modernPillText, { color: '#FFF' }]}>Jornada {activeJornada}</Text>
             </LinearGradient>
          )}
        </View>
        
        {activeCategory !== "TODAS" && (
          <View style={styles.modernPill}>
             <LinearGradient colors={LEAGUE_GRADIENT} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.pillGradient}>
               <Text style={[styles.modernPillText, { color: '#FFF' }]}>{activeCategory}</Text>
             </LinearGradient>
          </View>
        )}

        {activeField !== "TODOS" && (
          <View style={styles.modernPill}>
             <LinearGradient colors={LEAGUE_GRADIENT} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.pillGradient}>
               <Text style={[styles.modernPillText, { color: '#FFF' }]}>Campo {activeField}</Text>
             </LinearGradient>
          </View>
        )}

      </ScrollView>
    </View>
  );
};

const CommunityCard = () => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  return (
    <FadeInView delay={300} style={styles.communityWrapper}>
      <LinearGradient colors={[`${LEAGUE_GRADIENT[0]}15`, `${LEAGUE_GRADIENT[2]}15`]} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.communityCard, { borderColor: `${LEAGUE_GRADIENT[1]}30` }]}>
        <View style={styles.communityContent}>
          <Text style={[styles.communityTitle, { color: currentColors.text }]}>Únete a la Acción 📸</Text>
          <Text style={[styles.communitySub, { color: currentColors.textSecondary }]}>Las mejores fotos y exclusivas.</Text>
        </View>
        <View style={styles.socialButtonsRow}>
          <Pressable style={({ pressed }) => [styles.socialBtnCircle, { backgroundColor: '#E1306C', opacity: pressed ? 0.8 : 1 }]} onPress={() => Linking.openURL('https://www.instagram.com/flag.durango/')}>
            <Ionicons name="logo-instagram" size={20} color="#FFF" />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.socialBtnCircle, { backgroundColor: '#1877F2', opacity: pressed ? 0.8 : 1 }]} onPress={() => Linking.openURL('https://www.facebook.com/TBFDurango')}>
            <Ionicons name="logo-facebook" size={20} color="#FFF" />
          </Pressable>
        </View>
      </LinearGradient>
    </FadeInView>
  );
};

const HomeSeasonPanel = ({ selectedSeason, games, teams, topTeam, topPlayer, currentColors }: any) => {
  const upcomingCount = games.filter((game: any) => ["programado", "proximo", "pendiente"].includes(game.status?.toLowerCase() ?? "")).length;
  const recentCount = games.filter((game: any) => ["finalizado", "final", "terminado"].includes(game.status?.toLowerCase() ?? "")).length;
  const { seasons, selectedSeasonId, activeSeason, isLoading, setSelectedSeason } = useSelectedSeason();
  const panelColors = currentColors;

  return (
    <FadeInView delay={120} style={styles.seasonPanelWrap}>
      <View style={[styles.seasonPanel, { backgroundColor: panelColors.card, borderColor: panelColors.border }]}>
        <View style={styles.seasonPanelHeader}>
          <View style={styles.seasonHeading}>
            <Text style={[styles.seasonEyebrow, { color: panelColors.textSecondary }]}>Temporada</Text>
            <View style={styles.seasonTitleRow}>
              <Text style={[styles.seasonPanelTitle, { color: panelColors.text }]} numberOfLines={1}>{seasonLabel(selectedSeason)}</Text>
              {(selectedSeason?.id === activeSeason?.id || isSeasonActive(selectedSeason)) && (
                <View style={styles.seasonActiveBadge}>
                  <View style={styles.seasonActiveDot} />
                  <Text style={styles.seasonActiveText}>Activa</Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.seasonBadge, { backgroundColor: panelColors.cardLight, borderColor: panelColors.borderLight }]}>
            <Ionicons name="american-football-outline" size={16} color={panelColors.blue} />
          </View>
        </View>

        <View style={[styles.seasonSwitcher, { backgroundColor: panelColors.bgSecondary, borderColor: panelColors.border }]}>
          {isLoading ? (
            <Text style={[styles.seasonSwitcherLoading, { color: panelColors.textSecondary }]}>Cargando temporadas...</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonSwitcherContent}>
              {seasons.map((season) => {
                const isSelected = season.id === selectedSeasonId;
                const isActive = season.id === activeSeason?.id || isSeasonActive(season);

                return (
                  <Pressable
                    key={season.id}
                    onPress={() => setSelectedSeason(season.id)}
                    style={({ pressed }) => [
                      styles.seasonOption,
                      isSelected && { backgroundColor: panelColors.cardLight, borderColor: panelColors.borderLight },
                      pressed && styles.seasonOptionPressed,
                    ]}
                  >
                    {isActive && (
                      <View style={styles.seasonOptionStatus}>
                        <View style={[styles.seasonOptionDot, { backgroundColor: panelColors.green }]} />
                        <Text style={[styles.seasonOptionStatusText, { color: panelColors.green }]}>Activa</Text>
                      </View>
                    )}
                    <Text style={[styles.seasonOptionText, { color: isSelected ? panelColors.text : panelColors.textSecondary }]} numberOfLines={1}>
                      {seasonLabel(season)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={[styles.homeStatsGrid, { borderColor: panelColors.border }]}>
          <View style={styles.homeMiniStat}>
            <Text style={[styles.homeMiniValue, { color: panelColors.text }]}>{upcomingCount}</Text>
            <Text style={[styles.homeMiniLabel, { color: panelColors.textSecondary }]}>Próximos</Text>
          </View>
          <View style={[styles.homeStatDivider, { backgroundColor: panelColors.border }]} />
          <View style={styles.homeMiniStat}>
            <Text style={[styles.homeMiniValue, { color: panelColors.text }]}>{recentCount}</Text>
            <Text style={[styles.homeMiniLabel, { color: panelColors.textSecondary }]}>Resultados</Text>
          </View>
          <View style={[styles.homeStatDivider, { backgroundColor: panelColors.border }]} />
          <View style={styles.homeMiniStat}>
            <Text style={[styles.homeMiniValue, { color: panelColors.text }]}>{teams.length}</Text>
            <Text style={[styles.homeMiniLabel, { color: panelColors.textSecondary }]}>Equipos</Text>
          </View>
        </View>

        <View style={styles.homeHighlightsRow}>
          <Pressable onPress={() => navigateFromHome("/standings")} style={({ pressed }) => [styles.highlightCard, { backgroundColor: panelColors.bgSecondary, borderColor: panelColors.border }, pressed && styles.highlightPressed]}>
            <View style={styles.highlightHeader}>
              <Ionicons name="trophy-outline" size={13} color={panelColors.orange} />
              <Text style={[styles.highlightLabel, { color: panelColors.textSecondary }]}>Líder</Text>
            </View>
            <Text style={[styles.highlightValue, { color: panelColors.text }]} numberOfLines={1}>{topTeam?.team_name || "Por definirse"}</Text>
            <Text style={[styles.highlightSub, { color: panelColors.textSecondary }]}>{topTeam ? `${topTeam.points ?? 0} pts` : "Aún sin tabla"}</Text>
          </Pressable>
          <Pressable onPress={() => navigateFromHome("/power-ranking")} style={({ pressed }) => [styles.highlightCard, { backgroundColor: panelColors.bgSecondary, borderColor: panelColors.border }, pressed && styles.highlightPressed]}>
            <View style={styles.highlightHeader}>
              <Ionicons name="flash-outline" size={13} color={panelColors.pink} />
              <Text style={[styles.highlightLabel, { color: panelColors.textSecondary }]}>Jugador top</Text>
            </View>
            <Text style={[styles.highlightValue, { color: panelColors.text }]} numberOfLines={1}>{topPlayer?.name || "Por definirse"}</Text>
            <Text style={[styles.highlightSub, { color: panelColors.textSecondary }]}>{topPlayer ? `${topPlayer.touchdowns_totales ?? 0} TD · ${topPlayer.mvps ?? 0} MVP` : "Sin stats todavía"}</Text>
          </Pressable>
        </View>

        <View style={styles.quickActions}>
          <Pressable onPress={() => navigateFromHome("/matches")} style={({ pressed }) => [styles.quickAction, { borderColor: panelColors.borderLight }, pressed && { backgroundColor: panelColors.cardLight }]}>
            <Ionicons name="calendar-outline" size={15} color={panelColors.textSecondary} />
            <Text style={[styles.quickActionText, { color: panelColors.textSecondary }]}>Calendario</Text>
          </Pressable>
          <Pressable onPress={() => navigateFromHome("/teams")} style={({ pressed }) => [styles.quickAction, { borderColor: panelColors.borderLight }, pressed && { backgroundColor: panelColors.cardLight }]}>
            <Ionicons name="shield-outline" size={15} color={panelColors.textSecondary} />
            <Text style={[styles.quickActionText, { color: panelColors.textSecondary }]}>Equipos</Text>
          </Pressable>
        </View>
      </View>
    </FadeInView>
  );
};

// Tarjeta de Partido Moderna
const MatchCard = ({ game, teams, isFeatured = false, index = 0 }: { game: any, teams: any[], isFeatured?: boolean, index?: number }) => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timeStr = useLiveTimer(game);

  if (!game) return null;

  const homeTeam = teams.find((t) => t.name === game.home_team);
  const awayTeam = teams.find((t) => t.name === game.away_team);
  const isLive = ["en vivo", "en_vivo", "en curso"].includes(game.status?.toLowerCase() ?? "");
  const isFinished = ["finalizado", "final"].includes(game.status?.toLowerCase() ?? "");

  const handlePressIn = () => { Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start(); };
  const handlePressOut = () => { Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start(); };
  const TeamRow = ({ team, name, score, isWinner }: any) => (
    <View style={styles.teamRow}>
      <View style={styles.teamInfo}>
        <View style={[styles.logoContainer, { backgroundColor: currentColors.bg }]}>
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
      <View style={styles.scoreWrap}>
        <Text style={[styles.scoreText, { color: isWinner ? LEAGUE_GRADIENT[1] : currentColors.text }, isWinner && styles.scoreTextWinner]}>
          {score !== null && score !== undefined ? score : "-"}
        </Text>
      </View>
    </View>
  );

  return (
    <FadeInView delay={index * 100}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable 
          onPressIn={handlePressIn} onPressOut={handlePressOut}
          onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
          style={[
            styles.matchCard, 
            { backgroundColor: currentColors.card, shadowColor: isDark ? '#000' : '#cbd5e1' },
            isFeatured && [styles.featuredCard, { shadowColor: LEAGUE_GRADIENT[1] }]
          ]}
        >
          {isFeatured && (
            <LinearGradient colors={LEAGUE_GRADIENT} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.featuredTopBar} />
          )}

          <View style={styles.cardHeader}>
            <Text style={[styles.categoryText, { color: currentColors.textMuted }]}>
              {game.category?.replace("-", " ").toUpperCase()} • J{game.jornada || "?"}
            </Text>
            <View>
              {isLive ? (
                <View style={styles.liveBadge}>
                  <LivePulse />
                  <Text style={styles.liveBadgeText}>{timeStr}</Text>
                </View>
              ) : (
                <Text style={[styles.statusText, { color: isFeatured ? LEAGUE_GRADIENT[1] : currentColors.textSecondary }]}>
                  {isFinished ? "FINAL" : game.game_time?.substring(0, 5) || "TBD"}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.cardBody}>
            <TeamRow team={homeTeam} name={game.home_team} score={game.home_score} isWinner={isFinished && game.home_score > game.away_score} />
            <View style={styles.spacer} />
            <TeamRow team={awayTeam} name={game.away_team} score={game.away_score} isWinner={isFinished && game.away_score > game.home_score} />
          </View>

          <View style={[styles.cardFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <View style={styles.footerInfo}>
              <Ionicons name="location" size={14} color={currentColors.textMuted} style={{marginRight: 4}}/>
              <Text style={[styles.footerText, { color: currentColors.textMuted }]}>
                {game.venue ? game.venue : "Sede TBD"} • Campo {game.field ? game.field : "TBD"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={currentColors.textMuted} />
          </View>
        </Pressable>
      </Animated.View>
    </FadeInView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { data: games, isLoading: gamesLoading, refetch: refetchGames } = useMatches();
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams();
  const { selectedSeason } = useSelectedSeason();
  const { data: stats, refetch: refetchStats } = useStats();
  const { data: playerStats, refetch: refetchPlayers } = usePlayerStats();
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [activeJornada, setActiveJornada] = useState("TODAS"); 
  const [activeCategory, setActiveCategory] = useState("TODAS");
  const [activeField, setActiveField] = useState("TODOS");

  const [tempJornada, setTempJornada] = useState("TODAS");
  const [tempCategory, setTempCategory] = useState("TODAS");
  const [tempField, setTempField] = useState("TODOS");

  const isLoading = gamesLoading || teamsLoading;
  const safeTeams = teams ?? [];
  const safeGames = games ?? [];
  const topPad = insets.top;

  const dateStr = useMemo(() => {
    const today = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long" });
    return today;
  }, []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("userSession").then(res => {
        if (res) setUser(JSON.parse(res));
        else setUser(null); 
      });
    }, [])
  );

  const handleProfilePress = () => {
    if (!user) router.push("/login");
    else if (user.role === "coach") router.push("/(coach)/dashboard");
    else if (user.role === "admin") router.push("/admin"); 
    else router.push("/(player)/dashboard");
  };

  const availableJornadas = useMemo(() => {
    if (!games) return [];
    const j = Array.from(new Set(games.map(g => g.jornada).filter(Boolean)));
    return j.sort((a, b) => {
      const numA = parseInt(String(a).replace(/\D/g, "")) || 0;
      const numB = parseInt(String(b).replace(/\D/g, "")) || 0;
      return numA - numB;
    });
  }, [games]);

  const availableCategories = useMemo(() => {
    if (!games) return [];
    const cats = Array.from(new Set(games.map(g => g.category?.replace("-", " ").toUpperCase() || "OTRA")));
    return cats.filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [games]);

  const availableFields = useMemo(() => {
    if (!games) return [];
    const flds = Array.from(new Set(games.map(g => g.field ? String(g.field).toUpperCase() : "TBD")));
    return flds.filter(f => f !== "TBD").sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [games]);

  const openFilterModal = () => {
    setTempJornada(activeJornada);
    setTempCategory(activeCategory);
    setTempField(activeField);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setActiveJornada(tempJornada);
    setActiveCategory(tempCategory);
    setActiveField(tempField);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setTempJornada("TODAS");
    setTempCategory("TODAS");
    setTempField("TODOS");
  };

  const { featuredGame, sections } = useMemo(() => {
    if (!games || games.length === 0) return { featuredGame: null, sections: [] };

    const filteredGames = games.filter(g => {
      const gCat = g.category?.replace("-", " ").toUpperCase() || "OTRA";
      const gField = g.field ? String(g.field).toUpperCase() : "TBD";
      
      const matchCat = activeCategory === "TODAS" || gCat === activeCategory;
      const matchField = activeField === "TODOS" || gField === activeField;
      const matchJornada = activeJornada === "TODAS" || String(g.jornada) === String(activeJornada);
      
      return matchCat && matchField && matchJornada;
    });

    if (filteredGames.length === 0) return { featuredGame: null, sections: [] };

    let featGame = filteredGames.find(g => ["en vivo", "en_vivo", "en curso"].includes(g.status?.toLowerCase() ?? ""));
    if (!featGame) featGame = filteredGames.filter(g => ["programado", "proximo"].includes(g.status?.toLowerCase() ?? "")).sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())[0];
    if (!featGame) featGame = filteredGames[0];

    const restGames = filteredGames.filter(g => g.id !== featGame.id);

    const live = restGames.filter(g => ["en vivo", "en_vivo", "en curso"].includes(g.status?.toLowerCase() ?? ""));
    const upcoming = restGames.filter(g => ["programado", "proximo"].includes(g.status?.toLowerCase() ?? "")).sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime());
    const finished = restGames.filter(g => ["finalizado", "final"].includes(g.status?.toLowerCase() ?? "")).sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime());

    const sects = [];
    if (live.length > 0) sects.push({ title: "EN VIVO", data: live.slice(0, 3), type: 'live' });
    if (upcoming.length > 0) sects.push({ title: "PROXIMOS PARTIDOS", data: upcoming.slice(0, 3), type: 'upcoming' });
    if (finished.length > 0) sects.push({ title: "ULTIMOS RESULTADOS", data: finished.slice(0, 3), type: 'finished' });

    return { featuredGame: featGame, sections: sects };
  }, [games, activeJornada, activeCategory, activeField]);

  const topTeam = useMemo(() => {
    return [...(stats ?? [])].sort((a: any, b: any) => {
      if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0);
      return (b.points_difference ?? 0) - (a.points_difference ?? 0);
    })[0] ?? null;
  }, [stats]);

  const topPlayer = useMemo(() => {
    return [...(playerStats ?? [])]
      .map((player: any) => ({
        ...player,
        score:
          Number(player.mvps || 0) * 1000 +
          Number(player.touchdowns_totales || 0) * 75 +
          Number(player.pases_completos || 0) * 8 +
          Number(player.sacks || 0) * 45 +
          Number(player.intercepciones || 0) * 50,
      }))
      .filter((player: any) => player.score > 0)
      .sort((a: any, b: any) => b.score - a.score)[0] ?? null;
  }, [playerStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchGames(), refetchTeams(), refetchStats(), refetchPlayers()]);
    setRefreshing(false);
  }, [refetchGames, refetchPlayers, refetchStats, refetchTeams]);

  // Si está cargando, mostramos los Skeletons dentro del scroll
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
        <FloatingTopNav user={user} topPad={topPad} onProfilePress={handleProfilePress} isTablet={isTablet} />
        <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: topPad + 80, paddingBottom: 100 }}>
          <View style={styles.contentWrapper}>
             <GreetingScrollable user={user} dateStr={dateStr} />
             <View style={{ paddingHorizontal: 24, marginBottom: 20, marginTop: 20 }}>
               <Text style={[styles.sectionTitleLabel, { color: currentColors.textMuted }]}>CARGANDO JUEGOS...</Text>
             </View>
             <View style={{ gap: 16 }}>
               {[1, 2, 3, 4].map((k) => <MatchCardSkeleton key={k} />)}
             </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      
      {/* 1. TOP NAV BAR FIJA Y FLOTANTE */}
      <FloatingTopNav user={user} topPad={topPad} onProfilePress={handleProfilePress} isTablet={isTablet} />

      {/* 2. LISTA ESCROLEABLE (El saludo hace scroll junto con los juegos) */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        // Añadimos padding superior para que el contenido empiece por debajo de la Navbar fija
        contentContainerStyle={[styles.listContent, { paddingTop: topPad + 60, paddingBottom: isTablet ? insets.bottom + 100 : 90 }]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LEAGUE_GRADIENT[1]} progressViewOffset={topPad + 60} />}
        
        ListHeaderComponent={
          <View style={styles.contentWrapper}>
            <HomeSeasonPanel
              selectedSeason={selectedSeason}
              games={safeGames}
              teams={safeTeams}
              topTeam={topTeam}
              topPlayer={topPlayer}
              currentColors={currentColors}
            />

            {(activeJornada !== "TODAS" || activeCategory !== "TODAS" || activeField !== "TODOS") && (
              <ActiveFiltersBar
                onOpenModal={openFilterModal}
                activeJornada={activeJornada}
                activeCategory={activeCategory}
                activeField={activeField}
              />
            )}

            <View style={styles.featuredContainer}>
              {featuredGame && (
                <FadeInView delay={100}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitleLabel, { color: currentColors.text, marginBottom: 0 }]}>PARTIDO DESTACADO</Text>
                    <TouchableOpacity onPress={openFilterModal} style={[styles.inlineFilterBtn, { backgroundColor: currentColors.bgSecondary }]}>
                      <Ionicons name="options-outline" size={17} color={currentColors.text} />
                    </TouchableOpacity>
                  </View>
                  <MatchCard game={featuredGame} teams={safeTeams} isFeatured={true} />
                </FadeInView>
              )}
            </View>
          </View>
        }

        renderSectionHeader={({ section: { title, type } }) => (
          <View style={[styles.sectionHeader, styles.contentWrapper]}>
            <Text style={[styles.sectionTitleLabel, { color: currentColors.textMuted }, type === 'live' && styles.sectionTitleLive]}>
              {title}
            </Text>
          </View>
        )}

        renderItem={({ item, index }) => (
          <View style={styles.contentWrapper}>
            <MatchCard game={item} teams={safeTeams} index={index} />
          </View>
        )}

        ListEmptyComponent={
          !featuredGame ? (
            <FadeInView delay={200} style={styles.contentWrapper}>
              <View style={[styles.emptyCard, { backgroundColor: currentColors.card }]}>
                <Ionicons name="american-football-outline" size={48} color={currentColors.textMuted} style={{ marginBottom: 16 }} />
                <Text style={[styles.emptyTitle, { color: currentColors.text }]}>No hay juegos</Text>
                <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>
                  Cambia tus filtros o revisa más tarde para ver nuevos encuentros.
                </Text>
              </View>
            </FadeInView>
          ) : null
        }
        
        ListFooterComponent={
          <View style={styles.contentWrapper}>
            <CommunityCard />
          </View>
        }
      />

      {/* MODAL DE FILTROS PREMIUM */}
      <Modal visible={isFilterModalVisible} animationType="slide" transparent={true} onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.bg }, isTablet && { width: 500, alignSelf: 'center', borderRadius: 32, marginBottom: 'auto', marginTop: 'auto', maxHeight: '85%' }]}>
            <View style={styles.modalDragHandleWrap}>
              <View style={[styles.modalDragHandle, { backgroundColor: currentColors.borderLight }]} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>Filtros</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={[styles.modalCloseBtn, { backgroundColor: currentColors.bgSecondary }]}>
                <Ionicons name="close" size={20} color={currentColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>JORNADA</Text>
              <View style={styles.filterGroup}>
                <FilterOption label="Todas" isSelected={tempJornada === "TODAS"} onPress={() => setTempJornada("TODAS")} currentColors={currentColors} />
                {availableJornadas.map(j => (
                  <FilterOption key={j} label={`Jornada ${j}`} isSelected={tempJornada === String(j)} onPress={() => setTempJornada(String(j))} currentColors={currentColors} />
                ))}
              </View>

              <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>CATEGORÍA</Text>
              <View style={styles.filterGroup}>
                <FilterOption label="Todas" isSelected={tempCategory === "TODAS"} onPress={() => setTempCategory("TODAS")} currentColors={currentColors} />
                {availableCategories.map(cat => (
                  <FilterOption key={cat} label={cat} isSelected={tempCategory === cat} onPress={() => setTempCategory(cat)} currentColors={currentColors} />
                ))}
              </View>

              <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>CAMPO</Text>
              <View style={styles.filterGroup}>
                <FilterOption label="Todos" isSelected={tempField === "TODOS"} onPress={() => setTempField("TODOS")} currentColors={currentColors} />
                {availableFields.map(fld => (
                  <FilterOption key={fld} label={`Campo ${fld}`} isSelected={tempField === fld} onPress={() => setTempField(fld)} currentColors={currentColors} />
                ))}
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: currentColors.borderLight, backgroundColor: currentColors.card }]}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={[styles.resetBtnText, { color: currentColors.textSecondary }]}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <LinearGradient colors={LEAGUE_GRADIENT} style={styles.applyBtnGradient} start={{x:0, y:0}} end={{x:1, y:0}}>
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
// 5. ESTILOS PREMIUM (TOTALMENTE RENOVADOS)
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { width: "100%", maxWidth: 800, alignSelf: "center" },

  // --- TOP NAV BAR FLOTANTE ---
  floatingNavContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, borderBottomWidth: 0 },
  navInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 10 },
  headerLogoModern: { width: 100, height: 32 },
  avatarMini: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarMiniText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },

  // --- GREETING SCROLLABLE ---
  greetingContainerModern: { alignItems: "flex-start", marginBottom: 15, paddingHorizontal: 24, marginTop: 10 },
  dateTextModern: { fontSize: 13, fontWeight: "800", letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 5 },
  greetingTextModern: { fontSize: 36, fontWeight: "900", letterSpacing: -1.2, lineHeight: 42, marginBottom: -6 },
  gradientTextWrapper: { height: 45, justifyContent: 'flex-start' },
  greetingTextGradient: { fontSize: 36, fontWeight: "900", letterSpacing: -1.2, lineHeight: 42 },

  seasonPanelWrap: { paddingHorizontal: 20, marginTop: 10, marginBottom: 8 },
  seasonPanel: { borderRadius: 18, borderCurve: "continuous", borderWidth: 1, padding: 16, gap: 12, boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)" },
  seasonPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  seasonHeading: { flex: 1, minWidth: 0, gap: 5 },
  seasonTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
  seasonEyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 0, textTransform: "uppercase" },
  seasonPanelTitle: { flexShrink: 1, fontSize: 18, lineHeight: 22, fontWeight: "800", letterSpacing: 0 },
  seasonActiveBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, backgroundColor: `${Colors.dark.green}18`, paddingHorizontal: 7, paddingVertical: 3 },
  seasonActiveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.dark.green },
  seasonActiveText: { color: Colors.dark.green, fontSize: 8, fontWeight: "800", letterSpacing: 0, textTransform: "uppercase" },
  seasonBadge: { width: 34, height: 34, borderRadius: 10, borderCurve: "continuous", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  seasonSwitcher: { minHeight: 36, borderRadius: 10, borderCurve: "continuous", borderWidth: 1, padding: 3, overflow: "hidden", justifyContent: "center" },
  seasonSwitcherContent: { alignItems: "center", gap: 3 },
  seasonSwitcherLoading: { paddingHorizontal: 8, fontSize: 11, fontWeight: "600" },
  seasonOption: { minHeight: 28, maxWidth: 180, borderRadius: 7, borderCurve: "continuous", borderWidth: 1, borderColor: "transparent", paddingHorizontal: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  seasonOptionPressed: { opacity: 0.72 },
  seasonOptionStatus: { flexDirection: "row", alignItems: "center", gap: 4 },
  seasonOptionDot: { width: 5, height: 5, borderRadius: 3 },
  seasonOptionStatusText: { fontSize: 8, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0 },
  seasonOptionText: { flexShrink: 1, fontSize: 11, fontWeight: "700", letterSpacing: 0 },
  homeStatsGrid: { minHeight: 54, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 8 },
  homeMiniStat: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", gap: 2 },
  homeMiniValue: { fontSize: 18, lineHeight: 21, fontWeight: "800", fontVariant: ["tabular-nums"] },
  homeMiniLabel: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0 },
  homeStatDivider: { width: 1, height: 25 },
  homeHighlightsRow: { flexDirection: "row", gap: 8 },
  highlightCard: { flex: 1, minWidth: 0, minHeight: 78, borderRadius: 10, borderCurve: "continuous", borderWidth: 1, padding: 11, justifyContent: "center" },
  highlightPressed: { opacity: 0.78 },
  highlightHeader: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  highlightLabel: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0 },
  highlightValue: { fontSize: 13, lineHeight: 17, fontWeight: "800", letterSpacing: 0 },
  highlightSub: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  quickActions: { flexDirection: "row", gap: 8 },
  quickAction: { flex: 1, minHeight: 34, borderRadius: 9, borderCurve: "continuous", borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  quickActionText: { fontSize: 11, fontWeight: "700", letterSpacing: 0 },

  // --- FILTER BAR MODERNA (PÍLDORAS INDIVIDUALES) ---
  filterBarContainer: { paddingVertical: 5 },
  filterPillScroll: { alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 5 },
  
  adjustBtnCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 5 },
  
  modernPill: { height: 42, borderRadius: 21, overflow: 'hidden', elevation: 3, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 5 },
  pillGradient: { flex: 1, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  modernPillText: { fontSize: 13, fontWeight: '800', paddingHorizontal: 20, lineHeight: 42 },

  listContent: { paddingTop: 0 },
  
  featuredContainer: { marginTop: 14, paddingHorizontal: 24, marginBottom: 5 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  inlineFilterBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sectionTitleLabel: { fontSize: 13, fontWeight: "900", letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },
  sectionHeader: { marginTop: 25, paddingHorizontal: 24 },
  sectionTitleLive: { color: "#EF4444" },

  // --- MATCH CARD "SLEEK" (Sin bordes rígidos) ---
  matchCard: { borderRadius: 24, marginHorizontal: 24, marginBottom: 16, overflow: 'hidden', elevation: 8, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16 },
  featuredCard: { shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  featuredTopBar: { height: 4, width: '100%' },
  
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
  statusText: { fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  categoryText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  
  cardBody: { paddingHorizontal: 20, paddingBottom: 20 },
  spacer: { height: 16 }, 
  
  teamRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  logoContainer: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden", marginRight: 14 },
  teamLogo: { width: "100%", height: "100%" },
  logoFallback: { fontSize: 12, fontWeight: "900" },
  teamName: { fontSize: 16, fontWeight: "700", flex: 1, paddingRight: 10, letterSpacing: -0.3 },
  teamNameWinner: { fontWeight: "900" },
  
  scoreWrap: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 40 },
  scoreText: { fontSize: 22, fontWeight: "700" },
  scoreTextWinner: { fontSize: 24, fontWeight: "900" },
  
  cardFooter: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1 },
  footerInfo: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },

  liveBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444", marginRight: 6 },
  liveBadgeText: { color: "#EF4444", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },

  // --- EMPTY STATE MODERNO ---
  emptyCard: { alignItems: "center", justifyContent: "center", paddingVertical: 60, marginHorizontal: 24, marginTop: 15, borderRadius: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "900", marginBottom: 8, textAlign: "center", letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 30, lineHeight: 22 },

  // --- COMUNIDAD ---
  communityWrapper: { paddingHorizontal: 24, marginTop: 25, marginBottom: 40 },
  communityCard: { borderRadius: 28, padding: 24, flexDirection: 'row', alignItems: "center", borderWidth: 1 },
  communityContent: { flex: 1, paddingRight: 15 },
  communityTitle: { fontSize: 18, fontWeight: "900", marginBottom: 4, letterSpacing: -0.5 },
  communitySub: { fontSize: 13, lineHeight: 18 },
  socialButtonsRow: { flexDirection: "row", gap: 12 },
  socialBtnCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  // --- MODAL PREMIUM BOTTON SHEET ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%' },
  modalDragHandleWrap: { width: '100%', alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  modalDragHandle: { width: 40, height: 5, borderRadius: 3 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { paddingHorizontal: 24, paddingBottom: 40 },
  filterGroupTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 14, marginTop: 10, textTransform: 'uppercase' },
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  filterOptionModal: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20 },
  filterOptionTextModal: { fontSize: 14, fontWeight: '700' },
  modalFooter: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 40 : 24, alignItems: 'center' },
  resetBtn: { paddingVertical: 14, paddingHorizontal: 20, justifyContent: 'center' },
  resetBtnText: { fontSize: 15, fontWeight: '800' },
  applyBtn: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  applyBtnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }
});
