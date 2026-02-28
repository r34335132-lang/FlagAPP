import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import C from "@/constants/colors";

interface LiveBadgeProps {
  status: string | null | undefined;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; pulse: boolean }> = {
  "en vivo": { label: "EN VIVO", bg: C.live, text: "#fff", pulse: true },
  "live": { label: "EN VIVO", bg: C.live, text: "#fff", pulse: true },
  "finalizado": { label: "FINAL", bg: C.textMuted, text: "#fff", pulse: false },
  "final": { label: "FINAL", bg: C.textMuted, text: "#fff", pulse: false },
  "programado": { label: "HOY", bg: C.blue, text: "#fff", pulse: false },
  "scheduled": { label: "HOY", bg: C.blue, text: "#fff", pulse: false },
};

export function LiveBadge({ status }: LiveBadgeProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const normalized = status?.toLowerCase() ?? "";
  const config = STATUS_CONFIG[normalized] ?? {
    label: status?.toUpperCase() ?? "PROGRAMADO",
    bg: C.cardLight,
    text: C.textSecondary,
    pulse: false,
  };

  useEffect(() => {
    if (!config.pulse) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [config.pulse]);

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      {config.pulse && (
        <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
      )}
      <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
