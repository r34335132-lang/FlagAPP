import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";
import { isSeasonActive, seasonLabel, useSelectedSeason } from "@/hooks/useSeasons";

interface SeasonSelectorProps {
  compact?: boolean;
  showTitle?: boolean;
  style?: any;
}

export function SeasonSelector({ compact = false, showTitle = true, style }: SeasonSelectorProps) {
  const theme = useColorScheme() ?? "light";
  const colors = Colors[theme];
  const {
    seasons,
    selectedSeasonId,
    selectedSeason,
    activeSeason,
    isLoading,
    error,
    refetch,
    setSelectedSeason,
  } = useSelectedSeason();

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.loadingPill, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name="hourglass-outline" size={15} color={BRAND_GRADIENT[0]} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando temporadas…</Text>
        </View>
      </View>
    );
  }

  if (error || seasons.length === 0) {
    return (
      <View style={[styles.container, styles.errorBox, { borderColor: colors.borderLight, backgroundColor: colors.bgSecondary }, style]}>
        <Text style={[styles.errorTitle, { color: colors.text }]}>No pudimos cargar temporadas</Text>
        <Pressable onPress={refetch} style={styles.retryButton}>
          <Ionicons name="refresh" size={15} color="#FFFFFF" />
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {showTitle && (
        <View style={styles.titleRow}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Temporada</Text>
          <Text style={[styles.current, { color: colors.text }]} numberOfLines={1}>
            {seasonLabel(selectedSeason)}
          </Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, compact && styles.compactScrollContent]}
      >
        {seasons.map((season) => {
          const isSelected = season.id === selectedSeasonId;
          const isActive = season.id === activeSeason?.id || isSeasonActive(season);

          return (
            <Pressable
              key={season.id}
              onPress={() => setSelectedSeason(season.id)}
              style={[
                styles.chip,
                compact && styles.compactChip,
                { backgroundColor: colors.card, borderColor: colors.borderLight },
                isSelected && { backgroundColor: BRAND_GRADIENT[0], borderColor: BRAND_GRADIENT[0] },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  compact && styles.compactChipText,
                  { color: colors.text },
                  isSelected && styles.selectedChipText,
                ]}
                numberOfLines={1}
              >
                {seasonLabel(season)}
              </Text>
              {isActive && (
                <View style={[styles.activeBadge, isSelected && styles.selectedActiveBadge]}>
                  <Text style={[styles.activeBadgeText, isSelected && { color: BRAND_GRADIENT[0] }]}>Activa</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { fontSize: 11, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  current: { flex: 1, textAlign: "right", fontSize: 13, fontWeight: "900" },
  scrollContent: { gap: 10, paddingRight: 24 },
  compactScrollContent: { gap: 8 },
  chip: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compactChip: { minHeight: 34, paddingHorizontal: 12 },
  chipText: { fontSize: 13, fontWeight: "900" },
  compactChipText: { fontSize: 12 },
  selectedChipText: { color: "#FFFFFF" },
  activeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: `${BRAND_GRADIENT[0]}18` },
  selectedActiveBadge: { backgroundColor: "#FFFFFF" },
  activeBadgeText: { fontSize: 9, fontWeight: "900", color: BRAND_GRADIENT[0], textTransform: "uppercase" },
  loadingPill: { alignSelf: "flex-start", minHeight: 38, paddingHorizontal: 14, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 12, fontWeight: "800" },
  errorBox: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  errorTitle: { fontSize: 12, fontWeight: "800", flex: 1 },
  retryButton: { backgroundColor: BRAND_GRADIENT[0], borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
});
