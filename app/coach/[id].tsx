import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator, useColorScheme } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase"; 
import { BRAND_GRADIENT, Colors } from "@/constants/colors"; // <-- Importamos paleta dinámica

export default function CoachPublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

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
      <View style={[styles.container, styles.center, { backgroundColor: currentColors.bg }]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  if (teams.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: currentColors.bg }]}>
        <Ionicons name="person-remove-outline" size={48} color={currentColors.textMuted} />
        <Text style={[styles.errorText, { color: currentColors.text }]}>Perfil no encontrado</Text>
        <Text style={[styles.errorSub, { color: currentColors.textSecondary }]}>
          Este coach no tiene equipos vinculados actualmente a su ID o el equipo es antiguo.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backBtnFallback}>
          <Text style={styles.backBtnFallbackText}>Volver al equipo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* --- HEADER DEL COACH --- */}
        <LinearGradient 
          colors={[BRAND_GRADIENT[0], currentColors.bg]} 
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </Pressable>

          <View style={styles.profileHeader}>
            <View style={[styles.imageContainer, { backgroundColor: currentColors.card }]}>
              {coachPhoto ? (
                <Image source={{ uri: coachPhoto }} style={styles.profileImg} resizeMode="cover" />
              ) : (
                <View style={[styles.placeholderImg, { backgroundColor: currentColors.bgSecondary }]}>
                  <Ionicons name="person" size={50} color={currentColors.textMuted} />
                </View>
              )}
              <View style={[styles.verifiedBadge, { backgroundColor: currentColors.card }]}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
            </View>

            <Text style={[styles.coachName, { color: theme === 'dark' ? currentColors.text : '#FFF' }]}>{coachName}</Text>
            <View style={[styles.roleBadge, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)' }]}>
              <Text style={[styles.roleBadgeText, { color: theme === 'dark' ? currentColors.textSecondary : '#FFF' }]}>HEAD COACH</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          
          {/* --- ESTADÍSTICAS DEL COACH --- */}
          <View style={[styles.statsRow, { backgroundColor: currentColors.card, shadowColor: theme === 'dark' ? '#000' : '#0F172A' }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: currentColors.text }]}>{championships.length}</Text>
              <Text style={[styles.statLabel, { color: currentColors.textMuted }]}>CAMPEONATOS</Text>
            </View>
            <View style={[styles.statBorder, { backgroundColor: currentColors.borderLight }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: currentColors.text }]}>{teams.length}</Text>
              <Text style={[styles.statLabel, { color: currentColors.textMuted }]}>EQUIPOS</Text>
            </View>
          </View>

          {/* --- LISTA DE CAMPEONATOS --- */}
          {championships.length > 0 && (
            <View style={{ marginBottom: 25 }}>
              <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Palmarés</Text>
              {championships.map(champ => (
                <View key={champ.id} style={[styles.champCard, { backgroundColor: currentColors.card, borderColor: theme === 'dark' ? '#78350F' : '#F59E0B40' }]}>
                  <View style={[styles.champIcon, { backgroundColor: theme === 'dark' ? '#78350F' : '#FEF3C7' }]}>
                    <Ionicons name="trophy" size={20} color={theme === 'dark' ? '#FDE68A' : "#F59E0B"} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={[styles.champTitle, { color: currentColors.text }]}>{champ.title}</Text>
                    <Text style={[styles.champSub, { color: currentColors.textSecondary }]}>{champ.tournament} • {champ.year}</Text>
                  </View>
                  <Text style={[styles.champPosition, { color: theme === 'dark' ? '#FDE68A' : "#F59E0B" }]}>{champ.position}</Text>
                </View>
              ))}
            </View>
          )}

          {/* --- EQUIPOS DIRIGIDOS --- */}
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Equipos a su cargo</Text>
          <View style={styles.teamsGrid}>
            {teams.map((t) => (
              <Pressable 
                key={t.id} 
                style={[styles.teamCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]} 
                onPress={() => router.push(`/team/${t.id}`)}
              >
                {t.logo_url ? (
                  <Image source={{ uri: t.logo_url }} style={styles.teamLogo} />
                ) : (
                  <View style={[styles.teamLogoFallback, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border }]}>
                    <Ionicons name="shield" size={20} color={currentColors.textMuted} />
                  </View>
                )}
                <View style={styles.teamInfo}>
                  <Text style={[styles.teamName, { color: currentColors.text }]}>{t.name}</Text>
                  <Text style={[styles.teamCategory, { color: currentColors.textSecondary }]}>{t.category.replace("-", " ").toUpperCase()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={currentColors.textMuted} />
              </Pressable>
            ))}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

// Retiramos colores fijos del StyleSheet
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { marginTop: 15, fontSize: 20, fontWeight: "900" },
  errorSub: { marginTop: 8, fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  backBtnFallback: { marginTop: 25, backgroundColor: BRAND_GRADIENT[0], paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnFallbackText: { color: "#FFF", fontWeight: "800", fontSize: 16 },

  header: { paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: "center" },
  backBtn: { position: "absolute", left: 20, top: 50, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  
  profileHeader: { alignItems: "center", marginTop: 20 },
  imageContainer: { width: 120, height: 120, borderRadius: 60, padding: 4, elevation: 10 },
  profileImg: { width: "100%", height: "100%", borderRadius: 60 },
  placeholderImg: { width: "100%", height: "100%", borderRadius: 60, justifyContent: "center", alignItems: "center" },
  verifiedBadge: { position: "absolute", bottom: 0, right: 0, borderRadius: 12, padding: 2 },

  coachName: { fontSize: 26, fontWeight: "900", marginTop: 15, textAlign: "center" },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  roleBadgeText: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },

  body: { padding: 20 },
  
  statsRow: { flexDirection: "row", borderRadius: 24, paddingVertical: 20, elevation: 2, marginBottom: 30, marginTop: -10 },
  statItem: { flex: 1, alignItems: "center" },
  statBorder: { width: 1, height: '80%', alignSelf: 'center' },
  statNumber: { fontSize: 24, fontWeight: "900" },
  statLabel: { fontSize: 10, fontWeight: "800", marginTop: 4 },

  sectionTitle: { fontSize: 18, fontWeight: "900", marginBottom: 15, marginLeft: 5 },
  
  teamsGrid: { gap: 12 },
  teamCard: { flexDirection: "row", alignItems: "center", borderRadius: 20, padding: 15, borderWidth: 1, elevation: 1 },
  teamLogo: { width: 50, height: 50, borderRadius: 12, marginRight: 15 },
  teamLogoFallback: { width: 50, height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 15, borderWidth: 1 },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  teamCategory: { fontSize: 11, fontWeight: "700" },

  champCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
  champIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  champTitle: { fontSize: 15, fontWeight: '800' },
  champSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  champPosition: { fontSize: 11, fontWeight: '800' }
});