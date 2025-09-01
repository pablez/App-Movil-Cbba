import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Platform,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
// Usamos LocationService (OpenRouteService wrapper) para obtener ubicación y dirección
import LocationService from '../services/LocationService';
import { doc, getDoc } from 'firebase/firestore';
import { LocationService as FirestoreLocationService } from '../services/firestoreService';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { PASSENGER_TYPES } from '../utils/constants';
import { db } from '../config/firebase';

const PassengerScreen = () => {
  const [location, setLocation] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [address, setAddress] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [fare, setFare] = useState(2.5);
  const [mapReady, setMapReady] = useState(false);
  const { user, logout } = useAuth();
  const webViewRef = useRef(null);

  // Altura de la barra de estado (Android) para ajustar el padding superior
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  useEffect(() => {
    getCurrentLocation();
    loadUserProfile();
    // Suscribirse a conductores en tiempo real
    const unsub = FirestoreLocationService.getNearbyDrivers((driversData) => {
      setDrivers(driversData);
      // Enviar conductores al mapa web cuando estén listos
      if (mapReady && webViewRef.current) {
        updateDriversOnMap(driversData);
      }
    });
    return () => { if (unsub) unsub(); };
  }, []);

  // Actualizar conductores cuando el mapa esté listo
  useEffect(() => {
    if (mapReady && drivers.length > 0) {
      updateDriversOnMap(drivers);
    }
  }, [mapReady, drivers]);

  // Actualizar ubicación en el mapa cuando cambie
  useEffect(() => {
    if (mapReady && location && webViewRef.current) {
      updateLocationOnMap(location.latitude, location.longitude);
    }
  }, [mapReady, location]);

  useEffect(() => {
    // Calcular tarifa cuando tengamos el perfil del usuario
    if (userProfile?.passengerType) {
      const passengerTypeConfig = Object.values(PASSENGER_TYPES).find(
        type => type.id === userProfile.passengerType
      );
      if (passengerTypeConfig) {
        setFare(passengerTypeConfig.price);
      }
    }
  }, [userProfile]);

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
      console.log('🔍 Obteniendo ubicación usando LocationService (ORS)');
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

      if (res.address && res.address.formatted) {
        console.log('📍 Dirección detectada:', res.address.formatted);
        setAddress(res.address.formatted);
      } else {
        setAddress(null);
      }
      setPermissionDenied(false);
    } catch (error) {
      console.warn('LocationService fallo, intentando fallback con expo-location:', error?.message || error);
      try {
        // Fallback directo usando Expo Location (si LocationService falló)
        // eslint-disable-next-line global-require
        const Location = require('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setPermissionDenied(true);
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
        setPermissionDenied(false);
      } catch (err2) {
        console.error('Fallback expo-location también falló:', err2);
        Alert.alert('Error', 'No se pudo obtener la ubicación');
      }
    }
  };

  // Actualizar ubicación en el mapa web
  const updateLocationOnMap = (latitude, longitude) => {
    if (webViewRef.current) {
      const message = JSON.stringify({
        type: 'updateLocation',
        latitude,
        longitude
      });
      webViewRef.current.postMessage(message);
    }
  };

  // Actualizar conductores en el mapa web  
  const updateDriversOnMap = (driversData) => {
    if (webViewRef.current) {
      const message = JSON.stringify({
        type: 'updateDrivers', 
        drivers: driversData.map(driver => ({
          id: driver.id,
          name: driver.name || 'Conductor',
          latitude: driver.latitude,
          longitude: driver.longitude,
          vehicle: driver.vehicle || '',
          plate: driver.plate || '',
          available: driver.available || true
        }))
      });
      webViewRef.current.postMessage(message);
    }
  };

  // Generar HTML del mapa con OpenRouteService - Versión simplificada y funcional
  const generateMapHTML = () => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mapa Pasajero - OpenRouteService</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v7.4.0/ol.css">
        <style>
            html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
            .loading { 
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(33, 150, 243, 0.9); color: white; padding: 15px 20px; 
                border-radius: 10px; z-index: 1000; text-align: center; font-family: Arial;
            }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/ol@v7.4.0/dist/ol.js"></script>
    </head>
    <body>
        <div id="loading" class="loading">📍 Cargando mapa del pasajero...</div>
        <div id="map"></div>
        <script>
            // Fuentes para marcadores
            window.passengerSource = new ol.source.Vector();
            window.driversSource = new ol.source.Vector();
            
            // Inicializar mapa con tiles OpenStreetMap (más confiables)
            window.map = new ol.Map({
                target: 'map',
                layers: [
                    // Capa base de OpenStreetMap (siempre funciona)
                    new ol.layer.Tile({
                        source: new ol.source.OSM({
                            url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                            attributions: '© OpenStreetMap contributors'
                        })
                    }),
                    // Capa de marcador del pasajero
                    new ol.layer.Vector({ 
                        source: window.passengerSource,
                        style: new ol.style.Style({
                            image: new ol.style.Circle({
                                radius: 10,
                                fill: new ol.style.Fill({ color: '#2196F3' }),
                                stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
                            })
                        })
                    }),
                    // Capa de conductores
                    new ol.layer.Vector({ 
                        source: window.driversSource,
                        style: new ol.style.Style({
                            image: new ol.style.Circle({
                                radius: 8,
                                fill: new ol.style.Fill({ color: '#FF5722' }),
                                stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
                            })
                        })
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
                console.log('Mapa cargado completamente');
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage('mapReady');
                }
            }, 2000); // Aumentamos el tiempo para asegurar que los tiles se carguen

            // Detectar errores de carga de tiles
            window.map.on('loadstart', function() {
                console.log('Iniciando carga de tiles...');
            });

            window.map.on('loadend', function() {
                console.log('Tiles cargados exitosamente');
            });

            // Funciones para actualizar marcadores
            function updatePassengerLocation(lat, lng) {
                try {
                    window.passengerSource.clear();
                    const coords = ol.proj.fromLonLat([lng, lat]);
                    const feature = new ol.Feature({ 
                        geometry: new ol.geom.Point(coords),
                        name: 'Tu ubicación'
                    });
                    window.passengerSource.addFeature(feature);
                    
                    // Centrar mapa en la ubicación del pasajero
                    window.map.getView().setCenter(coords);
                    window.map.getView().setZoom(15);
                } catch (e) { 
                    console.error('Error actualizando ubicación:', e); 
                }
            }

            function updateDrivers(drivers) {
                try {
                    window.driversSource.clear();
                    if (!drivers || !Array.isArray(drivers)) return;
                    
                    drivers.forEach(function(driver) {
                        if (!driver || !driver.latitude || !driver.longitude) return;
                        const coords = ol.proj.fromLonLat([driver.longitude, driver.latitude]);
                        const feature = new ol.Feature({ 
                            geometry: new ol.geom.Point(coords),
                            name: driver.name || 'Conductor',
                            vehicle: driver.vehicle || '',
                            plate: driver.plate || ''
                        });
                        window.driversSource.addFeature(feature);
                    });
                } catch (e) { 
                    console.error('Error actualizando conductores:', e); 
                }
            }

            // Manejar mensajes desde React Native
            function handleIncoming(event) {
                var data = event && event.data ? event.data : null;
                if (!data) return;
                try {
                    var msg = JSON.parse(data);
                    if (msg.type === 'updateLocation') {
                        updatePassengerLocation(msg.latitude, msg.longitude);
                    } else if (msg.type === 'updateDrivers') {
                        updateDrivers(msg.drivers || []);
                    }
                } catch (err) {
                    // No es JSON válido, ignorar
                    console.log('Mensaje no JSON:', data);
                }
            }

            // Escuchar mensajes en ambos eventos (compatibilidad)
            window.addEventListener('message', handleIncoming);
            document.addEventListener('message', handleIncoming);
            
            console.log('✅ Mapa pasajero inicializado correctamente');
        </script>
    </body>
    </html>`;
  };

  const loadNearbyDrivers = () => {
    // Simulación de conductores cercanos
    // En una aplicación real, esto vendría de Firebase Firestore
    const mockDrivers = [
      {
        id: '1',
        name: 'Juan Pérez',
        vehicle: 'Toyota Hiace',
        plate: 'CBB-1234',
        latitude: -17.3895 + (Math.random() - 0.5) * 0.01,
        longitude: -66.1568 + (Math.random() - 0.5) * 0.01,
        available: true
      },
      {
        id: '2',
        name: 'María García',
        vehicle: 'Ford Transit',
        plate: 'CBB-5678',
        latitude: -17.3895 + (Math.random() - 0.5) * 0.01,
        longitude: -66.1568 + (Math.random() - 0.5) * 0.01,
        available: true
      }
    ];
    setDrivers(mockDrivers);
  };

  const requestTrip = () => {
    if (!location) {
      Alert.alert('Error', 'Primero necesitamos tu ubicación');
      return;
    }

    const passengerTypeConfig = userProfile?.passengerType ? 
      Object.values(PASSENGER_TYPES).find(type => type.id === userProfile.passengerType) 
      : PASSENGER_TYPES.REGULAR;

    Alert.alert(
      'Solicitar Viaje',
      `¿Confirmas solicitar un viaje?\nTipo: ${passengerTypeConfig?.name || 'Regular'}\nTarifa: ${fare} Bs`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Confirmar',
          onPress: () => {
            // Aquí implementarías la lógica para crear el viaje en Firebase
            Alert.alert('Éxito', 'Solicitud enviada. Esperando conductor...');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
  <View style={[styles.header, { paddingTop: 15 + statusBarHeight }] }>
        <View>
          <Text style={styles.welcome}>
            Hola, {userProfile?.firstName || user?.displayName || 'Pasajero'}
          </Text>
          <Text style={styles.userRole}>
            Rol: Pasajero {userProfile?.passengerType ? 
              `• Tipo: ${Object.values(PASSENGER_TYPES).find(type => type.id === userProfile.passengerType)?.name || 'Regular'}` 
              : ''}
          </Text>
          {address ? (
            <Text style={styles.addressText}>📍 {address}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
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
                console.log('Mensaje del mapa:', message);
                
                // Manejar cuando el mapa esté listo
                if (message === 'mapReady') {
                  console.log('✅ Mapa listo - inicializando marcadores');
                  setMapReady(true);
                  return;
                }
                
                // Intentar parsear como JSON solo si no es el mensaje 'mapReady'
                try {
                  const data = JSON.parse(message);
                  if (data.type === 'mapClick') {
                    console.log('Click en mapa:', data.latitude, data.longitude);
                  }
                } catch (jsonError) {
                  // Ignorar mensajes que no sean JSON válidos
                  console.log('Mensaje no JSON del mapa:', message);
                }
              } catch (error) {
                console.log('Error general procesando mensaje:', error);
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
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Cargando mapa OpenRouteService...</Text>
              </View>
            )}
            onLoadEnd={() => {
              console.log('WebView cargado - esperando mensaje mapReady del HTML');
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error:', nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView HTTP error:', nativeEvent);
            }}
          />
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text>Obteniendo ubicación...</Text>
        </View>
      )}

      {permissionDenied && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>Permiso de ubicación denegado. Activa GPS en ajustes.</Text>
          <TouchableOpacity
            style={styles.openSettingsButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          >
            <Text style={styles.openSettingsText}>Abrir Ajustes</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomPanel}>
        <Text style={styles.panelTitle}>Solicitar Viaje</Text>
        
        <View style={styles.fareInfo}>
          <Text style={styles.fareLabel}>Tipo de pasajero:</Text>
          <Text style={styles.fareType}>
            {userProfile?.passengerType ? 
              Object.values(PASSENGER_TYPES).find(type => type.id === userProfile.passengerType)?.name 
              : 'Regular'}
          </Text>
          <Text style={styles.fareAmount}>{fare} Bs</Text>
        </View>

        <TouchableOpacity 
          style={styles.requestButton} 
          onPress={requestTrip}
        >
          <Text style={styles.requestButtonText}>Solicitar Viaje</Text>
        </TouchableOpacity>
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
    backgroundColor: '#2E86AB',
  },
  welcome: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 2,
  },
  addressText: {
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
  permissionBanner: {
    backgroundColor: '#ffeb3b',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permissionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginRight: 10,
  },
  openSettingsButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  openSettingsText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  logoutText: {
    color: '#2E86AB',
    fontWeight: 'bold',
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
    color: '#2196F3',
    fontWeight: '600',
  },
  bottomPanel: {
  backgroundColor: '#ffffff',
  paddingTop: 20,
  paddingHorizontal: 20,
  paddingBottom: 20 + (Platform.OS === 'ios' ? 34 : 12),
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
    marginBottom: 15,
    textAlign: 'center',
  },
  fareInfo: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  fareLabel: {
    fontSize: 16,
    color: '#666',
  },
  fareType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E86AB',
    textAlign: 'right',
  },
  requestButton: {
    backgroundColor: '#2E86AB',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  requestButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PassengerScreen;
