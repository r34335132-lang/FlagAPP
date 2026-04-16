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
import { useMatches } from "@/hooks/useMatches";
import { useTeams } from "@/hooks/useTeams";
import { MatchCardSkeleton } from "@/components/SkeletonLoader";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ANIMACIONES BASE
// ─────────────────────────────────────────────────────────────────────────────

const FadeInView = ({ children, delay = 0, style }: { children: any, delay?: number, style?: any }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) })
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. HOOKS Y UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────

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
    let interval: NodeJS.Timeout;
    if (game.clock_running) interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [game]);

  return displayTime;
}

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

const formatShortDate = (dateString: string) => {
  if (!dateString) return "Fecha TBD";
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  let formatted = date.toLocaleDateString("es-ES", options);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPONENTES DE UI PREMIUM
// ─────────────────────────────────────────────────────────────────────────────

const HeaderHome = ({ user, topPad, dateStr, onProfilePress, isTablet }: any) => (
  <LinearGradient
    colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.headerGradient, { paddingTop: topPad + 10 }]}
  >
    <View style={[styles.contentWrapper, isTablet && { paddingHorizontal: 20 }]}>
      
      <View style={styles.headerNav}>
        <Image
          source={{ uri: "https://www.flagdurango.com.mx/images/logo-flag-durango.png" }}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Pressable style={({ pressed }) => [styles.profileBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={onProfilePress}>
          <Ionicons name={user ? "person" : "person-outline"} size={20} color={BRAND_GRADIENT[0]} />
        </Pressable>
      </View>
      
      <FadeInView delay={100} style={styles.greetingContainer}>
        <Text style={styles.greetingText}>¿Listo para jugar,{"\n"}{user ? user.username : "Campeón"}? 🏈</Text>
        <Text style={styles.dateText}>{dateStr} • Temporada 2026</Text>
      </FadeInView>

    </View>
  </LinearGradient>
);

const FilterOption = ({ label, isSelected, onPress, currentColors }: any) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.filterOptionModal,
      {
        backgroundColor: isSelected ? BRAND_GRADIENT[0] : currentColors.bgSecondary,
        borderColor: isSelected ? BRAND_GRADIENT[0] : currentColors.borderLight,
      }
    ]}
  >
    <Text style={[
      styles.filterOptionTextModal,
      { color: isSelected ? '#FFFFFF' : currentColors.text }
    ]}>{label}</Text>
  </Pressable>
);

const ActiveFiltersBar = ({ onOpenModal, activeJornada, activeCategory, activeField, isTablet }: any) => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";

  return (
    <View style={[styles.filterBarContainer, isTablet && { width: '100%', maxWidth: 800, alignSelf: 'center' }]}>
      <BlurView 
        intensity={isDark ? 40 : 80} 
        tint={isDark ? "dark" : "light"} 
        style={[styles.glassFilterBox, { borderColor: currentColors.borderLight, backgroundColor: isDark ? 'rgba(30,41,59,0.4)' : 'rgba(255,255,255,0.6)' }]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillScroll}>
          <View style={[styles.filterPill, { backgroundColor: currentColors.card, shadowColor: isDark ? '#000' : '#475569' }]}>
            <Ionicons name="flag-outline" size={14} color={BRAND_GRADIENT[0]} />
            <Text style={[styles.filterPillText, { color: currentColors.text }]}>
              {activeJornada === "TODAS" ? "Todas las Jornadas" : `Jornada ${activeJornada}`}
            </Text>
          </View>
          
          {activeCategory !== "TODAS" && (
            <View style={[styles.filterPill, { backgroundColor: currentColors.card, shadowColor: isDark ? '#000' : '#475569' }]}>
              <Ionicons name="trophy-outline" size={14} color={BRAND_GRADIENT[0]} />
              <Text style={[styles.filterPillText, { color: currentColors.text }]}>{activeCategory}</Text>
            </View>
          )}

          {activeField !== "TODOS" && (
            <View style={[styles.filterPill, { backgroundColor: currentColors.card, shadowColor: isDark ? '#000' : '#475569' }]}>
              <Ionicons name="location-outline" size={14} color={BRAND_GRADIENT[0]} />
              <Text style={[styles.filterPillText, { color: currentColors.text }]}>Campo {activeField}</Text>
            </View>
          )}
        </ScrollView>
        <TouchableOpacity style={styles.adjustBtn} onPress={onOpenModal}>
          <Ionicons name="options" size={20} color={BRAND_GRADIENT[0]} />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
};

