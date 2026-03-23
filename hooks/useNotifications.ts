// hooks/useNotifications.ts
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

// Configuración global de cómo se muestran las notificaciones en la app
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Obtiene o genera un ID único para el teléfono (Suscripción Anónima)
async function getOrCreateDeviceId() {
  let deviceId = await AsyncStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = Crypto.randomUUID();
    await AsyncStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

// Obtiene el Push Token de Expo de manera segura
async function getPushToken() {
  if (!Device.isDevice) {
    console.log('Debes usar un dispositivo físico para las notificaciones Push');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return null;
  }

// Obtenemos el ID del proyecto de tu app.json o usamos el de respaldo
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? "4c04db27-74d0-42bc-a22a-39459fe0a67c";
  
  if (!projectId) {
    console.warn("Falta el projectId en app.json.");
    return null; 
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (error) {
    console.error("Error al obtener el Push Token:", error);
    return null;
  }
}

// Hook principal para suscribirse a un partido
export function useGameNotifications(gameId: string | number) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gameId) checkSubscription();
  }, [gameId]);

  const checkSubscription = async () => {
    const deviceId = await getOrCreateDeviceId();
    
    const { data } = await supabase
      .from('notification_subscriptions')
      .select('notifications_enabled')
      .eq('game_id', gameId)
      .eq('device_id', deviceId)
      .single();
    
    if (data) setIsSubscribed(data.notifications_enabled);
    setLoading(false);
  };

  const toggleSubscription = async () => {
    const pushToken = await getPushToken();
    if (!pushToken) {
      alert("Necesitas habilitar las notificaciones en los ajustes de tu teléfono para recibir alertas de este partido.");
      return;
    }

    const deviceId = await getOrCreateDeviceId();
    const newState = !isSubscribed;
    setIsSubscribed(newState); // Actualización inmediata en la UI

    // Guardar en Supabase
    const { error } = await supabase
      .from('notification_subscriptions')
      .upsert({ 
        device_id: deviceId, 
        push_token: pushToken,
        game_id: gameId,
        notifications_enabled: newState 
      }, { onConflict: 'device_id, game_id' });

    if (error) {
      setIsSubscribed(!newState); // Revertir si falla la base de datos
      console.error("Error al guardar suscripción:", error);
    }
  };

  return { isSubscribed, toggleSubscription, loading };
}