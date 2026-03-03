import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";

export function StandingsTable({ stats, teams, limit }: { stats: any[]; teams?: any[]; limit?: number }) {
  // Ordenar por puntos (y diferencia de puntos si hay empate)
  const sorted = [...stats].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = (a.points_for || 0) - (a.points_against || 0);
    const diffB = (b.points_for || 0) - (b.points_against || 0);
    return diffB - diffA;
  });

  const displayStats = limit ? sorted.slice(0, limit) : sorted;

  return (
    // Agregamos un scroll horizontal por si las columnas no caben en pantallas pequeñas
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollWrapper}>
      <View style={styles.container}>
        {/* ── Cabecera de la tabla ── */}
        <View style={styles.headerRow}>
          <View style={styles.colRank}><Text style={styles.headerText}>#</Text></View>
          <View style={styles.colTeam}><Text style={styles.headerText}>EQUIPO</Text></View>
          <View style={styles.colStat}><Text style={styles.headerText}>PJ</Text></View>
          <View style={styles.colStat}><Text style={styles.headerText}>G</Text></View>
          <View style={styles.colStat}><Text style={styles.headerText}>P</Text></View>
          <View style={styles.colStat}><Text style={styles.headerText}>PF</Text></View>
          <View style={styles.colStat}><Text style={styles.headerText}>PC</Text></View>
          <View style={styles.colStat}><Text style={styles.headerText}>DIF</Text></View>
          <View style={styles.colStatPts}><Text style={[styles.headerText, styles.ptsHeader]}>PTS</Text></View>
        </View>

        {/* ── Filas de equipos ── */}
        {displayStats.map((team, index) => {
          const isTop3 = index < 3; 
          const diff = (team.points_for || 0) - (team.points_against || 0);
          
          // Buscar el logo en la lista de equipos
          const teamInfo = teams?.find(t => t.name === team.team_name);
          const hasLogo = teamInfo?.logo_url && !teamInfo.logo_url.startsWith('blob:');

          return (
            <View key={team.id || index} style={[styles.row, index === displayStats.length - 1 && styles.lastRow]}>
              <View style={styles.colRank}>
                <View style={[styles.rankBadge, isTop3 && styles.rankBadgeTop]}>
                  <Text style={[styles.rankText, isTop3 && styles.rankTextTop]}>{index + 1}</Text>
                </View>
              </View>

              <View style={styles.colTeam}>
                <View style={styles.logoWrapper}>
                  {hasLogo ? (
                    <Image source={{ uri: teamInfo.logo_url }} style={styles.logo} resizeMode="contain" />
                  ) : (
                    <Text style={styles.initials}>{team.team_name?.substring(0, 2).toUpperCase()}</Text>
                  )}
                </View>
                <Text style={styles.teamText} numberOfLines={1}>{team.team_name}</Text>
              </View>

              <View style={styles.colStat}><Text style={styles.statText}>{team.games_played}</Text></View>
              <View style={styles.colStat}><Text style={[styles.statText, { color: "#10B981" }]}>{team.games_won}</Text></View>
              <View style={styles.colStat}><Text style={[styles.statText, { color: "#EF4444" }]}>{team.games_lost}</Text></View>
              
              {/* Nuevas Columnas */}
              <View style={styles.colStat}><Text style={styles.statTextSecondary}>{team.points_for || 0}</Text></View>
              <View style={styles.colStat}><Text style={styles.statTextSecondary}>{team.points_against || 0}</Text></View>
              <View style={styles.colStat}>
                <Text style={[styles.statText, diff > 0 ? { color: "#10B981" } : diff < 0 ? { color: "#EF4444" } : {}]}>
                  {diff > 0 ? `+${diff}` : diff}
                </Text>
              </View>

              <View style={styles.colStatPts}><Text style={styles.ptsText}>{team.points}</Text></View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollWrapper: {
    width: "100%",
  },
  container: {
    minWidth: "100%", // Asegura que tome todo el ancho, pero permite scroll si es muy pequeña la pantalla
    backgroundColor: "#FFFFFF",
  },
  headerRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC", 
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  ptsHeader: { color: "#0F172A" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  lastRow: { borderBottomWidth: 0 },
  
  // Anchuras de columnas
  colRank: { width: 30, alignItems: "center" },
  colTeam: { flex: 1, minWidth: 140, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 },
  colStat: { width: 34, alignItems: "center" },
  colStatPts: { width: 40, alignItems: "center" },
  
  rankBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  rankBadgeTop: { backgroundColor: "#0F172A" },
  rankText: { fontSize: 11, fontWeight: "800", color: "#64748B" },
  rankTextTop: { color: "#FFFFFF" },
  
  // Logos
  logoWrapper: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", marginRight: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logo: { width: "100%", height: "100%" },
  initials: { fontSize: 10, fontWeight: "800", color: "#94A3B8" },
  
  teamText: { color: "#0F172A", fontSize: 14, fontWeight: "700", flexShrink: 1 },
  statText: { color: "#334155", fontSize: 13, fontWeight: "700" },
  statTextSecondary: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  ptsText: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
});