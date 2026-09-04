import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Image,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

/** Placeholders — reemplaza las rutas si mueves los archivos */
const LOGO_LEFT = require("@/assets/images/brands/logo-fad.png");
const LOGO_CENTER = require("@/assets/images/brands/logo-flag-durango.png");
const LOGO_RIGHT = require("@/assets/images/brands/logo-fmfa.png");

interface PlayerStats {
  touchdowns: number;
  pases: number;
  intercepciones: number;
  sacks: number;
  mvps: number;
}

interface CredentialProps {
  playerName: string;
  playerNumber: string;
  position: string;
  team: string;
  category?: string;
  photoUrl: string;
  portraitUrl?: string;
  stats: PlayerStats;
}

export default function PlayerCredentialCard({
  playerName,
  playerNumber,
  position,
  team,
  category,
  photoUrl,
  portraitUrl,
  stats,
}: CredentialProps) {
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<View>(null);

  const flipCard = () => {
    Animated.spring(flipAnimation, {
      toValue: isFlipped ? 0 : 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const frontAnimatedStyle = { transform: [{ rotateY: frontInterpolate }] };
  const backAnimatedStyle = { transform: [{ rotateY: backInterpolate }] };

  const photoSource =
    photoUrl && !photoUrl.startsWith("blob:")
      ? { uri: photoUrl }
      : require("@/assets/images/icon.png");
  const portraitSource =
    portraitUrl && !portraitUrl.startsWith("blob:")
      ? { uri: portraitUrl }
      : photoSource;

  const categoryLabel = (category || position || "JUGADOR")
    .replace(/-/g, " ")
    .toUpperCase();

  const handleSaveCredential = async () => {
    try {
      if (isFlipped) flipCard();
      setTimeout(
        async () => {
          const uri = await captureRef(cardRef, { format: "png", quality: 1 });
          const available = await Sharing.isAvailableAsync();
          if (available) {
            await Sharing.shareAsync(uri, {
              mimeType: "image/png",
              dialogTitle: `Credencial de ${playerName}`,
              UTI: "public.png",
            });
          } else {
            Alert.alert("Error", "Compartir no está disponible en este dispositivo.");
          }
        },
        isFlipped ? 500 : 0
      );
    } catch {
      Alert.alert("Error", "No se pudo generar la credencial.");
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.captureBox} ref={cardRef} collapsable={false}>
        <TouchableWithoutFeedback onPress={flipCard}>
          <View style={styles.cardStage}>
            {/* ——— FRENTE ——— */}
            <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
              <LinearGradient
                colors={["#0B1B3A", "#122B5C", "#1E5DBB"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardShell}
              >
                {/* Brillo glass */}
                <LinearGradient
                  colors={["rgba(255,255,255,0.18)", "transparent", "rgba(224,90,166,0.12)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />

                {/* Header logos */}
                <View style={styles.logoRow}>
                  <Image source={LOGO_LEFT} style={styles.logoSide} resizeMode="contain" />
                  <Image source={LOGO_CENTER} style={styles.logoCenter} resizeMode="contain" />
                  <Image source={LOGO_RIGHT} style={styles.logoSide} resizeMode="contain" />
                </View>

                <View style={styles.divider} />

                {/* Cuerpo jugador */}
                <View style={styles.body}>
                  <View style={styles.avatarRing}>
                    <Image source={portraitSource} style={styles.avatar} />
                  </View>

                  <Text style={styles.badge}>CREDENCIAL OFICIAL</Text>
                  <Text style={styles.playerName} numberOfLines={2} adjustsFontSizeToFit>
                    {playerName}
                  </Text>

                  <View style={styles.jerseyPill}>
                    <Text style={styles.jerseyHash}>#</Text>
                    <Text style={styles.jerseyNum}>{playerNumber || "00"}</Text>
                  </View>

                  <View style={styles.metaBlock}>
                    <View style={styles.metaItem}>
                      <Ionicons name="shield-checkmark" size={14} color="#93C5FD" />
                      <Text style={styles.metaLabel}>EQUIPO</Text>
                      <Text style={styles.metaValue} numberOfLines={1}>
                        {team}
                      </Text>
                    </View>
                    <View style={styles.metaSep} />
                    <View style={styles.metaItem}>
                      <Ionicons name="ribbon" size={14} color="#F9A8D4" />
                      <Text style={styles.metaLabel}>CATEGORÍA</Text>
                      <Text style={styles.metaValue} numberOfLines={1}>
                        {categoryLabel}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.flipHint}>Toca para ver estadísticas</Text>
                </View>

                {/* Franja marca inferior */}
                <LinearGradient
                  colors={["#1E5DBB", "#E05AA6", "#FF6B1A"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.brandStripe}
                />
              </LinearGradient>
            </Animated.View>

            {/* ——— REVERSO ——— */}
            <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}>
              <LinearGradient
                colors={["#0A1224", "#152445", "#1A3A6E"]}
                style={styles.cardShell}
              >
                <Image source={LOGO_CENTER} style={styles.backLogo} resizeMode="contain" />
                <Text style={styles.backTitle}>TEMPORADA</Text>
                <Text style={styles.backSub}>PASSPORT · FLAG DURANGO</Text>

                <View style={styles.statsGlass}>
                  {(
                    [
                      ["ANOTACIONES (TD)", stats.touchdowns],
                      ["PASES QB", stats.pases],
                      ["INTERCEPCIONES", stats.intercepciones],
                      ["SACKS", stats.sacks],
                    ] as const
                  ).map(([label, value]) => (
                    <View key={label} style={styles.statRow}>
                      <Text style={styles.statLabel}>{label}</Text>
                      <Text style={styles.statValue}>{value}</Text>
                    </View>
                  ))}
                  <View style={[styles.statRow, styles.statRowMvp]}>
                    <Text style={[styles.statLabel, { color: "#FCD34D" }]}>PREMIOS MVP</Text>
                    <Text style={[styles.statValue, { color: "#FCD34D" }]}>
                      <Ionicons name="trophy" size={14} color="#FCD34D" /> {stats.mvps}
                    </Text>
                  </View>
                </View>

                <View style={styles.verified}>
                  <Ionicons name="shield-checkmark" size={14} color="#0F172A" />
                  <Text style={styles.verifiedText}>AUTÉNTICO Y VERIFICADO</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </View>

      <Pressable style={styles.shareBtn} onPress={handleSaveCredential}>
        <LinearGradient
          colors={["#1E5DBB", "#E05AA6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shareBtnInner}
        >
          <Ionicons name="share-social-outline" size={18} color="#FFF" />
          <Text style={styles.shareBtnText}>GUARDAR / COMPARTIR</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const CARD_W = 320;
const CARD_H = 460;

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", width: "100%" },
  captureBox: { alignItems: "center", backgroundColor: "transparent" },
  cardStage: {
    width: CARD_W,
    height: CARD_H,
  },
  cardFace: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#0B1B3A",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  cardBack: {},
  cardShell: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },

  logoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    minHeight: 52,
  },
  logoSide: { width: 48, height: 48 },
  logoCenter: { width: 78, height: 56 },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginTop: 10,
    marginBottom: 18,
  },

  body: { flex: 1, alignItems: "center" },

  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    padding: 3,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  avatar: { width: "100%", height: "100%", borderRadius: 52 },

  badge: {
    color: "rgba(147,197,253,0.95)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.4,
    paddingHorizontal: 8,
    textTransform: "uppercase",
  },

  jerseyPill: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 10,
    marginBottom: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 999,
  },
  jerseyHash: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontWeight: "800",
    marginRight: 2,
    marginBottom: 2,
  },
  jerseyNum: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
    fontStyle: "italic",
  },

  metaBlock: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  metaItem: { flex: 1, alignItems: "center", gap: 3 },
  metaSep: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 4,
  },
  metaLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  metaValue: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: 4,
  },

  flipHint: {
    marginTop: "auto",
    marginBottom: 14,
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  brandStripe: { height: 5, width: "100%" },

  backLogo: { width: 72, height: 52, alignSelf: "center", marginTop: 8, marginBottom: 12 },
  backTitle: {
    color: "#93C5FD",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 2,
  },
  backSub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 1.5,
    marginBottom: 22,
    fontWeight: "700",
  },
  statsGlass: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  statRowMvp: { borderBottomWidth: 0, backgroundColor: "rgba(245,158,11,0.1)" },
  statLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  statValue: { color: "#FFF", fontSize: 16, fontWeight: "900" },

  verified: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    marginTop: "auto",
    marginBottom: 22,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  verifiedText: { color: "#0F172A", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },

  shareBtn: {
    marginTop: 18,
    width: CARD_W * 0.92,
    borderRadius: 28,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#1E5DBB",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  shareBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  shareBtnText: { color: "#FFF", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
});
