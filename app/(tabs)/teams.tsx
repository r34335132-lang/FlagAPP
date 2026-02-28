import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  TextInput,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTeams } from "@/hooks/useTeams";
import { TeamCard } from "@/components/TeamCard";
import { TeamCardSkeleton } from "@/components/SkeletonLoader";
import C from "@/constants/colors";

export default function TeamsScreen() {
  const insets = useSafeAreaInsets();
  const { data: teams, isLoading, refetch } = useTeams();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const filtered = useMemo(() => {
    if (!teams) return [];
    if (!search.trim()) return teams;
    const q = search.toLowerCase();
    return teams.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.coach_name?.toLowerCase().includes(q)
    );
  }, [teams, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={isLoading ? [] : filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPad + 8, paddingBottom: bottomPad + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isLoading || filtered.length > 0}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.screenTitle}>Equipos</Text>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={16} color={C.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar equipo..."
                placeholderTextColor={C.textMuted}
              />
            </View>
            {isLoading && (
              <View style={{ gap: 10 }}>
                {[1, 2, 3, 4, 5].map((k) => <TeamCardSkeleton key={k} />)}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={C.textMuted} />
              <Text style={styles.emptyTitle}>Sin equipos</Text>
              <Text style={styles.emptySubtitle}>
                {search ? "No se encontraron resultados" : "No hay equipos disponibles"}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <TeamCard team={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  list: {
    paddingHorizontal: 16,
  },
  screenTitle: {
    color: C.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    color: C.textSecondary,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySubtitle: {
    color: C.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
});
