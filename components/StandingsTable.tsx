import React from "react";
import { View, Text, StyleSheet, Image, ScrollView, useColorScheme } from "react-native";
import { Colors } from "@/constants/colors"; // <-- Importamos nuestra paleta dinámica

export function StandingsTable({ stats, teams, limit }: { stats: any[]; teams?: any[]; limit?: number }) {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

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
      <View style={[styles.container, { backgroundColor: currentColors.card }]}>
        
        {/* ── Cabecera de la tabla ── */}
        <View style={[styles.headerRow, { backgroundColor: currentColors.bgSecondary, borderBottomColor: currentColors.border }]}>
          <View style={styles.colRank}><Text style={[styles.headerText, { color: currentColors.textMuted }]}>#</Text></View>
          <View style={styles.colTeam}><Text style={[styles.headerText, { color: currentColors.textMuted }]}>EQUIPO</Text></View>
          <View style={styles.colStat}><Text style={[styles.headerText, { color: currentColors.textMuted }]}>PJ</Text></View>
          <View style={styles.colStat}><Text style={[styles.headerText, { color: currentColors.textMuted }]}>G</Text></View>
          <View style={styles.colStat}><Text style={[styles.headerText, { color: currentColors.textMuted }]}>P</Text></View>
          <View style={styles.colStat}><Text style={[styles.headerText, { color: currentColors.textMuted }]}>PF</Text></View>
          <View style={styles.colStat}><Text style={[styles.headerText, { color: currentColors.textMuted }]}>PC</Text></View>
          <View style={styles.colStat}><Text style={[styles.headerText, { color: currentColors.textMuted }]}>DIF</Text></View>
          <View style={styles.colStatPts}><Text style={[styles.headerText, { color: currentColors.text }]}>PTS</Text></View>
        </View>

        {/* ── Filas de equipos ── */}
        {displayStats.map((team, index) => {
          const isTop3 = index < 3; 
          const diff = (team.points_for || 0) - (team.points_against || 0);
          
          // Buscar el logo en la lista de equipos
          const teamInfo = teams?.find(t => t.name === team.team_name);
          const hasLogo = teamInfo?.logo_url && !teamInfo.logo_url.startsWith('blob:');

          return (
            <View 
              key={team.id || index} 
              style={[
                styles.row, 
                { borderBottomColor: currentColors.borderLight },
                index === displayStats.length - 1 && styles.lastRow
              ]}
            >
              <View style={styles.colRank}>
                <View style={[
                  styles.rankBadge, 
                  { backgroundColor: currentColors.bgSecondary },
                  isTop3 && [styles.rankBadgeTop, { backgroundColor: currentColors.text }]
                ]}>
                  <Text style={[
                    styles.rankText, 
                    { color: currentColors.textSecondary },
                    isTop3 && [styles.rankTextTop, { color: currentColors.bg }]
                  ]}>{index + 1}</Text>
                </View>
              </View>

              <View style={styles.colTeam}>
                <View style={[styles.logoWrapper, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border }]}>
                  {hasLogo ? (
                    <Image source={{ uri: teamInfo.logo_url }} style={styles.logo} resizeMode="contain" />
                  ) : (
                    <Text style={[styles.initials, { color: currentColors.textMuted }]}>
                      {team.team_name?.substring(0, 2).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={[styles.teamText, { color: currentColors.text }]} numberOfLines={1}>{team.team_name}</Text>
              </View>

              <View style={styles.colStat}><Text style={[styles.statText, { color: currentColors.textSecondary }]}>{team.games_played}</Text></View>
              <View style={styles.colStat}><Text style={[styles.statText, { color: "#10B981" }]}>{team.games_won}</Text></View>
              <View style={styles.colStat}><Text style={[styles.statText, { color: "#EF4444" }]}>{team.games_lost}</Text></View>
              
              {/* Nuevas Columnas */}
              <View style={styles.colStat}><Text style={[styles.statTextSecondary, { color: currentColors.textMuted }]}>{team.points_for || 0}</Text></View>
              <View style={styles.colStat}><Text style={[styles.statTextSecondary, { color: currentColors.textMuted }]}>{team.points_against || 0}</Text></View>
              <View style={styles.colStat}>
                <Text style={[
                  styles.statText, 
                  { color: currentColors.textSecondary }, // Color neutro para diferencia 0
                  diff > 0 ? { color: "#10B981" } : diff < 0 ? { color: "#EF4444" } : {}
                ]}>
                  {diff > 0 ? `+${diff}` : diff}
                </Text>
              </View>

              <View style={styles.colStatPts}><Text style={[styles.ptsText, { color: currentColors.text }]}>{team.points}</Text></View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// Retiramos colores estáticos del StyleSheet
const styles = StyleSheet.create({
  scrollWrapper: {
    width: "100%",
  },
  container: {
    minWidth: "100%", // Asegura que tome todo el ancho, pero permite scroll si es muy pequeña la pantalla
  },
  headerRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  lastRow: { borderBottomWidth: 0 },
  
  // Anchuras de columnas
  colRank: { width: 30, alignItems: "center" },
  colTeam: { flex: 1, minWidth: 140, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 },
  colStat: { width: 34, alignItems: "center" },
  colStatPts: { width: 40, alignItems: "center" },
  
  rankBadge: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  rankBadgeTop: {},
  rankText: { fontSize: 11, fontWeight: "800" },
  rankTextTop: {},
  
  // Logos
  logoWrapper: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, marginRight: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logo: { width: "100%", height: "100%" },
  initials: { fontSize: 10, fontWeight: "800" },
  
  teamText: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  statText: { fontSize: 13, fontWeight: "700" },
  statTextSecondary: { fontSize: 12, fontWeight: "600" },
  ptsText: { fontSize: 14, fontWeight: "900" },
});