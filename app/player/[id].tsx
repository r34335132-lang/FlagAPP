import React, { useRef, useEffect, useState, useMemo } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  Pressable, 
  ActivityIndicator,
  useColorScheme,
  useWindowDimensions,
  Animated,
  Easing
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { supabase } from "@/lib/supabase"; 
import { usePlayer } from "@/hooks/useTeams"; 
import { BRAND_GRADIENT, Colors } from "@/constants/colors";

const LEAGUE_GRADIENT = ['#3B82F6', '#8B5CF6', '#EC4899']; // Azul -> Morado -> Rosa

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
export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const HERO_HEIGHT = height * 0.55; // El Hero ocupará el 55% de la pantalla

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";

  // Hook del jugador
  const { data: player, isLoading } = usePlayer(id);
  
  const [gameStats, setGameStats] = useState<any[]>([]);
  const [mvpCount, setMvpCount] = useState<number>(0);

  // CONSULTA DIRECTA A SUPABASE
  useEffect(() => {
    if (!id) return;
    
    const loadRealStats = async () => {
      try {
        const { data: statsData } = await supabase
          .from("player_game_stats")
          .select("touchdowns_totales, pases_completos, intercepciones, sacks")
          .eq("player_id", Number(id));
        
        if (statsData) setGameStats(statsData);

        const { count } = await supabase
          .from("mvps")
          .select("*", { count: 'exact', head: true })
          .eq("player_id", Number(id));
          
        if (count !== null) setMvpCount(count);

      } catch (error) {
        console.log("Error al cargar estadísticas directas:", error);
      }
    };

    loadRealStats();
  }, [id]);

  // SUMATORIA GLOBAL EXACTA
  const totals = useMemo(() => {
    return gameStats.reduce((acc, curr) => ({
      tds: acc.tds + (Number(curr.touchdowns_totales) || 0),
      passes: acc.passes + (Number(curr.pases_completos) || 0),
      ints: acc.ints + (Number(curr.intercepciones) || 0),
      sacks: acc.sacks + (Number(curr.sacks) || 0),
    }), { tds: 0, passes: 0, ints: 0, sacks: 0 });
  }, [gameStats]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: currentColors.bg }]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  if (!player) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: currentColors.bg }]}>
        <Ionicons name="person-remove" size={54} color={currentColors.textMuted} />
        <Text style={[styles.errorText, { color: currentColors.text }]}>Jugador no encontrado</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 25, padding: 10 }}>
          <Text style={{ color: BRAND_GRADIENT[0], fontWeight: '800', fontSize: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const playerTeams = Array.isArray(player.teams) ? player.teams : (player.teams ? [player.teams] : []);
  const primaryTeamColor = playerTeams[0]?.color1 || BRAND_GRADIENT[0];
  const hasPhoto = player.photo_url && !player.photo_url.startsWith('blob:');
  const gameHistory = player.gameHistory || [];
  const realAttendanceCount = player.attendance_count || 0;

  // Gradiente de desvanecimiento dependiendo del tema
  const fadeGradient = isDark 
    ? ['transparent', 'rgba(15,23,42,0.3)', 'rgba(15,23,42,0.8)', currentColors.bg]
    : ['transparent', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.8)', currentColors.bg];

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
        
        {/* --- HERO POSTER HEADER --- */}
        <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
          {hasPhoto ? (
            <Image source={{ uri: player.photo_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[primaryTeamColor, currentColors.bgSecondary]} style={StyleSheet.absoluteFillObject} />
          )}

          {/* Gradiente para oscurecer y mezclar con el fondo */}
          <LinearGradient colors={fadeGradient} style={StyleSheet.absoluteFillObject} />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)' }]} />

          <View style={styles.heroContent}>
            <FadeInView delay={100} style={styles.heroInfoWrap}>
              <View style={styles.heroTopBadges}>
                <View style={[styles.jerseyHeroBadge, { backgroundColor: primaryTeamColor }]}>
                  <Text style={styles.jerseyHeroText}>#{player.jersey_number || "00"}</Text>
                </View>
                {player.status === 'active' && (
                  <View style={styles.activeHeroBadge}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeHeroText}>ACTIVO</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.heroPosition}>{player.position || "JUGADOR"}</Text>
              <Text style={styles.heroName} numberOfLines={2}>{player.name}</Text>
            </FadeInView>

            {/* --- ESTADÍSTICAS GLASSMORPHISM SOBRE LA IMAGEN --- */}
            <FadeInView delay={200}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.glassStatsScroll}>
                
                {/* Touchdowns */}
                <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={[styles.glassStatCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }]}>
                  <View style={[styles.glassIconWrap, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }]}>
                    <Ionicons name="american-football" size={18} color="#3B82F6" />
                  </View>
                  <Text style={[styles.glassStatValue, { color: isDark ? '#FFF' : '#1E293B' }]}>{totals.tds}</Text>
                  <Text style={[styles.glassStatLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#64748B' }]}>Anotaciones</Text>
                </BlurView>

                {/* MVPs */}
                <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={[styles.glassStatCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }]}>
                  <View style={[styles.glassIconWrap, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)' }]}>
                    <Ionicons name="trophy" size={18} color="#F59E0B" />
                  </View>
                  <Text style={[styles.glassStatValue, { color: isDark ? '#FFF' : '#1E293B' }]}>{mvpCount}</Text>
                  <Text style={[styles.glassStatLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#64748B' }]}>Premios MVP</Text>
                </BlurView>

                {/* Pases */}
                <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={[styles.glassStatCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }]}>
                  <View style={[styles.glassIconWrap, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)' }]}>
                    <Ionicons name="send" size={18} color="#8B5CF6" />
                  </View>
                  <Text style={[styles.glassStatValue, { color: isDark ? '#FFF' : '#1E293B' }]}>{totals.passes}</Text>
                  <Text style={[styles.glassStatLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#64748B' }]}>Pases QB</Text>
                </BlurView>

                {/* Intercepciones (Agregadas de vuelta) */}
                <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={[styles.glassStatCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }]}>
                  <View style={[styles.glassIconWrap, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)' }]}>
                    <Ionicons name="magnet" size={18} color="#10B981" />
                  </View>
                  <Text style={[styles.glassStatValue, { color: isDark ? '#FFF' : '#1E293B' }]}>{totals.ints}</Text>
                  <Text style={[styles.glassStatLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#64748B' }]}>Intercepciones</Text>
                </BlurView>

                {/* Sacks */}
                <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={[styles.glassStatCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }]}>
                  <View style={[styles.glassIconWrap, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)' }]}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </View>
                  <Text style={[styles.glassStatValue, { color: isDark ? '#FFF' : '#1E293B' }]}>{totals.sacks}</Text>
                  <Text style={[styles.glassStatLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#64748B' }]}>Sacks</Text>
                </BlurView>

              </ScrollView>
            </FadeInView>
          </View>
        </View>

        {/* --- CONTENIDO INFERIOR --- */}
        <View style={[styles.body, styles.contentWrapper]}>
          
          <FadeInView delay={300}>
            {/* --- EQUIPOS --- */}
            {playerTeams.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Equipos Actuales</Text>
                {playerTeams.map((team: any, index: number) => (
                  <Pressable 
                    key={team.id || index}
                    style={({ pressed }) => [
                      styles.teamCard, 
                      { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#cbd5e1' },
                      pressed && { transform: [{ scale: 0.98 }] }
                    ]} 
                    onPress={() => router.push(`/team/${team.id}`)}
                  >
                    <View style={[styles.tinyTeamLogoWrapper, { backgroundColor: currentColors.bgSecondary }]}>
                      {team.logo_url ? (
                        <Image source={{ uri: team.logo_url }} style={styles.tinyTeamLogo} resizeMode="contain" />
                      ) : (
                        <Text style={[styles.fallbackTeamIcon, { color: currentColors.textMuted }]}>{team.name?.substring(0,2).toUpperCase()}</Text>
                      )}
                    </View>
                    
                    <View style={styles.teamInfo}>
                      <Text style={[styles.teamName, { color: currentColors.text }]} numberOfLines={1}>{team.name}</Text>
                      <Text style={[styles.teamCategory, { color: currentColors.textSecondary }]}>{team.category?.replace("-", " ").toUpperCase()}</Text>
                    </View>
                    
                    <Ionicons name="chevron-forward" size={20} color={currentColors.textMuted} />
                  </Pressable>
                ))}
              </>
            )}
          </FadeInView>

          <FadeInView delay={400}>
            {/* --- FICHA TÉCNICA --- */}
            <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 15 }]}>Ficha Técnica</Text>
            <View style={[styles.infoCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#cbd5e1' }]}>
              <InfoRow icon="calendar-outline" label="Asistencias Globales" value={`${realAttendanceCount} Partidos Jugados`} currentColors={currentColors} isDark={isDark} />
              <View style={[styles.divider, { backgroundColor: currentColors.borderLight }]} />
              <InfoRow icon="shield-checkmark-outline" label="Temporadas" value={`${player.seasons_played || 1} Temporadas en la Liga`} currentColors={currentColors} isDark={isDark} />
              <View style={[styles.divider, { backgroundColor: currentColors.borderLight }]} />
              <InfoRow icon="water-outline" label="Tipo de Sangre" value={player.blood_type || "No registrado"} currentColors={currentColors} isDark={isDark} />
            </View>
          </FadeInView>

          <FadeInView delay={500}>
            {/* --- HISTORIAL DE ASISTENCIA --- */}
            <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 15 }]}>Historial de Partidos</Text>
            {gameHistory.length > 0 ? (
              <View style={[styles.historyContainer, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#cbd5e1' }]}>
                {gameHistory.map((game: any, index: number) => {
                  const isLast = index === gameHistory.length - 1;
                  const isHome = playerTeams.some(t => t.name === game.home_team);
                  const rivalTeamName = isHome ? game.away_team : game.home_team;
                  const dateObj = new Date(game.game_date);
                  const prettyDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

                  return (
                    <View key={game.id} style={styles.historyRow}>
                      <View style={styles.historyTimeline}>
                        <View style={[styles.timelineDot, { backgroundColor: primaryTeamColor, borderColor: currentColors.card }]} />
                        {!isLast && <View style={[styles.timelineLine, { backgroundColor: currentColors.borderLight }]} />}
                      </View>
                      
                      <View style={[styles.historyContent, { borderBottomColor: isLast ? 'transparent' : currentColors.borderLight }]}>
                        <View style={{flex: 1, paddingRight: 10}}>
                          <Text style={[styles.historyMatch, { color: currentColors.text }]} numberOfLines={1}>
                            <Text style={{color: currentColors.textMuted, fontWeight: '500'}}>vs</Text> {rivalTeamName}
                          </Text>
                          <Text style={[styles.historyDate, { color: currentColors.textSecondary }]}>
                            {prettyDate} • {game.category?.replace("-", " ").toUpperCase()}
                          </Text>
                        </View>
                        
                        <View style={[styles.attendanceBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.emptyHistory, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}>
                <Ionicons name="calendar-clear-outline" size={36} color={currentColors.textMuted} style={{marginBottom: 12}}/>
                <Text style={[styles.emptyHistoryText, { color: currentColors.textSecondary }]}>No hay registros de asistencia a partidos en la base de datos para esta temporada.</Text>
              </View>
            )}
          </FadeInView>

        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES SECUNDARIOS
// ─────────────────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, currentColors, isDark }: any) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconBox, { backgroundColor: isDark ? currentColors.bg : '#F1F5F9' }]}>
        <Ionicons name={icon} size={20} color={LEAGUE_GRADIENT[1]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: currentColors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: currentColors.text }]}>{value}</Text>
      </View>
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
  heroContent: { paddingHorizontal: 24, paddingBottom: 20 },
  heroInfoWrap: { marginBottom: 20 },
  heroTopBadges: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  
  jerseyHeroBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  jerseyHeroText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  
  activeHeroBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  activeHeroText: { color: '#10B981', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  heroPosition: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  heroName: { color: '#FFFFFF', fontSize: 44, fontWeight: '900', letterSpacing: -1.5, lineHeight: 46, marginTop: 4, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },

  // --- GLASS STATS ---
  glassStatsScroll: { paddingRight: 24, gap: 12 },
  glassStatCard: { width: 120, padding: 16, borderRadius: 24, borderWidth: 1, overflow: 'hidden', alignItems: 'flex-start' },
  glassIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  glassStatValue: { fontSize: 24, fontWeight: '900', letterSpacing: -1, marginBottom: 2 },
  glassStatLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  // --- CONTENIDO INFERIOR ---
  body: { paddingHorizontal: 24, paddingTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "900", marginBottom: 16, marginLeft: 4, letterSpacing: -0.5 },
  
  // --- EQUIPOS ---
  teamCard: { flexDirection: "row", alignItems: "center", borderRadius: 24, padding: 16, borderWidth: 1, elevation: 4, marginBottom: 14, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16 },
  tinyTeamLogoWrapper: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 16 },
  tinyTeamLogo: { width: '100%', height: '100%' },
  fallbackTeamIcon: { fontSize: 16, fontWeight: '900' },
  teamInfo: { flex: 1, justifyContent: 'center' },
  teamName: { fontSize: 17, fontWeight: "900", marginBottom: 4, letterSpacing: -0.3 },
  teamCategory: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  // --- INFO CARD ---
  infoCard: { borderRadius: 28, padding: 24, borderWidth: 1, elevation: 4, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, marginBottom: 25 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  infoIconBox: { width: 46, height: 46, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 16, fontWeight: '900', marginTop: 3 },
  divider: { height: 1, marginVertical: 16 },

  // --- HISTORIAL ---
  historyContainer: { borderRadius: 28, padding: 24, borderWidth: 1, elevation: 4, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16 },
  historyRow: { flexDirection: 'row' },
  historyTimeline: { width: 36, alignItems: 'center' },
  timelineDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, zIndex: 2, marginTop: 5 },
  timelineLine: { width: 2, flex: 1, marginTop: -5, marginBottom: -10 },
  historyContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 24, borderBottomWidth: 1 },
  historyMatch: { fontSize: 16, fontWeight: '900', marginBottom: 4, letterSpacing: -0.3 },
  historyDate: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  attendanceBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  
  emptyHistory: { padding: 40, borderRadius: 28, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  emptyHistoryText: { marginTop: 8, fontSize: 14, textAlign: 'center', fontWeight: '600', lineHeight: 22, paddingHorizontal: 10 },
});