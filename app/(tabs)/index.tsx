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
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMatches } from "@/hooks/useMatches";
import { seasonLabel, useSelectedSeason } from "@/hooks/useSeasons";
import { useStats } from "@/hooks/useStats";
import { useTeams } from "@/hooks/useTeams";
import { MatchCardSkeleton } from "@/components/SkeletonLoader";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";

const DASH_BG = "#F4F6FB";
const MUTED = "#8F9BB3";
const KICKOFF_DATE = new Date(2026, 8, 20, 9, 0, 0);
const REGISTRATION_CLOSE = new Date(2026, 8, 14, 23, 59, 59);

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=1400&q=85";

/** Cards de explorar: sin fotos de soccer — iconos + gradiente de marca */
const EXPLORE_ITEMS = [
  {
    title: "Partidos",
    subtitle: "Tochito",
    path: "/matches",
    icon: "american-football" as const,
    colors: ["#0F3D2E", "#1A6B4A"] as [string, string],
  },
  {
    title: "Ranking",
    subtitle: "Individual",
    path: "/power-ranking",
    icon: "trophy" as const,
    colors: ["#7A4A00", "#D97706"] as [string, string],
  },
  {
    title: "Tablas",
    subtitle: "Posiciones",
    path: "/standings",
    icon: "podium" as const,
    colors: ["#0B2A5B", "#1E5DBB"] as [string, string],
  },
];

const COMMUNITY_IMAGE =
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=85";

const CATEGORY_CHIPS = [
  { id: "TODAS", label: "Todas", icon: "apps-outline" as const },
  { id: "FEMENIL", label: "Femenil", icon: "female-outline" as const },
  { id: "MIXTO", label: "Mixto", icon: "people-outline" as const },
  { id: "VARONIL", label: "Varonil", icon: "male-outline" as const },
];

const premiumShadow = Platform.select({
  ios: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  android: { elevation: 4 },
  default: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
});

const navigateFromHome = (path: string) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.assign(path);
    return;
  }
  router.push(path as any);
};

const FadeIn = ({ children, delay = 0, style }: { children: any; delay?: number; style?: any }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 520,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 520,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>
  );
};

const LivePulse = () => {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.5, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [scale]);
  return <Animated.View style={[styles.liveDot, { transform: [{ scale }] }]} />;
};

function useCountdown(target: Date) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    ended: diff <= 0,
  };
}

