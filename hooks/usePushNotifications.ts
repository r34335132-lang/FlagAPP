import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = "https://www.flagdurango.com.mx/api";

// Configuración para que las notificaciones suenen y aparezcan arriba
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
        
        // Guardado silencioso de fondo en la base de datos
        const sessionData = await AsyncStorage.getItem("userSession");
        if (sessionData) {
          const user = JSON.parse(sessionData);
          await saveTokenToDatabase(user.id, token);
        }
      }
    });

    // Escucha cuando llega una notificación mientras la app está abierta
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Escucha cuando el usuario toca la notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notificación tocada:", response);
      // Aquí en el futuro puedes hacer que al tocarla, los mande a la pantalla del partido
    });

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return { expoPushToken, notification };
}

// Función silenciosa para guardar en tu web
async function saveTokenToDatabase(userId: number, token: string) {
  try {
    await fetch(`${API_BASE}/auth/save-push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, token: token }),
    });
  } catch (error) {
    console.log("Error guardando token en BD", error); // Solo se ve en consola de desarrollo
  }
}

// Función que pide el permiso nativo
async function registerForPushNotificationsAsync() {
  let token;

  if (!Device.isDevice) return undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // AQUÍ ES DONDE SALE LA VENTANITA NATIVA PIDIENDO PERMISO
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  // Si dijo que no, nos salimos en silencio
  if (finalStatus !== 'granted') return undefined;

try {
    // Le agregamos tu ID original al final como chaleco salvavidas
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? "4c04db27-74d0-42bc-a22a-39459fe0a67c";
    
    if (projectId) {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    }
  } catch (e) {
    console.log("Error de Expo Token", e);
  }

  return token;
}