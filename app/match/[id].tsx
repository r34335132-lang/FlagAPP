import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { BRAND_GRADIENT } from "@/constants/colors";

// Herramientas para compartir
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";

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
  const [players, setPlayers] = useState<any[]>([]); // Nuevo estado para los jugadores
  const [loading, setLoading] = useState(true);
  
  // Estado para el switch del Roster (Local o Visitante)
  const [activeRoster, setActiveRoster] = useState<"home" | "away">("home");

  const scoreboardRef = useRef<ViewShot>(null);
  const timeDisplay = useLiveTimer(game);

  useEffect(() => {
    fetchData();

    if (!id) return;

    const subscription = supabase
      .channel(`game-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${id}` }, 
        (payload) => {
          setGame(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Traemos el partido
      const { data: gameData } = await supabase.from("games").select("*").eq("id", id).single();
      
      if (gameData) {
        // 2. Traemos solo los 2 equipos de este partido para optimizar
        const { data: teamsData } = await supabase
          .from("teams")
          .select("*")
          .in("name", [gameData.home_team, gameData.away_team]);
        
        setGame(gameData);
        setTeams(teamsData || []);

        // 3. Traemos a todos los jugadores de ambos equipos
        if (teamsData && teamsData.length > 0) {
          const teamIds = teamsData.map(t => t.id);
          const { data: playersData } = await supabase
            .from("players")
            .select("*")
            .in("team_id", teamIds)
            .order("jersey_number", { ascending: true }); // Ordenados por número de playera
          
          setPlayers(playersData || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (scoreboardRef.current && scoreboardRef.current.capture) {
        const uri = await scoreboardRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/jpeg',
            dialogTitle: 'Comparte este marcador',
            UTI: 'public.jpeg',
          });
        } else {
          Alert.alert("Aviso", "La opción de compartir no está disponible.");
        }
      }
    } catch (error) {
      console.error("Error al compartir", error);
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

  const hScore = game.home_score || 0;
  const aScore = game.away_score || 0;
  const hTDs = Math.floor(hScore / 6);
  const aTDs = Math.floor(aScore / 6);
  const hExtra = hScore % 6;
  const aExtra = aScore % 6;

  // Filtrar jugadores por equipo para el Roster
  const homeRoster = players.filter(p => p.team_id === homeTeam?.id);
  const awayRoster = players.filter(p => p.team_id === awayTeam?.id);
  const currentDisplayRoster = activeRoster === "home" ? homeRoster : awayRoster;
  const currentTeamColor = activeRoster === "home" ? (homeTeam?.color1 || BRAND_GRADIENT[0]) : (awayTeam?.color1 || '#64748B');

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        
        <ViewShot 
          ref={scoreboardRef} 
          options={{ format: "jpg", quality: 0.9 }} 
          style={{ backgroundColor: "#F8FAFC", paddingBottom: 10 }}
        >
          <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={[styles.scoreboard, { paddingTop: insets.top + 60 }]}>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, isLive && styles.statusBadgeLive]}>
                <Text style={styles.statusText}>{timeDisplay}</Text>
              </View>
              <Text style={styles.categoryHeader}>{game.category?.toUpperCase()} • {game.match_type?.toUpperCase()}</Text>
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
            <View style={styles.infoCard}>
               <View style={styles.infoRow}>
                  <View style={styles.iconCircle}><Ionicons name="location" size={20} color={BRAND_GRADIENT[0]} /></View>
                  <View style={{flex: 1}}>
                    <Text style={styles.infoLabel}>Sede y Campo</Text>
                    <Text style={styles.infoValue}>{game.venue || "Sede TBD"} • {game.field || "Campo TBD"}</Text>
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

            {game.mvp && (
              <LinearGradient colors={['#FFF9E6', '#FFF']} style={styles.mvpCard}>
                <Ionicons name="ribbon" size={40} color="#F59E0B" />
                <View style={{marginLeft: 15, flex: 1}}>
                  <Text style={styles.mvpTitle}>MVP DEL PARTIDO</Text>
                  <Text style={styles.mvpName}>{game.mvp}</Text>
                </View>
                <Ionicons name="star" size={20} color="#F59E0B" />
              </LinearGradient>
            )}

            {/* --- ESTADÍSTICAS DEL MARCADOR --- */}
            <Text style={styles.sectionTitle}>Análisis de Anotaciones</Text>
            <View style={styles.statsCard}>
              <StatBar label="Touchdowns (6 pts)" home={hTDs} away={aTDs} />
              <StatBar label="Extras / Safeties" home={hExtra} away={aExtra} />

              <View style={styles.efficiencyContainer}>
                 <View style={styles.fullBar}>
                    <View style={[styles.homeSegment, { flex: hScore || 1 }]} />
                    <View style={[styles.awaySegment, { flex: aScore || 1 }]} />
                 </View>
              </View>
            </View>

          </View>
        </ViewShot>

        {/* --- NUEVA SECCIÓN: ROSTERS (FRENTE A FRENTE) --- */}
        <View style={styles.rosterSection}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 20 }]}>Alineaciones (Roster)</Text>
          
          <View style={styles.rosterToggleWrapper}>
            <Pressable 
              style={[styles.rosterToggleBtn, activeRoster === "home" && { backgroundColor: BRAND_GRADIENT[0] }]}
              onPress={() => setActiveRoster("home")}
            >
              <Text style={[styles.rosterToggleText, activeRoster === "home" && styles.rosterToggleTextActive]}>
                {game.home_team}
              </Text>
            </Pressable>
            <Pressable 
              style={[styles.rosterToggleBtn, activeRoster === "away" && { backgroundColor: BRAND_GRADIENT[0] }]}
              onPress={() => setActiveRoster("away")}
            >
              <Text style={[styles.rosterToggleText, activeRoster === "away" && styles.rosterToggleTextActive]}>
                {game.away_team}
              </Text>
            </Pressable>
          </View>

          <View style={styles.rosterListContainer}>
            {currentDisplayRoster.length > 0 ? (
              currentDisplayRoster.map((player) => (
                <View key={player.id} style={styles.playerRow}>
                  <View style={[styles.playerJerseyCircle, { backgroundColor: currentTeamColor }]}>
                    <Text style={styles.playerJerseyNumber}>{player.jersey_number || player.number || "0"}</Text>
                  </View>
                  
                  <View style={styles.playerAvatarWrap}>
                    {player.photo_url && !player.photo_url.startsWith("blob:") ? (
                      <Image source={{ uri: player.photo_url }} style={styles.playerAvatar} />
                    ) : (
                      <Ionicons name="person" size={20} color="#94A3B8" />
                    )}
                  </View>

                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerPosition}>{player.position || "Jugador"}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyRoster}>
                <Ionicons name="people-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyRosterText}>No hay jugadores registrados en el roster para este partido.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Espacio final para que no tape el botón flotante */}
        <View style={{ height: 100 }} />

      </ScrollView>

      {/* BOTONES FLOTANTES */}
      <Pressable onPress={() => router.back()} style={[styles.floatingBackBtn, { top: insets.top + 10 }]}>
        <Ionicons name="chevron-back" size={26} color="#FFF" />
      </Pressable>

      <Pressable onPress={handleShare} style={[styles.floatingShareBtn, { top: insets.top + 10 }]}>
        <Ionicons name="share-social" size={24} color="#FFF" />
      </Pressable>

    </View>
  );
}

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
  
  floatingBackBtn: { position: 'absolute', left: 15, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', zIndex: 999, elevation: 10 },
  floatingShareBtn: { position: 'absolute', right: 15, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', zIndex: 999, elevation: 10 },
  
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

  content: { paddingHorizontal: 20, paddingTop: 20 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, elevation: 2, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, color: '#0F172A', fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },

  mvpCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#FEF3C7', marginBottom: 25 },
  mvpTitle: { fontSize: 11, color: '#D97706', fontWeight: '800', letterSpacing: 1 },
  mvpName: { fontSize: 20, color: '#92400E', fontWeight: '900' },

  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 15 },
  statsCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 25, elevation: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  statNum: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  statLabel: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  barBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, flexDirection: 'row', overflow: 'hidden' },
  barFill: { height: '100%' },

  efficiencyContainer: { marginTop: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  fullBar: { height: 12, flexDirection: 'row', borderRadius: 6, overflow: 'hidden' },
  homeSegment: { backgroundColor: BRAND_GRADIENT[0] },
  awaySegment: { backgroundColor: '#CBD5E1' },

  // --- ESTILOS DE LA SECCIÓN DE ROSTERS ---
  rosterSection: { marginTop: 10 },
  rosterToggleWrapper: { flexDirection: 'row', backgroundColor: '#E2E8F0', marginHorizontal: 20, borderRadius: 16, padding: 4, marginBottom: 15 },
  rosterToggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  rosterToggleText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  rosterToggleTextActive: { color: '#FFF', fontWeight: '900' },
  
  rosterListContainer: { paddingHorizontal: 20 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  
  playerJerseyCircle: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  playerJerseyNumber: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  
  playerAvatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 15, borderWidth: 2, borderColor: '#FFF' },
  playerAvatar: { width: '100%', height: '100%' },
  
  playerInfo: { flex: 1 },
  playerName: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  playerPosition: { fontSize: 12, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' },
  
  emptyRoster: { padding: 40, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyRosterText: { marginTop: 15, color: '#94A3B8', fontSize: 14, textAlign: 'center', fontWeight: '600', paddingHorizontal: 20 }
});