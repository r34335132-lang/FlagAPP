import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { TeamStat } from "@/hooks/useStats";
import C from "@/constants/colors";

interface StandingsTableProps {
  stats: TeamStat[];
  limit?: number;
}

const MEDAL_COLORS = ["#F59E0B", "#9CA3AF", "#CD7C2F"];

export function StandingsTable({ stats, limit }: StandingsTableProps) {
  const displayed = limit ? stats.slice(0, limit) : stats;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerRank}>#</Text>
        <Text style={styles.headerTeam}>EQUIPO</Text>
        <Text style={styles.headerStat}>PJ</Text>
        <Text style={styles.headerStat}>G</Text>
        <Text style={styles.headerStat}>E</Text>
        <Text style={styles.headerStat}>P</Text>
        <Text style={styles.headerPoints}>PTS</Text>
      </View>

      {displayed.map((stat, index) => {
        const isTop3 = index < 3;
        const medalColor = MEDAL_COLORS[index];
        const winPct = stat.games_played > 0 ? stat.games_won / stat.games_played : 0;

        return (
          <View
            key={`${stat.team_name}-${stat.season}-${index}`}
            style={[styles.row, isTop3 && styles.topRow]}
          >
            {isTop3 ? (
              <LinearGradient
                colors={[medalColor + "22", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.rowGradient}
              >
                <View style={styles.rowContent}>
                  <View style={styles.rankCell}>
                    {index === 0 ? (
                      <MaterialCommunityIcons name="crown" size={16} color={medalColor} />
                    ) : (
                      <Text style={[styles.rank, { color: medalColor }]}>{index + 1}</Text>
                    )}
                  </View>
                  <Text style={[styles.teamName, isTop3 && styles.topTeamName]} numberOfLines={1}>
                    {stat.team_name}
                  </Text>
                  <Text style={styles.stat}>{stat.games_played}</Text>
                  <Text style={[styles.stat, styles.win]}>{stat.games_won}</Text>
                  <Text style={[styles.stat, styles.tie]}>{stat.games_tied}</Text>
                  <Text style={[styles.stat, styles.loss]}>{stat.games_lost}</Text>
                  <View style={styles.pointsBadge}>
                    <Text style={styles.pointsText}>{stat.points}</Text>
                  </View>
                </View>
              </LinearGradient>
            ) : (
              <View style={styles.rowGradient}>
                <View style={styles.rowContent}>
                  <View style={styles.rankCell}>
                    <Text style={styles.rank}>{index + 1}</Text>
                  </View>
                  <Text style={styles.teamName} numberOfLines={1}>{stat.team_name}</Text>
                  <Text style={styles.stat}>{stat.games_played}</Text>
                  <Text style={[styles.stat, styles.win]}>{stat.games_won}</Text>
                  <Text style={[styles.stat, styles.tie]}>{stat.games_tied}</Text>
                  <Text style={[styles.stat, styles.loss]}>{stat.games_lost}</Text>
                  <View style={styles.pointsBadgeNormal}>
                    <Text style={styles.pointsTextNormal}>{stat.points}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: C.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.cardLight,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerRank: {
    width: 28,
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    textAlign: "center",
  },
  headerTeam: {
    flex: 1,
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  headerStat: {
    width: 28,
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    textAlign: "center",
  },
  headerPoints: {
    width: 38,
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    textAlign: "center",
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  topRow: {
    borderBottomColor: C.borderLight,
  },
  rowGradient: {
    flex: 1,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rankCell: {
    width: 28,
    alignItems: "center",
  },
  rank: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  teamName: {
    flex: 1,
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  topTeamName: {
    color: C.text,
    fontWeight: "700",
  },
  stat: {
    width: 28,
    color: C.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
  win: {
    color: C.win,
    fontWeight: "700",
  },
  tie: {
    color: C.tie,
    fontWeight: "600",
  },
  loss: {
    color: C.loss,
    fontWeight: "700",
  },
  pointsBadge: {
    width: 38,
    alignItems: "center",
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  pointsText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  pointsBadgeNormal: {
    width: 38,
    alignItems: "center",
  },
  pointsTextNormal: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
  },
});
