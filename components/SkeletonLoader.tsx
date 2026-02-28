import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, ViewStyle } from "react-native";
import C from "@/constants/colors";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: C.cardLight, opacity },
        style,
      ]}
    />
  );
}

export function MatchCardSkeleton() {
  return (
    <View style={skeletonStyles.matchCard}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={skeletonStyles.matchMiddle}>
        <Skeleton width={60} height={28} borderRadius={6} />
        <Skeleton width={80} height={12} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={40} height={40} borderRadius={20} />
    </View>
  );
}

export function TeamCardSkeleton() {
  return (
    <View style={skeletonStyles.teamCard}>
      <Skeleton width={56} height={56} borderRadius={28} />
      <View style={{ flex: 1, gap: 8, marginLeft: 12 }}>
        <Skeleton width="70%" height={16} borderRadius={4} />
        <Skeleton width="40%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export function StatsRowSkeleton() {
  return (
    <View style={skeletonStyles.statsRow}>
      <Skeleton width={24} height={14} borderRadius={4} />
      <Skeleton width={120} height={14} borderRadius={4} style={{ flex: 1, marginHorizontal: 12 }} />
      <Skeleton width={30} height={14} borderRadius={4} />
      <Skeleton width={30} height={14} borderRadius={4} style={{ marginLeft: 8 }} />
      <Skeleton width={30} height={14} borderRadius={4} style={{ marginLeft: 8 }} />
      <Skeleton width={30} height={14} borderRadius={4} style={{ marginLeft: 8 }} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    width: 280,
  },
  matchMiddle: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 4,
  },
});
