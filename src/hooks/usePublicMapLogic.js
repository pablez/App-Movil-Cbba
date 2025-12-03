import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import LocationService from '../services/LocationService';

export default function usePublicMapLogic({ route, navigation, webViewRef, onNotify }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  const [isSelectingPoints, setIsSelectingPoints] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [generatedRoute, setGeneratedRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

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
    if (customRoute && customRoute.coordinates && mapReady && webViewRef && webViewRef.current) {
      console.log('🗺️ Enviando ruta al WebView:', customRoute.name, 'con', customRoute.coordinates.length, 'puntos');
      
      // Normalizar coordenadas a formato [[lng, lat], ...] correcto
      const normalizedCoords = normalizeToLngLatArray(customRoute.coordinates);
      console.log('🔄 Coordenadas normalizadas:', normalizedCoords.length, 'puntos válidos');
      console.log('📊 Muestra de coordenadas:', normalizedCoords.slice(0, 3));
      
      // Enviar la ruta inmediatamente cuando el mapa esté listo
      postMessage({ 
        type: 'updateRoute', 
        route: { coordinates: normalizedCoords }, 
        color: customRoute.color || '#1976D2', 
        name: customRoute.name || 'Ruta' 
      });
      // Note: Don't auto-center, let user manually center if needed
    }
  }, [customRoute, mapReady]);

  useEffect(() => {
    if (!loading && !error) {
      const timer = setTimeout(() => {
        setShowGuestModal(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [loading, error]);

  const postMessage = (obj) => {
    try {
      // Debug log de mensajes importantes
      if (obj && obj.type === 'updateRoute') {
        console.log('📤 Enviando ruta a WebView:', obj.route?.coordinates?.length || 0, 'coordenadas');
        if (obj.route?.coordinates?.length > 0) {
          console.log('📊 Primera coordenada:', JSON.stringify(obj.route.coordinates[0]));
          console.log('📊 Última coordenada:', JSON.stringify(obj.route.coordinates[obj.route.coordinates.length - 1]));
        }
      } else if (obj && obj.type === 'updateLocation') {
        console.log('📍 Enviando ubicación a WebView:', obj.latitude, obj.longitude);
      }
      
      if (webViewRef && webViewRef.current) {
        const target = webViewRef.current;
        if (typeof target.postCommand === 'function') {
          target.postCommand(obj);
        } else if (typeof target.postMessage === 'function') {
          target.postMessage(JSON.stringify(obj));
        } else if (typeof target.injectJavaScript === 'function') {
          // fallback: inject a postMessage call into the WebView
          try {
            const js = `window.postMessage(${JSON.stringify(JSON.stringify(obj))}, '*'); true;`;
            target.injectJavaScript(js);
          } catch (e) {
            console.warn('usePublicMapLogic postMessage fallback error', e);
          }
        }
      } else {
        console.warn('⚠️ No se puede enviar mensaje - WebView no está listo:', {
          hasWebViewRef: !!webViewRef,
          hasCurrent: !!(webViewRef && webViewRef.current)
        });
      }
    } catch (e) {
      console.warn('usePublicMapLogic postMessage error', e);
    }
  };

  const centerOnUser = async () => {
    try {
      setLoading(true);
      const res = await LocationService.getCurrentLocation();
      setLocation({ latitude: res.latitude, longitude: res.longitude });
      postMessage({ type: 'updateLocation', latitude: res.latitude, longitude: res.longitude });
    } catch (err) {
      setError(err.message || 'No se pudo centrar');
    } finally {
      setLoading(false);
    }
  };

  const centerOnRoute = () => {
    if (customRoute && customRoute.coordinates && mapReady && webViewRef && webViewRef.current) {
      console.log('🎯 Centrando en ruta:', customRoute.name, 'con', customRoute.coordinates.length, 'coordenadas');
      
      // Normalizar coordenadas antes de enviar
      const normalizedCoords = normalizeToLngLatArray(customRoute.coordinates);
      console.log('🔄 Centrado con coordenadas normalizadas:', normalizedCoords.length, 'puntos');
      
      // Reenviar la ruta completa para asegurar que se muestre en el mapa
      postMessage({ 
        type: 'updateRoute', 
        route: { coordinates: normalizedCoords }, 
        color: customRoute.color || '#FF5722', 
        name: customRoute.name || 'Ruta' 
      });
      
      // También enviar comando específico para centrar
      setTimeout(() => {
        postMessage({ 
          type: 'centerOnRoute'
        });
      }, 300);
    } else {
      console.log('❌ No se puede centrar en ruta:', {
        hasCustomRoute: !!customRoute,
        hasCoordinates: !!(customRoute && customRoute.coordinates),
        mapReady,
        hasWebViewRef: !!(webViewRef && webViewRef.current)
      });
    }
  };

  const updateLocationOnMap = (latitude, longitude) => {
    if (!mapReady) return;
    postMessage({ type: 'updateLocation', latitude, longitude });
  };

  const handleMapClick = (clickData) => {
    if (!isSelectingPoints) return;

    const coordinate = { latitude: clickData.latitude, longitude: clickData.longitude };

    if (!startPoint) {
      const prev = startPoint; // may be null
      setStartPoint(coordinate);
      // Send both markers if an endPoint already exists so the start marker
      // is not removed when the WebView replaces markers.
      const markers = [{ latitude: coordinate.latitude, longitude: coordinate.longitude, type: 'start', title: 'Punto de inicio' }];
      if (endPoint) {
        markers.push({ latitude: endPoint.latitude, longitude: endPoint.longitude, type: 'end', title: 'Punto de destino' });
      }
      postMessage({ type: 'updateMarkers', markers });
      if (typeof onNotify === 'function') {
        onNotify({
          title: 'Punto de inicio seleccionado',
          message: 'Confirma o deshace el cambio del punto de inicio',
          duration: 5000,
          type: 'info',
          prevStart: prev,
          newStart: coordinate,
          actions: [
            {
              label: 'Deshacer',
              onPress: () => {
                // revert to previous start
                setStartPoint(prev);
                // Always send the full markers array representing the desired
                // state. If there is a prev start, include it; otherwise omit
                // the start marker. Preserve the end marker if present.
                const revertMarkers = [];
                if (prev) {
                  revertMarkers.push({ latitude: prev.latitude, longitude: prev.longitude, type: 'start', title: 'Punto de inicio (antiguo)' });
                }
                if (endPoint) {
                  revertMarkers.push({ latitude: endPoint.latitude, longitude: endPoint.longitude, type: 'end', title: 'Punto de destino' });
                }
                postMessage({ type: 'updateMarkers', markers: revertMarkers });
              },
              style: 'destructive'
            },
            { label: 'Aceptar', onPress: () => {} }
          ]
        });
      } else {
        Alert.alert('Punto de inicio seleccionado', 'Ahora toca en el mapa para seleccionar el punto de destino', [{ text: 'OK' }]);
      }
    } else if (!endPoint) {
      setEndPoint(coordinate);
      // When adding an end point, send both start and end markers so the
      // start marker remains visible (the webview replaces markers wholesale).
      const markers = [];
      if (startPoint) {
        markers.push({ latitude: startPoint.latitude, longitude: startPoint.longitude, type: 'start', title: 'Punto de inicio' });
      }
      markers.push({ latitude: coordinate.latitude, longitude: coordinate.longitude, type: 'end', title: 'Punto de destino' });
      postMessage({ type: 'updateMarkers', markers });
      if (typeof onNotify === 'function') {
        onNotify({
          title: 'Punto de destino seleccionado',
          message: '¿Deseas generar la ruta entre estos dos puntos?',
          type: 'confirm',
          actions: [
            { label: 'Cancelar', onPress: () => {} , style: 'cancel' },
            { label: 'Generar Ruta', onPress: () => generateRoute(startPoint, coordinate) }
          ]
        });
      } else {
        Alert.alert('Punto de destino seleccionado', '¿Deseas generar la ruta entre estos dos puntos?', [ { text: 'Cancelar', style: 'cancel' }, { text: 'Generar Ruta', onPress: () => generateRoute(startPoint, coordinate) } ]);
      }
    }
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = event.nativeEvent.data;
      if (data === 'mapReady') {
        setMapReady(true);
        setLoading(false);
        if (location) {
          setTimeout(() => updateLocationOnMap(location.latitude, location.longitude), 500);
        }
        return;
      }
      // Try parse JSON messages from the robust HTML
      try {
        const msg = JSON.parse(data);
        if (msg && msg.type) {
          // Log incoming messages for easier debugging (will show in RN console)
          console.log('WebView -> RN message:', msg.type, msg);
          switch (msg.type) {
            case 'pointSelected':
              if (msg.coordinate) handleMapClick(msg.coordinate);
              break;
            case 'error':
              setError('Error del mapa: ' + (msg.message || 'desconocido'));
              setLoading(false);
              break;
            case 'webviewDebug':
              // Useful debug messages forwarded from the WebView (e.g., showPopup payload)
              console.log('WebView debug payload:', msg.payload);
              break;
            default:
              console.log('WebView: unhandled message type:', msg.type, msg);
              break;
          }
        }
        return;
      } catch (e) {
        // not JSON, ignore
      }
    } catch (error) {
      console.error('usePublicMapLogic handleWebViewMessage error', error);
    }
  };

  const togglePointSelection = () => {
    setIsSelectingPoints(prev => {
      const next = !prev;
      if (next) {
        // enable point selection in the webview
        postMessage({ type: 'enablePointSelection' });
      } else {
        // disable selection and clear markers
        setStartPoint(null);
        setEndPoint(null);
        setGeneratedRoute(null);
        postMessage({ type: 'clearAll' });
      }
      return next;
    });
  };

  const generateRoute = async (start, end) => {
    setRouteLoading(true);
    try {
      const routeResult = await LocationService.getOptimalRoute(
        { latitude: start.latitude, longitude: start.longitude },
        { latitude: end.latitude, longitude: end.longitude },
        'driving-car'
      );

      if (routeResult.success) {
        setGeneratedRoute(routeResult);
        setShowRouteModal(true);
        if (mapReady) {
          // send the route to the robust HTML: expects route.coordinates as [[lng, lat], ...]
          postMessage({ type: 'updateRoute', route: { coordinates: routeResult.coordinates }, color: '#FF5722' });
        }
      } else {
        Alert.alert('Error al generar ruta', routeResult.error || 'No se pudo calcular la ruta', [{ text: 'OK' }]);
      }
    } catch (error) {
      Alert.alert('Error', 'Error al generar la ruta: ' + error.message, [{ text: 'OK' }]);
    } finally {
      setRouteLoading(false);
    }
  };

  const clearRoute = () => {
    setStartPoint(null);
    setEndPoint(null);
    setGeneratedRoute(null);
    setShowRouteModal(false);
    postMessage({ type: 'clearAll' });
    // `clearAll` in the WebView sets pointSelectionEnabled = false there.
    // If the RN state still indicates selection mode, re-enable it so
    // the user can immediately place new points after clearing.
    if (isSelectingPoints) {
      postMessage({ type: 'enablePointSelection' });
    }
  };

  // Normalize coordinates to [[lng, lat], ...]
  const normalizeToLngLatArray = (coords) => {
    if (!coords || !Array.isArray(coords)) {
      console.warn('⚠️ normalizeToLngLatArray: coords no válidas:', coords);
      return [];
    }
    
    const result = [];
    console.log('🔄 Normalizando', coords.length, 'coordenadas...');
    
    for (let i = 0; i < coords.length; i++) {
      const c = coords[i];
      if (!c) continue;
      
      // case: [lng, lat] or [lat, lng]
      if (Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
        const a = c[0], b = c[1];
        // If a fits longitude range and b fits latitude range -> assume [lng, lat]
        if (a >= -180 && a <= 180 && b >= -90 && b <= 90) {
          result.push([a, b]);
        // else if a fits latitude and b fits longitude -> swap
        } else if (a >= -90 && a <= 90 && b >= -180 && b <= 180) {
          result.push([b, a]);
        } else {
          // fallback: push as-is
          result.push([a, b]);
        }
      } else if (typeof c === 'object' && c !== null) {
        // case: { latitude, longitude } or { lat, lng }
        const lat = c.latitude ?? c.lat ?? c[1];
        const lng = c.longitude ?? c.lng ?? c[0];
        if (typeof lat === 'number' && typeof lng === 'number') {
          result.push([lng, lat]);
        } else {
          console.warn(`⚠️ Coordenada inválida en índice ${i}:`, c);
        }
      } else {
        console.warn(`⚠️ Formato de coordenada no reconocido en índice ${i}:`, c);
      }
    }
    
    console.log(`✅ Normalizadas ${result.length}/${coords.length} coordenadas correctamente`);
    return result;
  };

  // When generatedRoute becomes available and mapReady, send it to the webview
  useEffect(() => {
    if (generatedRoute && mapReady && webViewRef && webViewRef.current) {
      try {
        const coords = normalizeToLngLatArray(generatedRoute.coordinates);
        if (coords.length > 0) {
          postMessage({ type: 'updateRoute', route: { coordinates: coords }, color: '#FF5722' });
        }
      } catch (e) {
        console.warn('Error enviando ruta al webview:', e);
      }
    }
  }, [generatedRoute, mapReady]);

  const polylineCoords = (() => {
    if (!customRoute) return [];
    
    if (customRoute.coordinates && Array.isArray(customRoute.coordinates)) {
      try {
        console.log('🔄 Procesando coordenadas para polylineCoords:', customRoute.coordinates.length, 'puntos');
        console.log('🔄 Primera coordenada original:', customRoute.coordinates[0]);
        
        // Use the normalizeToLngLatArray function for consistency
        const normalized = normalizeToLngLatArray(customRoute.coordinates);
        console.log('🔄 Primera coordenada normalizada:', normalized[0]);
        
        return normalized;
      } catch (e) {
        console.error('❌ Error procesando polylineCoords:', e);
        return [];
      }
    }
    
    console.log('📍 No hay coordenadas válidas en customRoute');
    return [];
  })();

  const initialRegion = {
    latitude: location ? location.latitude : -17.3895,
    longitude: location ? location.longitude : -66.1568,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  };

  return {
    location,
    loading,
    error,
    mapReady,
    isSelectingPoints,
    startPoint,
    endPoint,
    generatedRoute,
    routeLoading,
    showRouteModal,
    showGuestModal,
    customRoute,
    polylineCoords,
    initialRegion,
    centerOnUser,
    centerOnRoute,
    updateLocationOnMap,
    handleWebViewMessage,
    togglePointSelection,
    generateRoute,
    clearRoute,
    setShowGuestModal,
    setShowRouteModal
  };
}
