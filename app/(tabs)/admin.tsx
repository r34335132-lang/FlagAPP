import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useColorScheme, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from "@react-native-async-storage/async-storage"; // 🔥 IMPORTANTE AGREGAR ESTO
import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const currentColors = Colors[theme];

  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que deseas salir del panel de administrador?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, salir", 
          style: "destructive",
          onPress: async () => {
            // 1. Cerramos sesión en la base de datos
            await supabase.auth.signOut();
            
            // 2. 🔥 BORRAMOS LA MEMORIA LOCAL PARA ROMPER EL BUCLE 🔥
            await AsyncStorage.removeItem("user");
            await AsyncStorage.removeItem("userSession");
            
            // 3. Mandamos al login limpiecitos
            router.replace('/login');
          }
        }
      ]
    );
  };

  // Componente reutilizable para los botones del menú con un diseño Premium
  const AdminActionCard = ({ title, subtitle, icon, color, route }: any) => {
    return (
      <Pressable 
        style={({ pressed }) => [
          styles.actionCard, 
          { 
            backgroundColor: currentColors.card, 
            borderColor: currentColors.borderLight,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          }
        ]}
        onPress={() => router.push(route)}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.actionTitle, { color: currentColors.text }]}>{title}</Text>
          <Text style={[styles.actionSubtitle, { color: currentColors.textMuted }]}>{subtitle}</Text>
        </View>
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={20} color={currentColors.textMuted} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.bg }]}>
      {/* HEADER CON BOTÓN DE CERRAR SESIÓN */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: currentColors.card, borderBottomColor: currentColors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: currentColors.text }]}>Panel de Admin</Text>
          <Text style={[styles.headerSubtitle, { color: currentColors.textSecondary }]}>Gestión de Liga ⚡️</Text>
        </View>
        
        <Pressable 
          style={({pressed}) => [styles.logoutBtn, { opacity: pressed ? 0.7 : 1 }]} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </Pressable>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>Herramientas Principales</Text>
        <Text style={[styles.sectionSubtitle, { color: currentColors.textSecondary, marginBottom: 20 }]}>
          Selecciona un módulo para gestionar la jornada.
        </Text>

        {/* 🔥 NUEVOS BOTONES PREMIUM 🔥 */}
        <View style={styles.cardsWrapper}>
          
          <AdminActionCard 
            title="Estadísticas" 
            subtitle="Registra Sacks, Intercepciones, TD y MVPs."
            icon="bar-chart" 
            color="#8B5CF6" // Morado
            route="/admin/estadisticas"
          />

          <AdminActionCard 
            title="Pase de Lista" 
            subtitle="Toma la asistencia de los jugadores por partido."
            icon="people" 
            color="#3B82F6" // Azul
            route="/admin/asistencia"
          />

          <AdminActionCard 
            title="Programar Partido" 
            subtitle="Agrega nuevos juegos al calendario de la liga."
            icon="calendar" 
            color="#10B981" // Verde Esmeralda
            route="/admin/agregar-partido"
          />

          <AdminActionCard 
            title="Editor de Marcadores" 
            subtitle="Corrige puntos y finaliza partidos rápidamente."
            icon="create" 
            color="#F59E0B" // Naranja
            route="/admin/editar-marcadores"
          />

        </View>

        {/* Sección de ayuda o estado (Opcional) */}
        <View style={[styles.helpBox, { backgroundColor: currentColors.bgSecondary, borderColor: currentColors.borderLight }]}>
          <Ionicons name="information-circle" size={24} color={currentColors.textMuted} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.helpTitle, { color: currentColors.text }]}>Modo Administrador</Text>
            <Text style={[styles.helpText, { color: currentColors.textSecondary }]}>
              Cualquier cambio realizado en estas herramientas afectará directamente los perfiles y estadísticas públicas de todos los jugadores.
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 15, borderBottomWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  logoutBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  
  content: { flex: 1, padding: 20 },
  
  sectionTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  sectionSubtitle: { fontSize: 14, marginTop: 4 },
  
  cardsWrapper: { gap: 15 },
  
  // Estilo de la Tarjeta Premium
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    paddingRight: 10,
  },
  chevronContainer: {
    width: 30,
    alignItems: 'flex-end',
  },

  // Caja de información al fondo
  helpBox: {
    flexDirection: 'row',
    marginTop: 35,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 12,
    lineHeight: 18,
  }
});