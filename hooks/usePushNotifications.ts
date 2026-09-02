import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const API_BASE = "https://www.flagdurango.com.mx/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(async (token) => {
        if (!token) return;

        setExpoPushToken(token);

        const sessionData = await AsyncStorage.getItem("userSession");
        if (sessionData) {
          const user = JSON.parse(sessionData);
          await saveTokenToDatabase(user.id, token);
        }
      })
      .catch((error) => {
        console.warn("Push notifications no disponibles en este entorno:", error);
      });

    const notificationListener = Notifications.addNotificationReceivedListener((receivedNotification) => {
      setNotification(receivedNotification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Notificacion tocada:", response);
    });

    return () => {
      notificationListener?.remove?.();
      responseListener?.remove?.();
    };
  }, []);

  return { expoPushToken, notification };
}

async function saveTokenToDatabase(userId: number, token: string) {
  try {
    await fetch(`${API_BASE}/auth/save-push-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, token }),
    });
  } catch (error) {
    console.log("Error guardando token en BD", error);
  }
}

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) return undefined;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return undefined;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      "4c04db27-74d0-42bc-a22a-39459fe0a67c";

    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    console.warn("Expo Push Token no disponible en este entorno:", error);
    return undefined;
  }
}
