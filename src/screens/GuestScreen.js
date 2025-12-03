import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Alert, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Componentes modulares
import AppHeader from '../components/AppHeader';
import MapWebView from '../components/map/MapWebView';
import RouteSelectionPanel from '../components/map/RouteSelectionPanel';
import FloatingActionButtons from '../components/map/FloatingActionButtons';
import MapTypeSelector from '../components/modals/MapTypeSelector';
import RouteConfirmModal from '../components/modals/RouteConfirmModal';
import GuestWelcomeModal from '../components/modals/GuestWelcomeModal';
import RouteDetailsModal from '../components/modals/RouteDetailsModal';

// Hooks y utilidades
import { useMapLogic } from '../hooks/useMapLogic';
import { generateMapHTML } from '../components/map/MapHTML';
import { MAP_CONFIG, MESSAGE_TYPES } from '../constants/mapConstants';
import PublicMapScreen from './PublicMapScreen';

const GuestScreen = ({ navigation }) => {
  // If this screen was opened via nested navigation with a `customRoute`
  // param we want to show the full `PublicMapScreen` while keeping
  // the bottom tabs visible. React Navigation will pass params
  // when we navigate: navigation.navigate('MainTabs', { screen: 'Mapa', params: { customRoute } })
  const route = navigation.getState && navigation.getState().routes?.find(r => r.name === 'Mapa');
  // Note: the simplest check is via `navigation.getState()` but the
  // actual `route.params` is also available from props if routed directly.

  // If parent navigator forwarded params, `navigation` may not have them
  // here; React Navigation typically passes `route` prop to the component
  // but this screen receives only `navigation` in our app; to be safe
  // try to read params from the current route state.
  let incomingParams;
  try {
    const state = navigation.getState();
    const idx = state.index ?? 0;
    const current = state.routes && state.routes[idx];
    incomingParams = current && current.params ? current.params : null;
  } catch (e) {
    incomingParams = null;
  }

  // If we got a customRoute param, render PublicMapScreen directly
  if (incomingParams && incomingParams.customRoute) {
    return <PublicMapScreen navigation={navigation} route={{ params: incomingParams }} />;
  }
  // Custom hook con toda la lógica del mapa
  const {
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
    webViewRef,
    mapReadyRef,
    updateLocationOnMap,
    updateMarkersOnMap,
    changeMapType,
    togglePointSelection,
    handlePointSelection,
    generateRoute,
    clearRoute,
    centerOnUser,
    handleMapReady
  } = useMapLogic();

  // Estados locales de modales
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMapTypeSelector, setShowMapTypeSelector] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmType, setConfirmType] = useState('origin');

  // Calcular espaciado dinámico
  const insets = useSafeAreaInsets();
  const bottomSpacing = MAP_CONFIG.TAB_BAR_HEIGHT + Math.max(insets.bottom, MAP_CONFIG.MIN_BOTTOM_PADDING);

  // Mostrar modal de bienvenida después de cargar
  useEffect(() => {
    if (!loading && !error) {
      const timer = setTimeout(() => {
        setShowGuestModal(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, error]);

  // Manejar mensajes del WebView
  const handleWebViewMessage = (event) => {
    const message = event.nativeEvent.data;
    console.log('📨 Mensaje del WebView:', message);
    
    if (message === MESSAGE_TYPES.MAP_READY) {
      handleMapReady();
    } else if (message.startsWith('error:')) {
      console.error('❌ ERROR WebView:', message);
      Alert.alert('Error en el mapa', message.replace('error:', ''));
    } else {
      try {
        const data = JSON.parse(message);
        if (data.type === MESSAGE_TYPES.POINT_SELECTED) {
          const result = handlePointSelection(data.coordinate);
          if (result) {
            setConfirmType(result.type);
            setConfirmMessage(result.message);
            setShowConfirmModal(true);
          }
        }
      } catch (e) {
        console.log('📨 Mensaje no JSON:', message.substring(0, 50));
      }
    }
  };

  // Manejar selección de ubicación actual
  const handleUseCurrentLocation = () => {
    if (!location) return;
    
    const currentLocation = { latitude: location.latitude, longitude: location.longitude };
    const result = handlePointSelection(currentLocation);
    if (result) {
      setConfirmType(result.type);
      setConfirmMessage('¡Ubicación actual seleccionada!\nTu posición se estableció como origen');
      setShowConfirmModal(true);
    }
  };

  // Manejar generación de ruta desde modal
  const handleGenerateRouteFromModal = async () => {
    setShowConfirmModal(false);
    setTimeout(async () => {
      const result = await generateRoute(startPoint, endPoint);
      if (result.success) {
        setShowRouteModal(true);
      }
    }, 300);
  };

  // Manejar generación de ruta desde panel
  const handleGenerateRouteFromPanel = async (start, end) => {
    const result = await generateRoute(start, end);
    if (result.success) {
      setShowRouteModal(true);
    }
  };

  // Manejar cambio de tipo de mapa
  const handleMapTypeChange = (newMapType) => {
    changeMapType(newMapType);
    setShowMapTypeSelector(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>🔍 Obteniendo ubicación...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <Text style={styles.errorSubtext}>Usando ubicación por defecto</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />

      <View style={[styles.mapWrap, { paddingBottom: bottomSpacing }]}>
        <MapWebView
          location={location}
          mapReady={mapReady}
          webViewRef={webViewRef}
          onMessage={handleWebViewMessage}
          onLoadStart={() => console.log('🚀 WebView iniciando carga...')}
          onLoadEnd={() => console.log('✅ WebView carga terminada')}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('❌ WebView error:', nativeEvent);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('❌ WebView HTTP error:', nativeEvent);
          }}
        />

        {/* Panel de control para selección de puntos */}
        <RouteSelectionPanel
          isSelectingPoints={isSelectingPoints}
          startPoint={startPoint}
          endPoint={endPoint}
          location={location}
          routeLoading={routeLoading}
          onUseCurrentLocation={handleUseCurrentLocation}
          onGenerateRoute={handleGenerateRouteFromPanel}
        />

        {/* Indicador visual cuando está en modo selección */}
        {isSelectingPoints && (
          <View style={[styles.selectionOverlay, { bottom: bottomSpacing + 80 }]}>
            <Text style={styles.overlayText}>
              {!startPoint ? '📍 TOCA PARA SELECCIONAR ORIGEN' :
               !endPoint ? '📍 TOCA PARA SELECCIONAR DESTINO' :
               '✅ AMBOS PUNTOS SELECCIONADOS'}
            </Text>
          </View>
        )}

        {/* Botones flotantes */}
        <FloatingActionButtons
          isSelectingPoints={isSelectingPoints}
          startPoint={startPoint}
          endPoint={endPoint}
          generatedRoute={generatedRoute}
          bottomSpacing={bottomSpacing}
          onTogglePointSelection={togglePointSelection}
          onClearRoute={clearRoute}
          onCenterOnUser={centerOnUser}
          onShowMapTypeSelector={() => setShowMapTypeSelector(true)}
          onShowGuestModal={() => setShowGuestModal(true)}
        />
      </View>

      {/* Modal de confirmación de puntos */}
      <RouteConfirmModal
        visible={showConfirmModal}
        confirmType={confirmType}
        confirmMessage={confirmMessage}
        onClose={() => setShowConfirmModal(false)}
        onGenerateRoute={handleGenerateRouteFromModal}
        onContinue={() => setShowConfirmModal(false)}
      />

      {/* Selector de tipo de mapa */}
      <MapTypeSelector
        visible={showMapTypeSelector}
        currentMapType={mapType}
        onClose={() => setShowMapTypeSelector(false)}
        onSelectMapType={handleMapTypeChange}
      />

      {/* TODO: Agregar GuestWelcomeModal y RouteDetailsModal */}
      
      {/* Modal de bienvenida para invitados */}
      <GuestWelcomeModal
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onNavigateToLogin={() => navigation.navigate('Login')}
      />

      {/* Modal de detalles de ruta */}
      <RouteDetailsModal
        visible={showRouteModal}
        route={generatedRoute}
        onClose={() => setShowRouteModal(false)}
        onClearRoute={() => {
          clearRoute();
          setShowRouteModal(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  mapWrap: { 
    flex: 1 
  },
  map: { 
    flex: 1 
  },
  loadingContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '600',
  },
  errorContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20 
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  selectionOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(25, 118, 210, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: 'center',
    elevation: 8,
  },
  overlayText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default GuestScreen;