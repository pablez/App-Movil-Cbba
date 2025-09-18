import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import LocationService from '../services/LocationService';
import { ROUTE_150_DATA, ROUTE_230_DATA, ROUTE_INFO } from '../data/routes';
import { Modal } from 'react-native';

const RouteSearchScreen = () => {
  const [mapReady, setMapReady] = useState(false);
  const [originPoint, setOriginPoint] = useState(null);
  const [destinationPoint, setDestinationPoint] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [selectingPoint, setSelectingPoint] = useState(null); // 'origin' | 'destination' | null
  const { user } = useAuth();
  const webViewRef = useRef(null);
  const navigation = useNavigation();
  const [linesModalVisible, setLinesModalVisible] = useState(false);

  // Altura de la barra de estado (Android) para ajustar el padding superior
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  // Función para calcular ruta entre origen y destino (usa LocationService.getOptimalRoute)
  const calculateRoute = async (origin, destination) => {
    try {
      console.log('🛣️ Calculando ruta optimizada (LocationService) entre:', origin, destination);

      if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) {
        console.error('Coordenadas inválidas:', { origin, destination });
        createSimpleRoute(origin, destination);
        return;
      }

      // Pedimos la ruta optimizada (shortest) usando LocationService centralizado
      const routeResult = await LocationService.getOptimalRoute(
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude },
        'driving-car'
      );

      console.log('📡 Resultado LocationService.getOptimalRoute:', routeResult && {
        success: routeResult.success,
        distance: routeResult.distance,
        duration: routeResult.duration,
        coordsCount: routeResult.coordinates ? routeResult.coordinates.length : 0
      });

      if (!routeResult || !routeResult.success || !routeResult.coordinates || routeResult.coordinates.length === 0) {
        console.warn('LocationService no devolvió ruta válida, usando fallback simple');
        createSimpleRoute(origin, destination);
        return;
      }

      // LocationService devuelve coordinates en formato [lng, lat]
      const routeGeoJSON = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {
            summary: {
              distance: routeResult.distance, // metros
              duration: routeResult.duration  // segundos
            }
          },
          geometry: {
            type: 'LineString',
            coordinates: routeResult.coordinates
          }
        }]
      };

      setRouteData(routeGeoJSON);

      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({ type: 'showRoute', route: routeGeoJSON }));
      }
    } catch (error) {
      console.error('Error en calculateRoute (LocationService):', error);
      createSimpleRoute(origin, destination);
    }
  };

  // Fallback para crear una ruta simple directa
  const createSimpleRoute = (origin, destination) => {
    // Validar que tengamos coordenadas válidas
    if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) {
      console.error('No se puede crear ruta simple: coordenadas inválidas', { origin, destination });
      return;
    }

    const distance = calculateDistance(origin, destination) * 1000; // en metros
    const duration = calculateDistance(origin, destination) * 60 * 2; // estimación: 2 min por km

    const routeGeoJSON = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {
          summary: {
            distance: distance,
            duration: duration
          }
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [origin.longitude, origin.latitude],
            [destination.longitude, destination.latitude]
          ]
        }
      }]
    };
    
    setRouteData(routeGeoJSON);
    
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'showRoute',
        route: routeGeoJSON
      }));
    }
  };

  // Mostrar una línea (o varias) predefinida(s) en el mapa web
  const showPredefinedLine = (which) => {
    try {
      let features = [];
      if (which === '150' || which === 'all') {
        const f150 = ROUTE_150_DATA.features && ROUTE_150_DATA.features[0];
        if (f150) features.push({ type: 'Feature', properties: { name: ROUTE_INFO.line150.name, color: ROUTE_INFO.line150.color }, geometry: f150.geometry });
      }
      if (which === '230' || which === 'all') {
        const f230 = ROUTE_230_DATA.features && ROUTE_230_DATA.features[0];
        if (f230) features.push({ type: 'Feature', properties: { name: ROUTE_INFO.line230.name, color: ROUTE_INFO.line230.color }, geometry: f230.geometry });
      }

      if (features.length === 0) {
        Alert.alert('No hay líneas', 'No se encontraron datos de la(s) línea(s) solicitada(s).');
        return;
      }

      const payload = { type: 'FeatureCollection', features };
      setRouteData(payload);
      if (webViewRef.current) webViewRef.current.postMessage(JSON.stringify({ type: 'showRoute', route: payload }));
      setLinesModalVisible(false);
    } catch (e) {
      console.error('Error mostrando línea predefinida:', e);
      Alert.alert('Error', 'No se pudo mostrar la línea en el mapa.');
    }
  };

  // Calcular distancia entre dos puntos (fórmula de Haversine)
  const calculateDistance = (point1, point2) => {
    // Validar que los puntos tengan las propiedades necesarias
    if (!point1?.latitude || !point1?.longitude || !point2?.latitude || !point2?.longitude) {
      console.warn('Puntos inválidos para cálculo de distancia:', { point1, point2 });
      return 0;
    }

    const R = 6371; // Radio de la Tierra en km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Manejar selección de puntos en el mapa
  const handleMapClick = (latitude, longitude) => {
    // Validar que las coordenadas sean números válidos
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
        isNaN(latitude) || isNaN(longitude)) {
      console.warn('Coordenadas inválidas del click:', { latitude, longitude });
      return;
    }

    console.log('📍 Click en mapa:', { latitude, longitude, selecting: selectingPoint });

    if (selectingPoint === 'origin') {
      setOriginPoint({ latitude, longitude });
      setSelectingPoint(null);
    } else if (selectingPoint === 'destination') {
      setDestinationPoint({ latitude, longitude });
      setSelectingPoint(null);
    }
  };

  // Efecto para calcular ruta cuando tengamos origen y destino
  useEffect(() => {
    if (originPoint && destinationPoint) {
      calculateRoute(originPoint, destinationPoint);
    }
  }, [originPoint, destinationPoint]);

  // Efecto para actualizar puntos en el mapa
  useEffect(() => {
    if (mapReady && webViewRef.current) {
      if (originPoint) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'setOrigin',
          latitude: originPoint.latitude,
          longitude: originPoint.longitude
        }));
      }
      if (destinationPoint) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'setDestination',
          latitude: destinationPoint.latitude,
          longitude: destinationPoint.longitude
        }));
      }
    }
  }, [mapReady, originPoint, destinationPoint]);

  // Generar HTML del mapa especializado para búsqueda de rutas
  const generateMapHTML = () => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Búsqueda de Rutas - OpenRouteService</title>
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
        <div id="loading" class="loading">🗺️ Cargando mapa de rutas...</div>
        <div id="map"></div>
        <script>
            // Fuentes para marcadores y rutas
            window.originSource = new ol.source.Vector();
            window.destinationSource = new ol.source.Vector();
            window.routeSource = new ol.source.Vector();
            
            // Inicializar mapa con tiles OpenStreetMap
            window.map = new ol.Map({
                target: 'map',
                layers: [
                    // Capa base de OpenStreetMap
                    new ol.layer.Tile({
                        source: new ol.source.OSM({
                            url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                            attributions: '© OpenStreetMap contributors'
                        })
                    }),
                    // Capa de ruta (debe ir antes de los puntos para estar debajo)
                    new ol.layer.Vector({
                        source: window.routeSource,
                        style: new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: '#FF1744',
                                width: 5,
                                lineCap: 'round',
                                lineJoin: 'round'
                            })
                        })
                    }),
                    // Capa de origen
                    new ol.layer.Vector({
                        source: window.originSource,
                        style: new ol.style.Style({
                            image: new ol.style.Circle({
                                radius: 12,
                                fill: new ol.style.Fill({ color: '#4CAF50' }),
                                stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
                            }),
                            text: new ol.style.Text({
                                text: 'A',
                                font: 'bold 14px Arial',
                                fill: new ol.style.Fill({ color: '#ffffff' })
                            })
                        })
                    }),
                    // Capa de destino
                    new ol.layer.Vector({
                        source: window.destinationSource,
                        style: new ol.style.Style({
                            image: new ol.style.Circle({
                                radius: 12,
                                fill: new ol.style.Fill({ color: '#F44336' }),
                                stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
                            }),
                            text: new ol.style.Text({
                                text: 'B',
                                font: 'bold 14px Arial',
                                fill: new ol.style.Fill({ color: '#ffffff' })
                            })
                        })
                    })
                ],
                view: new ol.View({
                    center: ol.proj.fromLonLat([-66.1568, -17.3895]), // Cochabamba
                    zoom: 13
                })
            });

            // Detectar clics en el mapa
            window.map.on('click', function(evt) {
                const coords = ol.proj.toLonLat(evt.coordinate);
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'mapClick',
                        latitude: coords[1],
                        longitude: coords[0]
                    }));
                }
            });

            // Ocultar loading y notificar que el mapa está listo
            setTimeout(function() {
                document.getElementById('loading').style.display = 'none';
                console.log('Mapa de rutas cargado completamente');
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage('mapReady');
                }
            }, 2000);

            // Funciones para manejar puntos y rutas
            function setOriginPoint(lat, lng) {
                try {
                    window.originSource.clear();
                    const coords = ol.proj.fromLonLat([lng, lat]);
                    const feature = new ol.Feature({ 
                        geometry: new ol.geom.Point(coords),
                        name: 'Origen'
                    });
                    window.originSource.addFeature(feature);
                } catch (e) { 
                    console.error('Error estableciendo origen:', e); 
                }
            }

            function setDestinationPoint(lat, lng) {
                try {
                    window.destinationSource.clear();
                    const coords = ol.proj.fromLonLat([lng, lat]);
                    const feature = new ol.Feature({ 
                        geometry: new ol.geom.Point(coords),
                        name: 'Destino'
                    });
                    window.destinationSource.addFeature(feature);
                } catch (e) { 
                    console.error('Error estableciendo destino:', e); 
                }
            }

      function showRoute(routeData) {
        try {
          window.routeSource.clear();
          if (!routeData || !routeData.features || !routeData.features[0]) return;

          const feature = routeData.features[0];
          const geometry = feature.geometry;

          // Helper para añadir una LineString al source
          function addLineFromCoords(coordsArray) {
            const coords = coordsArray.map(coord => ol.proj.fromLonLat([coord[0], coord[1]]));
            const lineString = new ol.geom.LineString(coords);
            window.routeSource.addFeature(new ol.Feature({ geometry: lineString }));
          }

          if (geometry.type === 'LineString') {
            addLineFromCoords(geometry.coordinates);
          } else if (geometry.type === 'MultiLineString') {
            geometry.coordinates.forEach(segment => addLineFromCoords(segment));
          } else if (geometry.type === 'GeometryCollection' && Array.isArray(geometry.geometries)) {
            geometry.geometries.forEach(g => {
              if (g.type === 'LineString') addLineFromCoords(g.coordinates);
              else if (g.type === 'MultiLineString') g.coordinates.forEach(seg => addLineFromCoords(seg));
            });
          } else {
            // Si la geometría no es una línea esperada, intentar extraer coordenadas del feature directamente
            try {
              if (feature.geometry && feature.geometry.coordinates) {
                if (Array.isArray(feature.geometry.coordinates[0][0])) {
                  // MultiLineString-like
                  feature.geometry.coordinates.forEach(seg => addLineFromCoords(seg));
                } else {
                  addLineFromCoords(feature.geometry.coordinates);
                }
              }
            } catch (innerErr) {
              console.warn('No se pudo interpretar la geometría de la ruta:', innerErr);
            }
          }

          // Ajustar vista para mostrar toda la ruta si hay elementos
          try {
            const extent = window.routeSource.getExtent();
            if (extent && extent[0] !== Infinity && extent[2] !== -Infinity) {
              window.map.getView().fit(extent, { padding: [50,50,50,50], duration: 1000 });
            }
          } catch (fitErr) {
            console.warn('No se pudo ajustar la vista al extent:', fitErr);
          }
        } catch (e) {
          console.error('Error mostrando ruta:', e);
        }
      }

            function clearRoute() {
                try {
                    window.routeSource.clear();
                    window.originSource.clear();
                    window.destinationSource.clear();
                    // Volver al zoom por defecto
                    window.map.getView().animate({
                        center: ol.proj.fromLonLat([-66.1568, -17.3895]),
                        zoom: 13,
                        duration: 1000
                    });
                } catch (e) { 
                    console.error('Error limpiando ruta:', e); 
                }
            }

            // Manejar mensajes desde React Native
            function handleIncoming(event) {
                var data = event && event.data ? event.data : null;
                if (!data) return;
                try {
                    var msg = JSON.parse(data);
                    if (msg.type === 'setOrigin') {
                        setOriginPoint(msg.latitude, msg.longitude);
                    } else if (msg.type === 'setDestination') {
                        setDestinationPoint(msg.latitude, msg.longitude);
                    } else if (msg.type === 'showRoute') {
                        showRoute(msg.route);
                    } else if (msg.type === 'clearRoute') {
                        clearRoute();
                    }
                } catch (err) {
                    console.log('Mensaje no JSON:', data);
                }
            }

            // Escuchar mensajes en ambos eventos (compatibilidad)
            window.addEventListener('message', handleIncoming);
            document.addEventListener('message', handleIncoming);
            
            console.log('✅ Mapa de rutas inicializado correctamente');
        </script>
    </body>
    </html>`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header (título centrado). El botón de atrás se reemplaza por un botón flotante que abre el Drawer */}
      <View style={[styles.header, { paddingTop: 15 + statusBarHeight }]}>
        <Text style={styles.headerTitle}>Planificar Ruta</Text>
      </View>

      {/* Botón flotante para abrir el drawer - ocupa 75% del ancho */}
      <TouchableOpacity
        style={[styles.floatingButton, { top: 7 + statusBarHeight, left: 10 }]}
        onPress={() => {
          try {
            navigation.openDrawer();
          } catch (e) {
            console.warn('openDrawer no disponible:', e);
          }
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="menu" size={25} color="#fff" style={styles.floatingButtonIcon} />
        <Text style={styles.floatingButtonText}>Menú</Text>
      </TouchableOpacity>

      {/* Botón flotante naranja para seleccionar líneas (arriba-derecha) */}
      <TouchableOpacity
        style={[styles.linePickerFab, { top: 70 + statusBarHeight, right: 15 }]}
        onPress={() => setLinesModalVisible(true)}
        activeOpacity={0.9}
      >
        <Ionicons name="list" size={25} color="#fff" />
      </TouchableOpacity>

      {/* Modal simple para seleccionar líneas */}
      <Modal visible={linesModalVisible} transparent animationType="fade" onRequestClose={() => setLinesModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Mostrar línea</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => showPredefinedLine('all')}>
              <Text style={styles.modalButtonText}>Todas las líneas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: ROUTE_INFO.line150.color }]} onPress={() => showPredefinedLine('150')}>
              <Text style={styles.modalButtonText}>Línea 150</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: ROUTE_INFO.line230.color }]} onPress={() => showPredefinedLine('230')}>
              <Text style={styles.modalButtonText}>Línea 230</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ccc' }]} onPress={() => setLinesModalVisible(false)}>
              <Text style={[styles.modalButtonText, { color: '#222' }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Mapa */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: generateMapHTML() }}
          style={styles.map}
          onMessage={(event) => {
            try {
              const message = event.nativeEvent.data;
              console.log('Mensaje del mapa:', message);
              
              if (message === 'mapReady') {
                console.log('✅ Mapa de rutas listo');
                setMapReady(true);
                return;
              }
              
              try {
                const data = JSON.parse(message);
                if (data.type === 'mapClick') {
                  console.log('Click en mapa:', data.latitude, data.longitude);
                  handleMapClick(data.latitude, data.longitude);
                }
              } catch (jsonError) {
                console.log('Mensaje no JSON del mapa:', message);
              }
            } catch (error) {
              console.log('Error procesando mensaje:', error);
            }
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2E86AB" />
              <Text style={styles.loadingText}>Cargando mapa de rutas...</Text>
            </View>
          )}
        />
      </View>

      {/* Controles de selección */}
      <View style={styles.routeControls}>
        <View style={styles.routeInputs}>
          <TouchableOpacity
            style={[styles.routeButton, selectingPoint === 'origin' && styles.routeButtonActive]}
            onPress={() => setSelectingPoint(selectingPoint === 'origin' ? null : 'origin')}
          >
            <View style={styles.routeMarker}>
              <Text style={styles.routeMarkerText}>A</Text>
            </View>
            <Text style={styles.routeButtonText}>
              {originPoint ? '✅ Origen seleccionado' : 'Tocar para seleccionar origen'}
            </Text>
            {selectingPoint === 'origin' && (
              <Ionicons name="hand-left" size={20} color="#2E86AB" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.routeButton, selectingPoint === 'destination' && styles.routeButtonActive]}
            onPress={() => setSelectingPoint(selectingPoint === 'destination' ? null : 'destination')}
          >
            <View style={[styles.routeMarker, { backgroundColor: '#F44336' }]}>
              <Text style={styles.routeMarkerText}>B</Text>
            </View>
            <Text style={styles.routeButtonText}>
              {destinationPoint ? '✅ Destino seleccionado' : 'Tocar para seleccionar destino'}
            </Text>
            {selectingPoint === 'destination' && (
              <Ionicons name="hand-left" size={20} color="#F44336" />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Información de la ruta */}
        {originPoint && destinationPoint && routeData && (
          <View style={styles.routeInfo}>
            <View style={styles.routeStats}>
              <View style={styles.statItem}>
                <Ionicons name="speedometer" size={20} color="#2E7D32" />
                <Text style={styles.routeInfoText}>
                  {routeData?.features?.[0]?.properties?.summary?.distance 
                    ? (routeData.features[0].properties.summary.distance / 1000).toFixed(2)
                    : '0.00'} km
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time" size={20} color="#2E7D32" />
                <Text style={styles.routeInfoText}>
                  {routeData?.features?.[0]?.properties?.summary?.duration
                    ? Math.round(routeData.features[0].properties.summary.duration / 60)
                    : 0} min
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Botón para limpiar */}
        {(originPoint || destinationPoint) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setOriginPoint(null);
              setDestinationPoint(null);
              setRouteData(null);
              setSelectingPoint(null);
              if (webViewRef.current) {
                webViewRef.current.postMessage(JSON.stringify({ type: 'clearRoute' }));
              }
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.clearButtonText}>Nueva Búsqueda</Text>
          </TouchableOpacity>
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
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#2E86AB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40, // Mismo ancho que el botón back para centrar el título
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2E86AB',
    fontWeight: '600',
  },
  routeControls: {
    backgroundColor: '#ffffff',
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  routeInputs: {
    marginBottom: 15,
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  routeButtonActive: {
    borderColor: '#2E86AB',
    backgroundColor: '#E3F2FD',
  },
  routeMarker: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  routeMarkerText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  routeButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  routeInfo: {
    backgroundColor: '#f0f8f0',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 8,
  },
  clearButton: {
    flexDirection: 'row',
    backgroundColor: '#FF5722',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  floatingButton: {
    position: 'absolute',
    height: 48,
  // Width 25% de la pantalla para reducir largo del botón
  width: '25%',
    borderRadius: 10,
    backgroundColor: '#2E86AB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 1200,
  },
  floatingButtonIcon: {
    marginRight: 10,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linePickerFab: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 1300,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'stretch',
  },
  modalButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: { color: '#fff', fontWeight: '700' },
});

export default RouteSearchScreen;