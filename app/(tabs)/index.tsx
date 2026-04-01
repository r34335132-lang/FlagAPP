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
  TouchableOpacity
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) })
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

// Formatear la fecha para que se vea bonita en el filtro (ej. "Sáb, 22 Mar")
const formatShortDate = (dateString: string) => {
  if (!dateString) return "Fecha TBD";
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  let formatted = date.toLocaleDateString("es-ES", options);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
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
        const elapsedSeconds = Math.floor((now - startedAt) / 1000);
        remaining = Math.max(0, remaining - elapsedSeconds);
      }
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      setDisplayTime(`${game.current_period ?? '1H'} • ${timeString}`);
    };

    updateClock();
    let interval: NodeJS.Timeout;
    if (game.clock_running) interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [game]);

  return displayTime;
}

const LiveBadge = ({ game }: { game: any }) => {
  const timeString = useLiveTimer(game);
  const theme = useColorScheme() ?? "light";
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  
  return (
    <View style={[styles.liveBadge, { backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2' }]}>
      <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
      <Text style={styles.liveBadgeText}>{timeString}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPONENTES DE UI 
// ─────────────────────────────────────────────────────────────────────────────

const HeaderHome = ({ user, topPad, dateStr, onProfilePress }: any) => (
  <LinearGradient
    colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.headerGradient, { paddingTop: topPad }]}
  >
    <View style={styles.headerNav}>
      <View style={{ width: 40 }} />
      <Image
        source={{ uri: "https://www.flagdurango.com.mx/images/logo-flag-durango.png" }}
        style={styles.headerLogo}
        resizeMode="contain"
      />
      <Pressable style={styles.iconBtn} onPress={onProfilePress}>
        <Ionicons name={user ? "person" : "enter-outline"} size={20} color="#FFFFFF" />
      </Pressable>
    </View>
    <FadeInView delay={100} style={styles.greetingContainer}>
      <Text style={styles.greetingText}>¡Hola, {user ? user.username : "Jugador"}!</Text>
      <Text style={styles.dateText}>{dateStr} • Temporada 2026</Text>
    </FadeInView>
  </LinearGradient>
);

// Componente para una opción dentro del Modal
const FilterOption = ({ label, isSelected, onPress }: any) => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterOptionModal,
        {
          backgroundColor: isSelected ? BRAND_GRADIENT[0] : currentColors.bgSecondary,
          borderColor: isSelected ? BRAND_GRADIENT[0] : currentColors.border,
        }
      ]}
    >
      <Text style={[
        styles.filterOptionTextModal,
        { color: isSelected ? '#FFFFFF' : currentColors.text }
      ]}>
        {label}
      </Text>
    </Pressable>
  );
};

// La tarjeta que aparece debajo del header mostrando los filtros activos
const ActiveFiltersBar = ({ onOpenModal, activeDateLabel, activeCategory, activeField, isLoading }: any) => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  const FilterBadge = ({ icon, text }: { icon: string, text: string }) => (
    <View style={[styles.filterBadge, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border }]}>
      <Ionicons name={icon as any} size={14} color={BRAND_GRADIENT[0]} />
      <Text style={[styles.filterBadgeText, { color: currentColors.text }]} numberOfLines={1}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.filterBarContainer}>
      <View style={[styles.filterBarCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
        <View style={styles.filterBarMainRow}>
          <Text style={[styles.filterBarTitle, { color: currentColors.text }]}>Visualizando Juegos</Text>
          <TouchableOpacity 
            style={[styles.filterIconButton, { backgroundColor: currentColors.bgSecondary }]} 
            onPress={onOpenModal}
            disabled={isLoading}
          >
            <Ionicons name="options-outline" size={18} color={BRAND_GRADIENT[0]} />
            <Text style={[styles.filterIconButtonText, { color: BRAND_GRADIENT[0] }]}>Ajustar</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterBadgesRow}>
          <FilterBadge icon="calendar-outline" text={activeDateLabel} />
          {activeCategory !== "TODAS" && <FilterBadge icon="trophy-outline" text={activeCategory} />}
          {activeField !== "TODOS" && <FilterBadge icon="location-outline" text={`Campo ${activeField}`} />}
        </View>
      </View>
    </View>
  );
};

