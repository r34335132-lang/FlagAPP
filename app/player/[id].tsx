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
import { supabase } from "@/lib/supabase"; // 🔥 Importamos Supabase directo para mayor velocidad y precisión
import { usePlayer } from "@/hooks/useTeams"; 
import { BRAND_GRADIENT, Colors } from "@/constants/colors";

// ─────────────────────────────────────────────────────────────────────────────
// ANIMACIONES BASE
// ─────────────────────────────────────────────────────────────────────────────
const FadeInView = ({ children, delay = 0 }: { children: any, delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) })
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
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

  // 🔥 Medidas dinámicas para Tablets
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";

  // Hook del jugador básico
  const { data: player, isLoading } = usePlayer(id);
  
  // Estados para estadísticas directas de Supabase
  const [gameStats, setGameStats] = useState<any[]>([]);
  const [mvpCount, setMvpCount] = useState<number>(0);

  // 🔥 CONSULTA DIRECTA Y SEGURA A LA BASE DE DATOS 🔥
  useEffect(() => {
    if (!id) return;
    
    const loadRealStats = async () => {
      try {
        // 1. Obtener todas las estadísticas de los partidos del jugador
        const { data: statsData, error: statsError } = await supabase
          .from("player_game_stats")
          .select("touchdowns_totales, pases_completos, intercepciones, sacks")
          .eq("player_id", Number(id));
        
        if (!statsError && statsData) {
          setGameStats(statsData);
        }

        // 2. Obtener el número real de Premios MVP
        const { count, error: mvpError } = await supabase
          .from("mvps")
          .select("*", { count: 'exact', head: true })
          .eq("player_id", Number(id));
          
        if (!mvpError && count !== null) {
          setMvpCount(count);
        }

      } catch (error) {
        console.log("Error al cargar estadísticas directas:", error);
      }
    };

    loadRealStats();
  }, [id]);

  // 🔥 SUMATORIA GLOBAL EXACTA 🔥
  const totals = useMemo(() => {
    return gameStats.reduce((acc, curr) => ({
      tds: acc.tds + (Number(curr.touchdowns_totales) || 0),
      passes: acc.passes + (Number(curr.pases_completos) || 0), // Suma de Pases QB
      ints: acc.ints + (Number(curr.intercepciones) || 0),      // Suma de Intercepciones
      sacks: acc.sacks + (Number(curr.sacks) || 0),             // Suma de Sacks
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

  // Soporte Multi-Equipo
  const playerTeams = Array.isArray(player.teams) ? player.teams : (player.teams ? [player.teams] : []);
  const primaryTeamColor = playerTeams[0]?.color1 || BRAND_GRADIENT[0];
  const hasPhoto = player.photo_url && !player.photo_url.startsWith('blob:');

  const gameHistory = player.gameHistory || [];
  const realAttendanceCount = player.attendance_count || 0;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        
        {/* --- HEADER DEL JUGADOR --- */}
        <LinearGradient 
          colors={isDark ? [primaryTeamColor, currentColors.bg] : [primaryTeamColor, `${primaryTeamColor}90`]} 
          style={[styles.header, { paddingTop: insets.top + 15 }]}
        >
          <View style={[styles.contentWrapper, { position: 'relative' }]}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </Pressable>

            <View style={styles.profileHeader}>
              <View style={[styles.imageContainer, { borderColor: isDark ? currentColors.card : '#FFFFFF', backgroundColor: currentColors.card }]}>
                {hasPhoto ? (
                  <Image source={{ uri: player.photo_url }} style={styles.profileImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.placeholderImg, { backgroundColor: currentColors.bgSecondary }]}>
                    <Ionicons name="person" size={55} color={currentColors.textMuted} />
                  </View>
                )}
                
                <View style={[styles.jerseyBadge, { backgroundColor: BRAND_GRADIENT[0], borderColor: isDark ? currentColors.card : '#FFFFFF' }]}>
                  <Text style={styles.jerseyText}>#{player.jersey_number || "00"}</Text>
                </View>
              </View>

              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.playerPosition}>{player.position || "JUGADOR"}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.body, styles.contentWrapper]}>
          
          <FadeInView delay={100}>
            {/* --- ESTADÍSTICAS RÁPIDAS (Asistencia y Temporadas) --- */}
            <View style={[styles.statsRow, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#475569' }]}>
              
              <View style={styles.statItem}>
                <View style={[styles.statIconWrap, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                  <Ionicons name="calendar-outline" size={24} color="#10B981" />
                </View>
                <Text style={[styles.statNumber, { color: currentColors.text }]}>{realAttendanceCount}</Text>
                <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>ASISTENCIAS</Text>
              </View>

              <View style={[styles.statBorder, { backgroundColor: currentColors.border }]} />

              <View style={styles.statItem}>
                <View style={[styles.statIconWrap, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                  <Ionicons name="shield-checkmark-outline" size={24} color="#3B82F6" />
                </View>
                <Text style={[styles.statNumber, { color: currentColors.text }]}>{player.seasons_played || 1}</Text>
                <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>TEMPORADAS</Text>
              </View>

            </View>
          </FadeInView>

          <FadeInView delay={150}>
            {/* --- 🔥 RENDIMIENTO GLOBAL (BENTO BOX COMPLETO) 🔥 --- */}
            <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Rendimiento de Temporada</Text>
            <View style={[styles.globalStatsCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#475569' }]}>
              
              <View style={styles.statsGridRow}>
                {/* TOUCHDOWNS */}
                <View style={styles.statGridBox}>
                  <View style={[styles.statGridIconWrap, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                    <Ionicons name="american-football" size={24} color="#3B82F6" />
                  </View>
                  <Text style={[styles.statGridValue, { color: currentColors.text }]}>{totals.tds}</Text>
                  <Text style={[styles.statGridLabel, { color: currentColors.textSecondary }]}>ANOTACIONES</Text>
                </View>

                {/* PASES QB */}
                <View style={styles.statGridBox}>
                  <View style={[styles.statGridIconWrap, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF' }]}>
                    <Ionicons name="send" size={22} color="#8B5CF6" />
                  </View>
                  <Text style={[styles.statGridValue, { color: currentColors.text }]}>{totals.passes}</Text>
                  <Text style={[styles.statGridLabel, { color: currentColors.textSecondary }]}>PASES QB</Text>
                </View>
              </View>

              <View style={[styles.statsGridRow, { marginTop: 15 }]}>
                {/* INTERCEPCIONES */}
                <View style={styles.statGridBox}>
                  <View style={[styles.statGridIconWrap, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                    <Ionicons name="magnet" size={24} color="#10B981" />
                  </View>
                  <Text style={[styles.statGridValue, { color: currentColors.text }]}>{totals.ints}</Text>
                  <Text style={[styles.statGridLabel, { color: currentColors.textSecondary }]}>INTERCEP.</Text>
                </View>

                {/* SACKS */}
                <View style={styles.statGridBox}>
                  <View style={[styles.statGridIconWrap, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </View>
                  <Text style={[styles.statGridValue, { color: currentColors.text }]}>{totals.sacks}</Text>
                  <Text style={[styles.statGridLabel, { color: currentColors.textSecondary }]}>SACKS</Text>
                </View>
              </View>

              {/* MVP (Abarca todo el ancho) */}
              <View style={[styles.statsGridRow, { marginTop: 15 }]}>
                <View style={styles.statGridBox}>
                  <View style={[styles.statGridIconWrap, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB' }]}>
                    <Ionicons name="trophy" size={24} color="#F59E0B" />
                  </View>
                  <Text style={[styles.statGridValue, { color: currentColors.text }]}>{mvpCount}</Text>
                  <Text style={[styles.statGridLabel, { color: currentColors.textSecondary }]}>PREMIOS MVP</Text>
                </View>
              </View>

            </View>
          </FadeInView>

          <FadeInView delay={200}>
            {/* --- EQUIPOS A LOS QUE PERTENECE --- */}
            {playerTeams.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 10 }]}>Equipos Actuales</Text>
                {playerTeams.map((team: any, index: number) => (
                  <Pressable 
                    key={team.id || index}
                    style={[styles.teamCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#475569' }]} 
                    onPress={() => router.push(`/team/${team.id}`)}
                  >
                    <View style={[styles.tinyTeamLogoWrapper, { borderColor: currentColors.borderLight, backgroundColor: '#FFFFFF' }]}>
                      {team.logo_url ? (
                        <Image source={{ uri: team.logo_url }} style={styles.tinyTeamLogo} resizeMode="contain" />
                      ) : (
                        <Text style={[styles.fallbackTeamIcon, { color: currentColors.textMuted }]}>{team.name?.substring(0,2).toUpperCase()}</Text>
                      )}
                    </View>
                    
                    <View style={styles.teamInfo}>
                      <Text style={[styles.teamName, { color: currentColors.text }]} numberOfLines={1}>{team.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.teamCategory, { color: currentColors.textSecondary }]}>{team.category?.replace("-", " ").toUpperCase()}</Text>
                        
                        <View style={[styles.statusBadge, player.status === 'active' ? (isDark ? {backgroundColor: 'rgba(16, 185, 129, 0.15)'} : styles.bgGreen) : (isDark ? {backgroundColor: 'rgba(245, 158, 11, 0.15)'} : styles.bgYellow)]}>
                          <Text style={[styles.statusText, { color: player.status === 'active' ? '#10B981' : '#F59E0B' }]}>
                            {player.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <Ionicons name="chevron-forward" size={20} color={currentColors.textMuted} />
                  </Pressable>
                ))}
              </>
            ) : (
              <View style={[styles.infoCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, paddingVertical: 30, alignItems: 'center' }]}>
                <Ionicons name="shield-outline" size={32} color={currentColors.textMuted} style={{marginBottom: 10}}/>
                <Text style={{color: currentColors.textSecondary, fontWeight: '600'}}>Agente Libre (Sin Equipo Oficial)</Text>
              </View>
            )}
          </FadeInView>

          <FadeInView delay={300}>
            {/* --- DATOS PERSONALES / FICHA TÉCNICA --- */}
            <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 10 }]}>Ficha Técnica</Text>
            <View style={[styles.infoCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#475569' }]}>
              <InfoRow icon="water-outline" label="Tipo de Sangre" value={player.blood_type || "No registrado"} currentColors={currentColors} isDark={isDark} />
              <View style={[styles.divider, { backgroundColor: currentColors.borderLight }]} />
              <InfoRow icon="time-outline" label="Jugando desde" value={player.playing_since || "No registrado"} currentColors={currentColors} isDark={isDark} />
            </View>
          </FadeInView>

          <FadeInView delay={400}>
            {/* --- HISTORIAL DE ASISTENCIA (Línea de Tiempo) --- */}
            <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 15 }]}>Historial de Partidos</Text>
            
            {gameHistory.length > 0 ? (
              <View style={[styles.historyContainer, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#475569' }]}>
                {gameHistory.map((game: any, index: number) => {
                  const isLast = index === gameHistory.length - 1;
                  
                  const isHome = playerTeams.some(t => t.name === game.home_team);
                  const myTeamName = isHome ? game.home_team : game.away_team;
                  const rivalTeamName = isHome ? game.away_team : game.home_team;
                  
                  const matchTeamColor = playerTeams.find(t => t.name === myTeamName)?.color1 || BRAND_GRADIENT[0];

                  const dateObj = new Date(game.game_date);
                  const prettyDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

                  return (
                    <View key={game.id} style={styles.historyRow}>
                      <View style={styles.historyTimeline}>
                        <View style={[styles.timelineDot, { backgroundColor: matchTeamColor, borderColor: currentColors.card }]} />
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
                          <Text style={[styles.attendanceText, { color: '#10B981' }]}>Presente</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.emptyHistory, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
                <Ionicons name="calendar-clear-outline" size={32} color={currentColors.textMuted} style={{marginBottom: 8}}/>
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
      <View style={[styles.infoIconBox, { backgroundColor: isDark ? currentColors.bg : '#F8FAFC' }]}>
        <Ionicons name={icon} size={20} color={BRAND_GRADIENT[0]} />
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

  // --- HEADER (MODERNIZADO) ---
  header: { paddingBottom: 50, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: "center", elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 15 },
  backBtn: { position: "absolute", left: 20, top: 10, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "center", alignItems: "center" },
  
  profileHeader: { alignItems: "center", marginTop: 25 },
  imageContainer: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, position: 'relative' },
  profileImg: { width: "100%", height: "100%", borderRadius: 60 },
  placeholderImg: { width: "100%", height: "100%", borderRadius: 60, justifyContent: "center", alignItems: "center" },
  
  jerseyBadge: { position: "absolute", bottom: -8, right: -12, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 3, elevation: 6 },
  jerseyText: { color: "#FFF", fontSize: 16, fontWeight: "900", letterSpacing: -0.5 },

  playerName: { color: '#FFFFFF', fontSize: 32, fontWeight: "900", marginTop: 22, textAlign: "center", letterSpacing: -0.5 },
  playerPosition: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: "800", marginTop: 4, letterSpacing: 1.5, textTransform: "uppercase" },

  body: { paddingHorizontal: 20, paddingTop: 10 },
  
  // --- STATS ASISTENCIA ---
  statsRow: { flexDirection: "row", borderRadius: 28, paddingVertical: 24, elevation: 5, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, marginBottom: 35, marginTop: -35, borderWidth: 1 },
  statItem: { flex: 1, alignItems: "center" },
  statIconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statBorder: { width: 1, height: '70%', alignSelf: 'center' },
  statNumber: { fontSize: 26, fontWeight: "900", letterSpacing: -1 },
  statLabel: { fontSize: 10, fontWeight: "800", marginTop: 4, letterSpacing: 1 },

  sectionTitle: { fontSize: 18, fontWeight: "900", marginBottom: 16, marginLeft: 6, letterSpacing: -0.5 },
  
  // --- STATS GLOBALES (BENTO BOX CON PASES) ---
  globalStatsCard: { borderRadius: 28, borderWidth: 1, padding: 24, marginBottom: 30, elevation: 3, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12 },
  statsGridRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  statGridBox: { flex: 1, alignItems: 'center' },
  statGridIconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statGridValue: { fontSize: 26, fontWeight: '900', letterSpacing: -1, marginBottom: 2 },
  statGridLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // --- TEAM CARD (SOPORTE MULTI EQUIPO) ---
  teamCard: { flexDirection: "row", alignItems: "center", borderRadius: 24, padding: 18, borderWidth: 1, elevation: 2, marginBottom: 16, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 },
  tinyTeamLogoWrapper: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 16, borderWidth: 1, padding: 4 },
  tinyTeamLogo: { width: '100%', height: '100%' },
  fallbackTeamIcon: { fontSize: 18, fontWeight: '900' },
  teamInfo: { flex: 1, justifyContent: 'center' },
  teamName: { fontSize: 18, fontWeight: "900", marginBottom: 6, letterSpacing: -0.3 },
  teamCategory: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bgGreen: { backgroundColor: "#D1FAE5" },
  bgYellow: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },

  // --- INFO CARD ---
  infoCard: { borderRadius: 28, padding: 24, borderWidth: 1, elevation: 2, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, marginBottom: 25 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  infoIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 16, fontWeight: '900', marginTop: 3 },
  divider: { height: 1, marginVertical: 14 },

  // --- HISTORIAL LINEA DE TIEMPO ---
  historyContainer: { borderRadius: 28, padding: 24, borderWidth: 1, elevation: 2, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 },
  historyRow: { flexDirection: 'row' },
  historyTimeline: { width: 36, alignItems: 'center' },
  timelineDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, zIndex: 2, marginTop: 5 },
  timelineLine: { width: 2, flex: 1, marginTop: -5, marginBottom: -10 },
  historyContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 24, borderBottomWidth: 1 },
  historyMatch: { fontSize: 16, fontWeight: '900', marginBottom: 4, letterSpacing: -0.3 },
  historyDate: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  attendanceBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, gap: 6 },
  attendanceText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  emptyHistory: { padding: 40, borderRadius: 28, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  emptyHistoryText: { marginTop: 10, fontSize: 14, textAlign: 'center', fontWeight: '600', lineHeight: 22, paddingHorizontal: 20 },
});