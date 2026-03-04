import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Image, Modal, TextInput, Alert,
  RefreshControl // <-- 1. Importamos RefreshControl
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase"; 
import { BRAND_GRADIENT } from "@/constants/colors";

const BASE_URL = "https://www.flagdurango.com.mx";

export default function PlayerDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [playerTeams, setPlayerTeams] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- 2. Nuevo estado para el Refresh ---
  const [refreshing, setRefreshing] = useState(false);
  
  const [uploadingImage, setUploadingImage] = useState(false);

  // --- Modales ---
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // --- Formulario de Unión ---
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [joinPosition, setJoinPosition] = useState("");
  const [joinJersey, setJoinJersey] = useState("");

  // --- Formulario de Edición de Perfil ---
  const [editPhone, setEditPhone] = useState("");
  const [editBlood, setEditBlood] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [editSeasons, setEditSeasons] = useState("");
  const [editSince, setEditSince] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const sessionData = await AsyncStorage.getItem("userSession");
      if (!sessionData) {
        router.replace("/login");
        return;
      }
      const parsedUser = JSON.parse(sessionData);
      setUser(parsedUser);

      // 1. Llamar a API de Perfil
      const profileRes = await fetch(`${BASE_URL}/api/player/profile?user_id=${parsedUser.id}`);
      const profileJson = await profileRes.json();

      if (profileJson.success) {
        setPlayerInfo(profileJson.data);
        setPlayerTeams(profileJson.playerTeams || []);
        
        setJoinPosition(profileJson.data.position || "");
        setJoinJersey(profileJson.data.jersey_number ? profileJson.data.jersey_number.toString() : "");
        setEditPhone(profileJson.data.phone || "");
        setEditBlood(profileJson.data.blood_type || "");
        setEditEmergencyName(profileJson.data.emergency_contact || "");
        setEditEmergencyPhone(profileJson.data.emergency_phone || "");
        setEditSeasons(profileJson.data.seasons_played?.toString() || "0"); 
        setEditSince(profileJson.data.playing_since || "");                
      }

      // 2. Llamar a API de Solicitudes
      const reqRes = await fetch(`${BASE_URL}/api/team-join-requests?player_user_id=${parsedUser.id}`);
      const reqJson = await reqRes.json();
      if (reqJson.success) {
        setJoinRequests(reqJson.data || []);
      }

    } catch (e) {
      console.error("Error cargando dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. Función que se dispara al deslizar hacia abajo ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const localUri = result.assets[0].uri;
        const filename = localUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        const formData = new FormData();
        // @ts-ignore
        formData.append('file', { uri: localUri, name: filename, type });
        formData.append('folder', 'avatars');

        const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (uploadData.success) {
          const updateRes = await fetch(`${BASE_URL}/api/player/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user.id,
              photo_url: uploadData.url
            })
          });
          const updateData = await updateRes.json();
          
          if (updateData.success) {
            setPlayerInfo((prev: any) => ({ ...prev, photo_url: uploadData.url }));
            Alert.alert("¡Éxito!", "Foto actualizada correctamente.");
          } else {
            Alert.alert("Error", "No se pudo actualizar el perfil.");
          }
        }
      }
    } catch (error) {
      Alert.alert("Error", "Error al conectar con el servidor.");
    } finally {
      setUploadingImage(false);
    }
  };

  const openJoinModal = async () => {
    try {
      const { data: teamsList } = await supabase.from("teams").select("id, name, category, logo_url").order("name");
      setAvailableTeams(teamsList || []);
      setShowJoinModal(true);
    } catch (error) {
      console.error(error);
    }
  };

  const handleJoinTeam = async () => {
    if (!selectedTeamId) return Alert.alert("Aviso", "Selecciona un equipo.");

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/team-join-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_user_id: user.id,
          player_id: playerInfo.id,
          team_id: selectedTeamId,
          player_name: playerInfo.name,
          position: joinPosition.toUpperCase(),
          jersey_number: parseInt(joinJersey) || 0,
        })
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert("¡Éxito!", data.message);
        setShowJoinModal(false);
        loadDashboardData();
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/player/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          phone: editPhone,
          blood_type: editBlood,
          emergency_contact: editEmergencyName,
          emergency_phone: editEmergencyPhone,
          seasons_played: parseInt(editSeasons) || 0,
          playing_since: editSince,
        })
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert("¡Perfil Actualizado!", "Tus datos se guardaron correctamente.");
        setShowEditModal(false);
        loadDashboardData();
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el perfil.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "⚠️ Eliminar Cuenta",
      "¿Estás seguro? Esta acción desactivará tu cuenta y no podrás iniciar sesión. Tu historial en los partidos se mantendrá por los registros de la liga.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, Eliminar Cuenta", style: "destructive", onPress: async () => {
          try {
            const res = await fetch(`${BASE_URL}/api/auth/delete-account`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: user.id })
            });
            const data = await res.json();
            if (data.success) {
              await AsyncStorage.removeItem("userSession");
              router.replace("/login");
              Alert.alert("Cuenta Eliminada", "Tu cuenta ha sido eliminada del sistema.");
            } else {
              Alert.alert("Error", data.message || "No se pudo eliminar la cuenta.");
            }
          } catch(e) {
            Alert.alert("Error", "Problema de conexión.");
          }
        }}
      ]
    );
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userSession");
    router.replace("/login");
  };

  // Prevenimos que se vea el Loader gigante si el usuario solo está arrastrando para recargar
  if (loading && !refreshing && !playerInfo) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={BRAND_GRADIENT[0]} /></View>;
  }

  const myCategories = playerTeams.map(pt => pt.team?.category);
  const mainColor = playerTeams.length > 0 && playerTeams[0].team?.color1 ? playerTeams[0].team.color1 : "#1E293B";
  const qrValue = playerInfo ? `PLAYER-${playerInfo.id}` : "INVALID";
  const hasPhoto = playerInfo?.photo_url && !playerInfo.photo_url.startsWith('blob:');

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <Pressable onPress={handleLogout} style={styles.logoutIcon}>
          <Ionicons name="log-out-outline" size={26} color="#EF4444" />
        </Pressable>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        // --- 4. Conectamos el RefreshControl ---
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={BRAND_GRADIENT[0]} 
            colors={[BRAND_GRADIENT[0]]} 
          />
        }
      >
        
        {/* --- GAFETE DIGITAL (MASTER QR) --- */}
        {playerInfo && (
          <View style={[styles.qrCard, { borderColor: mainColor }]}>
            <LinearGradient colors={[mainColor, "#0F172A"]} style={styles.qrHeader}>
              <Text style={styles.qrTeamName}>FLAG DURANGO PASSPORT</Text>
            </LinearGradient>
            
            <View style={styles.qrBody}>
              <Pressable style={styles.playerPhotoRing} onPress={handlePickImage} disabled={uploadingImage}>
                {uploadingImage ? (
                  <ActivityIndicator color={mainColor} size="small" />
                ) : hasPhoto ? (
                  <Image source={{ uri: playerInfo.photo_url }} style={styles.playerPhoto} resizeMode="cover" />
                ) : (
                  <Ionicons name="person" size={45} color="#CBD5E1" />
                )}
                <View style={[styles.cameraBadge, { backgroundColor: mainColor }]}>
                  <Ionicons name="camera" size={14} color="#FFF" />
                </View>
              </Pressable>

              <Text style={styles.playerName}>{playerInfo.name}</Text>
              
              <View style={styles.autoSaveBadge}>
                <Ionicons name="cloud-done-outline" size={12} color="#94A3B8" />
                <Text style={styles.autoSaveText}>Sincronizado</Text>
              </View>

              {/* Stats Rápidas en el Gafete */}
              <View style={styles.badgeStatsRow}>
                <View style={styles.badgeStat}>
                  <Text style={styles.badgeStatValue}>{playerInfo.seasons_played || 0}</Text>
                  <Text style={styles.badgeStatLabel}>TEMPS</Text>
                </View>
                <View style={styles.badgeStatDivider} />
                <View style={styles.badgeStat}>
                  <Text style={styles.badgeStatValue}>{playerInfo.blood_type || "N/R"}</Text>
                  <Text style={styles.badgeStatLabel}>SANGRE</Text>
                </View>
              </View>

              <View style={styles.qrWrapper}>
                <QRCode value={qrValue} size={150} color="#0F172A" backgroundColor="#FFFFFF" />
              </View>
              <Text style={styles.qrInstructions}>Muestra este QR al árbitro en el campo</Text>
            </View>
            
            <Pressable style={styles.editProfileBtn} onPress={() => setShowEditModal(true)}>
              <Ionicons name="create-outline" size={16} color="#FFF" />
              <Text style={styles.editProfileText}>Editar Info y Temporadas</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis Equipos</Text>
          <Pressable style={styles.addBtn} onPress={openJoinModal}>
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={styles.addBtnText}>Unirme a otro</Text>
          </Pressable>
        </View>

        {playerTeams.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Sin equipo actualmente.</Text>
          </View>
        ) : (
          playerTeams.map((pt, idx) => (
            <View key={idx} style={styles.teamCard}>
              <View style={styles.teamCardInfo}>
                <Text style={styles.teamCardName}>{pt.team?.name}</Text>
                <Text style={styles.teamCardCat}>{pt.team?.category}</Text>
              </View>
              <View style={styles.teamCardStats}>
                <Text style={styles.teamCardJersey}>#{pt.jersey_number}</Text>
                <Text style={styles.teamCardPos}>{pt.position}</Text>
              </View>
            </View>
          ))
        )}

        {joinRequests.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Estatus de Solicitudes</Text>
            {joinRequests.map(req => (
              <View key={req.id} style={styles.requestCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reqTeamName}>{req.teams?.name}</Text>
                  <Text style={styles.reqCatName}>{req.teams?.category}</Text>
                </View>
                <View style={[
                  styles.statusBadge, 
                  req.status === 'accepted' ? styles.badgeGreen : 
                  req.status === 'rejected' ? styles.badgeRed : styles.badgeYellow
                ]}>
                  <Text style={styles.statusText}>{req.status.toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <Pressable 
          style={styles.deleteAccountBtn} 
          onPress={handleDeleteAccount}
        >
          <Ionicons name="warning-outline" size={18} color="#EF4444" />
          <Text style={styles.deleteAccountText}>Eliminar Mi Cuenta</Text>
        </Pressable>

      </ScrollView>

      {/* MODAL: BUSCAR EQUIPO */}
      <Modal visible={showJoinModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inscribirse en Equipo</Text>
              <Pressable onPress={() => setShowJoinModal(false)}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 350 }}>
              <View style={styles.teamList}>
                {availableTeams.map(t => {
                  const isBlocked = myCategories.includes(t.category);
                  const isSelected = selectedTeamId === t.id;
                  return (
                    <Pressable 
                      key={t.id} 
                      disabled={isBlocked}
                      style={[styles.teamItem, isSelected && styles.teamItemActive, isBlocked && styles.teamItemBlocked]}
                      onPress={() => setSelectedTeamId(t.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.teamItemText, isSelected && styles.teamItemTextActive]}>{t.name}</Text>
                        <Text style={styles.teamItemCatText}>{t.category}</Text>
                      </View>
                      {isBlocked && <Ionicons name="lock-closed" size={16} color="#EF4444" />}
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.divider} />
              <View style={styles.rowInputs}>
                <View style={styles.inputGroup}><Text style={styles.inputTitle}>Posición</Text>
                  <TextInput style={styles.modalInput} value={joinPosition} onChangeText={setJoinPosition} autoCapitalize="characters" />
                </View>
                <View style={styles.inputGroup}><Text style={styles.inputTitle}>Jersey #</Text>
                  <TextInput style={styles.modalInput} value={joinJersey} onChangeText={setJoinJersey} keyboardType="numeric" maxLength={2} />
                </View>
              </View>
            </ScrollView>
            <Pressable style={styles.submitBtn} onPress={handleJoinTeam}><Text style={styles.submitBtnText}>Enviar Solicitud</Text></Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL: EDITAR PERFIL */}
      <Modal visible={showEditModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Información de Perfil</Text>
              <Pressable onPress={() => setShowEditModal(false)}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <Text style={styles.inputTitle}>Experiencia en la liga</Text>
              <View style={styles.rowInputs}>
                 <View style={{flex: 1}}>
                    <TextInput style={styles.modalInputLeft} placeholder="Temporadas" value={editSeasons} onChangeText={setEditSeasons} keyboardType="numeric" />
                 </View>
                 <View style={{flex: 1}}>
                    <TextInput style={styles.modalInputLeft} placeholder="Año de Inicio" value={editSince} onChangeText={setEditSince} keyboardType="numeric" maxLength={4} />
                 </View>
              </View>

              <Text style={styles.inputTitle}>Datos de Salud</Text>
              <TextInput style={styles.modalInputLeft} placeholder="Tipo de Sangre" value={editBlood} onChangeText={setEditBlood} />
              <TextInput style={styles.modalInputLeft} placeholder="Teléfono Personal" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
              
              <Text style={styles.inputTitle}>Contacto Emergencia</Text>
              <TextInput style={styles.modalInputLeft} placeholder="Nombre Contacto" value={editEmergencyName} onChangeText={setEditEmergencyName} />
              <TextInput style={styles.modalInputLeft} placeholder="Tel. Emergencia" value={editEmergencyPhone} onChangeText={setEditEmergencyPhone} keyboardType="phone-pad" />
            </ScrollView>
            <Pressable style={styles.submitBtn} onPress={handleEditProfile}><Text style={styles.submitBtnText}>Guardar Cambios</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 15, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderColor: "#E2E8F0" },
  headerTitle: { fontSize: 26, fontWeight: "900", color: "#0F172A", letterSpacing: -1 },
  logoutIcon: { padding: 5 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  qrCard: { backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 2, elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, overflow: "hidden", marginBottom: 25 },
  qrHeader: { paddingVertical: 14, alignItems: "center" },
  qrTeamName: { color: "#FFFFFF", fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  qrBody: { alignItems: "center", padding: 20 },
  playerPhotoRing: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#FFFFFF", elevation: 5, marginTop: -45, marginBottom: 10 },
  playerPhoto: { width: "100%", height: "100%", borderRadius: 42 },
  cameraBadge: { position: "absolute", bottom: 0, right: -4, width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  playerName: { fontSize: 22, fontWeight: "900", color: "#0F172A", marginBottom: 5 },
  autoSaveBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  autoSaveText: { fontSize: 10, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase" },

  // Estilos de Stats del Gafete
  badgeStatsRow: { flexDirection: "row", backgroundColor: "#F8FAFC", borderRadius: 12, padding: 10, marginBottom: 20, borderWidth: 1, borderColor: "#E2E8F0" },
  badgeStat: { alignItems: "center", minWidth: 65 },
  badgeStatValue: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  badgeStatLabel: { fontSize: 8, fontWeight: "800", color: "#94A3B8" },
  badgeStatDivider: { width: 1, height: 20, backgroundColor: "#E2E8F0", marginHorizontal: 15 },

  qrWrapper: { padding: 15, backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0" },
  qrInstructions: { fontSize: 11, color: "#94A3B8", textAlign: "center", marginTop: 12, fontWeight: "600" },
  editProfileBtn: { backgroundColor: "#1E293B", flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 12, gap: 8 },
  editProfileText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#0F172A" },
  addBtn: { flexDirection: "row", backgroundColor: BRAND_GRADIENT[0], paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignItems: "center", gap: 4 },
  addBtnText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  emptyCard: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0", borderStyle: "dashed" },
  emptyText: { color: "#64748B", fontSize: 13 },
  teamCard: { flexDirection: "row", backgroundColor: "#FFFFFF", padding: 15, borderRadius: 16, marginBottom: 10, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  teamCardInfo: { flex: 1 },
  teamCardName: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  teamCardCat: { fontSize: 11, color: "#64748B" },
  teamCardStats: { alignItems: "center", backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  teamCardJersey: { fontSize: 16, fontWeight: "900", color: BRAND_GRADIENT[0] },
  teamCardPos: { fontSize: 10, fontWeight: "800", color: "#64748B" },
  requestCard: { flexDirection: "row", backgroundColor: "#FFFFFF", padding: 15, borderRadius: 16, marginBottom: 10, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  reqTeamName: { fontSize: 15, fontWeight: "800" },
  reqCatName: { fontSize: 11, color: "#64748B" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeYellow: { backgroundColor: "#FEF3C7" },
  badgeGreen: { backgroundColor: "#D1FAE5" },
  badgeRed: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 10, fontWeight: "800" },
  
  deleteAccountBtn: { marginTop: 40, padding: 16, backgroundColor: "#FEF2F2", borderRadius: 16, borderWidth: 1, borderColor: "#FECACA", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  deleteAccountText: { color: "#EF4444", fontSize: 14, fontWeight: "800" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 19, fontWeight: "900" },
  teamList: { gap: 8 },
  teamItem: { flexDirection: "row", padding: 12, backgroundColor: "#F8FAFC", borderRadius: 12, marginBottom: 5, borderWidth: 1, borderColor: "#E2E8F0" },
  teamItemActive: { backgroundColor: "#EFF6FF", borderColor: BRAND_GRADIENT[0] },
  teamItemBlocked: { opacity: 0.4 },
  teamItemText: { fontSize: 14, fontWeight: "700" },
  teamItemTextActive: { color: BRAND_GRADIENT[0] },
  teamItemCatText: { fontSize: 10, color: "#64748B" },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 15 },
  rowInputs: { flexDirection: "row", gap: 10, marginBottom: 10 },
  inputGroup: { flex: 1 },
  inputTitle: { fontSize: 10, fontWeight: "700", color: "#64748B", marginBottom: 5, textTransform: "uppercase" },
  modalInput: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12, fontSize: 16, fontWeight: "700", textAlign: "center" },
  modalInputLeft: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 14 },
  submitBtn: { backgroundColor: "#0F172A", padding: 16, borderRadius: 14, alignItems: "center", marginTop: 10 },
  submitBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});