const CommunityCard = () => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  return (
    <FadeInView delay={300} style={styles.communityWrapper}>
      <View style={[styles.communityCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}>
        <View style={styles.communityContent}>
          <Text style={[styles.communityTitle, { color: currentColors.text }]}>Únete a la Acción 📸</Text>
          <Text style={[styles.communitySub, { color: currentColors.textSecondary }]}>Las mejores fotos y exclusivas del torneo.</Text>
        </View>
        <View style={styles.socialButtonsRow}>
          <Pressable style={({ pressed }) => [styles.socialBtnCircle, { backgroundColor: '#E1306C', opacity: pressed ? 0.8 : 1 }]} onPress={() => Linking.openURL('https://www.instagram.com/flag.durango/')}>
            <Ionicons name="logo-instagram" size={20} color="#FFF" />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.socialBtnCircle, { backgroundColor: '#1877F2', opacity: pressed ? 0.8 : 1 }]} onPress={() => Linking.openURL('https://www.facebook.com/TBFDurango')}>
            <Ionicons name="logo-facebook" size={20} color="#FFF" />
          </Pressable>
        </View>
      </View>
    </FadeInView>
  );
};

// MatchCard "Bento Box"
const MatchCard = ({ game, teams, isFeatured = false, index = 0 }: { game: any, teams: any[], isFeatured?: boolean, index?: number }) => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  if (!game) return null;

  const homeTeam = teams.find((t) => t.name === game.home_team);
  const awayTeam = teams.find((t) => t.name === game.away_team);
  const isLive = ["en vivo", "en_vivo", "en curso"].includes(game.status?.toLowerCase() ?? "");
  const isFinished = ["finalizado", "final"].includes(game.status?.toLowerCase() ?? "");

  const handlePressIn = () => { Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start(); };
  const handlePressOut = () => { Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start(); };
  const timeStr = useLiveTimer(game);

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
    <FadeInView delay={index * 100}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable 
          onPressIn={handlePressIn} onPressOut={handlePressOut}
          onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
          style={[
            styles.matchCard, 
            { backgroundColor: currentColors.card, borderColor: currentColors.border, shadowColor: theme === 'dark' ? '#000' : '#334155' },
            isFeatured && [styles.featuredCard, { borderColor: BRAND_GRADIENT[0] }]
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.statusBadgeWrap}>
              {isLive ? (
                <View style={styles.liveBadge}>
                  <LivePulse />
                  <Text style={styles.liveBadgeText}>{timeStr}</Text>
                </View>
              ) : (
                <Text style={[styles.statusText, { color: currentColors.textSecondary }]}>
                  {isFinished ? "FINALIZADO" : game.game_time?.substring(0, 5) || "TBD"}
                </Text>
              )}
            </View>
            <Text style={[styles.categoryText, { color: BRAND_GRADIENT[0] }]}>
              {game.category?.replace("-", " ").toUpperCase()} • J{game.jornada || "?"}
            </Text>
          </View>

          <View style={styles.cardBody}>
            <TeamRow team={homeTeam} name={game.home_team} score={game.home_score} isWinner={isFinished && game.home_score > game.away_score} />
            <View style={styles.middleDividerContainer}>
              <View style={[styles.teamDivider, { backgroundColor: currentColors.border }]} />
              <Text style={[styles.vsText, { color: currentColors.textMuted, backgroundColor: currentColors.card }]}>VS</Text>
            </View>
            <TeamRow team={awayTeam} name={game.away_team} score={game.away_score} isWinner={isFinished && game.away_score > game.home_score} />
          </View>

          <View style={[styles.cardFooter, { borderTopColor: currentColors.borderLight, backgroundColor: currentColors.bgSecondary }]}>
            <Ionicons name="location" size={14} color={currentColors.textMuted} style={{marginRight: 6}}/>
            <Text style={[styles.footerText, { color: currentColors.textSecondary }]}>
              {game.venue ? game.venue : "Sede TBD"} • Campo {game.field ? game.field : "TBD"}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </FadeInView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { data: games, isLoading: gamesLoading, refetch: refetchGames } = useMatches();
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams();
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
  const topPad = insets.top + (Platform.OS === "web" ? 16 : 8);

  const dateStr = useMemo(() => {
    const today = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    return today.charAt(0).toUpperCase() + today.slice(1);
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
    if (live.length > 0) sects.push({ title: "🔴 EN VIVO", data: live, type: 'live' });
    if (upcoming.length > 0) sects.push({ title: "PRÓXIMOS ENCUENTROS", data: upcoming, type: 'upcoming' });
    if (finished.length > 0) sects.push({ title: "RESULTADOS", data: finished.slice(0, 10), type: 'finished' });

    return { featuredGame: featGame, sections: sects };
  }, [games, activeJornada, activeCategory, activeField]);

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <HeaderHome user={user} topPad={topPad} dateStr={dateStr} onProfilePress={handleProfilePress} isTablet={isTablet} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: isTablet ? insets.bottom + 100 : 90 }]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refetchGames()} tintColor={BRAND_GRADIENT[0]} />}
        
        ListHeaderComponent={
          <View style={styles.contentWrapper}>
            <ActiveFiltersBar 
              onOpenModal={openFilterModal}
              activeJornada={activeJornada}
              activeCategory={activeCategory}
              activeField={activeField}
              isTablet={isTablet}
            />

            <View style={styles.featuredContainer}>
              {isLoading ? (
                <View style={{ gap: 16 }}>{[1].map((k) => <MatchCardSkeleton key={k} />)}</View>
              ) : (
                featuredGame && (
                  <FadeInView delay={100}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="star" size={16} color={BRAND_GRADIENT[0]} style={{marginRight: 6}} />
                      <Text style={[styles.sectionTitleLabel, { color: currentColors.text }]}>JUEGO DESTACADO</Text>
                    </View>
                    <MatchCard game={featuredGame} teams={safeTeams} isFeatured={true} />
                  </FadeInView>
                )
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
          !isLoading && !featuredGame ? (
            <FadeInView delay={200} style={styles.contentWrapper}>
              <View style={[styles.emptyCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}>
                <View style={[styles.emptyIconWrap, { backgroundColor: currentColors.bgSecondary }]}>
                  <Ionicons name="calendar-clear-outline" size={40} color={BRAND_GRADIENT[0]} />
                </View>
                <Text style={[styles.emptyTitle, { color: currentColors.text }]}>Sin partidos</Text>
                <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>
                  No encontramos juegos para la jornada o filtros seleccionados.
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
          <View style={[
            styles.modalContent, 
            { backgroundColor: currentColors.bg },
            isTablet && { width: 500, alignSelf: 'center', borderRadius: 32, marginBottom: 'auto', marginTop: 'auto', maxHeight: '85%' }
          ]}>
            <View style={[styles.modalHeader, { borderBottomColor: currentColors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>Personalizar Vista</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={[styles.modalCloseBtn, { backgroundColor: currentColors.bgSecondary }]}>
                <Ionicons name="close" size={20} color={currentColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>JORNADA</Text>
              <View style={styles.filterGroup}>
                <FilterOption label="Todas las Jornadas" isSelected={tempJornada === "TODAS"} onPress={() => setTempJornada("TODAS")} currentColors={currentColors} />
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
                <FilterOption label="Todos los Campos" isSelected={tempField === "TODOS"} onPress={() => setTempField("TODOS")} currentColors={currentColors} />
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
                <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={styles.applyBtnGradient}>
                  <Text style={styles.applyBtnText}>Mostrar Juegos</Text>
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
// 5. ESTILOS PREMIUM
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { width: "100%", maxWidth: 800, alignSelf: "center" },

  // --- HEADER SEGURO Y LIMPIO ---
  headerGradient: { paddingBottom: 35, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 15 },
  headerNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, marginBottom: 20 },
  
  profileBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  headerLogo: { width: 140, height: 45, tintColor: "#FFFFFF" },
  
  greetingContainer: { paddingHorizontal: 24, alignItems: "flex-start", marginTop: 5, marginBottom: 15 },
  greetingText: { color: "#FFFFFF", fontSize: 26, fontWeight: "900", letterSpacing: -0.5, lineHeight: 32 },
  dateText: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 },

  // --- GLASS FILTER BAR (SEPARADA Y ABAJO DEL HEADER) ---
  // 🔥 Al usar un margin POSITIVO, es 100% imposible que cubra el texto de arriba. 
  filterBarContainer: { paddingHorizontal: 16, marginTop: 15, zIndex: 10 },
  glassFilterBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, padding: 6, paddingLeft: 8, borderWidth: 1, overflow: 'hidden' },
  filterPillScroll: { alignItems: 'center', gap: 8, paddingRight: 10 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, elevation: 2, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  filterPillText: { fontSize: 12, fontWeight: '800' },
  adjustBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: `${BRAND_GRADIENT[0]}15` },

  listContent: { paddingTop: 5 },
  
  featuredContainer: { marginTop: 25, paddingHorizontal: 16, marginBottom: 5 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingLeft: 16 },
  sectionTitleLabel: { fontSize: 13, fontWeight: "900", letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionHeader: { marginTop: 25, paddingLeft: 16, marginBottom: 12 },
  sectionTitleLive: { color: "#EF4444" },

  // --- MATCH CARD "BENTO BOX" ---
  matchCard: { borderRadius: 28, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, overflow: 'hidden', elevation: 4, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 },
  featuredCard: { borderWidth: 2, shadowOpacity: 0.12, shadowRadius: 20, elevation: 6 },
  
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
  
  cardFooter: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
  footerText: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },

  liveBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FEF2F2' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444", marginRight: 8 },
  liveBadgeText: { color: "#EF4444", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },

  // --- EMPTY STATE ---
  emptyCard: { alignItems: "center", justifyContent: "center", paddingVertical: 50, marginHorizontal: 16, marginTop: 15, borderRadius: 32, borderWidth: 1, borderStyle: "dashed" },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 15 },
  emptyTitle: { fontSize: 20, fontWeight: "900", marginBottom: 8, textAlign: "center", letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 40, lineHeight: 22 },

  // --- COMUNIDAD ---
  communityWrapper: { paddingHorizontal: 16, marginTop: 25, marginBottom: 40 },
  communityCard: { borderRadius: 28, padding: 22, flexDirection: 'row', alignItems: "center", borderWidth: 1, elevation: 3, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12 },
  communityContent: { flex: 1, paddingRight: 15 },
  communityTitle: { fontSize: 18, fontWeight: "900", marginBottom: 4, letterSpacing: -0.5 },
  communitySub: { fontSize: 13, lineHeight: 18 },
  socialButtonsRow: { flexDirection: "row", gap: 12 },
  socialBtnCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },

  // --- MODAL ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 22, borderBottomWidth: 1 },
  modalTitle: { fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  modalCloseBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { padding: 24, paddingBottom: 40 },
  filterGroupTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 14, marginTop: 10, textTransform: 'uppercase' },
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  filterOptionModal: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, borderWidth: 1 },
  filterOptionTextModal: { fontSize: 13, fontWeight: '800' },
  modalFooter: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 40 : 24, alignItems: 'center' },
  resetBtn: { paddingVertical: 14, paddingHorizontal: 20, justifyContent: 'center' },
  resetBtnText: { fontSize: 14, fontWeight: '800' },
  applyBtn: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  applyBtnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }
});