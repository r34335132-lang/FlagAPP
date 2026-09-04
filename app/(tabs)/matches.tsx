import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  useWindowDimensions,
  Modal,
  Image,
  Animated,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SeasonSelector } from "@/components/SeasonSelector";
import { useMatches } from "@/hooks/useMatches";
import { useTeams } from "@/hooks/useTeams";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";

const DASH_BG = "#F7F9FC";

const MAIN_CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "en_vivo", label: "En vivo" },
  { id: "playoffs", label: "Playoffs" },
  { id: "varonil", label: "Varonil" },
  { id: "femenil", label: "Femenil" },
  { id: "mixto", label: "Mixto" },
  { id: "teens", label: "Teens" },
];

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

const isPlayoffStage = (stage: string | undefined | null) => {
  if (!stage) return false;
  return stage.toLowerCase().startsWith("llave_");
};

const isChampionshipFinalStage = (stage: string | undefined | null) => {
  if (!stage) return false;
  return /^llave_[ab]_final$/i.test(stage.trim());
};

const LivePulse = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);
  return <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />;
};

const BracketNode = ({ game, teams, currentColors, isFinal = false, label }: any) => {
  const router = useRouter();

  if (!game) {
    return (
      <View
        style={[
          styles.bracketNode,
          {
            backgroundColor: "transparent",
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: currentColors.borderLight,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text style={{ color: currentColors.textMuted, fontSize: 12, fontWeight: "800" }}>{label}</Text>
        <Text style={{ color: currentColors.textMuted, fontSize: 11, marginTop: 4 }}>Por definir</Text>
      </View>
    );
  }

  const homeTeam = teams.find((t: any) => t.name === game.home_team);
  const awayTeam = teams.find((t: any) => t.name === game.away_team);
  const isFinished = ["finalizado", "final"].includes(game.status?.toLowerCase() ?? "");
  const homeWon = isFinished && game.home_score > game.away_score;
  const awayWon = isFinished && game.away_score > game.home_score;

  const renderTeam = (teamName: string, teamData: any, score: number, isWinner: boolean) => (
    <View style={[styles.bracketTeamRow, isWinner && { backgroundColor: `${BRAND_GRADIENT[0]}12` }]}>
      <View style={styles.bracketTeamInfo}>
        {teamData?.logo_url ? (
          <Image source={{ uri: teamData.logo_url }} style={styles.bracketTeamLogo} />
        ) : (
          <View
            style={[
              styles.bracketTeamLogo,
              { backgroundColor: currentColors.bgSecondary, alignItems: "center", justifyContent: "center" },
            ]}
          >
            <Text style={{ fontSize: 8, fontWeight: "800", color: currentColors.textMuted }}>
              {teamName && teamName !== "Por definir" ? teamName.substring(0, 2).toUpperCase() : "?"}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.bracketTeamName,
            { color: isWinner ? currentColors.text : currentColors.textSecondary },
            isWinner && { fontWeight: "800" },
          ]}
          numberOfLines={1}
        >
          {teamName || "Por definir"}
        </Text>
      </View>
      <Text
        style={[
          styles.bracketScore,
          { color: isWinner ? BRAND_GRADIENT[0] : currentColors.textSecondary },
          isWinner && { fontWeight: "900" },
        ]}
      >
        {score ?? "-"}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
      style={[
        styles.bracketNode,
        softShadow,
        {
          backgroundColor: currentColors.card,
          borderColor: isFinal ? "#FACC15" : currentColors.borderLight,
          borderWidth: isFinal ? 2 : 1,
        },
      ]}
    >
      {renderTeam(game.home_team, homeTeam, game.home_score, homeWon)}
      <View style={[styles.bracketDivider, { backgroundColor: currentColors.borderLight }]} />
      {renderTeam(game.away_team, awayTeam, game.away_score, awayWon)}
    </Pressable>
  );
};

const SingleBracketTree = ({ title, gamesList, currentColors, teams, isGold }: any) => {
  const comodinA = gamesList.find((g: any) => g.stage?.toLowerCase().endsWith("comodin_a"));
  const comodinB = gamesList.find((g: any) => g.stage?.toLowerCase().endsWith("comodin_b"));
  const semiA = gamesList.find((g: any) => g.stage?.toLowerCase().endsWith("semifinal_a"));
  const semiB = gamesList.find((g: any) => g.stage?.toLowerCase().endsWith("semifinal_b"));
  const final = gamesList.find((g: any) => g.stage?.toLowerCase().endsWith("final"));

  if (!comodinA && !comodinB && !semiA && !semiB && !final) return null;

  const SLOT_HEIGHT = 86;
  const SPACER_HEIGHT = 40;
  const CONNECTOR_HEIGHT = (SLOT_HEIGHT + SPACER_HEIGHT) / 2;

  return (
    <View style={{ marginBottom: 48 }}>
      <Text
        style={{
          textAlign: "center",
          fontSize: 16,
          fontWeight: "900",
          color: isGold ? "#EAB308" : "#94A3B8",
          marginBottom: 20,
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
      <View style={styles.bracketWrapper}>
        <View style={styles.bracketColumn}>
          <Text style={[styles.bracketColumnTitle, { color: currentColors.textMuted }]}>COMODINES</Text>
          <View style={[styles.bracketSlot, { height: SLOT_HEIGHT }]}>
            <BracketNode game={comodinA} teams={teams} currentColors={currentColors} label="Comodín A" />
            <View style={[styles.connectorHorizontal, { backgroundColor: currentColors.borderLight }]} />
          </View>
          <View style={{ height: SPACER_HEIGHT }} />
          <View style={[styles.bracketSlot, { height: SLOT_HEIGHT }]}>
            <BracketNode game={comodinB} teams={teams} currentColors={currentColors} label="Comodín B" />
            <View style={[styles.connectorHorizontal, { backgroundColor: currentColors.borderLight }]} />
          </View>
        </View>

        <View style={styles.bracketColumn}>
          <Text style={[styles.bracketColumnTitle, { color: currentColors.textMuted }]}>SEMIFINALES</Text>
          <View style={[styles.bracketSlot, { height: SLOT_HEIGHT }]}>
            <View style={[styles.connectorHorizontalLeft, { backgroundColor: currentColors.borderLight }]} />
            <BracketNode game={semiA} teams={teams} currentColors={currentColors} label="Semifinal A" />
            <View style={[styles.connectorRightDown, { borderColor: currentColors.borderLight, height: CONNECTOR_HEIGHT }]} />
          </View>
          <View style={{ height: SPACER_HEIGHT }} />
          <View style={[styles.bracketSlot, { height: SLOT_HEIGHT }]}>
            <View style={[styles.connectorHorizontalLeft, { backgroundColor: currentColors.borderLight }]} />
            <BracketNode game={semiB} teams={teams} currentColors={currentColors} label="Semifinal B" />
            <View style={[styles.connectorRightUp, { borderColor: currentColors.borderLight, height: CONNECTOR_HEIGHT }]} />
          </View>
        </View>

        <View style={styles.bracketColumn}>
          <Text
            style={[
              styles.bracketColumnTitle,
              { color: isGold ? "#EAB308" : "#94A3B8", position: "absolute", top: 0, width: "100%" },
            ]}
          >
            FINAL
          </Text>
          <View style={[styles.bracketSlot, { height: SLOT_HEIGHT, marginTop: CONNECTOR_HEIGHT }]}>
            <View style={[styles.connectorHorizontalLeft, { backgroundColor: currentColors.borderLight }]} />
            <BracketNode game={final} teams={teams} currentColors={currentColors} isFinal label="Gran Final" />
          </View>
        </View>
      </View>
    </View>
  );
};

const PlayoffsBracketView = ({ games, teams, currentColors }: { games: any[]; teams: any[]; currentColors: any }) => {
  const { llaveA, llaveB } = useMemo(
    () => ({
      llaveA: games.filter((g) => g.stage?.toLowerCase().startsWith("llave_a")),
      llaveB: games.filter((g) => g.stage?.toLowerCase().startsWith("llave_b")),
    }),
    [games]
  );

  if (games.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bracketScrollContainer}>
      <View style={{ flexDirection: "column" }}>
        <SingleBracketTree title="Llave A · Oro" gamesList={llaveA} currentColors={currentColors} teams={teams} isGold />
        <SingleBracketTree title="Llave B · Plata" gamesList={llaveB} currentColors={currentColors} teams={teams} isGold={false} />
      </View>
    </ScrollView>
  );
};

const MatchCard = ({ game, teams, isPlayoffsMode }: { game: any; teams: any[]; isPlayoffsMode: boolean }) => {
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const router = useRouter();

  if (!game) return null;
  const homeTeam = teams.find((t) => t.name === game.home_team);
  const awayTeam = teams.find((t) => t.name === game.away_team);
  const isLive = ["en vivo", "en_vivo", "en curso"].includes(game.status?.toLowerCase() ?? "");
  const isFinished = ["finalizado", "final"].includes(game.status?.toLowerCase() ?? "");
  const homeWon = isFinished && game.home_score > game.away_score;
  const awayWon = isFinished && game.away_score > game.home_score;

  const isFinalStage = isChampionshipFinalStage(game.stage);
  if (isPlayoffsMode && isFinalStage && isFinished && (homeWon || awayWon)) {
    const championTeam = homeWon ? homeTeam : awayTeam;
    const championName = homeWon ? game.home_team : game.away_team;
    const isLlaveA = game.stage?.toLowerCase().includes("llave_a");

    return (
      <View
        style={[
          styles.championCard,
          softShadow,
          { backgroundColor: currentColors.card, borderColor: isLlaveA ? "#FACC15" : "#94A3B8" },
        ]}
      >
        <Ionicons name="trophy" size={28} color={isLlaveA ? "#FACC15" : "#94A3B8"} style={{ marginBottom: 10 }} />
        <Text style={[styles.championTitle, { color: currentColors.text }]}>
          Campeón {isLlaveA ? "Oro" : "Plata"}
        </Text>
        <View
          style={[
            styles.championLogoContainer,
            { backgroundColor: currentColors.bgSecondary, borderColor: isLlaveA ? "#FACC15" : "#94A3B8" },
          ]}
        >
          {championTeam?.logo_url ? (
            <Image source={{ uri: championTeam.logo_url }} style={styles.championTeamLogo} resizeMode="contain" />
          ) : (
            <Text style={[styles.logoFallback, { color: currentColors.textMuted, fontSize: 28 }]}>
              {championName?.substring(0, 2).toUpperCase() || "?"}
            </Text>
          )}
        </View>
        <Text style={[styles.championTeamName, { color: currentColors.text }]}>{championName}</Text>
        <Text style={[styles.championScoreText, { color: currentColors.textMuted }]}>
          Final {game.home_score} – {game.away_score}
        </Text>
      </View>
    );
  }

  const formatStageName = (stageStr: string) => {
    if (!stageStr) return "";
    let formatted = stageStr.replace(/llave_[ab]_/i, "").replace(/_/g, " ").toUpperCase();
    if (formatted.includes("COMODIN")) formatted = formatted.replace("COMODIN", "COMODÍN");
    return formatted;
  };

  const TeamRow = ({ team, name, score, isWinner }: any) => (
    <View style={styles.teamRow}>
      <View style={styles.teamInfo}>
        <View style={[styles.logoContainer, { backgroundColor: currentColors.bgSecondary }]}>
          {team?.logo_url ? (
            <Image source={{ uri: team.logo_url }} style={styles.teamLogo} resizeMode="contain" />
          ) : (
            <Text style={[styles.logoFallback, { color: currentColors.textMuted }]}>
              {name?.substring(0, 2).toUpperCase() || "?"}
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.teamName,
            { color: isWinner || isLive ? currentColors.text : currentColors.textSecondary },
            isWinner && { fontWeight: "900" },
          ]}
          numberOfLines={1}
        >
          {name || "Por definir"}
        </Text>
      </View>
      <Text
        style={[
          styles.scoreText,
          { color: isWinner ? BRAND_GRADIENT[0] : currentColors.text },
          isWinner && { fontSize: 24, fontWeight: "900" },
        ]}
      >
        {score !== null && score !== undefined ? score : "-"}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
      style={[
        styles.matchCard,
        softShadow,
        { backgroundColor: currentColors.card, borderColor: currentColors.borderLight },
      ]}
    >
      {isLive && <View style={styles.liveAccent} />}
      <View style={styles.cardHeader}>
        {isLive ? (
          <View style={styles.liveBadge}>
            <LivePulse />
            <Text style={styles.liveBadgeText}>EN VIVO</Text>
          </View>
        ) : (
          <Text style={[styles.statusText, { color: currentColors.textMuted }]}>
            {isFinished ? "FINAL" : game.game_time?.substring(0, 5) || "TBD"}
          </Text>
        )}
        <Text style={[styles.categoryText, { color: BRAND_GRADIENT[0] }]}>
          {isPlayoffsMode
            ? formatStageName(game.stage)
            : `${game.category?.replace("-", " ").toUpperCase()} · J${game.jornada || "?"}`}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <TeamRow team={homeTeam} name={game.home_team} score={game.home_score} isWinner={homeWon} />
        <View style={styles.vsRow}>
          <View style={[styles.vsLine, { backgroundColor: currentColors.borderLight }]} />
          <Text style={[styles.vsText, { color: currentColors.textMuted }]}>VS</Text>
          <View style={[styles.vsLine, { backgroundColor: currentColors.borderLight }]} />
        </View>
        <TeamRow team={awayTeam} name={game.away_team} score={game.away_score} isWinner={awayWon} />
      </View>
      {(game.venue || game.field) && (
        <View style={[styles.cardFooter, { borderTopColor: currentColors.borderLight }]}>
          <Ionicons name="location-outline" size={13} color={currentColors.textMuted} />
          <Text style={[styles.footerText, { color: currentColors.textMuted }]} numberOfLines={1}>
            {game.venue || "Sede TBD"}
            {game.field ? ` · Campo ${game.field}` : ""}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { data: games, isLoading, refetch } = useMatches();
  const { data: teams } = useTeams();

  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const screenBg = theme === "dark" ? currentColors.bg : DASH_BG;

  const [refreshing, setRefreshing] = useState(false);
  const [selectedMainCat, setSelectedMainCat] = useState("all");
  const [selectedJornada, setSelectedJornada] = useState("all");
  const [selectedSubCat, setSelectedSubCat] = useState("all");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [tempJornada, setTempJornada] = useState("all");
  const [tempSubCat, setTempSubCat] = useState("all");
  const [tempTeam, setTempTeam] = useState("all");

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const selectMainCategory = useCallback((categoryId: string) => {
    setSelectedMainCat(categoryId);
    setSelectedJornada("all");
    setSelectedSubCat("all");
    setSelectedTeam("all");
  }, []);

  const filteredByMain = useMemo(() => {
    if (!games) return [];
    if (selectedMainCat === "all") return games;
    if (selectedMainCat === "en_vivo") {
      return games.filter((g) => ["en vivo", "en_vivo", "live"].includes(g.status?.toLowerCase() || ""));
    }
    if (selectedMainCat === "playoffs") {
      return games.filter((g) => isPlayoffStage(g.stage));
    }
    return games.filter(
      (g) => g.category?.toLowerCase().startsWith(selectedMainCat.toLowerCase()) && !isPlayoffStage(g.stage)
    );
  }, [games, selectedMainCat]);

  const availableSubCats = useMemo(() => {
    if (selectedMainCat === "all" || selectedMainCat === "en_vivo") return [];
    const subs = new Set<string>();
    filteredByMain.forEach((g) => {
      if (selectedMainCat === "playoffs") {
        if (g.category) subs.add(g.category);
      } else {
        const parts = g.category?.split("-");
        if (parts && parts.length > 1) subs.add(parts[1].toLowerCase());
      }
    });
    return Array.from(subs).sort();
  }, [filteredByMain, selectedMainCat]);

  const availableJornadas = useMemo(() => {
    if (selectedMainCat === "playoffs") return [];
    const j = new Set<string>();
    filteredByMain.forEach((g) => {
      if (g.jornada) j.add(String(g.jornada));
    });
    return Array.from(j).sort((a, b) => parseInt(a) - parseInt(b));
  }, [filteredByMain, selectedMainCat]);

  const availableTeams = useMemo(() => {
    const t = new Set<string>();
    filteredByMain.forEach((g) => {
      if (g.home_team) t.add(g.home_team);
      if (g.away_team) t.add(g.away_team);
    });
    return Array.from(t).sort();
  }, [filteredByMain]);

  const finalFilteredGames = useMemo(() => {
    let filtered = filteredByMain;
    if (selectedSubCat !== "all") {
      filtered = filtered.filter((g) => {
        if (selectedMainCat === "playoffs") return g.category === selectedSubCat;
        const parts = g.category?.split("-");
        return parts && parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
      });
    }
    if (selectedJornada !== "all" && selectedMainCat !== "playoffs") {
      filtered = filtered.filter((g) => String(g.jornada) === selectedJornada);
    }
    if (selectedTeam !== "all") {
      filtered = filtered.filter((g) => g.home_team === selectedTeam || g.away_team === selectedTeam);
    }
    return filtered;
  }, [filteredByMain, selectedSubCat, selectedJornada, selectedTeam, selectedMainCat]);

  const groupedData = useMemo(() => {
    const groups: { [key: string]: any[] } = {};

    if (selectedMainCat === "playoffs") {
      finalFilteredGames.forEach((game) => {
        const stage = game.stage?.toLowerCase() || "";
        const key = stage.includes("comodin")
          ? "COMODINES"
          : stage.includes("semifinal")
            ? "SEMIFINALES"
            : "LA GRAN FINAL";
        if (!groups[key]) groups[key] = [];
        groups[key].push(game);
      });
      const order = ["COMODINES", "SEMIFINALES", "LA GRAN FINAL"];
      return Object.keys(groups)
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
        .map((title) => ({ title, data: groups[title] }));
    }

    finalFilteredGames.forEach((game) => {
      const jKey =
        selectedMainCat === "en_vivo" ? "JUGANDO AHORA" : game.jornada ? `JORNADA ${game.jornada}` : "POR DEFINIR";
      if (!groups[jKey]) groups[jKey] = [];
      groups[jKey].push(game);
    });

    return Object.keys(groups)
      .sort((a, b) => {
        if (a === "JUGANDO AHORA") return -1;
        const numA = parseInt(a.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.replace(/\D/g, "")) || 0;
        return numA - numB;
      })
      .map((jornada) => ({ title: jornada, data: groups[jornada] }));
  }, [finalFilteredGames, selectedMainCat]);

  const listRows = useMemo(
    () =>
      groupedData.flatMap((group) => [
        { key: `header-${group.title}`, kind: "header" as const, title: group.title },
        ...group.data.map((game) => ({ key: `game-${game.id}`, kind: "game" as const, game })),
      ]),
    [groupedData]
  );

  const openFilters = () => {
    setTempJornada(selectedJornada);
    setTempSubCat(selectedSubCat);
    setTempTeam(selectedTeam);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setSelectedJornada(tempJornada);
    setSelectedSubCat(tempSubCat);
    setSelectedTeam(tempTeam);
    setFilterModalVisible(false);
  };

  const FilterOption = ({ label, isSelected, onPress }: any) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterOptionModal,
        { backgroundColor: isSelected ? BRAND_GRADIENT[0] : currentColors.bgSecondary },
      ]}
    >
      <Text style={[styles.filterOptionTextModal, { color: isSelected ? "#FFFFFF" : currentColors.text }]}>
        {label}
      </Text>
    </Pressable>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.loading, { backgroundColor: screenBg }]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  const filterBar = (
    <View style={[styles.filterBar, softShadow, { backgroundColor: currentColors.card, borderColor: currentColors.borderLight }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillScroll}>
        {selectedMainCat !== "playoffs" && (
          <View style={[styles.filterPill, { backgroundColor: currentColors.bgSecondary }]}>
            <Ionicons name="calendar-outline" size={13} color={BRAND_GRADIENT[0]} />
            <Text style={[styles.filterPillText, { color: currentColors.text }]}>
              {selectedJornada === "all" ? "Jornadas" : `J${selectedJornada}`}
            </Text>
          </View>
        )}
        {selectedMainCat !== "all" && (
          <View style={[styles.filterPill, { backgroundColor: currentColors.bgSecondary }]}>
            <Ionicons name="layers-outline" size={13} color={BRAND_GRADIENT[0]} />
            <Text style={[styles.filterPillText, { color: currentColors.text }]}>
              {selectedSubCat === "all"
                ? selectedMainCat === "playoffs"
                  ? "Categoría"
                  : "Nivel"
                : selectedSubCat.toUpperCase()}
            </Text>
          </View>
        )}
        <View style={[styles.filterPill, { backgroundColor: currentColors.bgSecondary }]}>
          <Ionicons name="shield-outline" size={13} color={BRAND_GRADIENT[0]} />
          <Text style={[styles.filterPillText, { color: currentColors.text }]} numberOfLines={1}>
            {selectedTeam === "all" ? "Equipos" : selectedTeam}
          </Text>
        </View>
      </ScrollView>
      <TouchableOpacity style={[styles.adjustBtn, { backgroundColor: `${BRAND_GRADIENT[0]}14` }]} onPress={openFilters}>
        <Ionicons name="options-outline" size={18} color={BRAND_GRADIENT[0]} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10, backgroundColor: screenBg }]}>
        <View style={styles.contentWrapper}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: currentColors.text }]}>Partidos</Text>
            <Pressable
              onPress={() => refetch()}
              style={[styles.refreshBtn, { backgroundColor: currentColors.card }, softShadow]}
            >
              <Ionicons name="refresh" size={18} color={currentColors.textMuted} />
            </Pressable>
          </View>

          <SeasonSelector compact style={styles.seasonSelectorInline} />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.mainCatScroll, isTablet && { justifyContent: "center", flexGrow: 1 }]}
          >
            {MAIN_CATEGORIES.map((cat) => {
              const isActive = selectedMainCat === cat.id;
              const activeColor =
                cat.id === "en_vivo" ? "#EF4444" : cat.id === "playoffs" ? "#EAB308" : BRAND_GRADIENT[0];
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => selectMainCategory(cat.id)}
                  style={[
                    styles.mainChip,
                    softShadow,
                    {
                      backgroundColor: isActive ? activeColor : currentColors.card,
                      borderColor: currentColors.borderLight,
                    },
                  ]}
                >
                  {cat.id === "en_vivo" && isActive && <View style={styles.liveChipDot} />}
                  <Text style={[styles.mainChipText, { color: isActive ? "#FFF" : currentColors.textSecondary }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {selectedMainCat === "playoffs" && selectedSubCat !== "all" && finalFilteredGames.length > 0 ? (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />}
        >
          <View style={[styles.contentWrapper, { paddingHorizontal: 16, marginTop: 8 }]}>{filterBar}</View>
          <PlayoffsBracketView games={finalFilteredGames} teams={teams || []} currentColors={currentColors} />
          {finalFilteredGames
            .filter(
              (g) =>
                isChampionshipFinalStage(g.stage) &&
                ["finalizado", "final"].includes(g.status?.toLowerCase() ?? "")
            )
            .map((game) => (
              <View key={`champ-${game.id}`} style={{ paddingHorizontal: 16, marginTop: 12, paddingBottom: 40 }}>
                <MatchCard game={game} teams={teams || []} isPlayoffsMode />
              </View>
            ))}
        </ScrollView>
      ) : (
        <FlatList
          data={listRows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: isTablet ? insets.bottom + 100 : insets.bottom + 88 },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS !== "web"}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />}
          ListHeaderComponent={
            selectedMainCat !== "en_vivo" ? (
              <View style={[styles.contentWrapper, { marginBottom: 8 }]}>
                {selectedMainCat === "playoffs" && selectedSubCat === "all" && (
                  <View
                    style={[
                      styles.hintCard,
                      softShadow,
                      { backgroundColor: currentColors.card, borderColor: currentColors.borderLight },
                    ]}
                  >
                    <Ionicons name="information-circle-outline" size={18} color="#EAB308" />
                    <Text style={[styles.hintText, { color: currentColors.textSecondary }]}>
                      Elige una categoría en filtros para ver el árbol del torneo.
                    </Text>
                  </View>
                )}
                {filterBar}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.kind === "header") {
              return (
                <View style={[styles.jornadaHeader, styles.contentWrapper]}>
                  <Text
                    style={[
                      styles.jornadaTitle,
                      { color: currentColors.textMuted },
                      item.title === "JUGANDO AHORA" && { color: "#EF4444" },
                      item.title === "LA GRAN FINAL" && { color: "#EAB308" },
                    ]}
                  >
                    {item.title}
                  </Text>
                </View>
              );
            }
            return (
              <View style={styles.contentWrapper}>
                <MatchCard game={item.game} teams={teams || []} isPlayoffsMode={false} />
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={[styles.emptyState, styles.contentWrapper, softShadow, { backgroundColor: currentColors.card }]}>
              <Ionicons
                name={selectedMainCat === "playoffs" ? "trophy-outline" : "calendar-outline"}
                size={40}
                color={currentColors.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: currentColors.text }]}>
                {selectedMainCat === "playoffs" ? "Aún no hay llaves" : "Sin partidos"}
              </Text>
              <Text style={[styles.emptySub, { color: currentColors.textSecondary }]}>
                {selectedMainCat === "playoffs"
                  ? "Las llaves aparecerán cuando termine la temporada regular."
                  : "No hay partidos con estos filtros."}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: currentColors.bg },
              isTablet && {
                width: 500,
                alignSelf: "center",
                borderRadius: 28,
                marginBottom: "auto" as any,
                marginTop: "auto" as any,
                maxHeight: "85%",
              },
            ]}
          >
            <View style={styles.modalDragWrap}>
              <View style={[styles.modalDrag, { backgroundColor: currentColors.borderLight }]} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>Filtros</Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: currentColors.bgSecondary }]}
              >
                <Ionicons name="close" size={18} color={currentColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {selectedMainCat !== "playoffs" && (
                <>
                  <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>JORNADA</Text>
                  <View style={styles.filterGroup}>
                    <FilterOption label="Todas" isSelected={tempJornada === "all"} onPress={() => setTempJornada("all")} />
                    {availableJornadas.map((j) => (
                      <FilterOption
                        key={j}
                        label={`Jornada ${j}`}
                        isSelected={tempJornada === j}
                        onPress={() => setTempJornada(j)}
                      />
                    ))}
                  </View>
                </>
              )}

              {availableSubCats.length > 0 && (
                <>
                  <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>
                    {selectedMainCat === "playoffs" ? "CATEGORÍA" : "NIVEL"}
                  </Text>
                  <View style={styles.filterGroup}>
                    <FilterOption label="Todas" isSelected={tempSubCat === "all"} onPress={() => setTempSubCat("all")} />
                    {availableSubCats.map((sub) => (
                      <FilterOption
                        key={sub}
                        label={sub.toUpperCase()}
                        isSelected={tempSubCat === sub}
                        onPress={() => setTempSubCat(sub)}
                      />
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>EQUIPO</Text>
              <View style={styles.filterGroup}>
                <FilterOption label="Cualquiera" isSelected={tempTeam === "all"} onPress={() => setTempTeam("all")} />
                {availableTeams.map((t) => (
                  <FilterOption key={t} label={t} isSelected={tempTeam === t} onPress={() => setTempTeam(t)} />
                ))}
              </View>
            </ScrollView>

            <View
              style={[
                styles.modalFooter,
                { borderTopColor: currentColors.borderLight, backgroundColor: currentColors.card },
              ]}
            >
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setTempJornada("all");
                  setTempSubCat("all");
                  setTempTeam("all");
                }}
              >
                <Text style={[styles.resetBtnText, { color: currentColors.textSecondary }]}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <LinearGradient colors={BRAND_GRADIENT} style={styles.applyBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.applyBtnText}>Aplicar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  contentWrapper: { width: "100%", maxWidth: 800, alignSelf: "center" },

  topBar: { zIndex: 10, paddingBottom: 4 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.6 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  seasonSelectorInline: { paddingHorizontal: 20, marginBottom: 10 },

  mainCatScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 10 },
  mainChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  mainChipText: { fontSize: 13, fontWeight: "700" },
  liveChipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFF" },

  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    paddingLeft: 8,
    marginBottom: 8,
  },
  filterPillScroll: { alignItems: "center", gap: 8, paddingRight: 8 },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  filterPillText: { fontSize: 12, fontWeight: "700", maxWidth: 110 },
  adjustBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  hintCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  hintText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },

  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  jornadaHeader: { marginTop: 10, marginBottom: 12, paddingHorizontal: 4 },
  jornadaTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 1.1 },

  matchCard: {
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  liveAccent: { height: 3, backgroundColor: "#EF4444" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  statusText: { fontSize: 12, fontWeight: "800" },
  categoryText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  cardBody: { paddingHorizontal: 16, paddingBottom: 14 },
  vsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8, paddingLeft: 48 },
  vsLine: { flex: 1, height: StyleSheet.hairlineWidth },
  vsText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  teamRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  teamLogo: { width: "100%", height: "100%" },
  logoFallback: { fontSize: 12, fontWeight: "900" },
  teamName: { fontSize: 15, fontWeight: "700", flex: 1, paddingRight: 8 },
  scoreText: { fontSize: 22, fontWeight: "700", minWidth: 36, textAlign: "right" },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444", marginRight: 5 },
  liveBadgeText: { color: "#EF4444", fontSize: 10, fontWeight: "900" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: { fontSize: 11, fontWeight: "600", flex: 1 },

  championCard: {
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 2,
    padding: 24,
    alignItems: "center",
  },
  championTitle: { fontSize: 16, fontWeight: "900", marginBottom: 14, letterSpacing: 0.3 },
  championLogoContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  championTeamLogo: { width: "100%", height: "100%" },
  championTeamName: { fontSize: 22, fontWeight: "900", textAlign: "center", marginBottom: 6 },
  championScoreText: { fontSize: 13, fontWeight: "700" },

  bracketScrollContainer: { paddingHorizontal: 16, paddingVertical: 24 },
  bracketWrapper: { flexDirection: "row", alignItems: "flex-start" },
  bracketColumn: { width: 230, marginRight: 28, position: "relative", minHeight: 240 },
  bracketColumnTitle: { textAlign: "center", fontWeight: "800", fontSize: 11, letterSpacing: 1.2, marginBottom: 16 },
  bracketSlot: { justifyContent: "center", position: "relative", width: "100%" },
  bracketNode: { flex: 1, borderRadius: 14, overflow: "hidden" },
  bracketTeamRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10 },
  bracketTeamInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  bracketTeamLogo: { width: 22, height: 22, borderRadius: 11, marginRight: 8 },
  bracketTeamName: { fontSize: 12, flex: 1, fontWeight: "600" },
  bracketScore: { fontSize: 14, fontWeight: "700" },
  bracketDivider: { height: StyleSheet.hairlineWidth, width: "100%" },
  connectorHorizontal: { position: "absolute", right: -28, width: 28, height: 2, top: "50%" },
  connectorHorizontalLeft: { position: "absolute", left: -28, width: 28, height: 2, top: "50%" },
  connectorRightDown: {
    position: "absolute",
    right: -28,
    top: "50%",
    width: 28,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 8,
  },
  connectorRightUp: {
    position: "absolute",
    right: -28,
    bottom: "50%",
    width: 28,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 8,
  },

  emptyState: {
    alignItems: "center",
    marginTop: 40,
    paddingVertical: 48,
    borderRadius: 20,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: "center", paddingHorizontal: 32, lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, height: "82%" },
  modalDragWrap: { width: "100%", alignItems: "center", paddingTop: 12, paddingBottom: 4 },
  modalDrag: { width: 40, height: 4, borderRadius: 2 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: "900" },
  modalCloseBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  modalScroll: { paddingHorizontal: 22, paddingBottom: 32 },
  filterGroupTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginBottom: 12, marginTop: 8 },
  filterGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 22 },
  filterOptionModal: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  filterOptionTextModal: { fontSize: 13, fontWeight: "700" },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    alignItems: "center",
  },
  resetBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  resetBtnText: { fontSize: 14, fontWeight: "800" },
  applyBtn: { flex: 1, borderRadius: 16, overflow: "hidden" },
  applyBtnGradient: { paddingVertical: 14, alignItems: "center" },
  applyBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});
