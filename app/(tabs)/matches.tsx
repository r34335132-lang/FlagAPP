import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMatches } from "@/hooks/useMatches";
import { useTeams } from "@/hooks/useTeams";
import { MatchCardLight } from "@/components/MatchCardLight";
import { BRAND_GRADIENT } from "@/constants/colors";

// Ramas principales
const MAIN_CATEGORIES = [
  { id: "all", label: "TODOS" },
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

  // 1. Cuando cambias de rama (ej. de Varonil a Femenil), resetear el subfiltro a "Todas"
  useEffect(() => {
    setSelectedSubCat("all");
  }, [selectedMainCat]);

  // 2. Filtrar por la Rama Principal (Varonil, Femenil, etc.)
  const filteredByMain = useMemo(() => {
    if (!games) return [];
    if (selectedMainCat === "all") return games;
    return games.filter((g) => 
      g.category?.toLowerCase().startsWith(selectedMainCat.toLowerCase())
    );
  }, [games, selectedMainCat]);

  // 3. Extraer DINÁMICAMENTE los niveles (Gold, Silver, Libre) según la rama seleccionada
  const availableSubCats = useMemo(() => {
    if (selectedMainCat === "all") return [];
    
    const subs = new Set<string>();
    filteredByMain.forEach(g => {
      const parts = g.category?.split("-"); // Ej: "femenil-gold" -> ["femenil", "gold"]
      if (parts && parts.length > 1) {
        subs.add(parts[1].toLowerCase());
      }
    });
    
    return Array.from(subs).sort(); // Devuelve ['gold', 'silver', etc.]
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
      const jKey = game.jornada ? `JORNADA ${game.jornada}` : "POR DEFINIR";
      if (!groups[jKey]) groups[jKey] = [];
      groups[jKey].push(game);
    });

    // Ordenar numéricamente las jornadas
    return Object.keys(groups).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.replace(/\D/g, "")) || 0;
        return numA - numB;
    }).map(jornada => ({
      title: jornada,
      data: groups[jornada]
    }));
  }, [finalFilteredGames]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* --- HEADER FIJO --- */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Partidos</Text>
          <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color="#64748B" />
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
                <Text style={[styles.mainTabText, isActive && styles.mainTabTextActive]}>
                  {cat.label}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* SELECTOR SECUNDARIO (Niveles - Solo aparece si seleccionas una rama específica) */}
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

      {/* --- LISTA GRUPAL POR JORNADA --- */}
      <FlatList
        data={groupedByJornada}
        keyExtractor={(item) => item.title}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.jornadaSection}>
            <View style={styles.jornadaHeader}>
              <Text style={styles.jornadaTitle}>{item.title}</Text>
              <View style={styles.line} />
            </View>

            {item.data.map((game) => (
              <MatchCardLight key={game.id} game={game} teams={teams || []} />
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Sin partidos</Text>
            <Text style={styles.emptySub}>No hay juegos programados con estos filtros.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  // Barra superior fija
  topBar: { 
    backgroundColor: "#FFFFFF", 
    borderBottomWidth: 1, 
    borderColor: "#E2E8F0",
    zIndex: 10,
    elevation: 4,
    shadowColor: "#000",
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
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#0F172A" },
  refreshBtn: { padding: 5 },

  // Selector Principal (Texto)
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

  // Selector Secundario (Burbujas / Chips)
  subCategoryWrapper: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
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
  subChipActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  subChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  subChipTextActive: {
    color: "#FFFFFF",
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
    color: "#64748B", 
    letterSpacing: 1 
  },
  line: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },

  emptyState: { alignItems: "center", marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginTop: 12 },
  emptySub: { fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 6, paddingHorizontal: 40 }
});