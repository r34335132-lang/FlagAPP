import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase"; // <-- USAMOS SUPABASE DIRECTO
import { BRAND_GRADIENT } from "@/constants/colors";

export default function CoachPublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [teams, setTeams] = useState<any[]>([]);
  const [championships, setChampionships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Extraemos la info del coach del primer equipo que encontremos
  const coachName = teams.length > 0 ? (teams[0].coach_name || "Coach") : "Coach Oficial";
  const coachPhoto = teams.find(t => t.coach_photo_url)?.coach_photo_url || null;

  useEffect(() => {
    if (id) fetchCoachData();
  }, [id]);

  const fetchCoachData = async () => {
    setLoading(true);
    try {
      const coachIdNumber = parseInt(id as string);

      // 1. Traer los equipos directo de Supabase
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .eq("coach_id", coachIdNumber);

      if (teamsData) setTeams(teamsData);

      // 2. Traer campeonatos directo de Supabase
      const { data: champsData, error: champsError } = await supabase
        .from("coach_championships")
        .select("*")
        .eq("coach_id", coachIdNumber)
        .order("year", { ascending: false });

      if (champsData) setChampionships(champsData);

    } catch (error) {
      console.error("Error al cargar datos del coach:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  if (teams.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="person-remove-outline" size={48} color="#94A3B8" />
        <Text style={styles.errorText}>Perfil no encontrado</Text>
        <Text style={styles.errorSub}>
          Este coach no tiene equipos vinculados actualmente a su ID o el equipo es antiguo.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backBtnFallback}>
          <Text style={styles.backBtnFallbackText}>Volver al equipo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* --- HEADER DEL COACH --- */}
        <LinearGradient 
          colors={[BRAND_GRADIENT[0], "#0F172A"]} 
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </Pressable>

          <View style={styles.profileHeader}>
            <View style={styles.imageContainer}>
              {coachPhoto ? (
                <Image source={{ uri: coachPhoto }} style={styles.profileImg} resizeMode="cover" />
              ) : (
                <View style={styles.placeholderImg}>
                  <Ionicons name="person" size={50} color="#CBD5E1" />
                </View>
              )}
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
            </View>

            <Text style={styles.coachName}>{coachName}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>HEAD COACH</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          
          {/* --- ESTADÍSTICAS DEL COACH --- */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{championships.length}</Text>
              <Text style={styles.statLabel}>CAMPEONATOS</Text>
            </View>
            <View style={styles.statBorder} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{teams.length}</Text>
              <Text style={styles.statLabel}>EQUIPOS</Text>
            </View>
          </View>

          {/* --- LISTA DE CAMPEONATOS --- */}
          {championships.length > 0 && (
            <View style={{ marginBottom: 25 }}>
              <Text style={styles.sectionTitle}>Palmarés</Text>
              {championships.map(champ => (
                <View key={champ.id} style={styles.champCard}>
                  <View style={styles.champIcon}>
                    <Ionicons name="trophy" size={20} color="#F59E0B" />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.champTitle}>{champ.title}</Text>
                    <Text style={styles.champSub}>{champ.tournament} • {champ.year}</Text>
                  </View>
                  <Text style={styles.champPosition}>{champ.position}</Text>
                </View>
              ))}
            </View>
          )}

          {/* --- EQUIPOS DIRIGIDOS --- */}
          <Text style={styles.sectionTitle}>Equipos a su cargo</Text>
          <View style={styles.teamsGrid}>
            {teams.map((t) => (
              <Pressable key={t.id} style={styles.teamCard} onPress={() => router.push(`/team/${t.id}`)}>
                {t.logo_url ? (
                  <Image source={{ uri: t.logo_url }} style={styles.teamLogo} />
                ) : (
                  <View style={styles.teamLogoFallback}><Ionicons name="shield" size={20} color="#94A3B8" /></View>
                )}
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{t.name}</Text>
                  <Text style={styles.teamCategory}>{t.category.replace("-", " ").toUpperCase()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </Pressable>
            ))}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { marginTop: 15, fontSize: 20, color: "#0F172A", fontWeight: "900" },
  errorSub: { marginTop: 8, fontSize: 14, color: "#64748B", textAlign: "center", paddingHorizontal: 40 },
  backBtnFallback: { marginTop: 25, backgroundColor: BRAND_GRADIENT[0], paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnFallbackText: { color: "#FFF", fontWeight: "800", fontSize: 16 },

  header: { paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: "center" },
  backBtn: { position: "absolute", left: 20, top: 50, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  
  profileHeader: { alignItems: "center", marginTop: 20 },
  imageContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#FFF", padding: 4, elevation: 10 },
  profileImg: { width: "100%", height: "100%", borderRadius: 60 },
  placeholderImg: { width: "100%", height: "100%", borderRadius: 60, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  verifiedBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#FFF", borderRadius: 12, padding: 2 },

  coachName: { color: "#FFF", fontSize: 26, fontWeight: "900", marginTop: 15, textAlign: "center" },
  roleBadge: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  roleBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "800", letterSpacing: 1 },

  body: { padding: 20 },
  
  statsRow: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 24, paddingVertical: 20, elevation: 2, marginBottom: 30, marginTop: -10 },
  statItem: { flex: 1, alignItems: "center" },
  statBorder: { width: 1, height: '80%', backgroundColor: "#F1F5F9", alignSelf: 'center' },
  statNumber: { fontSize: 24, fontWeight: "900", color: "#0F172A" },
  statLabel: { fontSize: 10, fontWeight: "800", color: "#94A3B8", marginTop: 4 },

  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A", marginBottom: 15, marginLeft: 5 },
  
  teamsGrid: { gap: 12 },
  teamCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 20, padding: 15, borderWidth: 1, borderColor: "#E2E8F0", elevation: 1 },
  teamLogo: { width: 50, height: 50, borderRadius: 12, marginRight: 15 },
  teamLogoFallback: { width: 50, height: 50, borderRadius: 12, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", marginRight: 15, borderWidth: 1, borderColor: "#E2E8F0" },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  teamCategory: { fontSize: 11, fontWeight: "700", color: "#64748B" },

  champCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F59E0B40' },
  champIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  champTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  champSub: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 2 },
  champPosition: { fontSize: 11, fontWeight: '800', color: '#F59E0B' }
});