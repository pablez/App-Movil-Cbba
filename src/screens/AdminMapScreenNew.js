import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import LocationService from '../services/LocationService';

const AdminMapScreen = ({ navigation, route }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const webViewRef = useRef(null);

  // Obtener ubicación actual al cargar el componente
  useEffect(() => {
    getCurrentLocation();
  }, []);

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

  // Actualizar ubicación en el mapa
  const updateMapLocation = (latitude, longitude) => {
    if (webViewRef.current) {
      const script = `
        if (window.map && window.vectorSource) {
          window.vectorSource.clear();
          
          const coords = ol.proj.fromLonLat([${longitude}, ${latitude}]);
          window.map.getView().setCenter(coords);
          window.map.getView().setZoom(16);
          
          const marker = new ol.Feature({
            geometry: new ol.geom.Point(coords)
          });
          
          marker.setStyle(new ol.style.Style({
            image: new ol.style.Circle({
              radius: 8,
              fill: new ol.style.Fill({ color: '#4CAF50' }),
              stroke: new ol.style.Stroke({ color: '#fff', width: 3 })
            })
          }));
          
          window.vectorSource.addFeature(marker);
          console.log('📍 Marcador actualizado:', ${latitude}, ${longitude});
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
    }
  };

  // Generar HTML del mapa con OpenRouteService
  const generateMapHTML = () => {    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>OpenRouteService Map</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v7.4.0/ol.css">
        <style>
            html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
            .loading { 
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(255,255,255,0.9); padding: 20px; border-radius: 10px;
                z-index: 1000; text-align: center;
            }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/ol@v7.4.0/dist/ol.js"></script>
    </head>
    <body>
        <div id="loading" class="loading">🗺️ Cargando mapa...</div>
        <div id="map"></div>
        <script>
            window.vectorSource = new ol.source.Vector();
            
            window.map = new ol.Map({
                target: 'map',
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.XYZ({
                            url: 'https://tiles.openrouteservice.org/osm/{z}/{x}/{y}.png'
                        })
                    }),
                    new ol.layer.Vector({ source: window.vectorSource })
                ],
                view: new ol.View({
                    center: ol.proj.fromLonLat([-66.1568, -17.3895]), // Cochabamba
                    zoom: 13
                })
            });

            window.map.on('loadend', function() {
                document.getElementById('loading').style.display = 'none';
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage('mapReady');
                }
            });

            window.addEventListener('message', function(event) {
                try { eval(event.data); } catch (e) { console.error(e); }
            });
            
            document.addEventListener('message', function(event) {
                try { eval(event.data); } catch (e) { console.error(e); }
            });
        </script>
    </body>
    </html>`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>🔍 Obteniendo ubicación GPS...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📍 Mapa Admin</Text>
        <Text style={styles.subtitle}>Gestión de ubicaciones</Text>
      </View>

      {/* Controles */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={[styles.controlButton, !location && styles.controlButtonDisabled]} 
          onPress={centerOnLocation}
          disabled={!location}
        >
          <Text style={styles.controlButtonText}>
            {location ? '🎯 Mi Ubicación' : '📍 Obteniendo GPS...'}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    textAlign: 'center',
    marginTop: 5,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  controlButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
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
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  mapContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 15,
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
