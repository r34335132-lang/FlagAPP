import React, { useState, useEffect, useRef } from "react";
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
  useColorScheme,
  useWindowDimensions,
  Animated,
  Easing
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTeam, useTeamRoster } from "@/hooks/useTeams";
import { useMatches } from "@/hooks/useMatches";
import { useStats } from "@/hooks/useStats";
import { TeamLogo } from "@/components/TeamLogo";
import { MatchCardLight } from "@/components/MatchCardLight";
import { Skeleton } from "@/components/SkeletonLoader";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";

// ─────────────────────────────────────────────────────────────────────────────
// ANIMACIONES BASE
// ─────────────────────────────────────────────────────────────────────────────
const FadeInView = ({ children, delay = 0 }: { children: any, delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) })
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES DE UI
// ─────────────────────────────────────────────────────────────────────────────
function StatBox({ value, label, color, accent, currentColors }: any) {
  return (
    <View style={[
      detailS.statBox, 
      { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight },
      accent && { backgroundColor: color + "15", borderColor: color + "30" }
    ]}>
      <Text style={[detailS.statValue, { color: color || currentColors.text }]}>{value}</Text>
      <Text style={[detailS.statLabel, { color: currentColors.textMuted }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"resumen" | "roster">("resumen");

  // 🔥 Medidas dinámicas para Tablets
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

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
      <View style={[styles.container, { paddingTop: topPad, backgroundColor: currentColors.bg }]}>
        <View style={styles.contentWrapper}>
          <Skeleton width="60%" height={24} borderRadius={6} style={{ margin: 20 }} />
          <Skeleton width="100%" height={240} borderRadius={24} />
        </View>
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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        
        {/* ── Header Gradient ── */}
        <LinearGradient
          colors={[color1, color2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: topPad + 20 }]}
        >
          <View style={styles.contentWrapper}>
            {/* Botón flotante estilo cristal */}
            <Pressable onPress={handleBack} style={[styles.backBtn, { top: topPad + 12 }]}>
              <BlurView intensity={80} tint="dark" style={styles.backBtnInner}>
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </BlurView>
            </Pressable>

            <View style={styles.headerContent}>
              <View style={styles.logoRing}>
                <View style={[styles.logoInner, { backgroundColor: currentColors.card }]}>
                  <TeamLogo logoUrl={team.logo_url} size={96} />
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
          </View>
        </LinearGradient>

        {/* ── Tabs (Limitado a tablets) ── */}
        <View style={styles.contentWrapper}>
          <View style={[styles.tabsContainer, { borderBottomColor: currentColors.border }]}>
            <Pressable style={styles.tab} onPress={() => setActiveTab("resumen")}>
              <Text style={[styles.tabText, { color: currentColors.textSecondary }, activeTab === "resumen" && [styles.activeTabText, { color: currentColors.text }]]}>Resumen</Text>
              {activeTab === "resumen" && <View style={[styles.activeIndicator, { backgroundColor: color1 }]} />}
            </Pressable>
            <Pressable style={styles.tab} onPress={() => setActiveTab("roster")}>
              <Text style={[styles.tabText, { color: currentColors.textSecondary }, activeTab === "roster" && [styles.activeTabText, { color: currentColors.text }]]}>Plantilla ({roster?.length || 0})</Text>
              {activeTab === "roster" && <View style={[styles.activeIndicator, { backgroundColor: color1 }]} />}
            </Pressable>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={[styles.body, styles.contentWrapper]}>

          {activeTab === "resumen" && (
            <FadeInView>
              {/* Estadísticas Temporada Bento Box */}
              {teamStat && (
                <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: theme === 'dark' ? '#000' : '#475569' }]}>
                  <Text style={[styles.cardTitle, { color: currentColors.text }]}>Rendimiento en Torneo</Text>
                  
                  <View style={styles.statsGrid}>
                    <StatBox currentColors={currentColors} value={teamStat.points} label="PUNTOS LIGA" color={color1} accent />
                    <StatBox currentColors={currentColors} value={teamStat.games_played} label="JUGADOS" />
                    <StatBox currentColors={currentColors} value={teamStat.games_won} label="GANADOS" color="#10B981" />
                    <StatBox currentColors={currentColors} value={teamStat.games_tied} label="EMPATES" color="#F59E0B" />
                    <StatBox currentColors={currentColors} value={teamStat.games_lost} label="PERDIDOS" color="#EF4444" />
                    {teamStat.points_for != null && <StatBox currentColors={currentColors} value={teamStat.points_for} label="PTS A FAVOR" />}
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
                <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: theme === 'dark' ? '#000' : '#475569' }]}>
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
            </FadeInView>
          )}

          {activeTab === "roster" && (
            <View style={styles.rosterContainer}>
              {rosterLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} width="100%" height={80} borderRadius={24} style={{ marginBottom: 10 }} />
                ))
              ) : roster?.length === 0 ? (
                <FadeInView>
                  <View style={[styles.emptyRoster, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}>
                    <View style={[styles.emptyIconWrap, { backgroundColor: currentColors.bgSecondary }]}>
                      <Ionicons name="people-outline" size={45} color={BRAND_GRADIENT[0]} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: currentColors.text }]}>Plantilla Vacía</Text>
                    <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>Este equipo aún no tiene jugadores en su roster oficial.</Text>
                  </View>
                </FadeInView>
              ) : (
                roster?.map((player, index) => {
                   const hasPhoto = player.photo_url && !player.photo_url.startsWith('blob:');
                   return (
                    <FadeInView key={player.id} delay={index * 100}>
                      <Pressable 
                        onPress={() => router.push({ pathname: "/player/[id]", params: { id: player.id } })}
                        style={[styles.playerCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: theme === 'dark' ? '#000' : '#475569' }]}
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
                    </FadeInView>
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

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS PREMIUM
// ─────────────────────────────────────────────────────────────────────────────
const detailS = StyleSheet.create({
  statBox: { flex: 1, minWidth: "28%", alignItems: "center", borderRadius: 20, paddingVertical: 18, paddingHorizontal: 8, gap: 6, borderWidth: 1 },
  statValue: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { width: "100%", maxWidth: 800, alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 18, fontWeight: "700" },
  
  // Header
  header: { paddingBottom: 40, paddingHorizontal: 0, minHeight: 280, position: "relative", borderBottomLeftRadius: 40, borderBottomRightRadius: 40, elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 15 },
  backBtn: { position: "absolute", left: 20, zIndex: 10 },
  backBtnInner: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: 'hidden' },
  headerContent: { alignItems: "center", gap: 16, paddingTop: 10 },
  logoRing: { borderRadius: 60, padding: 6, backgroundColor: "rgba(255,255,255,0.2)" },
  logoInner: { borderRadius: 56, overflow: "hidden", padding: 5 },
  teamName: { color: "#FFFFFF", fontSize: 32, fontWeight: "900", textAlign: "center", letterSpacing: -0.5, paddingHorizontal: 20 },
  badgeRow: { flexDirection: "row", gap: 8 },
  catBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  catBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  
  // Tabs
  tabsContainer: { flexDirection: "row", paddingHorizontal: 20, borderBottomWidth: 1, marginTop: 15 },
  tab: { flex: 1, paddingVertical: 18, alignItems: "center", position: "relative" },
  tabText: { fontSize: 15, fontWeight: "700" },
  activeTabText: { fontWeight: "900" },
  activeIndicator: { position: "absolute", bottom: -1, width: "60%", height: 4, borderRadius: 4, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  
  // Body
  body: { paddingVertical: 25, gap: 25 },
  card: { marginHorizontal: 16, borderRadius: 28, padding: 24, borderWidth: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 3 },
  cardTitle: { fontSize: 20, fontWeight: "900", marginBottom: 20, letterSpacing: -0.5 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  winBarContainer: { marginTop: 25, paddingTop: 20, borderTopWidth: 1 },
  winBarLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, alignItems: "flex-end" },
  winBarLabel: { fontSize: 13, fontWeight: "800", textTransform: 'uppercase' },
  winBarPct: { fontSize: 18, fontWeight: "900" },
  winBarTrack: { height: 10, borderRadius: 5, overflow: "hidden" },
  winBarFill: { height: "100%", borderRadius: 5 },

  // Directiva
  directiveCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 20, marginBottom: 12, borderWidth: 1 },
  directiveAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center", marginRight: 16, overflow: "hidden" },
  directiveImg: { width: "100%", height: "100%" },
  directiveInfo: { flex: 1 },
  directiveLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginBottom: 3, letterSpacing: 0.5 },
  directiveName: { fontSize: 17, fontWeight: "900" },

  matchesSection: { gap: 0, marginTop: 10 },
  
  // Roster
  rosterContainer: { paddingHorizontal: 16, gap: 14 },
  playerCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 24, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  playerAvatarWrap: { position: "relative", marginRight: 16 },
  playerAvatar: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  playerAvatarFallback: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  playerActiveDot: { position: "absolute", bottom: 0, right: 0, width: 16, height: 16, backgroundColor: "#10B981", borderRadius: 8, borderWidth: 2 },
  playerInfo: { flex: 1, justifyContent: "center" },
  playerName: { fontSize: 17, fontWeight: "900", marginBottom: 3, letterSpacing: -0.5 },
  playerPosition: { fontSize: 13, fontWeight: "700", textTransform: 'uppercase' },
  jerseyWrap: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  jerseyNumber: { fontSize: 20, fontWeight: "900" },
  
  // Empty State Premium
  emptyRoster: { alignItems: "center", paddingVertical: 50, borderRadius: 32, borderWidth: 2, borderStyle: "dashed" },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "900", marginTop: 8, letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
});