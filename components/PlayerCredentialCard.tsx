import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableWithoutFeedback, Image, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

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
  photoUrl: string;       // Foto de fondo (Acción)
  portraitUrl?: string;   // Foto pequeña tipo ID (Gafete)
  stats: PlayerStats;
}

export default function PlayerCredentialCard({ 
  playerName, 
  playerNumber, 
  position, 
  team, 
  photoUrl, 
  portraitUrl,
  stats 
}: CredentialProps) {
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Referencia para capturar la tarjeta
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
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = { transform: [{ rotateY: frontInterpolate }] };
  const backAnimatedStyle = { transform: [{ rotateY: backInterpolate }] };

  // Imágenes
  const bgImageSource = photoUrl && !photoUrl.startsWith('blob:') ? { uri: photoUrl } : require('@/assets/images/icon.png'); 
  const idImageSource = portraitUrl && !portraitUrl.startsWith('blob:') ? { uri: portraitUrl } : bgImageSource; 

  // Función REAL para descargar/compartir
  const handleSaveCredential = async () => {
    try {
      // Si la carta está volteada, la regresamos al frente antes de tomar la foto
      if (isFlipped) flipCard();

      // Damos un pequeño respiro para que la animación termine si es que estaba volteada
      setTimeout(async () => {
        const uri = await captureRef(cardRef, {
          format: 'png',
          quality: 1,
        });

        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: `Credencial de ${playerName}`,
            UTI: 'public.png'
          });
        } else {
          Alert.alert("Error", "La opción de compartir no está disponible en tu dispositivo.");
        }
      }, isFlipped ? 500 : 0);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo generar la credencial.");
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Contenedor Refeenciado para capturar la imagen */}
      <View style={styles.container} ref={cardRef} collapsable={false}>
        <TouchableWithoutFeedback onPress={flipCard}>
          <View style={styles.cardContainer}>
            
            {/* FRENTE DE LA CARTA */}
            <Animated.View style={[styles.card, frontAnimatedStyle]}>
              <LinearGradient colors={['#D4AF37', '#FFF3B0', '#D4AF37']} style={styles.borderGradient}>
                <View style={styles.innerCard}>
                  
                  {/* Foto de fondo completo (Acción) */}
                  <Image source={bgImageSource} style={styles.playerImage} />
                  
                  {/* Perforación de Gafete */}
                  <View style={styles.lanyardHole} />

                  {/* Sello Top Right */}
                  <View style={styles.sealContainer}>
                    <Image source={require('@/assets/images/icon.png')} style={styles.sealImage} />
                  </View>

                  {/* Overlay Inferior */}
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,1)']} style={styles.infoOverlay}>
                    
                    <View style={styles.infoRow}>
                      {/* Foto ID Pequeña */}
                      <View style={styles.portraitContainer}>
                        <Image source={idImageSource} style={styles.portraitImage} />
                      </View>

                      {/* Datos del Jugador */}
                      <View style={styles.textDataContainer}>
                        <View style={styles.officialBadge}>
                          <Text style={styles.officialBadgeText}>ID OFICIAL LIGA FLAG DURANGO</Text>
                        </View>
                        <Text style={styles.teamText}>{team.toUpperCase()}</Text>
                        <Text style={styles.playerName} numberOfLines={1} adjustsFontSizeToFit>{playerName.toUpperCase()}</Text>
                        
                        <View style={styles.statsRow}>
                          <Text style={styles.positionText}>{position}</Text>
                          <Text style={styles.numberText}>#{playerNumber}</Text>
                        </View>
                      </View>
                    </View>

                  </LinearGradient>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* REVERSO DE LA CARTA (ESTADÍSTICAS) */}
            <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
              <LinearGradient colors={['#D4AF37', '#8A6D22']} style={styles.borderGradient}>
                <View style={[styles.innerCard, styles.backInnerCard]}>
                  
                  <Image source={require('@/assets/images/icon.png')} style={styles.backLogo} />
                  <Text style={styles.backTitle}>ESTADÍSTICAS DE TEMPORADA</Text>
                  <Text style={styles.backSubtitle}>LIGA FLAG DURANGO PASSPORT</Text>

                  <View style={styles.statsContainer}>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>ANOTACIONES (TD)</Text>
                      <Text style={styles.statValue}>{stats.touchdowns}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>PASES QB</Text>
                      <Text style={styles.statValue}>{stats.pases}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>INTERCEPCIONES</Text>
                      <Text style={styles.statValue}>{stats.intercepciones}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>SACKS</Text>
                      <Text style={styles.statValue}>{stats.sacks}</Text>
                    </View>
                    <View style={[styles.statRow, { borderBottomWidth: 0, backgroundColor: 'rgba(212, 175, 55, 0.1)' }]}>
                      <Text style={[styles.statLabel, { color: '#FCD34D' }]}>PREMIOS MVP</Text>
                      <Text style={[styles.statValue, { color: '#FCD34D', fontSize: 18 }]}>
                        <Ionicons name="trophy" size={16} color="#FCD34D" /> {stats.mvps}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.hologram}>
                    <Ionicons name="shield-checkmark" size={14} color="#333" style={{marginRight: 4}} />
                    <Text style={styles.hologramText}>AUTÉNTICO Y VERIFICADO</Text>
                  </View>

                </View>
              </LinearGradient>
            </Animated.View>

          </View>
        </TouchableWithoutFeedback>
      </View>

      {/* BOTÓN REAL PARA GUARDAR/COMPARTIR */}
      <Pressable style={styles.downloadBtn} onPress={handleSaveCredential}>
        <LinearGradient colors={['#D4AF37', '#B45309']} style={styles.downloadBtnGradient}>
          <Ionicons name="share-social-outline" size={20} color="#FFF" />
          <Text style={styles.downloadBtnText}>GUARDAR / COMPARTIR CREDENCIAL</Text>
        </LinearGradient>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', marginVertical: 10 },
  container: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  cardContainer: { width: 310, height: 480, perspective: 1000 },
  card: { width: '100%', height: '100%', position: 'absolute', backfaceVisibility: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  cardBack: { }, 
  borderGradient: { flex: 1, borderRadius: 20, padding: 6 },
  innerCard: { flex: 1, backgroundColor: '#111', borderRadius: 15, overflow: 'hidden' },
  backInnerCard: { backgroundColor: '#1A1A1A', padding: 20, alignItems: 'center' },
  
  playerImage: { width: '100%', height: '100%', resizeMode: 'cover', position: 'absolute' },
  
  lanyardHole: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    width: 60,
    height: 12,
    backgroundColor: '#000',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    zIndex: 10,
  },

  sealContainer: { 
    position: 'absolute', 
    top: 35, 
    right: 15, 
    width: 55, 
    height: 55, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.6, 
    shadowRadius: 5,
    borderRadius: 27.5,
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: '#D4AF37'
  },
  sealImage: { width: '100%', height: '100%', resizeMode: 'contain', borderRadius: 27.5 },

  infoOverlay: { position: 'absolute', bottom: 0, width: '100%', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 15 },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  // Estilos de la foto tipo credencial (Pequeña)
  portraitContainer: {
    width: 70,
    height: 90,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D4AF37',
    backgroundColor: '#000',
    overflow: 'hidden',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  portraitImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  textDataContainer: {
    flex: 1,
  },

  officialBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 1,
    borderColor: '#D4AF37',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  officialBadgeText: { color: '#D4AF37', fontSize: 7, fontWeight: '900', letterSpacing: 1 },

  teamText: { color: '#E5E7EB', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 2 },
  playerName: { color: '#FFF', fontSize: 24, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, borderTopWidth: 1, borderTopColor: 'rgba(212, 175, 55, 0.4)', paddingTop: 5 },
  positionText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  numberText: { color: '#D4AF37', fontSize: 26, fontWeight: '900', fontStyle: 'italic', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },

  // REVERSO
  backLogo: { width: 50, height: 50, resizeMode: 'contain', marginBottom: 10, borderRadius: 25 },
  backTitle: { color: '#D4AF37', fontSize: 20, fontWeight: '900', textAlign: 'center', letterSpacing: 1.5 },
  backSubtitle: { color: '#FFF', fontSize: 10, marginBottom: 30, opacity: 0.7, letterSpacing: 2 },
  
  statsContainer: { width: '100%', backgroundColor: 'rgba(0, 0, 0, 0.4)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  statLabel: { color: '#CCC', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  statValue: { color: '#D4AF37', fontSize: 16, fontWeight: '900' },
  
  hologram: { flexDirection: 'row', alignItems: 'center', position: 'absolute', bottom: 25, backgroundColor: '#E5E7EB', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#A1A1AA' },
  hologramText: { color: '#333', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  // BOTÓN DE DESCARGA
  downloadBtn: { marginTop: 25, width: '90%', shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  downloadBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 30, gap: 10 },
  downloadBtnText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 }
});