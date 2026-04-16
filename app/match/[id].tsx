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
  useColorScheme,
  useWindowDimensions,
  Animated,
  Easing
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { supabase } from "@/lib/supabase";
import { BRAND_GRADIENT, Colors } from "@/constants/colors"; 
import { useHeadToHead } from "@/hooks/useTeams"; 

import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ANIMACIONES
// ─────────────────────────────────────────────────────────────────────────────
const FadeInView = ({ children, delay = 0 }: { children: any, delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) })
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

const LivePulse = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. CRONÓMETRO EN VIVO
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// 3. PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // 🔥 Soporte para Tablets 🔥
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [game, setGame] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [activeRoster, setActiveRoster] = useState<"home" | "away">("home");

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  const scoreboardRef = useRef<ViewShot>(null);
  const timeDisplay = useLiveTimer(game);

  useEffect(() => {
    fetchData();
    if (!id) return;

    const subscription = supabase
      .channel(`game-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${id}` }, 
        (payload) => setGame(payload.new)
      )
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: gameData } = await supabase.from("games").select("*").eq("id", id).single();
      
      if (gameData) {
        const { data: teamsData } = await supabase
          .from("teams")
          .select("*")
          .in("name", [gameData.home_team, gameData.away_team]);
        
        setGame(gameData);
        setTeams(teamsData || []);

        if (teamsData && teamsData.length > 0) {
          const teamIds = teamsData.map(t => t.id);
          const { data: playersData } = await supabase
            .from("players")
            .select("*")
            .in("team_id", teamIds)
            .order("jersey_number", { ascending: true });
          
          setPlayers(playersData || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const { data: h2h } = useHeadToHead(game?.home_team, game?.away_team);

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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  if (loading || !game) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: currentColors.bg }]}>
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

  const homeRoster = players.filter(p => p.team_id === homeTeam?.id);
  const awayRoster = players.filter(p => p.team_id === awayTeam?.id);
  const currentDisplayRoster = activeRoster === "home" ? homeRoster : awayRoster;
  
  const homeColor = homeTeam?.color1 || BRAND_GRADIENT[0];
  const awayColor = awayTeam?.color1 || currentColors.textMuted;
  const currentTeamColor = activeRoster === "home" ? homeColor : awayColor;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* BOTONES FLOTANTES DE CRISTAL */}
      <View style={[styles.floatingHeader, { top: insets.top + 10 }, isTablet && styles.floatingHeaderTablet]}>
        <Pressable onPress={handleBack}>
          <BlurView intensity={80} tint="dark" style={styles.floatingBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </BlurView>
        </Pressable>
        <Pressable onPress={handleShare}>
          <BlurView intensity={80} tint="dark" style={styles.floatingBtn}>
            <Ionicons name="share-social" size={22} color="#FFF" />
          </BlurView>
        </Pressable>
      </View>

      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        
        {/* --- ÁREA COMPARTIBLE (MARCADOR Y ANÁLISIS) --- */}
        <ViewShot 
          ref={scoreboardRef} 
          options={{ format: "jpg", quality: 0.9 }} 
          style={{ backgroundColor: currentColors.bg, paddingBottom: 15 }}
        >
          {/* HEADER DEL MARCADOR */}
          <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={[styles.scoreboard, { paddingTop: insets.top + 65 }]}>
            <View style={styles.contentWrapper}>
              <View style={styles.statusContainer}>
                {isLive ? (
                  <View style={styles.statusBadgeLive}>
                    <LivePulse />
                    <Text style={styles.statusTextLive}>{timeDisplay}</Text>
                  </View>
                ) : (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{timeDisplay}</Text>
                  </View>
                )}
                <Text style={styles.categoryHeader}>{game.category?.toUpperCase()} • {game.match_type?.toUpperCase()}</Text>
              </View>

              <View style={styles.teamsMainRow}>
                <View style={styles.teamBrand}>
                  <View style={styles.logoCircleFixed}>
                    <Image source={{ uri: homeTeam?.logo_url || "https://via.placeholder.com/100" }} style={styles.mainLogo} resizeMode="contain" />
                  </View>
                  <Text style={styles.teamNameMain}>{game.home_team}</Text>
                </View>

                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreNumber}>{hScore}</Text>
                  <Text style={styles.scoreDivider}>-</Text>
                  <Text style={styles.scoreNumber}>{aScore}</Text>
                </View>

                <View style={styles.teamBrand}>
                  <View style={styles.logoCircleFixed}>
                    <Image source={{ uri: awayTeam?.logo_url || "https://via.placeholder.com/100" }} style={styles.mainLogo} resizeMode="contain" />
                  </View>
                  <Text style={styles.teamNameMain}>{game.away_team}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* CONTENIDO DEL PARTIDO */}
          <View style={[styles.content, styles.contentWrapper]}>
            <FadeInView delay={100}>
              <View style={[styles.infoCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: theme === 'dark' ? '#000' : '#475569' }]}>
                 <View style={styles.infoRow}>
                    <View style={[styles.iconCircle, { backgroundColor: currentColors.bgSecondary }]}><Ionicons name="location" size={20} color={BRAND_GRADIENT[0]} /></View>
                    <View style={{flex: 1}}>
                      <Text style={[styles.infoLabel, { color: currentColors.textMuted }]}>Sede y Campo</Text>
                      <Text style={[styles.infoValue, { color: currentColors.text }]}>{game.venue || "Sede TBD"} • {game.field || "Campo TBD"}</Text>
                    </View>
                 </View>
                 <View style={[styles.divider, { backgroundColor: currentColors.borderLight }]} />
                 <View style={styles.infoRow}>
                    <View style={[styles.iconCircle, { backgroundColor: currentColors.bgSecondary }]}><Ionicons name="calendar" size={20} color={BRAND_GRADIENT[0]} /></View>
                    <View style={{flex: 1}}>
                      <Text style={[styles.infoLabel, { color: currentColors.textMuted }]}>Fecha y Hora</Text>
                      <Text style={[styles.infoValue, { color: currentColors.text }]}>
                        {game.game_date ? new Date(game.game_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Fecha TBD'} • {game.game_time?.substring(0,5)} hrs
                      </Text>
                    </View>
                 </View>
              </View>

              {game.mvp && (
                <LinearGradient 
                  colors={theme === 'dark' ? ['#78350F', currentColors.card] : ['#FFFBEB', '#FFFFFF']} 
                  style={[styles.mvpCard, { borderColor: theme === 'dark' ? '#92400E' : '#FDE68A', shadowColor: theme === 'dark' ? '#000' : '#F59E0B' }]}
                >
                  <View style={[styles.mvpIconWrap, { backgroundColor: theme === 'dark' ? '#92400E' : '#FEF3C7' }]}>
                    <Ionicons name="ribbon" size={28} color="#F59E0B" />
                  </View>
                  <View style={{marginLeft: 15, flex: 1}}>
                    <Text style={[styles.mvpTitle, { color: theme === 'dark' ? '#FDE68A' : '#D97706' }]}>MVP DEL PARTIDO</Text>
                    <Text style={[styles.mvpName, { color: theme === 'dark' ? '#FFF' : '#92400E' }]}>{game.mvp}</Text>
                  </View>
                  <Ionicons name="star" size={20} color="#F59E0B" />
                </LinearGradient>
              )}

              {/* ESTADÍSTICAS DEL MARCADOR */}
              <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Análisis de Anotaciones</Text>
              <View style={[styles.statsCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: theme === 'dark' ? '#000' : '#475569' }]}>
                <StatBar label="Touchdowns (6 pts)" home={hTDs} away={aTDs} colors={currentColors} />
                <StatBar label="Extras / Safeties" home={hExtra} away={aExtra} colors={currentColors} />

                <View style={[styles.efficiencyContainer, { borderTopColor: currentColors.borderLight }]}>
                   <View style={styles.fullBar}>
                      <View style={[styles.homeSegment, { flex: hScore || 1 }]} />
                      <View style={[styles.awaySegment, { flex: aScore || 1, backgroundColor: currentColors.border }]} />
                   </View>
                </View>
              </View>

              {/* CARA A CARA */}
              {h2h && (
                <>
                  <Text style={[styles.sectionTitle, { color: currentColors.text, marginTop: 25 }]}>Cara a Cara (Historial)</Text>
                  <View style={[styles.h2hCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: theme === 'dark' ? '#000' : '#475569' }]}>
                    {h2h.totalGames === 0 ? (
                      <View style={styles.h2hEmpty}>
                        <Ionicons name="shield-half-outline" size={36} color={currentColors.textMuted} />
                        <Text style={[styles.h2hEmptyText, { color: currentColors.textSecondary }]}>Primer enfrentamiento registrado en la liga.</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.h2hRow}>
                          <View style={styles.h2hTeam}>
                            <Text style={[styles.h2hWins, { color: homeColor }]}>{h2h.team1Wins}</Text>
                            <Text style={[styles.h2hLabel, { color: currentColors.textSecondary }]}>Victorias</Text>
                          </View>
                          
                          <View style={styles.h2hCenter}>
                            <Text style={[styles.h2hTotal, { color: currentColors.text }]}>{h2h.totalGames}</Text>
                            <Text style={[styles.h2hLabel, { color: currentColors.textSecondary }]}>Partidos</Text>
                            {h2h.draws > 0 && <Text style={[styles.h2hDraws, { color: currentColors.textMuted }]}>{h2h.draws} Empates</Text>}
                          </View>

                          <View style={styles.h2hTeam}>
                            <Text style={[styles.h2hWins, { color: awayColor }]}>{h2h.team2Wins}</Text>
                            <Text style={[styles.h2hLabel, { color: currentColors.textSecondary }]}>Victorias</Text>
                          </View>
                        </View>

                        {h2h.lastGame && (
                          <View style={[styles.lastGameBox, { backgroundColor: currentColors.bgSecondary }]}>
                            <Text style={[styles.lastGameTitle, { color: currentColors.textMuted }]}>ÚLTIMO ENFRENTAMIENTO</Text>
                            <Text style={[styles.lastGameResult, { color: currentColors.text }]}>
                              {h2h.lastGame.home_team}  <Text style={{color: BRAND_GRADIENT[0]}}>{h2h.lastGame.home_score}</Text> - <Text style={{color: BRAND_GRADIENT[0]}}>{h2h.lastGame.away_score}</Text>  {h2h.lastGame.away_team}
                            </Text>
                            <Text style={[styles.lastGameDate, { color: currentColors.textSecondary }]}>
                              {new Date(h2h.lastGame.game_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </>
              )}
            </FadeInView>
          </View>
        </ViewShot>

        {/* --- SECCIÓN: ROSTERS (Fuera del ViewShot) --- */}
        <View style={[styles.rosterSection, styles.contentWrapper]}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 20, color: currentColors.text, marginTop: 10 }]}>Alineaciones Oficiales</Text>
          
          <View style={[styles.rosterToggleWrapper, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
            <Pressable 
              style={[styles.rosterToggleBtn, activeRoster === "home" && { backgroundColor: currentColors.card, shadowColor: theme === 'dark' ? '#000' : '#475569' }]}
              onPress={() => setActiveRoster("home")}
            >
              <Text style={[styles.rosterToggleText, { color: currentColors.textSecondary }, activeRoster === "home" && [styles.rosterToggleTextActive, { color: currentColors.text }]]}>
                {game.home_team}
              </Text>
            </Pressable>
            <Pressable 
              style={[styles.rosterToggleBtn, activeRoster === "away" && { backgroundColor: currentColors.card, shadowColor: theme === 'dark' ? '#000' : '#475569' }]}
              onPress={() => setActiveRoster("away")}
            >
              <Text style={[styles.rosterToggleText, { color: currentColors.textSecondary }, activeRoster === "away" && [styles.rosterToggleTextActive, { color: currentColors.text }]]}>
                {game.away_team}
              </Text>
            </Pressable>
          </View>

          <View style={styles.rosterListContainer}>
            {currentDisplayRoster.length > 0 ? (
              currentDisplayRoster.map((player, index) => (
                <FadeInView key={player.id} delay={index * 50}>
                  <View style={[styles.playerRow, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: theme === 'dark' ? '#000' : '#475569' }]}>
                    <View style={[styles.playerJerseyCircle, { backgroundColor: currentTeamColor }]}>
                      <Text style={[styles.playerJerseyNumber, { color: '#FFF' }]}>{player.jersey_number || player.number || "0"}</Text>
                    </View>
                    
                    <View style={[styles.playerAvatarWrap, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
                      {player.photo_url && !player.photo_url.startsWith("blob:") ? (
                        <Image source={{ uri: player.photo_url }} style={styles.playerAvatar} resizeMode="cover" />
                      ) : (
                        <Ionicons name="person" size={20} color={currentColors.textMuted} />
                      )}
                    </View>

                    <View style={styles.playerInfo}>
                      <Text style={[styles.playerName, { color: currentColors.text }]}>{player.name}</Text>
                      <Text style={[styles.playerPosition, { color: currentColors.textSecondary }]}>{player.position || "Jugador"}</Text>
                    </View>
                  </View>
                </FadeInView>
              ))
            ) : (
              <View style={[styles.emptyRoster, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}>
                <Ionicons name="people-outline" size={45} color={currentColors.textMuted} />
                <Text style={[styles.emptyRosterText, { color: currentColors.textMuted }]}>Aún no hay roster oficial cargado para este equipo.</Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES SECUNDARIOS
// ─────────────────────────────────────────────────────────────────────────────
const StatBar = ({ label, home, away, colors }: any) => {
  const total = home + away || 1;
  const homeWidth = (home / total) * 100;
  
  return (
    <View style={{ marginBottom: 22 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={[styles.statNum, { color: colors.text }]}>{home}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.statNum, { color: colors.text }]}>{away}</Text>
      </View>
      <View style={[styles.barBg, { backgroundColor: colors.bgSecondary }]}>
        <View style={[styles.barFill, { width: `${homeWidth}%`, backgroundColor: BRAND_GRADIENT[0] }]} />
        <View style={[styles.barFill, { width: `${100 - homeWidth}%`, backgroundColor: colors.borderLight }]} />
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS PREMIUM
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentWrapper: { width: "100%", maxWidth: 800, alignSelf: "center" },
  
  // Botones Flotantes (Cristal)
  floatingHeader: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 999 },
  floatingHeaderTablet: { width: 800, alignSelf: 'center', left: 'auto', right: 'auto' }, // Ajuste para tablets
  floatingBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  
  scoreboard: { paddingBottom: 45, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: 'center', elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 15 },
  statusContainer: { alignItems: 'center', marginBottom: 25 },
  
  statusBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statusText: { color: '#FFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  
  statusBadgeLive: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FEF2F2', marginBottom: 8, elevation: 4, shadowColor: "#EF4444", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444", marginRight: 8 },
  statusTextLive: { color: "#EF4444", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },

  categoryHeader: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },

  teamsMainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  teamBrand: { flex: 1, alignItems: 'center' },
  
  logoCircleFixed: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFFFFF', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', padding: 5 },
  mainLogo: { width: '100%', height: '100%' },
  teamNameMain: { color: '#FFF', fontWeight: '900', fontSize: 15, marginTop: 14, textAlign: 'center', paddingHorizontal: 5, letterSpacing: -0.5 },
  
  scoreContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 15 },
  scoreNumber: { color: '#FFF', fontSize: 50, fontWeight: '900', letterSpacing: -2 },
  scoreDivider: { color: 'rgba(255,255,255,0.5)', fontSize: 32, marginHorizontal: 10, fontWeight: '300' },

  content: { paddingHorizontal: 20, paddingTop: 25 },
  
  infoCard: { borderRadius: 28, padding: 22, elevation: 3, marginBottom: 20, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '900' },
  divider: { height: 1, marginVertical: 16 },

  mvpCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 28, borderWidth: 1, marginBottom: 25, elevation: 4, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12 },
  mvpIconWrap: { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center" },
  mvpTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 2 },
  mvpName: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },

  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 15, letterSpacing: -0.5 },
  statsCard: { borderRadius: 28, padding: 24, elevation: 3, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
  statNum: { fontSize: 19, fontWeight: '900' },
  statLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  barBg: { height: 10, borderRadius: 5, flexDirection: 'row', overflow: 'hidden' },
  barFill: { height: '100%' },

  efficiencyContainer: { marginTop: 15, paddingTop: 20, borderTopWidth: 1 },
  fullBar: { height: 14, flexDirection: 'row', borderRadius: 7, overflow: 'hidden' },
  homeSegment: { backgroundColor: BRAND_GRADIENT[0] },
  awaySegment: {},

  // H2H
  h2hCard: { borderRadius: 28, padding: 24, borderWidth: 1, marginBottom: 25, elevation: 3, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
  h2hRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, paddingHorizontal: 10 },
  h2hTeam: { alignItems: 'center' },
  h2hWins: { fontSize: 36, fontWeight: '900' },
  h2hCenter: { alignItems: 'center' },
  h2hTotal: { fontSize: 18, fontWeight: '900' },
  h2hLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 },
  h2hDraws: { fontSize: 11, fontWeight: '900', marginTop: 8 },
  lastGameBox: { padding: 18, borderRadius: 20, alignItems: 'center' },
  lastGameTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  lastGameResult: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  lastGameDate: { fontSize: 13, fontWeight: '700' },
  h2hEmpty: { padding: 25, alignItems: 'center' },
  h2hEmptyText: { marginTop: 12, fontSize: 14, fontWeight: '700', textAlign: 'center' },

  // Roster
  rosterSection: { marginTop: 10 },
  rosterToggleWrapper: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 24, padding: 6, marginBottom: 20, borderWidth: 1 },
  rosterToggleBtn: { flex: 1, paddingVertical: 14, borderRadius: 18, alignItems: 'center', elevation: 0 },
  rosterToggleText: { fontSize: 14, fontWeight: '800' },
  rosterToggleTextActive: { fontWeight: '900' },
  
  rosterListContainer: { paddingHorizontal: 20 },
  playerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 24, marginBottom: 12, borderWidth: 1, elevation: 2, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 },
  
  playerJerseyCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  playerJerseyNumber: { fontSize: 18, fontWeight: '900' },
  
  playerAvatarWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 15, borderWidth: 2 },
  playerAvatar: { width: '100%', height: '100%' },
  
  playerInfo: { flex: 1 },
  playerName: { fontSize: 16, fontWeight: '900', marginBottom: 3, letterSpacing: -0.3 },
  playerPosition: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  emptyRoster: { padding: 40, alignItems: 'center', borderRadius: 32, borderWidth: 2, borderStyle: 'dashed' },
  emptyRosterText: { marginTop: 15, fontSize: 14, textAlign: 'center', fontWeight: '700', paddingHorizontal: 20, lineHeight: 22 }
});