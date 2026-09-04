import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  useColorScheme,
  useWindowDimensions,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { supabase } from "@/lib/supabase";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";
import { useHeadToHead } from "@/hooks/useTeams";

import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";

const SUBTITLE = "#8F9BB3";
const CARD_RADIUS = 24;

const premiumShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  android: { elevation: 6 },
  default: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
});

const logoShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  android: { elevation: 8 },
  default: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. ANIMACIONES
// ─────────────────────────────────────────────────────────────────────────────
const FadeInView = ({ children, delay = 0 }: { children: any; delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

const LivePulse = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. CRONÓMETRO EN VIVO
// ─────────────────────────────────────────────────────────────────────────────
function useLiveTimer(game: any) {
  const [displayTime, setDisplayTime] = useState("");
  useEffect(() => {
    if (!game) return;
    const status = game.status?.toLowerCase() ?? "";
    if (status !== "en vivo" && status !== "en_vivo" && status !== "en curso") {
      setDisplayTime(status.toUpperCase());
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
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;
      setDisplayTime(
        `${game.current_period ?? "1H"} • ${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
      );
    };
    updateClock();
    let interval: NodeJS.Timeout;
    if (game.clock_running) interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [game]);
  return displayTime;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [game, setGame] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeRoster, setActiveRoster] = useState<"home" | "away">("home");

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";
  const pageBg = isDark ? currentColors.bg : "#F7F9FC";
  const cardBg = isDark ? currentColors.card : "#FFFFFF";
  const muted = isDark ? currentColors.textMuted : SUBTITLE;

  const scoreboardRef = useRef<ViewShot>(null);
  const timeDisplay = useLiveTimer(game);

  useEffect(() => {
    fetchData();
    if (!id) return;

    const subscription = supabase
      .channel(`game-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${id}` },
        (payload) => setGame(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: gameData } = await supabase.from("games").select("*").eq("id", id).single();

      if (gameData) {
        const { data: teamsData } = await supabase
          .from("teams")
          .select("*")
          .in("name", [gameData.home_team, gameData.away_team]);

        setGame(gameData);
        setTeams(teamsData || []);

        if (teamsData && teamsData.length > 0) {
          const teamIds = teamsData.map((t) => t.id);
          const { data: playersData } = await supabase
            .from("players")
            .select("*")
            .in("team_id", teamIds)
            .order("jersey_number", { ascending: true });

          setPlayers(playersData || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const { data: h2h } = useHeadToHead(game?.home_team, game?.away_team);

  const handleShare = async () => {
    try {
      if (scoreboardRef.current && scoreboardRef.current.capture) {
        const uri = await scoreboardRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();

        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/jpeg",
            dialogTitle: "Comparte este marcador",
            UTI: "public.jpeg",
          });
        } else {
          Alert.alert("Aviso", "La opción de compartir no está disponible.");
        }
      }
    } catch (error) {
      console.error("Error al compartir", error);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  if (loading || !game) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: pageBg }]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  const homeTeam = teams.find((t) => t.name === game.home_team);
  const awayTeam = teams.find((t) => t.name === game.away_team);
  const isLive = ["en vivo", "en_vivo", "en curso"].includes(game.status?.toLowerCase());

  const hScore = game.home_score || 0;
  const aScore = game.away_score || 0;
  const hTDs = Math.floor(hScore / 6);
  const aTDs = Math.floor(aScore / 6);
  const hExtra = hScore % 6;
  const aExtra = aScore % 6;

  const homeRoster = players.filter((p) => p.team_id === homeTeam?.id);
  const awayRoster = players.filter((p) => p.team_id === awayTeam?.id);
  const currentDisplayRoster = activeRoster === "home" ? homeRoster : awayRoster;

  const homeColor = homeTeam?.color1 || BRAND_GRADIENT[0];
  const awayColor = awayTeam?.color1 || BRAND_GRADIENT[2];
  const currentTeamColor = activeRoster === "home" ? homeColor : awayColor;

  const scoreboardColors: [string, string, string] =
    homeTeam?.color1 && awayTeam?.color1
      ? [homeColor, BRAND_GRADIENT[1], awayColor]
      : BRAND_GRADIENT;

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* BOTONES FLOTANTES CRISTAL */}
      <View
        style={[
          styles.floatingHeader,
          { top: insets.top + 10 },
          isTablet && styles.floatingHeaderTablet,
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.92 : 1 }] }]}
          hitSlop={8}
        >
          <BlurView intensity={70} tint="dark" style={styles.floatingBtn}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </BlurView>
        </Pressable>

        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.92 : 1 }] }]}
          hitSlop={8}
        >
          <BlurView intensity={70} tint="dark" style={styles.floatingBtn}>
            <Ionicons name="share-outline" size={20} color="#FFF" />
          </BlurView>
        </Pressable>
      </View>

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 48,
          ...(isTablet ? { maxWidth: 800, alignSelf: "center", width: "100%" } : null),
        }}
      >
        {/* --- ÁREA COMPARTIBLE --- */}
        <ViewShot
          ref={scoreboardRef}
          options={{ format: "jpg", quality: 0.9 }}
          style={{ backgroundColor: pageBg }}
        >
          <FadeInView delay={60}>
            {/* SCOREBOARD GRADIENT HERO */}
            <LinearGradient
              colors={scoreboardColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.scoreboardHero, { paddingTop: insets.top + 64 }]}
            >
              {/* Decorative soft overlays */}
              <View style={styles.heroGlowLeft} />
              <View style={styles.heroGlowRight} />

              <View style={styles.statusRow}>
                {isLive ? (
                  <View style={styles.liveBadge}>
                    <LivePulse />
                    <Text style={styles.liveBadgeText}>EN VIVO</Text>
                  </View>
                ) : (
                  <View style={styles.statusBadgeGlass}>
                    <Text style={styles.statusBadgeText}>{timeDisplay || "PROGRAMADO"}</Text>
                  </View>
                )}
                {isLive && <Text style={styles.periodText}>{timeDisplay}</Text>}
              </View>

              <View style={styles.scoreboardRow}>
                <View style={styles.teamCol}>
                  <View style={[styles.logoCircle, logoShadow]}>
                    <Image
                      source={{ uri: homeTeam?.logo_url || "https://via.placeholder.com/100" }}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.teamNameHero} numberOfLines={2}>
                    {game.home_team}
                  </Text>
                  <View style={[styles.teamColorDot, { backgroundColor: homeColor }]} />
                </View>

                <View style={styles.scoreBlock}>
                  <Text style={styles.scoreGiant}>{hScore}</Text>
                  <Text style={styles.scoreSep}>:</Text>
                  <Text style={styles.scoreGiant}>{aScore}</Text>
                </View>

                <View style={styles.teamCol}>
                  <View style={[styles.logoCircle, logoShadow]}>
                    <Image
                      source={{ uri: awayTeam?.logo_url || "https://via.placeholder.com/100" }}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.teamNameHero} numberOfLines={2}>
                    {game.away_team}
                  </Text>
                  <View style={[styles.teamColorDot, { backgroundColor: awayColor }]} />
                </View>
              </View>
            </LinearGradient>
          </FadeInView>

          <View style={styles.contentPad}>
            <FadeInView delay={120}>
              {/* META CARD */}
              <View style={[styles.card, premiumShadow, { backgroundColor: cardBg, marginTop: -28 }]}>
                <MetaRow
                  icon="location-outline"
                  label="Sede"
                  value={game.venue || "Sede TBD"}
                  textColor={currentColors.text}
                  muted={muted}
                  iconColor={BRAND_GRADIENT[0]}
                  iconBg={`${BRAND_GRADIENT[0]}18`}
                />
                <View
                  style={[
                    styles.metaDivider,
                    { backgroundColor: isDark ? currentColors.borderLight : "#F1F5F9" },
                  ]}
                />
                <MetaRow
                  icon="football-outline"
                  label="Campo"
                  value={game.field || "Campo TBD"}
                  textColor={currentColors.text}
                  muted={muted}
                  iconColor={BRAND_GRADIENT[1]}
                  iconBg={`${BRAND_GRADIENT[1]}18`}
                />
                <View
                  style={[
                    styles.metaDivider,
                    { backgroundColor: isDark ? currentColors.borderLight : "#F1F5F9" },
                  ]}
                />
                <MetaRow
                  icon="ribbon-outline"
                  label="Categoría"
                  value={(game.category || "—").toString().replace("-", " ")}
                  textColor={currentColors.text}
                  muted={muted}
                  iconColor={BRAND_GRADIENT[2]}
                  iconBg={`${BRAND_GRADIENT[2]}18`}
                />
                <View
                  style={[
                    styles.metaDivider,
                    { backgroundColor: isDark ? currentColors.borderLight : "#F1F5F9" },
                  ]}
                />
                <MetaRow
                  icon="calendar-outline"
                  label="Jornada"
                  value={
                    game.jornada
                      ? `Jornada ${game.jornada}`
                      : game.game_date
                        ? `${new Date(game.game_date).toLocaleDateString("es-ES", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}${game.game_time ? ` · ${game.game_time.substring(0, 5)} hrs` : ""}`
                        : "Por definir"
                  }
                  textColor={currentColors.text}
                  muted={muted}
                  iconColor={homeColor}
                  iconBg={`${homeColor}18`}
                />
              </View>
            </FadeInView>

            {game.mvp ? (
              <FadeInView delay={160}>
                <View
                  style={[
                    styles.card,
                    styles.mvpCard,
                    premiumShadow,
                    { backgroundColor: cardBg, marginTop: 16 },
                  ]}
                >
                  <LinearGradient
                    colors={["#F59E0B", "#F97316"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.mvpIcon}
                  >
                    <Ionicons name="ribbon" size={22} color="#FFF" />
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.mvpLabel, { color: muted }]}>MVP DEL PARTIDO</Text>
                    <Text style={[styles.mvpName, { color: currentColors.text }]}>{game.mvp}</Text>
                  </View>
                  <Ionicons name="star" size={20} color="#F59E0B" />
                </View>
              </FadeInView>
            ) : null}

            <FadeInView delay={180}>
              <Text style={[styles.sectionLabel, { color: currentColors.text }]}>Análisis</Text>
              <View style={[styles.card, premiumShadow, { backgroundColor: cardBg }]}>
                <StatBar
                  label="Touchdowns (6 pts)"
                  home={hTDs}
                  away={aTDs}
                  colors={currentColors}
                  muted={muted}
                  homeColor={homeColor}
                  awayColor={awayColor}
                />
                <StatBar
                  label="Extras / Safeties"
                  home={hExtra}
                  away={aExtra}
                  colors={currentColors}
                  muted={muted}
                  homeColor={homeColor}
                  awayColor={awayColor}
                />
                <View
                  style={[
                    styles.efficiencyWrap,
                    { borderTopColor: isDark ? currentColors.borderLight : "#F1F5F9" },
                  ]}
                >
                  <View style={styles.efficiencyLabels}>
                    <View style={[styles.effDot, { backgroundColor: homeColor }]} />
                    <Text style={[styles.effLabel, { color: muted }]}>{game.home_team}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={[styles.effLabel, { color: muted }]}>{game.away_team}</Text>
                    <View style={[styles.effDot, { backgroundColor: awayColor }]} />
                  </View>
                  <View style={styles.fullBar}>
                    <View style={[styles.homeSegment, { flex: hScore || 1, backgroundColor: homeColor }]} />
                    <View style={[styles.awaySegment, { flex: aScore || 1, backgroundColor: awayColor }]} />
                  </View>
                </View>
              </View>
            </FadeInView>

            {h2h ? (
              <FadeInView delay={220}>
                <Text style={[styles.sectionLabel, { color: currentColors.text }]}>Cara a cara</Text>
                <View style={[styles.card, premiumShadow, { backgroundColor: cardBg }]}>
                  {h2h.totalGames === 0 ? (
                    <View style={styles.h2hEmpty}>
                      <View style={[styles.h2hEmptyIcon, { backgroundColor: `${BRAND_GRADIENT[0]}15` }]}>
                        <Ionicons name="shield-half-outline" size={28} color={BRAND_GRADIENT[0]} />
                      </View>
                      <Text style={[styles.h2hEmptyText, { color: muted }]}>
                        Primer enfrentamiento registrado en la liga.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.h2hRow}>
                        <View style={styles.h2hTeam}>
                          <Text style={[styles.h2hWins, { color: homeColor }]}>{h2h.team1Wins}</Text>
                          <Text style={[styles.h2hLabel, { color: muted }]}>Victorias</Text>
                        </View>

                        <View style={styles.h2hCenter}>
                          <View
                            style={[
                              styles.h2hTotalBadge,
                              { backgroundColor: isDark ? currentColors.bgSecondary : "#F7F9FC" },
                            ]}
                          >
                            <Text style={[styles.h2hTotal, { color: currentColors.text }]}>
                              {h2h.totalGames}
                            </Text>
                          </View>
                          <Text style={[styles.h2hLabel, { color: muted }]}>Partidos</Text>
                          {h2h.draws > 0 && (
                            <Text style={[styles.h2hDraws, { color: muted }]}>{h2h.draws} Empates</Text>
                          )}
                        </View>

                        <View style={styles.h2hTeam}>
                          <Text style={[styles.h2hWins, { color: awayColor }]}>{h2h.team2Wins}</Text>
                          <Text style={[styles.h2hLabel, { color: muted }]}>Victorias</Text>
                        </View>
                      </View>

                      {/* H2H win bar */}
                      <View style={[styles.h2hBar, { backgroundColor: isDark ? currentColors.bgSecondary : "#EEF2F7" }]}>
                        <View
                          style={[
                            styles.h2hBarFill,
                            {
                              flex: h2h.team1Wins || 0.01,
                              backgroundColor: homeColor,
                              borderTopLeftRadius: 6,
                              borderBottomLeftRadius: 6,
                            },
                          ]}
                        />
                        {h2h.draws > 0 && (
                          <View
                            style={[
                              styles.h2hBarFill,
                              { flex: h2h.draws, backgroundColor: muted },
                            ]}
                          />
                        )}
                        <View
                          style={[
                            styles.h2hBarFill,
                            {
                              flex: h2h.team2Wins || 0.01,
                              backgroundColor: awayColor,
                              borderTopRightRadius: 6,
                              borderBottomRightRadius: 6,
                            },
                          ]}
                        />
                      </View>

                      {h2h.lastGame ? (
                        <View
                          style={[
                            styles.lastGameBox,
                            { backgroundColor: isDark ? currentColors.bgSecondary : "#F7F9FC" },
                          ]}
                        >
                          <Text style={[styles.lastGameTitle, { color: muted }]}>
                            ÚLTIMO ENFRENTAMIENTO
                          </Text>
                          <Text style={[styles.lastGameResult, { color: currentColors.text }]}>
                            {h2h.lastGame.home_team}{" "}
                            <Text style={{ color: homeColor, fontWeight: "900" }}>
                              {h2h.lastGame.home_score}
                            </Text>
                            {" - "}
                            <Text style={{ color: awayColor, fontWeight: "900" }}>
                              {h2h.lastGame.away_score}
                            </Text>{" "}
                            {h2h.lastGame.away_team}
                          </Text>
                          <Text style={[styles.lastGameDate, { color: muted }]}>
                            {new Date(h2h.lastGame.game_date).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              </FadeInView>
            ) : null}
          </View>
        </ViewShot>

        {/* --- ROSTERS --- */}
        <View style={styles.contentPad}>
          <FadeInView delay={260}>
            <Text style={[styles.sectionLabel, { color: currentColors.text }]}>Alineaciones</Text>

            <View
              style={[
                styles.rosterTabs,
                { backgroundColor: isDark ? currentColors.bgSecondary : "#EEF2F7" },
              ]}
            >
              <Pressable
                style={[
                  styles.rosterTab,
                  activeRoster === "home" && [
                    premiumShadow,
                    { backgroundColor: cardBg, borderBottomColor: homeColor, borderBottomWidth: 3 },
                  ],
                ]}
                onPress={() => setActiveRoster("home")}
              >
                <View
                  style={[
                    styles.rosterTabDot,
                    { backgroundColor: homeColor, opacity: activeRoster === "home" ? 1 : 0.35 },
                  ]}
                />
                <Text
                  style={[
                    styles.rosterTabText,
                    { color: muted },
                    activeRoster === "home" && { color: currentColors.text, fontWeight: "800" },
                  ]}
                  numberOfLines={1}
                >
                  {game.home_team}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.rosterTab,
                  activeRoster === "away" && [
                    premiumShadow,
                    { backgroundColor: cardBg, borderBottomColor: awayColor, borderBottomWidth: 3 },
                  ],
                ]}
                onPress={() => setActiveRoster("away")}
              >
                <View
                  style={[
                    styles.rosterTabDot,
                    { backgroundColor: awayColor, opacity: activeRoster === "away" ? 1 : 0.35 },
                  ]}
                />
                <Text
                  style={[
                    styles.rosterTabText,
                    { color: muted },
                    activeRoster === "away" && { color: currentColors.text, fontWeight: "800" },
                  ]}
                  numberOfLines={1}
                >
                  {game.away_team}
                </Text>
              </Pressable>
            </View>

            {currentDisplayRoster.length > 0 ? (
              currentDisplayRoster.map((player, index) => (
                <FadeInView key={player.id} delay={index * 40}>
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: "/player/[id]", params: { id: player.id } })
                    }
                    style={({ pressed }) => [
                      styles.playerCard,
                      premiumShadow,
                      {
                        backgroundColor: cardBg,
                        opacity: pressed ? 0.85 : 1,
                        transform: [{ scale: pressed ? 0.985 : 1 }],
                        borderLeftColor: currentTeamColor,
                        borderLeftWidth: 4,
                      },
                    ]}
                  >
                    <View style={[styles.jerseyBadge, { backgroundColor: currentTeamColor }]}>
                      <Text style={styles.jerseyNum}>
                        {player.jersey_number || player.number || "0"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.avatarWrap,
                        { backgroundColor: isDark ? currentColors.bgSecondary : "#F7F9FC" },
                      ]}
                    >
                      {player.photo_url && !player.photo_url.startsWith("blob:") ? (
                        <Image
                          source={{ uri: player.photo_url }}
                          style={styles.avatar}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="person" size={18} color={muted} />
                      )}
                    </View>

                    <View style={styles.playerInfo}>
                      <Text style={[styles.playerName, { color: currentColors.text }]}>
                        {player.name}
                      </Text>
                      <Text style={[styles.playerPos, { color: muted }]}>
                        {player.position || "Jugador"}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color={muted} />
                  </Pressable>
                </FadeInView>
              ))
            ) : (
              <View style={[styles.emptyRoster, premiumShadow, { backgroundColor: cardBg }]}>
                <View style={[styles.h2hEmptyIcon, { backgroundColor: `${currentTeamColor}15` }]}>
                  <Ionicons name="people-outline" size={32} color={currentTeamColor} />
                </View>
                <Text style={[styles.emptyRosterText, { color: muted }]}>
                  Aún no hay roster oficial cargado para este equipo.
                </Text>
              </View>
            )}
          </FadeInView>
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES SECUNDARIOS
// ─────────────────────────────────────────────────────────────────────────────
const MetaRow = ({
  icon,
  label,
  value,
  textColor,
  muted,
  iconBg,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  textColor: string;
  muted: string;
  iconBg: string;
  iconColor: string;
}) => (
  <View style={styles.metaRow}>
    <View style={[styles.metaIcon, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.metaLabel, { color: muted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: textColor }]}>{value}</Text>
    </View>
  </View>
);

const StatBar = ({
  label,
  home,
  away,
  colors,
  muted,
  homeColor,
  awayColor,
}: {
  label: string;
  home: number;
  away: number;
  colors: any;
  muted: string;
  homeColor: string;
  awayColor: string;
}) => {
  const total = home + away || 1;
  const homeWidth = (home / total) * 100;

  return (
    <View style={{ marginBottom: 22 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={[styles.statNum, { color: homeColor }]}>{home}</Text>
        <Text style={[styles.statLabel, { color: muted }]}>{label}</Text>
        <Text style={[styles.statNum, { color: awayColor }]}>{away}</Text>
      </View>
      <View style={[styles.barBg, { backgroundColor: colors.bgSecondary }]}>
        <View style={[styles.barFill, { width: `${homeWidth}%`, backgroundColor: homeColor }]} />
        <View
          style={[styles.barFill, { width: `${100 - homeWidth}%`, backgroundColor: awayColor }]}
        />
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS PREMIUM
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },

  floatingHeader: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  floatingHeaderTablet: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },

  scoreboardHero: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    overflow: "hidden",
  },
  heroGlowLeft: {
    position: "absolute",
    top: -40,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroGlowRight: {
    position: "absolute",
    bottom: -30,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(0,0,0,0.12)",
  },

  contentPad: {
    paddingHorizontal: 20,
  },

  statusRow: {
    alignItems: "center",
    marginBottom: 28,
    gap: 10,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 22,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    marginRight: 8,
  },
  liveBadgeText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusBadgeGlass: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#FFFFFF",
  },
  periodText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: "rgba(255,255,255,0.9)",
  },

  scoreboardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamCol: {
    flex: 1,
    alignItems: "center",
    gap: 12,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    padding: 10,
  },
  logo: { width: "100%", height: "100%" },
  teamNameHero: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.2,
    lineHeight: 18,
    paddingHorizontal: 2,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  teamColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
  },

  scoreBlock: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    minWidth: 120,
    justifyContent: "center",
  },
  scoreGiant: {
    fontSize: 64,
    fontWeight: "900",
    letterSpacing: -3,
    lineHeight: 70,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  scoreSep: {
    fontSize: 32,
    fontWeight: "300",
    marginHorizontal: 4,
    marginBottom: 6,
    color: "rgba(255,255,255,0.7)",
  },

  card: {
    borderRadius: CARD_RADIUS,
    padding: 22,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  metaDivider: {
    height: 1,
    marginVertical: 14,
    marginLeft: 58,
  },

  mvpCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  mvpIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  mvpLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  mvpName: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  sectionLabel: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 28,
    marginBottom: 14,
  },

  statNum: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.2 },
  barBg: { height: 10, borderRadius: 5, flexDirection: "row", overflow: "hidden" },
  barFill: { height: "100%" },
  efficiencyWrap: { marginTop: 4, paddingTop: 18, borderTopWidth: 1 },
  efficiencyLabels: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  effDot: { width: 8, height: 8, borderRadius: 4 },
  effLabel: { fontSize: 11, fontWeight: "600", flexShrink: 1 },
  fullBar: { height: 12, flexDirection: "row", borderRadius: 6, overflow: "hidden" },
  homeSegment: {},
  awaySegment: {},

  h2hRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  h2hTeam: { alignItems: "center", minWidth: 72 },
  h2hWins: { fontSize: 40, fontWeight: "900", letterSpacing: -1.5 },
  h2hCenter: { alignItems: "center" },
  h2hTotalBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  h2hTotal: { fontSize: 18, fontWeight: "800" },
  h2hLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 4,
    letterSpacing: 0.4,
  },
  h2hDraws: { fontSize: 11, fontWeight: "700", marginTop: 6 },
  h2hBar: {
    height: 8,
    borderRadius: 6,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 18,
  },
  h2hBarFill: { height: "100%" },
  lastGameBox: { padding: 16, borderRadius: 16, alignItems: "center" },
  lastGameTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  lastGameResult: { fontSize: 15, fontWeight: "700", marginBottom: 4, textAlign: "center" },
  lastGameDate: { fontSize: 12, fontWeight: "500" },
  h2hEmpty: { paddingVertical: 20, alignItems: "center" },
  h2hEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  h2hEmptyText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },

  rosterTabs: {
    flexDirection: "row",
    borderRadius: 18,
    padding: 5,
    marginBottom: 16,
  },
  rosterTab: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  rosterTabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rosterTabText: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 2,
    flexShrink: 1,
  },

  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: CARD_RADIUS,
    marginBottom: 12,
    overflow: "hidden",
  },
  jerseyBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  jerseyNum: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  avatar: { width: "100%", height: "100%" },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 15, fontWeight: "700", marginBottom: 2, letterSpacing: -0.2 },
  playerPos: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  emptyRoster: {
    padding: 40,
    alignItems: "center",
    borderRadius: CARD_RADIUS,
  },
  emptyRosterText: {
    marginTop: 14,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 20,
    paddingHorizontal: 12,
  },
});
