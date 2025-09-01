import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LocationService from '../services/LocationService';

const LocationSearchScreen = ({ navigation, route }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const { onLocationSelect } = route.params || {};

  const categories = [
    { id: 'hospitales', name: 'Hospitales', icon: 'medical', color: '#e74c3c' },
    { id: 'universidades', name: 'Universidades', icon: 'school', color: '#3498db' },
    { id: 'bancos', name: 'Bancos', icon: 'card', color: '#f39c12' },
    { id: 'restaurantes', name: 'Restaurantes', icon: 'restaurant', color: '#e67e22' },
    { id: 'farmacias', name: 'Farmacias', icon: 'medical-outline', color: '#27ae60' },
    { id: 'supermercados', name: 'Supermercados', icon: 'storefront', color: '#9b59b6' },
    { id: 'gasolineras', name: 'Gasolineras', icon: 'car', color: '#34495e' },
    { id: 'hoteles', name: 'Hoteles', icon: 'bed', color: '#1abc9c' }
  ];

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        getSuggestions();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const getCurrentLocation = async () => {
    try {
      console.log('📍 Obteniendo ubicación actual...');
      const result = await LocationService.getCurrentLocationWithAddress();
      if (result.success) {
        console.log('✅ Ubicación actual obtenida:', result);
        setCurrentLocation(result);
      } else {
        console.warn('⚠️ No se pudo obtener la ubicación actual:', result.error);
      }
    } catch (error) {
      console.error('❌ Error obteniendo ubicación actual:', error);
    }
  };

  const getSuggestions = async () => {
    try {
      const result = await LocationService.getAutocompleteSuggestions(searchQuery);
      if (result.success) {
        setSuggestions(result.suggestions.slice(0, 5));
      }
    } catch (error) {
      console.error('Error obteniendo sugerencias:', error);
    }
  };

  const searchPlaces = async (query = searchQuery) => {
    if (!query.trim()) {
      Alert.alert('Error', 'Por favor ingresa un término de búsqueda');
      return;
    }

    setLoading(true);
    try {
      const result = await LocationService.searchPlaces(query, {
        limit: 20,
        userLocation: currentLocation?.location
      });

      if (result.success) {
        setSearchResults(result.places);
        if (result.places.length === 0) {
          Alert.alert('Sin resultados', 'No se encontraron lugares con ese nombre');
        }
      } else {
        Alert.alert('Error', result.error || 'Error al buscar lugares');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo realizar la búsqueda');
    } finally {
      setLoading(false);
      setSuggestions([]);
    }
  };

  const searchByCategory = async (categoryId) => {
    setSelectedCategory(categoryId);
    setLoading(true);
    try {
      const result = await LocationService.findPlacesByCategory(categoryId);
      if (result.success) {
        setSearchResults(result.places);
        setSearchQuery(categories.find(c => c.id === categoryId)?.name || '');
      } else {
        Alert.alert('Error', result.error || 'Error al buscar lugares');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo realizar la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const selectLocation = async (place) => {
    console.log('🎯 Lugar seleccionado:', place);
    console.log('🔍 Debug - Estado actual:', {
      hasCurrentLocation: !!currentLocation,
      currentLocationData: currentLocation,
      hasOnLocationSelect: !!onLocationSelect,
      hasReturnScreen: !!route.params?.returnScreen,
      routeParams: route.params
    });
    
    if (onLocationSelect) {
      onLocationSelect(place);
      navigation.goBack();
    } else if (route.params?.returnScreen) {
      // Navegar de regreso con el lugar seleccionado
      navigation.navigate(route.params.returnScreen, { 
        selectedPlace: place,
        routeType: route.params?.routeType 
      });
    } else {
      // Calcular ruta óptima usando OpenRouteService Directions API
      console.log('🛤️ Preparando cálculo de ruta...');
      console.log('🔍 Verificando ubicación actual:', {
        hasCurrentLocation: !!currentLocation,
        hasLocationProperty: !!currentLocation?.location,
        currentLocationStructure: currentLocation
      });
      
      if (!currentLocation?.location) {
        console.error('❌ Error: No hay ubicación actual disponible');
        Alert.alert('Error', 'No se pudo obtener tu ubicación actual');
        return;
      }

      console.log('🛣️ Calculando ruta óptima...');
      console.log('📍 Origen:', currentLocation.location);
      console.log('🎯 Destino:', place.coordinates);
      setLoading(true);

      try {
        // Calcular ruta usando el servicio de enrutamiento
        const routeResult = await LocationService.getOptimalRoute(
          currentLocation.location,
          place.coordinates,
          'driving-car' // Perfil de conducción por defecto
        );

        console.log('📊 Resultado de ruta:', {
          success: routeResult.success,
          hasCoordinates: routeResult.coordinates?.length > 0,
          pointsCount: routeResult.coordinates?.length,
          distance: routeResult.distance ? `${(routeResult.distance / 1000).toFixed(2)} km` : 'N/A',
          duration: routeResult.duration ? `${Math.round(routeResult.duration / 60)} min` : 'N/A'
        });

        const routeData = {
          origin: {
            latitude: currentLocation.location.latitude,
            longitude: currentLocation.location.longitude,
            name: 'Tu ubicación',
            address: currentLocation.address?.formatted || 'Ubicación actual'
          },
          destination: {
            latitude: place.coordinates.latitude,
            longitude: place.coordinates.longitude,
            name: place.name,
            address: place.label || place.address?.locality || 'Destino'
          },
          selectedLocation: place, // Mantener compatibilidad
          showRoute: true, // Indicar que debe mostrar la ruta
          routeInfo: routeResult.success ? {
            coordinates: routeResult.coordinates,
            distance: routeResult.distance,
            duration: routeResult.duration,
            steps: routeResult.steps,
            profile: routeResult.profile,
            bounds: routeResult.bounds
          } : null,
          routeError: !routeResult.success ? routeResult.error : null
        };
        
        console.log('🗺️ Navegando al mapa con ruta calculada:', {
          hasRouteInfo: !!routeData.routeInfo,
          hasError: !!routeData.routeError
        });
        
        navigation.navigate('AdminMap', routeData);

      } catch (error) {
        console.error('❌ Error calculando ruta:', error);
        Alert.alert('Error', 'No se pudo calcular la ruta. Se mostrará una línea recta.');
        
        // Fallback con línea recta
        const routeData = {
          origin: {
            latitude: currentLocation.location.latitude,
            longitude: currentLocation.location.longitude,
            name: 'Tu ubicación',
            address: currentLocation.address?.formatted || 'Ubicación actual'
          },
          destination: {
            latitude: place.coordinates.latitude,
            longitude: place.coordinates.longitude,
            name: place.name,
            address: place.label || place.address?.locality || 'Destino'
          },
          selectedLocation: place,
          showRoute: true,
          routeInfo: null,
          routeError: error.message
        };
        
        navigation.navigate('AdminMap', routeData);
      } finally {
        setLoading(false);
      }
    }
  };

  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion.text);
    setSuggestions([]);
    searchPlaces(suggestion.text);
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        { borderColor: item.color },
        selectedCategory === item.id && { backgroundColor: item.color + '20' }
      ]}
      onPress={() => searchByCategory(item.id)}
    >
      <Ionicons name={item.icon} size={24} color={item.color} />
      <Text style={[styles.categoryText, { color: item.color }]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => selectLocation(item)}
    >
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Ionicons 
            name={item.layer === 'venue' ? 'business' : 'location'} 
            size={20} 
            color="#2196F3" 
          />
          <Text style={styles.resultName}>{item.name}</Text>
        </View>
        <Text style={styles.resultLabel}>{item.label}</Text>
        {item.address.street && (
          <Text style={styles.resultAddress}>
            {item.address.street} {item.address.housenumber || ''}
          </Text>
        )}
        <View style={styles.resultFooter}>
          <Text style={styles.resultConfidence}>
            Precisión: {Math.round(item.confidence * 100)}%
          </Text>
          {item.distance && (
            <Text style={styles.resultDistance}>
              {item.distance < 1 
                ? `${Math.round(item.distance * 1000)}m` 
                : `${item.distance.toFixed(1)}km`}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => selectSuggestion(item)}
    >
      <Ionicons name="search" size={16} color="#666" />
      <Text style={styles.suggestionText}>{item.text}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buscar Ubicación</Text>
        <TouchableOpacity onPress={getCurrentLocation}>
          <Ionicons name="location" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Ubicación actual */}
      {currentLocation?.address && (
        <View style={styles.currentLocationCard}>
          <Ionicons name="location" size={20} color="#27ae60" />
          <View style={styles.currentLocationText}>
            <Text style={styles.currentLocationTitle}>Tu ubicación actual:</Text>
            <Text style={styles.currentLocationAddress}>
              {currentLocation.address.formatted}
            </Text>
          </View>
        </View>
      )}

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar lugar en Cochabamba..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => searchPlaces()}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => { setSearchQuery(''); setSearchResults([]); setSuggestions([]); }}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => searchPlaces()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="search" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Sugerencias */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Categorías */}
      {searchResults.length === 0 && suggestions.length === 0 && (
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Buscar por categoría:</Text>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Resultados de búsqueda */}
      {searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>
            {searchResults.length} resultados encontrados:
          </Text>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2196F3',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  currentLocationText: {
    marginLeft: 12,
    flex: 1,
  },
  currentLocationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
  },
  currentLocationAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    marginRight: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    paddingVertical: 12,
  },
  searchButton: {
    backgroundColor: '#2196F3',
    borderRadius: 25,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 4,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
  categoriesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  categoryCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    elevation: 2,
  },
  categoryText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
    elevation: 1,
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultAddress: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultConfidence: {
    fontSize: 12,
    color: '#27ae60',
  },
  resultDistance: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default LocationSearchScreen;
