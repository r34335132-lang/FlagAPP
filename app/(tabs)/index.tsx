import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Linking
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMatches } from "@/hooks/useMatches";
import { useTeams } from "@/hooks/useTeams";
import { MatchCardSkeleton } from "@/components/SkeletonLoader";
import { BRAND_GRADIENT } from "@/constants/colors";

// ─────────────────────────────────────────────────────────────────────────────
// 1. HOOKS Y COMPONENTES DE UTILIDAD
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
  return (
    <View style={styles.liveBadge}>
      <View style={styles.liveDot} />
      <Text style={styles.liveBadgeText}>{timeString}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMPONENTES DE UI 
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
    <View style={styles.greetingContainer}>
      <Text style={styles.greetingText}>¡Hola, {user ? user.username : "Jugador"}!</Text>
      <Text style={styles.dateText}>{dateStr} • Temporada 2026</Text>
    </View>
  </LinearGradient>
);

// 👇 BANNER DE TEMPORADA REDISEÑADO (BLANCO Y LIMPIO) 👇
const AnnouncementBanner = () => (
  <View style={styles.bannerWrapper}>
    <View style={styles.bannerContainerLight}>
      <View style={styles.bannerHeaderLight}>
        <View style={styles.bannerTitleRow}>
          <Ionicons name="american-football" size={24} color={BRAND_GRADIENT[0]} />
          <Text style={styles.bannerTitleLight}>Temporada 2026</Text>
        </View>
        <View style={styles.badgeNew}>
          <Text style={styles.badgeNewText}>PRÓXIMO</Text>
        </View>
      </View>
      
      <Text style={styles.bannerSubLight}>Asegura el lugar de tu equipo en la mejor liga de Flag Football de Durango.</Text>
      
      <View style={styles.bannerGrid}>
        <View style={styles.bannerGridItem}>
          <Text style={styles.bannerGridLabel}>KICKOFF</Text>
          <Text style={styles.bannerGridValue}>22 Marzo</Text>
        </View>
        <View style={styles.bannerGridItem}>
          <Text style={styles.bannerGridLabel}>CIERRE INSC.</Text>
          <Text style={styles.bannerGridValue}>17 Marzo</Text>
        </View>
        <View style={styles.bannerGridItem}>
          <Text style={styles.bannerGridLabel}>INSCRIPCIÓN</Text>
          <Text style={styles.bannerGridValue}>$1,900</Text>
        </View>
        <View style={styles.bannerGridItem}>
          <Text style={styles.bannerGridLabel}>ARBITRAJE</Text>
          <Text style={styles.bannerGridValue}>$320 / jgo</Text>
        </View>
      </View>
    </View>
  </View>
);

// 👇 NUEVO CONTENIDO: AVISOS DE PRETEMPORADA 👇
const LeagueNews = () => (
  <View style={styles.newsWrapper}>
    <Text style={styles.sectionTitleLabel}>Avisos de Pretemporada</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsScroll}>
      
      <View style={styles.newsCard}>
        <View style={[styles.newsIconWrap, { backgroundColor: '#EFF6FF' }]}>
          <Ionicons name="people" size={22} color="#3B82F6" />
        </View>
        <Text style={styles.newsTitle}>Junta de Capitanes</Text>
        <Text style={styles.newsSub}>Afinando últimos detalles del reglamento y horarios.</Text>
      </View>

      <View style={styles.newsCard}>
        <View style={[styles.newsIconWrap, { backgroundColor: '#F0FDF4' }]}>
          <Ionicons name="document-text" size={22} color="#10B981" />
        </View>
        <Text style={styles.newsTitle}>Registro de Roster</Text>
        <Text style={styles.newsSub}>Recuerda subir las fotos y números de tus jugadores a la app.</Text>
      </View>

    </ScrollView>
  </View>
);

const CommunityCard = () => (
  <View style={styles.communityWrapper}>
    <View style={styles.communityCard}>
      <View style={styles.communityContent}>
        <Text style={styles.communityTitle}>Únete a la Acción 📸</Text>
        <Text style={styles.communitySub}>Síguenos para no perderte las mejores fotos de cada jornada y noticias exclusivas.</Text>
      </View>
      <View style={styles.socialButtonsCol}>
        <Pressable 
          style={[styles.socialBtn, { backgroundColor: '#E1306C' }]} 
          onPress={() => Linking.openURL('https://www.instagram.com/flag.durango/')}
        >
          <Ionicons name="logo-instagram" size={18} color="#FFF" />
          <Text style={styles.socialBtnText}>Instagram</Text>
        </Pressable>

        <Pressable 
          style={[styles.socialBtn, { backgroundColor: '#1877F2' }]} 
          onPress={() => Linking.openURL('https://www.facebook.com/TBFDurango')}
        >
          <Ionicons name="logo-facebook" size={18} color="#FFF" />
          <Text style={styles.socialBtnText}>Facebook</Text>
        </Pressable>
      </View>
    </View>
  </View>
);

