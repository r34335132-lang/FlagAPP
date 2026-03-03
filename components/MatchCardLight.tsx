import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export function MatchCardLight({ game, teams }: { game: any; teams: any[] }) {
  if (!game) return null;

  const homeTeam = teams.find((t) => t.name === game.home_team);
  const awayTeam = teams.find((t) => t.name === game.away_team);
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
        <Text style={[styles.teamName, isWinner && styles.teamNameWinner]} numberOfLines={1}>{name}</Text>
      </View>
      <Text style={[styles.scoreText, isWinner && styles.scoreTextWinner]}>
        {score !== null && score !== undefined ? score : "-"}
      </Text>
    </View>
  );

  return (
    <Pressable 
      style={styles.card}
      onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.statusText}>
          {isFinished ? "FINALIZADO" : game.game_time?.substring(0, 5) || "POR DEFINIR"}
        </Text>
        <Text style={styles.categoryText}>{game.category?.replace("-", " ").toUpperCase()}</Text>
      </View>

      <View style={styles.cardBody}>
        <TeamRow team={homeTeam} name={game.home_team} score={game.home_score} isWinner={isFinished && game.home_score > game.away_score} />
        <View style={styles.teamDivider} />
        <TeamRow team={awayTeam} name={game.away_team} score={game.away_score} isWinner={isFinished && game.away_score > game.home_score} />
      </View>

      <View style={styles.cardFooter}>
        <Ionicons name="location" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
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
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  statusText: { color: "#0F172A", fontSize: 12, fontWeight: "800" },
  categoryText: { color: "#64748B", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  cardBody: { gap: 12 },
  teamDivider: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 40 },
  teamRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  logoContainer: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center", overflow: "hidden", marginRight: 12 },
  teamLogo: { width: "100%", height: "100%" },
  logoFallback: { color: "#94A3B8", fontSize: 12, fontWeight: "800" },
  teamName: { fontSize: 15, fontWeight: "600", color: "#334155", flex: 1, paddingRight: 16 },
  teamNameWinner: { fontWeight: "800", color: "#0F172A" },
  scoreText: { fontSize: 16, fontWeight: "700", color: "#64748B", width: 32, textAlign: "right" },
  scoreTextWinner: { fontWeight: "900", color: "#0F172A" },
  cardFooter: { flexDirection: "row", alignItems: "center", marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  footerText: { color: "#94A3B8", fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
});