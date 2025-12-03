import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';

export const useAdminMapLogic = () => {
  // Estados principales
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [pendingCustomRoute, setPendingCustomRoute] = useState(null);

  // Referencias
  const webViewRef = useRef(null);

  // Obtener ubicación GPS
  const getCurrentLocation = async () => {
    try {
      console.log('🔍 Obteniendo ubicación GPS...');
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return false;
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
      return locationData;
      
    } catch (error) {
      console.error('❌ Error obteniendo ubicación:', error);
      setLoading(false);
      
      Alert.alert(
        'Error de GPS',
        'No se pudo obtener la ubicación actual. ¿Deseas intentar nuevamente?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reintentar', onPress: getCurrentLocation }
        ]
      );
      return false;
    }
  };

  // Obtener dirección desde coordenadas
  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      const API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjliYzhiZDJmY2RjMTQxNzRhZGRkM2UyZDUyNWRhYmJiIiwiaCI6Im11cm11cjY0In0=';
      const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${API_KEY}&point.lat=${latitude}&point.lon=${longitude}&size=1`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
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

  // Actualizar ubicación en el mapa
  const updateMapLocation = async (latitude, longitude) => {
    if (webViewRef.current && mapReady) {
      try {
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

  // Centrar en la ubicación actual
  const centerOnLocation = () => {
    if (location) {
      updateMapLocation(location.latitude, location.longitude);
      console.log('📍 Centrando en ubicación:', location);
      
      if (webViewRef.current && mapReady) {
        const script = `if (window.clearSearchMarkers) { window.clearSearchMarkers(); }`;
        webViewRef.current.postMessage(script);
      }
    }
  };

  // Mostrar ruta de transporte público
  const showTransportRoute = (routeType, routeDataSource, routeInfo) => {
    if (!webViewRef.current || !mapReady) return;
    
    if (!routeDataSource || !routeDataSource.features || routeDataSource.features.length === 0) {
      console.warn('⚠️ No se encontraron datos de ruta para:', routeType);
      return;
    }
    
    const coordinates = routeDataSource.features[0].geometry.coordinates;
    const routeColor = routeInfo.color;
    const routeName = routeInfo.name;
    
    const script = `
      if (window.addTransportRoute) {
        const coordinates = ${JSON.stringify(coordinates)};
        window.addTransportRoute(coordinates, "${routeColor}", "${routeName}");
        console.log('🚌 Ruta ${routeName} agregada al mapa');
        
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

  // Mostrar ruta personalizada
  const showCustomRoute = (routeData) => {
    if (!webViewRef.current || !routeData) return;
    
    const { origin, destination, routeInfo, originName = 'Tu ubicación', destinationName = 'Destino' } = routeData;
    
    console.log('🛣️ Mostrando ruta personalizada:', originName, '->', destinationName);
    
    if (routeInfo && routeInfo.coordinates && routeInfo.coordinates.length > 2) {
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
        } else if (window.showRoute) {
          window.showRoute(
            ${origin.latitude}, 
            ${origin.longitude}, 
            ${destination.latitude}, 
            ${destination.longitude},
            "${originName}",
            "${destinationName}"
          );
        }
      `;
      webViewRef.current.postMessage(script);
    } else {
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
        }
      `;
      webViewRef.current.postMessage(script);
    }
  };

  // Procesar marcador de búsqueda
  const addSearchMarker = (place) => {
    if (webViewRef.current && mapReady) {
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
      
      try {
        webViewRef.current.postMessage(script);
      } catch (error) {
        console.error('❌ Error enviando mensaje al WebView:', error);
      }
    }
  };

  return {
    // Estados
    location,
    loading,
    mapReady,
    currentRoute,
    routeData,
    pendingCustomRoute,
    
    // Referencias
    webViewRef,
    
    // Setters
    setLocation,
    setLoading,
    setMapReady,
    setCurrentRoute,
    setRouteData,
    setPendingCustomRoute,
    
    // Funciones
    getCurrentLocation,
    updateMapLocation,
    centerOnLocation,
    showTransportRoute,
    showCustomRoute,
    addSearchMarker,
    getAddressFromCoordinates
  };
};