import React, { useState, useEffect, useCallback } from "react";
import { 
  View, Text, StyleSheet, ScrollView, Pressable, 
  Platform, Alert, ActivityIndicator, TextInput 
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_GRADIENT } from "@/constants/colors";

// 🚨 IMPORTANTE: CAMBIA ESTO POR LA IP DE TU COMPU (ej. 192.168.1.75)
const API_BASE = "https://www.flagdurango.com.mx/api";

// Lista de Categorías Oficiales de la Liga
const CATEGORIES = [
  { id: "varonil-libre", label: "Varonil Libre" },
  { id: "varonil-gold", label: "Varonil Gold" },
  { id: "varonil-silver", label: "Varonil Silver" },
  { id: "femenil-gold", label: "Femenil Gold" },
  { id: "femenil-silver", label: "Femenil Silver" },
  { id: "femenil-cooper", label: "Femenil Cooper" },
  { id: "mixto-gold", label: "Mixto Gold" },
  { id: "mixto-silver", label: "Mixto Silver" },
  { id: "mixto-recreativo", label: "Mixto Recreativo" },
  { id: "teens", label: "Teens" },
];

export default function CoachDashboard() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  
  // Estados de datos
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navegación interna (Tabs)
  const [activeTab, setActiveTab] = useState<"equipos" | "crear" | "solicitudes">("equipos");

  // Estado para el formulario de Crear Equipo
  const [teamForm, setTeamForm] = useState({
    name: "",
    category: "", // Se llenará al tocar un "chip"
    captain_name: "",
    captain_phone: ""
  });
  const [creating, setCreating] = useState(false);

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

  const loadCoachData = async (coachUser: any) => {
    setLoading(true);
    try {
      const teamsRes = await fetch(`${API_BASE}/teams?coach_id=${coachUser.id}`);
      const teamsData = await teamsRes.json();
      const myTeams = teamsData.success ? teamsData.data : [];
      setTeams(myTeams);

      if (myTeams.length > 0) {
        const teamIds = myTeams.map((t: any) => t.id);

        const playersRes = await fetch(`${API_BASE}/players?team_ids=${teamIds.join(",")}`);
        const playersData = await playersRes.json();
        if (playersData.success) setPlayers(playersData.data);

        const allRequests: any[] = [];
        for (const tid of teamIds) {
          const reqRes = await fetch(`${API_BASE}/team-join-requests?team_id=${tid}`);
          const reqData = await reqRes.json();
          if (reqData.success) {
            allRequests.push(...reqData.data);
          }
        }
        setRequests(allRequests.filter(r => r.status === "pending" || r.status === "pending_coordinator"));
      }
    } catch (error) {
      console.log("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamForm.name || !teamForm.category) {
      return Alert.alert("Faltan datos", "El nombre y la categoría son obligatorios");
    }

    setCreating(true);
    try {
      const response = await fetch(`${API_BASE}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...teamForm,
          color1: BRAND_GRADIENT[0],
          color2: BRAND_GRADIENT[1],
          coach_id: user.id,
          coach_name: user.username,
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert("¡Éxito!", "Equipo creado correctamente");
        setTeamForm({ name: "", category: "", captain_name: "", captain_phone: "" });
        setActiveTab("equipos");
        loadCoachData(user);
      } else {
        Alert.alert("Error", data.message || "No se pudo crear el equipo");
      }
    } catch (error) {
      Alert.alert("Error", "Problema de conexión");
    } finally {
      setCreating(false);
    }
  };

  const handleRequest = async (requestId: number, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/team-join-requests`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, status, coach_user_id: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Listo", `Solicitud ${status === "accepted" ? "aceptada" : "rechazada"}`);
        loadCoachData(user);
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      Alert.alert("Error", "Problema de conexión");
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userSession");
    router.replace("/(tabs)/");
  };

  const topPad = insets.top + (Platform.OS === "web" ? 20 : 10);

  if (loading && !user) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.replace("/(tabs)/")} hitSlop={15}>
            <Ionicons name="home" size={24} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Panel de Coach</Text>
          <Pressable onPress={handleLogout} hitSlop={15}>
            <Ionicons name="log-out-outline" size={26} color="#FFF" />
          </Pressable>
        </View>
        <Text style={styles.welcomeText}>¡Hola, {user?.username}!</Text>
      </LinearGradient>

      <View style={styles.tabsRow}>
        <TabButton title="Mis Equipos" icon="shield" active={activeTab === "equipos"} onPress={() => setActiveTab("equipos")} />
        <TabButton title="Crear" icon="add-circle" active={activeTab === "crear"} onPress={() => setActiveTab("crear")} />
        <TabButton title="Solicitudes" icon="mail" active={activeTab === "solicitudes"} badge={requests.length} onPress={() => setActiveTab("solicitudes")} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {loading ? (
          <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} style={{ marginTop: 40 }} />
        ) : (
          <>
            {activeTab === "equipos" && (
              <View>
                {teams.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="shield-half" size={48} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>Sin Equipos</Text>
                    <Text style={styles.emptySub}>Aún no tienes equipos. Ve a la pestaña "Crear" para iniciar.</Text>
                  </View>
                ) : (
                  teams.map((team) => (
                    <View key={team.id} style={styles.teamCard}>
                      <View style={styles.teamHeader}>
                        <View>
                          <Text style={styles.teamName}>{team.name}</Text>
                          <Text style={styles.teamCat}>{team.category.replace("-", " ").toUpperCase()}</Text>
                        </View>
                        <View style={[styles.statusBadge, team.paid ? styles.bgGreen : styles.bgYellow]}>
                          <Text style={styles.statusText}>{team.paid ? "PAGADO" : "PENDIENTE"}</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.rosterTitle}>Roster ({players.filter(p => p.team_id === team.id).length})</Text>
                      {players.filter(p => p.team_id === team.id).map(player => (
                        <View key={player.id} style={styles.playerRow}>
                          <Text style={styles.playerName}>{player.name}</Text>
                          <Text style={styles.playerPos}>{player.position} - #{player.jersey_number}</Text>
                        </View>
                      ))}
                      {players.filter(p => p.team_id === team.id).length === 0 && (
                         <Text style={styles.emptySub}>No hay jugadores en este equipo todavía.</Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === "crear" && (
              <View style={styles.formCard}>
                <Text style={styles.cardTitle}>Inscribir Nuevo Equipo</Text>
                
                <Text style={styles.label}>Nombre del Equipo</Text>
                <TextInput style={styles.input} placeholder="Ej. Cuervos" placeholderTextColor="#94A3B8" value={teamForm.name} onChangeText={(t) => setTeamForm({...teamForm, name: t})} />

                {/* ── NUEVO SELECTOR DE CATEGORÍA ── */}
                <Text style={styles.label}>Categoría</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.categoryScroll}
                  contentContainerStyle={styles.categoryContent}
                >
                  {CATEGORIES.map(cat => {
                    const isActive = teamForm.category === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        style={[styles.catChip, isActive && styles.catChipActive]}
                        onPress={() => setTeamForm({...teamForm, category: cat.id})}
                      >
                        <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={styles.label}>Nombre del Capitán (Opcional)</Text>
                <TextInput style={styles.input} placeholder="Nombre completo" placeholderTextColor="#94A3B8" value={teamForm.captain_name} onChangeText={(t) => setTeamForm({...teamForm, captain_name: t})} />

                <Text style={styles.label}>Teléfono del Capitán (Opcional)</Text>
                <TextInput style={styles.input} placeholder="618..." keyboardType="numeric" placeholderTextColor="#94A3B8" value={teamForm.captain_phone} onChangeText={(t) => setTeamForm({...teamForm, captain_phone: t})} />

                <Pressable style={styles.submitBtn} onPress={handleCreateTeam} disabled={creating}>
                  {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Crear Equipo</Text>}
                </Pressable>
              </View>
            )}

            {activeTab === "solicitudes" && (
              <View>
                {requests.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="mail-open" size={48} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>Bandeja Limpia</Text>
                    <Text style={styles.emptySub}>No tienes solicitudes pendientes de jugadores.</Text>
                  </View>
                ) : (
                  requests.map(req => (
                    <View key={req.id} style={styles.requestCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reqName}>{req.player_name}</Text>
                        <Text style={styles.reqInfo}>Desea unirse a: <Text style={{fontWeight:'700'}}>{req.teams?.name}</Text></Text>
                        <Text style={styles.reqInfo}>Posición: {req.position} | Jersey: #{req.jersey_number}</Text>
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

function TabButton({ title, icon, active, onPress, badge }: any) {
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={active ? "#FFF" : "#64748B"} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
      {badge > 0 && (
        <View style={styles.badgeWrap}><Text style={styles.badgeText}>{badge}</Text></View>
      )}
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
  badgeWrap: { backgroundColor: "#EF4444", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "900" },

  body: { padding: 16 },

  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 50, backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 2, borderColor: "#F1F5F9", borderStyle: "dashed", marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginTop: 10 },
  emptySub: { fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 4, paddingHorizontal: 20 },

  teamCard: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0", elevation: 2 },
  teamHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingBottom: 15 },
  teamName: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
  teamCat: { fontSize: 12, color: "#64748B", fontWeight: "700", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bgGreen: { backgroundColor: "#10B98120" },
  bgYellow: { backgroundColor: "#F59E0B20" },
  statusText: { fontSize: 10, fontWeight: "900", color: "#0F172A" },
  
  rosterTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A", marginBottom: 10 },
  playerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  playerName: { fontSize: 14, fontWeight: "700", color: "#334155" },
  playerPos: { fontSize: 13, color: "#64748B", fontWeight: "600" },

  formCard: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: "900", color: "#0F172A", marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "800", color: "#64748B", textTransform: "uppercase", marginBottom: 6 },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 16, height: 50, color: "#0F172A", fontWeight: "600", marginBottom: 16 },
  
  // Estilos para el selector de categorías
  categoryScroll: { marginBottom: 20 },
  categoryContent: { gap: 10, paddingRight: 20 },
  catChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  catChipActive: { backgroundColor: BRAND_GRADIENT[0], borderColor: BRAND_GRADIENT[0] },
  catChipText: { color: "#64748B", fontWeight: "700", fontSize: 13 },
  catChipTextActive: { color: "#FFF" },

  submitBtn: { backgroundColor: BRAND_GRADIENT[0], height: 54, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 10 },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },

  requestCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0", elevation: 1 },
  reqName: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  reqInfo: { fontSize: 13, color: "#64748B" },
  reqActions: { flexDirection: "row", gap: 10, paddingLeft: 10 },
  actionBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }
});