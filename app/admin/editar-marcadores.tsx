import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useMatches } from '@/hooks/useMatches';
import { Colors, BRAND_GRADIENT } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Componente individual para cada Fila (así el estado de escribir no laguea toda la lista)
const MatchEditRow = ({ game, currentColors }: any) => {
  const [homeScore, setHomeScore] = useState(game.home_score?.toString() || '0');
  const [awayScore, setAwayScore] = useState(game.away_score?.toString() || '0');
  const [status, setStatus] = useState(game.status?.toLowerCase() || 'programado');
  const [mvp, setMvp] = useState(game.mvp || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('games').update({
        home_score: parseInt(homeScore) || 0,
        away_score: parseInt(awayScore) || 0,
        status: status,
        mvp: mvp
      }).eq('id', game.id);

      if (error) throw error;
      Alert.alert("¡Guardado!", "El partido se actualizó correctamente.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.rowCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
      <Text style={[styles.dateText, { color: currentColors.textSecondary }]}>
        {game.game_date} • {game.category?.toUpperCase()}
      </Text>
      
      {/* 1. MARCADORES */}
      <View style={styles.scoreRow}>
        <Text style={[styles.teamName, { color: currentColors.text }]} numberOfLines={1}>{game.home_team}</Text>
        <TextInput 
          style={[styles.scoreInput, { backgroundColor: currentColors.bgSecondary, color: currentColors.text }]} 
          value={homeScore} 
          onChangeText={setHomeScore} 
          keyboardType="numeric" 
        />
        <Text style={{ marginHorizontal: 10, color: currentColors.textMuted }}>VS</Text>
        <TextInput 
          style={[styles.scoreInput, { backgroundColor: currentColors.bgSecondary, color: currentColors.text }]} 
          value={awayScore} 
          onChangeText={setAwayScore} 
          keyboardType="numeric" 
        />
        <Text style={[styles.teamName, { color: currentColors.text, textAlign: 'right' }]} numberOfLines={1}>{game.away_team}</Text>
      </View>

      {/* 2. MVP DEL PARTIDO */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: currentColors.textMuted }]}>MVP del Partido:</Text>
        <TextInput 
          style={[styles.textInput, { backgroundColor: currentColors.bgSecondary, color: currentColors.text }]} 
          value={mvp} 
          onChangeText={setMvp} 
          placeholder="Nombre del jugador MVP..."
          placeholderTextColor={currentColors.textMuted}
        />
      </View>

      {/* 3. ESTADO DEL JUEGO */}
      <Text style={[styles.label, { color: currentColors.textMuted, marginTop: 15 }]}>Estado del Partido:</Text>
      <View style={styles.statusRow}>
        <Pressable 
          style={[styles.statusBtn, status === 'programado' ? { backgroundColor: '#3B82F6' } : { backgroundColor: currentColors.bgSecondary }]} 
          onPress={() => setStatus('programado')}
        >
          <Text style={[styles.statusBtnText, { color: status === 'programado' ? '#FFF' : currentColors.textMuted }]}>Programado</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.statusBtn, status === 'en vivo' || status === 'en_vivo' ? { backgroundColor: '#EF4444' } : { backgroundColor: currentColors.bgSecondary }]} 
          onPress={() => setStatus('en vivo')}
        >
          <Text style={[styles.statusBtnText, { color: status === 'en vivo' || status === 'en_vivo' ? '#FFF' : currentColors.textMuted }]}>En Vivo</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.statusBtn, status === 'finalizado' ? { backgroundColor: '#10B981' } : { backgroundColor: currentColors.bgSecondary }]} 
          onPress={() => setStatus('finalizado')}
        >
          <Text style={[styles.statusBtnText, { color: status === 'finalizado' ? '#FFF' : currentColors.textMuted }]}>Finalizado</Text>
        </Pressable>
      </View>

      {/* BOTÓN ACTUALIZAR */}
      <View style={styles.actionRow}>
        <Pressable style={[styles.saveBtn, { backgroundColor: BRAND_GRADIENT[0] }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Actualizar Juego</Text>}
        </Pressable>
      </View>
    </View>
  );
};

export default function EditarMarcadoresScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  
  const { data: matches, isLoading } = useMatches();

  // Ordenamos para que los juegos más recientes salgan primero
  const sortedMatches = matches?.sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime()) || [];

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: currentColors.card, borderBottomColor: currentColors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={currentColors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>Editor Rápido</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={BRAND_GRADIENT[0]} /></View>
      ) : (
        <FlatList
          data={sortedMatches}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 15, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <MatchEditRow game={item} currentColors={currentColors} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  backBtn: { padding: 5, marginLeft: -5 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  rowCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  dateText: { fontSize: 11, fontWeight: '800', marginBottom: 15, letterSpacing: 0.5 },
  
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  teamName: { flex: 1, fontSize: 14, fontWeight: '800' },
  scoreInput: { width: 55, height: 50, borderRadius: 12, textAlign: 'center', fontSize: 20, fontWeight: '900' },
  
  inputGroup: { marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: { paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10, fontSize: 14, fontWeight: '600' },

  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 5 },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusBtnText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  
  actionRow: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 15, marginTop: 15 },
  saveBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});