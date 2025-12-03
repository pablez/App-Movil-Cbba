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
  ActivityIndicator,
  AppState
} from 'react-native';
import { WebView } from 'react-native-webview';
// 🗺️ USANDO OPENROUTESERVICE COMPLETO:
// - Mapa visual: OpenLayers + OpenRouteService tiles
// - Servicios: LocationService (OpenRouteService API wrapper)
// - Geocodificación, routing y ubicación: OpenRouteService
import LocationService from '../services/LocationService';
import { doc, getDoc } from 'firebase/firestore';
import { LocationService as FirestoreLocationService } from '../services/firestoreService';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  const { user } = useAuth();
  const webViewRef = useRef(null);
  const navigation = useNavigation();
  const appStateRef = useRef(AppState.currentState);
  // Refs para evitar closures en useEffect y mantener estado actualizado sin recrear efectos
  const mapReadyRef = useRef(false);
  const locationRef = useRef(null);
  const driversRef = useRef([]);
  const driversDebounceRef = useRef(null);
  const locationDebounceRef = useRef(null);

  // Altura de la barra de estado (Android) para ajustar el padding superior
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  // Manejar cambios en el estado de la app (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      appStateRef.current = nextAppState;
      // Si la app vuelve al foreground, refrescar datos
      if (nextAppState === 'active' && mapReadyRef.current) {
        // Pequeño delay para asegurar que el WebView esté listo
        setTimeout(() => {
          const loc = locationRef.current;
          const drvs = driversRef.current;
          if (loc && loc.latitude && loc.longitude) {
            updateLocationOnMap(loc.latitude, loc.longitude);
          }
          if (drvs && drvs.length > 0) {
            updateDriversOnMap(drvs);
          }
        }, 1000);
      }
    };

    // Registrar una sola vez el listener de AppState
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [mapReady, location, drivers]);

  useEffect(() => {
    // No solicitar ubicación automáticamente al iniciar sesión.
    // La ubicación del pasajero se obtendrá cuando el usuario pulse el botón de localizar.
    loadUserProfile();

    // Suscribirse a conductores en tiempo real con debouncing estable (guardamos refs)
    const unsub = FirestoreLocationService.getNearbyDrivers((driversData) => {
      // Solo actualizar estado si la app está activa
      if (appStateRef.current !== 'active') return;

      // Actualizar refs y estado React
      driversRef.current = driversData || [];
      setDrivers(driversData || []);

      // Debounce estable usando ref (evita recreaciones y closures)
      if (driversDebounceRef.current) clearTimeout(driversDebounceRef.current);
      driversDebounceRef.current = setTimeout(() => {
        if (mapReadyRef.current && webViewRef.current && appStateRef.current === 'active') {
          updateDriversOnMap(driversRef.current);
        }
      }, 500);
    });

    return () => {
      if (unsub) unsub();
      if (driversDebounceRef.current) clearTimeout(driversDebounceRef.current);
    };
  }, []); // Solo ejecutar una vez al montar

  // Actualizar conductores cuando el mapa esté listo (solo si hay cambios significativos)
  // Cuando el mapa cambia a ready, sincronizamos desde las refs (evita closures)
  useEffect(() => {
    console.log('🔄 useEffect mapReady disparado:', mapReady);
    
    if (mapReady) {
      console.log('✅ Mapa marcado como ready');
      mapReadyRef.current = true;
      
      if (driversRef.current && driversRef.current.length > 0 && webViewRef.current && appStateRef.current === 'active') {
        console.log('🚗 Sincronizando', driversRef.current.length, 'conductores');
        updateDriversOnMap(driversRef.current);
      }
      
      // También sincronizar ubicación actual
      const loc = locationRef.current;
      if (loc && loc.latitude && loc.longitude) {
        console.log('📍 Sincronizando ubicación actual:', loc);
        updateLocationOnMap(loc.latitude, loc.longitude);
      } else {
        console.log('ℹ️ No hay ubicación para sincronizar');
      }
    } else {
      console.log('❌ Mapa marcado como no ready');
      mapReadyRef.current = false;
    }
  }, [mapReady]);

  // Actualizar ubicación en el mapa cuando cambie (con debouncing)
  // Manejo de cambios de ubicación con debounce estable y usando refs
  useEffect(() => {
    // Mantener referencia siempre actualizada
    locationRef.current = location;

    if (!mapReadyRef.current || !location) return;

    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    locationDebounceRef.current = setTimeout(() => {
      const loc = locationRef.current;
      if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && appStateRef.current === 'active') {
        updateLocationOnMap(loc.latitude, loc.longitude);
      }
    }, 250);

    return () => {
      if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    };
  }, [location?.latitude, location?.longitude, mapReady]);

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
      // Mantener ref sincronizada
      locationRef.current = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

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
        locationRef.current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setPermissionDenied(false);
      } catch (err2) {
        console.error('Fallback expo-location también falló:', err2);
        Alert.alert('Error', 'No se pudo obtener la ubicación');
      }
    }
  };

  // Actualizar ubicación en el mapa web (optimizado y seguro)
  const updateLocationOnMap = (latitude, longitude) => {
    console.log('🔄 updateLocationOnMap llamado:', { latitude, longitude });
    console.log('🔄 Estado del mapa:', { 
      webViewReady: !!webViewRef.current, 
      mapReady: mapReadyRef.current 
    });
    
    if (!webViewRef.current || !mapReadyRef.current) {
      console.log('⚠️ WebView o mapa no están listos');
      return;
    }
    
    try {
      // Validar coordenadas antes de enviar
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        console.warn('❌ Coordenadas inválidas - tipos:', typeof latitude, typeof longitude);
        return;
      }
      if (isNaN(latitude) || isNaN(longitude)) {
        console.warn('❌ Coordenadas NaN:', { latitude, longitude });
        return;
      }
      
      const message = JSON.stringify({ 
        type: 'updateLocation', 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude) 
      });
      
      console.log('📡 Enviando mensaje al WebView:', message);
      webViewRef.current.postMessage(message);
      console.log('✅ Mensaje enviado exitosamente');
    } catch (error) {
      console.error('❌ Error enviando ubicación al mapa:', error);
    }
  };

  // Actualizar conductores en el mapa web (optimizado)
  const updateDriversOnMap = (driversData) => {
    if (!webViewRef.current || !mapReadyRef.current || !driversData) return;
    
    try {
      // Filtrar solo conductores válidos para reducir carga
      const validDrivers = driversData.filter(driver => 
        driver && 
        typeof driver.latitude === 'number' && 
        typeof driver.longitude === 'number' &&
        !isNaN(driver.latitude) && 
        !isNaN(driver.longitude)
      );

      if (validDrivers.length === 0) return;

      const message = JSON.stringify({
        type: 'updateDrivers', 
        drivers: validDrivers.map(driver => ({
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
    } catch (error) {
      console.warn('Error enviando conductores al mapa:', error);
    }
  };

  // Manejar botón de localizar: centrar mapa en la ubicación del usuario cuando éste lo solicite
  const handleLocatePress = async () => {
    console.log('🎯 handleLocatePress iniciado');
    console.log('🎯 Estado actual:', {
      mapReady: mapReadyRef.current,
      hasLocation: !!locationRef.current,
      webViewRef: !!webViewRef.current
    });
    
    try {
      if (!mapReadyRef.current) {
        console.log('❌ Mapa no está listo');
        Alert.alert('Mapa no listo', 'Espera a que el mapa termine de cargar.');
        return;
      }

      // Si no tenemos ubicación, solicitarla (getCurrentLocation actualizará locationRef)
      if (!locationRef.current) {
        console.log('📍 No hay ubicación, solicitando...');
        await getCurrentLocation();
        console.log('📍 Ubicación obtenida:', locationRef.current);
      }

      const loc = locationRef.current;
      if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        console.log('✅ Enviando ubicación al mapa:', loc);
        updateLocationOnMap(loc.latitude, loc.longitude);
      } else {
        console.log('❌ Ubicación no válida:', loc);
        Alert.alert('Ubicación no disponible', 'No se pudo obtener tu ubicación.');
      }
    } catch (err) {
      console.error('❌ Error al centrar ubicación:', err);
      Alert.alert('Error', 'Hubo un problema al obtener tu ubicación: ' + err.message);
    }
  };

  // Generar HTML del mapa con OpenLayers - Versión simplificada y confiable
  const generateMapHTML = () => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mapa Pasajero</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v7.4.0/ol.css">
        <style>
            * { box-sizing: border-box; }
            html, body { 
                margin: 0; 
                padding: 0; 
                width: 100%; 
                height: 100%; 
                overflow: hidden;
                font-family: Arial, sans-serif;
            }
            #map { 
                width: 100%; 
                height: 100%; 
                background: #e8f4f8;
                position: relative;
            }
            .loading-indicator {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #2196F3;
                color: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 1000;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div id="loading" class="loading-indicator">🗺️ Cargando mapa...</div>
        <div id="map"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/ol@v7.4.0/dist/ol.js"></script>
        <script>
            console.log('🚀 Iniciando mapa de Cochabamba...');
            
            var loadingElement = document.getElementById('loading');
            
            try {
                // Crear fuentes de vectores
                console.log('📦 Creando fuentes de vectores...');
                window.passengerSource = new ol.source.Vector();
                window.driversSource = new ol.source.Vector();
                
                // Crear estilos
                console.log('🎨 Creando estilos...');
                var passengerStyle = new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 12,
                        fill: new ol.style.Fill({ color: '#2196F3' }),
                        stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
                    })
                });
                
                var driverStyle = new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 10,
                        fill: new ol.style.Fill({ color: '#FF5722' }),
                        stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
                    })
                });
                
                // Configurar vista centrada en Cochabamba
                console.log('🗺️ Configurando vista de Cochabamba...');
                var cochabambaCenter = [-66.1568, -17.3895];
                var centerProjected = ol.proj.fromLonLat(cochabambaCenter);
                
                var view = new ol.View({
                    center: centerProjected,
                    zoom: 12,
                    minZoom: 8,
                    maxZoom: 18
                });
                
                // Crear fuente OpenRouteService (tiles oficiales)
                console.log('🌍 Creando fuente OpenRouteService...');
                var orsSource = new ol.source.XYZ({
                    url: 'https://maps.openrouteservice.org/tiles/{z}/{x}/{y}.png',
                    crossOrigin: 'anonymous',
                    attributions: '© <a href="https://openrouteservice.org/">OpenRouteService</a> | © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                });
                
                // Crear capas
                console.log('📋 Creando capas...');
                var tileLayer = new ol.layer.Tile({
                    source: orsSource
                });
                
                var passengerLayer = new ol.layer.Vector({ 
                    source: window.passengerSource,
                    style: passengerStyle
                });
                
                var driverLayer = new ol.layer.Vector({ 
                    source: window.driversSource,
                    style: driverStyle
                });
                
                // Crear mapa principal
                console.log('🎯 Creando mapa...');
                window.map = new ol.Map({
                    target: 'map',
                    layers: [tileLayer, passengerLayer, driverLayer],
                    view: view
                });
                
                // Esperar a que se complete el render
                window.map.once('rendercomplete', function() {
                    console.log('✅ Mapa renderizado correctamente');
                    loadingElement.style.display = 'none';
                    
                    // Notificar a React Native que el mapa está listo
                    if (window.ReactNativeWebView) {
                        setTimeout(function() {
                            window.ReactNativeWebView.postMessage('mapReady');
                        }, 500);
                    }
                });
                
                // Timeout de seguridad por si algo falla
                setTimeout(function() {
                    console.log('⏰ Timeout - removiendo loading...');
                    loadingElement.style.display = 'none';
                    
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage('mapReady');
                    }
                }, 5000);
                
                window.mapInitialized = true;
                console.log('🎉 Inicialización completa');
                
            } catch (error) {
                console.error('❌ ERROR en inicialización:', error.message);
                loadingElement.innerHTML = '❌ Error: ' + error.message;
                
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage('error: ' + error.message);
                }
            }
            
            // Función para actualizar ubicación del pasajero
            function updatePassengerLocation(lat, lng) {
                if (!window.map || !window.passengerSource) {
                    console.warn('❌ Mapa no listo para actualizar ubicación');
                    return;
                }
                
                try {
                    console.log('📍 Actualizando ubicación:', lat, lng);
                    window.passengerSource.clear();
                    var coords = ol.proj.fromLonLat([lng, lat]);
                    var feature = new ol.Feature({ 
                        geometry: new ol.geom.Point(coords)
                    });
                    window.passengerSource.addFeature(feature);
                    window.map.getView().setCenter(coords);
                    window.map.getView().setZoom(15);
                    console.log('✅ Ubicación actualizada');
                } catch (e) { 
                    console.error('❌ Error actualizando ubicación:', e.message);
                }
            }

            // Función para actualizar conductores
            function updateDrivers(drivers) {
                if (!window.map || !window.driversSource) {
                    console.warn('❌ Mapa no listo para conductores');
                    return;
                }
                
                try {
                    console.log('🚗 Actualizando conductores:', drivers?.length || 0);
                    window.driversSource.clear();
                    
                    if (drivers && Array.isArray(drivers)) {
                        drivers.forEach(function(driver, index) {
                            if (driver && typeof driver.latitude === 'number' && typeof driver.longitude === 'number') {
                                var coords = ol.proj.fromLonLat([driver.longitude, driver.latitude]);
                                var feature = new ol.Feature({ 
                                    geometry: new ol.geom.Point(coords),
                                    name: driver.name || 'Conductor ' + (index + 1)
                                });
                                window.driversSource.addFeature(feature);
                            }
                        });
                    }
                    console.log('✅ Conductores actualizados');
                } catch (e) { 
                    console.error('❌ Error actualizando conductores:', e.message);
                }
            }

            // Manejo de mensajes de React Native
            function handleMessage(event) {
                if (!window.mapInitialized) {
                    console.warn('❌ Mensaje recibido pero mapa no inicializado');
                    return;
                }
                
                var data = event && event.data ? event.data : null;
                if (!data) return;
                
                try {
                    var msg = JSON.parse(data);
                    console.log('📨 Mensaje recibido:', msg.type);
                    
                    if (msg.type === 'updateLocation' && msg.latitude && msg.longitude) {
                        updatePassengerLocation(msg.latitude, msg.longitude);
                    } else if (msg.type === 'updateDrivers' && msg.drivers) {
                        updateDrivers(msg.drivers);
                    }
                } catch (err) {
                    console.log('📨 Mensaje no JSON recibido:', data.substring(0, 50));
                }
            }

            // Escuchar mensajes
            window.addEventListener('message', handleMessage);
            document.addEventListener('message', handleMessage);
            
            console.log('🎯 Mapa listo para mensajes');
        </script>
    </body>
    </html>`;
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
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: generateMapHTML() }}
          style={styles.map}
          androidLayerType="hardware"
          onMessage={(event) => {
            const message = event.nativeEvent.data;
            console.log('📨 Mensaje del WebView:', message);
            
            if (message === 'mapReady') {
              console.log('✅ Mapa confirmado como listo');
              setMapReady(true);
              mapReadyRef.current = true;
            } else if (message.startsWith('debug:')) {
              console.log('🔍 DEBUG WebView:', message);
            } else if (message.startsWith('error:')) {
              console.error('❌ ERROR WebView:', message);
              Alert.alert('Error en el mapa', message.replace('error:', ''));
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

      {/* Botón flotante para abrir el Drawer (arriba a la izquierda) */}
      <TouchableOpacity
        style={[styles.fab, { top: 10 + statusBarHeight, left: 10 }]}
        onPress={() => {
          try {
            navigation.openDrawer();
          } catch (e) {
            console.warn('openDrawer no disponible:', e);
          }
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="menu" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Botón flotante para búsqueda de rutas (arriba a la derecha) */}
      <TouchableOpacity
        style={[styles.fab, { top: 10 + statusBarHeight, right: 10 }]}
        onPress={() => navigation.navigate('RouteSearch')}
        activeOpacity={0.8}
      >
        <Ionicons name="navigate" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Botón flotante para centrar la ubicación (naranja) */}
      <TouchableOpacity
        style={[styles.fabLocate, { top: 580 + statusBarHeight, right: 20 }]}
        onPress={handleLocatePress}
        activeOpacity={0.85}
      >
        <Ionicons name="locate" size={26} color="#ffffff" />
      </TouchableOpacity>

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

        {/* Botón para planificar ruta */}
        <TouchableOpacity 
          style={styles.routeButton} 
          onPress={() => navigation.navigate('RouteSearch')}
        >
          <Ionicons name="map" size={20} color="#2E86AB" />
          <Text style={styles.routeButtonText}>Planificar Ruta</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 15,
    paddingBottom: 12,
    paddingHorizontal: 15,
    backgroundColor: '#2E86AB',
    position: 'relative',
  },
  welcome: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userRole: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 2,
    textAlign: 'center',
  },
  addressText: {
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
    textAlign: 'center',
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
  map: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    position: 'relative',
    overflow: 'hidden',
  },
  fab: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2E86AB',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },

  // Estilo para botón localizar (naranja)
  fabLocate: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF8A00',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
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
    marginBottom: 10,
  },
  requestButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  routeButton: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2E86AB',
  },
  routeButtonText: {
    color: '#2E86AB',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default PassengerScreen;