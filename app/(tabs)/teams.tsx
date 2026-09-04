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
  Easing,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SeasonSelector } from "@/components/SeasonSelector";
import { useTeams } from "@/hooks/useTeams";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";

const DASH_BG = "#F7F9FC";

const MAIN_CATEGORIES = [
  { id: "all", label: "Todas" },
  { id: "varonil", label: "Varonil" },
  { id: "femenil", label: "Femenil" },
  { id: "mixto", label: "Mixto" },
  { id: "teens", label: "Teens" },
];

const TIER_COLORS: Record<string, string> = {
  copper: "#B87333",
  silver: "#94A3B8",
  gold: "#F59E0B",
};

const softShadow = Platform.select({
  ios: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
  default: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
});

const FadeInView = ({ children, delay = 0 }: { children: any; delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 380,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [delay, fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

export default function TeamsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: teams, isLoading, refetch } = useTeams();

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainCat, setSelectedMainCat] = useState("all");
  const [selectedSubCat, setSelectedSubCat] = useState("all");

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const screenBg = theme === "dark" ? currentColors.bg : DASH_BG;
  const topPad = insets.top + (Platform.OS === "web" ? 20 : 10);

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
      const matchesMainCat =
        selectedMainCat === "all" ||
        team.category?.toLowerCase().startsWith(selectedMainCat.toLowerCase());
      return matchesSearch && matchesMainCat;
    });
  }, [teams, searchQuery, selectedMainCat]);

  const availableSubCats = useMemo(() => {
    if (selectedMainCat === "all") return [];

    const subs = new Set<string>();
    filteredByMain.forEach((t) => {
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
      filtered = filtered.filter((t) => {
        const parts = t.category?.split("-");
        return parts && parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
      });
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredByMain, selectedSubCat]);

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.loading, { backgroundColor: screenBg }]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  const renderTeamCard = ({ item, index }: { item: any; index: number }) => {
    const hasLogo = !!item.logo_url && !String(item.logo_url).startsWith("blob:");
    const accent = item.color1 || BRAND_GRADIENT[0];
    const categoryLabel = item.category?.replace("-", " ") || "Sin categoría";

    return (
      <FadeInView delay={(index % numColumns) * 60}>
        <Pressable
          style={({ pressed }) => [
            styles.card,
            softShadow,
            {
              backgroundColor: currentColors.card,
              borderColor: currentColors.borderLight,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
          onPress={() => router.push({ pathname: "/team/[id]", params: { id: item.id } })}
        >
          <View style={[styles.cardAccent, { backgroundColor: accent }]} />

          <View style={[styles.logoWrap, { backgroundColor: currentColors.bgSecondary }]}>
            {hasLogo ? (
              <Image source={{ uri: item.logo_url }} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <Text style={[styles.initials, { color: accent }]}>
                {item.name.substring(0, 2).toUpperCase()}
              </Text>
            )}
          </View>

          <Text style={[styles.teamName, { color: currentColors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.teamCategory, { color: currentColors.textMuted }]} numberOfLines={1}>
            {categoryLabel}
          </Text>
        </Pressable>
      </FadeInView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: screenBg }]}>
        <View style={styles.headerInner}>
          <View style={styles.headerTop}>
            <Text style={[styles.screenTitle, { color: currentColors.text }]}>Equipos</Text>
            <Pressable
              onPress={() => refetch()}
              style={[styles.refreshBtn, { backgroundColor: currentColors.card }, softShadow]}
            >
              <Ionicons name="refresh" size={18} color={currentColors.textMuted} />
            </Pressable>
          </View>

          <SeasonSelector compact style={styles.seasonSelector} />

          <View
            style={[
              styles.searchBar,
              softShadow,
              {
                backgroundColor: currentColors.card,
                borderColor: currentColors.borderLight,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={currentColors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: currentColors.text }]}
              placeholder="Buscar un equipo..."
              placeholderTextColor={currentColors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} style={styles.clearBtn} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={currentColors.textMuted} />
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.mainCatScroll,
              isTablet && { justifyContent: "center", flexGrow: 1 },
            ]}
          >
            {MAIN_CATEGORIES.map((cat) => {
              const active = selectedMainCat === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedMainCat(cat.id)}
                  style={[
                    styles.mainChip,
                    softShadow,
                    {
                      backgroundColor: active ? BRAND_GRADIENT[0] : currentColors.card,
                      borderColor: currentColors.borderLight,
                    },
                  ]}
                >
                  <Text style={[styles.mainChipText, { color: active ? "#FFF" : currentColors.textSecondary }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {selectedMainCat !== "all" && availableSubCats.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.subCatScroll,
                isTablet && { justifyContent: "center", flexGrow: 1 },
              ]}
            >
              <Pressable
                style={[
                  styles.subChip,
                  {
                    backgroundColor:
                      selectedSubCat === "all" ? currentColors.text : currentColors.bgSecondary,
                  },
                ]}
                onPress={() => setSelectedSubCat("all")}
              >
                <Text
                  style={[
                    styles.subChipText,
                    { color: selectedSubCat === "all" ? currentColors.bg : currentColors.textSecondary },
                  ]}
                >
                  Todas
                </Text>
              </Pressable>
              {availableSubCats.map((sub) => {
                const active = selectedSubCat === sub;
                const accent = TIER_COLORS[sub] || BRAND_GRADIENT[0];
                return (
                  <Pressable
                    key={sub}
                    style={[
                      styles.subChip,
                      { backgroundColor: active ? accent : currentColors.bgSecondary },
                    ]}
                    onPress={() => setSelectedSubCat(sub)}
                  >
                    <Text style={[styles.subChipText, { color: active ? "#FFF" : currentColors.textSecondary }]}>
                      {sub.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      <FlatList
        key={numColumns}
        data={finalFilteredTeams}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: isTablet ? insets.bottom + 100 : insets.bottom + 88 },
        ]}
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
          <FadeInView delay={120}>
            <View
              style={[
                styles.emptyCard,
                softShadow,
                { backgroundColor: currentColors.card, borderColor: currentColors.borderLight },
              ]}
            >
              <View style={[styles.emptyIconWrap, { backgroundColor: currentColors.bgSecondary }]}>
                <Ionicons name="shield-outline" size={40} color={currentColors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: currentColors.text }]}>No hay equipos</Text>
              <Text style={[styles.emptySubtitle, { color: currentColors.textSecondary }]}>
                No encontramos equipos que coincidan con tus filtros o búsqueda actual.
              </Text>
            </View>
          </FadeInView>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: { zIndex: 10, paddingBottom: 4 },
  headerInner: { width: "100%", maxWidth: 800, alignSelf: "center" },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  seasonSelector: { paddingHorizontal: 20, marginTop: 10, marginBottom: 12 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "600" },
  clearBtn: { padding: 4 },

  mainCatScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 10 },
  mainChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  mainChipText: { fontSize: 13, fontWeight: "700" },

  subCatScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 10 },
  subChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  subChipText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },

  listContent: {
    padding: 16,
    paddingTop: 12,
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  columnWrapper: { gap: 12, justifyContent: "flex-start", marginBottom: 12 },

  card: {
    flex: 1,
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 12,
  },
  teamLogo: { width: "100%", height: "100%" },
  initials: { fontSize: 22, fontWeight: "900", letterSpacing: -0.4 },
  teamName: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "center",
    marginBottom: 4,
  },
  teamCategory: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
    textAlign: "center",
  },

  emptyCard: {
    alignItems: "center",
    paddingVertical: 48,
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "center",
    width: "100%",
    maxWidth: 600,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800" },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    paddingHorizontal: 32,
    textAlign: "center",
    lineHeight: 20,
  },
});
