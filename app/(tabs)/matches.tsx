import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useColorScheme
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMatches } from "@/hooks/useMatches";
import { useTeams } from "@/hooks/useTeams";
import { MatchCardLight } from "@/components/MatchCardLight";
import { BRAND_GRADIENT, Colors } from "@/constants/colors"; // <-- Importamos paleta dinámica

// Ramas principales (Agregamos EN VIVO)
const MAIN_CATEGORIES = [
  { id: "all", label: "TODOS" },
  { id: "en_vivo", label: "🔴 EN VIVO" }, // <-- NUEVO FILTRO
  { id: "varonil", label: "VARONIL" },
  { id: "femenil", label: "FEMENIL" },
  { id: "mixto", label: "MIXTO" },
  { id: "teens", label: "TEENS" },
];

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const { data: games, isLoading, refetch } = useMatches();
  const { data: teams } = useTeams();
  
  const [selectedMainCat, setSelectedMainCat] = useState("all");
  const [selectedSubCat, setSelectedSubCat] = useState("all");
  
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  // --- LÓGICA DEL PULL-TO-REFRESH ---
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);
  // ------------------------------------

  // 1. Cuando cambias de rama (ej. de Varonil a Femenil), resetear el subfiltro a "Todas"
  useEffect(() => {
    setSelectedSubCat("all");
  }, [selectedMainCat]);

  // 2. Filtrar por la Rama Principal (Varonil, Femenil, o EN VIVO)
  const filteredByMain = useMemo(() => {
    if (!games) return [];
    if (selectedMainCat === "all") return games;

    // Lógica especial para el filtro "EN VIVO"
    if (selectedMainCat === "en_vivo") {
      return games.filter((g) => {
        const s = g.status?.toLowerCase() || "";
        return s === "en vivo" || s === "en_vivo" || s === "live";
      });
    }

    // Lógica normal para las categorías (Varonil, Femenil, etc)
    return games.filter((g) => 
      g.category?.toLowerCase().startsWith(selectedMainCat.toLowerCase())
    );
  }, [games, selectedMainCat]);

  // 3. Extraer DINÁMICAMENTE los niveles (Gold, Silver, Libre) según la rama seleccionada
  const availableSubCats = useMemo(() => {
    // Si elegimos "En Vivo" o "Todos", no mostramos subcategorías
    if (selectedMainCat === "all" || selectedMainCat === "en_vivo") return [];
    
    const subs = new Set<string>();
    filteredByMain.forEach(g => {
      const parts = g.category?.split("-"); 
      if (parts && parts.length > 1) {
        subs.add(parts[1].toLowerCase());
      }
    });
    
    return Array.from(subs).sort(); 
  }, [filteredByMain, selectedMainCat]);

  // 4. Aplicar el Filtro Secundario (Nivel)
  const finalFilteredGames = useMemo(() => {
    if (selectedSubCat === "all") return filteredByMain;
    
    return filteredByMain.filter(g => {
      const parts = g.category?.split("-");
      return parts && parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
    });
  }, [filteredByMain, selectedSubCat]);

  // 5. AGRUPAR POR JORNADA para el diseño final
  const groupedByJornada = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    
    finalFilteredGames.forEach((game) => {
      // Si estamos en la pestaña "EN VIVO", agrupamos todo bajo un solo título para que se vea más limpio
      const jKey = selectedMainCat === "en_vivo" 
        ? "JUGANDO AHORA" 
        : (game.jornada ? `JORNADA ${game.jornada}` : "POR DEFINIR");

      if (!groups[jKey]) groups[jKey] = [];
      groups[jKey].push(game);
    });

    // Ordenar numéricamente las jornadas
    return Object.keys(groups).sort((a, b) => {
        if (a === "JUGANDO AHORA") return -1; // "Jugando Ahora" siempre va primero
        const numA = parseInt(a.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.replace(/\D/g, "")) || 0;
        return numA - numB;
    }).map(jornada => ({
      title: jornada,
      data: groups[jornada]
    }));
  }, [finalFilteredGames, selectedMainCat]);

  // Ocultamos el ActivityIndicator inicial si estamos haciendo pull-to-refresh
  if (isLoading && !refreshing) {
    return (
      <View style={[styles.loading, { backgroundColor: currentColors.bg }]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      {/* --- HEADER FIJO --- */}
      <View style={[styles.topBar, { 
        paddingTop: insets.top + 10, 
        backgroundColor: currentColors.card, 
        borderBottomColor: currentColors.border,
        shadowColor: theme === 'dark' ? '#000' : '#0F172A' 
      }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: currentColors.text }]}>Partidos</Text>
          <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color={currentColors.textMuted} />
          </Pressable>
        </View>

        {/* SELECTOR PRINCIPAL (Ramas) */}
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
                <Text style={[
                  styles.mainTabText, 
                  { color: currentColors.textMuted },
                  isActive && styles.mainTabTextActive, 
                  cat.id === "en_vivo" && {color: isActive ? "#EF4444" : (theme === 'dark' ? '#991B1B' : '#FCA5A5')}
                ]}>
                  {cat.label}
                </Text>
                {isActive && <View style={[styles.activeIndicator, cat.id === "en_vivo" && {backgroundColor: "#EF4444"}]} />}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* SELECTOR SECUNDARIO (Niveles) */}
        {selectedMainCat !== "all" && selectedMainCat !== "en_vivo" && availableSubCats.length > 0 && (
          <View style={[styles.subCategoryWrapper, { backgroundColor: currentColors.bgSecondary, borderTopColor: currentColors.border }]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.subCategoryScroll}
            >
              <Pressable 
                style={[
                  styles.subChip, 
                  { backgroundColor: currentColors.card, borderColor: currentColors.border },
                  selectedSubCat === "all" && { backgroundColor: currentColors.text, borderColor: currentColors.text }
                ]}
                onPress={() => setSelectedSubCat("all")}
              >
                <Text style={[
                  styles.subChipText, 
                  { color: currentColors.textSecondary },
                  selectedSubCat === "all" && { color: currentColors.bg }
                ]}>
                  Todas
                </Text>
              </Pressable>
              
              {availableSubCats.map(sub => (
                <Pressable 
                  key={sub} 
                  style={[
                    styles.subChip, 
                    { backgroundColor: currentColors.card, borderColor: currentColors.border },
                    selectedSubCat === sub && { backgroundColor: currentColors.text, borderColor: currentColors.text }
                  ]}
                  onPress={() => setSelectedSubCat(sub)}
                >
                  <Text style={[
                    styles.subChipText, 
                    { color: currentColors.textSecondary },
                    selectedSubCat === sub && { color: currentColors.bg }
                  ]}>
                    {sub.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* --- LISTA GRUPAL POR JORNADA --- */}
      <FlatList
        data={groupedByJornada}
        keyExtractor={(item) => item.title}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={BRAND_GRADIENT[0]} 
            colors={[BRAND_GRADIENT[0]]} 
          />
        }
        renderItem={({ item }) => (
          <View style={styles.jornadaSection}>
            <View style={styles.jornadaHeader}>
              <Text style={[styles.jornadaTitle, { color: currentColors.textSecondary }, item.title === "JUGANDO AHORA" && {color: "#EF4444"}]}>{item.title}</Text>
              <View style={[styles.line, { backgroundColor: currentColors.border }]} />
            </View>

            {item.data.map((game) => (
              <MatchCardLight key={game.id} game={game} teams={teams || []} />
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name={selectedMainCat === "en_vivo" ? "american-football" : "calendar-outline"} size={60} color={currentColors.textMuted} />
            <Text style={[styles.emptyTitle, { color: currentColors.text }]}>
              {selectedMainCat === "en_vivo" ? "No hay juegos en vivo" : "Sin partidos"}
            </Text>
            <Text style={[styles.emptySub, { color: currentColors.textSecondary }]}>
              {selectedMainCat === "en_vivo" ? "No hay ningún partido jugándose en este momento." : "No hay juegos programados con estos filtros."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  // Barra superior fija
  topBar: { 
    borderBottomWidth: 1, 
    zIndex: 10,
    elevation: 4,
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: "900" },
  refreshBtn: { padding: 5 },

  // Selector Principal (Texto)
  mainCategoryScroll: { paddingHorizontal: 20, paddingBottom: 10, gap: 20 },
  mainTab: { paddingVertical: 8, position: "relative", alignItems: "center" },
  mainTabActive: {},
  mainTabText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  mainTabTextActive: { color: BRAND_GRADIENT[0] },
  activeIndicator: { 
    position: "absolute", 
    bottom: -10, 
    width: "100%", 
    height: 3, 
    backgroundColor: BRAND_GRADIENT[0], 
    borderRadius: 2 
  },

  // Selector Secundario (Burbujas / Chips)
  subCategoryWrapper: {
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  subCategoryScroll: { paddingHorizontal: 20, gap: 8 },
  subChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  subChipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Contenido de lista
  listContent: { paddingHorizontal: 20, paddingTop: 20 },
  jornadaSection: { marginBottom: 25 },
  jornadaHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 15, 
    gap: 10 
  },
  jornadaTitle: { 
    fontSize: 14, 
    fontWeight: "800", 
    letterSpacing: 1 
  },
  line: { flex: 1, height: 1 },

  emptyState: { alignItems: "center", marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: 12 },
  emptySub: { fontSize: 14, textAlign: "center", marginTop: 6, paddingHorizontal: 40 }
});