import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Image } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTeam, useTeamRoster } from "@/hooks/useTeams";
import { useMatches } from "@/hooks/useMatches";
import { useStats } from "@/hooks/useStats";
import { TeamLogo } from "@/components/TeamLogo";
import { MatchCardLight } from "@/components/MatchCardLight";
import { Skeleton } from "@/components/SkeletonLoader";
import { BRAND_GRADIENT } from "@/constants/colors";

function StatBox({ value, label, color, accent }: { value: string | number; label: string; color?: string; accent?: boolean; }) {
  return (
    <View style={[detailS.statBox, accent && detailS.statBoxAccent]}>
      <Text style={[detailS.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={detailS.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, iconColor }: { icon: any; label: string; value: string; iconColor?: string; }) {
  return (
    <View style={detailS.infoRow}>
      <View style={[detailS.infoIconWrap, { backgroundColor: (iconColor ?? "#3B82F6") + "15" }]}>
        <Feather name={icon} size={15} color={iconColor ?? "#3B82F6"} />
      </View>
      <View style={detailS.infoText}>
        <Text style={detailS.infoLabel}>{label}</Text>
        <Text style={detailS.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"resumen" | "roster">("resumen");

  const { data: team, isLoading: teamLoading } = useTeam(id);
  const { data: roster, isLoading: rosterLoading } = useTeamRoster(id);
  const { data: games } = useMatches();
  const { data: stats } = useStats();

  const color1 = team?.color1 || BRAND_GRADIENT[0];
  const color2 = team?.color2 || BRAND_GRADIENT[1];

  const teamGames = games?.filter(
    (g) => g.home_team?.toLowerCase() === team?.name?.toLowerCase() || g.away_team?.toLowerCase() === team?.name?.toLowerCase()
  ) ?? [];

  const teamStat = stats?.find((s) => s.team_name?.toLowerCase() === team?.name?.toLowerCase());
  const topPad = insets.top + (Platform.OS === "web" ? 20 : 0);

  if (teamLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <Skeleton width="60%" height={24} borderRadius={6} style={{ margin: 20 }} />
        <Skeleton width="100%" height={240} borderRadius={0} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
        <Text style={styles.errorText}>Equipo no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Gradient Header ── */}
        <LinearGradient
          colors={[color1, color2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: topPad + 20 }]}
        >
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: topPad + 12 }]}>
            <View style={styles.backBtnInner}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </View>
          </Pressable>

          <View style={styles.headerContent}>
            <View style={styles.logoRing}>
              <View style={styles.logoInner}>
                <TeamLogo logoUrl={team.logo_url} size={90} />
              </View>
            </View>

            <Text style={styles.teamName}>{team.name}</Text>

            <View style={styles.badgeRow}>
              {team.category && (
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{team.category}</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* ── Custom Tabs ── */}
        <View style={styles.tabsContainer}>
          <Pressable style={styles.tab} onPress={() => setActiveTab("resumen")}>
            <Text style={[styles.tabText, activeTab === "resumen" && styles.activeTabText]}>Resumen</Text>
            {activeTab === "resumen" && <View style={[styles.activeIndicator, { backgroundColor: color1 }]} />}
          </Pressable>
          <Pressable style={styles.tab} onPress={() => setActiveTab("roster")}>
            <Text style={[styles.tabText, activeTab === "roster" && styles.activeTabText]}>Plantilla</Text>
            {activeTab === "roster" && <View style={[styles.activeIndicator, { backgroundColor: color1 }]} />}
          </Pressable>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>

          {activeTab === "resumen" && (
            <>
              {teamStat && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Estadísticas Temporada</Text>
                  <View style={styles.statsGrid}>
                    <StatBox value={teamStat.points} label="PUNTOS" color={color1} accent />
                    <StatBox value={teamStat.games_played} label="JUGADOS" />
                    <StatBox value={teamStat.games_won} label="GANADOS" color="#10B981" />
                    <StatBox value={teamStat.games_tied} label="EMPATES" color="#F59E0B" />
                    <StatBox value={teamStat.games_lost} label="PERDIDOS" color="#EF4444" />
                    {teamStat.points_for != null && <StatBox value={teamStat.points_for} label="PTS FAV" />}
                  </View>

                  {/* ── BARRA DE EFECTIVIDAD REGRESA AQUÍ ── */}
                  {teamStat.games_played > 0 && (
                    <View style={styles.winBarContainer}>
                      <View style={styles.winBarLabels}>
                        <Text style={styles.winBarLabel}>Efectividad de Victorias</Text>
                        <Text style={styles.winBarPct}>
                          {Math.round((teamStat.games_won / teamStat.games_played) * 100)}%
                        </Text>
                      </View>
                      <View style={styles.winBarTrack}>
                        <LinearGradient
                          colors={[color1, color2]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.winBarFill,
                            { width: `${Math.round((teamStat.games_won / teamStat.games_played) * 100)}%` }
                          ]}
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}

              {(team.coach_name || team.captain_name) && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Directiva</Text>
                  <View style={styles.infoList}>
                    {team.coach_name && <InfoRow icon="user" label="Entrenador" value={team.coach_name} iconColor={color1} />}
                    {team.captain_name && <InfoRow icon="star" label="Capitán" value={team.captain_name} iconColor="#Eab308" />}
                  </View>
                </View>
              )}

              {teamGames.length > 0 && (
                <View style={styles.matchesSection}>
                  <Text style={[styles.cardTitle, { paddingHorizontal: 16 }]}>Partidos Recientes</Text>
                  {teamGames.slice(0, 5).map((game) => (
                    <MatchCardLight key={game.id} game={game} teams={[team]} />
                  ))}
                </View>
              )}
            </>
          )}

          {activeTab === "roster" && (
            <View style={styles.rosterContainer}>
              {rosterLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} width="100%" height={80} borderRadius={18} style={{ marginBottom: 10 }} />
                ))
              ) : roster?.length === 0 ? (
                <View style={styles.emptyRoster}>
                  <Ionicons name="people-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>Plantilla Vacía</Text>
                  <Text style={styles.emptySubtitle}>Aún no hay jugadores registrados.</Text>
                </View>
              ) : (
                roster?.map((player) => (
                  <View key={player.id} style={styles.playerCard}>
                    <View style={styles.playerAvatarWrap}>
                      {player.photo_url ? (
                        <Image source={{ uri: player.photo_url }} style={styles.playerAvatar} />
                      ) : (
                        <View style={[styles.playerAvatar, styles.playerAvatarFallback]}>
                          <Ionicons name="person" size={24} color="#94A3B8" />
                        </View>
                      )}
                      {player.status === "active" && <View style={styles.playerActiveDot} />}
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
                      <Text style={styles.playerPosition}>{player.position || "Jugador"}</Text>
                    </View>
                    {player.jersey_number != null && (
                      <View style={[styles.jerseyWrap, { backgroundColor: color1 + "15", borderColor: color1 + "30" }]}>
                        <Text style={[styles.jerseyNumber, { color: color1 }]}>{player.jersey_number}</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const detailS = StyleSheet.create({
  statBox: { flex: 1, minWidth: "28%", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, gap: 4, borderWidth: 1, borderColor: "#E2E8F0" },
  statBoxAccent: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  statValue: { color: "#0F172A", fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  statLabel: { color: "#64748B", fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  infoIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1 },
  infoLabel: { color: "#64748B", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { color: "#0F172A", fontSize: 15, fontWeight: "700", marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { color: "#0F172A", fontSize: 18, fontWeight: "700" },

  header: { paddingBottom: 30, paddingHorizontal: 20, minHeight: 250, position: "relative", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { position: "absolute", left: 16, zIndex: 10 },
  backBtnInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  headerContent: { alignItems: "center", gap: 14, paddingTop: 10 },
  logoRing: { borderRadius: 60, padding: 4, backgroundColor: "rgba(255,255,255,0.2)" },
  logoInner: { borderRadius: 56, overflow: "hidden", backgroundColor: "#FFFFFF", padding: 5 },
  teamName: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", textAlign: "center", letterSpacing: -0.5 },
  badgeRow: { flexDirection: "row", gap: 8 },
  catBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  catBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  tabsContainer: { flexDirection: "row", paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", marginTop: 10 },
  tab: { flex: 1, paddingVertical: 16, alignItems: "center", position: "relative" },
  tabText: { color: "#64748B", fontSize: 15, fontWeight: "700" },
  activeTabText: { color: "#0F172A", fontWeight: "800" },
  activeIndicator: { position: "absolute", bottom: -1, width: "50%", height: 3, borderRadius: 3 },

  body: { paddingVertical: 20, gap: 20 },
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 16, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardTitle: { color: "#0F172A", fontSize: 18, fontWeight: "900", marginBottom: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  
  // Estilos de la Barra de Efectividad
  winBarContainer: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  winBarLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-end" },
  winBarLabel: { color: "#64748B", fontSize: 13, fontWeight: "700" },
  winBarPct: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  winBarTrack: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 4, overflow: "hidden" },
  winBarFill: { height: "100%", borderRadius: 4 },

  infoList: { gap: 6 },
  matchesSection: { gap: 0 },

  rosterContainer: { paddingHorizontal: 16, gap: 12 },
  playerCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 12, borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  playerAvatarWrap: { position: "relative", marginRight: 14 },
  playerAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#F1F5F9" },
  playerAvatarFallback: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  playerActiveDot: { position: "absolute", bottom: 0, right: 0, width: 14, height: 14, backgroundColor: "#10B981", borderRadius: 7, borderWidth: 2, borderColor: "#FFFFFF" },
  playerInfo: { flex: 1, justifyContent: "center" },
  playerName: { color: "#0F172A", fontSize: 16, fontWeight: "800", marginBottom: 2 },
  playerPosition: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  jerseyWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  jerseyNumber: { fontSize: 18, fontWeight: "900" },

  emptyRoster: { alignItems: "center", paddingVertical: 50, backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 2, borderStyle: "dashed", borderColor: "#E2E8F0" },
  emptyTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800", marginTop: 12 },
  emptySubtitle: { color: "#64748B", fontSize: 14, marginTop: 4 },
});