// Tarjeta de Redes Sociales (Recuperada)
const CommunityCard = () => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  return (
    <FadeInView delay={300} style={styles.communityWrapper}>
      <View style={[styles.communityCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
        <View style={styles.communityContent}>
          <Text style={[styles.communityTitle, { color: currentColors.text }]}>Únete a la Acción 📸</Text>
          <Text style={[styles.communitySub, { color: currentColors.textSecondary }]}>Síguenos para no perderte las mejores fotos de cada jornada y exclusivas.</Text>
        </View>
        <View style={styles.socialButtonsCol}>
          <Pressable 
            style={({ pressed }) => [styles.socialBtn, { backgroundColor: '#E1306C', opacity: pressed ? 0.8 : 1 }]} 
            onPress={() => Linking.openURL('https://www.instagram.com/flag.durango/')}
          >
            <Ionicons name="logo-instagram" size={18} color="#FFF" />
            <Text style={styles.socialBtnText}>Instagram</Text>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.socialBtn, { backgroundColor: '#1877F2', opacity: pressed ? 0.8 : 1 }]} 
            onPress={() => Linking.openURL('https://www.facebook.com/TBFDurango')}
          >
            <Ionicons name="logo-facebook" size={18} color="#FFF" />
            <Text style={styles.socialBtnText}>Facebook</Text>
          </Pressable>
        </View>
      </View>
    </FadeInView>
  );
};

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
  const handlePressOut = () => { Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start(); };

  const TeamRow = ({ team, name, score, isWinner }: any) => (
    <View style={styles.teamRow}>
      <View style={styles.teamInfo}>
        <View style={[styles.logoContainer, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border }]}>
          {team?.logo_url ? (
            <Image source={{ uri: team.logo_url }} style={styles.teamLogo} resizeMode="contain" />
          ) : (
            <Text style={[styles.logoFallback, { color: currentColors.textMuted }]}>{name?.charAt(0) || "?"}</Text>
          )}
        </View>
        <Text style={[styles.teamName, { color: isWinner ? currentColors.text : currentColors.textSecondary }, isWinner && styles.teamNameWinner]} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Text style={[styles.scoreText, { color: currentColors.textSecondary }, isWinner && [styles.scoreTextWinner, { color: currentColors.text }]]}>
        {score !== null && score !== undefined ? score : "-"}
      </Text>
    </View>
  );

  return (
    <FadeInView delay={index * 150}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable 
          onPressIn={handlePressIn} onPressOut={handlePressOut}
          onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
          style={[
            styles.matchCard, 
            { backgroundColor: currentColors.card, borderColor: currentColors.border, shadowColor: theme === 'dark' ? '#000' : '#0F172A' },
            isFeatured && styles.featuredCard
          ]}
        >
          <View style={styles.cardHeader}>
            {isLive ? (
              <LiveBadge game={game} />
            ) : (
              <Text style={[styles.statusText, { color: currentColors.text }]}>
                {isFinished ? "FINALIZADO" : game.game_time?.substring(0, 5) || "POR DEFINIR"}
              </Text>
            )}
            <Text style={[styles.categoryText, { color: currentColors.textSecondary }]}>{game.category?.replace("-", " ").toUpperCase()}</Text>
          </View>

          <View style={styles.cardBody}>
            <TeamRow team={homeTeam} name={game.home_team} score={game.home_score} isWinner={isFinished && game.home_score > game.away_score} />
            <View style={[styles.teamDivider, { backgroundColor: currentColors.borderLight }]} />
            <TeamRow team={awayTeam} name={game.away_team} score={game.away_score} isWinner={isFinished && game.away_score > game.home_score} />
          </View>

          <View style={[styles.cardFooter, { borderTopColor: currentColors.borderLight }]}>
            <Text style={[styles.footerText, { color: currentColors.textMuted }]}>
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
  const { data: games, isLoading: gamesLoading, refetch: refetchGames } = useMatches();
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams();
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  // ESTADOS DEL MODAL Y FILTROS
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  
  const [activeDate, setActiveDate] = useState("PROXIMOS"); 
  const [activeCategory, setActiveCategory] = useState("TODAS");
  const [activeField, setActiveField] = useState("TODOS");

  const [tempDate, setTempDate] = useState("PROXIMOS");
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
        else setUser(null); // Asegurar que sea null si no hay sesión
      });
    }, [])
  );

  // --- RESTAURAMOS LA FUNCIÓN PARA ENTRAR AL PERFIL ---
  const handleProfilePress = () => {
    if (!user) {
      router.push("/login");
    } else if (user.role === "coach") {
      router.push("/(coach)/dashboard");
    } else if (user.role === "admin") {
      // 🔥 ¡Corregido! Ahora te manda directo a tu nueva pestaña
      router.push("/admin"); 
    } else {
      router.push("/(player)/dashboard");
    }
  };

  // Extraer Opciones Únicas
  const availableDates = useMemo(() => {
    if (!games) return [];
    const dates = Array.from(new Set(games.map(g => g.game_date).filter(Boolean)));
    return dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
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

  // Texto amigable para la barra de filtros
  const activeDateLabel = useMemo(() => {
    if (activeDate === "PROXIMOS") return "Próximos Juegos";
    if (activeDate === "TODAS_LAS_FECHAS") return "Toda la Temporada";
    return formatShortDate(activeDate);
  }, [activeDate]);

  const openFilterModal = () => {
    setTempDate(activeDate);
    setTempCategory(activeCategory);
    setTempField(activeField);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setActiveDate(tempDate);
    setActiveCategory(tempCategory);
    setActiveField(tempField);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setTempDate("PROXIMOS");
    setTempCategory("TODAS");
    setTempField("TODOS");
  };

  // Filtrar y clasificar los juegos
  const { featuredGame, sections } = useMemo(() => {
    if (!games || games.length === 0) return { featuredGame: null, sections: [] };

    const filteredGames = games.filter(g => {
      const gCat = g.category?.replace("-", " ").toUpperCase() || "OTRA";
      const gField = g.field ? String(g.field).toUpperCase() : "TBD";
      
      const matchCat = activeCategory === "TODAS" || gCat === activeCategory;
      const matchField = activeField === "TODOS" || gField === activeField;
      
      let matchDate = true;
      if (activeDate === "PROXIMOS") {
        matchDate = new Date(g.game_date).setHours(0,0,0,0) >= new Date().setHours(0,0,0,0);
      } else if (activeDate !== "TODAS_LAS_FECHAS") {
        matchDate = g.game_date === activeDate;
      }
      
      return matchCat && matchField && matchDate;
    });

    if (filteredGames.length === 0) return { featuredGame: null, sections: [] };

    let featGame = filteredGames.find(g => ["en vivo", "en_vivo", "en curso"].includes(g.status?.toLowerCase() ?? ""));
    if (!featGame) {
      featGame = filteredGames
        .filter(g => ["programado", "proximo"].includes(g.status?.toLowerCase() ?? ""))
        .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())[0];
    }
    if (!featGame) featGame = filteredGames[0];

    const restGames = filteredGames.filter(g => g.id !== featGame.id);

    const live = restGames.filter(g => ["en vivo", "en_vivo", "en curso"].includes(g.status?.toLowerCase() ?? ""));
    const upcoming = restGames.filter(g => ["programado", "proximo"].includes(g.status?.toLowerCase() ?? ""))
                              .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime());
    const finished = restGames.filter(g => ["finalizado", "final"].includes(g.status?.toLowerCase() ?? ""))
                              .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime());

    const sects = [];
    if (live.length > 0) sects.push({ title: "🔴 EN VIVO AHORA", data: live, type: 'live' });
    if (upcoming.length > 0) sects.push({ title: "PRÓXIMOS PARTIDOS", data: upcoming, type: 'upcoming' });
    if (finished.length > 0) sects.push({ title: "RESULTADOS", data: finished.slice(0, 10), type: 'finished' });

    return { featuredGame: featGame, sections: sects };
  }, [games, activeDate, activeCategory, activeField]);

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <HeaderHome 
        user={user} 
        topPad={topPad} 
        dateStr={dateStr} 
        onProfilePress={handleProfilePress} // <-- AQUÍ YA PASAMOS LA FUNCIÓN
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refetchGames()} tintColor={BRAND_GRADIENT[0]} />}
        
        ListHeaderComponent={
          <>
            <ActiveFiltersBar 
              onOpenModal={openFilterModal}
              activeDateLabel={activeDateLabel}
              activeCategory={activeCategory}
              activeField={activeField}
              isLoading={isLoading}
            />

            <View style={styles.featuredContainer}>
              {isLoading ? (
                <View style={{ gap: 16 }}>{[1].map((k) => <MatchCardSkeleton key={k} />)}</View>
              ) : (
                featuredGame && (
                  <FadeInView delay={100}>
                    <Text style={[styles.sectionTitleLabel, { color: currentColors.textMuted }]}>PARTIDO DESTACADO</Text>
                    <MatchCard game={featuredGame} teams={safeTeams} isFeatured={true} />
                  </FadeInView>
                )
              )}
            </View>
          </>
        }

        renderSectionHeader={({ section: { title, type } }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitleLabel, { color: currentColors.textMuted }, type === 'live' && styles.sectionTitleLive]}>
              {title}
            </Text>
          </View>
        )}

        renderItem={({ item, index }) => (
          <MatchCard game={item} teams={safeTeams} index={index} />
        )}

        ListEmptyComponent={
          !isLoading && !featuredGame ? (
            <FadeInView delay={200}>
              <View style={[styles.emptyCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                <View style={[styles.emptyIconWrap, { backgroundColor: currentColors.bgSecondary }]}>
                  <Ionicons name="search" size={40} color={currentColors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: currentColors.text }]}>No se encontraron juegos</Text>
                <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>
                  Prueba cambiar tus filtros para ver más juegos o el rol se publicará pronto.
                </Text>
              </View>
            </FadeInView>
          ) : null
        }
        
        ListFooterComponent={CommunityCard}
      />

      {/* MODAL DE FILTROS */}
      <Modal visible={isFilterModalVisible} animationType="slide" transparent={true} onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.bg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currentColors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>Filtros Avanzados</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={currentColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>JORNADA O DÍA</Text>
              <View style={styles.filterGroup}>
                <FilterOption label="Próximos Juegos" isSelected={tempDate === "PROXIMOS"} onPress={() => setTempDate("PROXIMOS")} />
                <FilterOption label="Ver Toda la Temporada" isSelected={tempDate === "TODAS_LAS_FECHAS"} onPress={() => setTempDate("TODAS_LAS_FECHAS")} />
                {availableDates.map(date => <FilterOption key={date} label={formatShortDate(date)} isSelected={tempDate === date} onPress={() => setTempDate(date)} />)}
              </View>

              <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>CATEGORÍA</Text>
              <View style={styles.filterGroup}>
                <FilterOption label="Todas" isSelected={tempCategory === "TODAS"} onPress={() => setTempCategory("TODAS")} />
                {availableCategories.map(cat => <FilterOption key={cat} label={cat} isSelected={tempCategory === cat} onPress={() => setTempCategory(cat)} />)}
              </View>

              <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>CAMPO</Text>
              <View style={styles.filterGroup}>
                <FilterOption label="Cualquier Campo" isSelected={tempField === "TODOS"} onPress={() => setTempField("TODOS")} />
                {availableFields.map(fld => <FilterOption key={fld} label={`Campo ${fld}`} isSelected={tempField === fld} onPress={() => setTempField(fld)} />)}
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: currentColors.borderLight }]}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={[styles.resetBtnText, { color: currentColors.textSecondary }]}>Restablecer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={styles.applyBtnGradient}>
                  <Text style={styles.applyBtnText}>Ver Resultados</Text>
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
// 5. ESTILOS
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, marginBottom: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerLogo: { width: 120, height: 36, tintColor: "#FFFFFF" },
  greetingContainer: { paddingHorizontal: 24, alignItems: "center" },
  greetingText: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", letterSpacing: -0.5, marginBottom: 2 },
  dateText: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },

  // --- BARRA DE FILTROS ACTIVA (NUEVO DISEÑO INTEGRADO) ---
  filterBarContainer: {
    paddingHorizontal: 16,
    marginTop: 15,
  },
  filterBarCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  filterBarMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterBarTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  filterIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterIconButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  filterBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 120,
  },

  listContent: { paddingBottom: 60 },
  featuredContainer: { marginTop: 15, paddingHorizontal: 16, marginBottom: 5 },
  sectionTitleLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1, marginBottom: 12, paddingLeft: 16, textTransform: "uppercase" },
  sectionHeader: { marginTop: 15 },
  sectionTitleLive: { color: "#EF4444" },

  matchCard: { borderRadius: 20, marginHorizontal: 16, marginBottom: 12, padding: 16, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, borderWidth: 1 },
  featuredCard: { padding: 18, marginHorizontal: 0, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, borderColor: BRAND_GRADIENT[0], borderWidth: 1.5 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  statusText: { fontSize: 12, fontWeight: "800" },
  categoryText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  cardBody: { gap: 12 },
  teamDivider: { height: 1, marginLeft: 40 },
  teamRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  logoContainer: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden", marginRight: 12 },
  teamLogo: { width: "100%", height: "100%" },
  logoFallback: { fontSize: 12, fontWeight: "800" },
  teamName: { fontSize: 15, fontWeight: "600", flex: 1, paddingRight: 16 },
  teamNameWinner: { fontWeight: "800" },
  scoreText: { fontSize: 16, fontWeight: "700", width: 32, textAlign: "right" },
  scoreTextWinner: { fontWeight: "900" },
  cardFooter: { marginTop: 16, paddingTop: 10, borderTopWidth: 1 },
  footerText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },

  liveBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444", marginRight: 6 },
  liveBadgeText: { color: "#EF4444", fontSize: 11, fontWeight: "800" },

  emptyCard: { alignItems: "center", justifyContent: "center", paddingVertical: 40, marginHorizontal: 16, marginTop: 10, borderRadius: 24, borderWidth: 1, borderStyle: "dashed" },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "900", marginBottom: 4, textAlign: "center" },
  emptySubtitle: { fontSize: 12, textAlign: "center", paddingHorizontal: 30, lineHeight: 18 },

  // --- REDES SOCIALES (RECUPERADAS) ---
  communityWrapper: { paddingHorizontal: 16, marginTop: 25, marginBottom: 30 },
  communityCard: { borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: "center", borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.01, shadowRadius: 5, elevation: 1 },
  communityContent: { flex: 1, paddingRight: 12 },
  communityTitle: { fontSize: 16, fontWeight: "900", marginBottom: 3 },
  communitySub: { fontSize: 11, lineHeight: 16 },
  socialButtonsCol: { gap: 8 },
  socialBtn: { flexDirection: "row", alignItems: "center", justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, width: 105 },
  socialBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", marginLeft: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '900' },
  modalCloseBtn: { padding: 4 },
  modalScroll: { padding: 18, paddingBottom: 30 },
  filterGroupTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10, marginTop: 10 },
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 18 },
  filterOptionModal: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  filterOptionTextModal: { fontSize: 12, fontWeight: '700' },
  modalFooter: { flexDirection: 'row', padding: 18, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 35 : 18 },
  resetBtn: { paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center' },
  resetBtnText: { fontSize: 13, fontWeight: '700' },
  applyBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  applyBtnGradient: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' }
});