import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapWebView from '../components/MapWebView';
import MapControls from '../components/MapControls';
import SelectionPanel from '../components/SelectionPanel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import usePublicMapLogic from '../hooks/usePublicMapLogic';

const PublicMapScreen = ({ navigation, route }) => {
  const webViewRef = useRef(null);
  const insets = useSafeAreaInsets();
  const topOffset = (insets.top || 0) + 12;
  
  // Calcular espaciado dinámico para evitar superposición con bottom tabs
  const TAB_BAR_HEIGHT = 70;
  // Si ocultamos la tab bar en esta pantalla, no añadimos la altura extra
  const HIDE_TAB_BAR = true;
  const BOTTOM_SPACING = (HIDE_TAB_BAR ? Math.max(insets.bottom, 60) : TAB_BAR_HEIGHT + Math.max(insets.bottom, 16)); // Espacio para el tab bar integrado

  const [notify, setNotify] = useState(null);

  // Ocultar la barra inferior (tab bar) cuando este screen está activo.
  // Esto elimina la superficie blanca que tapaba el contenido.
  useEffect(() => {
    const parents = [];
    try {
      let parent = navigation.getParent && navigation.getParent();
      while (parent) {
        try {
          if (typeof parent.setOptions === 'function') {
            parent.setOptions({ tabBarStyle: { display: 'none' } });
            parents.push(parent);
          }
        } catch (err) {
          // ignore
        }
        parent = parent.getParent && parent.getParent();
      }
    } catch (e) {
      // non-fatal
    }

    // Al desmontar, restaurar la visibilidad del tab bar.
    return () => {
      try {
        parents.forEach(p => {
          try { p.setOptions({ tabBarStyle: { display: 'flex' } }); } catch (_) {}
        });
      } catch (e) {}
    };
  }, [navigation]);

  const handleNotify = useCallback((payload) => {
    setNotify(payload);
  }, []);

  // auto-dismiss simple notifications (those without actions)
  useEffect(() => {
    if (!notify) return;
    if (notify.duration && (!notify.actions || notify.actions.length === 0)) {
      const t = setTimeout(() => setNotify(null), notify.duration);
      return () => clearTimeout(t);
    }
  }, [notify]);

  // Hook that centralizes map state & logic
  const {
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
    setShowGuestModal
  } = usePublicMapLogic({ route, navigation, webViewRef, onNotify: handleNotify });

  // `usePublicMapLogic` expone `showRouteModal` (valor) pero no su setter.
  // Creamos un estado local sincronizado para poder abrir/cerrar el modal
  // desde este componente sin causar un ReferenceError si el hook no expone
  // `setShowRouteModal`.
  const [showRouteModalState, setShowRouteModalState] = useState(!!showRouteModal);
  useEffect(() => {
    setShowRouteModalState(!!showRouteModal);
  }, [showRouteModal]);

  // Exponemos `setShowRouteModal` local para mantener la API esperada
  // en el resto del componente (se usan llamadas como setShowRouteModal(false)).
  const setShowRouteModal = (value) => setShowRouteModalState(!!value);

  // Modal para mostrar paradas de la línea
  const [showStopsModal, setShowStopsModal] = useState(false);

  const openStopsModal = () => {
    console.log('🔄 Abriendo modal de paradas');
    setShowStopsModal(true);
  };
  
  const closeStopsModal = () => {
    console.log('🔄 Cerrando modal de paradas');
    setShowStopsModal(false);
  };

  // Resolver el nombre de la calle desde varias posibles propiedades del punto
  const resolveStreet = (pt) => {
    if (!pt) return '';
    if (typeof pt === 'object') {
      const props = pt.properties || {};
      return (
        pt.street || pt.address || pt.street_name || pt.via || pt.direccion || pt.avenue ||
        props.street || props.address || props.street_name || props.via || props.direccion || ''
      );
    }
    return '';
  };

  const resolveName = (pt) => {
    if (!pt) return '';
    if (typeof pt === 'object') {
      const props = pt.properties || {};
      return pt.name || pt.label || pt.title || props.name || props.label || '';
    }
    return '';
  };

  // Resolver coordenadas desde varias posibles formas: [lng,lat], {latitude,longitude}, {lat,lng}, or coordinates array
  const resolveCoords = (pt) => {
    if (!pt) return null;
    // If the point itself is an array [lng, lat]
    if (Array.isArray(pt) && pt.length >= 2) return [pt[0], pt[1]];
    if (typeof pt === 'object') {
      if (Array.isArray(pt.coordinates) && pt.coordinates.length >= 2) return pt.coordinates;
      if (Array.isArray(pt.coord) && pt.coord.length >= 2) return pt.coord;
      if (typeof pt.longitude === 'number' && typeof pt.latitude === 'number') return [pt.longitude, pt.latitude];
      if (typeof pt.lng === 'number' && typeof pt.lat === 'number') return [pt.lng, pt.lat];
      // fallback to numeric index properties (older geojson-like entries)
      if (typeof pt[0] === 'number' && typeof pt[1] === 'number') return [pt[0], pt[1]];
    }
    return null;
  };

  const handleShowStopOnMap = (stop, idx) => {
    if (!stop) return;
    
    // Debug: log the actual stop object being processed
    try {
      console.log(`🎯 Processing stop ${idx}:`, JSON.stringify(stop, null, 2));
    } catch (e) {
      console.log(`🎯 Processing stop ${idx}:`, stop);
    }
    
    const coords = resolveCoords(stop);
    const lng = coords && coords.length >= 1 ? coords[0] : (stop.longitude ?? stop.lng ?? null);
    const lat = coords && coords.length >= 2 ? coords[1] : (stop.latitude ?? stop.lat ?? null);
    if (lat == null || lng == null) return;

    // Extraer nombre y número de punto, usando helpers que buscan en properties y campos anidados
    let nameStr = resolveName(stop);
    const numMatch = String(nameStr).match(/(\d+)/);
    const pointNumber = numMatch ? numMatch[1] : (typeof idx === 'number' ? String(idx + 1) : null);

    const street = resolveStreet(stop);

    const rawStreet = stop && (stop.street ?? stop.address ?? stop.direccion ?? (stop.properties && (stop.properties.street ?? stop.properties.address ?? stop.properties.direccion)) ?? null);

    // If name or street are missing on the stop object, try to pull them from the customRoute arrays
    if ((!nameStr || nameStr === '') || (!street || street === '')) {
      try {
        const candidate = (customRoute && customRoute.stops && customRoute.stops[idx]) || (customRoute && customRoute.points && customRoute.points[idx]);
        if (candidate) {
          if (!nameStr || nameStr === '') {
            nameStr = resolveName(candidate) || nameStr;
          }
          if (!street || street === '') {
            const candStreet = resolveStreet(candidate) || (candidate.street ?? candidate.address ?? candidate.direccion ?? '');
            if (candStreet) {
              // prefer candidate street if stop doesn't have it
              street = candStreet;
            }
          }
          // also prefer rawStreet from candidate if ours empty
          if (!rawStreet || rawStreet === '') {
            const candRaw = candidate.street ?? candidate.address ?? candidate.direccion ?? (candidate.properties && (candidate.properties.street ?? candidate.properties.address ?? candidate.properties.direccion)) ?? null;
            if (candRaw) rawStreet = candRaw;
          }
        }
      } catch (e) { /* ignore */ }
    }

    // Construir descripción que muestra calle/avenida y el número de punto
    let description = '';
    if (street) description += street;
    if (pointNumber) description += (description ? ' · ' : '') + `Punto ${pointNumber}`;

    if (webViewRef && webViewRef.current && typeof webViewRef.current.postCommand === 'function') {
      webViewRef.current.postCommand({ type: 'updateLocation', latitude: lat, longitude: lng, force: true });
      // ensure map isn't following user so the stop is centered
      webViewRef.current.postCommand({ type: 'setFollowUser', follow: false });
      // send minimal popup payload: title, description (street) and optional date
        // keep latitude/longitude so WebView can center the popup, and include a human-friendly date if available
        // Try to resolve a date from common properties
        let pointDate = null;
        try {
          const candidates = [stop.date, stop.createdAt, stop.timestamp, stop.time, stop.date_created, (stop.properties && stop.properties.date), (stop.properties && stop.properties.createdAt), (stop.properties && stop.properties.timestamp)];
          for (let i = 0; i < candidates.length; i++) {
            const c = candidates[i];
            if (!c && c !== 0) continue;
            let ms = null;
            if (typeof c === 'object') {
              // Firestore Timestamp-like
              if (typeof c.seconds === 'number') ms = c.seconds * 1000;
              else if (typeof c.toDate === 'function') {
                try { ms = c.toDate().getTime(); } catch (e) { ms = null; }
              }
            } else if (typeof c === 'number') {
              // seconds vs milliseconds
              if (c > 1e12) ms = c; else if (c > 1e9) ms = c * 1000; else ms = c * 1000;
            } else if (typeof c === 'string') {
              const parsed = Date.parse(c);
              if (!isNaN(parsed)) ms = parsed;
            }
            if (ms && !isNaN(ms)) {
              pointDate = new Date(ms).toLocaleString();
              break;
            }
          }
        } catch (e) { pointDate = null; }

        const popupPayload = {
          type: 'showPopup',
          popup: {
            latitude: lat,
            longitude: lng,
            title: nameStr || 'Parada',
            description,
            date: pointDate || undefined
          }
        };

      // Debug log: show what RN is sending to the WebView
      try { console.log('RN -> WebView showPopup payload:', popupPayload); } catch (e) {}
      webViewRef.current.postCommand(popupPayload);
    }
    closeStopsModal();
  };

    // HTML generado para el WebView se encuentra en ../components/MapHTML

  // initialRegion proviene de usePublicMapLogic
  // Normalizar una lista de paradas que puede venir en varias formas:
  // - customRoute.stops (ya estructurada)
  // - customRoute.points (Firestore naming)
  // - customRoute.coordinates (array de [lng,lat])
  const stopsData = (() => {
    try {
      console.log('🔍 customRoute debug:', JSON.stringify(customRoute, null, 2));
    } catch (e) {
      console.log('🔍 customRoute exists:', !!customRoute);
    }
    
    if (!customRoute) return polylineCoords;
    
    // Priorizar customRoute.points que parece ser la estructura de Firestore
    if (customRoute.points && Array.isArray(customRoute.points) && customRoute.points.length > 0) {
      console.log('📍 Using customRoute.points:', customRoute.points.length, 'items');
      return customRoute.points;
    }
    
    if (customRoute.stops && Array.isArray(customRoute.stops) && customRoute.stops.length > 0) {
      console.log('📍 Using customRoute.stops:', customRoute.stops.length, 'items');
      return customRoute.stops;
    }
    
    if (customRoute.coordinates && Array.isArray(customRoute.coordinates) && customRoute.coordinates.length > 0) {
      console.log('📍 Using customRoute.coordinates, mapping to objects');
      return customRoute.coordinates.map((c, i) => ({
        coordinates: c,
        longitude: c[0],
        latitude: c[1],
        name: `Parada ${i + 1}`,
        street: ''
      }));
    }
    
    console.log('📍 Fallback to polylineCoords:', polylineCoords.length, 'items');
    return polylineCoords;
  })();

  return (
    <SafeAreaView style={styles.container}>
      {/* Botón de regreso */}
      <TouchableOpacity
        style={[styles.backButton, { top: topOffset }]}
        onPress={() => navigation.goBack()}
        accessibilityLabel="Regresar"
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Encabezado superior de la línea (full-width) */}
      {customRoute && (
        <View style={[styles.routeTopHeader, { top: topOffset }]}>
          <View style={styles.routeTopInner}>
            <View style={[styles.routeColorSwatch, { backgroundColor: customRoute.color || '#1976D2' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeTopTitle}>{customRoute.name ? `Línea ${customRoute.name}` : 'Línea sin nombre'}</Text>
              {polylineCoords.length > 0 ? (
                <Text style={styles.routeTopSubtitle}>{polylineCoords.length} paradas aprox.</Text>
              ) : null}
            </View>

            <TouchableOpacity 
              style={styles.viewStopsBtn} 
              onPress={() => {
                console.log('🚌 Botón Ver paradas presionado');
                openStopsModal();
              }} 
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.viewStopsText}>Ver paradas</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}



      {/* Mapa */}
      <View style={[styles.mapContainer, { paddingBottom: BOTTOM_SPACING }]}>
        {loading && !mapReady ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.loadingText}>Cargando mapa...</Text>
          </View>
        ) : error && !location ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="location-outline" size={48} color="#999" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
          ) : (
          <MapWebView
            ref={webViewRef}
            style={styles.map}
            onMessage={handleWebViewMessage}
            initialLocation={location}
          />
        )}

        {/* Inline notification (pleasant UX) */}
        {notify && (
          <View style={[styles.notifyContainer, { top: topOffset + 60 }]}> 
            <View style={styles.notifyInner}>
              <Ionicons name={notify.type === 'confirm' ? 'help-circle' : 'checkmark-circle'} size={20} color="#fff" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifyTitle}>{notify.title}</Text>
                {notify.message ? <Text style={styles.notifyMessage}>{notify.message}</Text> : null}
                {/* If we received prev/new coordinates show a compact comparison */}
                {notify.prevStart || notify.newStart ? (
                  <View style={styles.compareBox}>
                    {notify.prevStart ? (
                      <View style={styles.compareRow}>
                        <Text style={styles.compareLabel}>Antiguo:</Text>
                        <Text style={styles.compareValue}>{notify.prevStart.latitude.toFixed(5)}, {notify.prevStart.longitude.toFixed(5)}</Text>
                        <TouchableOpacity style={styles.compareShowBtn} onPress={() => {
                          if (webViewRef && webViewRef.current && typeof webViewRef.current.postCommand === 'function') {
                            webViewRef.current.postCommand({ type: 'updateLocation', latitude: notify.prevStart.latitude, longitude: notify.prevStart.longitude, force: true });
                          }
                        }}>
                          <Text style={styles.compareShowText}>Mostrar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    {notify.newStart ? (
                      <View style={styles.compareRow}>
                        <Text style={styles.compareLabel}>Actual:</Text>
                        <Text style={styles.compareValue}>{notify.newStart.latitude.toFixed(5)}, {notify.newStart.longitude.toFixed(5)}</Text>
                        <TouchableOpacity style={styles.compareShowBtn} onPress={() => {
                          if (webViewRef && webViewRef.current && typeof webViewRef.current.postCommand === 'function') {
                            webViewRef.current.postCommand({ type: 'updateLocation', latitude: notify.newStart.latitude, longitude: notify.newStart.longitude, force: true });
                          }
                        }}>
                          <Text style={styles.compareShowText}>Mostrar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
              {notify.actions && notify.actions.length > 0 ? (
                <View style={styles.notifyActions}>
                  {notify.actions.map((a, idx) => (
                    <TouchableOpacity key={idx} style={styles.notifyBtn} onPress={() => { a.onPress && a.onPress(); setNotify(null); }}>
                      <Text style={styles.notifyBtnText}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Panel de control para selección de puntos */}
        {isSelectingPoints && (
          <SelectionPanel
            startPoint={startPoint}
            endPoint={endPoint}
            routeLoading={routeLoading}
            onGenerateRoute={generateRoute}
            // Subimos el panel para que quede más visible y no se solape
            style={{ bottom: BOTTOM_SPACING + 560 }}
          />
        )}

        {/* Indicador visual cuando está en modo selección */}
        {isSelectingPoints && (
          // Ajuste fino: subimos un poco el overlay para evitar solapamiento
          // con el panel de selección manteniéndolos visualmente cercanos.
            // Evitar solapamiento: colocamos el overlay aún más arriba.
            <View style={[styles.selectionOverlay, { bottom: BOTTOM_SPACING + 700 }]}> 
              <View style={styles.overlayContent}>
                <Ionicons name="location-sharp" size={20} color="#fff" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.overlayTitle}>
                    {!startPoint ? 'Toca en el mapa para seleccionar el ORIGEN' :
                     !endPoint ? 'Toca en el mapa para seleccionar el DESTINO' :
                     '✅ Ambos puntos seleccionados'}
                  </Text>
                  {(!startPoint || !endPoint) && (
                    <Text style={styles.overlaySubtitle}>
                      {!startPoint ? 'Pulsa sobre tu ubicación de inicio.' : 'Pulsa sobre el punto de destino.'}
                    </Text>
                  )}
                </View>
              </View>
            </View>
        )}

        {/* Botones flotantes (mejor posicionados) */}
        <View style={[styles.mapControlsWrapper, { bottom: BOTTOM_SPACING + 260}]}>
          <MapControls
            isSelectingPoints={isSelectingPoints}
            onToggleSelect={togglePointSelection}
            onClearRoute={clearRoute}
            onCenterUser={() => {
              // Al centrar manualmente, reactivamos el seguimiento
              if (webViewRef && webViewRef.current && typeof webViewRef.current.postCommand === 'function') {
                webViewRef.current.postCommand({ type: 'setFollowUser', follow: true });
              }
              centerOnUser(); // This already sends updateLocation
            }}
            onCenterRoute={() => {
              // cuando centramos en ruta, desactivamos el seguimiento para permitir exploración
              if (webViewRef && webViewRef.current && typeof webViewRef.current.postCommand === 'function') {
                webViewRef.current.postCommand({ type: 'setFollowUser', follow: false });
              }
              centerOnRoute();
            }}
            onOpenGuest={() => setShowGuestModal(true)}
            customRoute={customRoute}
            hasGeneratedRoute={!!(startPoint || endPoint || generatedRoute)}
          />
        </View>
        
      </View>

      {/* Modal de aviso para usuarios invitados */}
      <Modal
        visible={showGuestModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGuestModal(false)}
      >
        <TouchableOpacity 
          style={styles.guestModalOverlay}
          activeOpacity={1}
          onPress={() => setShowGuestModal(false)}
        >
          <View style={styles.guestModalContent}>
            <TouchableOpacity 
              onPress={() => setShowGuestModal(false)}
              style={styles.guestModalCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>

            <View style={styles.guestModalHeader}>
              <View style={styles.guestModalIcon}>
                <Ionicons name="map" size={32} color="#1976D2" />
              </View>
              <Text style={styles.guestModalTitle}>
                ¡Explora el mapa de rutas!
              </Text>
              <Text style={styles.guestModalSubtitle}>
                Puedes ver las rutas disponibles y crear rutas personalizadas. Para acceder a más funciones, únete a nosotros.
              </Text>
            </View>

            <View style={styles.guestModalActions}>
              <TouchableOpacity 
                style={[styles.guestActionBtn, styles.registerBtn]}
                onPress={() => {
                  setShowGuestModal(false);
                  // Aquí podrías navegar a una pantalla de registro
                  navigation.navigate('Login'); // Por ahora va al login
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={18} color="#fff" />
                <Text style={styles.guestActionText}>Registrarse</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.guestActionBtn, styles.loginBtn]}
                onPress={() => {
                  setShowGuestModal(false);
                  navigation.navigate('Login');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="log-in" size={18} color="#fff" />
                <Text style={styles.guestActionText}>Iniciar Sesión</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.continueGuestBtn}
              onPress={() => setShowGuestModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.continueGuestText}>
                Continuar explorando como invitado
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal: Lista de paradas de la línea */}
      <Modal
        visible={showStopsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeStopsModal}
        statusBarTranslucent={true}
      >
        <View style={styles.stopsModalOverlay}>
          <View style={styles.stopsModalContent}>
            <View style={styles.stopsModalHeader}>
              <Text style={styles.stopsModalTitle}>Paradas de la línea</Text>
              <TouchableOpacity onPress={closeStopsModal} style={styles.stopsModalClose}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={stopsData}
              keyExtractor={(item, idx) => (item.id ? String(item.id) : (item.name ? String(item.name) : String(idx)))}
              renderItem={({ item, index }) => {
                  const label = item.name || item.label || `Parada ${index + 1}`;
                  const street = resolveStreet(item);
                  return (
                    <TouchableOpacity activeOpacity={0.85} onPress={() => handleShowStopOnMap(item, index)} style={styles.stopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stopLabel}>{label}</Text>
                        {street ? <Text style={styles.stopStreet}>{street}</Text> : null}
                      </View>
                      <TouchableOpacity style={styles.stopShowBtn} onPress={() => handleShowStopOnMap(item, index)}>
                        <Ionicons name="chevron-forward" size={20} color="#1976D2" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Tab bar hidden for this screen — no spacer needed */}

      {/* Modal de información de ruta */}
      <Modal
        visible={showRouteModalState}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRouteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🛣️ Ruta Generada</Text>
              <TouchableOpacity 
                onPress={() => setShowRouteModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {generatedRoute && (
              <View style={styles.routeDetails}>
                <View style={styles.routeDetailItem}>
                  <Ionicons name="speedometer-outline" size={20} color="#1976D2" />
                  <Text style={styles.routeDetailText}>
                    Distancia: {(generatedRoute.distance / 1000).toFixed(2)} km
                  </Text>
                </View>

                <View style={styles.routeDetailItem}>
                  <Ionicons name="time-outline" size={20} color="#1976D2" />
                  <Text style={styles.routeDetailText}>
                    Tiempo estimado: {Math.round((generatedRoute.duration || 0) / 60)} min
                  </Text>
                </View>

                <View style={styles.routeDetailItem}>
                  <Ionicons name="location-outline" size={20} color="#1976D2" />
                  <Text style={styles.routeDetailText}>
                    Puntos de ruta: {generatedRoute.coordinates ? generatedRoute.coordinates.length : 0}
                  </Text>
                </View>

                <View style={styles.routeDetailItem}>
                  <Ionicons name="car-outline" size={20} color="#1976D2" />
                  <Text style={styles.routeDetailText}>
                    Modo: {generatedRoute.profile === 'driving-car' ? 'En vehículo' : 'Otros'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalActionBtn}
                onPress={() => setShowRouteModal(false)}
              >
                <Text style={styles.modalActionText}>Ver en Mapa</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalActionBtn, styles.modalActionBtnSecondary]}
                onPress={clearRoute}
              >
                <Text style={styles.modalActionTextSecondary}>Limpiar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  routeInfo: {
    position: 'absolute',
    right: 16,
    left: 80,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 4,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeColorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  routeSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 24,
  },
  // Nuevo: encabezado superior de la línea
  routeTopHeader: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 6,
    zIndex: 1100,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  routeTopInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeTopTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#222',
  },
  routeTopSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  viewStopsBtn: {
    backgroundColor: '#FF5722',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginLeft: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  viewStopsText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Modal paradas
  stopsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  stopsModalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    elevation: 10,
  },
  stopsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stopsModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    color: '#222',
  },
  stopsModalClose: {
    padding: 8,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stopLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  stopCoord: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  stopShowBtn: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 18,
    marginLeft: 12,
  },
  stopShowText: {
    color: '#1976D2',
    fontWeight: '700',
  },
  stopStreet: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#b00020',
    textAlign: 'center',
  },
  mapButtons: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  // Estilos para botón de navegación mejorado
  navigationFab: {
    elevation: 8,
    shadowOpacity: 0.3,
  },
  navigationIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 8,
    marginTop: 2,
  },

  // Banner de información
  navigationBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    elevation: 3,
    zIndex: 500,
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },

  // Estilos para marcadores personalizados
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    top: 8,
  },

  // Estilos para panel de selección
  selectionPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  animatedIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  selectionTitleContainer: {
    flex: 1,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
    lineHeight: 20,
  },
  selectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginTop: 4,
  },
  selectionStatus: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  statusItemActive: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  generateRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  generateRouteBtnText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 16,
  },
  routeLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  routeLoadingText: {
    marginLeft: 8,
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },

  // Indicador visual de superposición
  selectionOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(25, 118, 210, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 28,
    alignItems: 'center',
    elevation: 10,
    zIndex: 1100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  overlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 18,
  },
  overlaySubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  overlayText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },

  // Inline notification styles
  notifyContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1200,
    alignItems: 'center',
  },
  notifyInner: {
    backgroundColor: '#1976D2',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  notifyTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  notifyMessage: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    marginTop: 2,
  },
  notifyActions: {
    marginLeft: 8,
    flexDirection: 'row',
  },
  notifyBtn: {
    marginLeft: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  notifyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  compareBox: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 8,
    borderRadius: 8,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  compareLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
    width: 70,
  },
  compareValue: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    flex: 1,
  },
  compareShowBtn: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  compareShowText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },

  // Wrapper para controlar la posición de los botones flotantes
  mapControlsWrapper: {
    position: 'absolute',
    right: 16,
    zIndex: 1000,
    elevation: 10,
    alignItems: 'flex-end',
  },

  // Estilos para modal de invitado
  guestModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  guestModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  guestModalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  guestModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 12,
  },
  guestModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  guestModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 8,
  },
  guestModalSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  guestModalActions: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  guestActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  registerBtn: {
    backgroundColor: '#1976D2',
  },
  loginBtn: {
    backgroundColor: '#4CAF50',
  },
  guestActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  continueGuestBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  continueGuestText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  // Estilos para modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalCloseBtn: {
    padding: 4,
  },
  routeDetails: {
    marginBottom: 20,
  },
  routeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  routeDetailText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionBtn: {
    flex: 1,
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalActionBtnSecondary: {
    backgroundColor: '#f44336',
  },
  modalActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalActionTextSecondary: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default PublicMapScreen;