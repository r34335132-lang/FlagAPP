import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { TeamLogo } from "./TeamLogo";
import { LiveBadge } from "./LiveBadge";
import { Game } from "@/hooks/useMatches";
import { Team } from "@/hooks/useTeams";
import C from "@/constants/colors";

interface MatchCardProps {
  game: Game;
  teams: Team[];
  compact?: boolean;
  hero?: boolean;
}

function getTeam(name: string, teams: Team[]): Team | undefined {
  return teams.find((t) => t.name === name || t.name?.toLowerCase() === name?.toLowerCase());
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("es-MX", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

const isFinished = (status: string | null) => {
  const s = status?.toLowerCase() ?? "";
  return s === "finalizado" || s === "final";
};

const isLive = (status: string | null) => {
  const s = status?.toLowerCase() ?? "";
  return s === "en vivo" || s === "live";
};

export function MatchCard({ game, teams, compact = false, hero = false }: MatchCardProps) {
  const homeTeam = getTeam(game.home_team, teams);
  const awayTeam = getTeam(game.away_team, teams);

  const homeColor = homeTeam?.color1 || C.primary;
  const awayColor = awayTeam?.color1 || C.blue;

  const showScore = isFinished(game.status) || isLive(game.status) || (game.home_score !== null && game.away_score !== null);

  if (hero) {
    return (
      <Pressable onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })} style={heroStyles.container}>
        <LinearGradient
          colors={[homeColor + "CC", "#0A0E1ACC", awayColor + "CC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={heroStyles.gradient}
        >
          <View style={heroStyles.badge}>
            <LiveBadge status={game.status} />
            {game.jornada && (
              <View style={heroStyles.jornada}>
                <Text style={heroStyles.jornadaText}>J{game.jornada}</Text>
              </View>
            )}
          </View>

          <View style={heroStyles.teamsRow}>
            <View style={heroStyles.teamBlock}>
              <TeamLogo logoUrl={homeTeam?.logo_url} size={72} color={homeColor + "44"} />
              <Text style={heroStyles.teamName} numberOfLines={2}>{game.home_team}</Text>
            </View>

            <View style={heroStyles.scoreBlock}>
              {showScore ? (
                <>
                  <Text style={heroStyles.score}>{game.home_score ?? 0}</Text>
                  <Text style={heroStyles.scoreDivider}>-</Text>
                  <Text style={heroStyles.score}>{game.away_score ?? 0}</Text>
                </>
              ) : (
                <View style={heroStyles.vsBlock}>
                  <Text style={heroStyles.vs}>VS</Text>
                  <Text style={heroStyles.timeText}>{formatTime(game.game_time)}</Text>
                </View>
              )}
            </View>

            <View style={heroStyles.teamBlock}>
              <TeamLogo logoUrl={awayTeam?.logo_url} size={72} color={awayColor + "44"} />
              <Text style={heroStyles.teamName} numberOfLines={2}>{game.away_team}</Text>
            </View>
          </View>

          <View style={heroStyles.footer}>
            {game.venue && <Text style={heroStyles.venue}>{game.venue}</Text>}
            <Text style={heroStyles.date}>{formatDate(game.game_date)}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  if (compact) {
    return (
      <Pressable
        onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
        style={({ pressed }) => [compactStyles.container, pressed && { opacity: 0.8 }]}
      >
        <LinearGradient
          colors={[homeColor + "22", C.card, awayColor + "22"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={compactStyles.gradient}
        >
          <View style={compactStyles.inner}>
            <View style={compactStyles.teamSide}>
              <TeamLogo logoUrl={homeTeam?.logo_url} size={44} color={homeColor + "44"} />
              <Text style={compactStyles.teamName} numberOfLines={2}>{game.home_team}</Text>
            </View>

            <View style={compactStyles.center}>
              {showScore ? (
                <Text style={compactStyles.scoreText}>
                  {game.home_score ?? 0} - {game.away_score ?? 0}
                </Text>
              ) : (
                <Text style={compactStyles.timeSmall}>{formatTime(game.game_time)}</Text>
              )}
              <LiveBadge status={game.status} />
            </View>

            <View style={[compactStyles.teamSide, { alignItems: "flex-end" }]}>
              <TeamLogo logoUrl={awayTeam?.logo_url} size={44} color={awayColor + "44"} />
              <Text style={[compactStyles.teamName, { textAlign: "right" }]} numberOfLines={2}>{game.away_team}</Text>
            </View>
          </View>
          <View style={compactStyles.dateRow}>
            <Text style={compactStyles.dateText}>{formatDate(game.game_date)}</Text>
            {game.venue && <Text style={compactStyles.venueText} numberOfLines={1}>{game.venue}</Text>}
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
      style={({ pressed }) => [cardStyles.container, pressed && { opacity: 0.8 }]}
    >
      <LinearGradient
        colors={[homeColor + "22", C.card, awayColor + "22"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={cardStyles.gradient}
      >
        <View style={cardStyles.header}>
          <LiveBadge status={game.status} />
          <Text style={cardStyles.meta}>
            {game.category && `${game.category}`}{game.jornada ? ` · J${game.jornada}` : ""}
          </Text>
          <Text style={cardStyles.dateLabel}>{formatDate(game.game_date)}</Text>
        </View>

        <View style={cardStyles.teamsRow}>
          <View style={cardStyles.teamBlock}>
            <TeamLogo logoUrl={homeTeam?.logo_url} size={52} color={homeColor + "44"} />
            <Text style={cardStyles.teamName} numberOfLines={2}>{game.home_team}</Text>
          </View>

          <View style={cardStyles.scoreBlock}>
            {showScore ? (
              <Text style={cardStyles.score}>{game.home_score ?? 0} - {game.away_score ?? 0}</Text>
            ) : (
              <View style={cardStyles.vsContainer}>
                <Text style={cardStyles.vs}>VS</Text>
                <Text style={cardStyles.time}>{formatTime(game.game_time)}</Text>
              </View>
            )}
          </View>

          <View style={[cardStyles.teamBlock, { alignItems: "flex-end" }]}>
            <TeamLogo logoUrl={awayTeam?.logo_url} size={52} color={awayColor + "44"} />
            <Text style={[cardStyles.teamName, { textAlign: "right" }]} numberOfLines={2}>{game.away_team}</Text>
          </View>
        </View>

        {game.venue && (
          <Text style={cardStyles.venue} numberOfLines={1}>{game.venue}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const heroStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  gradient: {
    padding: 20,
    minHeight: 200,
  },
  badge: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  jornada: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
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
    marginBottom: 16,
  },
  teamBlock: {
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  teamName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scoreBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  score: {
    color: "#fff",
    fontSize: 52,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  scoreDivider: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 32,
    fontWeight: "300",
  },
  vsBlock: {
    alignItems: "center",
    gap: 4,
  },
  vs: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    opacity: 0.9,
  },
  timeText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  venue: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    flex: 1,
  },
  date: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
  },
});

const compactStyles = StyleSheet.create({
  container: {
    width: 280,
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 6,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  gradient: {
    padding: 12,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  teamSide: {
    flex: 1,
    alignItems: "flex-start",
    gap: 6,
  },
  teamName: {
    color: C.text,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  center: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
  },
  scoreText: {
    color: C.text,
    fontSize: 20,
    fontWeight: "900",
  },
  timeSmall: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateText: {
    color: C.textSecondary,
    fontSize: 10,
    fontWeight: "600",
  },
  venueText: {
    color: C.textMuted,
    fontSize: 10,
    flex: 1,
    textAlign: "right",
    marginLeft: 8,
  },
});

const cardStyles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  gradient: {
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  meta: {
    color: C.textSecondary,
    fontSize: 11,
    flex: 1,
  },
  dateLabel: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  teamBlock: {
    flex: 1,
    alignItems: "flex-start",
    gap: 8,
  },
  teamName: {
    color: C.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  scoreBlock: {
    paddingHorizontal: 12,
    alignItems: "center",
  },
  score: {
    color: C.text,
    fontSize: 28,
    fontWeight: "900",
  },
  vsContainer: {
    alignItems: "center",
    gap: 2,
  },
  vs: {
    color: C.text,
    fontSize: 20,
    fontWeight: "900",
    opacity: 0.7,
  },
  time: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  venue: {
    color: C.textMuted,
    fontSize: 11,
    textAlign: "center",
  },
});
