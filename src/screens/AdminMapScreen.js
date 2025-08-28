import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  Keyboard
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import LocationService from '../services/LocationService';

const AdminMapScreen = ({ navigation, route }) => {
  // ✅ Estados bien organizados
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const webViewRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // ✅ Manejo de efectos
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // ✅ Funciones bien estructuradas
  const getCurrentLocation = async () => {
    try {
      console.log('🔍 Obteniendo ubicación GPS...');
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permisos de ubicación denegados');
        setLoading(false);
        return;
      }

      const directLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      console.log('📍 Ubicación obtenida:', directLocation.coords);

      const locationData = {
        latitude: directLocation.coords.latitude,
        longitude: directLocation.coords.longitude,
        accuracy: directLocation.coords.accuracy,
        timestamp: new Date(directLocation.timestamp)
      };

      setLocation(locationData);
      setLoading(false);

      // Si el mapa ya está listo, actualizar la ubicación
      if (mapReady) {
        updateMapLocation(locationData.latitude, locationData.longitude);
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo ubicación:', error);
      setErrorMsg('Error obteniendo ubicación');
      setLoading(false);

      Alert.alert(
        'Error de GPS',
        'No se pudo obtener la ubicación actual. ¿Deseas intentar nuevamente?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reintentar', onPress: getCurrentLocation }
        ]
      );
    }
  };

  // 🚀 Actualizar ubicación en el mapa optimizado
  const updateMapLocation = async (latitude, longitude) => {
    if (webViewRef.current && mapReady) {
      try {
        // Obtener dirección usando la API de OpenRouteService
        const address = await getAddressFromCoordinates(latitude, longitude);
        
        const script = `
          if (window.updateLocation) {
            window.updateLocation(${latitude}, ${longitude}, "${address}");
            console.log('📍 Ubicación actualizada:', ${latitude}, ${longitude});
          } else {
            console.warn('⚠️ Función updateLocation no disponible');
          }
        `;
        
        webViewRef.current.postMessage(script);
      } catch (error) {
        console.error('❌ Error actualizando ubicación en mapa:', error);
        // Fallback sin dirección
        const script = `
          if (window.updateLocation) {
            window.updateLocation(${latitude}, ${longitude}, "Ubicación actual");
          }
        `;
        webViewRef.current.postMessage(script);
      }
    }
  };

  // 🌍 Obtener dirección desde coordenadas usando OpenRouteService API
  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      const API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjliYzhiZDJmY2RjMTQxNzRhZGRkM2UyZDUyNWRhYmJiIiwiaCI6Im11cm11cjY0In0=';
      const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${API_KEY}&point.lat=${latitude}&point.lon=${longitude}&size=1`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const address = data.features[0].properties;
          return address.label || `${address.locality || 'Cochabamba'}, Bolivia`;
        }
      }
      
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.warn('⚠️ Error obteniendo dirección:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  // 🔍 Búsqueda en tiempo real con debounce
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    
    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (text.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    // Debounce de 500ms para evitar muchas consultas
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(text);
    }, 500);
  };

  const performSearch = async (query) => {
    if (!query || query.length < 2) return;
    
    setSearching(true);
    try {
      const result = await LocationService.searchPlacesRealTime(query, location);
      if (result.success) {
        setSearchResults(result.places);
        setShowSearchResults(result.places.length > 0);
      } else {
        console.warn('⚠️ Error en búsqueda:', result.error);
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('❌ Error realizando búsqueda:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = async (place) => {
    setSearchQuery(place.name);
    setShowSearchResults(false);
    Keyboard.dismiss();
    
    // Actualizar mapa con la ubicación seleccionada
    await updateMapLocation(place.coordinates.latitude, place.coordinates.longitude);
    
    // Agregar marcador de búsqueda
    if (webViewRef.current && mapReady) {
      const script = `
        if (window.addSearchMarker) {
          window.clearSearchMarkers();
          window.addSearchMarker(
            ${place.coordinates.latitude}, 
            ${place.coordinates.longitude}, 
            "${place.name.replace(/"/g, '\\"')}", 
            "${place.address.replace(/"/g, '\\"')}"
          );
        }
      `;
      webViewRef.current.postMessage(script);
    }
  };

  // Centrar en la ubicación actual
  const centerOnLocation = () => {
    if (location) {
      updateMapLocation(location.latitude, location.longitude);
      console.log('📍 Centrando en ubicación:', location);
      
      // Limpiar marcadores de búsqueda
      if (webViewRef.current && mapReady) {
        const script = `if (window.clearSearchMarkers) { window.clearSearchMarkers(); }`;
        webViewRef.current.postMessage(script);
      }
    }
  };

  // 🚀 HTML del mapa optimizado con cache y mejor rendimiento
  const generateMapHTML = () => {    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>OpenRouteService Map - Cochabamba</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
              integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
        <style>
            html, body, #map { 
                margin: 0; padding: 0; width: 100%; height: 100%; 
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }
            .loading { 
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(33, 150, 243, 0.95); color: white; padding: 20px; 
                border-radius: 15px; z-index: 1000; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
            .loading-spinner { 
                width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.3); 
                border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite; 
                margin: 0 auto 10px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .location-info {
                position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.9);
                padding: 8px 12px; border-radius: 8px; font-size: 12px; z-index: 1000;
            }
        </style>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" 
                integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    </head>
    <body>
        <div id="loading" class="loading">
            <div class="loading-spinner"></div>
            <div>🗺️ Cargando Mapa de Cochabamba...</div>
        </div>
        <div id="map"></div>
        <div id="location-info" class="location-info" style="display:none;"></div>
        
        <script>
            // 🚀 Configuración optimizada con Leaflet (más rápido que OpenLayers)
            console.log('🗺️ Iniciando mapa...');
            
            // Inicializar mapa con Leaflet
            window.map = L.map('map', {
                center: [-17.3895, -66.1568], // Cochabamba
                zoom: 13,
                zoomControl: true,
                attributionControl: false,
                preferCanvas: true, // Mejor rendimiento
                maxZoom: 19,
                minZoom: 10
            });

            // Capa de tiles OpenStreetMap estándar (funciona sin API key)
            const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
                tileSize: 256,
                crossOrigin: true,
                // Cache optimization
                updateWhenIdle: true,
                updateWhenZooming: false,
                keepBuffer: 2
            });
            
            tileLayer.addTo(window.map);

            // Variables globales para marcadores
            window.currentLocationMarker = null;
            window.searchMarkers = [];

            // Custom icon para ubicación actual
            const locationIcon = L.divIcon({
                className: 'current-location-marker',
                html: \`<div style="
                    width: 20px; height: 20px; border-radius: 50%; 
                    background: #4CAF50; border: 3px solid white; 
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    animation: pulse 2s infinite;
                "></div>
                <style>
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
                </style>\`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            // Manejar carga del mapa
            let mapLoaded = false;
            tileLayer.on('load', function() {
                if (!mapLoaded) {
                    mapLoaded = true;
                    document.getElementById('loading').style.display = 'none';
                    console.log('✅ Mapa cargado correctamente');
                    
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage('mapReady');
                    }
                }
            });

            // Timeout de seguridad para ocultar loading
            setTimeout(function() {
                if (!mapLoaded) {
                    document.getElementById('loading').style.display = 'none';
                    console.log('⚠️ Mapa cargado por timeout');
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage('mapReady');
                    }
                }
            }, 3000);

            // Funciones para React Native
            window.updateLocation = function(lat, lng, address) {
                console.log('📍 Actualizando ubicación:', lat, lng);
                
                // Remover marcador anterior
                if (window.currentLocationMarker) {
                    window.map.removeLayer(window.currentLocationMarker);
                }
                
                // Agregar nuevo marcador
                window.currentLocationMarker = L.marker([lat, lng], {icon: locationIcon})
                    .addTo(window.map);
                
                // Centrar mapa
                window.map.setView([lat, lng], 16, {animate: true});
                
                // Mostrar info de ubicación
                if (address) {
                    const locationInfo = document.getElementById('location-info');
                    locationInfo.innerHTML = \`📍 \${address}\`;
                    locationInfo.style.display = 'block';
                }
            };

            window.addSearchMarker = function(lat, lng, title, address) {
                const marker = L.marker([lat, lng])
                    .addTo(window.map)
                    .bindPopup(\`<b>\${title}</b><br>\${address || ''}\`);
                
                window.searchMarkers.push(marker);
                return marker;
            };

            window.clearSearchMarkers = function() {
                window.searchMarkers.forEach(marker => {
                    window.map.removeLayer(marker);
                });
                window.searchMarkers = [];
            };

            // Manejo de mensajes desde React Native
            window.addEventListener('message', function(event) {
                try { eval(event.data); } catch (e) { console.error('❌ Error ejecutando script:', e); }
            });
            
            document.addEventListener('message', function(event) {
                try { eval(event.data); } catch (e) { console.error('❌ Error ejecutando script:', e); }
            });

            console.log('✅ Mapa inicializado correctamente');
        </script>
    </body>
    </html>`;
  };

  // ✅ Loading states
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>🔍 Obteniendo ubicación GPS...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>📍 Mapa Admin</Text>
          <Text style={styles.subtitle}>OpenRouteService - Cochabamba</Text>
        </View>
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar lugares en Cochabamba..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {searching && <ActivityIndicator size="small" color="#2196F3" />}
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchResults(false);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Resultados de búsqueda */}
      {showSearchResults && (
        <View style={styles.searchResultsContainer}>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchResultItem}
                onPress={() => selectSearchResult(item)}
              >
                <View style={styles.searchResultContent}>
                  <Text style={styles.searchResultName}>{item.name}</Text>
                  <Text style={styles.searchResultAddress}>{item.address}</Text>
                  {item.distance && (
                    <Text style={styles.searchResultDistance}>
                      📍 {item.distance.toFixed(1)} km
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            )}
            style={styles.searchResultsList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {/* Controles */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={[styles.controlButton, !location && styles.controlButtonDisabled]} 
          onPress={centerOnLocation}
          disabled={!location}
        >
          <Ionicons name="locate" size={20} color="#fff" />
          <Text style={styles.controlButtonText}>
            {location ? ' Mi Ubicación' : ' Obteniendo GPS...'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.locationText}>
          {location 
            ? `📍 ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
            : '🔍 Buscando ubicación...'
          }
        </Text>
      </View>

      {/* Mapa */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: generateMapHTML() }}
          style={styles.map}
          onMessage={(event) => {
            const message = event.nativeEvent.data;
            if (message === 'mapReady') {
              setMapReady(true);
              if (location) {
                updateMapLocation(location.latitude, location.longitude);
              }
            }
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>🗺️ Cargando mapa...</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
};

// ✅ Diseño optimizado para pantalla 6.43"
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 50, // Status bar space
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    marginRight: 15,
    padding: 8,
    borderRadius: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 2,
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  searchResultsContainer: {
    backgroundColor: '#fff',
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultsList: {
    backgroundColor: '#fff',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  searchResultAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  searchResultDistance: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 2,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  controlButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25, // Botones redondeados modernos
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  mapContainer: {
    flex: 1,
    margin: 8,
    borderRadius: 15, // Esquinas redondeadas
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default AdminMapScreen;
