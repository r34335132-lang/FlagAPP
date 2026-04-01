import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, FlatList, ActivityIndicator, Alert, Switch, useColorScheme, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useMatches } from '@/hooks/useMatches';
import { useTeams } from '@/hooks/useTeams';
import { Colors, BRAND_GRADIENT } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Player {
  id: number;
  name: string;
  jersey_number?: string;
  photo_url?: string;
  team_id: number;
}

export default function AsistenciaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  
  const { data: matches, isLoading: loadingMatches } = useMatches();
  const { data: teams, isLoading: loadingTeams } = useTeams();

  // Estados
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, boolean>>({});
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filtrar solo partidos activos
  const activeMatches = matches?.filter(m => 
    m.status?.toLowerCase() !== 'finalizado'
  ).sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime()) || [];

  // Cargar Jugadores y Asistencia cuando se selecciona un juego
  useEffect(() => {
    if (!selectedGame || !teams) return;

    const loadGameData = async () => {
      setLoadingData(true);
      try {
        // 1. Buscar los IDs de los equipos
        const homeTeamObj = teams.find(t => t.name === selectedGame.home_team);
        const awayTeamObj = teams.find(t => t.name === selectedGame.away_team);

        if (!homeTeamObj || !awayTeamObj) {
          Alert.alert("Error", "No se encontraron los equipos en la base de datos.");
          return;
        }

        // 2. Traer todos los jugadores de ambos equipos
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .in('team_id', [homeTeamObj.id, awayTeamObj.id]);

        if (playersError) throw playersError;
        setPlayers(playersData || []);

        // 3. Traer la asistencia previa (si existe) DESDE game_attendance
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('game_attendance')
          .select('*')
          .eq('game_id', selectedGame.id);

        if (attendanceError) throw attendanceError;

        // 4. Mapear la asistencia actual
        const map: Record<number, boolean> = {};
        if (attendanceData) {
          attendanceData.forEach(record => {
            map[record.player_id] = record.attended;
          });
        }
        setAttendanceMap(map);

      } catch (error: any) {
        Alert.alert("Error", "Hubo un problema al cargar los rosters.");
        console.error(error);
      } finally {
        setLoadingData(false);
      }
    };

    loadGameData();
  }, [selectedGame, teams]);

  const toggleAttendance = (playerId: number) => {
    setAttendanceMap(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
  };

  const handleSave = async () => {
    if (!selectedGame) return;
    setSaving(true);
    try {
      // Preparamos el arreglo de datos para Supabase
      const upsertData = players.map(p => ({
        game_id: selectedGame.id,
        player_id: p.id,
        attended: attendanceMap[p.id] || false
      }));

      // Borramos la asistencia vieja e insertamos la nueva en game_attendance
      await supabase.from('game_attendance').delete().eq('game_id', selectedGame.id);
      const { error } = await supabase.from('game_attendance').insert(upsertData);

      if (error) throw error;
      Alert.alert("¡Listo!", "Asistencia guardada correctamente.");
    } catch (error: any) {
      Alert.alert("Error", "No se pudo guardar la asistencia.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Separar jugadores por equipo
  const homeTeamObj = teams?.find(t => t.name === selectedGame?.home_team);
  const awayTeamObj = teams?.find(t => t.name === selectedGame?.away_team);
  
  const homePlayers = players.filter(p => p.team_id === homeTeamObj?.id);
  const awayPlayers = players.filter(p => p.team_id === awayTeamObj?.id);

  const renderPlayerRow = (player: Player) => {
    const isAttended = attendanceMap[player.id] || false;
    return (
      <Pressable 
        key={player.id} 
        style={[styles.playerRow, { backgroundColor: isAttended ? 'rgba(16, 185, 129, 0.1)' : currentColors.bgSecondary, borderColor: isAttended ? '#10B981' : currentColors.borderLight }]}
        onPress={() => toggleAttendance(player.id)}
      >
        <View style={styles.playerInfo}>
          <View style={[styles.avatar, { backgroundColor: currentColors.card }]}>
            {player.photo_url ? (
              <Image source={{ uri: player.photo_url }} style={styles.avatarImage} />
            ) : (
              <Text style={{ color: currentColors.textMuted, fontWeight: '800' }}>{player.jersey_number || '?'}</Text>
            )}
          </View>
          <View>
            <Text style={[styles.playerName, { color: currentColors.text }]} numberOfLines={1}>{player.name}</Text>
            <Text style={{ color: currentColors.textMuted, fontSize: 11 }}>Jersey: #{player.jersey_number || 'N/A'}</Text>
          </View>
        </View>
        <Switch 
          value={isAttended} 
          onValueChange={() => toggleAttendance(player.id)} 
          trackColor={{ false: '#CBD5E1', true: '#10B981' }} 
        />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: currentColors.card, borderBottomColor: currentColors.border }]}>
        {/* 🔥 SOLUCIÓN AL CRASH DEL BOTÓN ATRÁS 🔥 */}
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
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>Pase de Lista</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <Text style={[styles.label, { color: currentColors.textMuted }]}>1. Selecciona el Partido</Text>
        <Pressable style={[styles.selectorBtn, { backgroundColor: currentColors.card, borderColor: currentColors.border }]} onPress={() => setModalVisible(true)}>
          <Text style={{ color: selectedGame ? currentColors.text : currentColors.textMuted, fontWeight: '700', fontSize: 15 }}>
            {selectedGame ? `${selectedGame.home_team} vs ${selectedGame.away_team}` : 'Elegir partido...'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={currentColors.textMuted} />
        </Pressable>

        {loadingData ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color={BRAND_GRADIENT[0]} /><Text style={{color: currentColors.textMuted, marginTop: 10}}>Cargando Roster...</Text></View>
        ) : selectedGame && players.length > 0 ? (
          <>
            {/* TEAM LOCAL */}
            <View style={styles.teamSection}>
              <View style={styles.teamHeaderRow}>
                <View style={[styles.badge, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}><Text style={[styles.badgeText, { color: '#3B82F6' }]}>LOCAL</Text></View>
                <Text style={[styles.teamSectionTitle, { color: currentColors.text }]}>{selectedGame.home_team}</Text>
              </View>
              {homePlayers.map(renderPlayerRow)}
              {homePlayers.length === 0 && <Text style={{color: currentColors.textMuted, marginLeft: 10}}>No hay jugadores registrados.</Text>}
            </View>

            {/* TEAM VISITANTE */}
            <View style={styles.teamSection}>
              <View style={styles.teamHeaderRow}>
                <View style={[styles.badge, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}><Text style={[styles.badgeText, { color: '#F97316' }]}>VISITANTE</Text></View>
                <Text style={[styles.teamSectionTitle, { color: currentColors.text }]}>{selectedGame.away_team}</Text>
              </View>
              {awayPlayers.map(renderPlayerRow)}
              {awayPlayers.length === 0 && <Text style={{color: currentColors.textMuted, marginLeft: 10}}>No hay jugadores registrados.</Text>}
            </View>

            <Pressable style={[styles.saveBtn, { backgroundColor: '#10B981' }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar Asistencia</Text>}
            </Pressable>
          </>
        ) : selectedGame && players.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={{color: currentColors.textMuted}}>No se encontraron jugadores para estos equipos.</Text>
          </View>
        ) : null}

      </ScrollView>

      {/* MODAL DE PARTIDOS */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.bg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currentColors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>Elige el Partido</Text>
              <Pressable onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color={currentColors.text} /></Pressable>
            </View>
            <FlatList
              data={activeMatches}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Pressable 
                  style={[styles.modalRow, { borderBottomColor: currentColors.borderLight }]} 
                  onPress={() => { setSelectedGame(item); setModalVisible(false); }}
                >
                  <Text style={[styles.modalRowText, { color: currentColors.text }]}>{item.home_team} vs {item.away_team}</Text>
                  <Text style={{ fontSize: 11, color: currentColors.textMuted }}>{item.category} • {item.game_date}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={{ padding: 20, textAlign: 'center', color: currentColors.textMuted }}>No hay partidos activos.</Text>}
            />
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
  selectorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  
  loadingContainer: { marginTop: 40, alignItems: 'center' },
  
  teamSection: { marginBottom: 25 },
  teamHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  teamSectionTitle: { fontSize: 18, fontWeight: '800' },
  
  playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  playerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  playerName: { fontSize: 15, fontWeight: '700', paddingRight: 10 },
  
  saveBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10, shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 15, borderBottomWidth: 1, marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalRow: { paddingVertical: 15, borderBottomWidth: 1 },
  modalRowText: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
});