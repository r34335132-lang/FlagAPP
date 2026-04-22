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
const FadeInView = ({ children, delay = 0, style }: { children: any, delay?: number, style?: any }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay, useNativeDriver: true, easing: Easing.out(Easing.exp) })
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"resumen" | "roster">("resumen");

  // 🔥 Medidas dinámicas
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const HERO_HEIGHT = height * 0.50; // El Hero ocupa el 50% de la pantalla

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";

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

  if (teamLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: currentColors.bg }]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: currentColors.bg }]}>
        <Ionicons name="alert-circle-outline" size={54} color={currentColors.textMuted} />
        <Text style={[styles.errorText, { color: currentColors.text }]}>Equipo no encontrado</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 25, padding: 10 }}>
          <Text style={{ color: BRAND_GRADIENT[0], fontWeight: '800', fontSize: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const handleCoachPress = () => {
    if (team.coach_id) {
      router.push(`/coach/${team.coach_id}`);
    } else {
      Alert.alert("Perfil no disponible", "Este equipo no tiene un Coach vinculado.");
    }
  };

  // Gradiente de desvanecimiento hacia el color de fondo de la app
  const fadeGradient = isDark 
    ? ['transparent', 'rgba(15,23,42,0.4)', 'rgba(15,23,42,0.9)', currentColors.bg]
    : ['transparent', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.9)', currentColors.bg];

  const winPercentage = teamStat && teamStat.games_played > 0 
    ? Math.round((teamStat.games_won / teamStat.games_played) * 100) 
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      
      {/* BOTÓN FLOTANTE DE REGRESO */}
      <View style={[styles.floatingHeader, { top: insets.top + 10 }, isTablet && styles.floatingHeaderTablet]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.9 : 1 }] }]}>
          <BlurView intensity={80} tint="dark" style={styles.floatingBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </BlurView>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        
        {/* ── HERO POSTER HEADER ── */}
        <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
          
          {/* Fondo Vibrante del Equipo */}
          <LinearGradient colors={[color1, color2]} start={{x:0, y:0}} end={{x:1, y:1}} style={StyleSheet.absoluteFillObject} />
          
          {/* Marca de Agua Gigante del Logo */}
          {team.logo_url && (
            <Image 
              source={{ uri: team.logo_url }} 
              style={[StyleSheet.absoluteFillObject, styles.heroWatermark]} 
              resizeMode="cover" 
            />
          )}

          {/* Difuminado hacia el fondo */}
          <LinearGradient colors={fadeGradient} style={StyleSheet.absoluteFillObject} />

          <View style={styles.heroContent}>
            <FadeInView delay={100} style={styles.heroInfoWrap}>
              
              <View style={styles.logoRing}>
                <View style={[styles.logoInner, { backgroundColor: currentColors.card }]}>
                  <TeamLogo logoUrl={team.logo_url} size={100} />
                </View>
              </View>

              {team.category && (
                <View style={[styles.catBadge, { backgroundColor: color1 }]}>
                  <Text style={styles.catBadgeText}>{team.category.replace("-", " ").toUpperCase()}</Text>
                </View>
              )}
              
              <Text style={styles.teamName} numberOfLines={2}>{team.name}</Text>
            </FadeInView>

            {/* ── ESTADÍSTICAS GLASSMORPHISM ── */}
            {teamStat && (
              <FadeInView delay={200}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.glassStatsScroll}>
                  
                  {/* Puntos Liga */}
                  <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={[styles.glassStatCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }]}>
                    <View style={[styles.glassIconWrap, { backgroundColor: `${color1}20` }]}>
                      <Ionicons name="shield-checkmark" size={18} color={color1} />
                    </View>
                    <Text style={[styles.glassStatValue, { color: isDark ? '#FFF' : '#1E293B' }]}>{teamStat.points}</Text>
                    <Text style={[styles.glassStatLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#64748B' }]}>Pts Liga</Text>
                  </BlurView>

                  {/* Efectividad */}
                  <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={[styles.glassStatCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }]}>
                    <View style={[styles.glassIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="analytics" size={18} color="#10B981" />
                    </View>
                    <Text style={[styles.glassStatValue, { color: isDark ? '#FFF' : '#1E293B' }]}>{winPercentage}%</Text>
                    <Text style={[styles.glassStatLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#64748B' }]}>Efectividad</Text>
                  </BlurView>

                  {/* Partidos */}
                  <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={[styles.glassStatCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }]}>
                    <View style={[styles.glassIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                      <Ionicons name="american-football" size={18} color="#3B82F6" />
                    </View>
                    <Text style={[styles.glassStatValue, { color: isDark ? '#FFF' : '#1E293B' }]}>{teamStat.games_played}</Text>
                    <Text style={[styles.glassStatLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#64748B' }]}>Jugados</Text>
                  </BlurView>

                  {/* Diferencia Puntos */}
                  <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={[styles.glassStatCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }]}>
                    <View style={[styles.glassIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Ionicons name="swap-vertical" size={18} color="#F59E0B" />
                    </View>
                    <Text style={[styles.glassStatValue, { color: isDark ? '#FFF' : '#1E293B' }]}>{teamStat.points_for - teamStat.points_against}</Text>
                    <Text style={[styles.glassStatLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#64748B' }]}>Dif. Puntos</Text>
                  </BlurView>

                </ScrollView>
              </FadeInView>
            )}
          </View>
        </View>

        {/* ── TABS MODERNOS (PÍLDORAS) ── */}
        <View style={styles.contentWrapper}>
          <View style={styles.modernTabsContainer}>
            <Pressable 
              style={[styles.modernTab, activeTab === "resumen" && { backgroundColor: currentColors.card, shadowColor: isDark ? '#000' : '#475569', elevation: 2 }]} 
              onPress={() => setActiveTab("resumen")}
            >
              <Text style={[styles.modernTabText, { color: currentColors.textSecondary }, activeTab === "resumen" && [styles.modernTabTextActive, { color: color1 }]]}>Resumen</Text>
            </Pressable>
            <Pressable 
              style={[styles.modernTab, activeTab === "roster" && { backgroundColor: currentColors.card, shadowColor: isDark ? '#000' : '#475569', elevation: 2 }]} 
              onPress={() => setActiveTab("roster")}
            >
              <Text style={[styles.modernTabText, { color: currentColors.textSecondary }, activeTab === "roster" && [styles.modernTabTextActive, { color: color1 }]]}>Plantilla ({roster?.length || 0})</Text>
            </Pressable>
          </View>
        </View>

        {/* ── CONTENIDO INFERIOR ── */}
        <View style={[styles.body, styles.contentWrapper]}>

          {activeTab === "resumen" && (
            <FadeInView>
              {/* Desglose de Victorias */}
              {teamStat && (
                <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#cbd5e1' }]}>
                  <Text style={[styles.cardTitle, { color: currentColors.text }]}>Historial de Temporada</Text>
                  <View style={styles.statsGridRow}>
                    <View style={styles.statGridBox}>
                      <Text style={[styles.statGridValue, { color: "#10B981" }]}>{teamStat.games_won}</Text>
                      <Text style={[styles.statGridLabel, { color: currentColors.textSecondary }]}>GANADOS</Text>
                    </View>
                    <View style={[styles.statGridDivider, { backgroundColor: currentColors.borderLight }]} />
                    <View style={styles.statGridBox}>
                      <Text style={[styles.statGridValue, { color: "#F59E0B" }]}>{teamStat.games_tied}</Text>
                      <Text style={[styles.statGridLabel, { color: currentColors.textSecondary }]}>EMPATES</Text>
                    </View>
                    <View style={[styles.statGridDivider, { backgroundColor: currentColors.borderLight }]} />
                    <View style={styles.statGridBox}>
                      <Text style={[styles.statGridValue, { color: "#EF4444" }]}>{teamStat.games_lost}</Text>
                      <Text style={[styles.statGridLabel, { color: currentColors.textSecondary }]}>PERDIDOS</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Directiva */}
              {(team.coach_name || team.captain_name) && (
                <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#cbd5e1' }]}>
                  <Text style={[styles.cardTitle, { color: currentColors.text }]}>Directiva</Text>
                  
                  {team.coach_name && (
                    <Pressable 
                      style={({ pressed }) => [styles.directiveCard, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }, pressed && { transform: [{ scale: 0.98 }] }]} 
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
                      <View style={[styles.directiveAvatar, { backgroundColor: isDark ? '#78350F' : "#FEF3C7" }]}>
                        <Ionicons name="star" size={22} color={isDark ? '#FDE68A' : "#F59E0B"} />
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
                  <Text style={[styles.sectionTitle, { color: currentColors.text, marginLeft: 16 }]}>Partidos Recientes</Text>
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
                  <Skeleton key={i} width="100%" height={80} borderRadius={24} style={{ marginBottom: 12 }} />
                ))
              ) : roster?.length === 0 ? (
                <FadeInView>
                  <View style={[styles.emptyStateCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}>
                    <Ionicons name="people-outline" size={54} color={currentColors.textMuted} style={{ marginBottom: 16 }} />
                    <Text style={[styles.emptyTitle, { color: currentColors.text }]}>Plantilla Vacía</Text>
                    <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>Este equipo aún no tiene jugadores en su roster oficial.</Text>
                  </View>
                </FadeInView>
              ) : (
                roster?.map((player, index) => {
                   const hasPhoto = player.photo_url && !player.photo_url.startsWith('blob:');
                   return (
                    <FadeInView key={player.id} delay={index * 80}>
                      <Pressable 
                        onPress={() => router.push({ pathname: "/player/[id]", params: { id: player.id } })}
                        style={({ pressed }) => [
                          styles.playerCard, 
                          { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#cbd5e1' },
                          pressed && { transform: [{ scale: 0.98 }] }
                        ]}
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
                        
                        {player.jersey_number != null ? (
                          <View style={[styles.jerseyWrap, { backgroundColor: `${color1}15`, borderColor: `${color1}30` }]}>
                            <Text style={[styles.jerseyNumber, { color: color1 }]}>{player.jersey_number}</Text>
                          </View>
                        ) : (
                          <Ionicons name="chevron-forward" size={20} color={currentColors.borderLight} />
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
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  contentWrapper: { width: "100%", maxWidth: 800, alignSelf: "center" },
  errorText: { marginTop: 15, fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },

  // --- BOTÓN FLOTANTE ---
  floatingHeader: { position: 'absolute', left: 24, zIndex: 999 },
  floatingHeaderTablet: { width: 800, alignSelf: 'center', left: 'auto' }, 
  floatingBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  // --- HERO HEADER ---
  heroContainer: { width: '100%', position: 'relative', justifyContent: 'flex-end' },
  heroWatermark: { opacity: 0.2, transform: [{ scale: 1.5 }], top: -50 }, // Logo gigante de fondo
  heroContent: { paddingHorizontal: 24, paddingBottom: 20 },
  heroInfoWrap: { alignItems: 'center', marginBottom: 20 },
  
  logoRing: { borderRadius: 60, padding: 6, backgroundColor: "rgba(255,255,255,0.15)", marginBottom: 12 },
  logoInner: { borderRadius: 56, overflow: "hidden", padding: 8, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
  
  catBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  catBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  
  teamName: { color: '#FFFFFF', fontSize: 38, fontWeight: '900', letterSpacing: -1, textAlign: 'center', lineHeight: 42, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },

  // --- GLASS STATS ---
  glassStatsScroll: { paddingRight: 24, gap: 12 },
  glassStatCard: { width: 110, padding: 16, borderRadius: 24, borderWidth: 1, overflow: 'hidden', alignItems: 'center' },
  glassIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  glassStatValue: { fontSize: 24, fontWeight: '900', letterSpacing: -1, marginBottom: 2 },
  glassStatLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  // --- TABS MODERNOS ---
  modernTabsContainer: { flexDirection: 'row', backgroundColor: 'rgba(150,150,150,0.1)', marginHorizontal: 24, borderRadius: 20, padding: 4, marginTop: 15 },
  modernTab: { flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center' },
  modernTabText: { fontSize: 14, fontWeight: '700' },
  modernTabTextActive: { fontWeight: '900' },

  // --- CONTENIDO INFERIOR ---
  body: { paddingHorizontal: 24, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "900", marginBottom: 16, letterSpacing: -0.5 },
  
  card: { borderRadius: 28, padding: 24, borderWidth: 1, elevation: 4, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, marginBottom: 25 },
  cardTitle: { fontSize: 18, fontWeight: "900", marginBottom: 20, letterSpacing: -0.5 },

  // Stats Grid Simple
  statsGridRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statGridBox: { flex: 1, alignItems: 'center' },
  statGridDivider: { width: 1, height: 40 },
  statGridValue: { fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 4 },
  statGridLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Directiva
  directiveCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1 },
  directiveAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center", marginRight: 16, overflow: "hidden" },
  directiveImg: { width: "100%", height: "100%" },
  directiveInfo: { flex: 1 },
  directiveLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginBottom: 3, letterSpacing: 0.5 },
  directiveName: { fontSize: 17, fontWeight: "900" },

  matchesSection: { gap: 0, marginTop: 10 },

  // Roster
  rosterContainer: { gap: 12 },
  playerCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 24, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  playerAvatarWrap: { position: "relative", marginRight: 16 },
  playerAvatar: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  playerAvatarFallback: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  playerActiveDot: { position: "absolute", bottom: 0, right: 0, width: 16, height: 16, backgroundColor: "#10B981", borderRadius: 8, borderWidth: 2 },
  playerInfo: { flex: 1, justifyContent: "center" },
  playerName: { fontSize: 17, fontWeight: "900", marginBottom: 3, letterSpacing: -0.3 },
  playerPosition: { fontSize: 12, fontWeight: "700", textTransform: 'uppercase', letterSpacing: 0.5 },
  jerseyWrap: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  jerseyNumber: { fontSize: 18, fontWeight: "900" },

  // Empty State Premium
  emptyStateCard: { alignItems: "center", justifyContent: "center", paddingVertical: 60, borderRadius: 32, borderWidth: 2, borderStyle: "dashed" },
  emptyTitle: { fontSize: 18, fontWeight: "900", marginBottom: 8, textAlign: "center", letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 30, lineHeight: 22 },
});