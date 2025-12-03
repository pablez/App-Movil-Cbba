import * as Location from 'expo-location';

/**
 * Servicio de OpenRouteService para geocodificación y búsqueda de ubicaciones
 * 
 * CONFIGURACIÓN ACTUAL: API Pública OpenRouteService
 * - Límite: 2000 requests/día
 * - Endpoints: Geocoding, Routing, Isochrones, Matrix
 * 
 * MIGRACIÓN FUTURA: Para producción se puede usar instancia local
 * - Sin límites de requests
 * - Mayor velocidad
 * - Datos personalizados de Bolivia
 * - Instrucciones en: /OPENROUTE_LOCAL_SETUP.md
 * 
 * API Key: eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjliYzhiZDJmY2RjMTQxNzRhZGRkM2UyZDUyNWRhYmJiIiwiaCI6Im11cm11cjY0In0=
 */

// 🌐 CONFIGURACIÓN DE ENDPOINTS
// Para migrar a instancia local, cambiar BASE_URL a: 'http://localhost:8080/ors'
const API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjliYzhiZDJmY2RjMTQxNzRhZGRkM2UyZDUyNWRhYmJiIiwiaCI6Im11cm11cjY0In0=';
const BASE_URL = 'https://api.openrouteservice.org'; // API Pública
// const BASE_URL = 'http://localhost:8080/ors'; // ⬅ Para instancia local (futuro)
// const API_KEY = null; // ⬅ No necesario en instancia local


// Configuración para Cochabamba, Bolivia
const COCHABAMBA_BOUNDS = {
  min_lon: -66.3,
  min_lat: -17.5,
  max_lon: -66.0,
  max_lat: -17.2
};

class LocationService {
  
  /**
   * Obtiene la ubicación actual del dispositivo usando Expo Location
   */
  static async getCurrentLocation() {
    try {
      console.log('🔍 Solicitando permisos de ubicación...');
      
      // Solicitar permisos
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permisos de ubicación denegados');
      }

      console.log('✅ Permisos concedidos, obteniendo ubicación...');

      // Obtener ubicación con alta precisión
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        maximumAge: 10000, // Cache de 10 segundos
        timeout: 15000, // Timeout de 15 segundos
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        timestamp: new Date(location.timestamp)
      };

