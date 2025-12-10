import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import HeaderWithDrawer from '../components/HeaderWithDrawer';
import { ROUTE_150_DATA, ROUTE_230_DATA, ROUTE_INFO } from '../data/routes';

const AdminMapScreen = ({ navigation, route }) => {
  // ✅ Estados bien organizados
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [routeData, setRouteData] = useState(null); // Para manejar rutas origen-destino
  const [pendingCustomRoute, setPendingCustomRoute] = useState(null); // Para guardar customRoute hasta que el mapa esté listo
  const webViewRef = useRef(null);

  // Obtener tipo de ruta de los parámetros
  const routeType = route?.params?.routeType || null;
  const editMode = route?.params?.editMode || false;

  // ✅ Manejo de efectos
  useEffect(() => {
    getCurrentLocation();
    
    // Configurar ruta si se pasó como parámetro
    if (routeType) {
      setCurrentRoute(routeType);
    }

    // Si venimos en modo edición, activar una bandera (el HTML manejará clicks)
    if (route?.params?.editMode) {
      // forzar pequeño re-render si es necesario
      console.log('✏️ Modo edición activado en AdminMap');
    }
  }, [routeType]);

  // Efecto para manejar la ubicación seleccionada desde LocationSearch
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Manejar ruta origen-destino
      if (route.params?.origin && route.params?.destination && route.params?.showRoute) {
        console.log('🗺️ Recibiendo datos de ruta completa:', {
          hasOrigin: !!route.params.origin,
          hasDestination: !!route.params.destination,
          hasRouteInfo: !!route.params.routeInfo,
          hasRouteError: !!route.params.routeError,
          coordinatesCount: route.params.routeInfo?.coordinates?.length || 0
        });
        
        setRouteData({
          origin: route.params.origin,
          destination: route.params.destination,
          routeInfo: route.params.routeInfo,
          routeError: route.params.routeError
        });
        
        // Limpiar parámetros
        navigation.setParams({ 
          origin: null, 
          destination: null, 
          showRoute: null, 
          routeInfo: null, 
          routeError: null 
        });
        return; // No procesar selectedPlace si tenemos una ruta
      }
      
      // Manejar lugar seleccionado (comportamiento existente)
      if (route.params?.selectedPlace) {
        const place = route.params.selectedPlace;
        console.log('📍 Lugar seleccionado recibido:', place);
        
        // Actualizar mapa con la ubicación seleccionada
        updateMapLocation(place.coordinates.latitude, place.coordinates.longitude);
        
        // Agregar marcador de búsqueda
        if (webViewRef.current && mapReady) {
          // Construir descripción segura
          let description = 'Ubicación seleccionada';
          if (place.address && typeof place.address === 'object') {
            if (place.address.street) {
              description = place.address.street;
              if (place.address.housenumber) {
                description += ' ' + place.address.housenumber;
              }
            } else if (place.label) {
              description = place.label;
            }
          } else if (place.address && typeof place.address === 'string') {
            description = place.address;
          } else if (place.label) {
            description = place.label;
          }
          
          const script = `
            if (window.addSearchMarker) {
              window.clearSearchMarkers();
              window.addSearchMarker(
                ${place.coordinates.latitude}, 
                ${place.coordinates.longitude}, 
                "${place.name.replace(/"/g, '\\"')}", 
                "${description.replace(/"/g, '\\"')}"
              );
            }
          `;
          
          console.log('🔧 Enviando marcador al WebView...');
          try {
            webViewRef.current.postMessage(script);
          } catch (error) {
            console.error('❌ Error enviando mensaje al WebView:', error);
          }
        } else {
          console.warn('⚠️ WebView no disponible para marcador:', { 
            hasWebView: !!webViewRef.current, 
            mapReady 
          });
        }
        
        // Limpiar el parámetro para evitar que se ejecute múltiples veces
        navigation.setParams({ selectedPlace: null });
      }
    });

    return unsubscribe;
  }, [navigation, mapReady, webViewRef]);

  // Observador directo de route.params: cubre casos donde params llegan justo al navegar
  useEffect(() => {
    if (route?.params?.origin && route?.params?.destination && route?.params?.showRoute) {
      console.log('🗺️ route.params detectados (observer):', {
        hasOrigin: !!route.params.origin,
        hasDestination: !!route.params.destination,
        hasRouteInfo: !!route.params.routeInfo
      });

      setRouteData({
        origin: route.params.origin,
        destination: route.params.destination,
        routeInfo: route.params.routeInfo,
        routeError: route.params.routeError
      });

      // Limpiar parámetros para evitar procesamiento duplicado
      navigation.setParams({ origin: null, destination: null, showRoute: null, routeInfo: null, routeError: null });
    }
  }, [route?.params]);

  // Efecto para manejar rutas origen-destino con reintentos si el WebView/a mapa no están listos
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 15; // ~4.5s con intervalo 300ms
    let intervalId = null;

    const tryShow = () => {
      attempts += 1;
      if (!routeData) {
        // nada que mostrar
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        return;
      }

      const hasWebView = !!webViewRef.current;
      console.log('⏳ Intento de mostrar ruta', attempts, '/', maxAttempts, { hasWebView, mapReady });

      if (hasWebView && mapReady) {
        console.log('🛣️ Mostrando ruta en el mapa (entrada confirmada):', routeData);
        try {
          showCustomRoute(routeData);
        } catch (e) {
          console.error('❌ Error al ejecutar showCustomRoute:', e);
        }
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        return;
      }

      if (attempts >= maxAttempts) {
        console.warn('⚠️ No fue posible mostrar la ruta: WebView o mapa no listos tras varios intentos.');
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
      }
    };

    if (routeData) {
      // intentar inmediatamente
      tryShow();
      // si no se mostró, arrancar reintentos periódicos
      if (!(webViewRef.current && mapReady)) {
        intervalId = setInterval(tryShow, 300);
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [routeData, mapReady]);

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
        
        console.log('🔧 Actualizando ubicación en WebView...');
        webViewRef.current.postMessage(script);
      } catch (error) {
        console.error('❌ Error actualizando ubicación en mapa:', error);
        // Fallback sin dirección
        try {
          const script = `
            if (window.updateLocation) {
              window.updateLocation(${latitude}, ${longitude}, "Ubicación actual");
            }
          `;
          webViewRef.current.postMessage(script);
        } catch (fallbackError) {
          console.error('❌ Error en fallback de updateLocation:', fallbackError);
        }
      }
    } else {
      console.warn('⚠️ WebView no disponible para updateLocation:', { 
        hasWebView: !!webViewRef.current, 
        mapReady 
      });
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

  // 🚌 Mostrar ruta de transporte público
  const showTransportRoute = (routeType) => {
    if (!webViewRef.current || !mapReady) return;
    
    let routeData = null;
    let routeInfo = null;
    
    // Seleccionar datos de ruta según el tipo
    switch (routeType) {
      case 'line150':
        routeData = ROUTE_150_DATA;
        routeInfo = ROUTE_INFO.line150;
        break;
      case 'line230':
        routeData = ROUTE_230_DATA;
        routeInfo = ROUTE_INFO.line230;
        break;
      default:
        console.warn('⚠️ Tipo de ruta no válido:', routeType);
        return;
    }
    
    if (!routeData || !routeData.features || routeData.features.length === 0) {
      console.warn('⚠️ No se encontraron datos de ruta para:', routeType);
      return;
    }
    
    const coordinates = routeData.features[0].geometry.coordinates;
    const routeColor = routeInfo.color;
    const routeName = routeInfo.name;
    
    // Script para mostrar la ruta en el mapa
    const script = `
      if (window.addTransportRoute) {
        const coordinates = ${JSON.stringify(coordinates)};
        window.addTransportRoute(coordinates, "${routeColor}", "${routeName}");
        console.log('🚌 Ruta ${routeName} agregada al mapa');
        
        // Centrar el mapa en la ruta
        if (coordinates.length > 0) {
          const centerLat = coordinates[Math.floor(coordinates.length / 2)][1];
          const centerLng = coordinates[Math.floor(coordinates.length / 2)][0];
          window.centerMap(centerLng, centerLat, 12);
        }
      } else {
        console.warn('⚠️ Función addTransportRoute no disponible');
      }
    `;
    
    webViewRef.current.postMessage(script);
    console.log(`🚌 Mostrando ruta: ${routeName}`);
  };

  // Función para mostrar ruta personalizada (origen -> destino)
  const showCustomRoute = (routeData) => {
    if (!webViewRef.current || !routeData) return;
    
    const { origin, destination, routeInfo, originName = 'Tu ubicación', destinationName = 'Destino' } = routeData;
    
    console.log('🛣️ Mostrando ruta personalizada:', originName, '->', destinationName);
    console.log('📊 Info de ruta:', routeInfo ? 'Con ruta calculada' : 'Sin ruta calculada');
    
    if (routeInfo && routeInfo.coordinates && routeInfo.coordinates.length > 2) {
      // Mostrar ruta calculada con coordenadas detalladas
      console.log('🗺️ Mostrando ruta con', routeInfo.coordinates.length, 'puntos');
      
      const script = `
        if (window.showDetailedRoute) {
          const routeCoords = ${JSON.stringify(routeInfo.coordinates)};
          window.showDetailedRoute(
            ${origin.latitude}, 
            ${origin.longitude}, 
            ${destination.latitude}, 
            ${destination.longitude},
            routeCoords,
            "${originName}",
            "${destinationName}",
            ${routeInfo.distance},
            ${routeInfo.duration}
          );
          console.log('🛣️ Ruta detallada mostrada con ${routeInfo.coordinates.length} puntos');
        } else if (window.showRoute) {
          window.showRoute(
            ${origin.latitude}, 
            ${origin.longitude}, 
            ${destination.latitude}, 
            ${destination.longitude},
            "${originName}",
            "${destinationName}"
          );
          console.log('🛣️ Ruta simple mostrada (fallback)');
        } else {
          console.warn('⚠️ Funciones de ruta no disponibles');
        }
      `;
      
      webViewRef.current.postMessage(script);
    } else {
      // Fallback a línea recta si no hay ruta calculada
      const script = `
        if (window.showRoute) {
          window.showRoute(
            ${origin.latitude}, 
            ${origin.longitude}, 
            ${destination.latitude}, 
            ${destination.longitude},
            "${originName}",
            "${destinationName}"
          );
          console.log('🛣️ Ruta simple mostrada (sin coordenadas detalladas)');
        } else {
          console.warn('⚠️ Función showRoute no disponible');
        }
      `;
      
      webViewRef.current.postMessage(script);
    }
    
    console.log('🛣️ Script de ruta enviado al WebView');
  };

  // Efecto para mostrar ruta cuando cambia currentRoute
  useEffect(() => {
    if (currentRoute && mapReady) {
      showTransportRoute(currentRoute);
    }

    // Si recibimos un customRoute desde otra pantalla, guardarlo y dejar que otro efecto lo muestre cuando el mapa esté listo
    if (route?.params?.customRoute) {
      const cr = route.params.customRoute;
      // Asegurar formato de coordenadas: convertir {lat,lng} -> [lng,lat] si es necesario
      let coords = cr.coordinates || [];
      if (coords.length > 0 && coords[0] && typeof coords[0] === 'object' && !Array.isArray(coords[0])) {
        try {
          coords = coords.map(c => [c.lng, c.lat]);
        } catch (e) { /* keep original if unexpected */ }
      }
      const normalized = { ...cr, coordinates: coords };
      console.log('🧩 customRoute recibido (pendiente):', normalized.name || 'custom', 'points:', (normalized.coordinates || []).length);
      setPendingCustomRoute(normalized);
      // limpiar param para evitar re-procesos
      navigation.setParams({ customRoute: null });
    }
  }, [currentRoute, mapReady]);

  // Selector de tipo de mapa (tile layers)
  const [mapStyle, setMapStyle] = React.useState('standard');

  const TILE_STYLES = {
    standard: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '© OpenStreetMap contributors'
    },
    cyclo: {
      // CyclOSM tiles (publicly available mirror)
      url: 'https://tiles-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors — CyclOSM'
    },
    transport: {
      // Carto Voyager as a transport-friendly basemap
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors & CARTO'
    }
  };

  const changeTileLayer = (styleKey) => {
    const style = TILE_STYLES[styleKey] || TILE_STYLES.standard;
    setMapStyle(styleKey);
    if (webViewRef.current && mapReady) {
      const script = `if(window.setTileLayer) window.setTileLayer("${style.url}", "${style.attribution.replace(/\"/g,'\\\"')}");`;
      try {
        webViewRef.current.postMessage(script);
        console.log('Enviado setTileLayer al WebView:', styleKey);
      } catch (e) {
        console.error('Error enviando setTileLayer:', e);
      }
    } else {
      console.log('Tile layer pedido guardado hasta que el mapa esté listo:', styleKey);
      // si el mapa no está listo, pendingCustomRoute logic manejará envíos pendientes; pero aquí guardamos pendingCustomRoute igual
      setPendingCustomRoute(prev => ({ ...(prev || {}), _tileChange: styleKey }));
    }
  };

  // Procesar customRoute si llega en params (inmediato) — cubre caso cuando la pantalla ya está activa
  useEffect(() => {
    try {
      const cr = route && route.params && route.params.customRoute ? route.params.customRoute : null;
      if (!cr) return;

      // Normalizar coords: aceptar [{lat,lng}, ...] o [[lng,lat], ...]
      let coords = cr.coordinates || [];
      if (coords.length > 0 && coords[0] && typeof coords[0] === 'object' && !Array.isArray(coords[0])) {
        coords = coords.map(c => [c.lng, c.lat]);
      }

      const normalized = { ...cr, coordinates: coords };

      if (mapReady && webViewRef.current) {
        const coordsToSend = normalized.coordinates || [];
        const script = `
          if (window.clearTransportRoutes) window.clearTransportRoutes();
          if (window.addTransportRoute) {
            const coords = ${JSON.stringify(coordsToSend)};
            window.addTransportRoute(coords, "${normalized.color || '#1976D2'}", "${(normalized.name||'Custom')}" );
          }
        `;
        try {
          webViewRef.current.postMessage(script);
          console.log('✅ customRoute enviado directamente:', normalized.name || 'custom');
        } catch (e) {
          console.error('❌ Error enviando customRoute directamente', e);
          setPendingCustomRoute(normalized);
        }
      } else {
        console.log('LOG 🔧 customRoute recibido (guardado pendiente):', normalized.name || 'custom');
        setPendingCustomRoute(normalized);
      }

      // limpiar param para evitar reenvíos
      navigation.setParams({ customRoute: null });
    } catch (e) {
      console.warn('Error procesando route.params.customRoute', e);
    }
  }, [route && route.params && route.params.customRoute, mapReady]);

  // Efecto que intenta enviar pendingCustomRoute al WebView hasta que mapReady
  useEffect(() => {
    if (!pendingCustomRoute) return;

    let attempts = 0;
    const maxAttempts = 20;
    const trySend = () => {
      attempts += 1;
      const ready = !!webViewRef.current && mapReady;
      console.log('⏳ Intentando enviar pendingCustomRoute', attempts, '/', maxAttempts, { ready });
      if (ready) {
        const cr = pendingCustomRoute;
        // Normalizar coords por si vienen como objetos {lat,lng}
        let coordsToSend = cr.coordinates || [];
        if (coordsToSend.length > 0 && coordsToSend[0] && typeof coordsToSend[0] === 'object' && !Array.isArray(coordsToSend[0])) {
          try { coordsToSend = coordsToSend.map(c => [c.lng, c.lat]); } catch (e) { /* keep original */ }
        }
        const script = `
          if (window.clearTransportRoutes) window.clearTransportRoutes();
          if (window.addTransportRoute) {
            const coords = ${JSON.stringify(coordsToSend)};
            window.addTransportRoute(coords, "${cr.color || '#1976D2'}", "${(cr.name||'Custom')}" );
          }
        `;
        try {
          webViewRef.current.postMessage(script);
          console.log('✅ pendingCustomRoute enviado:', cr.name || 'custom');
          // Si se indicó un cambio de tiles junto con el pendingCustomRoute, aplicarlo ahora
          if (cr._tileChange && TILE_STYLES[cr._tileChange]) {
            const style = TILE_STYLES[cr._tileChange];
            try {
              const tileScript = `if(window.setTileLayer) window.setTileLayer("${style.url}", "${style.attribution.replace(/"/g,'\\"')}");`;
              webViewRef.current.postMessage(tileScript);
              console.log('✅ pending tile change aplicado:', cr._tileChange);
            } catch (e) { console.error('Error aplicando pending tile change', e); }
          }
        } catch (e) {
          console.error('❌ Error enviando pendingCustomRoute', e);
        }
        setPendingCustomRoute(null);
        return;
      }
      if (attempts >= maxAttempts) {
        console.warn('⚠️ No se pudo enviar pendingCustomRoute tras varios intentos');
        setPendingCustomRoute(null);
      }
    };

    // intentar inmediatamente y luego periódicamente si no está listo
    trySend();
    const interval = setInterval(() => {
      if (!pendingCustomRoute) { clearInterval(interval); return; }
      trySend();
    }, 300);

    return () => clearInterval(interval);
  }, [pendingCustomRoute, mapReady]);

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
            window.currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19,
              tileSize: 256,
              crossOrigin: true,
              // Cache optimization
              updateWhenIdle: true,
              updateWhenZooming: false,
              keepBuffer: 2
            });
            
            window.currentTileLayer.addTo(window.map);

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
            window.currentTileLayer.on('load', function() {
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

            // Función pública para cambiar la capa de tiles dinámicamente
            window.setTileLayer = function(url, attribution) {
              try {
                if (window.currentTileLayer) {
                  try { window.map.removeLayer(window.currentTileLayer); } catch (e) { /* ignore */ }
                  window.currentTileLayer = null;
                }
                window.currentTileLayer = L.tileLayer(url, {
                  attribution: attribution || '',
                  maxZoom: 19,
                  tileSize: 256,
                  crossOrigin: true
                }).addTo(window.map);
                console.log('Tile layer cambiada a', url);
              } catch (e) {
                console.error('Error cambiando tile layer', e);
              }
            };

      // Si React Native solicitó modo edición, habilitar captura de clicks y enviarlos
      window.adminEditMode = ${editMode ? 'true' : 'false'};
      // Lista de puntos seleccionados por admin en la sesión
      window.adminSelectedPoints = window.adminSelectedPoints || [];

      window.onMapClickForAdmin = function(e) {
        try {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          console.log('✏️ admin map click', lat, lng);

          // Crear marcador numerado para dar feedback visual al admin
          const index = window.adminSelectedPoints.length + 1;
          const pinHtml = '<div style="background:#1976D2;color:#fff;padding:6px 8px;border-radius:12px;font-weight:700;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">' + index + '</div>';
          const pinIcon = L.divIcon({ className: 'admin-pin', html: pinHtml, iconSize: [30, 30], iconAnchor: [15, 15] });
          const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(window.map).bindPopup('<b>Punto ' + index + '</b><br>' + lat.toFixed(6) + ', ' + lng.toFixed(6));

          // Guardar referencia localmente (para posible edición futura)
          window.adminSelectedPoints.push({ lat, lng, marker });

          // Enviar el punto y su índice a React Native
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'adminMapPoint', latitude: lat, longitude: lng, index }));
          }
        } catch (err) { console.error('admin click error', err); }
      };

      // Activar listener si editMode true
      if (window.adminEditMode) {
        window.map.on('click', window.onMapClickForAdmin);
        console.log('✏️ Listener de clicks para admin activo');
      }

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

            // 🚌 Funciones para rutas de transporte público
            window.transportRoutes = [];

            window.addTransportRoute = function(coordinates, color, routeName) {
                console.log('🚌 Agregando ruta:', routeName);
                
                // Limpiar rutas anteriores
                window.clearTransportRoutes();
                
                // Convertir coordenadas [lng, lat] a [lat, lng] para Leaflet
                const latLngCoords = coordinates.map(coord => [coord[1], coord[0]]);
                
                // Crear polilínea para la ruta
                const route = L.polyline(latLngCoords, {
                    color: color,
                    weight: 4,
                    opacity: 0.8,
                    smoothFactor: 1.0
                }).addTo(window.map);
                
                // Agregar popup con información de la ruta
                route.bindPopup(\`<b>\${routeName}</b><br>Haz clic en la ruta para ver detalles\`);
                
                // Guardar referencia
                window.transportRoutes.push(route);
                
                // Mostrar marcadores de inicio y fin
                if (latLngCoords.length > 0) {
                    const startPoint = latLngCoords[0];
                    const endPoint = latLngCoords[latLngCoords.length - 1];
                    
                    const startIcon = L.divIcon({
                        className: 'route-marker',
                        html: \`<div style="
                            background: \${color}; color: white; padding: 4px 8px; 
                            border-radius: 10px; font-size: 10px; font-weight: bold;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        ">INICIO</div>\`,
                        iconSize: [50, 20],
                        iconAnchor: [25, 10]
                    });
                    
                    const endIcon = L.divIcon({
                        className: 'route-marker',
                        html: \`<div style="
                            background: \${color}; color: white; padding: 4px 8px; 
                            border-radius: 10px; font-size: 10px; font-weight: bold;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        ">FIN</div>\`,
                        iconSize: [50, 20],
                        iconAnchor: [25, 10]
                    });
                    
                    const startMarker = L.marker(startPoint, {icon: startIcon}).addTo(window.map);
                    const endMarker = L.marker(endPoint, {icon: endIcon}).addTo(window.map);
                    
                    window.transportRoutes.push(startMarker, endMarker);
                }
                
                console.log('✅ Ruta agregada exitosamente:', routeName);
            };

            window.clearTransportRoutes = function() {
                window.transportRoutes.forEach(item => {
                    window.map.removeLayer(item);
                });
                window.transportRoutes = [];
            };

            window.centerMap = function(lng, lat, zoom = 13) {
                window.map.setView([lat, lng], zoom, {animate: true});
            };

            // 🛣️ Funciones para rutas personalizadas (origen -> destino)
            window.routeLayer = null;
            window.originMarker = null;
            window.destinationMarker = null;

            window.showRoute = function(originLat, originLng, destLat, destLng, originName = 'Origen', destName = 'Destino') {
                console.log('🛣️ Mostrando ruta:', originName, '->', destName);
                
                // Limpiar ruta anterior
                window.clearRoute();
                
                try {
                    // Crear marcador de origen (verde)
                    const originIcon = L.divIcon({
                        className: 'origin-marker',
                        html: \`<div style="
                            width: 16px; height: 16px; border-radius: 50%; 
                            background: #4CAF50; border: 3px solid white; 
                            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                        "></div>\`,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    });
                    
                    window.originMarker = L.marker([originLat, originLng], {icon: originIcon})
                        .addTo(window.map)
                        .bindPopup(\`📍 <b>\${originName}</b>\`);
                    
                    // Crear marcador de destino (rojo)
                    const destIcon = L.divIcon({
                        className: 'destination-marker',
                        html: \`<div style="
                            width: 16px; height: 16px; border-radius: 50%; 
                            background: #F44336; border: 3px solid white; 
                            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                        "></div>\`,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    });
                    
                    window.destinationMarker = L.marker([destLat, destLng], {icon: destIcon})
                        .addTo(window.map)
                        .bindPopup(\`🎯 <b>\${destName}</b>\`);
                    
                    // Crear línea recta entre origen y destino (ruta simple)
                    const routeCoords = [
                        [originLat, originLng],
                        [destLat, destLng]
                    ];
                    
                    window.routeLayer = L.polyline(routeCoords, {
                        color: '#2196F3',
                        weight: 4,
                        opacity: 0.7,
                        dashArray: '10, 5',
                        smoothFactor: 1.0
                    }).addTo(window.map);
                    
                    // Calcular distancia aproximada
                    const distance = window.calculateDistance(originLat, originLng, destLat, destLng);
                    
                    // Mostrar popup con información de la ruta
                    const midLat = (originLat + destLat) / 2;
                    const midLng = (originLng + destLng) / 2;
                    
                    const routeInfo = L.popup({
                        closeButton: true,
                        autoClose: false
                    })
                        .setLatLng([midLat, midLng])
                        .setContent(\`
                            <div style="text-align: center;">
                                <b>🛣️ Ruta</b><br>
                                <small>\${originName} → \${destName}</small><br>
                                <b>📏 \${distance.toFixed(1)} km</b>
                            </div>
                        \`)
                        .openOn(window.map);
                    
                    // Ajustar vista del mapa para mostrar toda la ruta
                    const bounds = L.latLngBounds([
                        [originLat, originLng],
                        [destLat, destLng]
                    ]);
                    
                    window.map.fitBounds(bounds, {
                        padding: [20, 20],
                        maxZoom: 15
                    });
                    
                    console.log('✅ Ruta mostrada correctamente');
                    
                    // Notificar a React Native
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'routeDisplayed',
                            distance: distance.toFixed(1)
                        }));
                    }
                    
                } catch (error) {
                    console.error('❌ Error mostrando ruta:', error);
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'routeError',
                            error: error.message
                        }));
                    }
                }
            };

            // Función para calcular distancia entre dos puntos (Haversine formula)
            window.calculateDistance = function(lat1, lng1, lat2, lng2) {
                const R = 6371; // Radio de la Tierra en kilómetros
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLng = (lng2 - lng1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                         Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                         Math.sin(dLng/2) * Math.sin(dLng/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return R * c;
            };

            // 🛣️ Función para mostrar ruta detallada con coordenadas precisas de OpenRouteService
            window.showDetailedRoute = function(originLat, originLng, destLat, destLng, routeCoords, originName = 'Origen', destName = 'Destino', distance = null, duration = null) {
                console.log('🗺️ Mostrando ruta detallada:', originName, '->', destName);
                console.log('📊 Coordenadas de ruta:', routeCoords.length, 'puntos');
                
                // Limpiar ruta anterior
                window.clearRoute();
                
                try {
                    // Crear marcador de origen (verde)
                    const originIcon = L.divIcon({
                        className: 'origin-marker',
                        html: \`<div style="
                            width: 16px; height: 16px; border-radius: 50%; 
                            background: #4CAF50; border: 3px solid white; 
                            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                        "></div>\`,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    });
                    
                    window.originMarker = L.marker([originLat, originLng], {icon: originIcon})
                        .addTo(window.map)
                        .bindPopup(\`📍 <b>\${originName}</b>\`);
                    
                    // Crear marcador de destino (rojo)
                    const destIcon = L.divIcon({
                        className: 'destination-marker',
                        html: \`<div style="
                            width: 16px; height: 16px; border-radius: 50%; 
                            background: #F44336; border: 3px solid white; 
                            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                        "></div>\`,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    });
                    
                    window.destinationMarker = L.marker([destLat, destLng], {icon: destIcon})
                        .addTo(window.map)
                        .bindPopup(\`🎯 <b>\${destName}</b>\`);
                    
                    // Convertir coordenadas [lng, lat] a [lat, lng] para Leaflet
                    const leafletCoords = routeCoords.map(coord => [coord[1], coord[0]]);
                    
                    // Crear polilínea para la ruta detallada
                    window.routeLayer = L.polyline(leafletCoords, {
                        color: '#2196F3',
                        weight: 4,
                        opacity: 0.8,
                        smoothFactor: 1.0
                    }).addTo(window.map);
                    
                    // Preparar información para el popup
                    let routeInfoText = \`
                        <div style="text-align: center;">
                            <b>🛣️ Ruta Calculada</b><br>
                            <small>\${originName} → \${destName}</small><br>
                    \`;
                    
                    if (distance && duration) {
                        const distanceKm = (distance / 1000).toFixed(1);
                        const durationMin = Math.round(duration / 60);
                        routeInfoText += \`
                            <b>📏 \${distanceKm} km</b><br>
                            <b>⏱️ \${durationMin} min</b>
                        \`;
                    } else if (distance) {
                        const distanceKm = (distance / 1000).toFixed(1);
                        routeInfoText += \`<b>📏 \${distanceKm} km</b>\`;
                    }
                    
                    routeInfoText += \`</div>\`;
                    
                    // Mostrar popup en el punto medio de la ruta
                    const midIndex = Math.floor(leafletCoords.length / 2);
                    const midPoint = leafletCoords[midIndex] || [(originLat + destLat) / 2, (originLng + destLng) / 2];
                    
                    const routeInfo = L.popup({
                        closeButton: true,
                        autoClose: false
                    })
                        .setLatLng(midPoint)
                        .setContent(routeInfoText)
                        .openOn(window.map);
                    
                    // Ajustar vista del mapa para mostrar toda la ruta
                    const bounds = L.latLngBounds(leafletCoords);
                    window.map.fitBounds(bounds, {
                        padding: [20, 20],
                        maxZoom: 15
                    });
                    
                    console.log('✅ Ruta detallada mostrada correctamente');
                    
                    // Notificar a React Native
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'detailedRouteDisplayed',
                            distance: distance ? (distance / 1000).toFixed(1) : 'N/A',
                            duration: duration ? Math.round(duration / 60) : 'N/A',
                            points: routeCoords.length
                        }));
                    }
                    
                } catch (error) {
                    console.error('❌ Error mostrando ruta detallada:', error);
                    
                    // Fallback a ruta simple si falla
                    if (window.showRoute) {
                        console.log('🔄 Fallback a ruta simple');
                        window.showRoute(originLat, originLng, destLat, destLng, originName, destName);
                    }
                    
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'routeError',
                            error: error.message
                        }));
                    }
                }
            };

            // Función para limpiar la ruta actual
            window.clearRoute = function() {
                if (window.routeLayer) {
                    window.map.removeLayer(window.routeLayer);
                    window.routeLayer = null;
                }
                if (window.originMarker) {
                    window.map.removeLayer(window.originMarker);
                    window.originMarker = null;
                }
                if (window.destinationMarker) {
                    window.map.removeLayer(window.destinationMarker);
                    window.destinationMarker = null;
                }
                console.log('🧹 Ruta limpiada');
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
      <StatusBar backgroundColor="#1976D2" barStyle="light-content" />
      
      {/* Header con drawer */}
      <HeaderWithDrawer 
        title={currentRoute && ROUTE_INFO[currentRoute] 
          ? `🚌 ${ROUTE_INFO[currentRoute].name}` 
          : "📍 Mapa"
        } 
      />

      <View style={styles.searchContainer}>
        <TouchableOpacity 
          style={styles.searchInputContainer}
          onPress={() => {
            console.log('🔍 Navegando a LocationSearch para calcular ruta...');
            navigation.navigate('LocationSearch');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Buscar lugares en Cochabamba...</Text>
          <View style={styles.searchButtonContainer}>
            <Ionicons name="location" size={16} color="#2196F3" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Controles - Diseño más compacto y moderno */}
      <View style={styles.controlsContainer}>
        {/* Información de la ruta actual */}
        {currentRoute && ROUTE_INFO[currentRoute] && (
          <View style={styles.routeInfoContainer}>
            <View style={styles.routeHeader}>
              <View style={[styles.routeIcon, { backgroundColor: ROUTE_INFO[currentRoute].color }]}>
                <Ionicons name="bus" size={16} color="#fff" />
              </View>
              <Text style={styles.routeTitle}>
                {ROUTE_INFO[currentRoute].name}
              </Text>
              <TouchableOpacity 
                onPress={() => setCurrentRoute(null)} 
                style={styles.closeRouteButton}
              >
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.routeDescription}>
              {ROUTE_INFO[currentRoute].description}
            </Text>
            <View style={styles.routeStats}>
              <View style={styles.routeStat}>
                <Text style={styles.routeStatText}>📏 {ROUTE_INFO[currentRoute].distance}</Text>
              </View>
              <View style={styles.routeStat}>
                <Text style={styles.routeStatText}>⏱️ {ROUTE_INFO[currentRoute].duration}</Text>
              </View>
              <View style={styles.routeStat}>
                <Text style={styles.routeStatText}>💰 {ROUTE_INFO[currentRoute].fare}</Text>
              </View>
            </View>
          </View>
        )}
        
        <View style={styles.bottomControls}>
          <TouchableOpacity 
            style={[styles.controlButton, !location && styles.controlButtonDisabled]} 
            onPress={centerOnLocation}
            disabled={!location}
          >
            <Ionicons name="locate" size={18} color="#fff" />
            <Text style={styles.controlButtonText}>
              {location ? 'Mi Ubicación' : 'Buscando GPS...'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.locationText}>
            {location 
              ? `📍 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
              : '🔍 Buscando ubicación...'
            }
          </Text>
        </View>
        {/* Selector de tipo de mapa */}
        <View style={styles.mapTypeRow}>
          <TouchableOpacity
            style={[styles.mapTypeButton, mapStyle === 'standard' && styles.mapTypeButtonActive]}
            onPress={() => changeTileLayer('standard')}
          >
            <Text style={[styles.mapTypeText, mapStyle === 'standard' && styles.mapTypeTextActive]}>Estándar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapTypeButton, mapStyle === 'cyclo' && styles.mapTypeButtonActive]}
            onPress={() => changeTileLayer('cyclo')}
          >
            <Text style={[styles.mapTypeText, mapStyle === 'cyclo' && styles.mapTypeTextActive]}>Ciclista</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapTypeButton, mapStyle === 'transport' && styles.mapTypeButtonActive]}
            onPress={() => changeTileLayer('transport')}
          >
            <Text style={[styles.mapTypeText, mapStyle === 'transport' && styles.mapTypeTextActive]}>Transporte</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mapa - Sin márgenes para aprovechar toda la pantalla */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: generateMapHTML() }}
          style={styles.map}
          onMessage={(event) => {
            const message = event.nativeEvent.data;
            // Puede venir como texto simple o JSON stringificado
            try {
              const parsed = JSON.parse(message);
              if (parsed && parsed.type === 'adminMapPoint') {
                console.log('✏️ Punto admin recibido en RN:', parsed);
                // Si se pasó returnTo en params, enviar como param para que la pantalla receptora lo lea
                const returnTo = route?.params?.returnTo || null;
                if (returnTo) {
                  // Usar navigate para que la otra pantalla procese el param en focus
                  navigation.navigate(returnTo, { adminMapPoint: { latitude: parsed.latitude, longitude: parsed.longitude } });
                } else {
                  // Si no hay pantalla objetivo, almacenar en params de este screen
                  navigation.setParams({ adminMapPoint: { latitude: parsed.latitude, longitude: parsed.longitude } });
                }
                return;
              }
              if (parsed && parsed.type === 'routeDisplayed') {
                console.log('webview routeDisplayed', parsed);
                return;
              }
              if (parsed && parsed.type === 'detailedRouteDisplayed') {
                console.log('webview detailedRouteDisplayed', parsed);
                return;
              }
            } catch (e) {
              // no JSON
            }

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
        
        {/* Botón flotante para búsqueda avanzada */}
        <TouchableOpacity 
          style={styles.floatingSearchButton}
          onPress={() => {
            console.log('🔍 Navegando a LocationSearch para calcular ruta (botón flotante)...');
            navigation.navigate('LocationSearch');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.floatingButtonContent}>
            <Ionicons name="search-circle" size={24} color="#fff" />
            <Text style={styles.floatingButtonText}>Buscar</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ✅ Diseño moderno y compacto para mejor aprovechamiento de pantalla
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#1976D2',
    paddingTop: Platform.OS === 'ios' ? 50 : 25, // Ajuste para status bar
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  backButton: {
    marginRight: 12,
    padding: 6,
    borderRadius: 6,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#E3F2FD',
    marginTop: 2,
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f6f7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    paddingVertical: 0,
  },
  searchButtonContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 6,
    marginLeft: 8,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  controlButtonDisabled: {
    backgroundColor: '#BDBDBD',
    shadowColor: '#BDBDBD',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  locationText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  floatingSearchButton: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    backgroundColor: '#FF5722',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#2196F3',
    fontWeight: '600',
  },
  // Estilos modernos para información de rutas
  routeInfoContainer: {
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  routeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  closeRouteButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f5f6f7',
  },
  routeDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeStat: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  routeStatText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '500',
  },
  mapTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  mapTypeButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  mapTypeButtonActive: {
    backgroundColor: '#1976D2',
  },
  mapTypeText: {
    color: '#333',
    fontWeight: '600',
  },
  mapTypeTextActive: {
    color: '#fff'
  },
});

export default AdminMapScreen;
