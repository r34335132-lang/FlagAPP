import React, { useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, 
  ActivityIndicator, Modal, FlatList, useColorScheme, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTeams } from '@/hooks/useTeams';
import { Colors, BRAND_GRADIENT } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIAS_OFICIALES = [
  'Varonil-libre', 'Varonil-Gold', 'Varonil-Silver', 'Varonil-Copper',
  'Femenil-Gold', 'Femenil-Silver', 'Femenil-Copper',
  'Mixto-Gold', 'Mixto-Silver', 'Mixto-Copper',
  'Teens'
];

const CAMPOS_OFICIALES = ['A', 'B', 'C', 'D', 'TBD'];

export default function AgregarPartidoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  
  const { data: teams } = useTeams();

  // Estados del Formulario
  const [category, setCategory] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  
  // Detalles del partido
  const [date, setDate] = useState(''); 
  const [time, setTime] = useState('08:00:00');
  const [field, setField] = useState('');
  const [jornada, setJornada] = useState('1');
  const [venue, setVenue] = useState('');
  
  // 🔥 NUEVOS ESTADOS PARA ÁRBITROS 🔥
  const [referee1, setReferee1] = useState('');
  const [referee2, setReferee2] = useState('');
  
  const [loading, setLoading] = useState(false);

  // Estados para Modal Unificado
  const [modalVisible, setModalVisible] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'home' | 'away' | 'category' | 'field' | null>(null);

  // 🔥 ESTADOS PARA EL CALENDARIO MÁGICO 🔥
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const openModal = (type: 'home' | 'away' | 'category' | 'field') => {
    if ((type === 'home' || type === 'away') && !category) {
      Alert.alert("Aviso", "Primero selecciona una categoría para filtrar los equipos.");
      return;
    }
    setSelectingFor(type);
    setModalVisible(true);
  };

  const handleSelection = (value: string) => {
    if (selectingFor === 'category') {
      setCategory(value);
      setHomeTeam('');
      setAwayTeam('');
    }
    else if (selectingFor === 'home') setHomeTeam(value);
    else if (selectingFor === 'away') setAwayTeam(value);
    else if (selectingFor === 'field') setField(value);
    
    setModalVisible(false);
  };

  const filteredTeams = useMemo(() => {
    if (!teams || !category) return [];
    return teams.filter(t => t.category?.toLowerCase() === category.toLowerCase());
  }, [teams, category]);

  const handleSave = async () => {
    if (!category || !homeTeam || !awayTeam || !date || !time || !field) {
      Alert.alert("Error", "Llena los campos obligatorios (Categoría, Equipos, Fecha, Hora y Campo).");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.from('games').insert({
        category: category.toLowerCase().trim(), // 🔥 MAGIA AQUÍ: Convertimos a minúsculas y quitamos espacios
        home_team: homeTeam,
        away_team: awayTeam,
        game_date: date, 
        game_time: time,
        field: field, 
        venue: venue, 
        referee1: referee1 || null, 
        referee2: referee2 || null,
        jornada: parseInt(jornada) || 1,
        status: 'programado',
        season: 2025,
        game_type: 'flag',
        match_type: 'jornada',
        stage: 'regular'
      });

      if (error) throw error;
      
      Alert.alert("¡Éxito!", "Partido programado correctamente.", [
        { 
          text: "OK", 
          onPress: () => {
            if (router.canGoBack()) router.back();
            else router.replace('/admin');
          } 
        }
      ]);
    } catch (error: any) {
      Alert.alert("Error al programar", error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DEL CALENDARIO ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const renderCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isSelected = date === dateString;
      
      days.push(
        <Pressable 
          key={i} 
          style={[styles.calendarDay, isSelected && styles.calendarDaySelected]}
          onPress={() => {
            setDate(dateString);
            setShowCalendar(false);
          }}
        >
          <Text style={[
            styles.calendarDayText, 
            { color: currentColors.text },
            isSelected && styles.calendarDayTextSelected
          ]}>{i}</Text>
        </Pressable>
      );
    }
    return days;
  };

  // --- CONTENIDO DEL MODAL DINÁMICO ---
  const getModalData = () => {
    if (selectingFor === 'category') return CATEGORIAS_OFICIALES.map(c => ({ id: c, label: c, sub: '' }));
    if (selectingFor === 'field') return CAMPOS_OFICIALES.map(c => ({ id: c, label: c, sub: c === 'TBD' ? 'Por definir' : 'Campo oficial' }));
    return filteredTeams.map(t => ({ id: t.name, label: t.name, sub: t.category }));
  };

  const getModalTitle = () => {
    if (selectingFor === 'category') return 'Elige Categoría';
    if (selectingFor === 'field') return 'Elige el Campo';
    return 'Elegir Equipo';
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: currentColors.card, borderBottomColor: currentColors.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/admin')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={currentColors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>Programar Partido</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
          
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>1. Categoría</Text>
          <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
            <Text style={[styles.label, { color: currentColors.textMuted, marginTop: 0 }]}>Selecciona la Categoría</Text>
            <Pressable style={[styles.selectorInput, { backgroundColor: currentColors.bgSecondary }]} onPress={() => openModal('category')}>
              <Text style={{ color: category ? currentColors.text : currentColors.textMuted, fontWeight: '600' }}>
                {category || 'Ej. Varonil-Gold...'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={currentColors.textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { color: currentColors.text, opacity: category ? 1 : 0.5 }]}>2. Equipos</Text>
          <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.border, opacity: category ? 1 : 0.5 }]}>
            <Text style={[styles.label, { color: currentColors.textMuted, marginTop: 0 }]}>Equipo Local</Text>
            <Pressable style={[styles.selectorInput, { backgroundColor: currentColors.bgSecondary }]} onPress={() => openModal('home')}>
              <Text style={{ color: homeTeam ? currentColors.text : currentColors.textMuted, fontWeight: '600' }}>
                {homeTeam || 'Seleccionar Local...'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={currentColors.textMuted} />
            </Pressable>

            <Text style={[styles.label, { color: currentColors.textMuted }]}>Equipo Visitante</Text>
            <Pressable style={[styles.selectorInput, { backgroundColor: currentColors.bgSecondary }]} onPress={() => openModal('away')}>
              <Text style={{ color: awayTeam ? currentColors.text : currentColors.textMuted, fontWeight: '600' }}>
                {awayTeam || 'Seleccionar Visitante...'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={currentColors.textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>3. Horario y Sede</Text>
          <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
            
            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Text style={[styles.label, { color: currentColors.textMuted, marginTop: 0 }]}>Fecha (YYYY-MM-DD)</Text>
                <Pressable style={[styles.selectorInput, { backgroundColor: currentColors.bgSecondary, paddingVertical: 12 }]} onPress={() => setShowCalendar(true)}>
                  <Text style={{ color: date ? currentColors.text : currentColors.textMuted, fontWeight: '600' }}>
                    {date || 'Elegir Día...'}
                  </Text>
                  <Ionicons name="calendar" size={18} color={currentColors.textMuted} />
                </Pressable>
              </View>
              <View style={styles.flexHalf}>
                <Text style={[styles.label, { color: currentColors.textMuted, marginTop: 0 }]}>Hora (HH:MM)</Text>
                <TextInput 
                  style={[styles.textInput, { backgroundColor: currentColors.bgSecondary, color: currentColors.text }]} 
                  value={time} 
                  onChangeText={setTime} 
                  placeholder="08:00:00"
                  placeholderTextColor={currentColors.textMuted}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Text style={[styles.label, { color: currentColors.textMuted }]}>Campo</Text>
                <Pressable style={[styles.selectorInput, { backgroundColor: currentColors.bgSecondary, paddingVertical: 12 }]} onPress={() => openModal('field')}>
                  <Text style={{ color: field ? currentColors.text : currentColors.textMuted, fontWeight: '600' }}>
                    {field ? `Campo ${field}` : 'Elegir...'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={currentColors.textMuted} />
                </Pressable>
              </View>
              <View style={styles.flexHalf}>
                <Text style={[styles.label, { color: currentColors.textMuted }]}>Jornada</Text>
                <TextInput 
                  style={[styles.textInput, { backgroundColor: currentColors.bgSecondary, color: currentColors.text }]} 
                  value={jornada} 
                  onChangeText={setJornada} 
                  keyboardType="numeric" 
                />
              </View>
            </View>

            <Text style={[styles.label, { color: currentColors.textMuted }]}>Sede / Lugar (Opcional)</Text>
            <TextInput 
              style={[styles.textInput, { backgroundColor: currentColors.bgSecondary, color: currentColors.text }]} 
              value={venue} 
              onChangeText={setVenue} 
              placeholder="Ej. Instituto Estatal del Deporte"
              placeholderTextColor={currentColors.textMuted}
            />

          </View>

          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>4. Equipo Arbitral</Text>
          <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.border, marginBottom: 30 }]}>
            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Text style={[styles.label, { color: currentColors.textMuted, marginTop: 0 }]}>Árbitro 1</Text>
                <TextInput 
                  style={[styles.textInput, { backgroundColor: currentColors.bgSecondary, color: currentColors.text }]} 
                  value={referee1} 
                  onChangeText={setReferee1} 
                  placeholder="Nombre"
                  placeholderTextColor={currentColors.textMuted}
                />
              </View>
              <View style={styles.flexHalf}>
                <Text style={[styles.label, { color: currentColors.textMuted, marginTop: 0 }]}>Árbitro 2</Text>
                <TextInput 
                  style={[styles.textInput, { backgroundColor: currentColors.bgSecondary, color: currentColors.text }]} 
                  value={referee2} 
                  onChangeText={setReferee2} 
                  placeholder="Nombre"
                  placeholderTextColor={currentColors.textMuted}
                />
              </View>
            </View>
          </View>

          <Pressable style={[styles.saveBtn, { backgroundColor: BRAND_GRADIENT[0] }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar Partido</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showCalendar} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.calendarModal, { backgroundColor: currentColors.card }]}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => changeMonth(-1)} style={{ padding: 10 }}>
                <Ionicons name="chevron-back" size={24} color={currentColors.text} />
              </Pressable>
              <Text style={[styles.calendarMonthText, { color: currentColors.text }]}>
                {currentMonth.toLocaleString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase()}
              </Text>
              <Pressable onPress={() => changeMonth(1)} style={{ padding: 10 }}>
                <Ionicons name="chevron-forward" size={24} color={currentColors.text} />
              </Pressable>
            </View>
            
            <View style={styles.calendarDaysHeader}>
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) => (
                <Text key={i} style={[styles.calendarDayHeaderText, { color: currentColors.textMuted }]}>{d}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {renderCalendarDays()}
            </View>

            <Pressable style={[styles.closeCalendarBtn, { borderTopColor: currentColors.borderLight }]} onPress={() => setShowCalendar(false)}>
              <Text style={{ color: currentColors.text, fontWeight: '700', fontSize: 16 }}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.bg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currentColors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>{getModalTitle()}</Text>
              <Pressable onPress={() => setModalVisible(false)} style={{ padding: 5 }}>
                <Ionicons name="close" size={24} color={currentColors.text} />
              </Pressable>
            </View>

            <FlatList
              data={getModalData()}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable style={[styles.modalRow, { borderBottomColor: currentColors.borderLight }]} onPress={() => handleSelection(item.label)}>
                  <Text style={[styles.modalRowText, { color: currentColors.text }]}>
                    {selectingFor === 'field' && item.label !== 'TBD' ? `Campo ${item.label}` : item.label}
                  </Text>
                  {item.sub ? <Text style={{ fontSize: 12, color: currentColors.textMuted }}> ({item.sub})</Text> : null}
                </Pressable>
              )}
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
  
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 5 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  
  label: { fontSize: 12, fontWeight: '800', marginBottom: 8, marginTop: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  selectorInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 14, borderRadius: 12 },
  textInput: { paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, fontSize: 15, fontWeight: '600' },
  
  row: { flexDirection: 'row', gap: 15 },
  flexHalf: { flex: 1 },
  
  saveBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 4 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '100%', height: '70%', position: 'absolute', bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 15, borderBottomWidth: 1, marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalRow: { paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  modalRowText: { fontSize: 16, fontWeight: '700' },

  calendarModal: { width: '90%', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  calendarMonthText: { fontSize: 16, fontWeight: '800' },
  calendarDaysHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  calendarDayHeaderText: { width: 35, textAlign: 'center', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calendarDay: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginBottom: 5 },
  calendarDaySelected: { backgroundColor: BRAND_GRADIENT[0], borderRadius: 12 },
  calendarDayText: { fontSize: 15, fontWeight: '600' },
  calendarDayTextSelected: { color: '#FFF', fontWeight: '900' },
  closeCalendarBtn: { alignItems: 'center', marginTop: 15, paddingTop: 15, borderTopWidth: 1 },
});