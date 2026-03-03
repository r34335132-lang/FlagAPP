import React, { useState, useEffect, useCallback } from "react";
import { 
  View, Text, StyleSheet, ScrollView, Pressable, 
  Platform, Alert, ActivityIndicator, TextInput, Image 
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from 'expo-image-picker';
import { BRAND_GRADIENT } from "@/constants/colors";
import { useTeams } from "@/hooks/useTeams";

// 🚨 IMPORTANTE: CAMBIA ESTO POR LA IP DE TU COMPU (ej. 192.168.1.75)
const API_BASE = "https://www.flagdurango.com.mx/api";

export default function PlayerDashboard() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const { data: allTeams, isLoading: teamsLoading } = useTeams();
  
  const [activeTab, setActiveTab] = useState<"perfil" | "unirse" | "equipos">("perfil");
  const [loading, setLoading] = useState(true);

  // Datos del Jugador
  const [myPlayers, setMyPlayers] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  // Formularios
  const [profileForm, setProfileForm] = useState({
    phone: "", birth_date: "", blood_type: "", medical_conditions: "",
    emergency_contact_name: "", emergency_contact_phone: "", photo_url: ""
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [joinForm, setJoinForm] = useState({ team_id: "", position: "", jersey_number: "" });
  const [sendingRequest, setSendingRequest] = useState(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("userSession").then(res => {
        if (res) {
          const u = JSON.parse(res);
          setUser(u);
          loadPlayerData(u);
        } else {
          router.replace("/login");
        }
      });
    }, [])
  );

  const loadPlayerData = async (userData: any) => {
    setLoading(true);
    try {
      // 1. Cargar jugadores y FILTRAR MANUALMENTE POR EL USUARIO ACTUAL
      const pRes = await fetch(`${API_BASE}/players`);
      const pData = await pRes.json();
      
      if (pData.success) {
        // 🚨 AQUÍ ESTÁ LA MAGIA: Filtramos estrictamente los datos para que solo agarre los tuyos
        const misJugadoresReales = pData.data.filter((p: any) => p.user_id === userData.id);
        setMyPlayers(misJugadoresReales);

        // Si tiene un perfil creado, llenamos el formulario con sus datos
        if (misJugadoresReales.length > 0) {
          const p = misJugadoresReales[0];
          setProfileForm({
            phone: p.phone || "",
            birth_date: p.birth_date || "",
            blood_type: p.blood_type || "",
            medical_conditions: p.medical_conditions || "",
            emergency_contact_name: p.emergency_contact_name || "",
            emergency_contact_phone: p.emergency_contact_phone || "",
            photo_url: p.photo_url || ""
          });
        }
      }

      // 2. Cargar sus solicitudes enviadas
      const rRes = await fetch(`${API_BASE}/team-join-requests?player_user_id=${userData.id}`);
      const rData = await rRes.json();
      if (rData.success) {
        setMyRequests(rData.data);
      }
    } catch (error) {
      console.log("Error cargando jugador:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── ENVIAR SOLICITUD DE INGRESO A EQUIPO ──
  const handleJoinRequest = async () => {
    if (!joinForm.team_id || !joinForm.position || !joinForm.jersey_number) {
      return Alert.alert("Error", "Selecciona un equipo, posición y número de jersey.");
    }

    const selectedTeamId = Number(joinForm.team_id);
    const targetTeam = allTeams?.find((t: any) => t.id === selectedTeamId);
    if (!targetTeam) return;

    // 🚨 REGLA: Bloquear si ya juega en la misma categoría (Ahora sí funcionará perfecto)
    const hasSameCategory = myPlayers.some(p => {
      const teamOfPlayer = allTeams?.find((t: any) => t.id === p.team_id);
      return teamOfPlayer && teamOfPlayer.category === targetTeam.category;
    });

    if (hasSameCategory) {
      return Alert.alert(
        "Operación Denegada", 
        `Ya perteneces a un equipo en la categoría "${targetTeam.category.replace("-", " ").toUpperCase()}". Las reglas no permiten jugar en dos equipos de la misma categoría.`
      );
    }

    // Bloquear si ya mandó solicitud a ese mismo equipo
    const alreadyRequested = myRequests.some(r => r.team_id === selectedTeamId && (r.status === "pending" || r.status === "pending_coordinator"));
    if (alreadyRequested) {
      return Alert.alert("Atención", "Ya tienes una solicitud en espera para este equipo.");
    }

    setSendingRequest(true);
    try {
      const response = await fetch(`${API_BASE}/team-join-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_user_id: user.id,
          team_id: selectedTeamId,
          player_name: user.username,
          position: joinForm.position,
          jersey_number: joinForm.jersey_number
        }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert("¡Solicitud Enviada!", "El coach del equipo debe aprobar tu solicitud.");
        setJoinForm({ team_id: "", position: "", jersey_number: "" });
        setActiveTab("equipos");
        loadPlayerData(user);
      } else {
        Alert.alert("Error", data.message || "No se pudo enviar la solicitud");
      }
    } catch (e) {
      Alert.alert("Error", "Problema de conexión");
    } finally {
      setSendingRequest(false);
    }
  };

  // ── SUBIR FOTO DEL JUGADOR ──
  const pickAndUploadImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0].uri) {
      setUploadingPhoto(true);
      try {
        const formData = new FormData();
        const uri = result.assets[0].uri;
        const filename = uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('file', { uri, name: filename, type } as any);
        formData.append('folder', 'player-photos');

        const res = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        
        if (data.success) {
          setProfileForm({ ...profileForm, photo_url: data.url });
          Alert.alert("Éxito", "Foto subida correctamente. Da clic en 'Guardar Perfil' para confirmar.");
        } else {
          Alert.alert("Error", "No se pudo subir la imagen");
        }
      } catch (e) {
        Alert.alert("Error", "Fallo al subir la imagen al servidor");
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  // ── GUARDAR PERFIL MÉDICO/PERSONAL ──
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/player/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          ...profileForm
        }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Perfil Guardado", "Tu información ha sido actualizada.");
      } else {
        // En caso de que no haya perfil previo
        Alert.alert("Aviso", "Es necesario que el coach apruebe tu solicitud de ingreso antes de actualizar los datos médicos completos.");
      }
    } catch (e) {
      Alert.alert("Error", "Hubo un problema de conexión");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userSession");
    router.replace("/(tabs)/");
  };

  const topPad = insets.top + (Platform.OS === "web" ? 20 : 10);

  if (loading && !user) return <View style={[styles.container, {justifyContent: "center"}]}><ActivityIndicator size="large" color={BRAND_GRADIENT[0]} /></View>;

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.replace("/(tabs)/")} hitSlop={15}><Ionicons name="home" size={24} color="#FFF" /></Pressable>
          <Text style={styles.headerTitle}>Panel de Jugador</Text>
          <Pressable onPress={handleLogout} hitSlop={15}><Ionicons name="log-out-outline" size={26} color="#FFF" /></Pressable>
        </View>
        <Text style={styles.welcomeText}>¡Hola, {user?.username}!</Text>
      </LinearGradient>

      {/* ── TABS ── */}
      <View style={styles.tabsRow}>
        <TabButton title="Mi Perfil" icon="person" active={activeTab === "perfil"} onPress={() => setActiveTab("perfil")} />
        <TabButton title="Mis Equipos" icon="shield" active={activeTab === "equipos"} onPress={() => setActiveTab("equipos")} />
        <TabButton title="Unirme" icon="add-circle" active={activeTab === "unirse"} onPress={() => setActiveTab("unirse")} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* ── PESTAÑA: MI PERFIL ── */}
        {activeTab === "perfil" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Información Personal</Text>
            
            {/* Foto de Perfil */}
            <View style={styles.photoContainer}>
              {profileForm.photo_url ? (
                <Image source={{ uri: profileForm.photo_url }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#94A3B8" />
                </View>
              )}
              <Pressable style={styles.uploadBtn} onPress={pickAndUploadImage} disabled={uploadingPhoto}>
                {uploadingPhoto ? <ActivityIndicator size="small" color="#0F172A" /> : <Text style={styles.uploadBtnText}>Subir Foto</Text>}
              </Pressable>
            </View>

            <InputRow label="Teléfono Personal" value={profileForm.phone} onChange={(t:string) => setProfileForm({...profileForm, phone: t})} placeholder="618..." keyboardType="numeric" />
            <InputRow label="Fecha de Nacimiento" value={profileForm.birth_date} onChange={(t:string) => setProfileForm({...profileForm, birth_date: t})} placeholder="YYYY-MM-DD" />
            
            <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Datos Médicos</Text>
            <InputRow label="Tipo de Sangre" value={profileForm.blood_type} onChange={(t:string) => setProfileForm({...profileForm, blood_type: t})} placeholder="Ej. O+" />
            <InputRow label="Condiciones Médicas (Alergias)" value={profileForm.medical_conditions} onChange={(t:string) => setProfileForm({...profileForm, medical_conditions: t})} placeholder="Ninguna" />
            <InputRow label="Contacto de Emergencia" value={profileForm.emergency_contact_name} onChange={(t:string) => setProfileForm({...profileForm, emergency_contact_name: t})} placeholder="Nombre del familiar" />
            <InputRow label="Tel. de Emergencia" value={profileForm.emergency_contact_phone} onChange={(t:string) => setProfileForm({...profileForm, emergency_contact_phone: t})} placeholder="618..." keyboardType="numeric" />

            <Pressable style={styles.saveBtn} onPress={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar Perfil</Text>}
            </Pressable>
          </View>
        )}

        {/* ── PESTAÑA: MIS EQUIPOS Y SOLICITUDES ── */}
        {activeTab === "equipos" && (
          <View>
            <Text style={styles.sectionTitle}>Equipos Actuales</Text>
            {myPlayers.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="sad-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>Aún no estás en ningún equipo oficial.</Text>
              </View>
            ) : (
              myPlayers.map(p => {
                const team = allTeams?.find((t: any) => t.id === p.team_id);
                return (
                  <View key={p.id} style={styles.teamCard}>
                    <Text style={styles.teamName}>{team?.name || "Equipo Desconocido"}</Text>
                    <Text style={styles.teamCat}>Categoría: {team?.category?.replace("-", " ").toUpperCase()}</Text>
                    <View style={styles.playerInfoBox}>
                      <Text style={styles.playerInfoText}>Posición: <Text style={{fontWeight:'800'}}>{p.position}</Text></Text>
                      <Text style={styles.playerInfoText}>Jersey: <Text style={{fontWeight:'800'}}>#{p.jersey_number}</Text></Text>
                    </View>
                  </View>
                )
              })
            )}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Solicitudes Pendientes</Text>
            {myRequests.filter(r => r.status === "pending" || r.status === "rejected").length === 0 ? (
              <Text style={styles.emptyTextSimple}>No tienes solicitudes enviadas o pendientes.</Text>
            ) : (
              myRequests.filter(r => r.status === "pending" || r.status === "rejected").map(r => (
                <View key={r.id} style={styles.requestCard}>
                  <View>
                    <Text style={styles.reqTeamName}>{r.teams?.name}</Text>
                    <Text style={styles.reqDate}>Enviada el: {new Date(r.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={[styles.badge, r.status === "pending" ? styles.bgYellow : styles.bgRed]}>
                    <Text style={styles.badgeText}>{r.status === "pending" ? "ESPERANDO" : "RECHAZADA"}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── PESTAÑA: UNIRSE A UN EQUIPO ── */}
        {activeTab === "unirse" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Enviar Solicitud</Text>
            <Text style={styles.subtitle}>Selecciona el equipo al que quieres unirte.</Text>

            <Text style={styles.label}>Equipos Disponibles</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
              {allTeams?.map((t: any) => {
                const isActive = joinForm.team_id === t.id.toString();
                return (
                  <Pressable 
                    key={t.id} 
                    style={[styles.teamChip, isActive && styles.teamChipActive]}
                    onPress={() => setJoinForm({...joinForm, team_id: t.id.toString()})}
                  >
                    <Text style={[styles.teamChipText, isActive && styles.teamChipTextActive]}>{t.name}</Text>
                    <Text style={[styles.teamChipSub, isActive && styles.teamChipTextActive]}>{t.category.replace("-", " ")}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            <InputRow label="Tu Posición (Ej. QB, WR, C)" value={joinForm.position} onChange={(t:string) => setJoinForm({...joinForm, position: t})} placeholder="Escribe tu posición" />
            <InputRow label="Número de Jersey" value={joinForm.jersey_number} onChange={(t:string) => setJoinForm({...joinForm, jersey_number: t})} placeholder="Ej. 12" keyboardType="numeric" />

            <Pressable style={styles.saveBtn} onPress={handleJoinRequest} disabled={sendingRequest || teamsLoading}>
              {sendingRequest ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Enviar Solicitud al Coach</Text>}
            </Pressable>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function InputRow({ label, value, onChange, placeholder, keyboardType = "default" }: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor="#94A3B8" value={value} onChangeText={onChange} keyboardType={keyboardType} />
    </View>
  );
}

function TabButton({ title, icon, active, onPress }: any) {
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={active ? "#FFF" : "#64748B"} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  welcomeText: { color: "#FFF", fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  
  tabsRow: { flexDirection: "row", backgroundColor: "#FFFFFF", padding: 10, elevation: 3, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: {width:0, height:2} },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 12, gap: 6 },
  tabBtnActive: { backgroundColor: BRAND_GRADIENT[0] },
  tabText: { color: "#64748B", fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: "#FFF" },

  body: { padding: 16 },
  card: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", elevation: 2, marginBottom: 20 },
  sectionTitle: { color: "#0F172A", fontSize: 18, fontWeight: "900", marginBottom: 15 },
  subtitle: { color: "#64748B", fontSize: 13, marginBottom: 15 },

  // Foto de Perfil
  photoContainer: { alignItems: "center", marginBottom: 20 },
  avatarImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: BRAND_GRADIENT[0] },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#E2E8F0", borderStyle: "dashed" },
  uploadBtn: { marginTop: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#F1F5F9", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  uploadBtnText: { color: "#0F172A", fontWeight: "700", fontSize: 12 },

  inputGroup: { marginBottom: 15 },
  label: { color: "#64748B", fontSize: 12, fontWeight: "800", marginBottom: 6, textTransform: "uppercase" },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 16, height: 50, color: "#0F172A", fontWeight: "600" },

  saveBtn: { backgroundColor: BRAND_GRADIENT[0], height: 54, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 10 },
  saveBtnText: { color: "#FFF", fontWeight: "800", fontSize: 16 },

  // Equipos Chips
  pickerScroll: { marginBottom: 20 },
  teamChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  teamChipActive: { backgroundColor: BRAND_GRADIENT[0], borderColor: BRAND_GRADIENT[0] },
  teamChipText: { color: "#0F172A", fontWeight: "800", fontSize: 14 },
  teamChipSub: { color: "#64748B", fontWeight: "600", fontSize: 10, marginTop: 2, textTransform: "capitalize" },
  teamChipTextActive: { color: "#FFF" },

  // Tarjetas de Equipos Actuales
  emptyBox: { alignItems: "center", paddingVertical: 30, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 2, borderColor: "#F1F5F9", borderStyle: "dashed", marginBottom: 20 },
  emptyText: { color: "#64748B", fontWeight: "600", marginTop: 10 },
  emptyTextSimple: { color: "#64748B", fontStyle: "italic", marginBottom: 10 },

  teamCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0", elevation: 1 },
  teamName: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  teamCat: { fontSize: 12, color: "#64748B", marginBottom: 12, fontWeight: "700" },
  playerInfoBox: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#F8FAFC", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  playerInfoText: { fontSize: 13, color: "#0F172A" },

  // Tarjetas de Solicitudes
  requestCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  reqTeamName: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  reqDate: { fontSize: 12, color: "#64748B", marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bgYellow: { backgroundColor: "#F59E0B20" },
  bgRed: { backgroundColor: "#EF444420" },
  badgeText: { fontSize: 10, fontWeight: "900", color: "#0F172A" },
});