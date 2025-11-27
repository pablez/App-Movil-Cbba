import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Platform, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import LocationService from '../services/LocationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GuestScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para selección de puntos y generación de rutas
  const [isSelectingPoints, setIsSelectingPoints] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [generatedRoute, setGeneratedRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  
  // Estado para el aviso de explorar sin cuenta
  const [showGuestModal, setShowGuestModal] = useState(false);
  
  // Estados para modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmType, setConfirmType] = useState('origin'); // 'origin' o 'destination'
  
  // Calcular espaciado dinámico para evitar superposición con bottom tabs
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 70;
  const BOTTOM_SPACING = TAB_BAR_HEIGHT + Math.max(insets.bottom, 16); // 16px mínimo de padding

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await LocationService.getCurrentLocation();
        if (!mounted) return;
        setLocation({ latitude: res.latitude, longitude: res.longitude });
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'No se pudo obtener ubicación');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Mostrar modal de bienvenida después de cargar
  useEffect(() => {
    if (!loading && !error) {
      const timer = setTimeout(() => {
        setShowGuestModal(true);
      }, 2000); // Mostrar después de 2 segundos

      return () => clearTimeout(timer);
    }
  }, [loading, error]);

  const centerOnUser = async (mapRef) => {
    try {
      setLoading(true);
      const res = await LocationService.getCurrentLocation();
      setLocation({ latitude: res.latitude, longitude: res.longitude });
      if (mapRef && mapRef.animateToRegion) {
        mapRef.animateToRegion({ latitude: res.latitude, longitude: res.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
      }
    } catch (err) {
      setError(err.message || 'No se pudo centrar');
    } finally {
      setLoading(false);
    }
  };

  // Funciones para selección de puntos y generación de rutas
  const togglePointSelection = () => {
    setIsSelectingPoints(!isSelectingPoints);
    if (isSelectingPoints) {
      // Limpiar puntos al desactivar
      setStartPoint(null);
      setEndPoint(null);
      setGeneratedRoute(null);
    }
  };

  const handleMapPress = (event) => {
    if (!isSelectingPoints) return;

    const coordinate = event.nativeEvent.coordinate;
    
    if (!startPoint) {
      setStartPoint(coordinate);
      setConfirmType('origin');
      setConfirmMessage('¡Origen seleccionado correctamente!\nAhora selecciona tu destino');
      setShowConfirmModal(true);
    } else if (!endPoint) {
      setEndPoint(coordinate);
      setConfirmType('destination');
      setConfirmMessage('¡Destino seleccionado correctamente!\n¿Listo para generar la ruta?');
      setShowConfirmModal(true);
    }
  };

  const generateRoute = async (start, end) => {
    setRouteLoading(true);
    try {
      console.log('🛣️ Generando ruta...', { start, end });
      
      const routeResult = await LocationService.getOptimalRoute(
        { latitude: start.latitude, longitude: start.longitude },
        { latitude: end.latitude, longitude: end.longitude },
        'driving-car'
      );

      if (routeResult.success) {
        setGeneratedRoute(routeResult);
        setShowRouteModal(true);
        
        // Ajustar vista del mapa a la ruta generada
        if (mapRef && routeResult.coordinates && routeResult.coordinates.length > 0) {
          const routeCoords = routeResult.coordinates.map(coord => ({
            latitude: coord[1],
            longitude: coord[0]
          }));
          setTimeout(() => {
            mapRef.fitToCoordinates(routeCoords, {
              edgePadding: { top: 80, right: 50, bottom: 200, left: 50 },
              animated: true,
            });
          }, 500);
        }
      } else {
        Alert.alert(
          'Error al generar ruta',
          routeResult.error || 'No se pudo calcular la ruta',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Error al generar la ruta: ' + error.message,
        [{ text: 'OK' }]
      );
    } finally {
      setRouteLoading(false);
    }
  };

  const clearRoute = () => {
    setStartPoint(null);
    setEndPoint(null);
    setGeneratedRoute(null);
    setShowRouteModal(false);
  };

  let mapRef = null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header con el nombre de la app en esquina superior izquierda */}
      <View style={styles.appHeader}>
        <View style={styles.appNameContainer}>
          <Text style={styles.appName}>
            <Text style={styles.appNamePrimary}>Ñan</Text>
            <Text style={styles.appNameSecondary}> Go</Text>
          </Text>
        </View>
      </View>

      <View style={[styles.mapWrap, { paddingBottom: BOTTOM_SPACING }]}>
        {loading && !location ? (
          <View style={styles.loadingWrap}><ActivityIndicator size="large" color="#1976D2" /></View>
        ) : error && !location ? (
          <View style={styles.loadingWrap}><Text style={{ color: '#b00020' }}>{error}</Text></View>
        ) : (
          <MapView
            ref={ref => { mapRef = ref; }}
            style={styles.map}
            initialRegion={{
              latitude: location ? location.latitude : -17.3895,
              longitude: location ? location.longitude : -66.1568,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05
            }}
            showsUserLocation={true}
            showsMyLocationButton={Platform.OS === 'android'}
            onPress={handleMapPress}
          >
            {/* Marcador de ubicación del usuario */}
            {location && (
              <Marker 
                coordinate={{ latitude: location.latitude, longitude: location.longitude }} 
                title="Tu ubicación" 
                description="Ubicación actual" 
                pinColor="#4CAF50"
              />
            )}

            {/* Marcadores de puntos seleccionados */}
            {startPoint && (
              <Marker
                coordinate={startPoint}
                title="Punto de inicio"
                description="Origen de la ruta"
                pinColor="#2196F3"
              >
                <View style={styles.customMarker}>
                  <Ionicons name="location" size={30} color="#2196F3" />
                  <Text style={styles.markerText}>A</Text>
                </View>
              </Marker>
            )}
            
            {endPoint && (
              <Marker
                coordinate={endPoint}
                title="Punto de destino"
                description="Destino de la ruta"
                pinColor="#FF5722"
              >
                <View style={styles.customMarker}>
                  <Ionicons name="location" size={30} color="#FF5722" />
                  <Text style={styles.markerText}>B</Text>
                </View>
              </Marker>
            )}

            {/* Polyline de la ruta generada */}
            {generatedRoute && generatedRoute.coordinates && (
              <Polyline
                coordinates={generatedRoute.coordinates.map(coord => ({
                  latitude: coord[1],
                  longitude: coord[0]
                }))}
                strokeColor="#FF5722"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
                lineDashPattern={[10, 5]}
              />
            )}
          </MapView>
        )}

        {/* Panel de control para selección de puntos */}
        {isSelectingPoints && (
          <View style={[styles.selectionPanel, { top: 105 }]}>
            <View style={styles.selectionHeader}>
              <View style={styles.animatedIcon}>
                <Ionicons name="navigate-circle" size={24} color="#1976D2" />
              </View>
              <View style={styles.selectionTitleContainer}>
                <Text style={styles.selectionTitle}>
                  {!startPoint ? '👆 Toca en el mapa para seleccionar ORIGEN' : 
                   !endPoint ? '👆 Toca en el mapa para seleccionar DESTINO' : 
                   '✅ Puntos seleccionados - Genera la ruta'}
                </Text>
                <Text style={styles.selectionSubtitle}>
                  {!startPoint ? 'Paso 1 de 2' : 
                   !endPoint ? 'Paso 2 de 2' : 
                   'Listo para generar'}
                </Text>
              </View>
            </View>
            
            <View style={styles.selectionStatus}>
              <View style={[styles.statusItem, startPoint && styles.statusItemActive]}>
                <View style={[styles.statusDot, { backgroundColor: startPoint ? '#2196F3' : '#ccc' }]} />
                <Text style={[styles.statusText, startPoint && styles.statusTextActive]}>
                  Origen {startPoint ? '✓' : '(pendiente)'}
                </Text>
              </View>
              <View style={[styles.statusItem, endPoint && styles.statusItemActive]}>
                <View style={[styles.statusDot, { backgroundColor: endPoint ? '#FF5722' : '#ccc' }]} />
                <Text style={[styles.statusText, endPoint && styles.statusTextActive]}>
                  Destino {endPoint ? '✓' : '(pendiente)'}
                </Text>
              </View>
            </View>
            
            {/* Botón para usar ubicación actual como origen */}
            {!startPoint && location && (
              <TouchableOpacity 
                style={styles.useCurrentLocationBtn}
                onPress={() => {
                  setStartPoint({ latitude: location.latitude, longitude: location.longitude });
                  setConfirmType('origin');
                  setConfirmMessage('¡Ubicación actual seleccionada!\nTu posición se estableció como origen');
                  setShowConfirmModal(true);
                }}
              >
                <Ionicons name="locate" size={16} color="#4CAF50" />
                <Text style={styles.useCurrentLocationText}>Usar mi ubicación actual como origen</Text>
              </TouchableOpacity>
            )}
            
            {startPoint && endPoint && !routeLoading && (
              <TouchableOpacity 
                style={styles.generateRouteBtn}
                onPress={() => generateRoute(startPoint, endPoint)}
              >
                <Ionicons name="map-outline" size={18} color="#fff" />
                <Text style={styles.generateRouteBtnText}>🛣️ Generar Ruta Personalizada</Text>
              </TouchableOpacity>
            )}

            {routeLoading && (
              <View style={styles.routeLoadingContainer}>
                <ActivityIndicator size="small" color="#1976D2" />
                <Text style={styles.routeLoadingText}>🔄 Calculando la mejor ruta...</Text>
              </View>
            )}
          </View>
        )}

        {/* Indicador visual cuando está en modo selección */}
        {isSelectingPoints && (
          <View style={[styles.selectionOverlay, { bottom: BOTTOM_SPACING + 80 }]}>
            <Text style={styles.overlayText}>
              {!startPoint ? '📍 TOCA PARA SELECCIONAR ORIGEN' :
               !endPoint ? '📍 TOCA PARA SELECCIONAR DESTINO' :
               '✅ AMBOS PUNTOS SELECCIONADOS'}
            </Text>
          </View>
        )}

        <View style={[styles.mapButtons, { bottom: BOTTOM_SPACING + 16 }]} pointerEvents="box-none">
          {/* Botón principal para activar/desactivar selección de puntos */}
          <TouchableOpacity
            style={[styles.fab, styles.navigationFab, { 
              backgroundColor: isSelectingPoints ? '#FF5722' : '#1976D2',
              width: isSelectingPoints ? 48 : 60,
              height: isSelectingPoints ? 48 : 60,
              marginBottom: 12
            }]}
            onPress={togglePointSelection}
          >
            {isSelectingPoints ? (
              <Ionicons name="close" size={24} color="#fff" />
            ) : (
              <View style={styles.navigationIcon}>
                <Ionicons name="navigate" size={24} color="#fff" />
                <Text style={styles.navigationLabel}>RUTAS</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Botón para limpiar ruta generada */}
          {(startPoint || endPoint || generatedRoute) && (
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: '#f44336', marginBottom: 12 }]}
              onPress={clearRoute}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.fab} onPress={() => centerOnUser(mapRef)}>
            <Ionicons name="locate" size={20} color="#fff" />
          </TouchableOpacity>
          
          {/* Botón para mostrar opciones de cuenta */}
          <TouchableOpacity 
            style={[styles.fab, { backgroundColor: '#4CAF50', marginTop: 12 }]} 
            onPress={() => setShowGuestModal(true)}
          >
            <Ionicons name="person" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de confirmación con animación de check */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.checkAnimationContainer}>
              <View style={[styles.checkCircle, {
                backgroundColor: confirmType === 'origin' ? '#2196F3' : '#FF5722'
              }]}>
                <Ionicons name="checkmark" size={32} color="#fff" />
              </View>
            </View>
            
            <Text style={styles.confirmModalTitle}>
              {confirmType === 'origin' ? '✅ Origen Establecido' : '✅ Destino Establecido'}
            </Text>
            
            <Text style={styles.confirmModalMessage}>
              {confirmMessage}
            </Text>
            
            <View style={styles.confirmModalActions}>
              {confirmType === 'destination' ? (
                <>
                  <TouchableOpacity 
                    style={[styles.confirmActionBtn, styles.generateRouteConfirmBtn]}
                    onPress={() => {
                      setShowConfirmModal(false);
                      setTimeout(() => {
                        generateRoute(startPoint, endPoint);
                      }, 300);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="navigate" size={18} color="#fff" />
                    <Text style={styles.confirmActionText}>Generar Ruta</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.confirmActionBtn, styles.continueSelectingBtn]}
                    onPress={() => setShowConfirmModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.continueSelectingText}>Continuar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={[styles.confirmActionBtn, styles.continueSelectingBtn]}
                  onPress={() => setShowConfirmModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.continueSelectingText}>Continuar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de aviso para usuarios invitados */}
      <Modal
        visible={showGuestModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGuestModal(false)}
      >
        <TouchableOpacity 
          style={styles.guestModalOverlay}
          activeOpacity={1}
          onPress={() => setShowGuestModal(false)}
        >
          <View style={styles.guestModalContent}>
            <TouchableOpacity 
              onPress={() => setShowGuestModal(false)}
              style={styles.guestModalCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>

            <View style={styles.guestModalHeader}>
              <View style={styles.guestModalIcon}>
                <Ionicons name="map" size={32} color="#1976D2" />
              </View>
              <Text style={styles.guestModalTitle}>
                ¡Explora el mapa de rutas!
              </Text>
              <Text style={styles.guestModalSubtitle}>
                Puedes ver las rutas disponibles y crear rutas personalizadas. Para acceder a más funciones, únete a nosotros.
              </Text>
            </View>

            <View style={styles.guestModalActions}>
              <TouchableOpacity 
                style={[styles.guestActionBtn, styles.registerBtn]}
                onPress={() => {
                  setShowGuestModal(false);
                  navigation.navigate('Login');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={18} color="#fff" />
                <Text style={styles.guestActionText}>Registrarse</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.guestActionBtn, styles.loginBtn]}
                onPress={() => {
                  setShowGuestModal(false);
                  navigation.navigate('Login');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="log-in" size={18} color="#fff" />
                <Text style={styles.guestActionText}>Iniciar Sesión</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.continueGuestBtn}
              onPress={() => setShowGuestModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.continueGuestText}>
                Continuar explorando como invitado
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de información de ruta */}
      <Modal
        visible={showRouteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRouteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🛣️ Ruta Generada</Text>
              <TouchableOpacity 
                onPress={() => setShowRouteModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {generatedRoute && (
              <View style={styles.routeDetails}>
                <View style={styles.routeDetailItem}>
                  <Ionicons name="speedometer-outline" size={20} color="#1976D2" />
                  <Text style={styles.routeDetailText}>
                    Distancia: {(generatedRoute.distance / 1000).toFixed(2)} km
                  </Text>
                </View>

                <View style={styles.routeDetailItem}>
                  <Ionicons name="time-outline" size={20} color="#1976D2" />
                  <Text style={styles.routeDetailText}>
                    Tiempo estimado: {Math.round((generatedRoute.duration || 0) / 60)} min
                  </Text>
                </View>

                <View style={styles.routeDetailItem}>
                  <Ionicons name="location-outline" size={20} color="#1976D2" />
                  <Text style={styles.routeDetailText}>
                    Puntos de ruta: {generatedRoute.coordinates ? generatedRoute.coordinates.length : 0}
                  </Text>
                </View>

                <View style={styles.routeDetailItem}>
                  <Ionicons name="car-outline" size={20} color="#1976D2" />
                  <Text style={styles.routeDetailText}>
                    Modo: {generatedRoute.profile === 'driving-car' ? 'En vehículo' : 'Otros'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalActionBtn}
                onPress={() => setShowRouteModal(false)}
              >
                <Text style={styles.modalActionText}>Ver en Mapa</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalActionBtn, styles.modalActionBtnSecondary]}
                onPress={clearRoute}
              >
                <Text style={styles.modalActionTextSecondary}>Limpiar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  // Header elegante con el nombre de la app en esquina superior izquierda
  appHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1000,
    paddingTop: 20, // Reducido para posicionar más arriba
    paddingHorizontal: 16,
    paddingBottom: 8, // Reducido también
  },
  appNameContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Fondo semi-transparente blanco
    paddingVertical: 10, // Aumentado para el texto más grande
    paddingHorizontal: 18, // Aumentado proporcionalmente
    borderRadius: 22, // Aumentado para mantener proporción
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    alignSelf: 'flex-start', // Se ajusta al contenido
  },
  appName: {
    fontSize: 28, // Aumentado de 24 a 28
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  appNamePrimary: {
    color: '#1a1a1a', // Negro más suave para "Ñan"
    fontWeight: '900',
  },
  appNameSecondary: {
    color: '#FF6B35', // Naranja más vibrante para "Go"
    fontWeight: '800',
  },
  body: { padding: 20 },
  info: { color: '#444', lineHeight: 20 },
  primary: { marginTop: 20, backgroundColor: '#1976D2', padding: 12, borderRadius: 10, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapButtons: { position: 'absolute', right: 16, alignItems: 'center' },
  fab: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: '#1976D2', 
    alignItems: 'center', 
    justifyContent: 'center', 
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },

  // Estilos para botón de navegación mejorado
  navigationFab: {
    elevation: 8,
    shadowOpacity: 0.3,
  },
  navigationIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 8,
    marginTop: 2,
  },

  // Estilos para marcadores personalizados
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    top: 8,
  },

  // Estilos para panel de selección
  selectionPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  animatedIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  selectionTitleContainer: {
    flex: 1,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
    lineHeight: 20,
  },
  selectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginTop: 4,
  },
  selectionStatus: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  statusItemActive: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  generateRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  generateRouteBtnText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 16,
  },
  useCurrentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  useCurrentLocationText: {
    color: '#2E7D32',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  routeLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  routeLoadingText: {
    marginLeft: 8,
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },

  // Indicador visual de superposición
  selectionOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(25, 118, 210, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: 'center',
    elevation: 8,
  },
  overlayText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },

  // Estilos para modal de confirmación
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  checkAnimationContainer: {
    marginBottom: 24,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmModalMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmModalActions: {
    width: '100%',
    gap: 12,
  },
  confirmActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  generateRouteConfirmBtn: {
    backgroundColor: '#4CAF50',
  },
  continueSelectingBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  confirmActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  continueSelectingText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },

  // Estilos para modal de invitado
  guestModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  guestModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  guestModalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  guestModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 12,
  },
  guestModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  guestModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 8,
  },
  guestModalSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  guestModalActions: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  guestActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  registerBtn: {
    backgroundColor: '#1976D2',
  },
  loginBtn: {
    backgroundColor: '#4CAF50',
  },
  guestActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  continueGuestBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  continueGuestText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  // Estilos para modal de información de ruta
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalCloseBtn: {
    padding: 4,
  },
  routeDetails: {
    marginBottom: 20,
  },
  routeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  routeDetailText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionBtn: {
    flex: 1,
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalActionBtnSecondary: {
    backgroundColor: '#f44336',
  },
  modalActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalActionTextSecondary: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default GuestScreen;
