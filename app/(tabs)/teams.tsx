import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  useColorScheme,
  useWindowDimensions,
  Animated,
  Easing
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SeasonSelector } from "@/components/SeasonSelector";
import { useTeams } from "@/hooks/useTeams";
import { BRAND_GRADIENT, Colors } from "@/constants/colors"; 

// ─────────────────────────────────────────────────────────────────────────────
// 1. ANIMACIONES BASE
// ─────────────────────────────────────────────────────────────────────────────
const FadeInView = ({ children, delay = 0 }: { children: any, delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) })
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={[{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {children}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────
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
  
  // 🔥 MEDIDAS PARA TABLETS 🔥
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = width >= 1024 ? 4 : (width >= 768 ? 3 : 2);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainCat, setSelectedMainCat] = useState("all");
  const [selectedSubCat, setSelectedSubCat] = useState("all");

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  useEffect(() => {
    setSelectedSubCat("all");
  }, [selectedMainCat]);

  const filteredByMain = useMemo(() => {
    if (!teams) return [];
    
    return teams.filter((team) => {
      const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMainCat = selectedMainCat === "all" || 
                             team.category?.toLowerCase().startsWith(selectedMainCat.toLowerCase());
      return matchesSearch && matchesMainCat;
    });
  }, [teams, searchQuery, selectedMainCat]);

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

  const finalFilteredTeams = useMemo(() => {
    let filtered = filteredByMain;
    
    if (selectedSubCat !== "all") {
      filtered = filtered.filter(t => {
        const parts = t.category?.split("-");
        return parts && parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
      });
    }
    
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredByMain, selectedSubCat]);

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.loading, { backgroundColor: currentColors.bg }]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TARJETA DE EQUIPO (DISEÑO PREMIUM)
  // ─────────────────────────────────────────────────────────────────────────────
  const renderTeamCard = ({ item, index }: { item: any, index: number }) => {
    const hasLogo = !!item.logo_url;
    const color1 = item.color1 || "#334155";
    const color2 = item.color2 || "#0F172A";

    return (
      <FadeInView delay={(index % numColumns) * 100}>
        <Pressable 
          style={[
            styles.cardContainer, 
            { 
              backgroundColor: currentColors.card,
              borderColor: currentColors.borderLight,
              shadowColor: theme === 'dark' ? '#000' : '#475569' 
            }
          ]}
          onPress={() => router.push({ pathname: "/team/[id]", params: { id: item.id } })} 
        >
          <LinearGradient 
            colors={[color1, color2]} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={[styles.logoWrapper, { shadowColor: theme === 'dark' ? '#000' : '#0F172A' }]}>
              {hasLogo ? (
                <Image 
                  source={{ uri: item.logo_url }} 
                  style={styles.teamLogo} 
                  resizeMode="cover" 
                />
              ) : (
                <Text style={[styles.initialsText, { color: color2 }]}>
                  {item.name.substring(0, 2).toUpperCase()}
                </Text>
              )}
            </View>
            
            <Text style={styles.teamName} numberOfLines={1}>{item.name}</Text>
            
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category?.replace("-", " ").toUpperCase() || "SIN CATEGORÍA"}</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </FadeInView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      
      {/* --- HEADER Y FILTROS --- */}
      <View style={[styles.header, { 
        paddingTop: insets.top + 10, 
        backgroundColor: currentColors.card,
        borderBottomColor: currentColors.border,
        shadowColor: theme === 'dark' ? '#000' : '#0F172A'
      }]}>
        
        {/* Contenedor centralizado para que en tablets se vea como un panel */}
        <View style={styles.headerContentWrapper}>
          
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: currentColors.text }]}>Equipos</Text>
            <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={20} color={currentColors.textMuted} />
            </Pressable>
          </View>

          <SeasonSelector compact style={styles.seasonSelectorInline} />

          {/* BUSCADOR PREMIUM */}
          <View style={[styles.searchBar, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
            <Ionicons name="search" size={20} color={currentColors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: currentColors.text }]}
              placeholder="Buscar un equipo..."
              placeholderTextColor={currentColors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color={currentColors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* SELECTOR PRINCIPAL */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={[styles.mainCategoryScroll, isTablet && { justifyContent: "center", flexGrow: 1 }]}
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
                    isActive && styles.mainTabTextActive
                  ]}>
                    {cat.label}
                  </Text>
                  {isActive && <View style={styles.activeIndicator} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* SELECTOR SECUNDARIO (Niveles en Píldoras Limpias) */}
        {selectedMainCat !== "all" && availableSubCats.length > 0 && (
          <View style={[styles.subCategoryWrapper, { backgroundColor: currentColors.bgSecondary, borderTopColor: currentColors.borderLight }]}>
            <View style={styles.headerContentWrapper}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={[styles.subCategoryScroll, isTablet && { justifyContent: "center", flexGrow: 1 }]}
              >
                <Pressable 
                  style={[
                    styles.subChip, 
                    { backgroundColor: currentColors.card, borderColor: currentColors.borderLight },
                    selectedSubCat === "all" && { backgroundColor: BRAND_GRADIENT[0], borderColor: BRAND_GRADIENT[0] }
                  ]}
                  onPress={() => setSelectedSubCat("all")}
                >
                  <Text style={[
                    styles.subChipText, 
                    { color: currentColors.textSecondary },
                    selectedSubCat === "all" && { color: '#FFF' }
                  ]}>
                    Nivel Todas
                  </Text>
                </Pressable>
                
                {availableSubCats.map(sub => (
                  <Pressable 
                    key={sub} 
                    style={[
                      styles.subChip, 
                      { backgroundColor: currentColors.card, borderColor: currentColors.borderLight },
                      selectedSubCat === sub && { backgroundColor: BRAND_GRADIENT[0], borderColor: BRAND_GRADIENT[0] }
                    ]}
                    onPress={() => setSelectedSubCat(sub)}
                  >
                    <Text style={[
                      styles.subChipText, 
                      { color: currentColors.textSecondary },
                      selectedSubCat === sub && { color: '#FFF' }
                    ]}>
                      {sub.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      {/* --- GRID DE EQUIPOS --- */}
      <FlatList
        key={numColumns} 
        data={finalFilteredTeams}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns} 
        contentContainerStyle={[styles.listContent, { paddingBottom: isTablet ? insets.bottom + 100 : insets.bottom + 80 }]}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
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
          <FadeInView delay={200}>
            <View style={[styles.emptyState, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: currentColors.bgSecondary }]}>
                <Ionicons name="shield-outline" size={45} color={BRAND_GRADIENT[0]} />
              </View>
              <Text style={[styles.emptyTitle, { color: currentColors.text }]}>No hay equipos</Text>
              <Text style={[styles.emptySub, { color: currentColors.textSecondary }]}>No encontramos equipos que coincidan con tus filtros o búsqueda actual.</Text>
            </View>
          </FadeInView>
        }
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ESTILOS PREMIUM
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  // Header Base
  header: { 
    borderBottomWidth: 1, 
    paddingBottom: 0, // Ajustado para que el Scroll quede al borde
    zIndex: 10,
    elevation: 6,
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  headerContentWrapper: { width: "100%", maxWidth: 800, alignSelf: "center" },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginBottom: 15 },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  refreshBtn: { padding: 8, backgroundColor: 'rgba(150,150,150,0.1)', borderRadius: 12 },
  seasonSelectorInline: { paddingHorizontal: 24, marginBottom: 12 },

  // Buscador Moderno
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "600" },
  clearBtn: { padding: 4 },

  // Selector Principal
  mainCategoryScroll: { paddingHorizontal: 24, paddingBottom: 0, gap: 25 },
  mainTab: { paddingVertical: 12, position: "relative", alignItems: "center" },
  mainTabActive: {},
  mainTabText: { fontSize: 13, fontWeight: "800", letterSpacing: 1, textTransform: 'uppercase' },
  mainTabTextActive: { color: BRAND_GRADIENT[0] },
  activeIndicator: { 
    position: "absolute", 
    bottom: 0, 
    width: "100%", 
    height: 4, 
    backgroundColor: BRAND_GRADIENT[0], 
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4
  },

  // Selector Secundario (Píldoras Flotantes)
  subCategoryWrapper: { paddingVertical: 14, borderTopWidth: 1 },
  subCategoryScroll: { paddingHorizontal: 20, gap: 10 },
  subChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  subChipText: { fontSize: 12, fontWeight: "800", textTransform: 'uppercase', letterSpacing: 0.5 },

  // Grid
  listContent: { 
    padding: 16, 
    paddingTop: 24,
    maxWidth: 1200, 
    alignSelf: "center", 
    width: "100%",
  },
  columnWrapper: { gap: 16, justifyContent: "flex-start", marginBottom: 16 },
  
  // Tarjeta de Equipo (Bento Box Style)
  cardContainer: {
    flex: 1,
    maxWidth: 400, 
    aspectRatio: 0.85,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 4,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardGradient: { flex: 1, padding: 18, alignItems: "center", justifyContent: "center" },
  
  logoWrapper: {
    width: 76,
    height: 76,
    borderRadius: 24, // Suave squircle
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    elevation: 5,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: "hidden", 
    padding: 0,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)'
  },
  teamLogo: { width: "100%", height: "100%" },
  initialsText: { fontSize: 26, fontWeight: "900" },
  
  teamName: { fontSize: 17, fontWeight: "900", color: "#FFFFFF", textAlign: "center", marginBottom: 10, letterSpacing: -0.3 },
  categoryBadge: { backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  categoryText: { fontSize: 10, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },

  // Empty State Premium
  emptyState: { alignItems: "center", marginTop: 40, paddingVertical: 50, paddingHorizontal: 20, borderRadius: 32, borderWidth: 1, borderStyle: "dashed", alignSelf: 'center', width: '100%', maxWidth: 600 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 19, fontWeight: "900", marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: "center", paddingHorizontal: 30, lineHeight: 22 },
});
