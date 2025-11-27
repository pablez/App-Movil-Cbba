import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker } from 'react-native-maps';
import LocationService from '../services/LocationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PublicMapScreen = ({ navigation, route }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const insets = useSafeAreaInsets();
  const topOffset = (insets.top || 0) + 12;
  
  // Calcular espaciado dinámico para evitar superposición con bottom tabs
  const TAB_BAR_HEIGHT = 70;
  const BOTTOM_SPACING = TAB_BAR_HEIGHT + Math.max(insets.bottom, 16); // 16px mínimo de padding

  // Estados para selección de puntos y generación de rutas
  const [isSelectingPoints, setIsSelectingPoints] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [generatedRoute, setGeneratedRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  
  // Estado para el aviso de explorar sin cuenta
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Obtener la ruta pasada como parámetro
  const customRoute = route?.params?.customRoute;

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

  useEffect(() => {
    // Si hay una ruta personalizada y el mapa está listo, ajustar la vista
    if (customRoute && customRoute.coordinates && mapRef) {
      setTimeout(() => {
        if (customRoute.coordinates.length > 0) {
          const coords = customRoute.coordinates.map(coord => ({
            latitude: coord[1],
            longitude: coord[0]
          }));
          mapRef.fitToCoordinates(coords, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
      }, 500);
    }
  }, [customRoute, mapRef]);

  // Mostrar modal de bienvenida después de cargar
  useEffect(() => {
    if (!loading && !error) {
      const timer = setTimeout(() => {
        setShowGuestModal(true);
      }, 2000); // Mostrar después de 2 segundos

      return () => clearTimeout(timer);
    }
  }, [loading, error]);

  const centerOnUser = async () => {
    try {
      setLoading(true);
      const res = await LocationService.getCurrentLocation();
      setLocation({ latitude: res.latitude, longitude: res.longitude });
      if (mapRef) {
        mapRef.animateToRegion({
          latitude: res.latitude,
          longitude: res.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }, 500);
      }
    } catch (err) {
      setError(err.message || 'No se pudo centrar');
    } finally {
      setLoading(false);
    }
  };

  const centerOnRoute = () => {
    if (customRoute && customRoute.coordinates && mapRef) {
      const coords = customRoute.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
      mapRef.fitToCoordinates(coords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
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
      Alert.alert(
        'Punto de inicio seleccionado',
        'Ahora toca en el mapa para seleccionar el punto de destino',
        [{ text: 'OK' }]
      );
    } else if (!endPoint) {
      setEndPoint(coordinate);
      Alert.alert(
        'Punto de destino seleccionado',
        '¿Deseas generar la ruta entre estos dos puntos?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Generar Ruta', onPress: () => generateRoute(startPoint, coordinate) }
        ]
      );
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
              edgePadding: { top: 80, right: 50, bottom: BOTTOM_SPACING + 100, left: 50 },
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

  // Preparar coordenadas para el polyline
  const polylineCoords = customRoute && customRoute.coordinates 
    ? customRoute.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }))
    : [];

  // Coordenadas iniciales del mapa
  const initialRegion = {
    latitude: location ? location.latitude : -17.3895,
    longitude: location ? location.longitude : -66.1568,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Botón de regreso */}
      <TouchableOpacity
        style={[styles.backButton, { top: topOffset }]}
        onPress={() => navigation.goBack()}
        accessibilityLabel="Regresar"
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Título de la ruta si existe */}
      {customRoute && (
        <View style={[styles.routeInfo, { top: topOffset + 70 }]}>
          <View style={styles.routeHeader}>
            <View style={[styles.routeColorSwatch, { backgroundColor: customRoute.color || '#1976D2' }]} />
            <Text style={styles.routeTitle}>{customRoute.name || 'Ruta sin nombre'}</Text>
          </View>
          {polylineCoords.length > 0 && (
            <Text style={styles.routeSubtitle}>
              {polylineCoords.length} puntos en la ruta
            </Text>
          )}
        </View>
      )}



      {/* Mapa */}
      <View style={[styles.mapContainer, { paddingBottom: BOTTOM_SPACING }]}>
        {loading && !location ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.loadingText}>Cargando mapa...</Text>
          </View>
        ) : error && !location ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="location-outline" size={48} color="#999" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <MapView
            ref={setMapRef}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={true}
            showsMyLocationButton={Platform.OS === 'android'}
            followsUserLocation={false}
            onPress={handleMapPress}
          >
            {/* Marcador de ubicación del usuario */}
            {location && (
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude
                }}
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
                description="Toca para seleccionar destino"
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
                description="Destino seleccionado"
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

            {/* Polyline de la ruta original si existe */}
            {polylineCoords.length > 0 && (
              <Polyline
                coordinates={polylineCoords}
                strokeColor={customRoute.color || '#1976D2'}
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Marcadores de inicio y fin de ruta original */}
            {polylineCoords.length > 0 && (
              <>
                <Marker
                  coordinate={polylineCoords[0]}
                  title="Inicio de ruta"
                  description={customRoute.name || 'Ruta'}
                  pinColor="#4CAF50"
                />
                {polylineCoords.length > 1 && (
                  <Marker
                    coordinate={polylineCoords[polylineCoords.length - 1]}
                    title="Fin de ruta"
                    description={customRoute.name || 'Ruta'}
                    pinColor="#F44336"
                  />
                )}
              </>
            )}
          </MapView>
        )}

        {/* Panel de control para selección de puntos */}
        {isSelectingPoints && (
          <View style={[styles.selectionPanel, { bottom: BOTTOM_SPACING + 80 }]}>
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

        {/* Botones flotantes */}
        <View style={[styles.mapButtons, { bottom: BOTTOM_SPACING + 16 }]}>
          {/* Botón principal para activar/desactivar selección de puntos */}
          <TouchableOpacity
            style={[styles.fab, styles.navigationFab, { 
              backgroundColor: isSelectingPoints ? '#FF5722' : '#1976D2',
              width: isSelectingPoints ? 48 : 60,
              height: isSelectingPoints ? 48 : 60,
              marginBottom: 12
            }]}
            onPress={togglePointSelection}
            activeOpacity={0.85}
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
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Botón para centrar en usuario */}
          <TouchableOpacity
            style={styles.fab}
            onPress={centerOnUser}
            activeOpacity={0.85}
          >
            <Ionicons name="locate" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Botón para centrar en ruta */}
          {customRoute && polylineCoords.length > 0 && (
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: customRoute.color || '#1976D2', marginTop: 12 }]}
              onPress={centerOnRoute}
              activeOpacity={0.85}
            >
              <Ionicons name="map" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Botón para mostrar opciones de cuenta */}
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: '#4CAF50', marginTop: 12 }]}
            onPress={() => setShowGuestModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="person" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

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
                  // Aquí podrías navegar a una pantalla de registro
                  navigation.navigate('Login'); // Por ahora va al login
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  routeInfo: {
    position: 'absolute',
    right: 16,
    left: 80,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 4,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeColorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  routeSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 24,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#b00020',
    textAlign: 'center',
  },
  mapButtons: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
  },
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
  fabText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
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

  // Banner de información
  navigationBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    elevation: 3,
    zIndex: 500,
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
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

  // Estilos para modal
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

export default PublicMapScreen;