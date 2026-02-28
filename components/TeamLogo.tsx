import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import C from "@/constants/colors";

interface TeamLogoProps {
  logoUrl: string | null | undefined;
  size?: number;
  color?: string | null;
}

export function TeamLogo({ logoUrl, size = 48, color }: TeamLogoProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const bgColor = color || C.card;

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
        <MaterialCommunityIcons
          name="shield-half-full"
          size={size * 0.55}
          color={C.textSecondary}
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
          <ActivityIndicator size="small" color={C.textSecondary} />
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