function useLiveTimer(game: any) {
  const [displayTime, setDisplayTime] = useState("");
  useEffect(() => {
    if (!game) return;
    const status = game.status?.toLowerCase() ?? "";
    if (status !== "en vivo" && status !== "en_vivo") {
      setDisplayTime("EN VIVO");
      return;
    }
    const tick = () => {
      let remaining = game.seconds_remaining ?? 1200;
      if (game.clock_running && game.clock_last_started_at) {
        remaining = Math.max(
          0,
          remaining - Math.floor((Date.now() - new Date(game.clock_last_started_at).getTime()) / 1000)
        );
      }
      const m = Math.floor(remaining / 60).toString().padStart(2, "0");
      const s = (remaining % 60).toString().padStart(2, "0");
      setDisplayTime(`${game.current_period ?? "1H"} · ${m}:${s}`);
    };
    tick();
    let interval: ReturnType<typeof setInterval> | undefined;
    if (game.clock_running) interval = setInterval(tick, 1000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [game]);
  return displayTime;
}

const TopBar = ({ user, topPad, onProfilePress, screenBg, textColor }: any) => (
  <View style={[styles.topBar, { paddingTop: topPad + 4, backgroundColor: screenBg }]}>
    <View>
      <Text style={styles.greetEyebrow}>FLAG DURANGO</Text>
      <Text style={[styles.greetHello, { color: textColor }]}>
        Hola, {user?.username ? user.username.split(" ")[0] : "Campeón"}
      </Text>
    </View>
    <Pressable onPress={onProfilePress} hitSlop={10} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
      {user ? (
        <LinearGradient colors={BRAND_GRADIENT} style={styles.avatar}>
          <Text style={styles.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.avatarOutline, premiumShadow, { backgroundColor: screenBg === DASH_BG ? "#FFF" : Colors.dark.card }]}>
          <Ionicons name="person" size={18} color={BRAND_GRADIENT[0]} />
        </View>
      )}
    </Pressable>
  </View>
);

/* ─── HERO IMPACTANTE ─── */
const HeroCard = () => {
  const kickoff = useCountdown(KICKOFF_DATE);
  const reg = useCountdown(REGISTRATION_CLOSE);

  return (
    <FadeIn delay={30} style={styles.padH}>
      <View style={[styles.heroCard, premiumShadow]}>
        <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(12,24,58,0.15)", "rgba(12,24,58,0.55)", "rgba(12,24,58,0.95)"]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={[`${BRAND_GRADIENT[0]}55`, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroAccentWash}
        />

        <View style={styles.heroContent}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <View style={styles.heroBadgeDot} />
              <Text style={styles.heroBadgeText}>Otoño 2026 · FMFA</Text>
            </View>
            <Image
              source={{ uri: "https://www.flagdurango.com.mx/images/logo-flag-durango.png" }}
              style={styles.heroBrandLogo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.heroKicker}>21 años de historia</Text>
          <Text style={styles.heroTitle}>Incorporación oficial a la FMFA</Text>
          <Text style={styles.heroSub}>
            La nueva era empieza el 20 de septiembre en Deportivo Tapias.
          </Text>

          <View style={styles.countdownRow}>
            <View style={styles.countBox}>
              <Text style={styles.countNum}>{kickoff.ended ? "0" : kickoff.days}</Text>
              <Text style={styles.countLbl}>Días</Text>
            </View>
            <View style={styles.countBox}>
              <Text style={styles.countNum}>{kickoff.ended ? "0" : kickoff.hours}</Text>
              <Text style={styles.countLbl}>Hrs</Text>
            </View>
            <View style={styles.countMeta}>
              <Text style={styles.countMetaTitle}>Kickoff</Text>
              <Text style={styles.countMetaText}>20 septiembre 2026</Text>
              <View style={styles.regPill}>
                <Ionicons name="time-outline" size={12} color="#FFB088" />
                <Text style={styles.regPillText}>
                  {reg.ended ? "Registros cerrados" : "Cierre: 14 de septiembre"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </FadeIn>
  );
};

/* ─── STATS COMPACTOS ─── */
const QuickStats = ({
  teamsCount,
  playedCount,
  topTeam,
  colors,
}: {
  teamsCount: number;
  playedCount: number;
  topTeam: string;
  colors: any;
}) => (
  <FadeIn delay={80} style={styles.padH}>
    <View style={[styles.statsBar, premiumShadow, { backgroundColor: colors.card }]}>
      <Pressable style={styles.statCell} onPress={() => navigateFromHome("/teams")}>
        <Text style={[styles.statNum, { color: colors.text }]}>{teamsCount}</Text>
        <Text style={styles.statLbl}>Equipos</Text>
      </Pressable>
      <View style={styles.statDivider} />
      <Pressable style={styles.statCell} onPress={() => navigateFromHome("/matches")}>
        <Text style={[styles.statNum, { color: colors.text }]}>{playedCount}</Text>
        <Text style={styles.statLbl}>Jugados</Text>
      </Pressable>
      <View style={styles.statDivider} />
      <Pressable style={[styles.statCell, { flex: 1.35 }]} onPress={() => navigateFromHome("/standings")}>
        <Ionicons name="trophy" size={14} color="#F59E0B" style={{ marginBottom: 2 }} />
        <Text style={[styles.statLeader, { color: colors.text }]} numberOfLines={1}>
          {topTeam || "Por definir"}
        </Text>
        <Text style={styles.statLbl}>Líder</Text>
      </Pressable>
    </View>
  </FadeIn>
);

/* ─── ATAJOS VISUALES (tochito / americano) ─── */
const ExploreShortcuts = () => (
  <FadeIn delay={110}>
    <Text style={[styles.sectionLabel, styles.padH]}>Explora</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exploreScroll}>
      {EXPLORE_ITEMS.map((item) => (
        <Pressable
          key={item.title}
          onPress={() => navigateFromHome(item.path)}
          style={({ pressed }) => [
            styles.exploreCard,
            premiumShadow,
            pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
          ]}
        >
          <LinearGradient colors={item.colors} style={StyleSheet.absoluteFillObject} />
          <View style={styles.exploreDecor}>
            <Ionicons name={item.icon} size={72} color="rgba(255,255,255,0.12)" />
          </View>
          <View style={styles.exploreBody}>
            <View style={styles.exploreIconWrap}>
              <Ionicons name={item.icon} size={22} color="#FFF" />
            </View>
            <Text style={styles.exploreTitle}>{item.title}</Text>
            <Text style={styles.exploreSub}>{item.subtitle}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  </FadeIn>
);

const MatchCard = ({
  game,
  teams,
  featured = false,
  index = 0,
}: {
  game: any;
  teams: any[];
  featured?: boolean;
  index?: number;
}) => {
  const theme = useColorScheme() ?? "light";
  const colors = Colors[theme];
  const timeStr = useLiveTimer(game);
  if (!game) return null;

  const home = teams.find((t) => t.name === game.home_team);
  const away = teams.find((t) => t.name === game.away_team);
  const isLive = ["en vivo", "en_vivo", "en curso"].includes(game.status?.toLowerCase() ?? "");
  const isFinished = ["finalizado", "final"].includes(game.status?.toLowerCase() ?? "");
  const homeWin = isFinished && game.home_score > game.away_score;
  const awayWin = isFinished && game.away_score > game.home_score;

  const TeamLine = ({ team, name, score, winner }: any) => (
    <View style={styles.teamLine}>
      <View style={[styles.teamLogoWrap, { backgroundColor: colors.bgSecondary }]}>
        {team?.logo_url ? (
          <Image source={{ uri: team.logo_url }} style={styles.teamLogo} resizeMode="contain" />
        ) : (
          <Text style={styles.teamInitials}>{name?.substring(0, 2).toUpperCase() || "?"}</Text>
        )}
      </View>
      <Text
        style={[
          styles.teamName,
          { color: winner || isLive ? colors.text : MUTED },
          winner && { fontWeight: "900", color: colors.text },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text
        style={[
          styles.score,
          { color: winner ? BRAND_GRADIENT[0] : colors.text },
          winner && { fontWeight: "900" },
        ]}
      >
        {score ?? "-"}
      </Text>
    </View>
  );

  return (
    <FadeIn delay={index * 45}>
      <Pressable
        onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
        style={[styles.matchCard, premiumShadow, { backgroundColor: colors.card }]}
      >
        {featured ? (
          <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.featuredStrip} />
        ) : null}

        <View style={styles.matchHeader}>
          <Text style={styles.matchCat}>
            {(game.category || "").replace("-", " ").toUpperCase()}
            {game.jornada ? ` · J${game.jornada}` : ""}
          </Text>
          {isLive ? (
            <View style={styles.liveBadge}>
              <LivePulse />
              <Text style={styles.liveText}>{timeStr}</Text>
            </View>
          ) : (
            <Text style={[styles.matchStatus, featured && { color: BRAND_GRADIENT[0] }]}>
              {isFinished ? "FINAL" : game.game_time?.substring(0, 5) || "TBD"}
            </Text>
          )}
        </View>

        <View style={styles.matchBody}>
          <TeamLine team={home} name={game.home_team} score={game.home_score} winner={homeWin} />
          <View style={{ height: 14 }} />
          <TeamLine team={away} name={game.away_team} score={game.away_score} winner={awayWin} />
        </View>

        <View style={styles.matchFooter}>
          <Ionicons name="location-outline" size={14} color={MUTED} />
          <Text style={styles.matchVenue} numberOfLines={1}>
            {game.venue || "Sede TBD"}
            {game.field ? ` · Campo ${game.field}` : ""}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={MUTED} />
        </View>
      </Pressable>
    </FadeIn>
  );
};

const CommunityCard = () => (
  <FadeIn delay={180} style={styles.padH}>
    <View style={[styles.communityCard, premiumShadow]}>
      <Image source={{ uri: COMMUNITY_IMAGE }} style={styles.communityImg} resizeMode="cover" />
      <LinearGradient colors={["rgba(12,24,58,0.2)", "rgba(12,24,58,0.92)"]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.communityBody}>
        <Text style={styles.communityEyebrow}>ÚNETE</Text>
        <Text style={styles.communityTitle}>Vive Flag Durango</Text>
        <Text style={styles.communitySub}>Highlights, fotos y la comunidad en redes.</Text>
        <View style={styles.socialRow}>
          <Pressable
            style={[styles.socialBtn, { backgroundColor: "#E1306C" }]}
            onPress={() => Linking.openURL("https://www.instagram.com/flag.durango/")}
          >
            <Ionicons name="logo-instagram" size={18} color="#FFF" />
          </Pressable>
          <Pressable
            style={[styles.socialBtn, { backgroundColor: "#1877F2" }]}
            onPress={() => Linking.openURL("https://www.facebook.com/TBFDurango")}
          >
            <Ionicons name="logo-facebook" size={18} color="#FFF" />
          </Pressable>
          <Pressable
            style={[styles.socialBtn, { backgroundColor: "#111111" }]}
            onPress={() => Linking.openURL("https://www.tiktok.com/@flagdurango")}
          >
            <Ionicons name="logo-tiktok" size={18} color="#FFF" />
          </Pressable>
        </View>
      </View>
    </View>
  </FadeIn>
);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const theme = useColorScheme() ?? "light";
  const colors = Colors[theme];
  const isDark = theme === "dark";
  const screenBg = isDark ? colors.bg : DASH_BG;

  const { data: games, isLoading: gamesLoading, refetch: refetchGames } = useMatches();
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams();
  const { selectedSeason } = useSelectedSeason();
  const { data: stats, refetch: refetchStats } = useStats();

  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [filterOpen, setFilterOpen] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("userSession").then((res) => {
        if (res) setUser(JSON.parse(res));
        else setUser(null);
      });
    }, [])
  );

  const handleProfile = () => {
    if (!user) router.push("/login");
    else if (user.role === "coach") router.push("/(coach)/dashboard");
    else if (user.role === "admin") router.push("/admin");
    else router.push("/(player)/dashboard");
  };

  const availableJornadas = useMemo(() => {
    if (!games) return [];
    return Array.from(new Set(games.map((g) => g.jornada).filter(Boolean))).sort((a, b) => {
      return (parseInt(String(a).replace(/\D/g, "")) || 0) - (parseInt(String(b).replace(/\D/g, "")) || 0);
    });
  }, [games]);

  const availableCategories = useMemo(() => {
    if (!games) return [];
    return Array.from(new Set(games.map((g) => g.category?.replace("-", " ").toUpperCase() || "OTRA")))
      .filter(Boolean)
      .sort();
  }, [games]);

  const availableFields = useMemo(() => {
    if (!games) return [];
    return Array.from(new Set(games.map((g) => (g.field ? String(g.field).toUpperCase() : "TBD"))))
      .filter((f) => f !== "TBD")
      .sort();
  }, [games]);

  const { featuredGame, sections } = useMemo(() => {
    if (!games?.length) return { featuredGame: null, sections: [] as any[] };

    const filtered = games.filter((g) => {
      const gCat = g.category?.replace("-", " ").toUpperCase() || "OTRA";
      const gField = g.field ? String(g.field).toUpperCase() : "TBD";
      const matchCat =
        activeCategory === "TODAS" || gCat === activeCategory || gCat.startsWith(activeCategory);
      const matchField = activeField === "TODOS" || gField === activeField;
      const matchJornada = activeJornada === "TODAS" || String(g.jornada) === String(activeJornada);
      return matchCat && matchField && matchJornada;
    });

    if (!filtered.length) return { featuredGame: null, sections: [] };

    let feat =
      filtered.find((g) => ["en vivo", "en_vivo", "en curso"].includes(g.status?.toLowerCase() ?? "")) ||
      filtered
        .filter((g) => ["programado", "proximo"].includes(g.status?.toLowerCase() ?? ""))
        .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())[0] ||
      filtered[0];

    const rest = filtered.filter((g) => g.id !== feat.id);
    const live = rest.filter((g) => ["en vivo", "en_vivo", "en curso"].includes(g.status?.toLowerCase() ?? ""));
    const upcoming = rest
      .filter((g) => ["programado", "proximo"].includes(g.status?.toLowerCase() ?? ""))
      .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime());
    const finished = rest
      .filter((g) => ["finalizado", "final"].includes(g.status?.toLowerCase() ?? ""))
      .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime());

    const sects: any[] = [];
    if (live.length) sects.push({ title: "En vivo", data: live.slice(0, 3), type: "live" });
    if (upcoming.length) sects.push({ title: "Próximos", data: upcoming.slice(0, 4), type: "upcoming" });
    if (finished.length) sects.push({ title: "Últimos resultados", data: finished.slice(0, 4), type: "finished" });

    return { featuredGame: feat, sections: sects };
  }, [games, activeJornada, activeCategory, activeField]);

  const topTeamName = useMemo(() => {
    const top = [...(stats ?? [])].sort((a: any, b: any) => {
      if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0);
      return (b.points_difference ?? 0) - (a.points_difference ?? 0);
    })[0];
    return top?.team_name || "";
  }, [stats]);

  const playedCount = useMemo(
    () =>
      safeGames.filter((g) =>
        ["finalizado", "final", "terminado"].includes(g.status?.toLowerCase() ?? "")
      ).length,
    [safeGames]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchGames(), refetchTeams(), refetchStats()]);
    setRefreshing(false);
  }, [refetchGames, refetchTeams, refetchStats]);

  const FilterChip = ({ label, selected, onPress }: any) => (
    <Pressable
      onPress={onPress}
      style={[styles.modalChip, { backgroundColor: selected ? BRAND_GRADIENT[0] : colors.bgSecondary }]}
    >
      <Text style={[styles.modalChipText, { color: selected ? "#FFF" : colors.text }]}>{label}</Text>
    </Pressable>
  );

  const listHeader = (
    <View style={styles.contentMax}>
      <HeroCard />

      <QuickStats
        teamsCount={safeTeams.length}
        playedCount={playedCount}
        topTeam={topTeamName}
        colors={colors}
      />

      <ExploreShortcuts />

      {selectedSeason ? (
        <Text style={[styles.seasonHint, styles.padH]}>{seasonLabel(selectedSeason)}</Text>
      ) : null}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>Categorías</Text>
        <Pressable onPress={() => setFilterOpen(true)} hitSlop={8} style={styles.filterBtn}>
          <Ionicons name="options-outline" size={16} color={BRAND_GRADIENT[0]} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
        {CATEGORY_CHIPS.map((chip) => {
          const selected =
            activeCategory === "TODAS"
              ? chip.id === "TODAS"
              : activeCategory.toUpperCase().startsWith(chip.id);
          return (
            <Pressable
              key={chip.id}
              onPress={() => setActiveCategory(chip.id)}
              style={[
                styles.pill,
                premiumShadow,
                selected
                  ? null
                  : { backgroundColor: isDark ? colors.card : "#FFFFFF" },
              ]}
            >
              {selected ? (
                <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pillGrad}>
                  <Ionicons name={chip.icon} size={14} color="#FFF" />
                  <Text style={[styles.pillText, { color: "#FFF" }]}>{chip.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.pillInner}>
                  <Ionicons name={chip.icon} size={14} color={MUTED} />
                  <Text style={[styles.pillText, { color: colors.text }]}>{chip.label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {featuredGame ? (
        <View style={styles.padH}>
          <View style={styles.featuredHead}>
            <Text style={styles.sectionLabel}>Destacado</Text>
            <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.liveNowPill}>
              <Text style={styles.liveNowText}>HOY EN FLAG</Text>
            </LinearGradient>
          </View>
          <MatchCard game={featuredGame} teams={safeTeams} featured />
        </View>
      ) : null}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: screenBg }]}>
        <TopBar user={user} topPad={topPad} onProfilePress={handleProfile} screenBg={screenBg} textColor={colors.text} />
        <ScrollView contentContainerStyle={{ paddingTop: topPad + 72, paddingBottom: 100 }}>
          <HeroCard />
          <View style={{ paddingHorizontal: 20, gap: 14, marginTop: 8 }}>
            {[1, 2, 3].map((k) => (
              <MatchCardSkeleton key={k} />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: screenBg }]}>
      <TopBar user={user} topPad={topPad} onProfilePress={handleProfile} screenBg={screenBg} textColor={colors.text} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          paddingTop: topPad + 68,
          paddingBottom: isTablet ? insets.bottom + 110 : 100,
        }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND_GRADIENT[0]}
            progressViewOffset={topPad + 68}
          />
        }
        ListHeaderComponent={listHeader}
        renderSectionHeader={({ section }: any) => (
          <View style={[styles.padH, styles.contentMax, { marginTop: 10 }]}>
            <Text style={[styles.sectionLabel, section.type === "live" && { color: "#EF4444" }]}>
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <View style={[styles.padH, styles.contentMax]}>
            <MatchCard game={item} teams={safeTeams} index={index} />
          </View>
        )}
        ListEmptyComponent={
          !featuredGame ? (
            <View style={[styles.padH, styles.contentMax]}>
              <View style={[styles.emptyCard, premiumShadow, { backgroundColor: colors.card }]}>
                <Ionicons name="american-football-outline" size={42} color={MUTED} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin partidos</Text>
                <Text style={styles.emptySub}>Prueba otros filtros o vuelve más tarde.</Text>
              </View>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.contentMax}>
            <CommunityCard />
          </View>
        }
      />

      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.bg },
              isTablet && {
                width: 480,
                alignSelf: "center",
                borderRadius: 28,
                marginVertical: "auto" as any,
                maxHeight: "85%",
              },
            ]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filtros</Text>
              <TouchableOpacity
                onPress={() => setFilterOpen(false)}
                style={[styles.modalClose, { backgroundColor: colors.bgSecondary }]}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 28 }}>
              <Text style={styles.modalGroup}>Jornada</Text>
              <View style={styles.modalChips}>
                <FilterChip label="Todas" selected={tempJornada === "TODAS"} onPress={() => setTempJornada("TODAS")} />
                {availableJornadas.map((j) => (
                  <FilterChip
                    key={String(j)}
                    label={`J${j}`}
                    selected={tempJornada === String(j)}
                    onPress={() => setTempJornada(String(j))}
                  />
                ))}
              </View>

              <Text style={styles.modalGroup}>Categoría</Text>
              <View style={styles.modalChips}>
                <FilterChip label="Todas" selected={tempCategory === "TODAS"} onPress={() => setTempCategory("TODAS")} />
                {availableCategories.map((c) => (
                  <FilterChip key={c} label={c} selected={tempCategory === c} onPress={() => setTempCategory(c)} />
                ))}
              </View>

              <Text style={styles.modalGroup}>Campo</Text>
              <View style={styles.modalChips}>
                <FilterChip label="Todos" selected={tempField === "TODOS"} onPress={() => setTempField("TODOS")} />
                {availableFields.map((f) => (
                  <FilterChip
                    key={f}
                    label={`Campo ${f}`}
                    selected={tempField === f}
                    onPress={() => setTempField(f)}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                onPress={() => {
                  setTempJornada("TODAS");
                  setTempCategory("TODAS");
                  setTempField("TODOS");
                }}
                style={{ paddingHorizontal: 16, paddingVertical: 12 }}
              >
                <Text style={{ color: MUTED, fontWeight: "800" }}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => {
                  setActiveJornada(tempJornada);
                  setActiveCategory(tempCategory);
                  setActiveField(tempField);
                  setFilterOpen(false);
                }}
              >
                <LinearGradient colors={BRAND_GRADIENT} style={styles.applyBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.applyText}>Aplicar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  contentMax: { width: "100%", maxWidth: 800, alignSelf: "center" },
  padH: { paddingHorizontal: 20 },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  greetEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: MUTED,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  greetHello: { fontSize: 20, fontWeight: "900", letterSpacing: -0.4 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarOutline: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFF", fontSize: 15, fontWeight: "800" },

  heroCard: {
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 18,
    minHeight: 340,
  },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroAccentWash: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  heroContent: { flex: 1, minHeight: 340, justifyContent: "flex-end", padding: 22 },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  heroBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#34D399" },
  heroBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  heroBrandLogo: { width: 72, height: 26, tintColor: "#FFF" },
  heroKicker: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8,
    lineHeight: 34,
    marginBottom: 8,
  },
  heroSub: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    marginBottom: 18,
    maxWidth: 320,
  },
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  countBox: {
    width: 62,
    height: 68,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  countNum: { color: "#FFF", fontSize: 26, fontWeight: "900", letterSpacing: -1 },
  countLbl: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "800", marginTop: 2, textTransform: "uppercase" },
  countMeta: { flex: 1, paddingLeft: 4 },
  countMetaTitle: { color: "#FFF", fontSize: 15, fontWeight: "800", marginBottom: 2 },
  countMetaText: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600", marginBottom: 8 },
  regPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,107,26,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  regPillText: { color: "#FFB088", fontSize: 11, fontWeight: "700" },

  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  statCell: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  statDivider: { width: 1, height: 34, backgroundColor: "#E8EEF7" },
  statNum: { fontSize: 22, fontWeight: "900", letterSpacing: -0.6 },
  statLeader: { fontSize: 12, fontWeight: "800", textAlign: "center", marginBottom: 1 },
  statLbl: { fontSize: 10, fontWeight: "700", color: MUTED, textTransform: "uppercase", marginTop: 2 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: MUTED,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 6,
  },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(30,93,187,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  seasonHint: { fontSize: 12, fontWeight: "600", color: MUTED, marginBottom: 4, marginTop: -2 },

  exploreScroll: { paddingHorizontal: 20, gap: 12, paddingBottom: 18 },
  exploreCard: {
    width: 148,
    height: 170,
    borderRadius: 22,
    overflow: "hidden",
  },
  exploreDecor: { position: "absolute", top: 8, right: -8, opacity: 1 },
  exploreBody: { flex: 1, justifyContent: "flex-end", padding: 14 },
  exploreIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  exploreTitle: { color: "#FFF", fontSize: 17, fontWeight: "900", letterSpacing: -0.3 },
  exploreSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600", marginTop: 2 },

  pillsScroll: { paddingHorizontal: 20, gap: 10, paddingBottom: 18 },
  pill: { borderRadius: 999, overflow: "hidden" },
  pillGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  pillInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  pillText: { fontSize: 13, fontWeight: "700" },

  featuredHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  liveNowPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  liveNowText: { color: "#FFF", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },

  matchCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 14,
  },
  featuredStrip: { height: 4, width: "100%" },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  matchCat: { fontSize: 11, fontWeight: "800", color: MUTED, letterSpacing: 0.4 },
  matchStatus: { fontSize: 12, fontWeight: "800", color: MUTED },
  matchBody: { paddingHorizontal: 18, paddingBottom: 14 },
  teamLine: { flexDirection: "row", alignItems: "center" },
  teamLogoWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  teamLogo: { width: "100%", height: "100%" },
  teamInitials: { fontSize: 12, fontWeight: "900", color: MUTED },
  teamName: { flex: 1, fontSize: 16, fontWeight: "700", paddingRight: 8 },
  score: { fontSize: 28, fontWeight: "800", minWidth: 40, textAlign: "right", letterSpacing: -0.5 },
  matchFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#EEF2F7",
  },
  matchVenue: { flex: 1, fontSize: 12, fontWeight: "600", color: MUTED },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444", marginRight: 6 },
  liveText: { color: "#EF4444", fontSize: 11, fontWeight: "900" },

  communityCard: {
    borderRadius: 26,
    overflow: "hidden",
    marginBottom: 20,
    height: 190,
    marginTop: 8,
  },
  communityImg: { ...StyleSheet.absoluteFillObject },
  communityBody: { flex: 1, justifyContent: "flex-end", padding: 20 },
  communityEyebrow: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginBottom: 4 },
  communityTitle: { color: "#FFF", fontSize: 22, fontWeight: "900", letterSpacing: -0.4 },
  communitySub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4, marginBottom: 12 },
  socialRow: { flexDirection: "row", gap: 10 },
  socialBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  emptyCard: { alignItems: "center", paddingVertical: 48, borderRadius: 24 },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginTop: 14 },
  emptySub: { fontSize: 13, color: MUTED, marginTop: 6, textAlign: "center" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, height: "78%" },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  modalTitle: { fontSize: 22, fontWeight: "900" },
  modalClose: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  modalGroup: {
    fontSize: 11,
    fontWeight: "800",
    color: MUTED,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 10,
  },
  modalChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  modalChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  modalChipText: { fontSize: 13, fontWeight: "700" },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    gap: 8,
  },
  applyBtn: { paddingVertical: 15, borderRadius: 16, alignItems: "center" },
  applyText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});
