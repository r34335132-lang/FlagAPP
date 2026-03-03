import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
  RefreshControl,
  Pressable,
  SectionList
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
      <Text style={styles.greetingText}>¡Hola, {user ? user.username : "Invitado"}!</Text>
      <Text style={styles.dateText}>{dateStr} • Jornada Actual</Text>
    </View>
  </LinearGradient>
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
          <View style={styles.featuredContainer}>
            {isLoading ? (
              <View style={{ gap: 16 }}>{[1, 2].map((k) => <MatchCardSkeleton key={k} />)}</View>
            ) : (
              featuredGame && (
                <>
                  <Text style={styles.featuredLabel}>PARTIDO DESTACADO</Text>
                  <MatchCard game={featuredGame} teams={safeTeams} isFeatured={true} />
                </>
              )
            )}
          </View>
        }

        renderSectionHeader={({ section: { title, type } }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, type === 'live' && styles.sectionTitleLive]}>
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
                <Ionicons name="american-football-outline" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Sin actividad hoy</Text>
              <Text style={styles.emptySubtitle}>El calendario está libre por ahora.</Text>
            </View>
          ) : null
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
    backgroundColor: "#F1F5F9", 
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

  listContent: {
    paddingBottom: 100,
  },
  featuredContainer: {
    marginTop: 16, 
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  featuredLabel: {
    color: "#64748B", 
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingLeft: 8,
    textTransform: "uppercase",
  },
  
  sectionHeader: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
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
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
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
    marginTop: 24,
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
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  emptySubtitle: {
    color: "#64748B",
    fontSize: 13,
  },
});