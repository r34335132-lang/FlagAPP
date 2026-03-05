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
  Easing
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

// Componente que hace aparecer los elementos suavemente de abajo hacia arriba
const FadeInView = ({ children, delay = 0, style }: { children: any, delay?: number, style?: any }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      })
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. HOOKS Y COMPONENTES DE UTILIDAD
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
  
  // Animación de latido (Pulse) para el punto rojo
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

const AnnouncementBanner = () => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  return (
    <View style={styles.bannerWrapper}>
      <View style={[styles.bannerContainerLight, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
        <View style={styles.bannerHeaderLight}>
          <View style={styles.bannerTitleRow}>
            <Ionicons name="american-football" size={24} color={BRAND_GRADIENT[0]} />
            <Text style={[styles.bannerTitleLight, { color: currentColors.text }]}>Temporada 2026</Text>
          </View>
          <View style={[styles.badgeNew, { backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2' }]}>
            <Text style={styles.badgeNewText}>PRÓXIMO</Text>
          </View>
        </View>
        
        <Text style={[styles.bannerSubLight, { color: currentColors.textSecondary }]}>Asegura el lugar de tu equipo en la mejor liga de Flag Football de Durango.</Text>
        
        <View style={[styles.bannerGrid, { backgroundColor: currentColors.bgSecondary }]}>
          <View style={styles.bannerGridItem}>
            <Text style={[styles.bannerGridLabel, { color: currentColors.textMuted }]}>KICKOFF</Text>
            <Text style={[styles.bannerGridValue, { color: currentColors.text }]}>22 Marzo</Text>
          </View>
          <View style={styles.bannerGridItem}>
            <Text style={[styles.bannerGridLabel, { color: currentColors.textMuted }]}>CIERRE INSC.</Text>
            <Text style={[styles.bannerGridValue, { color: currentColors.text }]}>17 Marzo</Text>
          </View>
          <View style={styles.bannerGridItem}>
            <Text style={[styles.bannerGridLabel, { color: currentColors.textMuted }]}>INSCRIPCIÓN</Text>
            <Text style={[styles.bannerGridValue, { color: currentColors.text }]}>$1,900</Text>
          </View>
          <View style={styles.bannerGridItem}>
            <Text style={[styles.bannerGridLabel, { color: currentColors.textMuted }]}>ARBITRAJE</Text>
            <Text style={[styles.bannerGridValue, { color: currentColors.text }]}>$320 / jgo</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const LeagueNews = () => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  return (
    <View style={styles.newsWrapper}>
      <Text style={[styles.sectionTitleLabel, { color: currentColors.textMuted }]}>Avisos de Pretemporada</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsScroll}>
        
        <View style={[styles.newsCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
          <View style={[styles.newsIconWrap, { backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF' }]}>
            <Ionicons name="people" size={22} color="#3B82F6" />
          </View>
          <Text style={[styles.newsTitle, { color: currentColors.text }]}>Junta de Capitanes</Text>
          <Text style={[styles.newsSub, { color: currentColors.textSecondary }]}>Afinando últimos detalles del reglamento y horarios.</Text>
        </View>

        <View style={[styles.newsCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
          <View style={[styles.newsIconWrap, { backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : '#F0FDF4' }]}>
            <Ionicons name="document-text" size={22} color="#10B981" />
          </View>
          <Text style={[styles.newsTitle, { color: currentColors.text }]}>Registro de Roster</Text>
          <Text style={[styles.newsSub, { color: currentColors.textSecondary }]}>Recuerda subir las fotos y números de tus jugadores a la app.</Text>
        </View>

      </ScrollView>
    </View>
  );
};

const CommunityCard = () => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  return (
    <FadeInView delay={400} style={styles.communityWrapper}>
      <View style={[styles.communityCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
        <View style={styles.communityContent}>
          <Text style={[styles.communityTitle, { color: currentColors.text }]}>Únete a la Acción 📸</Text>
          <Text style={[styles.communitySub, { color: currentColors.textSecondary }]}>Síguenos para no perderte las mejores fotos de cada jornada y noticias exclusivas.</Text>
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
  
  // Animación de escala (bounce) al presionar la tarjeta
  const scaleAnim = useRef(new Animated.Value(1)).current;

  if (!game) return null;

  const homeTeam = teams.find((t) => t.name === game.home_team);
  const awayTeam = teams.find((t) => t.name === game.away_team);
  const isLive = ["en vivo", "en_vivo", "en curso"].includes(game.status?.toLowerCase() ?? "");
  const isFinished = ["finalizado", "final"].includes(game.status?.toLowerCase() ?? "");

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();
  };

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
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
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
              {(game.venue !== null && game.venue !== undefined && String(game.venue).trim() !== "" && String(game.venue) !== "null") 
                ? game.venue 
                : "Sede por definir"} 
              {" "}• Campo{" "} 
              {(game.field !== null && game.field !== undefined && String(game.field).trim() !== "" && String(game.field) !== "null") 
                ? game.field 
                : "TBD"}
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

  const { featuredGame, sections } = useMemo(() => {
    if (!games || games.length === 0) return { featuredGame: null, sections: [] };

    let featGame = games.find(g => ["en vivo", "en_vivo", "en curso"].includes(g.status?.toLowerCase() ?? ""));
    if (!featGame) {
      featGame = games
        .filter(g => ["programado", "proximo"].includes(g.status?.toLowerCase() ?? ""))
        .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())[0];
    }
    if (!featGame) featGame = games[0];

    const restGames = games.filter(g => g.id !== featGame.id);

    const live = restGames.filter(g => ["en vivo", "en_vivo", "en curso"].includes(g.status?.toLowerCase() ?? ""));
    const upcoming = restGames.filter(g => ["programado", "proximo"].includes(g.status?.toLowerCase() ?? ""))
                              .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime());
    const finished = restGames.filter(g => ["finalizado", "final"].includes(g.status?.toLowerCase() ?? ""))
                              .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime());

    const sects = [];
    if (live.length > 0) sects.push({ title: "🔴 EN VIVO AHORA", data: live, type: 'live' });
    if (upcoming.length > 0) sects.push({ title: "PRÓXIMOS PARTIDOS", data: upcoming.slice(0, 4), type: 'upcoming' });
    if (finished.length > 0) sects.push({ title: "RESULTADOS RECIENTES", data: finished.slice(0, 4), type: 'finished' });

    return { featuredGame: featGame, sections: sects };
  }, [games]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchGames(), refetchTeams()]);
    setRefreshing(false);
  };

  const handleProfilePress = () => {
    if (!user) router.push("/login");
    else if (user.role === "coach") router.push("/(coach)/dashboard");
    else if (user.role === "admin") alert("Eres Administrador. Usa la versión web para gestionar la liga.");
    else router.push("/(player)/dashboard");
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <HeaderHome user={user} topPad={topPad} dateStr={dateStr} onProfilePress={handleProfilePress} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />}
        
        ListHeaderComponent={
          <>
            <FadeInView delay={200}>
              <AnnouncementBanner />
              <LeagueNews />
            </FadeInView>
            
            <View style={styles.featuredContainer}>
              {isLoading ? (
                <View style={{ gap: 16 }}>{[1].map((k) => <MatchCardSkeleton key={k} />)}</View>
              ) : (
                featuredGame && (
                  <FadeInView delay={300}>
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
            <FadeInView delay={300}>
              <View style={[styles.emptyCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                <View style={[styles.emptyIconWrap, { backgroundColor: currentColors.bgSecondary }]}>
                  <Ionicons name="barbell" size={40} color={currentColors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: currentColors.text }]}>¡Pretemporada en curso!</Text>
                <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>Los equipos se están preparando. Arma tus jugadas, la temporada inicia pronto.</Text>
              </View>
            </FadeInView>
          ) : null
        }

        ListFooterComponent={
          <CommunityCard />
        }
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ESTILOS
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 24, 
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 16, 
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogo: {
    width: 130,
    height: 40,
    tintColor: "#FFFFFF",
  },
  greetingContainer: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  greetingText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  dateText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  bannerWrapper: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 5,
  },
  bannerContainerLight: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_GRADIENT[0],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  bannerHeaderLight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerTitleLight: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  badgeNew: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeNewText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bannerSubLight: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  bannerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    padding: 12,
    borderRadius: 12,
  },
  bannerGridItem: {
    width: '45%', 
  },
  bannerGridLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  bannerGridValue: {
    fontSize: 13,
    fontWeight: '900',
  },

  newsWrapper: {
    marginTop: 20,
    marginBottom: 10,
  },
  newsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  newsCard: {
    width: 260,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  newsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  newsSub: {
    fontSize: 12,
    lineHeight: 18,
  },

  communityWrapper: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  communityCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  communityContent: {
    flex: 1,
    paddingRight: 15,
  },
  communityTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  communitySub: {
    fontSize: 11,
    lineHeight: 16,
  },
  socialButtonsCol: {
    gap: 10,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    width: 110,
  },
  socialBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 6,
  },

  listContent: {
    paddingBottom: 100, 
  },
  featuredContainer: {
    marginTop: 25, 
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  
  sectionTitleLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
    paddingLeft: 20,
    textTransform: "uppercase",
  },
  
  sectionHeader: {
    marginTop: 15,
  },
  sectionTitleLive: {
    color: "#EF4444", 
  },

  matchCard: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
  },
  featuredCard: {
    padding: 20, 
    marginHorizontal: 0,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderColor: BRAND_GRADIENT[0],
    borderWidth: 1.5,
  },
  
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  
  cardBody: {
    gap: 12, 
  },
  teamDivider: {
    height: 1,
    marginLeft: 40, 
  },
  teamRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  teamLogo: {
    width: "100%",
    height: "100%",
  },
  logoFallback: {
    fontSize: 12,
    fontWeight: "800",
  },
  teamName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    paddingRight: 16,
  },
  teamNameWinner: {
    fontWeight: "800",
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "700",
    width: 32,
    textAlign: "right",
  },
  scoreTextWinner: {
    fontWeight: "900",
  },
  
  cardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
    marginRight: 6,
  },
  liveBadgeText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "800",
  },

  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 20,
  }
});