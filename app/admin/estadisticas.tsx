import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, FlatList, ActivityIndicator, Alert, useColorScheme, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useMatches } from '@/hooks/useMatches';
import { useTeams } from '@/hooks/useTeams';
import { Colors, BRAND_GRADIENT } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminStatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  
  const { data: matches, isLoading: loadingMatches } = useMatches();
  const { data: teams } = useTeams();

  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [gameModalVisible, setGameModalVisible] = useState(false);
  
  const [players, setPlayers] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [stats, setStats] = useState({ 
    touchdowns_totales: 0, 
    pases_completos: 0, 
    intercepciones: 0, 
    sacks: 0
  });
  
  // Estados para los MVPs de la tabla oficial 'mvps'
  const [isGameMVP, setIsGameMVP] = useState(false);
  const [isWeeklyMVP, setIsWeeklyMVP] = useState(false);
  const [saving, setSaving] = useState(false);

  const recentMatches = matches?.sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime()) || [];

  // Cargar jugadores cuando cambia el juego
  useEffect(() => {
    if (!selectedGame?.id || !teams) return;

    const homeTeamObj = teams.find(t => t.name === selectedGame.home_team);
    const awayTeamObj = teams.find(t => t.name === selectedGame.away_team);
    if (!homeTeamObj || !awayTeamObj) return;

    if (players.length > 0 && (players[0].team_id === homeTeamObj.id || players[0].team_id === awayTeamObj.id)) {
      return;
    }

    const loadPlayers = async () => {
      setLoadingPlayers(true);
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .in('team_id', [homeTeamObj.id, awayTeamObj.id]);

        if (error) throw error;
        setPlayers(data || []);
      } catch (error: any) {
        Alert.alert("Error", "No se pudo cargar el roster.");
      } finally {
        setLoadingPlayers(false);
      }
    };

    loadPlayers();
  }, [selectedGame?.id, teams]);

  // ABRIR EDITOR DEL JUGADOR
  const openPlayerEditor = async (player: any) => {
    setSelectedPlayer(player);
    
    // Reseteamos visualmente mientras carga
    setStats({ touchdowns_totales: 0, pases_completos: 0, intercepciones: 0, sacks: 0 });
    setIsGameMVP(false);
    setIsWeeklyMVP(false);

    try {
      // 1. Cargar Stats de ese juego
      const { data: statsData } = await supabase
        .from('player_game_stats')
        .select('*')
        .eq('player_id', player.id)
        .eq('game_id', selectedGame.id)
        .maybeSingle(); 

      if (statsData) {
        setStats({
          touchdowns_totales: statsData.touchdowns_totales || 0,
          pases_completos: statsData.pases_completos || 0,
          intercepciones: statsData.intercepciones || 0,
          sacks: statsData.sacks || 0,
        });
      }

      // 2. Cargar MVPs desde la tabla OFICIAL (mvps)
      const { data: mvpData } = await supabase
        .from('mvps')
        .select('mvp_type')
        .eq('player_id', player.id)
        .eq('category', selectedGame.category)
        .eq('week_number', selectedGame.jornada || 1);

      if (mvpData && mvpData.length > 0) {
        const types = mvpData.map(m => m.mvp_type);
        if (types.includes('game')) setIsGameMVP(true);
        if (types.includes('weekly')) setIsWeeklyMVP(true);
      }

    } catch (err) {
      console.error("Error cargando datos del jugador:", err);
    }
  };

  // GUARDAR ESTADÍSTICAS Y MVPs
  const handleSaveStats = async () => {
    if (!selectedPlayer || !selectedGame) return;
    setSaving(true);

    const season = selectedGame.season || '2026';
    const weekNumber = selectedGame.jornada || 1;
    const category = selectedGame.category || 'Varonil-libre';

    try {
      // 1. GUARDAR STATS DE JUEGO
      const { error: statsError } = await supabase.from('player_game_stats').upsert({
        player_id: selectedPlayer.id,
        game_id: selectedGame.id,
        team_id: selectedPlayer.team_id,
        touchdowns_totales: stats.touchdowns_totales,
        pases_completos: stats.pases_completos,
        intercepciones: stats.intercepciones,
        sacks: stats.sacks
      }, { onConflict: 'player_id,game_id' }); 

      if (statsError) throw new Error(`Stats Error: ${statsError.message}`);

      // 2. GUARDAR / BORRAR MVP SEMANAL
      if (isWeeklyMVP) {
        // Borramos a los anteriores de esta categoría y semana para respetar tu regla Unique
        await supabase.from('mvps').delete().match({ season, category, week_number: weekNumber, mvp_type: 'weekly' });
        
        await supabase.from('mvps').insert({
          player_id: selectedPlayer.id, season, category, week_number: weekNumber, mvp_type: 'weekly'
        });
      } else {
        await supabase.from('mvps').delete().match({
          player_id: selectedPlayer.id, season, category, week_number: weekNumber, mvp_type: 'weekly'
        });
      }

      // 3. GUARDAR / BORRAR MVP DEL PARTIDO
      if (isGameMVP) {
        // Revisar si ya lo tiene para no duplicar
        const { data: existingGameMvp } = await supabase.from('mvps').select('id').match({
          player_id: selectedPlayer.id, season, category, week_number: weekNumber, mvp_type: 'game'
        });
        
        if (!existingGameMvp || existingGameMvp.length === 0) {
          await supabase.from('mvps').insert({
            player_id: selectedPlayer.id, season, category, week_number: weekNumber, mvp_type: 'game'
          });
        }
      } else {
        await supabase.from('mvps').delete().match({
          player_id: selectedPlayer.id, season, category, week_number: weekNumber, mvp_type: 'game'
        });
      }
      
      Alert.alert("¡Guardado!", `Estadísticas de ${selectedPlayer.name} subidas a la plataforma.`);
      setSelectedPlayer(null); // Cierra el editor y mantiene la lista de jugadores intacta
    } catch (err: any) {
      Alert.alert("Error al guardar", err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateStat = (key: keyof typeof stats, increment: number) => {
    setStats(prev => ({ ...prev, [key]: Math.max(0, prev[key] + increment) }));
  };

  const StatControl = ({ label, statKey, icon }: { label: string, statKey: keyof typeof stats, icon: string }) => (
    <View style={[styles.statControl, { borderBottomColor: currentColors.borderLight }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <Text style={[styles.statLabel, { color: currentColors.text }]}>{label}</Text>
      </View>
      <View style={styles.counterRow}>
        <Pressable style={[styles.counterBtn, { backgroundColor: currentColors.bgSecondary }]} onPress={() => updateStat(statKey, -1)}>
          <Ionicons name="remove" size={20} color={currentColors.text} />
        </Pressable>
        <Text style={[styles.statValue, { color: currentColors.text }]}>{stats[statKey]}</Text>
        <Pressable style={[styles.counterBtn, { backgroundColor: currentColors.bgSecondary }]} onPress={() => updateStat(statKey, 1)}>
          <Ionicons name="add" size={20} color={currentColors.text} />
        </Pressable>
      </View>
    </View>
  );

  const homeTeamObj = teams?.find(t => t.name === selectedGame?.home_team);
  const awayTeamObj = teams?.find(t => t.name === selectedGame?.away_team);

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: currentColors.card, borderBottomColor: currentColors.border }]}>
        {/* 🔥 AQUÍ ESTÁ EL BOTÓN DE ATRÁS CORREGIDO 🔥 */}
        <Pressable 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/admin');
            }
          }} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={currentColors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>Registro de Estadísticas</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <Text style={[styles.label, { color: currentColors.textMuted }]}>1. Selecciona el Partido</Text>
        <Pressable style={[styles.selectorBtn, { backgroundColor: currentColors.card, borderColor: currentColors.border }]} onPress={() => setGameModalVisible(true)}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: selectedGame ? currentColors.text : currentColors.textMuted, fontWeight: '700', fontSize: 15 }}>
              {selectedGame ? `${selectedGame.home_team} vs ${selectedGame.away_team}` : 'Elegir partido...'}
            </Text>
            {selectedGame && <Text style={{ fontSize: 12, color: currentColors.textSecondary, marginTop: 4 }}>Jornada {selectedGame.jornada || 1} • {selectedGame.category} • Campo {selectedGame.field}</Text>}
          </View>
          <Ionicons name="chevron-down" size={20} color={currentColors.textMuted} />
        </Pressable>

        {loadingPlayers ? (
          <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} style={{ marginTop: 40 }} />
        ) : selectedGame && players.length > 0 ? (
          <>
            <Text style={[styles.label, { color: currentColors.textMuted, marginTop: 10 }]}>2. Selecciona un Jugador</Text>
            
            {/* LOCALES */}
            <View style={styles.teamSection}>
              <View style={[styles.teamHeaderRow, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Text style={[styles.teamSectionTitle, { color: '#3B82F6' }]}>{selectedGame.home_team}</Text>
              </View>
              {players.filter(p => p.team_id === homeTeamObj?.id).map(p => (
                <Pressable key={p.id} style={[styles.playerRow, { backgroundColor: currentColors.card, borderBottomColor: currentColors.borderLight }]} onPress={() => openPlayerEditor(p)}>
                  <Text style={[styles.playerJersey, { color: currentColors.textMuted }]}>#{p.jersey_number || '-'}</Text>
                  <Text style={[styles.playerName, { color: currentColors.text }]} numberOfLines={1}>{p.name}</Text>
                  <Ionicons name="create-outline" size={20} color={currentColors.textMuted} />
                </Pressable>
              ))}
            </View>

            {/* VISITANTES */}
            <View style={styles.teamSection}>
              <View style={[styles.teamHeaderRow, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
                <Text style={[styles.teamSectionTitle, { color: '#F97316' }]}>{selectedGame.away_team}</Text>
              </View>
              {players.filter(p => p.team_id === awayTeamObj?.id).map(p => (
                <Pressable key={p.id} style={[styles.playerRow, { backgroundColor: currentColors.card, borderBottomColor: currentColors.borderLight }]} onPress={() => openPlayerEditor(p)}>
                  <Text style={[styles.playerJersey, { color: currentColors.textMuted }]}>#{p.jersey_number || '-'}</Text>
                  <Text style={[styles.playerName, { color: currentColors.text }]} numberOfLines={1}>{p.name}</Text>
                  <Ionicons name="create-outline" size={20} color={currentColors.textMuted} />
                </Pressable>
              ))}
            </View>
          </>
        ) : !selectedGame ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: currentColors.textMuted }}>Abre el menú y selecciona un partido.</Text>
        ) : null}
      </ScrollView>

      {/* MODAL DE PARTIDOS */}
      <Modal visible={gameModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.bg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currentColors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>Elige el Partido</Text>
              <Pressable onPress={() => setGameModalVisible(false)}><Ionicons name="close" size={24} color={currentColors.text} /></Pressable>
            </View>
            <FlatList
              data={recentMatches}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable 
                  style={[styles.modalRow, { borderBottomColor: currentColors.borderLight }]} 
                  onPress={() => { 
                    if(selectedGame?.id !== item.id) {
                      setSelectedGame(item);
                      setPlayers([]); // Limpia la lista anterior
                    }
                    setGameModalVisible(false); 
                  }}
                >
                  <Text style={[styles.modalRowText, { color: currentColors.text }]}>{item.home_team} vs {item.away_team}</Text>
                  <Text style={{ fontSize: 12, color: currentColors.textMuted }}>Jornada {item.jornada || 1} • {item.category}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL EDITOR DE ESTADÍSTICAS Y MVPs */}
      <Modal visible={!!selectedPlayer} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.editorContent, { backgroundColor: currentColors.bg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currentColors.borderLight, marginBottom: 5 }]}>
              <View>
                <Text style={[styles.modalTitle, { color: currentColors.text, fontSize: 22 }]}>{selectedPlayer?.name}</Text>
                <Text style={{ color: currentColors.textSecondary, fontWeight: '700' }}>#{selectedPlayer?.jersey_number || '-'} • {selectedGame?.category}</Text>
              </View>
              <Pressable onPress={() => setSelectedPlayer(null)}><Ionicons name="close-circle" size={32} color={currentColors.textMuted} /></Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={styles.statsList}>
                <StatControl label="Anotaciones (TD)" statKey="touchdowns_totales" icon="🏈" />
                <StatControl label="Pases Completos" statKey="pases_completos" icon="🎯" />
                <StatControl label="Intercepciones" statKey="intercepciones" icon="🤲" />
                <StatControl label="Sacks" statKey="sacks" icon="💥" />
              </View>

              <Text style={[styles.label, { color: currentColors.textMuted, marginTop: 10, marginBottom: 15 }]}>Reconocimientos Oficiales</Text>
              
              <Pressable 
                style={[styles.mvpBtn, isGameMVP ? { backgroundColor: '#3B82F6', borderColor: '#3B82F6' } : { backgroundColor: 'transparent', borderColor: currentColors.border }]} 
                onPress={() => setIsGameMVP(!isGameMVP)}
              >
                <Ionicons name={isGameMVP ? "medal" : "medal-outline"} size={22} color={isGameMVP ? "#FFF" : currentColors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mvpBtnText, { color: isGameMVP ? "#FFF" : currentColors.text }]}>MVP del Partido</Text>
                  <Text style={{ color: isGameMVP ? 'rgba(255,255,255,0.8)' : currentColors.textMuted, fontSize: 11 }}>Mejor jugador de este juego</Text>
                </View>
              </Pressable>

              <Pressable 
                style={[styles.mvpBtn, isWeeklyMVP ? { backgroundColor: '#F59E0B', borderColor: '#F59E0B' } : { backgroundColor: 'transparent', borderColor: currentColors.border }]} 
                onPress={() => setIsWeeklyMVP(!isWeeklyMVP)}
              >
                <Ionicons name={isWeeklyMVP ? "star" : "star-outline"} size={22} color={isWeeklyMVP ? "#FFF" : currentColors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mvpBtnText, { color: isWeeklyMVP ? "#FFF" : currentColors.text }]}>MVP Semanal (Jornada {selectedGame?.jornada || 1})</Text>
                  <Text style={{ color: isWeeklyMVP ? 'rgba(255,255,255,0.8)' : currentColors.textMuted, fontSize: 11 }}>Destacado en {selectedGame?.category}</Text>
                </View>
              </Pressable>

            </ScrollView>

            <View style={{ paddingVertical: 15, borderTopWidth: 1, borderTopColor: currentColors.borderLight }}>
              <Pressable style={[styles.saveBtn, { backgroundColor: BRAND_GRADIENT[0] }]} onPress={handleSaveStats} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  backBtn: { padding: 5, marginLeft: -5 },
  content: { padding: 20 },
  
  label: { fontSize: 12, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase' },
  selectorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  
  teamSection: { marginBottom: 20, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  teamHeaderRow: { paddingHorizontal: 15, paddingVertical: 12 },
  teamSectionTitle: { fontSize: 15, fontWeight: '900', textTransform: 'uppercase' },
  playerRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  playerJersey: { fontSize: 15, fontWeight: '900', width: 45 },
  playerName: { fontSize: 15, fontWeight: '700', flex: 1 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { height: '65%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  editorContent: { height: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 15, borderBottomWidth: 1, marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalRow: { paddingVertical: 15, borderBottomWidth: 1 },
  modalRowText: { fontSize: 15, fontWeight: '800', marginBottom: 4 },

  statsList: { marginBottom: 15, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 16, padding: 15 },
  statControl: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  statLabel: { fontSize: 15, fontWeight: '700' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  counterBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', width: 35, textAlign: 'center' },
  
  mvpBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  mvpBtnText: { fontSize: 16, fontWeight: '900' },
  
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 4 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});