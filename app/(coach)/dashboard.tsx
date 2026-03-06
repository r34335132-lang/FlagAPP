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
  KeyboardAvoidingView // <-- IMPORTADO PARA EL TECLADO
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE ANIMADO
// ─────────────────────────────────────────────────────────────────────────────
const FadeInView = ({ children, delay = 0 }: { children: any, delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) })
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
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

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

  const [teamForm, setTeamForm] = useState({ 
    name: "", category: "", captain_name: "", captain_phone: ""
  });
  const [tempLogoUri, setTempLogoUri] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [champForm, setChampForm] = useState({
    team_id: null as number | null,
    title: "",
    year: "",
    tournament: "",
    position: "1er Lugar"
  });
  const [savingChamp, setSavingChamp] = useState(false);
  
  const [paymentTeam, setPaymentTeam] = useState<any>(null);

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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_join_requests',
          filter: `coach_user_id=eq.${user.id}`
        },
        (payload) => {
          Alert.alert(
            "🔔 ¡Nueva Solicitud!", 
            `El jugador ${payload.new.player_name} ha enviado una solicitud para unirse a tu equipo.`
          );
          loadCoachData(user);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
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

      // SOLUCIÓN: Cambiado a la ruta correcta de la API (/api/championships)
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        const uploadData = await uploadImageToServer(result.assets[0].uri, 'coaches');
        if (uploadData?.success) {
          const { error } = await supabase
            .from('teams')
            .update({ coach_photo_url: uploadData.url })
            .eq('coach_id', user.id);

          if (error) throw error;
          
          setCoachPhoto(uploadData.url);
          Alert.alert("Éxito", "Foto de perfil actualizada.");
        }
      } catch (e) {
        Alert.alert("Error", "No se pudo subir la foto.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleAddChampionship = async () => {
    if (!champForm.team_id || !champForm.title || !champForm.year) {
      return Alert.alert("Faltan datos", "Selecciona un equipo, título y año.");
    }
    setSavingChamp(true);
    try {
      // SOLUCIÓN: Cambiado a la ruta correcta de la API (/api/championships)
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
          // SOLUCIÓN: Cambiado a la ruta correcta de la API (/api/championships)
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...teamForm, 
          logo_url: finalLogoUrl,
          coach_id: user.id, 
          coach_name: user.username,
          coach_photo_url: coachPhoto, 
          color1: BRAND_GRADIENT[0],
          color2: BRAND_GRADIENT[1]
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

  const handleRequest = async (requestId: number, status: string) => {
    try {
      await fetch(`${API_BASE}/team-join-requests`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, status, coach_user_id: user.id }),
      });
      loadCoachData(user);
    } catch (error) {}
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "⚠️ Eliminar Cuenta de Coach",
      "Esta acción desactivará tu cuenta. No perderás tus campeonatos pero ya no podrás gestionar tus equipos.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, Eliminar", style: "destructive", onPress: async () => {
          try {
            const res = await fetch(`${API_BASE}/auth/delete-account`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: user.id })
            });
            const data = await safeJsonParse(res);
            if (data?.success) {
              await AsyncStorage.removeItem("userSession");
              router.replace("/login");
              Alert.alert("Cuenta Eliminada", "Has sido dado de baja del sistema.");
            } else {
              Alert.alert("Error", data?.message || "No se pudo eliminar.");
            }
          } catch(e) {
            Alert.alert("Error", "Fallo de conexión.");
          }
        }}
      ]
    );
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userSession");
    router.replace("/login");
  };

  const sendWhatsAppProof = () => {
    if (!paymentTeam) return;
    const message = `Hola, acabo de pagar la inscripción de mi equipo: *${paymentTeam.name}* (${paymentTeam.category.replace("-", " ").toUpperCase()}). Aquí está mi comprobante:`;
    const url = `https://wa.me/526182614228?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const topPad = insets.top + 10;

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      
      {/* HEADER DEL COACH */}
      <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.replace("/(tabs)/")}><Ionicons name="home" size={24} color="#FFF" /></Pressable>
          <Text style={styles.headerTitle}>Panel de Coach</Text>
          <Pressable onPress={handleLogout}><Ionicons name="log-out-outline" size={26} color="#FFF" /></Pressable>
        </View>

        <View style={styles.coachHeaderCard}>
          <Pressable onPress={handlePickImage} style={styles.avatarContainer}>
             {coachPhoto ? (
               <Image source={{ uri: coachPhoto }} style={styles.avatarImg} />
             ) : (
               <Ionicons name="camera" size={22} color="#FFF" />
             )}
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
      </LinearGradient>

      {/* MENÚ DE TABS */}
      <View style={[styles.tabsRow, { backgroundColor: currentColors.card, shadowColor: theme === 'dark' ? '#000' : '#0F172A' }]}>
        <TabButton title="Mis Equipos" icon="shield" active={activeTab === "equipos"} onPress={() => setActiveTab("equipos")} currentColors={currentColors} />
        <TabButton title="Nuevo" icon="add-circle" active={activeTab === "crear"} onPress={() => setActiveTab("crear")} currentColors={currentColors} />
        <TabButton title="Inbox" icon="mail" active={activeTab === "solicitudes"} badge={requests.length} onPress={() => setActiveTab("solicitudes")} currentColors={currentColors} />
        <TabButton title="Perfil" icon="trophy" active={activeTab === "perfil"} onPress={() => setActiveTab("perfil")} currentColors={currentColors} />
      </View>

      {/* SOLUCIÓN AL TECLADO: Envolvemos el ScrollView en KeyboardAvoidingView */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.body} 
          contentContainerStyle={{ paddingBottom: 60 }} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} colors={[BRAND_GRADIENT[0]]} />}
        >
          {loading && !refreshing && !teams.length && !championships.length ? (
            <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} style={{ marginTop: 40 }} />
          ) : (
            <FadeInView>
              {/* PESTAÑA: MIS EQUIPOS */}
              {activeTab === "equipos" && (
                <View>
                  {teams.length === 0 ? (
                    <View style={[styles.emptyBox, { borderColor: currentColors.border }]}>
                      <Ionicons name="shield-half" size={48} color={currentColors.textMuted} />
                      <Text style={[styles.emptyTitle, { color: currentColors.textMuted }]}>Sin Equipos</Text>
                    </View>
                  ) : (
                    teams.map((team, index) => (
                      <FadeInView key={team.id} delay={index * 100}>
                        <View style={[styles.teamCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, shadowColor: theme === 'dark' ? '#000' : '#0F172A' }]}>
                          
                          <View style={[styles.teamHeader, { borderBottomColor: currentColors.borderLight }]}>
                            <Pressable onPress={() => handleUpdateExistingTeamLogo(team.id)} style={styles.teamLogoWrapper}>
                              {team.logo_url ? (
                                <Image source={{ uri: team.logo_url }} style={styles.teamMiniLogo} />
                              ) : (
                                <View style={[styles.teamLogoPlaceholder, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border }]}>
                                  <Ionicons name="camera" size={16} color={currentColors.textMuted} />
                                </View>
                              )}
                              <View style={styles.editIconBadge}><Ionicons name="pencil" size={8} color="#FFF" /></View>
                            </Pressable>

                            <View style={{ flex: 1 }}>
                              <Text style={[styles.teamName, { color: currentColors.text }]}>{team.name}</Text>
                              <Text style={[styles.teamCat, { color: currentColors.textSecondary }]}>{team.category.replace("-", " ").toUpperCase()}</Text>
                            </View>

                            <View style={[styles.statusBadge, team.paid ? (theme === 'dark' ? {backgroundColor: '#064E3B'} : styles.bgGreen) : (theme === 'dark' ? {backgroundColor: '#78350F'} : styles.bgYellow)]}>
                              <Text style={[styles.statusText, { color: team.paid ? (theme === 'dark' ? '#34D399' : '#0F172A') : (theme === 'dark' ? '#FDE68A' : '#0F172A') }]}>{team.paid ? "PAGADO" : "DEUDA"}</Text>
                            </View>
                          </View>

                          {/* BOTÓN DE PAGO DINÁMICO */}
                          {!team.paid && (
                            <Pressable 
                              style={[styles.payBtn, { backgroundColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB', borderColor: '#F59E0B' }]}
                              onPress={() => setPaymentTeam(team)}
                            >
                              <Ionicons name="card" size={18} color="#F59E0B" />
                              <Text style={styles.payBtnText}>Pagar Inscripción / Arbitraje</Text>
                            </Pressable>
                          )}

                          <Text style={[styles.rosterTitle, { color: currentColors.text }]}>Roster ({players.filter(p => p.team_id === team.id).length})</Text>
                          {players.filter(p => p.team_id === team.id).map(player => (
                            <View key={player.id} style={[styles.playerRow, { borderBottomColor: currentColors.bgSecondary }]}>
                              <Text style={[styles.playerName, { color: currentColors.textSecondary }]}>{player.name}</Text>
                              <Text style={[styles.playerPos, { color: currentColors.textMuted }]}>#{player.jersey_number} {player.position}</Text>
                            </View>
                          ))}
                        </View>
                      </FadeInView>
                    ))
                  )}
                </View>
              )}

              {/* PESTAÑA: CREAR EQUIPO */}
              {activeTab === "crear" && (
                <View style={[styles.formCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, shadowColor: theme === 'dark' ? '#000' : '#0F172A' }]}>
                  <Text style={[styles.cardTitle, { color: currentColors.text }]}>Nuevo Equipo</Text>
                  
                  <Text style={[styles.label, { color: currentColors.textMuted }]}>Logo del Equipo</Text>
                  <Pressable onPress={async () => {
                    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
                    if (!res.canceled) setTempLogoUri(res.assets[0].uri);
                  }} style={[styles.logoPicker, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border }]}>
                    {tempLogoUri ? <Image source={{ uri: tempLogoUri }} style={styles.logoPreview} /> : 
                    <View style={styles.logoPickerInner}><Ionicons name="image-outline" size={32} color={currentColors.textMuted} /><Text style={[styles.logoPickerText, { color: currentColors.textMuted }]}>Seleccionar Logo</Text></View>}
                  </Pressable>

                  <Text style={[styles.label, { color: currentColors.textMuted }]}>Nombre del Equipo</Text>
                  <TextInput style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border, color: currentColors.text }]} placeholder="Nombre" placeholderTextColor={currentColors.textMuted} value={teamForm.name} onChangeText={(t) => setTeamForm({...teamForm, name: t})} />
                  
                  <Text style={[styles.label, { color: currentColors.textMuted }]}>Categoría</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {CATEGORIES.map(cat => (
                      <Pressable key={cat.id} style={[styles.catChip, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border }, teamForm.category === cat.id && styles.catChipActive]} onPress={() => setTeamForm({...teamForm, category: cat.id})}>
                        <Text style={[styles.catChipText, { color: currentColors.textSecondary }, teamForm.category === cat.id && {color:'#FFF'}]}>{cat.label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={[styles.label, { color: currentColors.textMuted }]}>Nombre del Capitán</Text>
                  <TextInput style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border, color: currentColors.text }]} placeholder="Nombre" placeholderTextColor={currentColors.textMuted} value={teamForm.captain_name} onChangeText={(t) => setTeamForm({...teamForm, captain_name: t})} />
                  <Text style={[styles.label, { color: currentColors.textMuted }]}>Teléfono del Capitán</Text>
                  <TextInput style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border, color: currentColors.text }]} placeholder="618..." placeholderTextColor={currentColors.textMuted} keyboardType="phone-pad" value={teamForm.captain_phone} onChangeText={(t) => setTeamForm({...teamForm, captain_phone: t})} />

                  <Pressable style={styles.submitBtn} onPress={handleCreateTeam} disabled={creating}>
                    {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Inscribir Equipo</Text>}
                  </Pressable>
                </View>
              )}

              {/* PESTAÑA: SOLICITUDES */}
              {activeTab === "solicitudes" && (
                <View>
                  {requests.length === 0 ? (
                    <View style={[styles.emptyBox, { borderColor: currentColors.border }]}>
                      <Ionicons name="mail-open" size={48} color={currentColors.textMuted} />
                      <Text style={[styles.emptyTitle, { color: currentColors.textMuted }]}>Bandeja Limpia</Text>
                      <Text style={[styles.emptySub, { color: currentColors.textMuted }]}>No tienes solicitudes pendientes.</Text>
                    </View>
                  ) : (
                    requests.map(req => (
                      <View key={req.id} style={[styles.requestCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.reqName, { color: currentColors.text }]}>{req.player_name}</Text>
                          <Text style={[styles.reqInfo, { color: currentColors.textSecondary }]}>Se une a: <Text style={{fontWeight:'700'}}>{req.teams?.name}</Text></Text>
                          <Text style={[styles.reqInfo, { color: currentColors.textSecondary }]}>Posición: {req.position} | Jersey: #{req.jersey_number}</Text>
                        </View>
                        <View style={styles.reqActions}>
                          <Pressable style={[styles.actionBtn, { backgroundColor: "#EF4444" }]} onPress={() => handleRequest(req.id, "rejected")}>
                            <Ionicons name="close" size={20} color="#FFF" />
                          </Pressable>
                          <Pressable style={[styles.actionBtn, { backgroundColor: "#10B981" }]} onPress={() => handleRequest(req.id, "accepted")}>
                            <Ionicons name="checkmark" size={20} color="#FFF" />
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* PESTAÑA: PERFIL Y CAMPEONATOS */}
              {activeTab === "perfil" && (
                <View>
                  <Text style={[styles.cardTitle, {marginLeft: 5, color: currentColors.text }]}>Mis Campeonatos</Text>
                  {championships.length === 0 ? (
                    <View style={[styles.emptyBox, {marginBottom: 20, borderColor: currentColors.border }]}>
                      <Ionicons name="trophy-outline" size={40} color={currentColors.textMuted} />
                      <Text style={[styles.emptySub, { color: currentColors.textMuted }]}>Aún no has registrado campeonatos.</Text>
                    </View>
                  ) : (
                    championships.map(champ => (
                      <View key={champ.id} style={[styles.champCard, { backgroundColor: currentColors.card, borderColor: theme === 'dark' ? '#78350F' : '#F59E0B40' }]}>
                        <View style={[styles.champIcon, { backgroundColor: theme === 'dark' ? '#78350F' : '#FEF3C7' }]}><Ionicons name="trophy" size={24} color={theme === 'dark' ? '#FDE68A' : "#F59E0B"} /></View>
                        <View style={{flex: 1}}>
                          <Text style={[styles.champTitle, { color: currentColors.text }]}>{champ.title} ({champ.year})</Text>
                          <Text style={[styles.champSub, { color: currentColors.textSecondary }]}>{champ.tournament} • {champ.position}</Text>
                        </View>
                        <Pressable onPress={() => handleDeleteChampionship(champ.id)} style={[styles.deleteBtn, { backgroundColor: theme === 'dark' ? 'rgba(239,68,68,0.2)' : '#FEF2F2' }]}>
                          <Ionicons name="trash" size={18} color="#EF4444" />
                        </Pressable>
                      </View>
                    ))
                  )}

                  <View style={[styles.formCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, shadowColor: theme === 'dark' ? '#000' : '#0F172A' }]}>
                    <Text style={[styles.cardTitle, { color: currentColors.text }]}>Registrar Trofeo</Text>
                    
                    <Text style={[styles.label, { color: currentColors.textMuted }]}>Selecciona el Equipo Ganador</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                      {teams.map(t => (
                        <Pressable key={t.id} style={[styles.catChip, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border }, champForm.team_id === t.id && styles.catChipActive]} onPress={() => setChampForm({...champForm, team_id: t.id})}>
                          <Text style={[styles.catChipText, { color: currentColors.textSecondary }, champForm.team_id === t.id && {color:'#FFF'}]}>{t.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    <Text style={[styles.label, { color: currentColors.textMuted }]}>Título (Ej. Campeón Invicto)</Text>
                    <TextInput style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Escribe el título" value={champForm.title} onChangeText={(t) => setChampForm({...champForm, title: t})} />

                    <View style={{flexDirection: 'row', gap: 10}}>
                      <View style={{flex: 1}}>
                        <Text style={[styles.label, { color: currentColors.textMuted }]}>Torneo / Liga</Text>
                        <TextInput style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Ej. Flag Durango" value={champForm.tournament} onChangeText={(t) => setChampForm({...champForm, tournament: t})} />
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={[styles.label, { color: currentColors.textMuted }]}>Año</Text>
                        <TextInput style={[styles.input, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Ej. 2026" keyboardType="numeric" maxLength={4} value={champForm.year} onChangeText={(t) => setChampForm({...champForm, year: t})} />
                      </View>
                    </View>

                    <Pressable style={styles.submitBtn} onPress={handleAddChampionship} disabled={savingChamp}>
                      {savingChamp ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Agregar Campeonato</Text>}
                    </Pressable>
                  </View>

                  {/* BOTÓN ELIMINAR CUENTA */}
                  <Pressable style={[styles.deleteAccountBtn, { backgroundColor: theme === 'dark' ? 'rgba(239,68,68,0.1)' : "#FEF2F2", borderColor: theme === 'dark' ? 'rgba(239,68,68,0.3)' : "#FECACA" }]} onPress={handleDeleteAccount}>
                    <Ionicons name="warning-outline" size={18} color="#EF4444" />
                    <Text style={styles.deleteAccountText}>Eliminar Mi Cuenta</Text>
                  </Pressable>

                </View>
              )}
            </FadeInView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL DE PAGO
      ───────────────────────────────────────────────────────────────────────────── */}
      {paymentTeam && (
        <Modal transparent visible={!!paymentTeam} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: currentColors.text }]}>Instrucciones de Pago</Text>
                <Pressable onPress={() => setPaymentTeam(null)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color={currentColors.textMuted} />
                </Pressable>
              </View>

              <Text style={[styles.modalText, { color: currentColors.textSecondary }]}>
                Para liberar a tu equipo y permitirles jugar, realiza una transferencia a la siguiente cuenta:
              </Text>

              <View style={[styles.bankBox, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.border }]}>
                <View style={styles.bankRow}>
                  <Ionicons name="business" size={20} color={currentColors.textMuted} />
                  <Text style={[styles.bankLabel, { color: currentColors.textMuted }]}>Banco:</Text>
                  <Text style={[styles.bankValue, { color: currentColors.text }]}>BBVA Bancomer</Text>
                </View>
                <View style={styles.bankRow}>
                  <Ionicons name="card" size={20} color={currentColors.textMuted} />
                  <Text style={[styles.bankLabel, { color: currentColors.textMuted }]}>CLABE:</Text>
                  <Text style={[styles.bankValueClabe, { color: BRAND_GRADIENT[0] }]}>012 345 6789 0123 4567</Text>
                </View>
                <View style={styles.bankRow}>
                  <Ionicons name="person" size={20} color={currentColors.textMuted} />
                  <Text style={[styles.bankLabel, { color: currentColors.textMuted }]}>Nombre:</Text>
                  <Text style={[styles.bankValue, { color: currentColors.text }]}>Liga Flag Durango</Text>
                </View>
              </View>

              <View style={[styles.referenceBox, { backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF', borderColor: '#3B82F6' }]}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5}}>
                  <Ionicons name="information-circle" size={18} color="#3B82F6" />
                  <Text style={[styles.refLabel, { color: '#3B82F6' }]}>CONCEPTO DE PAGO OBLIGATORIO:</Text>
                </View>
                <Text style={[styles.refValue, { color: currentColors.text }]}>
                  {paymentTeam.name} - {paymentTeam.category.replace("-", " ").toUpperCase()}
                </Text>
              </View>

              <Pressable 
                style={styles.whatsappBtn} 
                onPress={sendWhatsAppProof}
              >
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
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={active ? "#FFF" : currentColors.textMuted} />
      <Text style={[styles.tabText, { color: currentColors.textMuted }, active && styles.tabTextActive]}>{title}</Text>
      {badge > 0 && <View style={styles.badgeWrap}><Text style={styles.badgeText}>{badge}</Text></View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 25, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerTitle: { color: "#FFF", fontSize: 17, fontWeight: "800" },
  coachHeaderCard: { flexDirection: "row", alignItems: "center", gap: 15 },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#FFF' },
  avatarImg: { width: '100%', height: '100%' },
  welcomeText: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  coachStatsText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "700" },
  eyeBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 },
  
  tabsRow: { flexDirection: "row", padding: 8, elevation: 4 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, gap: 4 },
  tabBtnActive: { backgroundColor: BRAND_GRADIENT[0] },
  tabText: { fontSize: 11, fontWeight: "700", textAlign: 'center' },
  tabTextActive: { color: "#FFF" },
  badgeWrap: { position: 'absolute', top: 5, right: 10, backgroundColor: "#EF4444", borderRadius: 10, paddingHorizontal: 5 },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "900" },
  
  body: { padding: 16 },
  
  teamCard: { padding: 20, borderRadius: 20, marginBottom: 16, elevation: 2, borderWidth: 1 },
  teamHeader: { flexDirection: "row", alignItems: 'center', gap: 12, borderBottomWidth: 1, paddingBottom: 15, marginBottom: 15 },
  teamLogoWrapper: { position: 'relative' },
  teamMiniLogo: { width: 45, height: 45, borderRadius: 10 },
  teamLogoPlaceholder: { width: 45, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1 },
  editIconBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: BRAND_GRADIENT[0], width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },
  teamName: { fontSize: 18, fontWeight: "900" },
  teamCat: { fontSize: 11, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bgGreen: { backgroundColor: "#D1FAE5" },
  bgYellow: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 10, fontWeight: "800" },
  
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 15, gap: 8 },
  payBtnText: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },

  rosterTitle: { fontSize: 13, fontWeight: "800", marginBottom: 10 },
  playerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1 },
  playerName: { fontSize: 14, fontWeight: "700" },
  playerPos: { fontSize: 12 },
  
  formCard: { padding: 20, borderRadius: 20, elevation: 2, borderWidth: 1, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: "900", marginBottom: 20 },
  logoPicker: { width: '100%', height: 120, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  logoPickerInner: { alignItems: 'center' },
  logoPickerText: { fontSize: 12, fontWeight: '700', marginTop: 5 },
  logoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  label: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginBottom: 8 },
  input: { borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, fontWeight: '600' },
  categoryScroll: { marginBottom: 20 },
  catChip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1 },
  catChipActive: { backgroundColor: BRAND_GRADIENT[0], borderColor: BRAND_GRADIENT[0] },
  catChipText: { fontSize: 12, fontWeight: "700" },
  submitBtn: { backgroundColor: "#0F172A", padding: 16, borderRadius: 12, alignItems: "center" },
  submitBtnText: { color: "#FFF", fontWeight: "800" },
  
  emptyBox: { alignItems: 'center', padding: 40, borderStyle: 'dashed', borderWidth: 2, borderRadius: 20 },
  emptyTitle: { fontWeight: '800', marginTop: 10, fontSize: 16 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 5 },
  
  requestCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  reqName: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  reqInfo: { fontSize: 13 },
  reqActions: { flexDirection: "row", gap: 10, paddingLeft: 10 },
  actionBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  loader: { position: 'absolute' },
  
  champCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
  champIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  champTitle: { fontSize: 15, fontWeight: '800' },
  champSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  deleteBtn: { padding: 10, borderRadius: 10 },
  
  deleteAccountBtn: { marginTop: 10, padding: 16, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  deleteAccountText: { color: "#EF4444", fontSize: 14, fontWeight: "800" },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 24, padding: 25, borderWidth: 1, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalCloseBtn: { padding: 5 },
  modalText: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  
  bankBox: { padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  bankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  bankLabel: { fontSize: 12, fontWeight: '700', width: 65, marginLeft: 8 },
  bankValue: { fontSize: 14, fontWeight: '800', flex: 1 },
  bankValueClabe: { fontSize: 16, fontWeight: '900', flex: 1, letterSpacing: 1 },

  referenceBox: { padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 25 },
  refLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  refValue: { fontSize: 16, fontWeight: '900', marginTop: 5, textAlign: 'center' },

  whatsappBtn: { backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, gap: 8 },
  whatsappBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' }
});