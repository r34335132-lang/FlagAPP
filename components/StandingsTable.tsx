import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TeamStat } from "@/hooks/useStats";
import C, { BRAND_GRADIENT } from "@/constants/colors";

interface StandingsTableProps {
  stats: TeamStat[];
  limit?: number;
}

// Gold, Silver, Bronze mapped to brand palette
const RANK_CONFIG = [
  { color: BRAND_GRADIENT[2], icon: "crown" as const, size: 15 },
  { color: "#C0C0C0",         icon: "medal"  as const, size: 14 },
  { color: BRAND_GRADIENT[0], icon: "medal"  as const, size: 14 },
];

function StatCell({ value, style }: { value: string | number; style?: object }) {
  return <Text style={[tableS.stat, style]}>{value}</Text>;
}

function PointsBadge({ points, top }: { points: number; top: boolean }) {
  if (top) {
    return (
      <LinearGradient
        colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[2]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tableS.ptsBadgeTop}
      >
        <Text style={tableS.ptsBadgeTopText}>{points}</Text>
      </LinearGradient>
    );
  }
  return (
    <View style={tableS.ptsBadge}>
      <Text style={tableS.ptsBadgeText}>{points}</Text>
    </View>
  );
}

export function StandingsTable({ stats, limit }: StandingsTableProps) {
  const rows = limit ? stats.slice(0, limit) : stats;

  return (
    <View style={tableS.container}>
      {/* Header */}
      <LinearGradient
        colors={[C.cardLight, C.card]}
        style={tableS.header}
      >
        <Text style={tableS.hRank}>#</Text>
        <Text style={tableS.hTeam}>EQUIPO</Text>
        <Text style={tableS.hStat}>PJ</Text>
        <Text style={tableS.hStat}>G</Text>
        <Text style={tableS.hStat}>E</Text>
        <Text style={tableS.hStat}>P</Text>
        <Text style={tableS.hPts}>PTS</Text>
      </LinearGradient>

      {rows.map((stat, i) => {
        const isTop3 = i < 3;
        const cfg = RANK_CONFIG[i];

        return (
          <View key={`${stat.team_name}-${stat.season}-${i}`}>
            {isTop3 ? (
              <LinearGradient
                colors={[cfg.color + "20", C.card + "00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={tableS.topRow}
              >
                {/* colored left indicator */}
                <View style={[tableS.rankBar, { backgroundColor: cfg.color }]} />

                <View style={tableS.rankCell}>
                  <MaterialCommunityIcons name={cfg.icon} size={cfg.size} color={cfg.color} />
                </View>

                <Text style={[tableS.teamName, { color: C.text, fontWeight: "800" }]} numberOfLines={1}>
                  {stat.team_name}
                </Text>
                <StatCell value={stat.games_played} style={tableS.neutralStat} />
                <StatCell value={stat.games_won} style={tableS.winStat} />
                <StatCell value={stat.games_tied} style={tableS.tieStat} />
                <StatCell value={stat.games_lost} style={tableS.lossStat} />
                <PointsBadge points={stat.points} top={true} />
              </LinearGradient>
            ) : (
              <View style={tableS.row}>
                <View style={tableS.rankBarEmpty} />
                <View style={tableS.rankCell}>
                  <Text style={tableS.rankNum}>{i + 1}</Text>
                </View>
                <Text style={tableS.teamName} numberOfLines={1}>{stat.team_name}</Text>
                <StatCell value={stat.games_played} style={tableS.neutralStat} />
                <StatCell value={stat.games_won} style={tableS.winStat} />
                <StatCell value={stat.games_tied} style={tableS.tieStat} />
                <StatCell value={stat.games_lost} style={tableS.lossStat} />
                <PointsBadge points={stat.points} top={false} />
              </View>
            )}
            {/* separator */}
            {i < rows.length - 1 && (
              <View style={[tableS.sep, i === 2 && tableS.sepThick]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const STAT_W = 26;
const PTS_W = 40;

const tableS = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: C.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  hRank: {
    width: 32,
    color: C.textMuted,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    textAlign: "center",
    marginLeft: 4,
  },
  hTeam: {
    flex: 1,
    color: C.textMuted,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    marginLeft: 4,
  },
  hStat: {
    width: STAT_W,
    color: C.textMuted,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    textAlign: "center",
  },
  hPts: {
    width: PTS_W,
    color: C.textMuted,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    textAlign: "center",
  },

  // rows
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingRight: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingRight: 12,
    backgroundColor: C.card,
  },

  // rank bar (colored for top 3, transparent for rest)
  rankBar: {
    width: 3,
    height: 38,
    borderRadius: 2,
    marginRight: 7,
  },
  rankBarEmpty: {
    width: 3,
    height: 38,
    marginRight: 7,
  },

  rankCell: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNum: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  teamName: {
    flex: 1,
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
    marginRight: 4,
  },

  stat: {
    width: STAT_W,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
    color: C.textSecondary,
  },
  neutralStat: {
    color: C.textSecondary,
  },
  winStat: {
    color: C.win,
    fontWeight: "700",
  },
  tieStat: {
    color: C.tie,
    fontWeight: "600",
  },
  lossStat: {
    color: C.loss,
    fontWeight: "700",
  },

  // points badges
  ptsBadgeTop: {
    width: PTS_W,
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  ptsBadgeTopText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  ptsBadge: {
    width: PTS_W,
    alignItems: "center",
    backgroundColor: C.cardLight,
    borderRadius: 10,
    paddingVertical: 4,
  },
  ptsBadgeText: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
  },

  // separators
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginLeft: 40,
  },
  sepThick: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginLeft: 0,
    marginTop: 2,
    marginBottom: 2,
  },
});
