import React, { useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { TeamLogo } from "./TeamLogo";
import { LiveBadge } from "./LiveBadge";
import { Game } from "@/hooks/useMatches";
import { Team } from "@/hooks/useTeams";
import C, { BRAND_GRADIENT } from "@/constants/colors";

interface MatchCardProps {
  game: Game;
  teams: Team[];
  compact?: boolean;
  hero?: boolean;
}

function getTeam(name: string, teams: Team[]): Team | undefined {
  return teams.find(
    (t) => t.name === name || t.name?.toLowerCase() === name?.toLowerCase()
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-MX", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const FINISHED = new Set(["finalizado", "final", "terminado"]);
const LIVE = new Set(["en vivo", "live", "en curso"]);

function hasScore(game: Game) {
  const s = game.status?.toLowerCase() ?? "";
  return FINISHED.has(s) || LIVE.has(s) || (game.home_score !== null && game.away_score !== null);
}

function useScalePress() {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  return { scale, onPressIn, onPressOut };
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
export function MatchCard({ game, teams, compact = false, hero = false }: MatchCardProps) {
  const homeTeam = getTeam(game.home_team, teams);
  const awayTeam = getTeam(game.away_team, teams);
  const homeColor = homeTeam?.color1 || BRAND_GRADIENT[0];
  const awayColor = awayTeam?.color1 || BRAND_GRADIENT[2];
  const showScore = hasScore(game);
  const { scale, onPressIn, onPressOut } = useScalePress();

  if (hero) {
    return (
      <Animated.View style={[heroS.wrapper, { transform: [{ scale }] }]}>
        <Pressable
          onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <LinearGradient
            colors={[homeColor + "DD", "#0B1020EE", awayColor + "DD"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={heroS.gradient}
          >
            {/* top row */}
            <View style={heroS.topRow}>
              <LiveBadge status={game.status} />
              <View style={heroS.metaRight}>
                {game.category && (
                  <Text style={heroS.category}>{game.category}</Text>
                )}
                {game.jornada != null && (
                  <View style={heroS.jornadaPill}>
                    <Text style={heroS.jornadaText}>J{game.jornada}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* teams + score */}
            <View style={heroS.teamsRow}>
              <View style={heroS.teamBlock}>
                <View style={[heroS.logoRing, { borderColor: homeColor + "88" }]}>
                  <TeamLogo logoUrl={homeTeam?.logo_url} size={80} color={homeColor + "55"} />
                </View>
                <Text style={heroS.teamName} numberOfLines={2}>{game.home_team}</Text>
              </View>

              <View style={heroS.scoreBlock}>
                {showScore ? (
                  <View style={heroS.scoreRow}>
                    <Text style={heroS.scoreNum}>{game.home_score ?? 0}</Text>
                    <Text style={heroS.scoreDash}>–</Text>
                    <Text style={heroS.scoreNum}>{game.away_score ?? 0}</Text>
                  </View>
                ) : (
                  <View style={heroS.vsBlock}>
                    <Text style={heroS.vs}>VS</Text>
                    {game.game_time && (
                      <Text style={heroS.time}>{formatTime(game.game_time)}</Text>
                    )}
                  </View>
                )}
              </View>

              <View style={[heroS.teamBlock, { alignItems: "flex-end" }]}>
                <View style={[heroS.logoRing, { borderColor: awayColor + "88" }]}>
                  <TeamLogo logoUrl={awayTeam?.logo_url} size={80} color={awayColor + "55"} />
                </View>
                <Text style={[heroS.teamName, { textAlign: "right" }]} numberOfLines={2}>
                  {game.away_team}
                </Text>
              </View>
            </View>

            {/* footer */}
            <View style={heroS.footer}>
              {game.venue ? (
                <View style={heroS.venueRow}>
                  <Feather name="map-pin" size={11} color="rgba(255,255,255,0.5)" />
                  <Text style={heroS.venue} numberOfLines={1}>{game.venue}</Text>
                </View>
              ) : <View />}
              <Text style={heroS.date}>{formatDate(game.game_date)}</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  // ─── COMPACT ──────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <Animated.View style={[compactS.wrapper, { transform: [{ scale }] }]}>
        <Pressable
          onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <LinearGradient
            colors={[homeColor + "2A", C.card, awayColor + "2A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={compactS.gradient}
          >
            {/* top accent bar */}
            <LinearGradient
              colors={[homeColor, awayColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={compactS.accentBar}
            />
            <View style={compactS.inner}>
              <View style={compactS.side}>
                <TeamLogo logoUrl={homeTeam?.logo_url} size={52} color={homeColor + "44"} />
                <Text style={compactS.teamName} numberOfLines={2}>{game.home_team}</Text>
              </View>

              <View style={compactS.center}>
                {showScore ? (
                  <Text style={compactS.score}>
                    {game.home_score ?? 0} – {game.away_score ?? 0}
                  </Text>
                ) : (
                  <Text style={compactS.timeText}>{formatTime(game.game_time)}</Text>
                )}
                <LiveBadge status={game.status} />
              </View>

              <View style={[compactS.side, { alignItems: "flex-end" }]}>
                <TeamLogo logoUrl={awayTeam?.logo_url} size={52} color={awayColor + "44"} />
                <Text style={[compactS.teamName, { textAlign: "right" }]} numberOfLines={2}>
                  {game.away_team}
                </Text>
              </View>
            </View>
            <View style={compactS.footer}>
              <Text style={compactS.footerText}>{formatDate(game.game_date)}</Text>
              {game.venue && (
                <Text style={compactS.footerVenue} numberOfLines={1}>{game.venue}</Text>
              )}
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  // ─── FULL CARD ─────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[cardS.wrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <LinearGradient
          colors={[homeColor + "28", C.card, awayColor + "28"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cardS.gradient}
        >
          {/* left accent */}
          <LinearGradient
            colors={[homeColor, awayColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={cardS.leftAccent}
          />

          <View style={cardS.body}>
            {/* header row */}
            <View style={cardS.header}>
              <LiveBadge status={game.status} />
              <Text style={cardS.meta}>
                {[game.category, game.jornada != null ? `J${game.jornada}` : null]
                  .filter(Boolean).join(" · ")}
              </Text>
              <Text style={cardS.dateLabel}>{formatDate(game.game_date)}</Text>
            </View>

            {/* teams */}
            <View style={cardS.teamsRow}>
              <View style={cardS.teamBlock}>
                <View style={[cardS.logoRing, { borderColor: homeColor + "66" }]}>
                  <TeamLogo logoUrl={homeTeam?.logo_url} size={64} color={homeColor + "44"} />
                </View>
                <Text style={cardS.teamName} numberOfLines={2}>{game.home_team}</Text>
              </View>

              <View style={cardS.scoreBlock}>
                {showScore ? (
                  <>
                    <Text style={cardS.score}>
                      {game.home_score ?? 0} – {game.away_score ?? 0}
                    </Text>
                    <Text style={cardS.finalLabel}>RESULTADO</Text>
                  </>
                ) : (
                  <View style={cardS.vsBox}>
                    <Text style={cardS.vs}>VS</Text>
                    {game.game_time && (
                      <Text style={cardS.time}>{formatTime(game.game_time)}</Text>
                    )}
                  </View>
                )}
              </View>

              <View style={[cardS.teamBlock, { alignItems: "flex-end" }]}>
                <View style={[cardS.logoRing, { borderColor: awayColor + "66" }]}>
                  <TeamLogo logoUrl={awayTeam?.logo_url} size={64} color={awayColor + "44"} />
                </View>
                <Text style={[cardS.teamName, { textAlign: "right" }]} numberOfLines={2}>
                  {game.away_team}
                </Text>
              </View>
            </View>

            {game.venue && (
              <View style={cardS.venueRow}>
                <Feather name="map-pin" size={10} color={C.textMuted} />
                <Text style={cardS.venue} numberOfLines={1}>{game.venue}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ─── HERO STYLES ──────────────────────────────────────────────────────────────
const heroS = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 12,
  },
  gradient: {
    padding: 20,
    paddingBottom: 18,
    minHeight: 220,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metaRight: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  category: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  jornadaPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  jornadaText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  teamBlock: {
    flex: 1,
    alignItems: "flex-start",
    gap: 10,
  },
  logoRing: {
    borderRadius: 48,
    borderWidth: 2,
    padding: 3,
  },
  teamName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
  },
  scoreBlock: {
    alignItems: "center",
    paddingHorizontal: 4,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scoreNum: {
    color: "#fff",
    fontSize: 60,
    fontWeight: "900",
    letterSpacing: -2,
    lineHeight: 68,
  },
  scoreDash: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 36,
    fontWeight: "200",
    marginBottom: 4,
  },
  vsBlock: {
    alignItems: "center",
    gap: 4,
  },
  vs: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    opacity: 0.85,
    letterSpacing: 2,
  },
  time: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  venue: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    flex: 1,
  },
  date: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

// ─── COMPACT STYLES ───────────────────────────────────────────────────────────
const compactS = StyleSheet.create({
  wrapper: {
    width: 290,
    borderRadius: 18,
    overflow: "hidden",
    marginHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: { borderRadius: 18 },
  accentBar: {
    height: 3,
    width: "100%",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingTop: 12,
  },
  side: {
    flex: 1,
    alignItems: "flex-start",
    gap: 7,
  },
  teamName: {
    color: C.text,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  center: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  score: {
    color: C.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  timeText: {
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  footerText: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  footerVenue: {
    color: C.textMuted,
    fontSize: 10,
    flex: 1,
    textAlign: "right",
    marginLeft: 8,
  },
});

// ─── FULL CARD STYLES ─────────────────────────────────────────────────────────
const cardS = StyleSheet.create({
  wrapper: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  gradient: {
    flexDirection: "row",
  },
  leftAccent: {
    width: 4,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  meta: {
    color: C.textMuted,
    fontSize: 11,
    flex: 1,
    fontWeight: "500",
  },
  dateLabel: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamBlock: {
    flex: 1,
    alignItems: "flex-start",
    gap: 8,
  },
  logoRing: {
    borderRadius: 36,
    borderWidth: 2,
    padding: 2,
  },
  teamName: {
    color: C.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  scoreBlock: {
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 3,
  },
  score: {
    color: C.text,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
  },
  finalLabel: {
    color: C.textMuted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  vsBox: {
    alignItems: "center",
    gap: 2,
  },
  vs: {
    color: C.text,
    fontSize: 22,
    fontWeight: "900",
    opacity: 0.65,
    letterSpacing: 1,
  },
  time: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  venue: {
    color: C.textMuted,
    fontSize: 10,
    flex: 1,
  },
});
