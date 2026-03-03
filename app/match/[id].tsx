import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { BRAND_GRADIENT } from "@/constants/colors";

// --- LÓGICA DE CRONÓMETRO EN VIVO ---
function useLiveTimer(game: any) {
  const [displayTime, setDisplayTime] = useState("");
  useEffect(() => {
    if (!game) return;
    const status = game.status?.toLowerCase() ?? "";
    if (status !== "en vivo" && status !== "en_vivo" && status !== "en curso") {
      setDisplayTime(status.toUpperCase());
      return;
    }
    const updateClock = () => {
      let remaining = game.seconds_remaining ?? 1200;
      if (game.clock_running && game.clock_last_started_at) {
        const startedAt = new Date(game.clock_last_started_at).getTime();
        const now = new Date().getTime();
        const elapsedSeconds = Math.floor((now - startedAt) / 1000);
        remaining = Math.max(0, remaining - elapsedSeconds);
      }
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;
      setDisplayTime(`${game.current_period ?? '1H'} • ${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`);
    };
    updateClock();
    let interval: NodeJS.Timeout;
    if (game.clock_running) interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [game]);
  return displayTime;
}

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [game, setGame] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const timeDisplay = useLiveTimer(game);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: gameData } = await supabase.from("games").select("*").eq("id", id).single();
      const { data: teamsData } = await supabase.from("teams").select("*");
      setGame(gameData);
      setTeams(teamsData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !game) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  const homeTeam = teams.find((t) => t.name === game.home_team);
  const awayTeam = teams.find((t) => t.name === game.away_team);
  const isLive = ["en vivo", "en_vivo", "en curso"].includes(game.status?.toLowerCase());

  // Lógica de Puntos
  const hScore = game.home_score || 0;
  const aScore = game.away_score || 0;
  const hTDs = Math.floor(hScore / 6);
  const aTDs = Math.floor(aScore / 6);
  const hExtra = hScore % 6;
  const aExtra = aScore % 6;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        headerTransparent: true, 
        title: "", 
        headerLeft: () => (
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </Pressable>
        )
      }} />

      <ScrollView bounches={false} showsVerticalScrollIndicator={false}>
        {/* --- SCOREBOARD HEADER --- */}
        <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={[styles.scoreboard, { paddingTop: insets.top + 60 }]}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, isLive && styles.statusBadgeLive]}>
              <Text style={styles.statusText}>{timeDisplay}</Text>
            </View>
            <Text style={styles.categoryHeader}>{game.category?.toUpperCase()} • JORNADA {game.jornada}</Text>
          </View>

          <View style={styles.teamsMainRow}>
            <View style={styles.teamBrand}>
              <View style={styles.logoCircle}>
                <Image source={{ uri: homeTeam?.logo_url || "https://via.placeholder.com/100" }} style={styles.mainLogo} />
              </View>
              <Text style={styles.teamNameMain}>{game.home_team}</Text>
            </View>

            <View style={styles.scoreContainer}>
              <Text style={styles.scoreNumber}>{hScore}</Text>
              <Text style={styles.scoreDivider}>-</Text>
              <Text style={styles.scoreNumber}>{aScore}</Text>
            </View>

            <View style={styles.teamBrand}>
              <View style={styles.logoCircle}>
                <Image source={{ uri: awayTeam?.logo_url || "https://via.placeholder.com/100" }} style={styles.mainLogo} />
              </View>
              <Text style={styles.teamNameMain}>{game.away_team}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Ubicación y Horario */}
          <View style={styles.infoCard}>
             <View style={styles.infoRow}>
                <View style={styles.iconCircle}><Ionicons name="location" size={20} color={BRAND_GRADIENT[0]} /></View>
                <View style={{flex: 1}}>
                  <Text style={styles.infoLabel}>Sede y Campo</Text>
                  <Text style={styles.infoValue}>{game.venue || "Sede TBD"} • Campo {game.field || "TBD"}</Text>
                </View>
             </View>
             <View style={styles.divider} />
             <View style={styles.infoRow}>
                <View style={styles.iconCircle}><Ionicons name="calendar" size={20} color={BRAND_GRADIENT[0]} /></View>
                <View style={{flex: 1}}>
                  <Text style={styles.infoLabel}>Fecha y Hora</Text>
                  <Text style={styles.infoValue}>
                    {game.game_date ? new Date(game.game_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Fecha TBD'} • {game.game_time?.substring(0,5)} hrs
                  </Text>
                </View>
             </View>
          </View>

          {/* MVP SECTION */}
          {game.mvp && (
            <LinearGradient colors={['#FFF9E6', '#FFF']} style={styles.mvpCard}>
              <Ionicons name="ribbon" size={40} color="#F59E0B" />
              <View style={{marginLeft: 15, flex: 1}}>
                <Text style={styles.mvpTitle}>MVP</Text>
                <Text style={styles.mvpName}>{game.mvp}</Text>
              </View>
              <Ionicons name="star" size={20} color="#F59E0B" />
            </LinearGradient>
          )}

          {/* ESTADÍSTICAS DE ANOTACIÓN */}
          <Text style={styles.sectionTitle}>Análisis de Anotaciones</Text>
          <View style={styles.statsCard}>
            <StatBar label="Touchdowns (6 pts)" home={hTDs} away={aTDs} />
            <StatBar label="Extras / Safeties" home={hExtra} away={aExtra} />

            <View style={styles.efficiencyContainer}>
               <Text style={styles.efficiencyTitle}>Distribución de Marcador</Text>
               <View style={styles.fullBar}>
                  <View style={[styles.homeSegment, { flex: hScore || 1 }]}>
                    <Text style={styles.barPercent}>{hScore > 0 ? Math.round((hScore/(hScore + aScore))*100) : 0}%</Text>
                  </View>
                  <View style={[styles.awaySegment, { flex: aScore || 1 }]}>
                    <Text style={styles.barPercent}>{aScore > 0 ? Math.round((aScore/(hScore + aScore))*100) : 0}%</Text>
                  </View>
               </View>
               <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, {backgroundColor: BRAND_GRADIENT[0]}]} />
                    <Text style={styles.legendText}>{game.home_team}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, {backgroundColor: '#CBD5E1'}]} />
                    <Text style={styles.legendText}>{game.away_team}</Text>
                  </View>
               </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Subcomponente de Barras
