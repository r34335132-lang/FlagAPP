import React from "react";
import { View, Text, StyleSheet, Pressable, Image, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors"; // <-- Importamos nuestra paleta dinámica

export function MatchCardLight({ game, teams }: { game: any; teams: any[] }) {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  if (!game) return null;

  const homeTeam = teams.find((t) => t.name === game.home_team);
  const awayTeam = teams.find((t) => t.name === game.away_team);
  const isFinished = ["finalizado", "final"].includes(game.status?.toLowerCase() ?? "");

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
        <Text style={[
          styles.teamName, 
          { color: isWinner ? currentColors.text : currentColors.textSecondary }, 
          isWinner && styles.teamNameWinner
        ]} numberOfLines={1}>{name}</Text>
      </View>
      <Text style={[
        styles.scoreText, 
        { color: currentColors.textSecondary }, 
        isWinner && [styles.scoreTextWinner, { color: currentColors.text }]
      ]}>
        {score !== null && score !== undefined ? score : "-"}
      </Text>
    </View>
  );

  return (
    <Pressable 
      style={[
        styles.card, 
        { backgroundColor: currentColors.card, borderColor: currentColors.border, shadowColor: theme === 'dark' ? '#000' : '#0F172A' }
      ]}
      onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.statusText, { color: currentColors.text }]}>
          {isFinished ? "FINALIZADO" : game.game_time?.substring(0, 5) || "POR DEFINIR"}
        </Text>
        <Text style={[styles.categoryText, { color: currentColors.textSecondary }]}>{game.category?.replace("-", " ").toUpperCase()}</Text>
      </View>

      <View style={styles.cardBody}>
        <TeamRow team={homeTeam} name={game.home_team} score={game.home_score} isWinner={isFinished && game.home_score > game.away_score} />
        <View style={[styles.teamDivider, { backgroundColor: currentColors.borderLight }]} />
        <TeamRow team={awayTeam} name={game.away_team} score={game.away_score} isWinner={isFinished && game.away_score > game.home_score} />
      </View>

      <View style={[styles.cardFooter, { borderTopColor: currentColors.borderLight }]}>
        <Ionicons name="location" size={12} color={currentColors.textMuted} style={{ marginRight: 4 }} />
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
  );
}

// Retiramos los colores fijos de los estilos para que la app no se confunda
const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  statusText: { fontSize: 12, fontWeight: "800" },
  categoryText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  cardBody: { gap: 12 },
  teamDivider: { height: 1, marginLeft: 40 },
  teamRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  logoContainer: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden", marginRight: 12 },
  teamLogo: { width: "100%", height: "100%" },
  logoFallback: { fontSize: 12, fontWeight: "800" },
  teamName: { fontSize: 15, fontWeight: "600", flex: 1, paddingRight: 16 },
  teamNameWinner: { fontWeight: "800" },
  scoreText: { fontSize: 16, fontWeight: "700", width: 32, textAlign: "right" },
  scoreTextWinner: { fontWeight: "900" },
  cardFooter: { flexDirection: "row", alignItems: "center", marginTop: 16, paddingTop: 12, borderTopWidth: 1 },
  footerText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
});