const MatchCard = ({ game, teams, isFeatured = false }: { game: any, teams: any[], isFeatured?: boolean }) => {
  if (!game) return null;

  const homeTeam = teams.find((t) => t.name === game.home_team);
  const awayTeam = teams.find((t) => t.name === game.away_team);
  const isLive = ["en vivo", "en_vivo", "en curso"].includes(game.status?.toLowerCase() ?? "");
  const isFinished = ["finalizado", "final"].includes(game.status?.toLowerCase() ?? "");

  const TeamRow = ({ team, name, score, isWinner }: any) => (
    <View style={styles.teamRow}>
      <View style={styles.teamInfo}>
        <View style={styles.logoContainer}>
          {team?.logo_url ? (
            <Image source={{ uri: team.logo_url }} style={styles.teamLogo} resizeMode="contain" />
          ) : (
            <Text style={styles.logoFallback}>{name?.charAt(0) || "?"}</Text>
          )}
        </View>
        <Text style={[styles.teamName, isWinner && styles.teamNameWinner]} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Text style={[styles.scoreText, isWinner && styles.scoreTextWinner]}>
        {score !== null && score !== undefined ? score : "-"}
      </Text>
    </View>
  );

  return (
    <Pressable 
      style={[styles.matchCard, isFeatured && styles.featuredCard]}
      onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
    >
      <View style={styles.cardHeader}>
        {isLive ? (
          <LiveBadge game={game} />
        ) : (
          <Text style={styles.statusText}>
            {isFinished ? "FINALIZADO" : game.game_time?.substring(0, 5) || "POR DEFINIR"}
          </Text>
        )}
        <Text style={styles.categoryText}>{game.category?.replace("-", " ").toUpperCase()}</Text>
      </View>

      <View style={styles.cardBody}>
        <TeamRow team={homeTeam} name={game.home_team} score={game.home_score} isWinner={isFinished && game.home_score > game.away_score} />
        <View style={styles.teamDivider} />
        <TeamRow team={awayTeam} name={game.away_team} score={game.away_score} isWinner={isFinished && game.away_score > game.home_score} />
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>
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
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { data: games, isLoading: gamesLoading, refetch: refetchGames } = useMatches();
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams();
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

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
    <View style={styles.container}>
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
            <AnnouncementBanner />
            <LeagueNews />
            
            {/* PARTIDO DESTACADO (Solo si existe) */}
            <View style={styles.featuredContainer}>
              {isLoading ? (
                <View style={{ gap: 16 }}>{[1].map((k) => <MatchCardSkeleton key={k} />)}</View>
              ) : (
                featuredGame && (
                  <>
                    <Text style={styles.sectionTitleLabel}>PARTIDO DESTACADO</Text>
                    <MatchCard game={featuredGame} teams={safeTeams} isFeatured={true} />
                  </>
                )
              )}
            </View>
          </>
        }

        renderSectionHeader={({ section: { title, type } }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitleLabel, type === 'live' && styles.sectionTitleLive]}>
              {title}
            </Text>
          </View>
        )}

        renderItem={({ item }) => (
          <MatchCard game={item} teams={safeTeams} />
        )}

        ListEmptyComponent={
          !isLoading && !featuredGame ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="barbell" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>¡Pretemporada en curso!</Text>
              <Text style={styles.emptySubtitle}>Los equipos se están preparando. Arma tus jugadas, la temporada inicia pronto.</Text>
            </View>
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
// 4. ESTILOS
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", 
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

  // ESTILOS DEL BANNER BLANCO/CLEAN
  bannerWrapper: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 5,
  },
  bannerContainerLight: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
    borderLeftColor: BRAND_GRADIENT[0], // Detalle de color en el borde izquierdo
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
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  badgeNew: {
    backgroundColor: '#FEF2F2',
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
    color: '#64748B',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  bannerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  bannerGridItem: {
    width: '45%', // Para que queden 2 en cada fila
  },
  bannerGridLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  bannerGridValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },

  // AVISOS DE PRETEMPORADA (Noticias)
  newsWrapper: {
    marginTop: 20,
    marginBottom: 10,
  },
  newsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  newsCard: {
    backgroundColor: "#FFFFFF",
    width: 260,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    color: "#0F172A",
    marginBottom: 4,
  },
  newsSub: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },

  // COMUNIDAD Y REDES (Mantenido y adaptado)
  communityWrapper: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  communityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: "center",
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  communitySub: {
    color: "#64748B",
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

  // LISTAS Y TARJETAS
  listContent: {
    paddingBottom: 40,
  },
  featuredContainer: {
    marginTop: 25, 
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  
  sectionTitleLabel: {
    color: "#94A3B8", 
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
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "800",
  },
  categoryText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  
  cardBody: {
    gap: 12, 
  },
  teamDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
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
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
  },
  teamName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
    paddingRight: 16,
  },
  teamNameWinner: {
    fontWeight: "800",
    color: "#0F172A",
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
    width: 32,
    textAlign: "right",
  },
  scoreTextWinner: {
    fontWeight: "900",
    color: "#0F172A",
  },
  
  cardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2", 
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
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 20,
  },
});