import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Image, Modal, TextInput, Alert,
  RefreshControl, useColorScheme, KeyboardAvoidingView, Platform, useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase"; 
import { BRAND_GRADIENT, Colors } from "@/constants/colors";
import PlayerCredentialCard from "@/components/PlayerCredentialCard";

const BASE_URL = "https://www.flagdurango.com.mx";

export default function PlayerDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";
  
  const [user, setUser] = useState<any>(null);
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [playerTeams, setPlayerTeams] = useState<any[]>([]);
  const [gameStats, setGameStats] = useState<any[]>([]);
  
  const [mvpsList, setMvpsList] = useState<any[]>([]); 
  
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [joinPosition, setJoinPosition] = useState("");
  const [joinJersey, setJoinJersey] = useState("");

  const [editPhone, setEditPhone] = useState("");
  const [editBlood, setEditBlood] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [editSeasons, setEditSeasons] = useState("");
  const [editSince, setEditSince] = useState("");

  const [activeCardIndex, setActiveCardIndex] = useState(0);

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

      // 1. Obtener Perfil y Equipos
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
        
        // 2. Obtener Estadísticas y TODOS los MVPs
        try {
          const statsRes = await fetch(`${BASE_URL}/api/player-stats?player_id=${profileJson.data.id}`);
          const contentType = statsRes.headers.get("content-type");
          if (statsRes.ok && contentType && contentType.includes("application/json")) {
            const statsJson = await statsRes.json();
            if (statsJson.success) {
              setGameStats(statsJson.data || []);
            }
          }

          const { data: mvpsData, error: mvpError } = await supabase
            .from("mvps")
            .select("*")
            .eq("player_id", profileJson.data.id);
            
          if (!mvpError && mvpsData) {
            setMvpsList(mvpsData);
          }
        } catch (err) {
          console.log("No se pudieron cargar las estadísticas", err);
        }
      }

      // 3. API Solicitudes
      const reqRes = await fetch(`${BASE_URL}/api/team-join-requests?player_user_id=${parsedUser.id}`);
      const contentTypeReq = reqRes.headers.get("content-type");
      if (reqRes.ok && contentTypeReq && contentTypeReq.includes("application/json")) {
         const reqJson = await reqRes.json();
         if (reqJson.success) {
           setJoinRequests(reqJson.data || []);
         }
      }

    } catch (e) {
      console.error("Error cargando dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

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
        aspect: [3, 4],
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
      "¿Estás seguro? Esta acción desactivará tu cuenta y no podrás iniciar sesión. Tu historial en los partidos se mantendrá.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, Eliminar", style: "destructive", onPress: async () => {
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

  // 🔥 1. Variables preparadas (Antes del early return)
  const myCategories = playerTeams.map(pt => pt.team?.category);
  const teamsToRender = playerTeams.length > 0 ? playerTeams : [{ _id: 'empty' }];
  
  const activeTeam = teamsToRender[activeCardIndex];
  const activeTeamId = activeTeam?.team?.id || activeTeam?.team_id;

  // 🔥 2. HOOK USEMEMO (Antes del early return)
  const activeTeamStats = useMemo(() => {
    if (activeTeam?._id === 'empty') return { tds: 0, passes: 0, ints: 0, sacks: 0, mvps: 0 };
    
    const filteredStats = gameStats.filter(s => s.team_id === activeTeamId);
    
    const totals = filteredStats.reduce((acc, curr) => ({
      tds: acc.tds + (Number(curr.touchdowns_totales) || 0),
      passes: acc.passes + (Number(curr.pases_completos) || 0),
      ints: acc.ints + (Number(curr.intercepciones) || 0),
      sacks: acc.sacks + (Number(curr.sacks) || 0),
    }), { tds: 0, passes: 0, ints: 0, sacks: 0 });

    const mvps = mvpsList.filter(m => m.team_id === activeTeamId).length;

    return { ...totals, mvps };
  }, [gameStats, mvpsList, activeTeamId, activeTeam]);

  // 🛑 3. EARLY RETURN DE CARGA (Después de todos los Hooks)
  if (loading && !refreshing && !playerInfo) {
    return <View style={[styles.loading, { backgroundColor: currentColors.bg }]}><ActivityIndicator size="large" color={BRAND_GRADIENT[0]} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      
      {/* HEADER DE LA PANTALLA */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: currentColors.card, borderBottomColor: currentColors.borderLight }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.push('/')} style={styles.homeIcon}>
            <Ionicons name="home-outline" size={24} color={currentColors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: currentColors.text }]}>Mi Perfil</Text>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutIcon}>
          <Ionicons name="log-out-outline" size={26} color="#EF4444" />
        </Pressable>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} colors={[BRAND_GRADIENT[0]]} />}
      >
        <View style={styles.contentWrapper}>
          
          {/* --- CARTA UPPER DECK (CREDENCIA OFICIAL) CARRUSEL --- */}
          {playerInfo && (
            <View style={styles.credentialWrapper}>
              
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const newIndex = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
                  setActiveCardIndex(newIndex);
                }}
              >
                {teamsToRender.map((pt, index) => {
                  const isPlaceholder = pt._id === 'empty';
                  const teamId = pt.team?.id || pt.team_id;
                  
                  const displayTeam = isPlaceholder ? "LIGA FLAG DURANGO" : pt.team?.name;
                  const displayJersey = isPlaceholder ? (playerInfo?.jersey_number?.toString() || "00") : pt.jersey_number?.toString();
                  const displayPosition = isPlaceholder ? (playerInfo?.position || "F/A") : pt.position;

                  // Estadísticas aisladas por carta en el carrusel
                  const cardStatsData = gameStats.filter(s => s.team_id === teamId);
                  const cardTotals = cardStatsData.reduce((acc, curr) => ({
                    touchdowns: acc.touchdowns + (Number(curr.touchdowns_totales) || 0),
                    pases: acc.pases + (Number(curr.pases_completos) || 0),
                    intercepciones: acc.intercepciones + (Number(curr.intercepciones) || 0),
                    sacks: acc.sacks + (Number(curr.sacks) || 0),
                  }), { touchdowns: 0, pases: 0, intercepciones: 0, sacks: 0 });

                  const cardMvps = mvpsList.filter(m => m.team_id === teamId).length;

                  return (
                    <View key={index} style={{ width: width - 40, alignItems: 'center' }}>
                      <PlayerCredentialCard
                        playerName={playerInfo.name}
                        playerNumber={displayJersey}
                        position={displayPosition}
                        team={displayTeam}
                        photoUrl={playerInfo.photo_url}
                        stats={{
                          ...cardTotals,
                          mvps: cardMvps
                        }}
                      />
                    </View>
                  );
                })}
              </ScrollView>

              {/* Indicadores de página (Puntitos) */}
              {teamsToRender.length > 1 && (
                <View style={styles.paginationContainer}>
                  {teamsToRender.map((_, idx) => (
                    <View 
                      key={idx} 
                      style={[styles.dot, activeCardIndex === idx && styles.activeDot]} 
                    />
                  ))}
                </View>
              )}

              <Text style={[styles.hintText, { color: currentColors.textMuted }]}>
                {teamsToRender.length > 1 
                  ? "Desliza para ver tus otros equipos • Toca para girar" 
                  : "Toca la credencial para ver tus estadísticas"}
              </Text>
              
              <View style={styles.cardActionsRow}>
                <Pressable style={[styles.actionBtn, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]} onPress={handlePickImage} disabled={uploadingImage}>
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={BRAND_GRADIENT[0]} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={18} color={currentColors.text} />
                      <Text style={[styles.actionBtnText, { color: currentColors.text }]}>Cambiar Foto</Text>
                    </>
                  )}
                </Pressable>
                
                <Pressable style={[styles.actionBtn, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]} onPress={() => setShowEditModal(true)}>
                  <Ionicons name="create-outline" size={18} color={currentColors.text} />
                  <Text style={[styles.actionBtnText, { color: currentColors.text }]}>Editar Datos</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* --- RENDIMIENTO DINÁMICO (BENTO BOX COMPLETO) --- */}
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>
            Rendimiento {activeTeam?._id === 'empty' ? '' : `en ${activeTeam?.team?.name}`}
          </Text>
          <View style={[styles.globalStatsCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#475569' }]}>
            
            <View style={styles.statsGridRow}>
              <View style={styles.statGridBox}>
                <View style={[styles.statGridIconWrap, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                  <Ionicons name="american-football" size={24} color="#3B82F6" />
                </View>
                <Text style={[styles.statGridValue, { color: currentColors.text }]}>{activeTeamStats.tds}</Text>
                <Text style={[styles.statGridLabel, { color: currentColors.textSecondary }]}>ANOTACIONES</Text>
              </View>
              <View style={styles.statGridBox}>
                <View style={[styles.statGridIconWrap, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF' }]}>
                  <Ionicons name="send" size={22} color="#8B5CF6" />
                </View>
                <Text style={[styles.statGridValue, { color: currentColors.text }]}>{activeTeamStats.passes}</Text>
                <Text style={[styles.statGridLabel, { color: currentColors.textSecondary }]}>PASES QB</Text>
              </View>
            </View>

            <View style={[styles.statsGridRow, { marginTop: 15 }]}>
              <View style={styles.statGridBox}>
                <View style={[styles.statGridIconWrap, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                  <Ionicons name="magnet" size={24} color="#10B981" />
                </View>
                <Text style={[styles.statGridValue, { color: currentColors.text }]}>{activeTeamStats.ints}</Text>
                <Text style={[styles.statGridLabel, { color: currentColors.textSecondary }]}>INTERCEP.</Text>
              </View>
              <View style={styles.statGridBox}>
                <View style={[styles.statGridIconWrap, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </View>
                <Text style={[styles.statGridValue, { color: currentColors.text }]}>{activeTeamStats.sacks}</Text>
                <Text style={[styles.statGridLabel, { color: currentColors.textSecondary }]}>SACKS</Text>
              </View>
            </View>

            <View style={[styles.statsGridRow, { marginTop: 15 }]}>
              <View style={styles.statGridBox}>
                <View style={[styles.statGridIconWrap, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB' }]}>
                  <Ionicons name="trophy" size={24} color="#F59E0B" />
                </View>
                <Text style={[styles.statGridValue, { color: currentColors.text }]}>{activeTeamStats.mvps}</Text>
                <Text style={[styles.statGridLabel, { color: currentColors.textSecondary }]}>PREMIOS MVP</Text>
              </View>
            </View>

          </View>

          {/* --- EQUIPOS DEL JUGADOR --- */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: currentColors.text, marginBottom: 0 }]}>Mis Equipos</Text>
            <Pressable style={[styles.addBtn, { backgroundColor: BRAND_GRADIENT[0] }]} onPress={openJoinModal}>
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.addBtnText}>Unirme a otro</Text>
            </Pressable>
          </View>

          {playerTeams.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}>
              <Ionicons name="shield-outline" size={32} color={currentColors.textMuted} style={{marginBottom: 8}}/>
              <Text style={[styles.emptyText, { color: currentColors.textSecondary }]}>Aún no te has unido a ningún equipo oficial.</Text>
            </View>
          ) : (
            playerTeams.map((pt, idx) => (
              <View key={idx} style={[styles.teamCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight, shadowColor: isDark ? '#000' : '#475569' }]}>
                <View style={[styles.teamCardLogo, { borderColor: currentColors.borderLight }]}>
                  {pt.team?.logo_url ? (
                     <Image source={{uri: pt.team.logo_url}} style={styles.teamLogoImg} resizeMode="contain" />
                  ) : (
                     <Text style={[styles.fallbackTeamText, { color: currentColors.textMuted }]}>{pt.team?.name?.substring(0,2).toUpperCase()}</Text>
                  )}
                </View>

                <View style={styles.teamCardInfo}>
                  <Text style={[styles.teamCardName, { color: currentColors.text }]}>{pt.team?.name}</Text>
                  <Text style={[styles.teamCardCat, { color: currentColors.textSecondary }]}>{pt.team?.category?.replace("-", " ").toUpperCase()}</Text>
                </View>
                
                <View style={[styles.teamCardStats, { backgroundColor: `${BRAND_GRADIENT[0]}15`, borderColor: `${BRAND_GRADIENT[0]}30` }]}>
                  <Text style={[styles.teamCardJersey, { color: BRAND_GRADIENT[0] }]}>#{pt.jersey_number}</Text>
                  <Text style={[styles.teamCardPos, { color: currentColors.textSecondary }]}>{pt.position}</Text>
                </View>
              </View>
            ))
          )}

          {/* --- SOLICITUDES --- */}
          {joinRequests.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 25, color: currentColors.text }]}>Estatus de Solicitudes</Text>
              {joinRequests.map(req => (
                <View key={req.id} style={[styles.requestCard, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reqTeamName, { color: currentColors.text }]}>{req.teams?.name}</Text>
                    <Text style={[styles.reqCatName, { color: currentColors.textSecondary }]}>{req.teams?.category?.replace("-", " ").toUpperCase()}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    req.status === 'accepted' ? (isDark ? {backgroundColor: '#064E3B'} : styles.badgeGreen) : 
                    req.status === 'rejected' ? (isDark ? {backgroundColor: '#7F1D1D'} : styles.badgeRed) : 
                    (isDark ? {backgroundColor: '#78350F'} : styles.badgeYellow)
                  ]}>
                    <Text style={[styles.statusText, { 
                      color: req.status === 'accepted' ? (isDark ? '#34D399' : '#047857') : 
                             req.status === 'rejected' ? (isDark ? '#FCA5A5' : '#B91C1C') : 
                             (isDark ? '#FDE68A' : '#B45309')
                    }]}>{req.status.toUpperCase()}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          <Pressable 
            style={[styles.deleteAccountBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : "#FEF2F2", borderColor: isDark ? 'rgba(239,68,68,0.3)' : "#FECACA" }]} 
            onPress={handleDeleteAccount}
          >
            <Ionicons name="warning-outline" size={18} color="#EF4444" />
            <Text style={styles.deleteAccountText}>Eliminar Mi Cuenta</Text>
          </Pressable>

        </View>
      </ScrollView>

      {/* --- MODALES --- */}
      <Modal visible={showJoinModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: currentColors.card }, isTablet && styles.modalTablet]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: currentColors.text }]}>Inscribirse en Equipo</Text>
                <Pressable style={styles.modalCloseBtn} onPress={() => setShowJoinModal(false)}><Ionicons name="close" size={24} color={currentColors.text} /></Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: isTablet ? 400 : 300 }} keyboardShouldPersistTaps="handled">
                <View style={styles.teamList}>
                  {availableTeams.map(t => {
                    const isBlocked = myCategories.includes(t.category);
                    const isSelected = selectedTeamId === t.id;
                    return (
                      <Pressable 
                        key={t.id} 
                        disabled={isBlocked}
                        style={[
                          styles.teamItem, 
                          { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight },
                          isSelected && [styles.teamItemActive, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF', borderColor: BRAND_GRADIENT[0] }], 
                          isBlocked && styles.teamItemBlocked
                        ]}
                        onPress={() => setSelectedTeamId(t.id)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.teamItemText, { color: currentColors.text }, isSelected && styles.teamItemTextActive]}>{t.name}</Text>
                          <Text style={[styles.teamItemCatText, { color: currentColors.textSecondary }]}>{t.category?.replace("-", " ").toUpperCase()}</Text>
                        </View>
                        {isBlocked && <Ionicons name="lock-closed" size={16} color="#EF4444" />}
                      </Pressable>
                    );
                  })}
                </View>
                <View style={[styles.divider, { backgroundColor: currentColors.borderLight }]} />
                
                <Text style={[styles.inputTitle, { color: currentColors.textMuted }]}>Datos del Campo</Text>
                <View style={styles.rowInputs}>
                  <View style={styles.inputGroup}>
                    <TextInput style={[styles.modalInputLeft, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Posición (Ej. QB)" value={joinPosition} onChangeText={setJoinPosition} autoCapitalize="characters" />
                  </View>
                  <View style={styles.inputGroup}>
                    <TextInput style={[styles.modalInputLeft, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Jersey (Ej. 10)" value={joinJersey} onChangeText={setJoinJersey} keyboardType="numeric" maxLength={2} />
                  </View>
                </View>
              </ScrollView>
              <Pressable style={[styles.submitBtn, { backgroundColor: BRAND_GRADIENT[0] }]} onPress={handleJoinTeam}>
                <Text style={styles.submitBtnText}>Enviar Solicitud al Coach</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showEditModal} animationType="fade" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: currentColors.card }, isTablet && styles.modalTablet]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: currentColors.text }]}>Información Privada</Text>
                <Pressable style={styles.modalCloseBtn} onPress={() => setShowEditModal(false)}><Ionicons name="close" size={24} color={currentColors.text} /></Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.inputTitle, { color: currentColors.textMuted }]}>Experiencia en Flag Football</Text>
                <View style={styles.rowInputs}>
                   <View style={{flex: 1}}>
                      <TextInput style={[styles.modalInputLeft, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Temporadas Jugadas" value={editSeasons} onChangeText={setEditSeasons} keyboardType="numeric" />
                   </View>
                   <View style={{flex: 1}}>
                      <TextInput style={[styles.modalInputLeft, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Año de Inicio (Ej. 2018)" value={editSince} onChangeText={setEditSince} keyboardType="numeric" maxLength={4} />
                   </View>
                </View>

                <Text style={[styles.inputTitle, { color: currentColors.textMuted }]}>Datos de Salud y Personales</Text>
                <TextInput style={[styles.modalInputLeft, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Tipo de Sangre (Opcional)" value={editBlood} onChangeText={setEditBlood} />
                <TextInput style={[styles.modalInputLeft, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Teléfono Personal" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
                
                <Text style={[styles.inputTitle, { color: currentColors.textMuted }]}>Contacto de Emergencia</Text>
                <TextInput style={[styles.modalInputLeft, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Nombre del Contacto" value={editEmergencyName} onChangeText={setEditEmergencyName} />
                <TextInput style={[styles.modalInputLeft, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight, color: currentColors.text }]} placeholderTextColor={currentColors.textMuted} placeholder="Teléfono de Emergencia" value={editEmergencyPhone} onChangeText={setEditEmergencyPhone} keyboardType="phone-pad" />
              </ScrollView>
              <Pressable style={[styles.submitBtn, { backgroundColor: BRAND_GRADIENT[0] }]} onPress={handleEditProfile}>
                <Text style={styles.submitBtnText}>Guardar Perfil</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  contentWrapper: { width: "100%", maxWidth: 800, alignSelf: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  homeIcon: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  logoutIcon: { padding: 5 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  credentialWrapper: { alignItems: 'center', marginBottom: 30 },
  hintText: { fontSize: 11, textAlign: 'center', marginTop: 5, marginBottom: 15, fontWeight: '600' },
  cardActionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, width: '100%' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, gap: 8 },
  actionBtnText: { fontSize: 13, fontWeight: 'bold' },
  paginationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#555', marginHorizontal: 5 },
  activeDot: { backgroundColor: BRAND_GRADIENT[0], width: 22 }, 
  globalStatsCard: { borderRadius: 28, borderWidth: 1, padding: 24, marginBottom: 30, elevation: 3, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12 },
  statsGridRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  statGridBox: { flex: 1, alignItems: 'center' },
  statGridIconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statGridValue: { fontSize: 26, fontWeight: '900', letterSpacing: -1, marginBottom: 2 },
  statGridLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5, marginBottom: 15 },
  addBtn: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, alignItems: "center", gap: 4, elevation: 2 },
  addBtnText: { color: "#FFF", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  emptyCard: { padding: 25, borderRadius: 20, alignItems: "center", borderWidth: 1, borderStyle: "dashed" },
  emptyText: { fontSize: 13, fontWeight: '600' },
  teamCard: { flexDirection: "row", padding: 16, borderRadius: 24, marginBottom: 15, alignItems: "center", borderWidth: 1, elevation: 2 },
  teamCardLogo: { width: 54, height: 54, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 15, padding: 5, backgroundColor: '#FFFFFF' },
  teamLogoImg: { width: '100%', height: '100%' },
  fallbackTeamText: { fontSize: 16, fontWeight: '900' },
  teamCardInfo: { flex: 1 },
  teamCardName: { fontSize: 18, fontWeight: "900", marginBottom: 2, letterSpacing: -0.3 },
  teamCardCat: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  teamCardStats: { alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  teamCardJersey: { fontSize: 18, fontWeight: "900" },
  teamCardPos: { fontSize: 10, fontWeight: "800", marginTop: 2, letterSpacing: 0.5 },
  requestCard: { flexDirection: "row", padding: 18, borderRadius: 20, marginBottom: 12, alignItems: "center", borderWidth: 1, elevation: 1 },
  reqTeamName: { fontSize: 16, fontWeight: "900", marginBottom: 2 },
  reqCatName: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeYellow: { backgroundColor: "#FEF3C7" },
  badgeGreen: { backgroundColor: "#D1FAE5" },
  badgeRed: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  deleteAccountBtn: { marginTop: 40, padding: 18, borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  deleteAccountText: { color: "#EF4444", fontSize: 14, fontWeight: "900" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.65)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 30, paddingBottom: Platform.OS === 'ios' ? 45 : 30 },
  modalTablet: { width: 500, alignSelf: 'center', borderRadius: 36, marginBottom: 'auto', marginTop: 'auto' }, 
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  modalCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(150,150,150,0.1)', justifyContent: 'center', alignItems: 'center' },
  teamList: { gap: 10 },
  teamItem: { flexDirection: "row", padding: 16, borderRadius: 18, marginBottom: 5, borderWidth: 1, alignItems: 'center' },
  teamItemActive: { elevation: 2 },
  teamItemBlocked: { opacity: 0.4 },
  teamItemText: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  teamItemTextActive: { color: BRAND_GRADIENT[0] },
  teamItemCatText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  divider: { height: 1, marginVertical: 20 },
  rowInputs: { flexDirection: "row", gap: 15, marginBottom: 15 },
  inputGroup: { flex: 1 },
  inputTitle: { fontSize: 11, fontWeight: "800", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  modalInputLeft: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 15, fontSize: 15, fontWeight: '600' },
  submitBtn: { padding: 18, borderRadius: 18, alignItems: "center", marginTop: 15, elevation: 4 },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
});