      console.log('📍 Ubicación obtenida:', coords);
      return coords;

    } catch (error) {
      console.error('❌ Error obteniendo ubicación:', error);
      throw error;
    }
  }

  /**
   * Busca lugares usando OpenRouteService Geocoding API
   * @param {string} query - Término de búsqueda (ej: "Plaza 14 de Septiembre, Cochabamba")
   * @param {Object} options - Opciones adicionales
   */
  static async searchPlaces(query, options = {}) {
    try {
      console.log('🔍 Buscando lugares:', query);

      const params = new URLSearchParams({
        api_key: API_KEY,
        text: query,
        size: options.limit || 10,
        layers: options.layers || 'venue,address,locality,neighbourhood',
        'boundary.country': 'BOL', // Limitar a Bolivia
        'focus.point.lat': options.focusLat || -17.3895, // Centro de Cochabamba
        'focus.point.lon': options.focusLon || -66.1568,
        'boundary.rect.min_lat': COCHABAMBA_BOUNDS.min_lat,
        'boundary.rect.min_lon': COCHABAMBA_BOUNDS.min_lon,
        'boundary.rect.max_lat': COCHABAMBA_BOUNDS.max_lat,
        'boundary.rect.max_lon': COCHABAMBA_BOUNDS.max_lon,
      });

      const url = `${BASE_URL}/geocode/search?${params}`;
      console.log('🌐 URL de búsqueda:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Lugares encontrados:', data.features.length);

      // Procesar y formatear los resultados
      const places = data.features.map(feature => ({
        id: feature.properties.gid,
        name: feature.properties.name,
        label: feature.properties.label,
        coordinates: {
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0]
        },
        address: {
          street: feature.properties.street,
          housenumber: feature.properties.housenumber,
          locality: feature.properties.locality,
          region: feature.properties.region,
          country: feature.properties.country
        },
        confidence: feature.properties.confidence,
        accuracy: feature.properties.accuracy,
        layer: feature.properties.layer,
        source: feature.properties.source,
        distance: options.userLocation ? 
          this.calculateDistance(
            options.userLocation.latitude, 
            options.userLocation.longitude,
            feature.geometry.coordinates[1], 
            feature.geometry.coordinates[0]
          ) : null
      }));

      return {
        success: true,
        places: places.sort((a, b) => (a.distance || 0) - (b.distance || 0)),
        total: data.features.length,
        query: query
      };

    } catch (error) {
      console.error('❌ Error buscando lugares:', error);
      return {
        success: false,
        error: error.message,
        places: [],
        total: 0,
        query: query
      };
    }
  }

  /**
   * 🚀 OPTIMIZADO: Búsqueda en tiempo real para AdminMapScreen
   * Configurado para máxima velocidad y mínima latencia
   */
  static async searchPlacesRealTime(query, userLocation = null) {
    try {
      console.log('🔍 Búsqueda tiempo real:', query);

      if (!query || query.length < 2) {
        return { success: true, places: [], total: 0 };
      }

      // 🚀 Configuración optimizada
      const params = new URLSearchParams({
        api_key: API_KEY,
        text: `${query} Cochabamba`,
        size: 6, // Máximo 6 resultados para velocidad
        layers: 'venue,address,locality',
        'boundary.country': 'BOL',
        'focus.point.lat': userLocation?.latitude || -17.3895,
        'focus.point.lon': userLocation?.longitude || -66.1568,
        'boundary.rect.min_lat': COCHABAMBA_BOUNDS.min_lat,
        'boundary.rect.min_lon': COCHABAMBA_BOUNDS.min_lon,
        'boundary.rect.max_lat': COCHABAMBA_BOUNDS.max_lat,
        'boundary.rect.max_lon': COCHABAMBA_BOUNDS.max_lon,
      });

      const url = `${BASE_URL}/geocode/search?${params}`;
      
      // 🚀 Timeout agresivo para tiempo real
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ ${data.features.length} lugares encontrados`);

      // 🚀 Procesamiento ultra-optimizado
      const places = data.features.map(f => {
        const [lng, lat] = f.geometry.coordinates;
        const p = f.properties;
        
        return {
          id: p.gid,
          name: p.name || 'Ubicación',
          label: p.label || p.name || 'Sin nombre',
          coordinates: { latitude: lat, longitude: lng },
          address: p.locality || 'Cochabamba',
          confidence: p.confidence || 0.5,
          distance: userLocation ? 
            this.calculateDistance(userLocation.latitude, userLocation.longitude, lat, lng) 
            : null
        };
      });

      // Ordenar por relevancia
      places.sort((a, b) => {
        if (Math.abs(a.confidence - b.confidence) > 0.1) {
          return b.confidence - a.confidence;
        }
        return (a.distance || 999) - (b.distance || 999);
      });

      return {
        success: true,
        places,
        total: places.length,
        query
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('⚠️ Búsqueda cancelada - timeout');
        return { success: false, places: [], total: 0, error: 'Timeout' };
      }
      
      console.error('❌ Error búsqueda tiempo real:', error);
      return { success: false, places: [], total: 0, error: error.message };
    }
  }

  /**
   * Geocodificación inversa: obtiene la dirección desde coordenadas
   * @param {number} latitude - Latitud
   * @param {number} longitude - Longitud
   */
  static async reverseGeocode(latitude, longitude) {
    try {
      console.log('🔄 Geocodificación inversa:', { latitude, longitude });

      const params = new URLSearchParams({
        api_key: API_KEY,
        'point.lat': latitude,
        'point.lon': longitude,
        size: 1,
        layers: 'address,venue,neighbourhood,locality'
      });

      const url = `${BASE_URL}/geocode/reverse?${params}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const address = {
          formatted: feature.properties.label,
          street: feature.properties.street,
          housenumber: feature.properties.housenumber,
          neighbourhood: feature.properties.neighbourhood,
          locality: feature.properties.locality,
          region: feature.properties.region,
          country: feature.properties.country,
          postalcode: feature.properties.postalcode,
          confidence: feature.properties.confidence
        };

        console.log('✅ Dirección encontrada:', address.formatted);
        return { success: true, address };
      } else {
        return { 
          success: false, 
          error: 'No se encontró dirección para estas coordenadas',
          address: null 
        };
      }

    } catch (error) {
      console.error('❌ Error en geocodificación inversa:', error);
      return { success: false, error: error.message, address: null };
    }
  }

  /**
   * Busca lugares específicos en Cochabamba
   * @param {string} category - Categoría (hospital, universidad, banco, etc.)
   */
  static async findPlacesByCategory(category) {
    const categoryQueries = {
      hospitales: 'hospital Cochabamba Bolivia',
      universidades: 'universidad Cochabamba Bolivia', 
      bancos: 'banco Cochabamba Bolivia',
      restaurantes: 'restaurante Cochabamba Bolivia',
      farmacias: 'farmacia Cochabamba Bolivia',
      gasolineras: 'gasolinera Cochabamba Bolivia',
      supermercados: 'supermercado Cochabamba Bolivia',
      hoteles: 'hotel Cochabamba Bolivia'
    };

    const query = categoryQueries[category.toLowerCase()] || `${category} Cochabamba Bolivia`;
    
    return await this.searchPlaces(query, {
      limit: 15,
      layers: 'venue,address'
    });
  }

  /**
   * Calcula la distancia entre dos puntos (en kilómetros)
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en km
  }

  /**
   * Convierte grados a radianes
   */
  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Obtiene sugerencias de autocompletado
   * @param {string} input - Texto parcial del usuario
   */
  static async getAutocompleteSuggestions(input) {
    if (!input || input.length < 2) {
      return { success: true, suggestions: [] };
    }

    try {
      const params = new URLSearchParams({
        api_key: API_KEY,
        text: `${input} Cochabamba`,
        size: 5,
        layers: 'venue,address,locality',
        'boundary.country': 'BOL',
        'focus.point.lat': -17.3895,
        'focus.point.lon': -66.1568
      });

      const url = `${BASE_URL}/geocode/autocomplete?${params}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        // Si autocomplete no está disponible, usar search
        return await this.searchPlaces(input, { limit: 5 });
      }

      const data = await response.json();
      
      const suggestions = data.features.map(feature => ({
        id: feature.properties.gid,
        text: feature.properties.label,
        name: feature.properties.name,
        coordinates: {
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0]
        }
      }));

      return { success: true, suggestions };

    } catch (error) {
      console.error('❌ Error en autocompletado:', error);
      return { success: false, suggestions: [], error: error.message };
    }
  }

  /**
   * Valida si unas coordenadas están dentro de Cochabamba
   */
  static isWithinCochabamba(latitude, longitude) {
    return (
      latitude >= COCHABAMBA_BOUNDS.min_lat &&
      latitude <= COCHABAMBA_BOUNDS.max_lat &&
      longitude >= COCHABAMBA_BOUNDS.min_lon &&
      longitude <= COCHABAMBA_BOUNDS.max_lon
    );
  }

  /**
   * Obtiene la ubicación actual con dirección
   */
  static async getCurrentLocationWithAddress() {
    try {
      const location = await this.getCurrentLocation();
      const addressResult = await this.reverseGeocode(location.latitude, location.longitude);
      
      return {
        success: true,
        location,
        address: addressResult.success ? addressResult.address : null,
        isInCochabamba: this.isWithinCochabamba(location.latitude, location.longitude)
      };
    } catch (error) {
      console.error('❌ Error obteniendo ubicación con dirección:', error);
      return {
        success: false,
        error: error.message,
        location: null,
        address: null,
        isInCochabamba: false
      };
    }
  }

  /**
   * Calcula ruta óptima entre dos puntos usando OpenRouteService Directions API
   * @param {Object} start - Punto de origen {latitude, longitude}
   * @param {Object} end - Punto de destino {latitude, longitude} 
   * @param {String} profile - Perfil de ruta: 'driving-car', 'foot-walking', 'cycling-regular'
   * @returns {Object} Resultado con coordenadas de la ruta, distancia y tiempo
   */
  static async getOptimalRoute(start, end, profile = 'driving-car') {
    try {
      console.log('🛣️ Calculando ruta óptima:', profile);
      console.log('📍 Origen:', start);
      console.log('🎯 Destino:', end);

      // Validar coordenadas
      if (!start?.latitude || !start?.longitude || !end?.latitude || !end?.longitude) {
        throw new Error('Coordenadas inválidas para calcular la ruta');
      }

      // Construir URL de la API de Directions (formato JSON estándar, no GeoJSON)
      const url = `${BASE_URL}/v2/directions/${profile}`;
      
      // Coordenadas en formato [lng, lat] para OpenRouteService
      const requestCoordinates = [
        [start.longitude, start.latitude],
        [end.longitude, end.latitude]
      ];

      const requestBody = {
        coordinates: requestCoordinates,
        format: 'json', // JSON estándar, no geojson
        instructions: true,
        language: 'es',
        units: 'km',
        geometry: true, // Incluir geometría de la ruta
        elevation: false // No necesitamos elevación para simplificar
      };

      console.log('📡 Enviando solicitud de ruta a OpenRouteService...');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': API_KEY,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en la API de rutas (${response.status}): ${errorText}`);
      }

      const routeData = await response.json();

      if (!routeData.routes || routeData.routes.length === 0) {
        throw new Error('No se pudo calcular una ruta válida');
      }

      const route = routeData.routes[0];
      const summary = route.summary;
      const segment = route.segments[0];

      // Decodificar la geometría si está en formato encoded polyline
      let routeCoordinates;
      if (typeof route.geometry === 'string') {
        // La geometría está codificada, necesitamos decodificarla
        console.log('🔄 Decodificando polyline geometry...');
        routeCoordinates = this.decodePolyline(route.geometry);
      } else if (Array.isArray(route.geometry)) {
        // Ya está en formato de coordenadas
        routeCoordinates = route.geometry;
      } else {
        console.warn('⚠️ Formato de geometría no reconocido, usando línea recta');
        routeCoordinates = [[start.longitude, start.latitude], [end.longitude, end.latitude]];
      }

      // Extraer información de la ruta
      const routeInfo = {
        success: true,
        coordinates: routeCoordinates, // Array de [lng, lat] puntos
        distance: summary.distance * 1000, // Convertir de km a metros
        duration: summary.duration, // Ya está en segundos
        steps: segment.steps, // Pasos detallados
        summary: summary,
        profile: profile,
        bounds: routeData.bbox ? {
          minLng: routeData.bbox[0],
          minLat: routeData.bbox[1],
          maxLng: routeData.bbox[2],
          maxLat: routeData.bbox[3]
        } : this.calculateBounds(routeCoordinates)
      };

      console.log('✅ Ruta calculada exitosamente:');
      console.log(`📏 Distancia: ${(routeInfo.distance / 1000).toFixed(2)} km`);
      console.log(`⏱️ Tiempo estimado: ${Math.round(routeInfo.duration / 60)} min`);
      console.log(`🗺️ Puntos de ruta: ${routeInfo.coordinates.length}`);

      return routeInfo;

    } catch (error) {
      console.error('❌ Error calculando ruta óptima:', error);
      return {
        success: false,
        error: error.message,
        fallback: true,
        // Fallback: línea recta entre puntos
        coordinates: [[start.longitude, start.latitude], [end.longitude, end.latitude]],
        distance: this.calculateStraightDistance(start, end) * 1000, // Convertir a metros
        duration: null,
        steps: [],
        profile: profile
      };
    }
  }

  /**
   * Decodifica un encoded polyline (algoritmo de Google)
   * @param {String} encoded - String codificado
   * @returns {Array} Array de coordenadas [lng, lat]
   */
  static decodePolyline(encoded) {
    if (!encoded) return [];
    
    const coords = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    try {
      while (index < encoded.length) {
        let b;
        let shift = 0;
        let result = 0;

        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);

        const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += deltaLat;

        shift = 0;
        result = 0;

        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);

        const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += deltaLng;

        coords.push([lng / 1e5, lat / 1e5]); // [lng, lat] dividido por 100000
      }
    } catch (error) {
      console.error('❌ Error decodificando polyline:', error);
      return [];
    }

    console.log(`🔄 Polyline decodificado: ${coords.length} puntos`);
    return coords;
  }

  /**
   * Calcula los límites de una ruta (bounding box)
   * @param {Array} coordinates - Array de coordenadas [lng, lat]
   * @returns {Object} Límites {minLng, minLat, maxLng, maxLat}
   */
  static calculateBounds(coordinates) {
    if (!coordinates || coordinates.length === 0) {
      return null;
    }

    let minLng = coordinates[0][0];
    let maxLng = coordinates[0][0];
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];

    coordinates.forEach(([lng, lat]) => {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    return { minLng, minLat, maxLng, maxLat };
  }

  /**
   * Calcula distancia en línea recta entre dos puntos (Haversine)
   * @param {Object} point1 - {latitude, longitude}
   * @param {Object} point2 - {latitude, longitude}  
   * @returns {Number} Distancia en kilómetros
   */
  static calculateStraightDistance(point1, point2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLng = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
             Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * 🆕 Calcula isócronas: área alcanzable en un tiempo determinado
   * Útil para mostrar zonas de cobertura de rutas de transporte
   * @param {Object} center - Punto central {latitude, longitude}
   * @param {Array} timeRanges - Rangos de tiempo en segundos [300, 600, 900] = [5min, 10min, 15min]
   * @param {String} profile - 'driving-car', 'foot-walking', 'cycling-regular'
   * @returns {Object} Polígonos de isócronas para mostrar en el mapa
   */
  static async getIsochrones(center, timeRanges = [600, 1200], profile = 'driving-car') {
    try {
      console.log('🌐 Calculando isócronas:', { center, timeRanges, profile });

      const url = `${BASE_URL}/v2/isochrones/${profile}`;
      
      const requestBody = {
        locations: [[center.longitude, center.latitude]],
        range: timeRanges,
        range_type: 'time', // tiempo en segundos
        units: 'km',
        location_type: 'start',
        smoothing: 0.9
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': API_KEY,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Error isócronas: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error('No se pudieron calcular las isócronas');
      }

      const isochrones = data.features.map(feature => ({
        timeRange: feature.properties.value, // tiempo en segundos
        timeMinutes: Math.round(feature.properties.value / 60),
        coordinates: feature.geometry.coordinates[0], // polígono exterior
        area: feature.properties.area, // área en km²
        reachfactor: feature.properties.reachfactor
      }));

      console.log('✅ Isócronas calculadas:', isochrones.length);
      return { success: true, isochrones, center, profile };

    } catch (error) {
      console.error('❌ Error calculando isócronas:', error);
      return { success: false, error: error.message, isochrones: [] };
    }
  }
}

export default LocationService;
