import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Platform,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
// Usamos LocationService (OpenRouteService wrapper) para obtener ubicación
import LocationService from '../services/LocationService';
import { doc, getDoc } from 'firebase/firestore';
import { LocationService as FirestoreLocationService } from '../services/firestoreService';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';

const DriverScreen = () => {
  const [location, setLocation] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [tripRequests, setTripRequests] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const { user, logout } = useAuth();
  const webViewRef = useRef(null);

  // Altura de la barra de estado (Android) para ajustar el padding superior
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  useEffect(() => {
    getCurrentLocation();
    loadUserProfile();
    // Cargar solicitudes de viaje
    loadTripRequests();
  }, []);

  // Actualizar ubicación en el mapa cuando cambie
  useEffect(() => {
    if (mapReady && location && webViewRef.current) {
      updateDriverOnMap(location.latitude, location.longitude);
    }
  }, [mapReady, location]);

  // Actualizar solicitudes de viaje en el mapa cuando cambien
  useEffect(() => {
    if (mapReady && webViewRef.current) {
      updateTripRequestsOnMap(tripRequests);
    }
  }, [mapReady, tripRequests]);

  // Actualizar viaje actual en el mapa
  useEffect(() => {
    if (mapReady && webViewRef.current && currentTrip) {
      updateCurrentTripOnMap(currentTrip);
    }
  }, [mapReady, currentTrip]);

  useEffect(() => {
    if (isOnline && location) {
      // Actualizar ubicación del conductor en tiempo real
  updateDriverLocation();
    }
  }, [isOnline, location]);

  const loadUserProfile = async () => {
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    }
  };

  const getCurrentLocation = async () => {
    try {
      console.log('🔍 [CONDUCTOR] Obteniendo ubicación usando LocationService (ORS)');
      const res = await LocationService.getCurrentLocationWithAddress();
      if (!res || !res.success || !res.location) {
        throw new Error(res?.error || 'No se obtuvo ubicación desde ORS');
      }

      const loc = res.location;
      setLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      console.log('📍 [CONDUCTOR] Ubicación obtenida:', loc);
    } catch (error) {
      console.warn('[CONDUCTOR] LocationService falló, intentando fallback con expo-location:', error?.message || error);
      try {
        // Fallback directo usando Expo Location (si LocationService falló)
        // eslint-disable-next-line global-require
        const Location = require('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Error', 'Permiso de ubicación denegado');
          return;
        }
        const position = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch (err2) {
        console.error('[CONDUCTOR] Fallback expo-location también falló:', err2);
        Alert.alert('Error', 'No se pudo obtener la ubicación');
      }
    }
  };

  // Actualizar ubicación del conductor en el mapa web
  const updateDriverOnMap = (latitude, longitude) => {
    if (webViewRef.current) {
      const message = JSON.stringify({
        type: 'updateDriverLocation',
        latitude,
        longitude
      });
      webViewRef.current.postMessage(message);
    }
  };

  // Actualizar solicitudes de viaje en el mapa web  
  const updateTripRequestsOnMap = (requests) => {
    if (webViewRef.current) {
      const message = JSON.stringify({
        type: 'updateTripRequests', 
        requests: requests.map(request => ({
          id: request.id,
          passengerName: request.passengerName,
          latitude: request.pickupLocation.latitude,
          longitude: request.pickupLocation.longitude,
          address: request.pickupLocation.address,
          fare: request.fare,
          passengerType: request.passengerType
        }))
      });
      webViewRef.current.postMessage(message);
    }
  };

  // Actualizar viaje actual en el mapa web
  const updateCurrentTripOnMap = (trip) => {
    if (webViewRef.current) {
      const message = JSON.stringify({
        type: 'updateCurrentTrip',
        trip: {
          id: trip.id,
          passengerName: trip.passengerName,
          pickupLocation: trip.pickupLocation,
          destinationLocation: trip.destinationLocation,
          fare: trip.fare
        }
      });
      webViewRef.current.postMessage(message);
    }
  };

  // Generar HTML del mapa con OpenRouteService - Versión para conductor
  const generateMapHTML = () => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mapa Conductor - OpenRouteService</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v7.4.0/ol.css">
        <style>
            html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
            .loading { 
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(76, 175, 80, 0.9); color: white; padding: 15px 20px; 
                border-radius: 10px; z-index: 1000; text-align: center; font-family: Arial;
            }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/ol@v7.4.0/dist/ol.js"></script>
    </head>
    <body>
        <div id="loading" class="loading">🚗 Cargando mapa del conductor...</div>
        <div id="map"></div>
        <script>
            // Fuentes para marcadores
            window.driverSource = new ol.source.Vector();
            window.tripRequestsSource = new ol.source.Vector();
            window.currentTripSource = new ol.source.Vector();
            
            // Inicializar mapa con tiles OpenStreetMap
            window.map = new ol.Map({
                target: 'map',
                layers: [
                    // Capa base OpenStreetMap
                    new ol.layer.Tile({
                        source: new ol.source.OSM({
                            url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                            attributions: '© OpenStreetMap contributors'
                        })
                    }),
                    // Capa del conductor (ícono de micro/trufi)
                    new ol.layer.Vector({
                        source: window.driverSource,
                        style: function(feature, resolution) {
                            // Calcular el radio basado en el zoom (resolution inversa)
                            const zoom = window.map.getView().getZoom();
                            const baseRadius = 25;
                            const minRadius = 15;
                            const maxRadius = 35;
                            
                            // Radio dinámico: más grande cuando alejado, más pequeño cuando cercano
                            let radius = baseRadius;
                            if (zoom < 12) {
                                radius = maxRadius; // Grande cuando alejado
                            } else if (zoom > 16) {
                                radius = minRadius; // Pequeño cuando cercano
                            } else {
                                // Interpolación lineal: grande a pequeño
                                const zoomRange = 16 - 12;
                                const radiusRange = minRadius - maxRadius;
                                radius = maxRadius + ((zoom - 12) / zoomRange) * radiusRange;
                            }
                            
                            return new ol.style.Style({
                                image: new ol.style.Circle({
                                    radius: radius,
                                    fill: new ol.style.Fill({ color: '#4CAF50' }),
                                    stroke: new ol.style.Stroke({ color: '#ffffff', width: Math.max(2, radius * 0.15) })
                                }),
                                text: new ol.style.Text({
                                    text: '🚐 MICRO',
                                    font: 'bold ' + Math.max(10, radius * 0.45) + 'px Arial',
                                    fill: new ol.style.Fill({ color: '#ffffff' }),
                                    stroke: new ol.style.Stroke({ color: '#000000', width: Math.max(1, radius * 0.08) }),
                                    offsetY: -2
                                })
                            });
                        }
                    }),
                    // Capa de solicitudes de viaje (azul)
                    new ol.layer.Vector({ 
                        source: window.tripRequestsSource,
                        style: new ol.style.Style({
                            image: new ol.style.Circle({
                                radius: 8,
                                fill: new ol.style.Fill({ color: '#2196F3' }),
                                stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
                            })
                        })
                    }),
                    // Capa de viaje actual (rojo para pickup, naranja para destino)
                    new ol.layer.Vector({ 
                        source: window.currentTripSource,
                        style: function(feature) {
                            const type = feature.get('type');
                            if (type === 'pickup') {
                                return new ol.style.Style({
                                    image: new ol.style.Circle({
                                        radius: 10,
                                        fill: new ol.style.Fill({ color: '#FF5722' }),
                                        stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
                                    })
                                });
                            } else if (type === 'destination') {
                                return new ol.style.Style({
                                    image: new ol.style.Circle({
                                        radius: 8,
                                        fill: new ol.style.Fill({ color: '#FF9800' }),
                                        stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
                                    })
                                });
                            }
                        }
                    })
                ],
                view: new ol.View({
                    center: ol.proj.fromLonLat([-66.1568, -17.3895]), // Cochabamba
                    zoom: 13
                })
            });

            // Ocultar loading y notificar que el mapa está listo
            setTimeout(function() {
                document.getElementById('loading').style.display = 'none';
                console.log('Mapa conductor cargado completamente');
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage('mapReady');
                }
            }, 2000);

            // Detectar errores de carga de tiles
            window.map.on('loadstart', function() {
                console.log('Iniciando carga de tiles...');
            });

            window.map.on('loadend', function() {
                console.log('Tiles cargados exitosamente');
            });

            // Funciones para actualizar marcadores
            function updateDriverLocation(lat, lng) {
                try {
                    window.driverSource.clear();
                    const coords = ol.proj.fromLonLat([lng, lat]);
                    const feature = new ol.Feature({ 
                        geometry: new ol.geom.Point(coords),
                        name: 'Tu vehículo',
                        type: 'driver'
                    });
                    window.driverSource.addFeature(feature);
                    
                    // Centrar mapa en la ubicación del conductor
                    window.map.getView().setCenter(coords);
                    window.map.getView().setZoom(15);
                } catch (e) { 
                    console.error('Error actualizando ubicación conductor:', e); 
                }
            }

            function updateTripRequests(requests) {
                try {
                    window.tripRequestsSource.clear();
                    if (!requests || !Array.isArray(requests)) return;
                    
                    requests.forEach(function(request) {
                        if (!request || !request.latitude || !request.longitude) return;
                        const coords = ol.proj.fromLonLat([request.longitude, request.latitude]);
                        const feature = new ol.Feature({ 
                            geometry: new ol.geom.Point(coords),
                            name: request.passengerName || 'Pasajero',
                            address: request.address || '',
                            fare: request.fare || 0,
                            passengerType: request.passengerType || '',
                            type: 'tripRequest'
                        });
                        window.tripRequestsSource.addFeature(feature);
                    });
                } catch (e) { 
                    console.error('Error actualizando solicitudes:', e); 
                }
            }

            function updateCurrentTrip(trip) {
                try {
                    window.currentTripSource.clear();
                    if (!trip) return;
                    
                    // Añadir marcador de pickup
                    if (trip.pickupLocation) {
                        const pickupCoords = ol.proj.fromLonLat([trip.pickupLocation.longitude, trip.pickupLocation.latitude]);
                        const pickupFeature = new ol.Feature({ 
                            geometry: new ol.geom.Point(pickupCoords),
                            name: 'Punto de recogida',
                            passenger: trip.passengerName,
                            type: 'pickup'
                        });
                        window.currentTripSource.addFeature(pickupFeature);
                    }
                    
                    // Añadir marcador de destino
                    if (trip.destinationLocation) {
                        const destCoords = ol.proj.fromLonLat([trip.destinationLocation.longitude, trip.destinationLocation.latitude]);
                        const destFeature = new ol.Feature({ 
                            geometry: new ol.geom.Point(destCoords),
                            name: 'Destino',
                            address: trip.destinationLocation.address,
                            type: 'destination'
                        });
                        window.currentTripSource.addFeature(destFeature);
                    }
                } catch (e) { 
                    console.error('Error actualizando viaje actual:', e); 
                }
            }

            // Manejar mensajes desde React Native
            function handleIncoming(event) {
                var data = event && event.data ? event.data : null;
                if (!data) return;
                try {
                    var msg = JSON.parse(data);
                    if (msg.type === 'updateDriverLocation') {
                        updateDriverLocation(msg.latitude, msg.longitude);
                    } else if (msg.type === 'updateTripRequests') {
                        updateTripRequests(msg.requests || []);
                    } else if (msg.type === 'updateCurrentTrip') {
                        updateCurrentTrip(msg.trip);
                    }
                } catch (err) {
                    // No es JSON válido, ignorar
                    console.log('Mensaje no JSON:', data);
                }
            }

            // Escuchar mensajes en ambos eventos (compatibilidad)
            window.addEventListener('message', handleIncoming);
            document.addEventListener('message', handleIncoming);
            
            console.log('✅ Mapa conductor inicializado correctamente');
        </script>
    </body>
    </html>`;
  };

  const updateDriverLocation = async () => {
    // Actualizar la ubicación del conductor en Firebase Firestore
    console.log('🚗 [CONDUCTOR] Actualizando ubicación del conductor...');
    if (!user) return;
    
    try {
      // Usar LocationService para obtener ubicación actualizada
      const res = await LocationService.getCurrentLocationWithAddress();
      if (res?.success && res?.location) {
        const payload = {
          latitude: res.location.latitude,
          longitude: res.location.longitude,
          accuracy: res.location.accuracy || null
        };
        await FirestoreLocationService.updateDriverLocation(user.uid, payload);
        console.log('✅ [CONDUCTOR] Ubicación actualizada:', payload);
        
        // Actualizar estado local
        setLocation({
          latitude: res.location.latitude,
          longitude: res.location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        // Actualizar marcador en el mapa
        if (mapReady && webViewRef.current) {
          updateDriverOnMap(res.location.latitude, res.location.longitude);
        }
      } else {
        throw new Error('No se pudo obtener ubicación con LocationService');
      }
    } catch (e) {
      console.error('❌ [CONDUCTOR] Error actualizando ubicación con LocationService:', e);
      // Fallback usando expo-location
      try {
        // eslint-disable-next-line global-require
        const Location = require('expo-location');
        const loc = await Location.getCurrentPositionAsync({});
        const payload = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy || null
        };
        await FirestoreLocationService.updateDriverLocation(user.uid, payload);
        console.log('✅ [CONDUCTOR] Ubicación actualizada (fallback):', payload);
      } catch (err2) {
        console.error('❌ [CONDUCTOR] Error en fallback:', err2);
      }
    }
  };

  // Intervalo para enviar ubicación cada 10s cuando está online
  useEffect(() => {
    let id;
    if (isOnline) {
      // enviar inmediatamente
      updateDriverLocation();
      id = setInterval(() => {
        updateDriverLocation();
      }, 10000);
    } else {
      // marcar offline en Firestore
      (async () => {
        try {
          if (user) await FirestoreLocationService.setDriverOffline(user.uid);
        } catch (e) { console.warn('setDriverOffline failed', e); }
      })();
    }

    return () => {
      if (id) clearInterval(id);
    };
  }, [isOnline, user]);

  const loadTripRequests = () => {
    // Simulación de solicitudes de viaje
    const mockRequests = [
      {
        id: '1',
        passengerName: 'Ana López',
        pickupLocation: {
          latitude: -17.3895 + (Math.random() - 0.5) * 0.005,
          longitude: -66.1568 + (Math.random() - 0.5) * 0.005,
          address: 'Av. América'
        },
        destinationLocation: {
          latitude: -17.3895 + (Math.random() - 0.5) * 0.01,
          longitude: -66.1568 + (Math.random() - 0.5) * 0.01,
          address: 'Plaza 14 de Septiembre'
        },
        passengerType: 'Universitario',
        fare: 1.0,
        timestamp: new Date()
      }
    ];
    setTripRequests(mockRequests);
  };

  const toggleOnlineStatus = async () => {
    if (!location) {
      Alert.alert('Error', 'Necesitas activar la ubicación primero');
      return;
    }
    
    const newOnlineStatus = !isOnline;
    
    try {
      if (!newOnlineStatus && user) {
        // Si se está desconectando, marcar como offline en Firestore
        console.log('🔴 [CONDUCTOR] Desconectando...');
        await FirestoreLocationService.setDriverOffline(user.uid);
        console.log('✅ [CONDUCTOR] Marcado como offline');
      }
      
      setIsOnline(newOnlineStatus);
      
      if (newOnlineStatus) {
        console.log('🟢 [CONDUCTOR] Conectando...');
        // Si se está conectando, inmediatamente actualizar ubicación
        updateDriverLocation();
      }
      
    } catch (error) {
      console.error('❌ Error al cambiar estado online:', error);
      Alert.alert('Error', 'No se pudo cambiar el estado. Intenta nuevamente.');
    }
  };

  const acceptTrip = (trip) => {
    Alert.alert(
      'Aceptar Viaje',
      `¿Aceptar el viaje de ${trip.passengerName}?\nTarifa: ${trip.fare} Bs`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Aceptar',
          onPress: () => {
            setCurrentTrip(trip);
            setTripRequests(prev => prev.filter(t => t.id !== trip.id));
            Alert.alert('Éxito', 'Viaje aceptado. Dirígete al punto de recogida.');
          }
        }
      ]
    );
  };

  const completeTrip = () => {
    Alert.alert(
      'Completar Viaje',
      '¿Has completado el viaje?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Sí',
          onPress: () => {
            setCurrentTrip(null);
            Alert.alert('Éxito', 'Viaje completado exitosamente.');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: 15 + statusBarHeight }]}>
        <View>
          <Text style={styles.welcome}>
            Conductor: {userProfile?.firstName || user?.displayName || 'Usuario'}
          </Text>
          <Text style={styles.userInfo}>
            Rol: Conductor
            {userProfile?.vehicleInfo?.plate ? ` • Placa: ${userProfile.vehicleInfo.plate}` : ''}
            {userProfile?.vehicleInfo?.model ? ` • ${userProfile.vehicleInfo.model}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusLabel}>Estado:</Text>
        <Text style={[styles.statusText, { color: isOnline ? '#4CAF50' : '#F44336' }]}>
          {isOnline ? 'EN LÍNEA' : 'DESCONECTADO'}
        </Text>
        <Switch
          value={isOnline}
          onValueChange={toggleOnlineStatus}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isOnline ? '#f5dd4b' : '#f4f3f4'}
        />
      </View>

      {location ? (
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: generateMapHTML() }}
            style={styles.map}
            onMessage={(event) => {
              try {
                const message = event.nativeEvent.data;
                console.log('[CONDUCTOR] Mensaje del mapa:', message);
                
                // Manejar cuando el mapa esté listo
                if (message === 'mapReady') {
                  console.log('✅ [CONDUCTOR] Mapa listo - inicializando marcadores');
                  setMapReady(true);
                  return;
                }
                
                // Intentar parsear como JSON solo si no es el mensaje 'mapReady'
                try {
                  const data = JSON.parse(message);
                  if (data.type === 'mapClick') {
                    console.log('[CONDUCTOR] Click en mapa:', data.latitude, data.longitude);
                  }
                } catch (jsonError) {
                  // Ignorar mensajes que no sean JSON válidos
                  console.log('[CONDUCTOR] Mensaje no JSON del mapa:', message);
                }
              } catch (error) {
                console.log('[CONDUCTOR] Error general procesando mensaje:', error);
              }
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            mixedContentMode="compatibility"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo={false}
            bounces={false}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Cargando mapa del conductor...</Text>
              </View>
            )}
            onLoadEnd={() => {
              console.log('[CONDUCTOR] WebView cargado - esperando mensaje mapReady del HTML');
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('[CONDUCTOR] WebView error:', nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('[CONDUCTOR] WebView HTTP error:', nativeEvent);
            }}
          />
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text>Obteniendo ubicación...</Text>
        </View>
      )}

      <View style={styles.bottomPanel}>
        {currentTrip ? (
          <View style={styles.currentTripPanel}>
            <Text style={styles.panelTitle}>Viaje Actual</Text>
            <Text style={styles.passengerName}>Pasajero: {currentTrip.passengerName}</Text>
            <Text style={styles.fareAmount}>Tarifa: {currentTrip.fare} Bs</Text>
            <Text style={styles.pickupAddress}>
              Recogida: {currentTrip.pickupLocation.address}
            </Text>
            <Text style={styles.destinationAddress}>
              Destino: {currentTrip.destinationLocation.address}
            </Text>
            
            <TouchableOpacity 
              style={styles.completeButton} 
              onPress={completeTrip}
            >
              <Text style={styles.buttonText}>Completar Viaje</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.requestsPanel}>
            <Text style={styles.panelTitle}>
              Solicitudes de Viaje ({tripRequests.length})
            </Text>
            
            {tripRequests.length > 0 ? (
              tripRequests.map(trip => (
                <View key={trip.id} style={styles.tripRequest}>
                  <Text style={styles.passengerName}>{trip.passengerName}</Text>
                  <Text style={styles.passengerType}>{trip.passengerType}</Text>
                  <Text style={styles.fareAmount}>{trip.fare} Bs</Text>
                  <TouchableOpacity 
                    style={styles.acceptButton} 
                    onPress={() => acceptTrip(trip)}
                  >
                    <Text style={styles.buttonText}>Aceptar</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.noRequestsText}>
                {isOnline ? 'Esperando solicitudes...' : 'Conéctate para recibir solicitudes'}
              </Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    paddingBottom: 12,
    paddingHorizontal: 15,
    backgroundColor: '#4CAF50',
  },
  welcome: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  logoutText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  map: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  bottomPanel: {
    backgroundColor: '#ffffff',
    maxHeight: '40%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 12, // Respeta el área inferior
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  currentTripPanel: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20 + (Platform.OS === 'ios' ? 34 : 12), // Espacio adicional para área inferior
  },
  requestsPanel: {
    maxHeight: 300,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12, // Espacio adicional para área inferior
  },
  tripRequest: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passengerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  passengerType: {
    fontSize: 14,
    color: '#666',
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  pickupAddress: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  destinationAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  completeButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  noRequestsText: {
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20 + (Platform.OS === 'ios' ? 34 : 12), // Espacio adicional para área inferior
    color: '#666',
    fontSize: 16,
  },
});

export default DriverScreen;
