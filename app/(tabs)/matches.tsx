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
  TouchableOpacity
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMatches } from "@/hooks/useMatches";
import { useTeams } from "@/hooks/useTeams";
import { BRAND_GRADIENT, Colors } from "@/constants/colors";
// IMPORTANTE: Importamos el Confeti
import ConfettiCannon from "react-native-confetti-cannon";

const MAIN_CATEGORIES = [
  { id: "all", label: "TODOS" },
  { id: "en_vivo", label: "🔴 EN VIVO" },
  { id: "playoffs", label: "🏆 PLAYOFFS" },
  { id: "varonil", label: "VARONIL" },
  { id: "femenil", label: "FEMENIL" },
  { id: "mixto", label: "MIXTO" },
  { id: "teens", label: "TEENS" },
];

// Función helper para saber si un stage es de playoffs (Nueva nomenclatura llave_...)
const isPlayoffStage = (stage: string | undefined | null) => {
  if (!stage) return false;
  return stage.toLowerCase().startsWith('llave_');
};

const FadeInView = ({ children, delay = 0 }: { children: any, delay?: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true })
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>{children}</Animated.View>;
};

const LivePulse = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />;
};

// --- COMPONENTE: TARJETA PEQUEÑA PARA EL BRACKET ---
const BracketNode = ({ game, teams, currentColors, isFinal = false, label }: any) => {
  const router = useRouter();
  
  if (!game) {
    return (
      <View style={[styles.bracketNode, { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: currentColors.borderLight, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: currentColors.textMuted, fontSize: 13, fontWeight: '900' }}>{label}</Text>
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
    <View style={[styles.bracketTeamRow, isWinner && { backgroundColor: `${BRAND_GRADIENT[0]}15` }]}>
      <View style={styles.bracketTeamInfo}>
        {teamData?.logo_url ? (
          <Image source={{ uri: teamData.logo_url }} style={styles.bracketTeamLogo} />
        ) : (
          <View style={[styles.bracketTeamLogo, { backgroundColor: currentColors.border, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: currentColors.textMuted }}>
              {teamName && teamName !== "Por definir" ? teamName.substring(0,2).toUpperCase() : "?"}
            </Text>
          </View>
        )}
        <Text style={[styles.bracketTeamName, { color: isWinner ? currentColors.text : currentColors.textSecondary }, isWinner && { fontWeight: 'bold' }]} numberOfLines={1}>
          {teamName || "Por definir"}
        </Text>
      </View>
      <Text style={[styles.bracketScore, { color: isWinner ? BRAND_GRADIENT[0] : currentColors.textSecondary }, isWinner && { fontWeight: 'bold' }]}>
        {score ?? "-"}
      </Text>
    </View>
  );

  return (
    <Pressable 
      onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
      style={[styles.bracketNode, { backgroundColor: currentColors.card, borderColor: isFinal ? '#FACC15' : currentColors.borderLight, borderWidth: isFinal ? 2 : 1 }]}
    >
      {renderTeam(game.home_team, homeTeam, game.home_score, homeWon)}
      <View style={[styles.bracketDivider, { backgroundColor: currentColors.borderLight }]} />
      {renderTeam(game.away_team, awayTeam, game.away_score, awayWon)}
    </Pressable>
  );
};

// --- ESTRUCTURA DE UN SOLO ÁRBOL DE TORNEO ---
const SingleBracketTree = ({ title, gamesList, currentColors, teams, isGold }: any) => {
  const comodinA = gamesList.find((g: any) => g.stage?.toLowerCase().endsWith('comodin_a'));
  const comodinB = gamesList.find((g: any) => g.stage?.toLowerCase().endsWith('comodin_b'));
  const semiA = gamesList.find((g: any) => g.stage?.toLowerCase().endsWith('semifinal_a'));
  const semiB = gamesList.find((g: any) => g.stage?.toLowerCase().endsWith('semifinal_b'));
  const final = gamesList.find((g: any) => g.stage?.toLowerCase().endsWith('final'));

  // Si no hay partidos en esta llave, no la renderizamos
  if (!comodinA && !comodinB && !semiA && !semiB && !final) return null;

  const SLOT_HEIGHT = 86;
  const SPACER_HEIGHT = 40;
  const CONNECTOR_HEIGHT = (SLOT_HEIGHT + SPACER_HEIGHT) / 2;

  return (
    <View style={{ marginBottom: 60 }}>
      <Text style={{ textAlign: 'center', fontSize: 22, fontWeight: '900', color: isGold ? '#EAB308' : '#94A3B8', marginBottom: 25, letterSpacing: 1.5 }}>{title}</Text>
      <View style={styles.bracketWrapper}>
        
        {/* COLUMNA 1: COMODINES */}
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

        {/* COLUMNA 2: SEMIFINALES */}
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

        {/* COLUMNA 3: FINAL */}
        <View style={styles.bracketColumn}>
          <Text style={[styles.bracketColumnTitle, { color: isGold ? '#EAB308' : '#94A3B8', position: 'absolute', top: 0, width: '100%' }]}>FINAL</Text>
          <View style={[styles.bracketSlot, { height: SLOT_HEIGHT, marginTop: CONNECTOR_HEIGHT }]}>
            <View style={[styles.connectorHorizontalLeft, { backgroundColor: currentColors.borderLight }]} />
            <BracketNode game={final} teams={teams} currentColors={currentColors} isFinal={true} label="Gran Final" />
          </View>
        </View>

      </View>
    </View>
  );
};

// --- CONTENEDOR PRINCIPAL QUE RENDERIZA LLAVE A Y LLAVE B ---
const PlayoffsBracketView = ({ games, teams, currentColors }: { games: any[], teams: any[], currentColors: any }) => {
  if (games.length === 0) return null;

  const llaveA = games.filter(g => g.stage?.toLowerCase().startsWith('llave_a'));
  const llaveB = games.filter(g => g.stage?.toLowerCase().startsWith('llave_b'));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bracketScrollContainer}>
      <View style={{ flexDirection: 'column' }}>
        <SingleBracketTree title="🏆 LLAVE A (ORO)" gamesList={llaveA} currentColors={currentColors} teams={teams} isGold={true} />
        <SingleBracketTree title="🥈 LLAVE B (PLATA)" gamesList={llaveB} currentColors={currentColors} teams={teams} isGold={false} />
      </View>
    </ScrollView>
  );
};

const MatchCard = ({ game, teams, isPlayoffsMode }: { game: any, teams: any[], isPlayoffsMode: boolean }) => {
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
  
  const isFinalStage = game.stage?.toLowerCase().includes('final');
  if (isPlayoffsMode && isFinalStage && isFinished && (homeWon || awayWon)) {
    const championTeam = homeWon ? homeTeam : awayTeam;
    const championName = homeWon ? game.home_team : game.away_team;
    const isLlaveA = game.stage?.toLowerCase().includes('llave_a');
    
    return (
      <View style={[styles.championCard, { backgroundColor: currentColors.card, borderColor: isLlaveA ? '#FACC15' : '#94A3B8' }]}>
        <ConfettiCannon count={150} origin={{x: -10, y: 0}} fallSpeed={2500} fadeOut colors={isLlaveA ? ['#FFD700', '#FFA500', '#FF8C00'] : ['#CBD5E1', '#94A3B8', '#E2E8F0']} />
        
        <View style={styles.championHeader}>
          <Ionicons name="trophy" size={32} color={isLlaveA ? "#FACC15" : "#94A3B8"} style={{ marginBottom: 10 }} />
          <Text style={[styles.championTitle, { color: currentColors.text }]}>¡CAMPEÓN {isLlaveA ? 'ORO' : 'PLATA'}!</Text>
        </View>

        <View style={[styles.championLogoContainer, { backgroundColor: currentColors.bgSecondary, borderColor: isLlaveA ? '#FACC15' : '#94A3B8' }]}>
          {championTeam?.logo_url ? (
            <Image source={{ uri: championTeam.logo_url }} style={styles.championTeamLogo} resizeMode="contain" />
          ) : (
            <Text style={[styles.logoFallback, { color: currentColors.textMuted, fontSize: 30 }]}>
              {championName?.substring(0,2).toUpperCase() || "?"}
            </Text>
          )}
        </View>
        
        <Text style={[styles.championTeamName, { color: currentColors.text }]}>{championName}</Text>
        
        <View style={styles.championScoreBadge}>
          <Text style={styles.championScoreText}>Marcador Final: {game.home_score} - {game.away_score}</Text>
        </View>
      </View>
    );
  }

  const TeamRow = ({ team, name, score, isWinner }: any) => (
    <View style={styles.teamRow}>
      <View style={styles.teamInfo}>
        <View style={[styles.logoContainer, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
          {team?.logo_url ? (
            <Image source={{ uri: team.logo_url }} style={styles.teamLogo} resizeMode="contain" />
          ) : (
            <Text style={[styles.logoFallback, { color: currentColors.textMuted }]}>{name?.substring(0,2).toUpperCase() || "?"}</Text>
          )}
        </View>
        <Text style={[styles.teamName, { color: isWinner || isLive ? currentColors.text : currentColors.textSecondary }, isWinner && styles.teamNameWinner]} numberOfLines={1}>
          {name || "Por definir"}
        </Text>
      </View>
      <View style={[styles.scoreBox, isWinner && { backgroundColor: `${BRAND_GRADIENT[0]}15`, borderColor: `${BRAND_GRADIENT[0]}30` }]}>
        <Text style={[styles.scoreText, { color: isWinner ? BRAND_GRADIENT[0] : currentColors.text }, isWinner && styles.scoreTextWinner]}>
          {score !== null && score !== undefined ? score : "-"}
        </Text>
      </View>
    </View>
  );

  // Helper para que se vea bonito el badge en PlayoffsMode
  const formatStageName = (stageStr: string) => {
    if (!stageStr) return "";
    let formatted = stageStr.replace(/llave_[ab]_/i, '').replace(/_/g, ' ').toUpperCase();
    if (formatted.includes('COMODIN')) formatted = formatted.replace('COMODIN', 'COMODÍN');
    return formatted;
  };

  return (
    <Pressable 
      onPress={() => router.push({ pathname: "/match/[id]", params: { id: game.id } })}
      style={[styles.matchCard, { backgroundColor: currentColors.card, borderColor: isPlayoffsMode ? '#3B82F6' : currentColors.border, shadowColor: theme === 'dark' ? '#000' : '#334155' }]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.statusBadgeWrap}>
          {isLive ? (
            <View style={styles.liveBadge}><LivePulse /><Text style={styles.liveBadgeText}>EN VIVO</Text></View>
          ) : (
            <Text style={[styles.statusText, { color: currentColors.textSecondary }]}>
              {isFinished ? "FINALIZADO" : game.game_time?.substring(0, 5) || "TBD"}
            </Text>
          )}
        </View>
        <Text style={[styles.categoryText, { color: BRAND_GRADIENT[0] }]}>
          {isPlayoffsMode ? formatStageName(game.stage) : `${game.category?.replace("-", " ").toUpperCase()} • J${game.jornada || "?"}`}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <TeamRow team={homeTeam} name={game.home_team} score={game.home_score} isWinner={homeWon} />
        <View style={styles.middleDividerContainer}>
          <View style={[styles.teamDivider, { backgroundColor: currentColors.border }]} />
          <Text style={[styles.vsText, { color: currentColors.textMuted, backgroundColor: currentColors.card }]}>VS</Text>
        </View>
        <TeamRow team={awayTeam} name={game.away_team} score={game.away_score} isWinner={awayWon} />
      </View>
    </Pressable>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { data: games, isLoading, refetch } = useMatches();
  const { data: teams } = useTeams();
  
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];
  const isDark = theme === "dark";

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

  useEffect(() => {
    setSelectedJornada("all");
    setSelectedSubCat("all");
    setSelectedTeam("all");
  }, [selectedMainCat]);

  const filteredByMain = useMemo(() => {
    if (!games) return [];
    if (selectedMainCat === "all") return games;
    if (selectedMainCat === "en_vivo") {
      return games.filter((g) => ["en vivo", "en_vivo", "live"].includes(g.status?.toLowerCase() || ""));
    }
    if (selectedMainCat === "playoffs") {
      return games.filter(g => isPlayoffStage(g.stage));
    }
    return games.filter((g) => 
      g.category?.toLowerCase().startsWith(selectedMainCat.toLowerCase()) && 
      !isPlayoffStage(g.stage)
    );
  }, [games, selectedMainCat]);

  const availableSubCats = useMemo(() => {
    if (selectedMainCat === "all" || selectedMainCat === "en_vivo") return [];
    const subs = new Set<string>();
    filteredByMain.forEach(g => {
      if (selectedMainCat === "playoffs") {
        if(g.category) subs.add(g.category); 
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
    filteredByMain.forEach(g => { if (g.jornada) j.add(String(g.jornada)); });
    return Array.from(j).sort((a, b) => parseInt(a) - parseInt(b));
  }, [filteredByMain, selectedMainCat]);

  const availableTeams = useMemo(() => {
    const t = new Set<string>();
    filteredByMain.forEach(g => {
      if (g.home_team) t.add(g.home_team);
      if (g.away_team) t.add(g.away_team);
    });
    return Array.from(t).sort();
  }, [filteredByMain]);

  const finalFilteredGames = useMemo(() => {
    let filtered = filteredByMain;
    
    if (selectedSubCat !== "all") {
      filtered = filtered.filter(g => {
        if (selectedMainCat === "playoffs") return g.category === selectedSubCat;
        const parts = g.category?.split("-");
        return parts && parts.length > 1 && parts[1].toLowerCase() === selectedSubCat.toLowerCase();
      });
    }
    if (selectedJornada !== "all" && selectedMainCat !== "playoffs") {
      filtered = filtered.filter(g => String(g.jornada) === selectedJornada);
    }
    if (selectedTeam !== "all") {
      filtered = filtered.filter(g => g.home_team === selectedTeam || g.away_team === selectedTeam);
    }
    
    return filtered;
  }, [filteredByMain, selectedSubCat, selectedJornada, selectedTeam, selectedMainCat]);

  const groupedData = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    
    if (selectedMainCat === "playoffs") {
       finalFilteredGames.forEach(game => {
         const stage = game.stage?.toLowerCase() || "";
         const key = stage.includes('comodin') ? 'COMODINES' : (stage.includes('semifinal') ? 'SEMIFINALES' : 'LA GRAN FINAL');
         if (!groups[key]) groups[key] = [];
         groups[key].push(game);
       });
       const order = ['COMODINES', 'SEMIFINALES', 'LA GRAN FINAL'];
       return Object.keys(groups)
         .sort((a, b) => order.indexOf(a) - order.indexOf(b))
         .map(title => ({ title, data: groups[title] }));
    }

    finalFilteredGames.forEach((game) => {
      const jKey = selectedMainCat === "en_vivo" ? "JUGANDO AHORA" : (game.jornada ? `JORNADA ${game.jornada}` : "POR DEFINIR");
      if (!groups[jKey]) groups[jKey] = [];
      groups[jKey].push(game);
    });

    return Object.keys(groups).sort((a, b) => {
        if (a === "JUGANDO AHORA") return -1; 
        const numA = parseInt(a.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.replace(/\D/g, "")) || 0;
        return numA - numB;
    }).map(jornada => ({ title: jornada, data: groups[jornada] }));
  }, [finalFilteredGames, selectedMainCat]);

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
      style={[styles.filterOptionModal, { backgroundColor: isSelected ? BRAND_GRADIENT[0] : currentColors.bgSecondary, borderColor: isSelected ? 'transparent' : currentColors.borderLight }]}
    >
      <Text style={[styles.filterOptionTextModal, { color: isSelected ? '#FFFFFF' : currentColors.text }]}>{label}</Text>
    </Pressable>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.loading, { backgroundColor: currentColors.bg }]}>
        <ActivityIndicator size="large" color={BRAND_GRADIENT[0]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      
      {/* --- HEADER Y TABS PRINCIPALES --- */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10, backgroundColor: currentColors.card, borderBottomColor: currentColors.border, shadowColor: isDark ? '#000' : '#0F172A' }]}>
        <View style={styles.contentWrapper}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: currentColors.text }]}>Partidos</Text>
            <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={20} color={currentColors.textMuted} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.mainCategoryScroll, isTablet && { justifyContent: "center", flexGrow: 1 }]}>
            {MAIN_CATEGORIES.map((cat) => {
              const isActive = selectedMainCat === cat.id;
              const isPlayoffs = cat.id === "playoffs";
              return (
                <Pressable key={cat.id} style={[styles.mainTab, isActive && styles.mainTabActive]} onPress={() => setSelectedMainCat(cat.id)}>
                  <Text style={[styles.mainTabText, { color: currentColors.textMuted }, isActive && styles.mainTabTextActive, cat.id === "en_vivo" && {color: isActive ? "#EF4444" : (isDark ? '#991B1B' : '#FCA5A5')}, isPlayoffs && isActive && {color: '#EAB308'}]}>
                    {cat.label}
                  </Text>
                  {isActive && <View style={[styles.activeIndicator, cat.id === "en_vivo" && {backgroundColor: "#EF4444"}, isPlayoffs && {backgroundColor: '#EAB308'}]} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* --- CONTENIDO PRINCIPAL: BRACKET O LISTA REGULAR --- */}
      {selectedMainCat === "playoffs" && selectedSubCat !== "all" && finalFilteredGames.length > 0 ? (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />}>
           <View style={[styles.contentWrapper, { marginTop: 15 }]}>
              <BlurView intensity={isDark ? 40 : 80} tint={isDark ? "dark" : "light"} style={[styles.glassFilterBox, { borderColor: currentColors.borderLight, backgroundColor: isDark ? 'rgba(30,41,59,0.4)' : 'rgba(255,255,255,0.6)', marginHorizontal: 20 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillScroll}>
                  <View style={[styles.filterPill, { backgroundColor: currentColors.card }]}>
                    <Ionicons name="trophy-outline" size={14} color={BRAND_GRADIENT[0]} />
                    <Text style={[styles.filterPillText, { color: currentColors.text }]}>
                      {selectedSubCat === "all" ? "Selecciona Categoría" : selectedSubCat.toUpperCase()}
                    </Text>
                  </View>
                </ScrollView>
                <TouchableOpacity style={styles.adjustBtn} onPress={openFilters}>
                  <Ionicons name="options" size={20} color={BRAND_GRADIENT[0]} />
                </TouchableOpacity>
              </BlurView>
            </View>

           <PlayoffsBracketView games={finalFilteredGames} teams={teams || []} currentColors={currentColors} />
           
           {finalFilteredGames.filter(g => g.stage?.includes('final') && ["finalizado", "final"].includes(g.status?.toLowerCase() ?? "")).map(game => (
               <View key={`champ-${game.id}`} style={{ paddingHorizontal: 20, marginTop: 20, paddingBottom: 40 }}>
                 <MatchCard game={game} teams={teams || []} isPlayoffsMode={true} />
               </View>
           ))}
        </ScrollView>
      ) : (
        // LISTA REGULAR PARA TEMPORADA O CUANDO NO HAY SUBCAT EN PLAYOFFS
        <FlatList
          data={groupedData}
          keyExtractor={(item) => item.title}
          contentContainerStyle={[styles.listContent, { paddingBottom: isTablet ? insets.bottom + 100 : insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GRADIENT[0]} />}
          
          ListHeaderComponent={
            selectedMainCat !== "en_vivo" ? (
              <View style={[styles.contentWrapper, { marginBottom: 15 }]}>
                {selectedMainCat === "playoffs" && selectedSubCat === "all" && (
                   <View style={{ padding: 15, backgroundColor: '#FEF9C3', borderRadius: 12, marginBottom: 15, marginHorizontal: 20 }}>
                     <Text style={{ color: '#854D0E', textAlign: 'center', fontWeight: 'bold' }}>
                        Selecciona una Categoría en los filtros (icono de opciones) para ver el Árbol del Torneo.
                     </Text>
                   </View>
                )}
                <BlurView intensity={isDark ? 40 : 80} tint={isDark ? "dark" : "light"} style={[styles.glassFilterBox, { borderColor: currentColors.borderLight, backgroundColor: isDark ? 'rgba(30,41,59,0.4)' : 'rgba(255,255,255,0.6)' }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillScroll}>
                    
                    {selectedMainCat !== "playoffs" && (
                      <View style={[styles.filterPill, { backgroundColor: currentColors.card }]}>
                        <Ionicons name="calendar-outline" size={14} color={BRAND_GRADIENT[0]} />
                        <Text style={[styles.filterPillText, { color: currentColors.text }]}>{selectedJornada === "all" ? "Jornadas" : `Jornada ${selectedJornada}`}</Text>
                      </View>
                    )}

                    {selectedMainCat !== "all" && (
                      <View style={[styles.filterPill, { backgroundColor: currentColors.card }]}>
                        <Ionicons name="trophy-outline" size={14} color={BRAND_GRADIENT[0]} />
                        <Text style={[styles.filterPillText, { color: currentColors.text }]}>
                          {selectedSubCat === "all" ? (selectedMainCat === "playoffs" ? "Categoría" : "Nivel") : selectedSubCat.toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View style={[styles.filterPill, { backgroundColor: currentColors.card }]}>
                      <Ionicons name="shield-outline" size={14} color={BRAND_GRADIENT[0]} />
                      <Text style={[styles.filterPillText, { color: currentColors.text }]} numberOfLines={1} ellipsizeMode="tail">
                        {selectedTeam === "all" ? "Equipos" : selectedTeam}
                      </Text>
                    </View>

                  </ScrollView>
                  <TouchableOpacity style={styles.adjustBtn} onPress={openFilters}>
                    <Ionicons name="options" size={20} color={BRAND_GRADIENT[0]} />
                  </TouchableOpacity>
                </BlurView>
              </View>
            ) : null
          }

          renderItem={({ item, index }) => (
            <View style={[styles.jornadaSection, styles.contentWrapper]}>
              <FadeInView delay={index * 100}>
                <View style={styles.jornadaHeader}>
                  <Text style={[styles.jornadaTitle, { color: currentColors.textSecondary }, item.title === "JUGANDO AHORA" && {color: "#EF4444"}, item.title === "LA GRAN FINAL" && {color: '#EAB308'}]}>
                    {item.title}
                  </Text>
                  <View style={[styles.line, { backgroundColor: currentColors.border }]} />
                </View>
                {item.data.map((game) => (
                  <MatchCard key={game.id} game={game} teams={teams || []} isPlayoffsMode={selectedMainCat === "playoffs"} />
                ))}
              </FadeInView>
            </View>
          )}

          ListEmptyComponent={
            <View style={[styles.emptyState, styles.contentWrapper]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: currentColors.bgSecondary }]}>
                <Ionicons name={selectedMainCat === "playoffs" ? "trophy-outline" : "calendar-clear-outline"} size={40} color={BRAND_GRADIENT[0]} />
              </View>
              <Text style={[styles.emptyTitle, { color: currentColors.text }]}>
                {selectedMainCat === "playoffs" ? "Aún no hay llaves generadas" : "Sin partidos"}
              </Text>
              <Text style={[styles.emptySub, { color: currentColors.textSecondary }]}>
                {selectedMainCat === "playoffs" 
                  ? "Las llaves de playoffs aparecerán aquí una vez que termine la temporada regular." 
                  : "No encontramos partidos con los filtros que seleccionaste."}
              </Text>
            </View>
          }
        />
      )}

      {/* --- MODAL DE FILTROS AVANZADOS --- */}
      <Modal visible={isFilterModalVisible} animationType="slide" transparent={true} onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.bg }, isTablet && { width: 500, alignSelf: 'center', borderRadius: 32, marginBottom: 'auto', marginTop: 'auto', maxHeight: '85%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currentColors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>Filtros de Partidos</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={[styles.modalCloseBtn, { backgroundColor: currentColors.bgSecondary }]}>
                <Ionicons name="close" size={20} color={currentColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              
              {selectedMainCat !== "playoffs" && (
                <>
                  <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>JORNADA</Text>
                  <View style={styles.filterGroup}>
                    <FilterOption label="Todas las Jornadas" isSelected={tempJornada === "all"} onPress={() => setTempJornada("all")} currentColors={currentColors} />
                    {availableJornadas.map(j => (
                      <FilterOption key={j} label={`Jornada ${j}`} isSelected={tempJornada === j} onPress={() => setTempJornada(j)} currentColors={currentColors} />
                    ))}
                  </View>
                </>
              )}

              {availableSubCats.length > 0 && (
                <>
                  <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>
                    {selectedMainCat === "playoffs" ? "CATEGORÍA DEL TORNEO" : "NIVEL / SUBCATEGORÍA"}
                  </Text>
                  <View style={styles.filterGroup}>
                    <FilterOption label="Todas" isSelected={tempSubCat === "all"} onPress={() => setTempSubCat("all")} currentColors={currentColors} />
                    {availableSubCats.map(sub => (
                      <FilterOption key={sub} label={sub.toUpperCase()} isSelected={tempSubCat === sub} onPress={() => setTempSubCat(sub)} currentColors={currentColors} />
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.filterGroupTitle, { color: currentColors.textMuted }]}>EQUIPO</Text>
              <View style={styles.filterGroup}>
                <FilterOption label="Cualquier Equipo" isSelected={tempTeam === "all"} onPress={() => setTempTeam("all")} currentColors={currentColors} />
                {availableTeams.map(t => (
                  <FilterOption key={t} label={t} isSelected={tempTeam === t} onPress={() => setTempTeam(t)} currentColors={currentColors} />
                ))}
              </View>

            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: currentColors.borderLight, backgroundColor: currentColors.card }]}>
              <TouchableOpacity style={styles.resetBtn} onPress={() => { setTempJornada("all"); setTempSubCat("all"); setTempTeam("all"); }}>
                <Text style={[styles.resetBtnText, { color: currentColors.textSecondary }]}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <LinearGradient colors={[BRAND_GRADIENT[0], BRAND_GRADIENT[1]]} style={styles.applyBtnGradient}>
                  <Text style={styles.applyBtnText}>Aplicar Filtros</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  contentWrapper: { width: "100%", maxWidth: 800, alignSelf: "center" },

  topBar: { borderBottomWidth: 1, zIndex: 10, elevation: 4, shadowOpacity: 0.05, shadowRadius: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 10 },
  headerTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  refreshBtn: { padding: 8, backgroundColor: 'rgba(150,150,150,0.1)', borderRadius: 12 },

  mainCategoryScroll: { paddingHorizontal: 20, paddingBottom: 10, gap: 20 },
  mainTab: { paddingVertical: 8, position: "relative", alignItems: "center" },
  mainTabActive: {},
  mainTabText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  mainTabTextActive: { color: BRAND_GRADIENT[0] },
  activeIndicator: { position: "absolute", bottom: -10, width: "100%", height: 3, backgroundColor: BRAND_GRADIENT[0], borderRadius: 2 },

  glassFilterBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, padding: 6, paddingLeft: 8, borderWidth: 1, overflow: 'hidden' },
  filterPillScroll: { alignItems: 'center', gap: 8, paddingRight: 10 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, elevation: 2, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  filterPillText: { fontSize: 12, fontWeight: '800', maxWidth: 120 },
  adjustBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: `${BRAND_GRADIENT[0]}15` },

  listContent: { paddingHorizontal: 20, paddingTop: 20 },
  jornadaSection: { marginBottom: 25 },
  jornadaHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  jornadaTitle: { fontSize: 13, fontWeight: "900", letterSpacing: 1.5, textTransform: 'uppercase' },
  line: { flex: 1, height: 1, opacity: 0.5 },

  // TARJETAS
  matchCard: { borderRadius: 28, marginBottom: 16, borderWidth: 1, overflow: 'hidden', elevation: 3, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
  statusBadgeWrap: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  categoryText: { fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  cardBody: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  middleDividerContainer: { flexDirection: 'row', alignItems: 'center', paddingLeft: 50, paddingRight: 10, marginVertical: -2 },
  teamDivider: { flex: 1, height: 1, opacity: 0.5 },
  vsText: { fontSize: 10, fontWeight: '900', paddingHorizontal: 8, letterSpacing: 1 },
  teamRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teamInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  logoContainer: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden", marginRight: 14 },
  teamLogo: { width: "100%", height: "100%" },
  logoFallback: { fontSize: 14, fontWeight: "900" },
  teamName: { fontSize: 17, fontWeight: "700", flex: 1, paddingRight: 10, letterSpacing: -0.3 },
  teamNameWinner: { fontWeight: "900" },
  scoreBox: { minWidth: 46, paddingVertical: 6, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  scoreText: { fontSize: 22, fontWeight: "700" },
  scoreTextWinner: { fontSize: 24, fontWeight: "900" },
  liveBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#FEF2F2' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444", marginRight: 6 },
  liveBadgeText: { color: "#EF4444", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },

  // TARJETA DE CAMPEON 
  championCard: { borderRadius: 32, marginBottom: 16, borderWidth: 3, padding: 30, alignItems: 'center', overflow: 'hidden', elevation: 8, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15 },
  championHeader: { alignItems: 'center', marginBottom: 20 },
  championTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  championLogoContainer: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 15, overflow: 'hidden', elevation: 5 },
  championTeamLogo: { width: "100%", height: "100%" },
  championTeamName: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 15 },
  championScoreBadge: { backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  championScoreText: { fontSize: 14, fontWeight: '800', color: '#6B7280' },

  // --- NUEVOS ESTILOS PARA BRACKET HORIZONTAL MÓVIL ---
  bracketScrollContainer: { paddingHorizontal: 20, paddingVertical: 30 },
  bracketWrapper: { flexDirection: 'row', alignItems: 'flex-start' },
  bracketColumn: { width: 240, marginRight: 30, position: 'relative', minHeight: 250 },
  bracketColumnTitle: { textAlign: 'center', fontWeight: '900', fontSize: 13, letterSpacing: 1.5, marginBottom: 20 },
  bracketSlot: { justifyContent: 'center', position: 'relative', width: '100%' },
  bracketNode: { flex: 1, borderRadius: 12, overflow: 'hidden', elevation: 2, shadowOffset: {width: 0, height:2}, shadowOpacity:0.05, shadowRadius: 4 },
  bracketTeamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 },
  bracketTeamInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bracketTeamLogo: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  bracketTeamName: { fontSize: 13, flex: 1 },
  bracketScore: { fontSize: 14 },
  bracketDivider: { height: 1, width: '100%' },
  
  connectorHorizontal: { position: 'absolute', right: -30, width: 30, height: 2, top: '50%' },
  connectorHorizontalLeft: { position: 'absolute', left: -30, width: 30, height: 2, top: '50%' },
  connectorRightDown: { position: 'absolute', right: -30, top: '50%', width: 30, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 8 },
  connectorRightUp: { position: 'absolute', right: -30, bottom: '50%', width: 30, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 8 },

  emptyState: { alignItems: "center", marginTop: 60, paddingVertical: 40, borderRadius: 32, borderWidth: 1, borderStyle: "dashed", borderColor: 'rgba(150,150,150,0.3)' },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 15 },
  emptyTitle: { fontSize: 18, fontWeight: "900", marginBottom: 8, textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", paddingHorizontal: 40, lineHeight: 22 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 22, borderBottomWidth: 1 },
  modalTitle: { fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  modalCloseBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { padding: 24, paddingBottom: 40 },
  filterGroupTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 14, marginTop: 10, textTransform: 'uppercase' },
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  filterOptionModal: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  filterOptionTextModal: { fontSize: 13, fontWeight: '800' },
  modalFooter: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, paddingBottom: 40, alignItems: 'center' },
  resetBtn: { paddingVertical: 14, paddingHorizontal: 20, justifyContent: 'center' },
  resetBtnText: { fontSize: 14, fontWeight: '800' },
  applyBtn: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  applyBtnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }
});