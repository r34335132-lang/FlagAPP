import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useMatches } from "@/hooks/useMatches";
import { useTeams } from "@/hooks/useTeams";
import { TeamLogo } from "@/components/TeamLogo";
import { LiveBadge } from "@/components/LiveBadge";
import { Skeleton } from "@/components/SkeletonLoader";
import C from "@/constants/colors";

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Feather name={icon as any} size={16} color={C.textMuted} />
      <View style={infoStyles.text}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  text: {
    flex: 1,
  },
  label: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  value: {
    color: C.text,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 1,
  },
});

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function getTeamByName(name: string, teams: ReturnType<typeof useTeams>["data"]) {
  return teams?.find((t) => t.name === name || t.name?.toLowerCase() === name?.toLowerCase());
}

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: games, isLoading: gamesLoading } = useMatches();
  const { data: teams } = useTeams();

  const game = games?.find((g) => g.id === id || String(g.id) === String(id));
  const homeTeam = game ? getTeamByName(game.home_team, teams) : undefined;
  const awayTeam = game ? getTeamByName(game.away_team, teams) : undefined;

  const homeColor = homeTeam?.color1 || C.primary;
  const awayColor = awayTeam?.color1 || C.blue;

  const showScore =
    game?.home_score !== null && game?.away_score !== null;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (gamesLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <Skeleton width="80%" height={20} borderRadius={6} style={{ margin: 20 }} />
        <Skeleton width="100%" height={220} borderRadius={0} />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Partido no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[homeColor + "CC", "#0A0E1ACC", awayColor + "CC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: topPad + 16 }]}
        >
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { top: topPad + 12 }]}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>

          <View style={styles.statusRow}>
            <LiveBadge status={game.status} />
            {game.jornada && (
              <View style={styles.jornadaBadge}>
                <Text style={styles.jornadaText}>Jornada {game.jornada}</Text>
              </View>
            )}
            {game.stage && (
              <View style={styles.stageBadge}>
                <Text style={styles.stageText}>{game.stage}</Text>
              </View>
            )}
          </View>

          <View style={styles.teamsBlock}>
            <View style={styles.teamColumn}>
              <TeamLogo logoUrl={homeTeam?.logo_url} size={80} color={homeColor + "44"} />
              <Text style={styles.teamNameLarge} numberOfLines={2}>{game.home_team}</Text>
              {homeTeam?.category && (
                <Text style={styles.teamCategory}>{homeTeam.category}</Text>
              )}
            </View>

            <View style={styles.scoreColumn}>
              {showScore ? (
                <>
                  <Text style={styles.scoreHuge}>{game.home_score}</Text>
                  <Text style={styles.scoreSep}>-</Text>
                  <Text style={styles.scoreHuge}>{game.away_score}</Text>
                </>
              ) : (
                <View style={styles.vsBlock}>
                  <Text style={styles.vsText}>VS</Text>
                  {game.game_time && (
                    <Text style={styles.timeDisplay}>{formatTime(game.game_time)}</Text>
                  )}
                </View>
              )}
            </View>

            <View style={[styles.teamColumn, { alignItems: "flex-end" }]}>
              <TeamLogo logoUrl={awayTeam?.logo_url} size={80} color={awayColor + "44"} />
              <Text style={[styles.teamNameLarge, { textAlign: "right" }]} numberOfLines={2}>{game.away_team}</Text>
              {awayTeam?.category && (
                <Text style={styles.teamCategory}>{awayTeam.category}</Text>
              )}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Detalles del Partido</Text>
            {game.game_date && (
              <InfoRow icon="calendar" label="Fecha" value={formatDate(game.game_date)} />
            )}
            {game.game_time && (
              <InfoRow icon="clock" label="Hora" value={formatTime(game.game_time)} />
            )}
            {game.venue && (
              <InfoRow icon="map-pin" label="Sede" value={game.venue} />
            )}
            {game.category && (
              <InfoRow icon="tag" label="Categoría" value={game.category} />
            )}
            {game.season && (
              <InfoRow icon="calendar" label="Temporada" value={game.season} />
            )}
          </View>

          {showScore && (
            <View style={styles.resultCard}>
              <Text style={styles.sectionTitle}>Resultado</Text>
              <View style={styles.resultRow}>
                <View style={[styles.teamResult, { alignItems: "flex-start" }]}>
                  <TeamLogo logoUrl={homeTeam?.logo_url} size={40} color={homeColor + "44"} />
                  <Text style={styles.resultTeam} numberOfLines={1}>{game.home_team}</Text>
                </View>
                <View style={styles.finalScore}>
                  <Text style={styles.finalScoreText}>{game.home_score} - {game.away_score}</Text>
                  <Text style={styles.finalLabel}>FINAL</Text>
                </View>
                <View style={[styles.teamResult, { alignItems: "flex-end" }]}>
                  <TeamLogo logoUrl={awayTeam?.logo_url} size={40} color={awayColor + "44"} />
                  <Text style={[styles.resultTeam, { textAlign: "right" }]} numberOfLines={1}>{game.away_team}</Text>
                </View>
              </View>

              {(game.home_score !== null && game.away_score !== null) && (
                <View style={styles.winnerBanner}>
                  {game.home_score! > game.away_score! ? (
                    <Text style={styles.winnerText}>{game.home_team} gana</Text>
                  ) : game.away_score! > game.home_score! ? (
                    <Text style={styles.winnerText}>{game.away_team} gana</Text>
                  ) : (
                    <Text style={styles.winnerText}>Empate</Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: C.textSecondary,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 36,
    marginBottom: 20,
  },
  jornadaBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  jornadaText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  stageBadge: {
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stageText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "600",
  },
  teamsBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamColumn: {
    flex: 1,
    alignItems: "flex-start",
    gap: 10,
  },
  teamNameLarge: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  teamCategory: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "600",
  },
  scoreColumn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 4,
  },
  scoreHuge: {
    color: "#fff",
    fontSize: 56,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  scoreSep: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 36,
    fontWeight: "300",
  },
  vsBlock: {
    alignItems: "center",
    gap: 4,
  },
  vsText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    opacity: 0.9,
  },
  timeDisplay: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  body: {
    padding: 16,
    gap: 16,
  },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  resultCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamResult: {
    flex: 1,
    gap: 8,
  },
  resultTeam: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  finalScore: {
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 2,
  },
  finalScoreText: {
    color: C.text,
    fontSize: 28,
    fontWeight: "900",
  },
  finalLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  winnerBanner: {
    backgroundColor: C.primary + "22",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.primary + "44",
  },
  winnerText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: "800",
  },
});
