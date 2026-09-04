import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  useColorScheme,
  useWindowDimensions,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { supabase } from "@/lib/supabase";
import { usePlayer } from "@/hooks/useTeams";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";

const DASH_BG = "#F7F9FC";
const SUBTLE = "#8F9BB3";

const STAT_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  tds: { icon: "football", color: "#3B82F6", label: "TDs" },
  mvps: { icon: "trophy", color: "#F59E0B", label: "MVPs" },
  passes: { icon: "swap-horizontal", color: "#8B5CF6", label: "Pases" },
  ints: { icon: "hand-left", color: "#10B981", label: "INTs" },
  sacks: { icon: "flash", color: "#EF4444", label: "Sacks" },
};

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  android: { elevation: 4 },
  default: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
});

const FadeInView = ({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 480,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 480,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [delay, fadeAnim, slideAnim]);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const HERO_HEIGHT = height * 0.45;

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";
  const pageBg = isDark ? currentColors.bg : DASH_BG;
  const cardBg = currentColors.card;
  const textColor = currentColors.text;
  const muted = isDark ? currentColors.textSecondary : SUBTLE;
  const divider = isDark ? currentColors.border : "#EEF2F7";
  const iconBg = isDark ? currentColors.bgSecondary : "#F1F5F9";

  const { data: player, isLoading } = usePlayer(id);

  const [gameStats, setGameStats] = useState<any[]>([]);
  const [mvpCount, setMvpCount] = useState<number>(0);

  useEffect(() => {
    if (!id) return;

    const loadRealStats = async () => {
      try {
        const { data: statsData } = await supabase
          .from("player_game_stats")
          .select("touchdowns_totales, pases_completos, intercepciones, sacks")
          .eq("player_id", Number(id));

        if (statsData) setGameStats(statsData);

        const { count } = await supabase
          .from("mvps")
          .select("*", { count: "exact", head: true })
          .eq("player_id", Number(id));

        if (count !== null) setMvpCount(count);
      } catch (error) {
        console.log("Error al cargar estadísticas directas:", error);
      }
    };

    loadRealStats();
  }, [id]);

  const totals = useMemo(() => {
    return gameStats.reduce(
      (acc, curr) => ({
        tds: acc.tds + (Number(curr.touchdowns_totales) || 0),
        passes: acc.passes + (Number(curr.pases_completos) || 0),
        ints: acc.ints + (Number(curr.intercepciones) || 0),
        sacks: acc.sacks + (Number(curr.sacks) || 0),
      }),
      { tds: 0, passes: 0, ints: 0, sacks: 0 }
    );
  }, [gameStats]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: pageBg }]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  if (!player) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: pageBg, paddingHorizontal: 32 }]}>
        <View style={[styles.emptyIconWrap, { backgroundColor: cardBg }, cardShadow]}>
          <Ionicons name="person-outline" size={32} color={muted} />
        </View>
        <Text style={[styles.errorTitle, { color: textColor }]}>Jugador no encontrado</Text>
        <Text style={[styles.errorSubtitle, { color: muted }]}>
          No pudimos cargar este perfil. Vuelve e inténtalo de nuevo.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backPill, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.backPillText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const playerTeams = Array.isArray(player.teams)
    ? player.teams
    : player.teams
      ? [player.teams]
      : [];
  const primaryTeam = playerTeams[0];
  const primaryTeamColor = primaryTeam?.color1 || BRAND_GRADIENT[0];
  const secondaryTeamColor = primaryTeam?.color2 || BRAND_GRADIENT[1];
  const hasPhoto = player.photo_url && !player.photo_url.startsWith("blob:");
  const gameHistory = player.gameHistory || [];
  const realAttendanceCount = player.attendance_count || 0;
  const categoryLabel =
    primaryTeam?.category?.replace("-", " ").toUpperCase() ||
    player.position?.toUpperCase() ||
    "JUGADOR";
  const initials =
    player.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase())
      .join("") || "?";

  const stats = [
    { key: "tds", value: totals.tds },
    { key: "mvps", value: mvpCount },
    { key: "passes", value: totals.passes },
    { key: "ints", value: totals.ints },
    { key: "sacks", value: totals.sacks },
  ];

  const fadeOverlay = isDark
    ? ["transparent", "rgba(10,14,26,0.35)", "rgba(10,14,26,0.85)", pageBg]
    : ["transparent", "rgba(15,23,42,0.25)", "rgba(15,23,42,0.72)", pageBg];

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      {/* Floating back */}
      <View
        style={[
          styles.floatingHeader,
          { top: insets.top + 10 },
          isTablet && styles.floatingHeaderTablet,
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.92 : 1 }] }]}
        >
          <BlurView intensity={70} tint="dark" style={styles.floatingBtn}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </BlurView>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 48,
          maxWidth: isTablet ? 720 : undefined,
          alignSelf: isTablet ? "center" : undefined,
          width: "100%",
        }}
      >
        {/* ── HERO POSTER ── */}
        <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
          {hasPhoto ? (
            <Image source={{ uri: player.photo_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[primaryTeamColor, secondaryTeamColor, "#0F172A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}

          {!hasPhoto && (
            <View style={styles.heroInitialsWrap} pointerEvents="none">
              <Text style={styles.heroInitialsWatermark}>{initials}</Text>
            </View>
          )}

          {/* Soft color wash when photo exists */}
          {hasPhoto && (
            <LinearGradient
              colors={[`${primaryTeamColor}55`, "transparent", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}

          <LinearGradient colors={fadeOverlay as [string, string, ...string[]]} style={StyleSheet.absoluteFillObject} />

          <View style={[styles.heroContent, { paddingBottom: 28 }]}>
            <FadeInView delay={80}>
              <View style={styles.heroBadges}>
                <View style={[styles.jerseyBadge, { backgroundColor: primaryTeamColor }]}>
                  <Text style={styles.jerseyBadgeText}>#{player.jersey_number || "00"}</Text>
                </View>
                {player.status === "active" && (
                  <View style={styles.activeBadge}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>Activo</Text>
                  </View>
                )}
              </View>

              <Text style={styles.categoryChip}>{categoryLabel}</Text>

              <Text style={styles.playerName} numberOfLines={2}>
                {player.name}
              </Text>

              <View style={styles.heroSubRow}>
                <Text style={styles.heroSubText} numberOfLines={1}>
                  {primaryTeam?.name || "Sin equipo"}
                </Text>
                {player.position ? (
                  <>
                    <View style={styles.dotSep} />
                    <Text style={styles.heroSubText}>{player.position}</Text>
                  </>
                ) : null}
              </View>
            </FadeInView>
          </View>
        </View>

        {/* ── STATS STRIP ── */}
        <FadeInView delay={140}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScroll}
            style={styles.statsScrollWrap}
          >
            {stats.map((stat) => {
              const meta = STAT_META[stat.key];
              return (
                <View
                  key={stat.key}
                  style={[styles.statCard, { backgroundColor: cardBg }, cardShadow]}
                >
                  <View style={[styles.statIconWrap, { backgroundColor: `${meta.color}18` }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <Text style={[styles.statValue, { color: textColor }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: muted }]}>{meta.label}</Text>
                </View>
              );
            })}
          </ScrollView>
        </FadeInView>

        <View style={styles.body}>
          {/* Equipos */}
          {playerTeams.length > 0 && (
            <FadeInView delay={200}>
              <Text style={[styles.sectionLabel, { color: muted }]}>Equipos</Text>
              <View style={[styles.sectionCard, { backgroundColor: cardBg }, cardShadow]}>
                {playerTeams.map((team: any, index: number) => {
                  const isLast = index === playerTeams.length - 1;
                  const accent = team.color1 || primaryTeamColor;
                  return (
                    <Pressable
                      key={team.id || index}
                      onPress={() => router.push(`/team/${team.id}`)}
                      style={({ pressed }) => [
                        styles.teamRow,
                        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: divider },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View style={[styles.teamAccent, { backgroundColor: accent }]} />
                      <View style={[styles.teamLogoWrap, { backgroundColor: iconBg }]}>
                        {team.logo_url ? (
                          <Image source={{ uri: team.logo_url }} style={styles.teamLogo} resizeMode="contain" />
                        ) : (
                          <Text style={[styles.teamFallback, { color: muted }]}>
                            {team.name?.substring(0, 2).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.teamInfo}>
                        <Text style={[styles.teamName, { color: textColor }]} numberOfLines={1}>
                          {team.name}
                        </Text>
                        <Text style={[styles.teamCategory, { color: muted }]}>
                          {team.category?.replace("-", " ").toUpperCase()}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={muted} />
                    </Pressable>
                  );
                })}
              </View>
            </FadeInView>
          )}

          {/* Ficha técnica */}
          <FadeInView delay={260}>
            <Text style={[styles.sectionLabel, { color: muted }]}>Ficha técnica</Text>
            <View style={[styles.sectionCard, { backgroundColor: cardBg }, cardShadow]}>
              <InfoRow
                icon="calendar-outline"
                label="Asistencias"
                value={`${realAttendanceCount} partidos`}
                textColor={textColor}
                muted={muted}
                iconBg={iconBg}
                accent={primaryTeamColor}
                showDivider
                dividerColor={divider}
              />
              <InfoRow
                icon="shield-checkmark-outline"
                label="Temporadas"
                value={`${player.seasons_played || 1}`}
                textColor={textColor}
                muted={muted}
                iconBg={iconBg}
                accent={primaryTeamColor}
                showDivider
                dividerColor={divider}
              />
              <InfoRow
                icon="water-outline"
                label="Tipo de sangre"
                value={player.blood_type || "No registrado"}
                textColor={textColor}
                muted={muted}
                iconBg={iconBg}
                accent={primaryTeamColor}
              />
            </View>
          </FadeInView>

          {/* Historial */}
          <FadeInView delay={320}>
            <Text style={[styles.sectionLabel, { color: muted }]}>Historial de partidos</Text>
            {gameHistory.length > 0 ? (
              <View style={[styles.sectionCard, { backgroundColor: cardBg }, cardShadow]}>
                {gameHistory.map((game: any, index: number) => {
                  const isLast = index === gameHistory.length - 1;
                  const isHome = playerTeams.some((t: any) => t.name === game.home_team);
                  const rivalTeamName = isHome ? game.away_team : game.home_team;
                  const dateObj = new Date(game.game_date);
                  const prettyDate = dateObj.toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                  });

                  return (
                    <View
                      key={game.id}
                      style={[
                        styles.historyRow,
                        !isLast && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: divider,
                        },
                      ]}
                    >
                      <View style={[styles.historyDot, { backgroundColor: primaryTeamColor }]} />
                      <View style={styles.historyContent}>
                        <Text style={[styles.historyMatch, { color: textColor }]} numberOfLines={1}>
                          <Text style={{ color: muted, fontWeight: "500" }}>vs </Text>
                          {rivalTeamName}
                        </Text>
                        <Text style={[styles.historyDate, { color: muted }]}>
                          {prettyDate}
                          {game.category
                            ? ` · ${game.category.replace("-", " ").toUpperCase()}`
                            : ""}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.checkWrap,
                          { backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "#ECFDF5" },
                        ]}
                      >
                        <Ionicons name="checkmark" size={14} color="#10B981" />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: cardBg }, cardShadow]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: `${primaryTeamColor}14` }]}>
                  <Ionicons name="calendar-outline" size={26} color={primaryTeamColor} />
                </View>
                <Text style={[styles.emptyText, { color: muted }]}>
                  Sin registros de asistencia en esta temporada.
                </Text>
              </View>
            )}
          </FadeInView>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  textColor,
  muted,
  iconBg,
  accent,
  showDivider,
  dividerColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  textColor: string;
  muted: string;
  iconBg: string;
  accent: string;
  showDivider?: boolean;
  dividerColor?: string;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        showDivider && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: dividerColor,
        },
      ]}
    >
      <View style={[styles.infoIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={[styles.infoLabel, { color: muted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: textColor }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },

  floatingHeader: {
    position: "absolute",
    left: 16,
    zIndex: 20,
  },
  floatingHeaderTablet: {
    left: "50%",
    marginLeft: -360 + 16,
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.35)",
  },

  heroContainer: {
    width: "100%",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  heroInitialsWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  heroInitialsWatermark: {
    fontSize: 160,
    fontWeight: "900",
    color: "rgba(255,255,255,0.12)",
    letterSpacing: -8,
  },
  heroContent: {
    paddingHorizontal: 24,
    zIndex: 2,
  },
  heroBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  jerseyBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  jerseyBadgeText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "rgba(16,185,129,0.22)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.35)",
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#34D399",
  },
  activeText: {
    color: "#ECFDF5",
    fontSize: 12,
    fontWeight: "700",
  },
  categoryChip: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1.2,
    lineHeight: 40,
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroSubRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  heroSubText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 15,
    fontWeight: "600",
  },
  dotSep: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.45)",
  },

  statsScrollWrap: {
    marginTop: -8,
  },
  statsScroll: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 8,
  },
  statCard: {
    width: 108,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 28,
  },

  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    overflow: "hidden",
  },
  teamAccent: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: 2,
  },
  teamLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 14,
  },
  teamLogo: { width: "100%", height: "100%" },
  teamFallback: { fontSize: 14, fontWeight: "800" },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 16, fontWeight: "700", marginBottom: 3, letterSpacing: -0.2 },
  teamCategory: { fontSize: 12, fontWeight: "600", letterSpacing: 0.4 },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  infoCopy: { flex: 1 },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 14,
  },
  historyContent: { flex: 1, paddingRight: 10 },
  historyMatch: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: "500",
  },
  checkWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: {
    borderRadius: 24,
    padding: 36,
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },

  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  backPill: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: BRAND_GRADIENT[0],
  },
  backPillText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
