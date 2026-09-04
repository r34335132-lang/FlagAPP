import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
  useColorScheme,
  useWindowDimensions,
  Animated,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { SeasonSelector } from "@/components/SeasonSelector";
import { useSelectedSeason } from "@/hooks/useSeasons";
import { useStats } from "@/hooks/useStats";
import { useTeams } from "@/hooks/useTeams";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";

const DASH_BG = "#F7F9FC";

const CATEGORY_GROUPS = [
  { id: "femenil", label: "Femenil", tiers: ["copper", "silver", "gold"] },
  { id: "mixto", label: "Mixto", tiers: ["silver", "gold"] },
  { id: "varonil", label: "Varonil", tiers: ["silver", "gold"] },
  { id: "teens", label: "Teens", tiers: [] },
];

const MAIN_CATEGORIES = [
  { id: "all", label: "Todas" },
  ...CATEGORY_GROUPS.map((g) => ({ id: g.id, label: g.label })),
];

const TIER_COLORS: Record<string, string> = {
  copper: "#B87333",
  silver: "#94A3B8",
  gold: "#F59E0B",
};

type StatType =
  | "touchdowns_totales"
  | "pases_completos"
  | "puntos_extra"
  | "sacks"
  | "intercepciones"
  | "banderas_jaladas"
  | "mvps";
type StatCategory = "ofensiva" | "defensa" | "premios";

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
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

function ProgressRing({
  progress,
  size = 52,
  stroke = 5,
  color,
  trackColor,
  label,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  trackColor: string;
  label: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = c * (1 - clamped);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 11, fontWeight: "900", color }}>{label}</Text>
    </View>
  );
}

