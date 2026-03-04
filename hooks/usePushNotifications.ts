import { useState, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setExpoPushToken(token);
        Alert.alert("¡Token Generado!", "Ya tenemos el token. Intentando guardar en la base de datos...");
        
        // Si hay un usuario logueado, guardamos este token
        const sessionData = await AsyncStorage.getItem("userSession");
        if (sessionData) {
          const user = JSON.parse(sessionData);
          await saveTokenToDatabase(user.id, token);
        } else {
          Alert.alert("Aviso", "No hay sesión iniciada, el token se guardará cuando inicies sesión.");
        }
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return { expoPushToken, notification };
}

async function saveTokenToDatabase(userId: number, token: string) {
  try {
    const response = await fetch(`${API_BASE}/auth/save-push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, token: token }),
    });
    const data = await response.json();
    if (data.success) {
      Alert.alert("¡Todo Listo!", "El token se guardó en Supabase exitosamente.");
    } else {
      Alert.alert("Error de API", data.message || "No se pudo guardar el token en la BD.");
    }
  } catch (error) {
    Alert.alert("Error de Conexión", "No se pudo conectar a tu web para guardar el token.");
  }
}

async function registerForPushNotificationsAsync() {
  let token;

  if (!Device.isDevice) {
    Alert.alert("Aviso", "Las notificaciones Push no funcionan en simuladores. Usa un teléfono físico.");
    return undefined;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    Alert.alert("Permiso Denegado", "Debes activar las notificaciones en los ajustes de tu celular.");
    return undefined;
  }

  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    
    if (!projectId) {
      Alert.alert("Falta Project ID", "No se detectó un ID de proyecto (EAS). Ejecuta 'eas init' en tu terminal.");
      return undefined;
    }

    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    Alert.alert("Error generando token", String(e));
  }

  return token;
}