import React from "react";
import { View, StyleSheet, ActivityIndicator, useColorScheme } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

interface TeamLogoProps {
  logoUrl: string | null | undefined;
  size?: number;
  color?: string | null;
}

export function TeamLogo({ logoUrl, size = 48, color }: TeamLogoProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  const bgColor = color || currentColors.card;

  if (!logoUrl || error) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
          },
        ]}
      >
        <Ionicons
          name="american-football"
          size={size * 0.52}
          color={currentColors.textSecondary}
        />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      {loading && (
        <View
          style={[
            styles.loadingContainer,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: bgColor,
            },
          ]}
        >
          <ActivityIndicator size="small" color={currentColors.textSecondary} />
        </View>
      )}
      <Image
        source={{ uri: logoUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: loading ? 0 : 1,
        }}
        contentFit="contain"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        cachePolicy="memory-disk"
        transition={300}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
});
