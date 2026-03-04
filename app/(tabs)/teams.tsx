import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTeams } from "@/hooks/useTeams";
import { BRAND_GRADIENT } from "@/constants/colors";

// Ramas principales
const MAIN_CATEGORIES = [
  { id: "all", label: "TODOS" },
  { id: "varonil", label: "VARONIL" },
  { id: "femenil", label: "FEMENIL" },
  { id: "mixto", label: "MIXTO" },
  { id: "teens", label: "TEENS" },
];

export default function TeamsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: teams, isLoading, refetch } = useTeams();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainCat, setSelectedMainCat] = useState("all");
  const [selectedSubCat, setSelectedSubCat] = useState("all");

  // --- LÓGICA DEL PULL-TO-REFRESH ---
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);
  // ------------------------------------

  // 1. Al cambiar de rama principal, resetear subcategoría
  useEffect(() => {
    setSelectedSubCat("all");
  }, [selectedMainCat]);

  // 2. Filtro 1: Búsqueda de texto + Rama Principal
  const filteredByMain = useMemo(() => {
    if (!teams) return [];
    
    return teams.filter((team) => {
      const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMainCat = selectedMainCat === "all" || 
                             team.category?.toLowerCase().startsWith(selectedMainCat.toLowerCase());
      return matchesSearch && matchesMainCat;
    });
  }, [teams, searchQuery, selectedMainCat]);

  // 3. Extraer subcategorías dinámicas (Gold, Silver, etc.)
  const availableSubCats = useMemo(() => {
    if (selectedMainCat === "all") return [];
    
    const subs = new Set<string>();
    filteredByMain.forEach(t => {
      const parts = t.category?.split("-"); 
      if (parts && parts.length > 1) {
        subs.add(parts[1].toLowerCase());
      }
    });
    
    return Array.from(subs).sort();
  }, [filteredByMain, selectedMainCat]);

  // 4. Filtro 2: Aplicar la subcategoría seleccionada
  const finalFilteredTeams = useMemo(() => {
    let filtered = filteredByMain;
    
    if (selectedSubCat !== "all") {
      filtered = filtered.filter(t => {
        const parts = t.category?.split("-");
        return parts && parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
      });
    }
    
    // Ordenar alfabéticamente
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredByMain, selectedSubCat]);

  // Ocultamos el ActivityIndicator inicial si estamos haciendo pull-to-refresh
  if (isLoading && !refreshing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  // Componente de la Tarjeta del Equipo
  const renderTeamCard = ({ item }: { item: any }) => {
    const hasLogo = !!item.logo_url;
    const color1 = item.color1 || "#334155";
    const color2 = item.color2 || "#0F172A";

    return (
      <Pressable 
        style={styles.cardContainer}
        // 👇 Navegación al detalle del equipo 👇
        onPress={() => router.push({ pathname: "/team/[id]", params: { id: item.id } })} 
      >
        <LinearGradient 
          colors={[color1, color2]} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.logoWrapper}>
            {hasLogo ? (
              <Image source={{ uri: item.logo_url }} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <Text style={[styles.initialsText, { color: color2 }]}>
                {item.name.substring(0, 2).toUpperCase()}
              </Text>
            )}
          </View>
          
          <Text style={styles.teamName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category?.toUpperCase() || "SIN CATEGORÍA"}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* --- HEADER Y FILTROS --- */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Equipos</Text>
          <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#64748B" />
          </Pressable>
        </View>

        {/* BUSCADOR */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar equipo..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#CBD5E1" />
            </Pressable>
          )}
        </View>

        {/* SELECTOR PRINCIPAL */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.mainCategoryScroll}
        >
          {MAIN_CATEGORIES.map((cat) => {
            const isActive = selectedMainCat === cat.id;
            return (
              <Pressable 
                key={cat.id} 
                style={[styles.mainTab, isActive && styles.mainTabActive]}
                onPress={() => setSelectedMainCat(cat.id)}
              >
                <Text style={[styles.mainTabText, isActive && styles.mainTabTextActive]}>
                  {cat.label}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* SELECTOR SECUNDARIO (Niveles) */}
        {selectedMainCat !== "all" && availableSubCats.length > 0 && (
          <View style={styles.subCategoryWrapper}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.subCategoryScroll}
            >
              <Pressable 
                style={[styles.subChip, selectedSubCat === "all" && styles.subChipActive]}
                onPress={() => setSelectedSubCat("all")}
              >
                <Text style={[styles.subChipText, selectedSubCat === "all" && styles.subChipTextActive]}>
                  Todas
                </Text>
              </Pressable>
              
              {availableSubCats.map(sub => (
                <Pressable 
                  key={sub} 
                  style={[styles.subChip, selectedSubCat === sub && styles.subChipActive]}
                  onPress={() => setSelectedSubCat(sub)}
                >
                  <Text style={[styles.subChipText, selectedSubCat === sub && styles.subChipTextActive]}>
                    {sub.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* --- GRID DE EQUIPOS --- */}
      <FlatList
        data={finalFilteredTeams}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        // 👇 AQUÍ ESTÁ EL PULL TO REFRESH 👇
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={BRAND_GRADIENT[0]}
            colors={[BRAND_GRADIENT[0]]}
          />
        }
        renderItem={renderTeamCard}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="shield-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No hay equipos</Text>
            <Text style={styles.emptySub}>No encontramos equipos que coincidan con tu búsqueda.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  header: { 
    backgroundColor: "#FFFFFF", 
    borderBottomWidth: 1, 
    borderColor: "#E2E8F0",
    paddingBottom: 10,
    zIndex: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 15 },
  title: { fontSize: 28, fontWeight: "900", color: "#0F172A", letterSpacing: -1 },
  refreshBtn: { padding: 5 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 15,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: "#0F172A", fontWeight: "500" },

  mainCategoryScroll: { paddingHorizontal: 20, paddingBottom: 10, gap: 20 },
  mainTab: { paddingVertical: 8, position: "relative", alignItems: "center" },
  mainTabActive: {},
  mainTabText: { fontSize: 13, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5 },
  mainTabTextActive: { color: BRAND_GRADIENT[0] },
  activeIndicator: { 
    position: "absolute", 
    bottom: -10, 
    width: "100%", 
    height: 3, 
    backgroundColor: BRAND_GRADIENT[0], 
    borderRadius: 2 
  },

  subCategoryWrapper: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginTop: 10,
  },
  subCategoryScroll: { paddingHorizontal: 20, gap: 8 },
  subChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  subChipActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  subChipText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  subChipTextActive: { color: "#FFFFFF" },

  listContent: { padding: 15, paddingTop: 20 },
  columnWrapper: { gap: 15, justifyContent: "space-between", marginBottom: 15 },
  
  cardContainer: {
    flex: 1,
    aspectRatio: 0.85,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardGradient: { flex: 1, padding: 16, alignItems: "center", justifyContent: "center" },
  logoWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    overflow: "hidden",
    padding: 5,
  },
  teamLogo: { width: "100%", height: "100%" },
  initialsText: { fontSize: 24, fontWeight: "900" },
  teamName: { fontSize: 15, fontWeight: "900", color: "#FFFFFF", textAlign: "center", marginBottom: 8, letterSpacing: -0.5 },
  categoryBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 9, fontWeight: "800", color: "#FFFFFF", letterSpacing: 1 },

  emptyState: { alignItems: "center", marginTop: 80, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginTop: 12 },
  emptySub: { fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 6 },
});