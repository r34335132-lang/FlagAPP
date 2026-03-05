import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  Pressable, 
  ActivityIndicator,
  useColorScheme
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "@/hooks/useTeams"; 
import { BRAND_GRADIENT, Colors } from "@/constants/colors";

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  const { data: player, isLoading } = usePlayer(id);

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
        <Ionicons name="person-remove" size={48} color={currentColors.textMuted} />
        <Text style={[styles.errorText, { color: currentColors.text }]}>Jugador no encontrado</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: BRAND_GRADIENT[0], fontWeight: '700' }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const teamColor = player.teams?.color1 || BRAND_GRADIENT[0];
  const hasPhoto = player.photo_url && !player.photo_url.startsWith('blob:');

  // Obtenemos el historial directamente de nuestro hook modificado
  const gameHistory = player.gameHistory || [];
  const realAttendanceCount = player.attendance_count || 0;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        
        {/* --- HEADER DEL JUGADOR --- */}
        <LinearGradient 
          colors={[teamColor, currentColors.bg]} 
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </Pressable>

          <View style={styles.profileHeader}>
            <View style={[styles.imageContainer, { borderColor: teamColor, backgroundColor: currentColors.card }]}>
              {hasPhoto ? (
                <Image source={{ uri: player.photo_url }} style={styles.profileImg} resizeMode="cover" />
              ) : (
                <View style={[styles.placeholderImg, { backgroundColor: currentColors.bgSecondary }]}>
                  <Ionicons name="person" size={55} color={currentColors.textMuted} />
                </View>
              )}
              {/* Número de Jersey Flotante */}
              <View style={[styles.jerseyBadge, { backgroundColor: teamColor, borderColor: currentColors.card }]}>
                <Text style={styles.jerseyText}>#{player.jersey_number || "00"}</Text>
              </View>
            </View>

            <Text style={[styles.playerName, { color: theme === 'dark' ? currentColors.text : '#FFF' }]}>{player.name}</Text>
            <Text style={[styles.playerPosition, { color: theme === 'dark' ? currentColors.textSecondary : 'rgba(255,255,255,0.8)' }]}>{player.position || "Jugador"}</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          
          {/* --- ESTADÍSTICAS RÁPIDAS --- */}
          <View style={[styles.statsRow, { backgroundColor: currentColors.card, shadowColor: theme === 'dark' ? '#000' : '#0F172A' }]}>
            {/* Medalla de Asistencia */}
            <View style={styles.statItem}>
              <View style={[styles.statIconWrap, { backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5' }]}>
                <Ionicons name="calendar-outline" size={22} color="#10B981" />
              </View>
              <Text style={[styles.statNumber, { color: currentColors.text }]}>{realAttendanceCount}</Text>
              <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>ASISTENCIAS</Text>
            </View>

            <View style={[styles.statBorder, { backgroundColor: currentColors.borderLight }]} />

            {/* Temporadas Jugadas */}
            <View style={styles.statItem}>
              <View style={[styles.statIconWrap, { backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF' }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#3B82F6" />
              </View>
              <Text style={[styles.statNumber, { color: currentColors.text }]}>{player.seasons_played || 1}</Text>
              <Text style={[styles.statLabel, { color: currentColors.textSecondary }]}>TEMPORADAS</Text>
            </View>
          </View>

          {/* --- INFORMACIÓN DEL EQUIPO ACTUAL --- */}
          {player.teams && (
            <>
              <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Equipo Actual</Text>
              <Pressable 
                style={[styles.teamCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]} 
                onPress={() => router.push(`/team/${player.teams.id}`)}
              >
                <View style={[styles.tinyTeamLogoWrapper, { borderColor: currentColors.border, backgroundColor: '#FFFFFF' }]}>
                  {player.teams.logo_url ? (
                    <Image source={{ uri: player.teams.logo_url }} style={styles.tinyTeamLogo} resizeMode="contain" />
                  ) : (
                    <Ionicons name="shield" size={24} color={currentColors.textMuted} />
                  )}
                </View>
                <View style={styles.teamInfo}>
                  <Text style={[styles.teamName, { color: currentColors.text }]}>{player.teams.name}</Text>
                  <View style={[styles.statusBadge, player.status === 'active' ? (theme === 'dark' ? {backgroundColor: '#064E3B'} : styles.bgGreen) : (theme === 'dark' ? {backgroundColor: '#78350F'} : styles.bgYellow)]}>
                    <Text style={[styles.statusText, { color: player.status === 'active' ? (theme === 'dark' ? '#34D399' : '#0F172A') : (theme === 'dark' ? '#FDE68A' : '#0F172A') }]}>
                      {player.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={currentColors.textMuted} />
              </Pressable>
            </>
          )}

          {/* --- DATOS ADICIONALES --- */}
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Ficha Técnica</Text>
          <View style={[styles.infoCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
            <InfoRow icon="water-outline" label="Tipo de Sangre" value={player.blood_type || "No registrado"} currentColors={currentColors} />
            <View style={[styles.divider, { backgroundColor: currentColors.borderLight }]} />
            <InfoRow icon="time-outline" label="Jugando desde" value={player.playing_since || "No registrado"} currentColors={currentColors} />
          </View>

          {/* --- HISTORIAL DE ASISTENCIA (Línea de Tiempo) --- */}
          <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 25 }]}>Historial de Partidos</Text>
          
          {gameHistory.length > 0 ? (
            <View style={[styles.historyContainer, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
              {gameHistory.map((game: any, index: number) => {
                const isLast = index === gameHistory.length - 1;
                // Determinamos contra quién jugó
                const rival = game.home_team === player.teams?.name ? game.away_team : game.home_team;
                
                // Formateamos la fecha (sin la semana)
                const dateObj = new Date(game.game_date);
                const prettyDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

                return (
                  <View key={game.id} style={styles.historyRow}>
                    <View style={styles.historyTimeline}>
                      <View style={[styles.timelineDot, { backgroundColor: teamColor, borderColor: currentColors.card }]} />
                      {!isLast && <View style={[styles.timelineLine, { backgroundColor: currentColors.border }]} />}
                    </View>
                    <View style={[styles.historyContent, { borderBottomColor: isLast ? 'transparent' : currentColors.borderLight }]}>
                      <View>
                        <Text style={[styles.historyMatch, { color: currentColors.text }]}>
                          vs {rival}
                        </Text>
                        <Text style={[styles.historyDate, { color: currentColors.textMuted }]}>
                          {prettyDate}
                        </Text>
                      </View>
                      <View style={[styles.attendanceBadge, { backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5' }]}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={[styles.attendanceText, { color: '#10B981' }]}>Presente</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyHistory, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border }]}>
              <Ionicons name="calendar-clear-outline" size={32} color={currentColors.textMuted} />
              <Text style={[styles.emptyHistoryText, { color: currentColors.textSecondary }]}>No hay registros de partidos jugados en esta temporada.</Text>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, currentColors }: any) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconBox, { backgroundColor: currentColors.bgSecondary }]}>
        <Ionicons name={icon} size={18} color={currentColors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: currentColors.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: currentColors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { marginTop: 15, fontSize: 18, fontWeight: "800" },

  header: { paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: "center" },
  backBtn: { position: "absolute", left: 20, top: 50, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  
  profileHeader: { alignItems: "center", marginTop: 20 },
  imageContainer: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, elevation: 10 },
  profileImg: { width: "100%", height: "100%", borderRadius: 55 },
  placeholderImg: { width: "100%", height: "100%", borderRadius: 55, justifyContent: "center", alignItems: "center" },
  jerseyBadge: { position: "absolute", bottom: -5, right: -10, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 2, elevation: 5 },
  jerseyText: { color: "#FFF", fontSize: 14, fontWeight: "900" },

  playerName: { fontSize: 26, fontWeight: "900", marginTop: 15, textAlign: "center" },
  playerPosition: { fontSize: 14, fontWeight: "700", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" },

  body: { padding: 20 },
  
  statsRow: { flexDirection: "row", borderRadius: 24, paddingVertical: 20, elevation: 3, shadowOpacity: 0.05, shadowRadius: 10, marginBottom: 30, marginTop: -20 },
  statItem: { flex: 1, alignItems: "center" },
  statIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statBorder: { width: 1, height: '60%', alignSelf: 'center' },
  statNumber: { fontSize: 24, fontWeight: "900" },
  statLabel: { fontSize: 10, fontWeight: "800", marginTop: 2 },

  sectionTitle: { fontSize: 17, fontWeight: "900", marginBottom: 12, marginLeft: 5 },
  
  teamCard: { flexDirection: "row", alignItems: "center", borderRadius: 20, padding: 15, borderWidth: 1, elevation: 1, marginBottom: 25 },
  tinyTeamLogoWrapper: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 15, borderWidth: 1, padding: 4 },
  tinyTeamLogo: { width: '100%', height: '100%' },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 17, fontWeight: "900", marginBottom: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bgGreen: { backgroundColor: "#D1FAE5" },
  bgYellow: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 10, fontWeight: "800" },

  infoCard: { borderRadius: 20, padding: 20, borderWidth: 1, elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  infoIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  divider: { height: 1, marginVertical: 8 },

  historyContainer: { borderRadius: 20, padding: 20, borderWidth: 1, elevation: 1 },
  historyRow: { flexDirection: 'row' },
  historyTimeline: { width: 30, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, zIndex: 2, marginTop: 5 },
  timelineLine: { width: 2, flex: 1, marginTop: -5, marginBottom: -10 },
  historyContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, borderBottomWidth: 1 },
  historyMatch: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  historyDate: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  attendanceBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  attendanceText: { fontSize: 11, fontWeight: '800' },
  emptyHistory: { padding: 30, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  emptyHistoryText: { marginTop: 10, fontSize: 13, textAlign: 'center', fontWeight: '600' },
});