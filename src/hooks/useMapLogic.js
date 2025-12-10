import { useState, useRef, useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import LocationService from '../services/LocationService';
import { DEFAULT_LOCATION, MESSAGE_TYPES } from '../constants/mapConstants';

export const useMapLogic = () => {
  // Estados principales
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState('osm');

  // Estados de selección de rutas
  const [isSelectingPoints, setIsSelectingPoints] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [generatedRoute, setGeneratedRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Referencias
  const webViewRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const mapReadyRef = useRef(false);
  const pendingTransportRef = useRef(false);
  const startPointRef = useRef(null);
  const endPointRef = useRef(null);
  const routeRef = useRef(null);

  // Inicializar ubicación
  useEffect(() => {
    let mounted = true;
    
    const initLocation = async () => {
      try {
        console.log('🔍 Obteniendo ubicación inicial...');
        const res = await LocationService.getCurrentLocation();
        if (!mounted) return;
        
        console.log('📍 Ubicación obtenida:', res);
        setLocation({ latitude: res.latitude, longitude: res.longitude });
      } catch (err) {
        if (!mounted) return;
        console.error('❌ Error obteniendo ubicación:', err);
        setError(err.message || 'No se pudo obtener ubicación');
        setLocation(DEFAULT_LOCATION);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    initLocation();
    return () => { mounted = false; };
  }, []);

  // Manejar cambios en el estado de la app
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      appStateRef.current = nextAppState;
      if (nextAppState === 'active' && mapReadyRef.current && webViewRef.current) {
        setTimeout(() => {
          if (location) {
            updateLocationOnMap(location.latitude, location.longitude);
          }
          if (routeRef.current) {
            updateRouteOnMap(routeRef.current);
          }
        }, 500);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [location]);

  // Funciones de comunicación con WebView
  const updateLocationOnMap = (latitude, longitude) => {
    if (!webViewRef.current || !mapReadyRef.current) return;
    
    try {
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
      
      const message = JSON.stringify({ 
        type: MESSAGE_TYPES.UPDATE_LOCATION, 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude) 
      });
      
      webViewRef.current.postMessage(message);
    } catch (error) {
      console.error('Error enviando ubicación al mapa:', error);
    }
  };

  const updateMarkersOnMap = (start, end) => {
    if (!webViewRef.current || !mapReadyRef.current) return;
    
    try {
      const markers = [];
      if (start) {
        markers.push({
          id: 'start',
          latitude: start.latitude,
          longitude: start.longitude,
          type: 'start',
          title: 'Punto de inicio'
        });
      }
      if (end) {
        markers.push({
          id: 'end',
          latitude: end.latitude,
          longitude: end.longitude,
          type: 'end',
          title: 'Punto de destino'
        });
      }
      
      const message = JSON.stringify({
        type: MESSAGE_TYPES.UPDATE_MARKERS,
        markers
      });
      
      webViewRef.current.postMessage(message);
    } catch (error) {
      console.error('Error enviando marcadores al mapa:', error);
    }
  };

  const updateRouteOnMap = (routeData) => {
    if (!webViewRef.current || !mapReadyRef.current || !routeData) return;
    
    try {
      const message = JSON.stringify({
        type: MESSAGE_TYPES.UPDATE_ROUTE,
        route: {
          coordinates: routeData.coordinates,
          distance: routeData.distance,
          duration: routeData.duration
        }
      });
      
      webViewRef.current.postMessage(message);
      routeRef.current = routeData;
    } catch (error) {
      console.error('Error enviando ruta al mapa:', error);
    }
  };

  const clearMapData = () => {
    if (!webViewRef.current || !mapReadyRef.current) return;
    
    try {
      const message = JSON.stringify({
        type: MESSAGE_TYPES.CLEAR_ALL
      });
      
      webViewRef.current.postMessage(message);
      routeRef.current = null;
    } catch (error) {
      console.error('Error limpiando mapa:', error);
    }
  };

  const changeMapType = (newMapType) => {
    // Siempre actualizamos el estado local inmediatamente
    setMapType(newMapType);

    try {
      const message = JSON.stringify({
        type: MESSAGE_TYPES.CHANGE_MAP_TYPE,
        mapType: newMapType
      });

      if (webViewRef.current && mapReadyRef.current) {
        webViewRef.current.postMessage(message);
      } else {
        // Si el WebView no está listo, marcamos la acción pendiente
        if (newMapType === 'transport') pendingTransportRef.current = true;
        console.warn('⚠️ WebView no listo para cambiar tipo de mapa, acción pendiente');
      }

      // Si seleccionaron el tipo 'transport' y el mapa ya está listo, cargar rutas
      if (newMapType === 'transport' && webViewRef.current && mapReadyRef.current) {
        fetchAndShowTransportRoutes();
      }
    } catch (error) {
      console.error('Error cambiando tipo de mapa:', error);
    }
  };

  // Cargar y mostrar rutas de transporte desde Firestore cuando se seleccione el tipo 'transport'
  const fetchAndShowTransportRoutes = async () => {
    try {
      console.log('🔁 Cargando rutas de transporte desde Firestore...');
      const routesSnapshot = await getDocs(collection(db, 'routes'));
      const routes = [];
      routesSnapshot.forEach(doc => {
        const data = doc.data() || {};
        // Filtrar rutas que tengan metadata de transporte (transportType) o flag public
        const isTransport = !!data.transportType || data.transport === true || data.isTransport === true;
        if (!isTransport) return;

        // Normalizar coordenadas a [[lng,lat], ...]
        let coords = [];
        if (Array.isArray(data.coordinates)) {
          coords = data.coordinates.map(c => {
            if (Array.isArray(c) && c.length >= 2) return [Number(c[0]), Number(c[1])];
            if (c && typeof c === 'object') {
              // admitir { latitude, longitude } o { lat, lng } o { lng, lat }
              const lat = c.latitude ?? c.lat ?? c[1] ?? null;
              const lng = c.longitude ?? c.lng ?? c[0] ?? null;
              if (lat !== null && lng !== null) return [Number(lng), Number(lat)];
            }
            return null;
          }).filter(Boolean);
        }

        if (coords.length > 0) {
          routes.push({ id: doc.id, name: data.name || '', color: data.color || '#1976D2', coordinates: coords });
        }
      });

      if (routes.length === 0) {
        console.log('ℹ️ No se encontraron rutas de transporte en Firestore');
        return { success: true, routes: [] };
      }

      // Enviar mensaje al WebView para que dibuje todas las rutas
      if (webViewRef.current && mapReadyRef.current) {
        const msg = JSON.stringify({ type: 'showRoutes', routes });
        webViewRef.current.postMessage(msg);
        console.log('✅ Enviadas', routes.length, 'rutas al WebView');
      } else {
        console.warn('⚠️ WebView no listo - rutas pendientes');
      }

      return { success: true, routes };
    } catch (error) {
      console.error('Error cargando rutas de Firestore:', error);
      return { success: false, error: error.message };
    }
  };

  // Funciones de selección de rutas
  const togglePointSelection = () => {
    const newSelectingState = !isSelectingPoints;
    setIsSelectingPoints(newSelectingState);
    
    if (!newSelectingState) {
      clearRoute();
    } else {
      if (webViewRef.current && mapReadyRef.current) {
        const message = JSON.stringify({
          type: MESSAGE_TYPES.ENABLE_POINT_SELECTION
        });
        webViewRef.current.postMessage(message);
      }
    }
  };

  const handlePointSelection = (coordinate) => {
    if (!isSelectingPoints) return;
    
    if (!startPoint) {
      setStartPoint(coordinate);
      startPointRef.current = coordinate;
      updateMarkersOnMap(coordinate, null);
      return { type: 'origin', message: '¡Origen seleccionado correctamente!\nAhora selecciona tu destino' };
    } else if (!endPoint) {
      setEndPoint(coordinate);
      endPointRef.current = coordinate;
      updateMarkersOnMap(startPointRef.current, coordinate);
      return { type: 'destination', message: '¡Destino seleccionado correctamente!\n¿Listo para generar la ruta?' };
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
        updateRouteOnMap(routeResult);
        return { success: true, route: routeResult };
      } else {
        throw new Error(routeResult.error || 'No se pudo calcular la ruta');
      }
    } catch (error) {
      console.error('Error generando ruta:', error);
      Alert.alert(
        'Error',
        'Error al generar la ruta: ' + error.message,
        [{ text: 'OK' }]
      );
      return { success: false, error: error.message };
    } finally {
      setRouteLoading(false);
    }
  };

  const clearRoute = () => {
    setStartPoint(null);
    setEndPoint(null);
    setGeneratedRoute(null);
    startPointRef.current = null;
    endPointRef.current = null;
    routeRef.current = null;
    clearMapData();
  };

  const centerOnUser = async () => {
    try {
      setLoading(true);
      const res = await LocationService.getCurrentLocation();
      setLocation({ latitude: res.latitude, longitude: res.longitude });
      
      if (mapReadyRef.current && webViewRef.current) {
        updateLocationOnMap(res.latitude, res.longitude);
      }
    } catch (err) {
      setError(err.message || 'No se pudo centrar');
    } finally {
      setLoading(false);
    }
  };

  const handleMapReady = () => {
    console.log('✅ Mapa de invitado listo');
    setMapReady(true);
    mapReadyRef.current = true;
    
    if (location) {
      setTimeout(() => {
        updateLocationOnMap(location.latitude, location.longitude);
      }, 1000);
    }
    // Si había una petición pendiente de mostrar rutas de transporte, procesarla ahora
    if (pendingTransportRef.current) {
      pendingTransportRef.current = false;
      setTimeout(() => {
        fetchAndShowTransportRoutes();
      }, 400);
    }
  };

  return {
    // Estados
    location,
    loading,
    error,
    mapReady,
    mapType,
    isSelectingPoints,
    startPoint,
    endPoint,
    generatedRoute,
    routeLoading,
    
    // Referencias
    webViewRef,
    mapReadyRef,
    
    // Funciones
    updateLocationOnMap,
    updateMarkersOnMap,
    updateRouteOnMap,
    clearMapData,
    changeMapType,
    togglePointSelection,
    handlePointSelection,
    generateRoute,
    clearRoute,
    centerOnUser,
    handleMapReady
  };
};