function ProgressBar({
  value,
  max,
  color,
  trackColor,
}: {
  value: number;
  max: number;
  color: string;
  trackColor: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View style={[styles.barTrack, { backgroundColor: trackColor }]}>
      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

function TeamStatCard({
  team,
  rank,
  teams,
  maxPoints,
  currentColors,
}: {
  team: any;
  rank: number;
  teams: any[];
  maxPoints: number;
  currentColors: any;
}) {
  const wins = team.games_won ?? team.wins ?? 0;
  const losses = team.games_lost ?? team.losses ?? 0;
  const played = team.games_played ?? wins + losses + (team.games_tied ?? team.draws ?? 0);
  const winRate = played > 0 ? wins / played : 0;
  const points = team.points ?? 0;
  const pf = team.points_for ?? 0;
  const pa = team.points_against ?? 0;
  const diff = team.points_difference ?? pf - pa;
  const teamInfo = teams?.find((t) => t.name === team.team_name);
  const hasLogo = teamInfo?.logo_url && !teamInfo.logo_url.startsWith("blob:");
  const tier = team.team_category?.split("-")?.[1]?.toLowerCase();
  const tierColor = (tier && TIER_COLORS[tier]) || BRAND_GRADIENT[0];

  return (
    <View
      style={[
        styles.teamCard,
        softShadow,
        { backgroundColor: currentColors.card, borderColor: currentColors.borderLight },
      ]}
    >
      <View style={styles.teamCardTop}>
        <View style={styles.rankCircle}>
          <Text style={[styles.rankNum, { color: rank <= 3 ? tierColor : currentColors.textMuted }]}>
            {rank}
          </Text>
        </View>
        <View style={[styles.teamLogoWrap, { backgroundColor: currentColors.bgSecondary }]}>
          {hasLogo ? (
            <Image source={{ uri: teamInfo.logo_url }} style={styles.teamLogo} resizeMode="contain" />
          ) : (
            <Text style={[styles.teamInitials, { color: currentColors.textMuted }]}>
              {team.team_name?.substring(0, 2).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.teamName, { color: currentColors.text }]} numberOfLines={1}>
            {team.team_name}
          </Text>
          <Text style={[styles.teamMeta, { color: currentColors.textMuted }]}>
            {played} PJ · {wins}G · {losses}P
            {tier ? ` · ${tier.toUpperCase()}` : ""}
          </Text>
        </View>
        <ProgressRing
          progress={winRate}
          color={Colors.light.green}
          trackColor={currentColors.bgSecondary}
          label={`${Math.round(winRate * 100)}%`}
        />
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricBlock}>
          <Text style={[styles.metricValue, { color: currentColors.text }]}>{points}</Text>
          <Text style={[styles.metricLabel, { color: currentColors.textMuted }]}>PTS</Text>
          <ProgressBar value={points} max={maxPoints || 1} color={BRAND_GRADIENT[0]} trackColor={currentColors.bgSecondary} />
        </View>
        <View style={styles.metricBlock}>
          <Text style={[styles.metricValue, { color: Colors.light.green }]}>{wins}</Text>
          <Text style={[styles.metricLabel, { color: currentColors.textMuted }]}>VICTORIAS</Text>
          <ProgressBar value={wins} max={played || 1} color={Colors.light.green} trackColor={currentColors.bgSecondary} />
        </View>
        <View style={styles.metricBlock}>
          <Text style={[styles.metricValue, { color: Colors.light.loss }]}>{losses}</Text>
          <Text style={[styles.metricLabel, { color: currentColors.textMuted }]}>DERROTAS</Text>
          <ProgressBar value={losses} max={played || 1} color={Colors.light.loss} trackColor={currentColors.bgSecondary} />
        </View>
      </View>

      <View style={[styles.diffRow, { borderTopColor: currentColors.borderLight }]}>
        <Text style={[styles.diffText, { color: currentColors.textSecondary }]}>
          PF {pf} · PC {pa}
        </Text>
        <Text
          style={[
            styles.diffValue,
            { color: diff > 0 ? Colors.light.green : diff < 0 ? Colors.light.loss : currentColors.textMuted },
          ]}
        >
          DIF {diff > 0 ? `+${diff}` : diff}
        </Text>
      </View>
    </View>
  );
}

const StatChip = ({ type, label, active, onPress, colors }: any) => {
  const isActive = active === type;
  return (
    <Pressable
      style={[
        styles.statChip,
        softShadow,
        { backgroundColor: isActive ? BRAND_GRADIENT[0] : colors.card, borderColor: colors.borderLight },
      ]}
      onPress={() => onPress(type)}
    >
      <Text style={[styles.statChipText, { color: isActive ? "#FFF" : colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
};

export default function StandingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { selectedSeasonId } = useSelectedSeason();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useStats(selectedSeasonId);
  const { data: teams, isLoading: teamsLoading, refetch: refetchTeams } = useTeams(selectedSeasonId);
  const { data: playerStats, isLoading: playersLoading, refetch: refetchPlayers } = usePlayerStats(selectedSeasonId);

  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"teams" | "players">("teams");
  const [activeStatCategory, setActiveStatCategory] = useState<StatCategory>("ofensiva");
  const [statType, setStatType] = useState<StatType>("touchdowns_totales");
  const [selectedMainCat, setSelectedMainCat] = useState("all");
  const [selectedSubCat, setSelectedSubCat] = useState("all");

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const screenBg = theme === "dark" ? currentColors.bg : DASH_BG;
  const topPad = insets.top + (Platform.OS === "web" ? 20 : 10);
  const isLoading = statsLoading || teamsLoading || playersLoading;

  useEffect(() => {
    setSelectedSubCat("all");
  }, [selectedMainCat]);

  useEffect(() => {
    setSelectedMainCat("all");
    setSelectedSubCat("all");
  }, [selectedSeasonId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchTeams(), refetchPlayers()]);
    setRefreshing(false);
  };

  const statsWithZeros = useMemo(() => {
    if (!teams) return stats || [];
    const statsMap = new Map((stats || []).map((s: any) => [s.team_name || s.name, s]));

    const allStats = teams.map((team: any) => {
      if (statsMap.has(team.name)) return statsMap.get(team.name);
      return {
        team_id: team.id,
        team_name: team.name,
        team_category: team.category,
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        games_tied: 0,
        points_for: 0,
        points_against: 0,
        points_difference: 0,
        points: 0,
      };
    });

    return allStats.sort((a: any, b: any) => {
      if (b.points !== a.points) return (b.points || 0) - (a.points || 0);
      if ((b.points_difference ?? 0) !== (a.points_difference ?? 0)) {
        return (b.points_difference ?? 0) - (a.points_difference ?? 0);
      }
      return (b.points_for || 0) - (a.points_for || 0);
    });
  }, [stats, teams]);

  const availableSubCats = useMemo(() => {
    if (selectedMainCat === "all") return [];
    const group = CATEGORY_GROUPS.find((g) => g.id === selectedMainCat);
    if (group?.tiers?.length) {
      const present = new Set<string>();
      statsWithZeros.forEach((s: any) => {
        if (!s.team_category?.toLowerCase().startsWith(selectedMainCat)) return;
        const parts = s.team_category.split("-");
        if (parts.length > 1) present.add(parts[1].toLowerCase());
      });
      const ordered = group.tiers.filter((t) => present.has(t));
      const extras = Array.from(present).filter((t) => !group.tiers.includes(t));
      return [...ordered, ...extras.sort()];
    }
    const subs = new Set<string>();
    statsWithZeros.forEach((s: any) => {
      if (!s.team_category?.toLowerCase().startsWith(selectedMainCat)) return;
      const parts = s.team_category?.split("-");
      if (parts && parts.length > 1) subs.add(parts[1].toLowerCase());
    });
    return Array.from(subs).sort();
  }, [statsWithZeros, selectedMainCat]);

  const finalFilteredStats = useMemo(() => {
    let list = statsWithZeros;
    if (selectedMainCat !== "all") {
      list = list.filter((s: any) => s.team_category?.toLowerCase().startsWith(selectedMainCat.toLowerCase()));
    }
    if (selectedSubCat !== "all") {
      list = list.filter((s: any) => {
        const parts = s.team_category?.split("-");
        return parts && parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
      });
    }
    return list;
  }, [statsWithZeros, selectedMainCat, selectedSubCat]);

  const groupedSections = useMemo(() => {
    if (selectedMainCat !== "all" || viewMode !== "teams") return null;

    const sections: { key: string; title: string; tier?: string; data: any[] }[] = [];

    CATEGORY_GROUPS.forEach((group) => {
      const groupTeams = statsWithZeros.filter((s: any) =>
        s.team_category?.toLowerCase().startsWith(group.id)
      );
      if (groupTeams.length === 0) return;

      if (group.tiers.length === 0) {
        sections.push({ key: group.id, title: group.label, data: groupTeams });
        return;
      }

      group.tiers.forEach((tier) => {
        const tierTeams = groupTeams.filter((s: any) => {
          const parts = s.team_category?.split("-");
          return parts && parts[1]?.toLowerCase() === tier;
        });
        if (tierTeams.length === 0) return;
        sections.push({
          key: `${group.id}-${tier}`,
          title: `${group.label} · ${tier.charAt(0).toUpperCase()}${tier.slice(1)}`,
          tier,
          data: tierTeams,
        });
      });

      const leftover = groupTeams.filter((s: any) => {
        const parts = s.team_category?.split("-");
        const t = parts?.[1]?.toLowerCase();
        return !t || !group.tiers.includes(t);
      });
      if (leftover.length > 0) {
        sections.push({ key: `${group.id}-other`, title: `${group.label} · Otros`, data: leftover });
      }
    });

    const known = new Set(CATEGORY_GROUPS.map((g) => g.id));
    const others = statsWithZeros.filter((s: any) => {
      const main = s.team_category?.split("-")?.[0]?.toLowerCase();
      return !main || !known.has(main);
    });
    if (others.length > 0) {
      sections.push({ key: "otros", title: "Otras categorías", data: others });
    }

    return sections;
  }, [statsWithZeros, selectedMainCat, viewMode]);

  const topPlayers = useMemo(() => {
    let filtered = playerStats ?? [];
    if (selectedMainCat !== "all") {
      filtered = filtered.filter((p: any) =>
        p.teams?.category?.toLowerCase().startsWith(selectedMainCat.toLowerCase())
      );
    }
    if (selectedSubCat !== "all") {
      filtered = filtered.filter((p: any) => {
        const parts = p.teams?.category?.split("-");
        return parts && parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
      });
    }

    if (statType === "mvps") {
      return filtered
        .map((m: any) => ({
          id: m.id,
          name: m.name,
          photo_url: m.photo_url,
          teams: m.teams,
          jersey_number: m.jersey_number,
          mvps: m.mvps,
        }))
        .sort((a, b) => (b.mvps || 0) - (a.mvps || 0))
        .slice(0, 50);
    }

    return filtered
      .sort((a: any, b: any) => (b[statType] || 0) - (a[statType] || 0))
      .slice(0, 50);
  }, [playerStats, selectedMainCat, selectedSubCat, statType]);

  const getRankStyle = (index: number) => {
    if (index === 0) return { bg: theme === "dark" ? "rgba(245,158,11,0.15)" : "#FFFBEB", color: "#F59E0B" };
    if (index === 1) return { bg: theme === "dark" ? "rgba(148,163,184,0.15)" : "#F8FAFC", color: "#94A3B8" };
    if (index === 2) return { bg: theme === "dark" ? "rgba(217,119,6,0.15)" : "#FFF7ED", color: "#D97706" };
    return { bg: currentColors.bgSecondary, color: currentColors.textMuted };
  };

  const getStatLabel = (type: StatType) => {
    switch (type) {
      case "touchdowns_totales":
        return "TDs";
      case "pases_completos":
        return "COMP";
      case "puntos_extra":
        return "PTS EX";
      case "sacks":
        return "SACKS";
      case "intercepciones":
        return "INTs";
      case "banderas_jaladas":
        return "SAF";
      case "mvps":
        return "MVPs";
      default:
        return "";
    }
  };

  const handleCategoryPress = (category: StatCategory) => {
    setActiveStatCategory(category);
    if (category === "ofensiva") setStatType("touchdowns_totales");
    if (category === "defensa") setStatType("sacks");
    if (category === "premios") setStatType("mvps");
  };

  const maxPointsInView = useMemo(() => {
    const list = groupedSections
      ? groupedSections.flatMap((s) => s.data)
      : finalFilteredStats;
    return Math.max(1, ...list.map((t: any) => t.points || 0));
  }, [groupedSections, finalFilteredStats]);

  const renderTeamList = (list: any[], startRank = 1) => (
    <View style={styles.teamGrid}>
      {list.map((team, index) => (
        <FadeInView key={team.team_id || team.team_name || index} delay={(index % 8) * 40}>
          <TeamStatCard
            team={team}
            rank={startRank + index}
            teams={teams || []}
            maxPoints={maxPointsInView}
            currentColors={currentColors}
          />
        </FadeInView>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: screenBg }]}>
        <View style={styles.headerInner}>
          <Text style={[styles.screenTitle, { color: currentColors.text }]}>Estadísticas</Text>
          <SeasonSelector compact style={styles.seasonSelector} />

          <View style={[styles.toggleWrap, { backgroundColor: currentColors.card }, softShadow]}>
            <Pressable
              style={[
                styles.toggleBtn,
                viewMode === "teams" && { backgroundColor: BRAND_GRADIENT[0] },
              ]}
              onPress={() => setViewMode("teams")}
            >
              <Ionicons
                name="shield"
                size={15}
                color={viewMode === "teams" ? "#FFF" : currentColors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  { color: viewMode === "teams" ? "#FFF" : currentColors.textSecondary },
                ]}
              >
                Equipos
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.toggleBtn,
                viewMode === "players" && { backgroundColor: BRAND_GRADIENT[0] },
              ]}
              onPress={() => setViewMode("players")}
            >
              <Ionicons
                name="people"
                size={16}
                color={viewMode === "players" ? "#FFF" : currentColors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  { color: viewMode === "players" ? "#FFF" : currentColors.textSecondary },
                ]}
              >
                Líderes
              </Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.mainCatScroll, isTablet && { justifyContent: "center", flexGrow: 1 }]}
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
              contentContainerStyle={styles.subCatScroll}
            >
              <Pressable
                style={[
                  styles.subChip,
                  {
                    backgroundColor: selectedSubCat === "all" ? currentColors.text : currentColors.bgSecondary,
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
                      {
                        backgroundColor: active ? accent : currentColors.bgSecondary,
                      },
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

          {viewMode === "players" && (
            <View style={styles.playerFilters}>
              <View style={styles.filterMainRow}>
                {(
                  [
                    { id: "ofensiva", label: "Ofensiva", color: "#3B82F6" },
                    { id: "defensa", label: "Defensa", color: "#EF4444" },
                    { id: "premios", label: "Premios", color: "#F59E0B" },
                  ] as const
                ).map((item) => {
                  const active = activeStatCategory === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.filterMainBtn,
                        {
                          backgroundColor: active ? `${item.color}18` : currentColors.card,
                          borderColor: active ? item.color : currentColors.borderLight,
                        },
                      ]}
                      onPress={() => handleCategoryPress(item.id)}
                    >
                      <Text style={[styles.filterMainText, { color: active ? item.color : currentColors.textMuted }]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterSubScroll}>
                {activeStatCategory === "ofensiva" && (
                  <>
                    <StatChip type="touchdowns_totales" label="Anotaciones" active={statType} onPress={setStatType} colors={currentColors} />
                    <StatChip type="pases_completos" label="QB Pass" active={statType} onPress={setStatType} colors={currentColors} />
                  </>
                )}
                {activeStatCategory === "defensa" && (
                  <>
                    <StatChip type="sacks" label="Sacks" active={statType} onPress={setStatType} colors={currentColors} />
                    <StatChip type="intercepciones" label="Intercepciones" active={statType} onPress={setStatType} colors={currentColors} />
                  </>
                )}
                {activeStatCategory === "premios" && (
                  <StatChip type="mvps" label="MVPs" active={statType} onPress={setStatType} colors={currentColors} />
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isTablet ? insets.bottom + 100 : insets.bottom + 88 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />
        }
      >
        <View style={styles.mainContent}>
          {isLoading && !refreshing ? (
            <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} style={{ marginTop: 48 }} />
          ) : viewMode === "teams" ? (
            groupedSections ? (
              groupedSections.length > 0 ? (
                groupedSections.map((section) => (
                  <View key={section.key} style={styles.categorySection}>
                    <View style={styles.categoryHeader}>
                      {section.tier && (
                        <View
                          style={[
                            styles.tierDot,
                            { backgroundColor: TIER_COLORS[section.tier] || BRAND_GRADIENT[0] },
                          ]}
                        />
                      )}
                      <Text style={[styles.categoryTitle, { color: currentColors.text }]}>{section.title}</Text>
                      <Text style={[styles.categoryCount, { color: currentColors.textMuted }]}>
                        {section.data.length}
                      </Text>
                    </View>
                    {renderTeamList(section.data)}
                  </View>
                ))
              ) : (
                <EmptyState
                  icon="trophy-outline"
                  title="Sin datos"
                  subtitle="No hay equipos registrados en esta temporada"
                  colors={currentColors}
                />
              )
            ) : finalFilteredStats.length > 0 ? (
              renderTeamList(finalFilteredStats)
            ) : (
              <EmptyState
                icon="trophy-outline"
                title="Sin datos"
                subtitle="No hay equipos registrados en esta categoría"
                colors={currentColors}
              />
            )
          ) : topPlayers.length > 0 ? (
            <View style={styles.playersList}>
              {topPlayers.map((player: any, index: number) => {
                const rankStyles = getRankStyle(index);
                const hasPhoto = player.photo_url && !player.photo_url.startsWith("blob:");
                const maxStat = Math.max(1, ...(topPlayers.map((p: any) => p[statType] || 0) as number[]));
                const value = player[statType] || 0;

                return (
                  <FadeInView key={player.id} delay={(index % 10) * 40}>
                    <Pressable
                      onPress={() => router.push(`/player/${player.id}`)}
                      style={({ pressed }) => [
                        styles.playerCard,
                        softShadow,
                        {
                          backgroundColor: currentColors.card,
                          borderColor: currentColors.borderLight,
                          opacity: pressed ? 0.92 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.playerRank, { backgroundColor: rankStyles.bg }]}>
                        <Text style={[styles.playerRankText, { color: rankStyles.color }]}>{index + 1}</Text>
                      </View>
                      <View style={styles.playerAvatarWrap}>
                        {hasPhoto ? (
                          <Image source={{ uri: player.photo_url }} style={styles.playerAvatar} />
                        ) : (
                          <View
                            style={[
                              styles.playerAvatar,
                              {
                                backgroundColor: currentColors.bgSecondary,
                                alignItems: "center",
                                justifyContent: "center",
                              },
                            ]}
                          >
                            <Ionicons name="person" size={20} color={currentColors.textMuted} />
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.playerName, { color: currentColors.text }]} numberOfLines={1}>
                          {player.name}
                        </Text>
                        <Text style={[styles.playerTeam, { color: currentColors.textSecondary }]} numberOfLines={1}>
                          {player.teams?.name}
                          {player.jersey_number ? ` #${player.jersey_number}` : ""}
                        </Text>
                        <ProgressBar
                          value={value}
                          max={maxStat}
                          color={BRAND_GRADIENT[0]}
                          trackColor={currentColors.bgSecondary}
                        />
                      </View>
                      <View style={styles.statBox}>
                        <Text style={[styles.statNum, { color: currentColors.text }]}>{value}</Text>
                        <Text style={[styles.statLbl, { color: currentColors.textMuted }]}>
                          {getStatLabel(statType)}
                        </Text>
                      </View>
                    </Pressable>
                  </FadeInView>
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="medal-outline"
              title="Sin jugadores"
              subtitle="Aún no hay registros para esta estadística."
              colors={currentColors}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  colors,
}: {
  icon: any;
  title: string;
  subtitle: string;
  colors: any;
}) {
  return (
    <View style={[styles.emptyCard, softShadow, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <Ionicons name={icon} size={44} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { zIndex: 10, paddingBottom: 4 },
  headerInner: { width: "100%", maxWidth: 800, alignSelf: "center" },
  screenTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
    paddingHorizontal: 20,
  },
  seasonSelector: { paddingHorizontal: 20, marginTop: 10 },

  toggleWrap: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
    borderRadius: 16,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  toggleText: { fontSize: 13, fontWeight: "800" },

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

  playerFilters: { paddingBottom: 6 },
  filterMainRow: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 10 },
  filterMainBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterMainText: { fontSize: 12, fontWeight: "800" },
  filterSubScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  statChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  statChipText: { fontSize: 12, fontWeight: "700" },

  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  mainContent: { width: "100%", maxWidth: 800, alignSelf: "center" },

  categorySection: { marginBottom: 22 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  categoryTitle: { flex: 1, fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  categoryCount: { fontSize: 12, fontWeight: "700" },

  teamGrid: { gap: 12 },
  teamCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  teamCardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  rankCircle: { width: 24, alignItems: "center" },
  rankNum: { fontSize: 16, fontWeight: "900" },
  teamLogoWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  teamLogo: { width: "100%", height: "100%" },
  teamInitials: { fontSize: 12, fontWeight: "800" },
  teamName: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  teamMeta: { fontSize: 11, fontWeight: "600", marginTop: 2 },

  metricsRow: { flexDirection: "row", gap: 10 },
  metricBlock: { flex: 1 },
  metricValue: { fontSize: 20, fontWeight: "900", letterSpacing: -0.4 },
  metricLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6, marginBottom: 6, marginTop: 2 },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },

  diffRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  diffText: { fontSize: 12, fontWeight: "600" },
  diffValue: { fontSize: 13, fontWeight: "800" },

  playersList: { gap: 10 },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  playerRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  playerRankText: { fontSize: 13, fontWeight: "900" },
  playerAvatarWrap: {},
  playerAvatar: { width: 44, height: 44, borderRadius: 22 },
  playerName: { fontSize: 15, fontWeight: "800", marginBottom: 2 },
  playerTeam: { fontSize: 11, fontWeight: "600", marginBottom: 6 },
  statBox: { alignItems: "flex-end", minWidth: 44 },
  statNum: { fontSize: 20, fontWeight: "900" },
  statLbl: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },

  emptyCard: {
    alignItems: "center",
    paddingVertical: 48,
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginTop: 12 },
  emptySubtitle: { fontSize: 13, fontWeight: "600", marginTop: 6, paddingHorizontal: 32, textAlign: "center" },
});
