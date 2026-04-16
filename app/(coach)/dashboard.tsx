import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, Alert, ActivityIndicator, TextInput, Image,
  RefreshControl,
  useColorScheme,
  Animated,
  Easing,
  Modal,
  Linking,
  KeyboardAvoidingView,
  useWindowDimensions
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker"; 
import { supabase } from "@/lib/supabase"; 
import { BRAND_GRADIENT, Colors } from "@/constants/colors"; 

const API_BASE = "https://www.flagdurango.com.mx/api";

const CATEGORIES = [
  { id: "varonil-libre", label: "Varonil Libre" },
  { id: "varonil-gold", label: "Varonil Gold" },
  { id: "varonil-silver", label: "Varonil Silver" },
  { id: "varonil-master", label: "Varonil Master" },
  { id: "varonil-cooper", label: "Varonil Cooper" }, 
  { id: "femenil-gold", label: "Femenil Gold" },
  { id: "femenil-silver", label: "Femenil Silver" },
  { id: "femenil-copper", label: "Femenil Copper" }, 
  { id: "mixto-gold", label: "Mixto Gold" },
  { id: "mixto-silver", label: "Mixto Silver" },
  { id: "mixto-cooper", label: "Mixto Cooper" },    
  { id: "mixto-recreativo", label: "Mixto Recreativo" },
  { id: "teens", label: "Teens" },
];

const FadeInView = ({ children, delay = 0 }: { children: any, delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) })
    ]).start();
  }, [children]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