const StatBar = ({ label, home, away }: any) => {
  const total = home + away || 1;
  const homeWidth = (home / total) * 100;
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={styles.statNum}>{home}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statNum}>{away}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${homeWidth}%`, backgroundColor: BRAND_GRADIENT[0] }]} />
        <View style={[styles.barFill, { width: `${100 - homeWidth}%`, backgroundColor: '#E2E8F0' }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  
  scoreboard: { paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: 'center' },
  statusContainer: { alignItems: 'center', marginBottom: 25 },
  statusBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  statusBadgeLive: { backgroundColor: '#EF4444' },
  statusText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  categoryHeader: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  teamsMainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  teamBrand: { flex: 1, alignItems: 'center' },
  logoCircle: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: '#FFF', padding: 10, elevation: 8 },
  mainLogo: { width: '100%', height: '100%', resizeMode: 'contain' },
  teamNameMain: { color: '#FFF', fontWeight: '900', fontSize: 15, marginTop: 12, textAlign: 'center' },
  
  scoreContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  scoreNumber: { color: '#FFF', fontSize: 44, fontWeight: '900' },
  scoreDivider: { color: 'rgba(255,255,255,0.4)', fontSize: 32, marginHorizontal: 8 },

  content: { padding: 20 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, elevation: 2, marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, color: '#0F172A', fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },

  mvpCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#FEF3C7', marginBottom: 25 },
  mvpTitle: { fontSize: 11, color: '#D97706', fontWeight: '800' },
  mvpName: { fontSize: 20, color: '#92400E', fontWeight: '900' },

  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 15 },
  statsCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 25, elevation: 2 },
  statNum: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  statLabel: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  barBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, flexDirection: 'row', overflow: 'hidden' },
  barFill: { height: '100%' },

  efficiencyContainer: { marginTop: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  efficiencyTitle: { fontSize: 12, fontWeight: '800', color: '#64748B', textAlign: 'center', marginBottom: 15, textTransform: 'uppercase' },
  fullBar: { height: 28, flexDirection: 'row', borderRadius: 8, overflow: 'hidden' },
  homeSegment: { backgroundColor: BRAND_GRADIENT[0], justifyContent: 'center', alignItems: 'center' },
  awaySegment: { backgroundColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  barPercent: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 11, color: '#64748B', fontWeight: '700' },
});