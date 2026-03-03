import React from "react";
import { View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "@/hooks/useTeams"; // Tu hook actualizado
import { BRAND_GRADIENT } from "@/constants/colors";

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: player, isLoading } = usePlayer(id);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  if (!player) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="person-remove" size={48} color="#94A3B8" />
        <Text style={styles.errorText}>Jugador no encontrado</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: BRAND_GRADIENT[0], fontWeight: '700' }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  // Colores dinámicos basados en el equipo del jugador, si no tiene usamos el por defecto
  const teamColor = player.teams?.color1 || BRAND_GRADIENT[0];
  const hasPhoto = player.photo_url && !player.photo_url.startsWith('blob:');

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* --- HEADER DEL JUGADOR --- */}
        <LinearGradient 
          colors={[teamColor, "#0F172A"]} 
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </Pressable>

          <View style={styles.profileHeader}>
            <View style={[styles.imageContainer, { borderColor: teamColor }]}>
              {hasPhoto ? (
                <Image source={{ uri: player.photo_url }} style={styles.profileImg} resizeMode="cover" />
              ) : (
                <View style={styles.placeholderImg}>
                  <Ionicons name="person" size={55} color="#CBD5E1" />
                </View>
              )}
              {/* Número de Jersey Flotante */}
              <View style={[styles.jerseyBadge, { backgroundColor: teamColor }]}>
                <Text style={styles.jerseyText}>#{player.jersey_number || "00"}</Text>
              </View>
            </View>

            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.playerPosition}>{player.position || "Jugador"}</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          
          {/* --- ESTADÍSTICAS RÁPIDAS (ASISTENCIA INCLUIDA) --- */}
          <View style={styles.statsRow}>
            {/* Medalla de Asistencia */}
            <View style={styles.statItem}>
              <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="calendar-outline" size={22} color="#10B981" />
              </View>
              <Text style={styles.statNumber}>{player.attendance_count || 0}</Text>
              <Text style={styles.statLabel}>ASISTENCIAS</Text>
            </View>

            <View style={styles.statBorder} />

            {/* Temporadas Jugadas */}
            <View style={styles.statItem}>
              <View style={[styles.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#3B82F6" />
              </View>
              <Text style={styles.statNumber}>{player.seasons_played || 1}</Text>
              <Text style={styles.statLabel}>TEMPORADAS</Text>
            </View>
          </View>

          {/* --- INFORMACIÓN DEL EQUIPO ACTUAL --- */}
          {player.teams && (
            <>
              <Text style={styles.sectionTitle}>Equipo Actual</Text>
              <Pressable 
                style={styles.teamCard} 
                onPress={() => router.push(`/team/${player.teams.id}`)}
              >
                {player.teams.logo_url ? (
                  <Image source={{ uri: player.teams.logo_url }} style={styles.teamLogo} />
                ) : (
                  <View style={styles.teamLogoFallback}>
                    <Ionicons name="shield" size={24} color="#94A3B8" />
                  </View>
                )}
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{player.teams.name}</Text>
                  <View style={[styles.statusBadge, player.status === 'active' ? styles.bgGreen : styles.bgYellow]}>
                    <Text style={styles.statusText}>{player.status === 'active' ? 'ACTIVO' : 'INACTIVO'}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </Pressable>
            </>
          )}

          {/* --- DATOS ADICIONALES --- */}
          <Text style={styles.sectionTitle}>Ficha Técnica</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="water-outline" label="Tipo de Sangre" value={player.blood_type || "No registrado"} />
            <View style={styles.divider} />
            <InfoRow icon="time-outline" label="Jugando desde" value={player.playing_since || "No registrado"} />
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Ionicons name={icon} size={18} color="#64748B" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { marginTop: 15, fontSize: 18, color: "#0F172A", fontWeight: "800" },

  header: { paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: "center" },
  backBtn: { position: "absolute", left: 20, top: 50, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  
  profileHeader: { alignItems: "center", marginTop: 20 },
  imageContainer: { width: 110, height: 110, borderRadius: 55, backgroundColor: "#FFF", borderWidth: 4, elevation: 10 },
  profileImg: { width: "100%", height: "100%", borderRadius: 55 },
  placeholderImg: { width: "100%", height: "100%", borderRadius: 55, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  jerseyBadge: { position: "absolute", bottom: -5, right: -10, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 2, borderColor: "#FFF", elevation: 5 },
  jerseyText: { color: "#FFF", fontSize: 14, fontWeight: "900" },

  playerName: { color: "#FFF", fontSize: 26, fontWeight: "900", marginTop: 15, textAlign: "center" },
  playerPosition: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "700", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" },

  body: { padding: 20 },
  
  statsRow: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 24, paddingVertical: 20, elevation: 3, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, marginBottom: 30, marginTop: -20 },
  statItem: { flex: 1, alignItems: "center" },
  statIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statBorder: { width: 1, height: '60%', backgroundColor: "#F1F5F9", alignSelf: 'center' },
  statNumber: { fontSize: 24, fontWeight: "900", color: "#0F172A" },
  statLabel: { fontSize: 10, fontWeight: "800", color: "#94A3B8", marginTop: 2 },

  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#0F172A", marginBottom: 12, marginLeft: 5 },
  
  teamCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 20, padding: 15, borderWidth: 1, borderColor: "#E2E8F0", elevation: 1, marginBottom: 25 },
  teamLogo: { width: 56, height: 56, borderRadius: 14, marginRight: 15 },
  teamLogoFallback: { width: 56, height: 56, borderRadius: 14, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", marginRight: 15, borderWidth: 1, borderColor: "#E2E8F0" },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 17, fontWeight: "900", color: "#0F172A", marginBottom: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bgGreen: { backgroundColor: "#D1FAE5" },
  bgYellow: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 10, fontWeight: "800", color: "#0F172A" },

  infoCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#E2E8F0", elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  infoIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, color: '#0F172A', fontWeight: '700', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 }
});