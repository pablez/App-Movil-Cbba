import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Text
} from 'react-native';
import { ROUTE_150_DATA, ROUTE_230_DATA, ROUTE_INFO } from '../data/routes';
import {
  AdminHeader,
  AdminSearchBar,
  AdminMapWebView,
  RouteInfoPanel,
  AdminMapControls,
  FloatingSearchButton,
  useAdminMapLogic
} from '../components/admin';

const AdminMapScreen = ({ navigation, route }) => {
  // Hook personalizado con toda la lógica del mapa
  const {
    location,
    loading,
    mapReady,
    currentRoute,
    routeData,
    pendingCustomRoute,
    webViewRef,
    setCurrentRoute,
    setRouteData,
    setPendingCustomRoute,
    setMapReady,
    getCurrentLocation,
    updateMapLocation,
    centerOnLocation,
    showTransportRoute,
    showCustomRoute,
    addSearchMarker
  } = useAdminMapLogic();

  // Obtener parámetros de navegación
  const routeType = route?.params?.routeType || null;
  const editMode = route?.params?.editMode || false;

  // Inicialización
  useEffect(() => {
    getCurrentLocation();
    
    if (routeType) {
      setCurrentRoute(routeType);
    }

    if (route?.params?.editMode) {
      console.log('✏️ Modo edición activado en AdminMap');
    }
  }, [routeType]);

  // Manejar navegación y parámetros
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Manejar ruta origen-destino
      if (route.params?.origin && route.params?.destination && route.params?.showRoute) {
        console.log('🗺️ Recibiendo datos de ruta completa:', {
          hasOrigin: !!route.params.origin,
          hasDestination: !!route.params.destination,
          hasRouteInfo: !!route.params.routeInfo,
          coordinatesCount: route.params.routeInfo?.coordinates?.length || 0
        });
        
        setRouteData({
          origin: route.params.origin,
          destination: route.params.destination,
          routeInfo: route.params.routeInfo,
          routeError: route.params.routeError
        });
        
        navigation.setParams({ 
          origin: null, 
          destination: null, 
          showRoute: null, 
          routeInfo: null, 
          routeError: null 
        });
        return;
      }
      
      // Manejar lugar seleccionado
      if (route.params?.selectedPlace) {
        const place = route.params.selectedPlace;
        console.log('📍 Lugar seleccionado recibido:', place);
        
        updateMapLocation(place.coordinates.latitude, place.coordinates.longitude);
        addSearchMarker(place);
        
        navigation.setParams({ selectedPlace: null });
      }
    });

    return unsubscribe;
  }, [navigation, mapReady]);

  // Observador directo de route.params
  useEffect(() => {
    if (route?.params?.origin && route?.params?.destination && route?.params?.showRoute) {
      setRouteData({
        origin: route.params.origin,
        destination: route.params.destination,
        routeInfo: route.params.routeInfo,
        routeError: route.params.routeError
      });

      navigation.setParams({ origin: null, destination: null, showRoute: null, routeInfo: null, routeError: null });
    }
  }, [route?.params]);

  // Efecto para manejar rutas origen-destino con reintentos
  useEffect(() => {
    if (!routeData) return;

    let attempts = 0;
    const maxAttempts = 15;
    let intervalId = null;

    const tryShow = () => {
      attempts += 1;
      const hasWebView = !!webViewRef.current;

      if (hasWebView && mapReady) {
        console.log('🛣️ Mostrando ruta en el mapa admin');
        try {
          showCustomRoute(routeData);
        } catch (e) {
          console.error('❌ Error al ejecutar showCustomRoute:', e);
        }
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        return;
      }

      if (attempts >= maxAttempts) {
        console.warn('⚠️ No fue posible mostrar la ruta tras varios intentos');
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
      }
    };

    tryShow();
    if (!(webViewRef.current && mapReady)) {
      intervalId = setInterval(tryShow, 300);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [routeData, mapReady]);

  // Mostrar ruta cuando cambia currentRoute
  useEffect(() => {
    if (currentRoute && mapReady) {
      let routeDataSource = null;
      let routeInfo = null;
      
      switch (currentRoute) {
        case 'line150':
          routeDataSource = ROUTE_150_DATA;
          routeInfo = ROUTE_INFO.line150;
          break;
        case 'line230':
          routeDataSource = ROUTE_230_DATA;
          routeInfo = ROUTE_INFO.line230;
          break;
      }

      if (routeDataSource && routeInfo) {
        showTransportRoute(currentRoute, routeDataSource, routeInfo);
      }
    }

    // Manejar customRoute desde params
    if (route?.params?.customRoute) {
      const cr = route.params.customRoute;
      let coords = cr.coordinates || [];
      if (coords.length > 0 && coords[0] && typeof coords[0] === 'object' && !Array.isArray(coords[0])) {
        try {
          coords = coords.map(c => [c.lng, c.lat]);
        } catch (e) { /* keep original */ }
      }
      const normalized = { ...cr, coordinates: coords };
      setPendingCustomRoute(normalized);
      navigation.setParams({ customRoute: null });
    }
  }, [currentRoute, mapReady, route?.params?.customRoute]);

  // Selector de tipo de mapa (tile layers)
  const [mapStyle, setMapStyle] = useState('standard');

  const TILE_STYLES = {
    standard: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '© OpenStreetMap contributors'
    },
    cyclo: {
      url: 'https://tiles-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors — CyclOSM'
    },
    transport: {
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
      // guardar pedido para aplicar cuando el mapa esté listo
      setPendingCustomRoute(prev => ({ ...(prev || {}), _tileChange: styleKey }));
    }
  };

  // Procesar pendingCustomRoute
  useEffect(() => {
    if (!pendingCustomRoute) return;

    let attempts = 0;
    const maxAttempts = 20;
    
    const trySend = () => {
      attempts += 1;
      const ready = !!webViewRef.current && mapReady;
      
      if (ready) {
        const cr = pendingCustomRoute;
        let coordsToSend = cr.coordinates || [];
        if (coordsToSend.length > 0 && coordsToSend[0] && typeof coordsToSend[0] === 'object' && !Array.isArray(coordsToSend[0])) {
          try { 
            coordsToSend = coordsToSend.map(c => [c.lng, c.lat]); 
          } catch (e) { /* keep original */ }
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
        console.warn('⚠️ No se pudo enviar pendingCustomRoute');
        setPendingCustomRoute(null);
      }
    };

    trySend();
    const interval = setInterval(() => {
      if (!pendingCustomRoute) { clearInterval(interval); return; }
      trySend();
    }, 300);

    return () => clearInterval(interval);
  }, [pendingCustomRoute, mapReady]);

  // Manejar mensajes del WebView
  const handleWebViewMessage = (event) => {
    const message = event.nativeEvent.data;
    
    try {
      const parsed = JSON.parse(message);
      if (parsed && parsed.type === 'adminMapPoint') {
        console.log('✏️ Punto admin recibido:', parsed);
        const returnTo = route?.params?.returnTo || null;
        if (returnTo) {
          navigation.navigate(returnTo, { 
            adminMapPoint: { 
              latitude: parsed.latitude, 
              longitude: parsed.longitude 
            } 
          });
        } else {
          navigation.setParams({ 
            adminMapPoint: { 
              latitude: parsed.latitude, 
              longitude: parsed.longitude 
            } 
          });
        }
        return;
      }
      
      if (parsed && (parsed.type === 'routeDisplayed' || parsed.type === 'detailedRouteDisplayed')) {
        console.log('webview route event', parsed);
        return;
      }
    } catch (e) {
      // No es JSON, procesar como texto
    }

    if (message === 'mapReady') {
      setMapReady(true);
      if (location) {
        updateMapLocation(location.latitude, location.longitude);
      }
    }
  };

  // Manejar búsqueda
  const handleSearch = () => {
    console.log('🔍 Navegando a LocationSearch...');
    navigation.navigate('LocationSearch');
  };

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
      
      <AdminHeader 
        currentRoute={currentRoute}
        onCloseRoute={() => setCurrentRoute(null)}
        navigation={navigation}
      />

      <AdminSearchBar onPress={handleSearch} />

      <View style={styles.controlsContainer}>
        <RouteInfoPanel 
          currentRoute={currentRoute}
          onCloseRoute={() => setCurrentRoute(null)}
        />
        
        <AdminMapControls 
          location={location}
            onCenterLocation={centerOnLocation}
            changeTileLayer={changeTileLayer}
            mapStyle={mapStyle}
        />
      </View>

      <AdminMapWebView 
        location={location}
        mapReady={mapReady}
        webViewRef={webViewRef}
        editMode={editMode}
        onMessage={handleWebViewMessage}
        onMapReady={() => setMapReady(true)}
      />

      <FloatingSearchButton onPress={handleSearch} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});

export default AdminMapScreen;