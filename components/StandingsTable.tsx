import React from "react";
import { View, Text, StyleSheet } from "react-native";

export function StandingsTable({ stats, limit }: { stats: any[]; limit?: number }) {
  // Ordenar por puntos (y diferencia de puntos si hay empate)
  const sorted = [...stats].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = (a.points_for || 0) - (a.points_against || 0);
    const diffB = (b.points_for || 0) - (b.points_against || 0);
    return diffB - diffA;
  });

  const displayStats = limit ? sorted.slice(0, limit) : sorted;

  return (
    <View style={styles.container}>
      {/* ── Cabecera de la tabla ── */}
      <View style={styles.headerRow}>
        <View style={styles.colRank}><Text style={styles.headerText}>POS</Text></View>
        <View style={styles.colTeam}><Text style={styles.headerText}>EQUIPO</Text></View>
        <View style={styles.colStat}><Text style={styles.headerText}>PJ</Text></View>
        <View style={styles.colStat}><Text style={styles.headerText}>G</Text></View>
        <View style={styles.colStat}><Text style={styles.headerText}>P</Text></View>
        <View style={styles.colStat}><Text style={[styles.headerText, styles.ptsHeader]}>PTS</Text></View>
      </View>

      {/* ── Filas de equipos ── */}
      {displayStats.map((team, index) => {
        const isTop3 = index < 3; // Resaltar a los primeros 3 lugares
        return (
          <View key={team.id || index} style={[styles.row, index === displayStats.length - 1 && styles.lastRow]}>
            <View style={styles.colRank}>
              <View style={[styles.rankBadge, isTop3 && styles.rankBadgeTop]}>
                <Text style={[styles.rankText, isTop3 && styles.rankTextTop]}>{index + 1}</Text>
              </View>
            </View>
            <View style={styles.colTeam}>
              <Text style={styles.teamText} numberOfLines={1}>{team.team_name}</Text>
            </View>
            <View style={styles.colStat}>
              <Text style={styles.statText}>{team.games_played}</Text>
            </View>
            <View style={styles.colStat}>
              {/* Ganados en Verde */}
              <Text style={[styles.statText, { color: "#10B981" }]}>{team.games_won}</Text>
            </View>
            <View style={styles.colStat}>
              {/* Perdidos en Rojo */}
              <Text style={[styles.statText, { color: "#EF4444" }]}>{team.games_lost}</Text>
            </View>
            <View style={styles.colStat}>
              <Text style={styles.ptsText}>{team.points}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#FFFFFF",
  },
  headerRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC", // Gris súper clarito
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  ptsHeader: {
    color: "#0F172A",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  colRank: { width: 36, alignItems: "center" },
  colTeam: { flex: 1, paddingRight: 8 },
  colStat: { width: 36, alignItems: "center" },
  
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeTop: {
    backgroundColor: "#0F172A", // Los 3 primeros lugares van en oscuro
  },
  rankText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },
  rankTextTop: {
    color: "#FFFFFF",
  },
  teamText: {
    color: "#0F172A", // Texto oscuro principal
    fontSize: 14,
    fontWeight: "700",
  },
  statText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  ptsText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
});