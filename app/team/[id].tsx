import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  Pressable, 
  Image, 
  ActivityIndicator, 
  Alert,
  useColorScheme 
} from "react-native";
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
import { BRAND_GRADIENT, Colors } from "@/constants/colors"; // <-- Paleta dinámica

// Componente hijo adaptado al modo oscuro
function StatBox({ value, label, color, accent, currentColors }: any) {
  return (
    <View style={[
      detailS.statBox, 
      { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border },
      accent && { backgroundColor: color + "15", borderColor: color + "30" }
    ]}>
      <Text style={[detailS.statValue, { color: color || currentColors.text }]}>{value}</Text>
      <Text style={[detailS.statLabel, { color: currentColors.textMuted }]}>{label}</Text>
    </View>
  );
}

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"resumen" | "roster">("resumen");

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  const { data: team, isLoading: teamLoading } = useTeam(id);
  const { data: roster, isLoading: rosterLoading } = useTeamRoster(id);
  const { data: games } = useMatches();
  const { data: stats } = useStats();

  // Mantenemos los colores del equipo para el gradiente
  const color1 = team?.color1 || BRAND_GRADIENT[0];
  const color2 = team?.color2 || BRAND_GRADIENT[1];

  const teamGames = games?.filter(
    (g) => g.home_team?.toLowerCase() === team?.name?.toLowerCase() || g.away_team?.toLowerCase() === team?.name?.toLowerCase()
  ) ?? [];

  const teamStat = stats?.find((s) => s.team_name?.toLowerCase() === team?.name?.toLowerCase());
  const topPad = insets.top + (Platform.OS === "web" ? 20 : 0);

  if (teamLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad, backgroundColor: currentColors.bg }]}>
        <Skeleton width="60%" height={24} borderRadius={6} style={{ margin: 20 }} />
        <Skeleton width="100%" height={240} borderRadius={0} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: currentColors.bg }]}>
        <Ionicons name="alert-circle-outline" size={48} color={currentColors.textMuted} />
        <Text style={[styles.errorText, { color: currentColors.text }]}>Equipo no encontrado</Text>
      </View>
    );
  }

  const handleCoachPress = () => {
    if (team.coach_id) {
      router.push(`/coach/${team.coach_id}`);
    } else {
      Alert.alert(
        "Perfil no disponible", 
        "Este equipo no tiene un Coach vinculado correctamente en la base de datos."
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
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
              <View style={[styles.logoInner, { backgroundColor: currentColors.card }]}>
                <TeamLogo logoUrl={team.logo_url} size={90} />
              </View>
            </View>
            <Text style={styles.teamName}>{team.name}</Text>
            <View style={styles.badgeRow}>
              {team.category && (
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{team.category.replace("-", " ").toUpperCase()}</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* ── Tabs ── */}
        <View style={[styles.tabsContainer, { borderBottomColor: currentColors.border }]}>
          <Pressable style={styles.tab} onPress={() => setActiveTab("resumen")}>
            <Text style={[styles.tabText, { color: currentColors.textSecondary }, activeTab === "resumen" && [styles.activeTabText, { color: currentColors.text }]]}>Resumen</Text>
            {activeTab === "resumen" && <View style={[styles.activeIndicator, { backgroundColor: color1 }]} />}
          </Pressable>
          <Pressable style={styles.tab} onPress={() => setActiveTab("roster")}>
            <Text style={[styles.tabText, { color: currentColors.textSecondary }, activeTab === "roster" && [styles.activeTabText, { color: currentColors.text }]]}>Plantilla</Text>
            {activeTab === "roster" && <View style={[styles.activeIndicator, { backgroundColor: color1 }]} />}
          </Pressable>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>

          {activeTab === "resumen" && (
            <>
              {teamStat && (
                <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                  <Text style={[styles.cardTitle, { color: currentColors.text }]}>Estadísticas Temporada</Text>
                  <View style={styles.statsGrid}>
                    <StatBox currentColors={currentColors} value={teamStat.points} label="PUNTOS" color={color1} accent />
                    <StatBox currentColors={currentColors} value={teamStat.games_played} label="JUGADOS" />
                    <StatBox currentColors={currentColors} value={teamStat.games_won} label="GANADOS" color="#10B981" />
                    <StatBox currentColors={currentColors} value={teamStat.games_tied} label="EMPATES" color="#F59E0B" />
                    <StatBox currentColors={currentColors} value={teamStat.games_lost} label="PERDIDOS" color="#EF4444" />
                    {teamStat.points_for != null && <StatBox currentColors={currentColors} value={teamStat.points_for} label="PTS FAV" />}
                  </View>

                  {teamStat.games_played > 0 && (
                    <View style={[styles.winBarContainer, { borderTopColor: currentColors.borderLight }]}>
                      <View style={styles.winBarLabels}>
                        <Text style={[styles.winBarLabel, { color: currentColors.textSecondary }]}>Efectividad de Victorias</Text>
                        <Text style={[styles.winBarPct, { color: currentColors.text }]}>
                          {Math.round((teamStat.games_won / teamStat.games_played) * 100)}%
                        </Text>
                      </View>
                      <View style={[styles.winBarTrack, { backgroundColor: currentColors.bgSecondary }]}>
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

              {/* ── DIRECTIVA ── */}
              {(team.coach_name || team.captain_name) && (
                <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                  <Text style={[styles.cardTitle, { color: currentColors.text }]}>Directiva</Text>
                  
                  {team.coach_name && (
                    <Pressable 
                      style={[styles.directiveCard, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]} 
                      onPress={handleCoachPress}
                    >
                      <View style={[styles.directiveAvatar, { backgroundColor: currentColors.border }]}>
                        {team.coach_photo_url ? (
                          <Image source={{ uri: team.coach_photo_url }} style={styles.directiveImg} resizeMode="cover" />
                        ) : (
                          <Ionicons name="person" size={24} color={currentColors.textMuted} />
                        )}
                      </View>
                      <View style={styles.directiveInfo}>
                        <Text style={[styles.directiveLabel, { color: currentColors.textMuted }]}>Head Coach</Text>
                        <Text style={[styles.directiveName, { color: currentColors.text }]}>{team.coach_name}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={team.coach_id ? color1 : currentColors.textMuted} />
                    </Pressable>
                  )}

                  {team.captain_name && (
                    <View style={[styles.directiveCard, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
                      <View style={[styles.directiveAvatar, { backgroundColor: theme === 'dark' ? '#78350F' : "#FEF3C7" }]}>
                        <Ionicons name="star" size={22} color={theme === 'dark' ? '#FDE68A' : "#F59E0B"} />
                      </View>
                      <View style={styles.directiveInfo}>
                        <Text style={[styles.directiveLabel, { color: currentColors.textMuted }]}>Capitán del Equipo</Text>
                        <Text style={[styles.directiveName, { color: currentColors.text }]}>{team.captain_name}</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {teamGames.length > 0 && (
                <View style={styles.matchesSection}>
                  <Text style={[styles.cardTitle, { paddingHorizontal: 16, color: currentColors.text }]}>Partidos Recientes</Text>
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
                <View style={[styles.emptyRoster, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                  <Ionicons name="people-outline" size={48} color={currentColors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: currentColors.text }]}>Plantilla Vacía</Text>
                  <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>Aún no hay jugadores registrados.</Text>
                </View>
              ) : (
                roster?.map((player) => {
                   const hasPhoto = player.photo_url && !player.photo_url.startsWith('blob:');
                   return (
                    <Pressable 
                      key={player.id} 
                      onPress={() => router.push({ pathname: "/player/[id]", params: { id: player.id } })}
                      style={[styles.playerCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
                    >
                      <View style={styles.playerAvatarWrap}>
                        {hasPhoto ? (
                          <Image source={{ uri: player.photo_url }} style={styles.playerAvatar} resizeMode="cover" />
                        ) : (
                          <View style={[styles.playerAvatar, styles.playerAvatarFallback, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
                            <Ionicons name="person" size={24} color={currentColors.textMuted} />
                          </View>
                        )}
                        {player.status === "active" && <View style={[styles.playerActiveDot, { borderColor: currentColors.card }]} />}
                      </View>
                      <View style={styles.playerInfo}>
                        <Text style={[styles.playerName, { color: currentColors.text }]} numberOfLines={1}>{player.name}</Text>
                        <Text style={[styles.playerPosition, { color: currentColors.textSecondary }]}>{player.position || "Jugador"}</Text>
                      </View>
                      {player.jersey_number != null && (
                        <View style={[styles.jerseyWrap, { backgroundColor: color1 + "15", borderColor: color1 + "30" }]}>
                          <Text style={[styles.jerseyNumber, { color: color1 }]}>{player.jersey_number}</Text>
                        </View>
                      )}
                    </Pressable>
                   )
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Retiramos colores fijos
const detailS = StyleSheet.create({
  statBox: { flex: 1, minWidth: "28%", alignItems: "center", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, gap: 4, borderWidth: 1 },
  statValue: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 18, fontWeight: "700" },
  header: { paddingBottom: 30, paddingHorizontal: 20, minHeight: 250, position: "relative", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { position: "absolute", left: 16, zIndex: 10 },
  backBtnInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  headerContent: { alignItems: "center", gap: 14, paddingTop: 10 },
  logoRing: { borderRadius: 60, padding: 4, backgroundColor: "rgba(255,255,255,0.2)" },
  logoInner: { borderRadius: 56, overflow: "hidden", padding: 5 },
  teamName: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", textAlign: "center", letterSpacing: -0.5 },
  badgeRow: { flexDirection: "row", gap: 8 },
  catBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  catBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  tabsContainer: { flexDirection: "row", paddingHorizontal: 20, borderBottomWidth: 1, marginTop: 10 },
  tab: { flex: 1, paddingVertical: 16, alignItems: "center", position: "relative" },
  tabText: { fontSize: 15, fontWeight: "700" },
  activeTabText: { fontWeight: "800" },
  activeIndicator: { position: "absolute", bottom: -1, width: "50%", height: 3, borderRadius: 3 },
  body: { paddingVertical: 20, gap: 20 },
  card: { marginHorizontal: 16, borderRadius: 24, padding: 20, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: "900", marginBottom: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  winBarContainer: { marginTop: 24, paddingTop: 16, borderTopWidth: 1 },
  winBarLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-end" },
  winBarLabel: { fontSize: 13, fontWeight: "700" },
  winBarPct: { fontSize: 16, fontWeight: "900" },
  winBarTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  winBarFill: { height: "100%", borderRadius: 4 },

  directiveCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
  directiveAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center", marginRight: 15, overflow: "hidden" },
  directiveImg: { width: "100%", height: "100%" },
  directiveInfo: { flex: 1 },
  directiveLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 },
  directiveName: { fontSize: 16, fontWeight: "800" },

  matchesSection: { gap: 0 },
  rosterContainer: { paddingHorizontal: 16, gap: 12 },
  playerCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 20, borderWidth: 1, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  playerAvatarWrap: { position: "relative", marginRight: 14 },
  playerAvatar: { width: 54, height: 54, borderRadius: 27, overflow: 'hidden' },
  playerAvatarFallback: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  playerActiveDot: { position: "absolute", bottom: 0, right: 0, width: 14, height: 14, backgroundColor: "#10B981", borderRadius: 7, borderWidth: 2 },
  playerInfo: { flex: 1, justifyContent: "center" },
  playerName: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  playerPosition: { fontSize: 12, fontWeight: "700" },
  jerseyWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  jerseyNumber: { fontSize: 18, fontWeight: "900" },
  emptyRoster: { alignItems: "center", paddingVertical: 50, borderRadius: 24, borderWidth: 2, borderStyle: "dashed" },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: 12 },
  emptySubtitle: { fontSize: 14, marginTop: 4 },
});