export default function CoachDashboard() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";

  const [user, setUser] = useState<any>(null);
  const [coachPhoto, setCoachPhoto] = useState<string | null>(null);
  
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [championships, setChampionships] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"equipos" | "crear" | "solicitudes" | "perfil">("equipos");

  const [teamForm, setTeamForm] = useState({ name: "", category: "", captain_name: "", captain_phone: "" });
  const [tempLogoUri, setTempLogoUri] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [champForm, setChampForm] = useState({
    team_id: null as number | null, title: "", year: "", tournament: "", position: "1er Lugar"
  });
  const [savingChamp, setSavingChamp] = useState(false);
  
  const [paymentTeam, setPaymentTeam] = useState<any>(null);

  // Estados de edición de jugadores
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [editPlayerName, setEditPlayerName] = useState("");
  const [editPlayerPosition, setEditPlayerPosition] = useState("");
  const [editPlayerJersey, setEditPlayerJersey] = useState("");
  const [savingPlayer, setSavingPlayer] = useState(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("userSession").then(res => {
        if (res) {
          const u = JSON.parse(res);
          setUser(u);
          loadCoachData(u);
        } else {
          router.replace("/login");
        }
      });
    }, [])
  );

  useEffect(() => {
    if (!user) return;
    const subscription = supabase
      .channel('coach-new-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_join_requests', filter: `coach_user_id=eq.${user.id}` },
        (payload) => {
          Alert.alert("🔔 ¡Nueva Solicitud!", `El jugador ${payload.new.player_name} ha enviado una solicitud.`);
          loadCoachData(user);
        }
      )
      .subscribe();
      
    return () => { supabase.removeChannel(subscription); };
  }, [user]);

  const safeJsonParse = async (response: Response) => {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    return null;
  };

  const loadCoachData = async (coachUser: any) => {
    setLoading(true);
    try {
      const teamsRes = await fetch(`${API_BASE}/teams?coach_id=${coachUser.id}`);
      const teamsData = await safeJsonParse(teamsRes);
      const myTeams = teamsData?.success ? teamsData.data : [];
      setTeams(myTeams);

      if (myTeams.length > 0) {
        const teamWithPhoto = myTeams.find((t: any) => t.coach_photo_url);
        if (teamWithPhoto) setCoachPhoto(teamWithPhoto.coach_photo_url);

        const teamIds = myTeams.map((t: any) => t.id);
        
        const playersRes = await fetch(`${API_BASE}/players?team_ids=${teamIds.join(",")}`);
        const playersData = await safeJsonParse(playersRes);
        if (playersData?.success) setPlayers(playersData.data);

        const reqRes = await fetch(`${API_BASE}/team-join-requests?coach_user_id=${coachUser.id}`);
        const reqData = await safeJsonParse(reqRes);
        if (reqData?.success) {
          setRequests(reqData.data.filter((r: any) => 
            teamIds.includes(r.team_id) && (r.status === "pending" || r.status === "pending_coordinator")
          ));
        }
      }

      const champsRes = await fetch(`${API_BASE}/championships?coach_id=${coachUser.id}`);
      const champsData = await safeJsonParse(champsRes);
      if (champsData?.success) setChampionships(champsData.data);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await loadCoachData(user);
    setRefreshing(false);
  }, [user]);

  const uploadImageToServer = async (uri: string, folder: string) => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'upload.jpg';
    const type = `image/${filename.split('.').pop()}`;
    // @ts-ignore
    formData.append('file', { uri, name: filename, type });
    formData.append('folder', folder);

    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
    return await safeJsonParse(res);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        const uploadData = await uploadImageToServer(result.assets[0].uri, 'coaches');
        if (uploadData?.success) {
          const { error } = await supabase.from('teams').update({ coach_photo_url: uploadData.url }).eq('coach_id', user.id);
          if (error) throw error;
          setCoachPhoto(uploadData.url);
          Alert.alert("Éxito", "Foto de perfil actualizada.");
        }
      } catch (e) { Alert.alert("Error", "No se pudo subir la foto."); } finally { setUploading(false); }
    }
  };

  const handleAddChampionship = async () => {
    if (!champForm.team_id || !champForm.title || !champForm.year) {
      return Alert.alert("Faltan datos", "Selecciona un equipo, título y año.");
    }
    setSavingChamp(true);
    try {
      const res = await fetch(`${API_BASE}/championships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coach_id: user.id,
          team_id: champForm.team_id,
          title: champForm.title,
          year: parseInt(champForm.year),
          tournament: champForm.tournament,
          position: champForm.position
        })
      });
      const data = await safeJsonParse(res);
      if (data?.success) {
        Alert.alert("¡Campeonato Agregado!", "Tu trayectoria ha crecido.");
        setChampForm({ team_id: null, title: "", year: "", tournament: "", position: "1er Lugar" });
        loadCoachData(user);
      } else {
        Alert.alert("Error", data?.message || "No se pudo guardar el campeonato.");
      }
    } catch (error) {
      Alert.alert("Error", "Fallo de conexión.");
    } finally {
      setSavingChamp(false);
    }
  };

  const handleDeleteChampionship = (id: number) => {
    Alert.alert("Eliminar", "¿Borrar este campeonato?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        try {
          await fetch(`${API_BASE}/championships?id=${id}`, { method: "DELETE" });
          loadCoachData(user);
        } catch (error) {}
      }}
    ]);
  };

  const handleUpdateExistingTeamLogo = async (teamId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setLoading(true);
      try {
        const uploadData = await uploadImageToServer(result.assets[0].uri, 'team_logos');
        if (uploadData?.success) {
          const { error } = await supabase
            .from('teams')
            .update({ logo_url: uploadData.url })
            .eq('id', teamId);
            
          if (!error) {
            Alert.alert("Éxito", "Logo del equipo actualizado.");
            loadCoachData(user);
          }
        }
      } catch (e) {
        Alert.alert("Error", "No se pudo actualizar el logo.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateTeam = async () => {
    if (!teamForm.name || !teamForm.category) return Alert.alert("Error", "Faltan datos obligatorios.");
    setCreating(true);
    try {
      let finalLogoUrl = "";
      if (tempLogoUri) {
        const uploadData = await uploadImageToServer(tempLogoUri, 'team_logos');
        if (uploadData?.success) finalLogoUrl = uploadData.url;
      }
      const res = await fetch(`${API_BASE}/teams`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...teamForm, logo_url: finalLogoUrl, coach_id: user.id, coach_name: user.username,
          coach_photo_url: coachPhoto, color1: BRAND_GRADIENT[0], color2: BRAND_GRADIENT[1]
        }),
      });
      const jsonRes = await safeJsonParse(res);
      if (jsonRes?.success) {
        Alert.alert("¡Éxito!", "Equipo creado.");
        setTeamForm({ name: "", category: "", captain_name: "", captain_phone: "" });
        setTempLogoUri(null);
        setActiveTab("equipos");
        loadCoachData(user);
      }
    } finally { setCreating(false); }
  };

  const openEditPlayerModal = (player: any) => {
    setEditingPlayer(player);
    setEditPlayerName(player.name);
    setEditPlayerPosition(player.position || "");
    setEditPlayerJersey(player.jersey_number ? String(player.jersey_number) : "");
  };

  const handleUpdatePlayer = async () => {
    if (!editPlayerName.trim()) return Alert.alert("Error", "El nombre es obligatorio.");
    setSavingPlayer(true);
    try {
      const res = await fetch(`${API_BASE}/players/${editingPlayer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editPlayerName.trim(),
          position: editPlayerPosition.trim(),
          jersey_number: parseInt(editPlayerJersey) || 0
        })
      });
      const data = await safeJsonParse(res);
      if (data?.success) {
        Alert.alert("Éxito", "Jugador actualizado correctamente.");
        setEditingPlayer(null);
        loadCoachData(user); 
      } else {
        Alert.alert("Error", data?.message || "No se pudo actualizar el jugador.");
      }
    } catch (e) {
      Alert.alert("Error", "Error de conexión con el servidor.");
    } finally {
      setSavingPlayer(false);
    }
  };

  const handleRequest = async (requestId: number, status: string) => {
    try {
      await fetch(`${API_BASE}/team-join-requests`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, status, coach_user_id: user.id }),
      });
      loadCoachData(user);
    } catch (error) {}
  };

  const handleDeleteAccount = () => {
    Alert.alert("⚠️ Eliminar Cuenta de Coach", "Esta acción desactivará tu cuenta. No perderás tus campeonatos pero ya no podrás gestionar tus equipos.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sí, Eliminar", style: "destructive", onPress: async () => {
        try {
          const res = await fetch(`${API_BASE}/auth/delete-account`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user.id })
          });
          const data = await safeJsonParse(res);
          if (data?.success) {
            await AsyncStorage.removeItem("userSession");
            router.replace("/login");
          }
        } catch(e) { Alert.alert("Error", "Fallo de conexión."); }
      }}
    ]);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userSession");
    router.replace("/login");
  };

  const sendWhatsAppProof = () => {
    if (!paymentTeam) return;
    const message = `Hola, acabo de pagar la inscripción ($1,900) de mi equipo: *${paymentTeam.name}* (${paymentTeam.category.replace("-", " ").toUpperCase()}). Aquí está mi comprobante:`;
    const url = `https://wa.me/526182614228?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const topPad = insets.top + 10;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      
      <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.contentWrapper}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.replace("/(tabs)/")}><Ionicons name="home" size={24} color="#FFF" /></Pressable>
            <Text style={styles.headerTitle}>Panel de Coach</Text>
            <Pressable onPress={handleLogout}><Ionicons name="log-out-outline" size={26} color="#FFF" /></Pressable>
          </View>

          <View style={styles.coachHeaderCard}>
            <Pressable onPress={handlePickImage} style={styles.avatarContainer}>
              {coachPhoto ? <Image source={{ uri: coachPhoto }} style={styles.avatarImg} /> : <Ionicons name="camera" size={24} color="#FFF" />}
              {uploading && <ActivityIndicator style={styles.loader} color="#FFF" />}
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeText}>{user?.username}</Text>
              <Text style={styles.coachStatsText}>{teams.length} Equipos | {championships.length} Copas</Text>
            </View>
            <Pressable style={styles.eyeBtn} onPress={() => router.push(`/coach/${user?.id}`)}>
              <Ionicons name="eye" size={20} color="#FFF" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.tabsRow, { backgroundColor: currentColors.card, shadowColor: isDark ? '#000' : '#0F172A' }]}>
        <View style={[styles.contentWrapper, { flexDirection: 'row' }]}>
          <TabButton title="Equipos" icon="shield" active={activeTab === "equipos"} onPress={() => setActiveTab("equipos")} currentColors={currentColors} />
          <TabButton title="Nuevo" icon="add-circle" active={activeTab === "crear"} onPress={() => setActiveTab("crear")} currentColors={currentColors} />
          <TabButton title="Inbox" icon="mail" active={activeTab === "solicitudes"} badge={requests.length} onPress={() => setActiveTab("solicitudes")} currentColors={currentColors} />
          <TabButton title="Perfil" icon="trophy" active={activeTab === "perfil"} onPress={() => setActiveTab("perfil")} currentColors={currentColors} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView 
          style={styles.body} 
          contentContainerStyle={{ paddingBottom: 60 }} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />}
        >
          <View style={styles.contentWrapper}>
            {loading && !refreshing && !teams.length && !championships.length ? (
              <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} style={{ marginTop: 50 }} />
            ) : (
              <FadeInView>
                
                {activeTab === "equipos" && (
                  <View>
                    {teams.length === 0 ? (
                      <View style={[styles.emptyBox, { borderColor: currentColors.borderLight, backgroundColor: currentColors.card }]}>
                        <Ionicons name="shield-half" size={48} color={currentColors.textMuted} />
                        <Text style={[styles.emptyTitle, { color: currentColors.text }]}>Sin Equipos</Text>
                        <Text style={{color: currentColors.textSecondary}}>Inscribe tu primer equipo en la pestaña "Nuevo".</Text>
                      </View>
                    ) : (
                      teams.map((team, index) => (
                        <FadeInView key={team.id} delay={index * 100}>
                          <View style={[styles.teamCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#475569' }]}>
                            
                            <View style={[styles.teamHeader, { borderBottomColor: currentColors.borderLight }]}>
                              <Pressable onPress={() => handleUpdateExistingTeamLogo(team.id)} style={styles.teamLogoWrapper}>
                                {team.logo_url ? (
                                  <Image source={{ uri: team.logo_url }} style={styles.teamMiniLogo} />
                                ) : (
                                  <View style={[styles.teamLogoPlaceholder, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
                                    <Ionicons name="image" size={18} color={currentColors.textMuted} />
                                  </View>
                                )}
                                <View style={styles.editIconBadge}><Ionicons name="pencil" size={10} color="#FFF" /></View>
                              </Pressable>

                              <View style={{ flex: 1 }}>
                                <Text style={[styles.teamName, { color: currentColors.text }]}>{team.name}</Text>
                                <Text style={[styles.teamCat, { color: currentColors.textSecondary }]}>{team.category.replace("-", " ").toUpperCase()}</Text>
                              </View>

                              <View style={[styles.statusBadge, team.paid ? (isDark ? {backgroundColor: '#064E3B'} : styles.bgGreen) : (isDark ? {backgroundColor: '#78350F'} : styles.bgYellow)]}>
                                <Text style={[styles.statusText, { color: team.paid ? (isDark ? '#34D399' : '#0F172A') : (isDark ? '#FDE68A' : '#0F172A') }]}>{team.paid ? "PAGADO" : "DEUDA"}</Text>
                              </View>
                            </View>

                            {!team.paid && (
                              <Pressable 
                                style={[styles.payBtn, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB', borderColor: '#F59E0B' }]}
                                onPress={() => setPaymentTeam(team)}
                              >
                                <Ionicons name="card" size={18} color="#F59E0B" />
                                <Text style={styles.payBtnText}>Pagar Inscripción del Equipo</Text>
                              </Pressable>
                            )}

                            <Text style={[styles.rosterTitle, { color: currentColors.text }]}>Roster ({players.filter(p => p.team_id === team.id).length})</Text>
                            
                            <View style={styles.rosterList}>
                              {players.filter(p => p.team_id === team.id).map(player => (
                                <View key={player.id} style={[styles.playerRow, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
                                  <View style={styles.playerRowLeft}>
                                    <View style={[styles.playerJerseyCircle, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}>
                                      <Text style={[styles.playerJerseyText, { color: currentColors.text }]}>{player.jersey_number || "00"}</Text>
                                    </View>
                                    <View>
                                      <Text style={[styles.playerRowName, { color: currentColors.text }]} numberOfLines={1}>{player.name}</Text>
                                      <Text style={[styles.playerRowPos, { color: currentColors.textMuted }]}>{player.position || "Jugador"}</Text>
                                    </View>
                                  </View>
                                  <Pressable 
                                    style={[styles.editPlayerBtn, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}
                                    onPress={() => openEditPlayerModal(player)}
                                  >
                                    <Ionicons name="pencil" size={16} color={BRAND_GRADIENT[0]} />
                                  </Pressable>
                                </View>
                              ))}
                            </View>

                          </View>
                        </FadeInView>
                      ))
                    )}
                  </View>
                )}

                {activeTab === "crear" && (
                  <View style={[styles.formCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#0F172A' }]}>
                    <Text style={[styles.cardTitle, { color: currentColors.text }]}>Inscribir Nuevo Equipo</Text>
                    
                    <Text style={[styles.label, { color: currentColors.textMuted }]}>Logo del Equipo</Text>
                    <Pressable onPress={async () => {
                      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
                      if (!res.canceled) setTempLogoUri(res.assets[0].uri);
                    }} style={[styles.logoPicker, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
                      {tempLogoUri ? <Image source={{ uri: tempLogoUri }} style={styles.logoPreview} /> : 
                      <View style={styles.logoPickerInner}><Ionicons name="image-outline" size={32} color={currentColors.textMuted} /><Text style={[styles.logoPickerText, { color: currentColors.textMuted }]}>Seleccionar Logo</Text></View>}
                    </Pressable>

                    <Text style={[styles.label, { color: currentColors.textMuted }]}>Nombre del Equipo</Text>
                    <TextInput style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholder="Ej. Cuervos" placeholderTextColor={currentColors.textMuted} value={teamForm.name} onChangeText={(t) => setTeamForm({...teamForm, name: t})} />
                    
                    <Text style={[styles.label, { color: currentColors.textMuted }]}>Categoría</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                      {CATEGORIES.map(cat => (
                        <Pressable key={cat.id} style={[styles.catChip, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }, teamForm.category === cat.id && styles.catChipActive]} onPress={() => setTeamForm({...teamForm, category: cat.id})}>
                          <Text style={[styles.catChipText, { color: currentColors.textSecondary }, teamForm.category === cat.id && {color:'#FFF'}]}>{cat.label}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    <Text style={[styles.label, { color: currentColors.textMuted }]}>Nombre del Capitán</Text>
                    <TextInput style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholder="Nombre" placeholderTextColor={currentColors.textMuted} value={teamForm.captain_name} onChangeText={(t) => setTeamForm({...teamForm, captain_name: t})} />
                    <Text style={[styles.label, { color: currentColors.textMuted }]}>Teléfono del Capitán</Text>
                    <TextInput style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholder="618..." placeholderTextColor={currentColors.textMuted} keyboardType="phone-pad" value={teamForm.captain_phone} onChangeText={(t) => setTeamForm({...teamForm, captain_phone: t})} />

                    <Pressable style={styles.submitBtn} onPress={handleCreateTeam} disabled={creating}>
                      <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={styles.submitBtnGradient}>
                        {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Inscribir Equipo</Text>}
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}

                {activeTab === "solicitudes" && (
                  <View>
                    {requests.length === 0 ? (
                      <View style={[styles.emptyBox, { borderColor: currentColors.borderLight, backgroundColor: currentColors.card }]}>
                        <Ionicons name="mail-open" size={48} color={currentColors.textMuted} />
                        <Text style={[styles.emptyTitle, { color: currentColors.text }]}>Bandeja Limpia</Text>
                        <Text style={[styles.emptySub, { color: currentColors.textSecondary }]}>No tienes solicitudes pendientes de jugadores.</Text>
                      </View>
                    ) : (
                      requests.map(req => (
                        <View key={req.id} style={[styles.requestCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#475569' }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.reqName, { color: currentColors.text }]}>{req.player_name}</Text>
                            <Text style={[styles.reqInfo, { color: currentColors.textSecondary }]}>Solicita unirse a: <Text style={{fontWeight:'800', color: currentColors.text}}>{req.teams?.name}</Text></Text>
                            <Text style={[styles.reqInfo, { color: currentColors.textMuted, marginTop: 4 }]}>Pos: {req.position} | Jersey: #{req.jersey_number}</Text>
                          </View>
                          <View style={styles.reqActions}>
                            <Pressable style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : "#FEE2E2", borderColor: '#EF4444' }]} onPress={() => handleRequest(req.id, "rejected")}>
                              <Ionicons name="close" size={20} color="#EF4444" />
                            </Pressable>
                            <Pressable style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : "#D1FAE5", borderColor: '#10B981' }]} onPress={() => handleRequest(req.id, "accepted")}>
                              <Ionicons name="checkmark" size={20} color="#10B981" />
                            </Pressable>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {activeTab === "perfil" && (
                  <View>
                    <Text style={[styles.cardTitle, {marginLeft: 5, color: currentColors.text, marginBottom: 15 }]}>Mis Campeonatos</Text>
                    {championships.length === 0 ? (
                      <View style={[styles.emptyBox, {marginBottom: 20, borderColor: currentColors.borderLight, backgroundColor: currentColors.card }]}>
                        <Ionicons name="trophy-outline" size={45} color={currentColors.textMuted} />
                        <Text style={[styles.emptySub, { color: currentColors.textSecondary, marginTop: 10 }]}>Aún no has registrado campeonatos.</Text>
                      </View>
                    ) : (
                      championships.map(champ => (
                        <View key={champ.id} style={[styles.champCard, { backgroundColor: currentColors.card, borderColor: isDark ? '#78350F' : '#FDE68A', shadowColor: isDark ? '#000' : '#475569' }]}>
                          <View style={[styles.champIcon, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}><Ionicons name="trophy" size={24} color={isDark ? '#FDE68A' : "#F59E0B"} /></View>
                          <View style={{flex: 1}}>
                            <Text style={[styles.champTitle, { color: currentColors.text }]}>{champ.title} ({champ.year})</Text>
                            <Text style={[styles.champSub, { color: currentColors.textSecondary }]}>{champ.tournament} • {champ.position}</Text>
                          </View>
                          <Pressable onPress={() => handleDeleteChampionship(champ.id)} style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEF2F2' }]}>
                            <Ionicons name="trash" size={18} color="#EF4444" />
                          </Pressable>
                        </View>
                      ))
                    )}

                    <View style={[styles.formCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#0F172A', marginTop: 10 }]}>
                      <Text style={[styles.cardTitle, { color: currentColors.text }]}>Registrar Trofeo</Text>
                      
                      <Text style={[styles.label, { color: currentColors.textMuted }]}>Selecciona el Equipo Ganador</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                        {teams.map(t => (
                          <Pressable key={t.id} style={[styles.catChip, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }, champForm.team_id === t.id && styles.catChipActive]} onPress={() => setChampForm({...champForm, team_id: t.id})}>
                            <Text style={[styles.catChipText, { color: currentColors.textSecondary }, champForm.team_id === t.id && {color:'#FFF'}]}>{t.name}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>

                      <Text style={[styles.label, { color: currentColors.textMuted }]}>Título (Ej. Campeón Invicto)</Text>
                      <TextInput style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Escribe el título" value={champForm.title} onChangeText={(t) => setChampForm({...champForm, title: t})} />

                      <View style={{flexDirection: 'row', gap: 10}}>
                        <View style={{flex: 1}}>
                          <Text style={[styles.label, { color: currentColors.textMuted }]}>Torneo / Liga</Text>
                          <TextInput style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Ej. Flag Durango" value={champForm.tournament} onChangeText={(t) => setChampForm({...champForm, tournament: t})} />
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={[styles.label, { color: currentColors.textMuted }]}>Año</Text>
                          <TextInput style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Ej. 2026" keyboardType="numeric" maxLength={4} value={champForm.year} onChangeText={(t) => setChampForm({...champForm, year: t})} />
                        </View>
                      </View>

                      <Pressable style={[styles.submitBtn, { backgroundColor: BRAND_GRADIENT[0], marginTop: 5, padding: 14 }]} onPress={handleAddChampionship} disabled={savingChamp}>
                        {savingChamp ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Agregar Campeonato</Text>}
                      </Pressable>
                    </View>

                    <Pressable style={[styles.deleteAccountBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : "#FEF2F2", borderColor: isDark ? 'rgba(239,68,68,0.3)' : "#FECACA" }]} onPress={handleDeleteAccount}>
                      <Ionicons name="warning-outline" size={18} color="#EF4444" />
                      <Text style={styles.deleteAccountText}>Eliminar Mi Cuenta</Text>
                    </Pressable>

                  </View>
                )}
              </FadeInView>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL DE EDICIÓN DE JUGADOR */}
      {editingPlayer && (
        <Modal transparent visible={!!editingPlayer} animationType="fade">
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }, isTablet && styles.modalTablet]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: currentColors.text }]}>Editar Jugador</Text>
                  <Pressable onPress={() => setEditingPlayer(null)} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={24} color={currentColors.textMuted} />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={[styles.label, { color: currentColors.textMuted }]}>Nombre Completo</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} 
                    value={editPlayerName} 
                    onChangeText={setEditPlayerName} 
                    placeholderTextColor={currentColors.textMuted}
                  />

                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: currentColors.textMuted }]}>Posición</Text>
                      <TextInput 
                        style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} 
                        value={editPlayerPosition} 
                        onChangeText={setEditPlayerPosition} 
                        placeholder="Ej. QB, WR"
                        placeholderTextColor={currentColors.textMuted}
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: currentColors.textMuted }]}>Número (Jersey)</Text>
                      <TextInput 
                        style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} 
                        value={editPlayerJersey} 
                        onChangeText={setEditPlayerJersey} 
                        keyboardType="numeric"
                        maxLength={2}
                        placeholderTextColor={currentColors.textMuted}
                      />
                    </View>
                  </View>
                </ScrollView>

                <Pressable 
                  style={[styles.submitBtn, { backgroundColor: BRAND_GRADIENT[0], padding: 16 }]} 
                  onPress={handleUpdatePlayer} 
                  disabled={savingPlayer}
                >
                  {savingPlayer ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Guardar Cambios</Text>}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* MODAL DE PAGO */}
      {paymentTeam && (
        <Modal transparent visible={!!paymentTeam} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }, isTablet && styles.modalTablet]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: currentColors.text }]}>Instrucciones de Pago</Text>
                <Pressable onPress={() => setPaymentTeam(null)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color={currentColors.textMuted} />
                </Pressable>
              </View>

              <Text style={[styles.modalText, { color: currentColors.textSecondary }]}>
                Para liberar a tu equipo y permitirles jugar, realiza el pago de inscripción a la siguiente cuenta:
              </Text>

              <View style={[styles.bankBox, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
                <View style={[styles.bankRow, { marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: currentColors.borderLight }]}>
                  <Ionicons name="cash-outline" size={24} color="#10B981" />
                  <Text style={[styles.bankLabel, { color: currentColors.textMuted, width: 90 }]}>Monto total:</Text>
                  <Text style={[styles.bankValueClabe, { color: "#10B981", fontSize: 22 }]}>$1,900.00</Text>
                </View>

                <View style={styles.bankRow}>
                  <Ionicons name="business" size={20} color={currentColors.textMuted} />
                  <Text style={[styles.bankLabel, { color: currentColors.textMuted }]}>Banco:</Text>
                  <Text style={[styles.bankValue, { color: currentColors.text }]}>CitiBanamex</Text>
                </View>

                <View style={styles.bankRow}>
                  <Ionicons name="card" size={20} color={currentColors.textMuted} />
                  <Text style={[styles.bankLabel, { color: currentColors.textMuted }]}>Tarjeta:</Text>
                  <Text style={[styles.bankValueClabe, { color: BRAND_GRADIENT[0] }]}>5204 1659 4321 2997</Text>
                </View>

                <View style={styles.bankRow}>
                  <Ionicons name="list" size={20} color={currentColors.textMuted} />
                  <Text style={[styles.bankLabel, { color: currentColors.textMuted }]}>CLABE:</Text>
                  <Text style={[styles.bankValue, { color: currentColors.text, fontSize: 13, letterSpacing: 1 }]}>002190701908668214</Text>
                </View>
                
                <View style={styles.bankRow}>
                  <Ionicons name="person" size={20} color={currentColors.textMuted} />
                  <Text style={[styles.bankLabel, { color: currentColors.textMuted }]}>Nombre:</Text>
                  <Text style={[styles.bankValue, { color: currentColors.text }]}>Liga Flag Durango</Text>
                </View>
              </View>

              <View style={[styles.referenceBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF', borderColor: '#3B82F6' }]}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5}}>
                  <Ionicons name="information-circle" size={18} color="#3B82F6" />
                  <Text style={[styles.refLabel, { color: '#3B82F6' }]}>CONCEPTO DE PAGO OBLIGATORIO:</Text>
                </View>
                <Text style={[styles.refValue, { color: currentColors.text }]}>
                  {paymentTeam.name} - {paymentTeam.category.replace("-", " ").toUpperCase()}
                </Text>
              </View>

              <Pressable style={styles.whatsappBtn} onPress={sendWhatsAppProof}>
                <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
                <Text style={styles.whatsappBtnText}>Enviar Comprobante al Admin</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

function TabButton({ title, icon, active, onPress, badge, currentColors }: any) {
  return (
    <Pressable style={[styles.tabBtn, active && { backgroundColor: BRAND_GRADIENT[0] }]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={active ? "#FFF" : currentColors.textMuted} />
      <Text style={[styles.tabText, { color: active ? "#FFF" : currentColors.textMuted }]}>{title}</Text>
      {badge > 0 && <View style={styles.badgeWrap}><Text style={styles.badgeText}>{badge}</Text></View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { width: "100%", maxWidth: 800, alignSelf: "center" },
  
  header: { paddingBottom: 25, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  coachHeaderCard: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#FFF' },
  avatarImg: { width: '100%', height: '100%' },
  welcomeText: { color: "#FFF", fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  coachStatsText: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "700", marginTop: 2 },
  eyeBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 14 },
  
  tabsRow: { flexDirection: "row", paddingVertical: 10, elevation: 4 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14, gap: 4, marginHorizontal: 4 },
  tabText: { fontSize: 11, fontWeight: "800", textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeWrap: { position: 'absolute', top: 6, right: 12, backgroundColor: "#EF4444", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "900" },
  
  body: { padding: 16, paddingTop: 20 },
  
  teamCard: { padding: 22, borderRadius: 28, marginBottom: 20, elevation: 3, borderWidth: 1 },
  teamHeader: { flexDirection: "row", alignItems: 'center', gap: 15, borderBottomWidth: 1, paddingBottom: 18, marginBottom: 15 },
  teamLogoWrapper: { position: 'relative' },
  teamMiniLogo: { width: 50, height: 50, borderRadius: 12 },
  teamLogoPlaceholder: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1 },
  editIconBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: BRAND_GRADIENT[0], width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  teamName: { fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
  teamCat: { fontSize: 12, fontWeight: "800", marginTop: 2, letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  bgGreen: { backgroundColor: "#D1FAE5" },
  bgYellow: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 20, gap: 8 },
  payBtnText: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },

  rosterTitle: { fontSize: 14, fontWeight: "900", marginBottom: 12, letterSpacing: -0.5 },
  rosterList: { gap: 8 },
  
  playerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1 },
  playerRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  playerJerseyCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  playerJerseyText: { fontSize: 14, fontWeight: '900' },
  playerRowName: { fontSize: 15, fontWeight: "800" },
  playerRowPos: { fontSize: 11, fontWeight: "700", textTransform: 'uppercase', marginTop: 2 },
  editPlayerBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  
  formCard: { padding: 25, borderRadius: 28, elevation: 3, borderWidth: 1, marginBottom: 25 },
  cardTitle: { fontSize: 20, fontWeight: "900", marginBottom: 20, letterSpacing: -0.5 },
  logoPicker: { width: '100%', height: 120, borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  logoPickerInner: { alignItems: 'center' },
  logoPickerText: { fontSize: 12, fontWeight: '800', marginTop: 6 },
  logoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  label: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5 },
  input: { borderRadius: 16, padding: 16, marginBottom: 18, borderWidth: 1, fontWeight: '600', fontSize: 15 },
  categoryScroll: { marginBottom: 20 },
  catChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, marginRight: 10, borderWidth: 1 },
  catChipActive: { backgroundColor: BRAND_GRADIENT[0], borderColor: BRAND_GRADIENT[0] },
  catChipText: { fontSize: 13, fontWeight: "800" },
  submitBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 5 },
  submitBtnGradient: { padding: 18, alignItems: "center" },
  submitBtnText: { color: "#FFF", fontWeight: "900", fontSize: 15, letterSpacing: 0.5 },
  
  emptyBox: { alignItems: 'center', padding: 40, borderStyle: 'dashed', borderWidth: 2, borderRadius: 28, marginTop: 20 },
  emptyTitle: { fontWeight: '900', marginTop: 12, fontSize: 18 },
  emptySub: { fontSize: 14, textAlign: 'center', marginTop: 6, fontWeight: '500' },
  
  requestCard: { flexDirection: "row", alignItems: "center", padding: 18, borderRadius: 20, marginBottom: 12, borderWidth: 1, elevation: 2 },
  reqName: { fontSize: 17, fontWeight: "900", marginBottom: 4 },
  reqInfo: { fontSize: 13, fontWeight: '500' },
  reqActions: { flexDirection: "row", gap: 10, paddingLeft: 10 },
  actionBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  loader: { position: 'absolute' },
  
  champCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 12, borderWidth: 1, elevation: 2 },
  champIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  champTitle: { fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  champSub: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  deleteBtn: { padding: 12, borderRadius: 14 },
  
  deleteAccountBtn: { marginTop: 20, padding: 18, borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  deleteAccountText: { color: "#EF4444", fontSize: 14, fontWeight: "900" },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 36, padding: 30, borderWidth: 1, elevation: 15, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
  modalTablet: { maxWidth: 500, alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  modalCloseBtn: { padding: 5 },
  modalText: { fontSize: 14, lineHeight: 22, marginBottom: 25, fontWeight: '500' },
  
  rowInputs: { flexDirection: "row", gap: 15, marginBottom: 15 },

  bankBox: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 25 },
  bankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  bankLabel: { fontSize: 12, fontWeight: '800', width: 70, marginLeft: 8, textTransform: 'uppercase' },
  bankValue: { fontSize: 15, fontWeight: '800', flex: 1 },
  bankValueClabe: { fontSize: 17, fontWeight: '900', flex: 1, letterSpacing: 1 },
  referenceBox: { padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 25 },
  refLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  refValue: { fontSize: 17, fontWeight: '900', marginTop: 6, textAlign: 'center' },
  whatsappBtn: { backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, gap: 8, elevation: 3 },
  whatsappBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900' }
});