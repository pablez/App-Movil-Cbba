import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const EditMapScreen = ({ navigation, route }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [pointsLoaded, setPointsLoaded] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState([]); // array of indices
  const [editableRoute, setEditableRoute] = useState(null);
  const [points, setPoints] = useState([]);
  const originalPointsRef = React.useRef([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);
  const [showPointModal, setShowPointModal] = useState(false);
  const [isAddingNewPoint, setIsAddingNewPoint] = useState(false);
  const [tempPoint, setTempPoint] = useState(null);
  
  // Estados para el modal de edición de punto
  const [pointName, setPointName] = useState('');
  const [pointStreet, setPointStreet] = useState('');
  const [pointLatitude, setPointLatitude] = useState('');
  const [pointLongitude, setPointLongitude] = useState('');
  
  const webViewRef = useRef(null);

  useEffect(() => {
    getCurrentLocation();
    (async () => { await setupEditableRoute(); })();
  }, []);

  // Efecto para actualizar el mapa cuando cambian los puntos (solo si están cargados)
  useEffect(() => {
    // Solo actualizar automáticamente cuando los puntos estén cargados
    // y no haya cambios pendientes por confirmar (hasUnsavedChanges === false).
    if (pointsLoaded && points.length > 0 && !hasUnsavedChanges) {
      console.log('Puntos cambiaron, actualizando mapa automáticamente con', points.length, 'puntos');
      const timer = setTimeout(() => {
        updateMapPoints();
      }, 100); // Pequeño delay para asegurar que el estado se actualice
      return () => clearTimeout(timer);
    }
  }, [points, pointsLoaded, hasUnsavedChanges]);
  // include hasUnsavedChanges so effect reevaluates when confirmation state changes

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permiso de ubicación denegado');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setLoading(false);
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      setErrorMsg('Error al obtener la ubicación');
      setLoading(false);
    }
  };

  const setupEditableRoute = async () => {
    const editableRouteParam = route?.params?.editableRoute;
    if (!editableRouteParam) return;
    console.log('EditableRoute recibida:', editableRouteParam);
    setEditableRoute(editableRouteParam);

    // Si vienen points con metadata, úsalos directamente
    if (editableRouteParam.points && editableRouteParam.points.length > 0) {
      const routePoints = editableRouteParam.points.map((point, index) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        name: point.name || `Punto ${index + 1}`,
        street: point.street || '',
        index: index
      }));
      console.log('Usando points con metadatos:', routePoints);
      setPoints(routePoints);
      originalPointsRef.current = JSON.parse(JSON.stringify(routePoints));
      return;
    }

    // Si no vienen points pero tenemos un id, intentar obtener metadata desde Firestore
    if (editableRouteParam.id) {
      try {
        const snap = await getDoc(doc(db, 'routes', editableRouteParam.id));
        if (snap.exists()) {
          const data = snap.data();
          if (data.points && data.points.length > 0) {
            const routePoints = data.points.map((point, index) => ({
              latitude: point.latitude ?? (point.coordinates && point.coordinates[1]) ?? null,
              longitude: point.longitude ?? (point.coordinates && point.coordinates[0]) ?? null,
              name: point.name || `Punto ${index + 1}`,
              street: point.street || '',
              index: index
            })).filter(p => p.latitude !== null && p.longitude !== null);
            if (routePoints.length > 0) {
              console.log('Metadata de puntos cargada desde Firestore:', routePoints);
              setPoints(routePoints);
              originalPointsRef.current = JSON.parse(JSON.stringify(routePoints));
              return;
            }
          }
        }
      } catch (err) {
        console.warn('No se pudo obtener documento de ruta desde Firestore:', err);
      }
    }

    // Fallback: convertir coordenadas básicas si no hay metadata
    const coords = editableRouteParam.coordinates || [];
    console.log('Coordinates recibidas (fallback):', coords);
    const routePoints = coords.map((coord, index) => {
      let lat, lng;
      if (Array.isArray(coord)) {
        lng = coord[0];
        lat = coord[1];
      } else if (coord.lat !== undefined && coord.lng !== undefined) {
        lat = coord.lat;
        lng = coord.lng;
      } else {
        console.warn('Formato de coordenada desconocido:', coord);
        return null;
      }
      return {
        latitude: lat,
        longitude: lng,
        name: `Punto ${index + 1}`,
        street: '',
        index: index
      };
    }).filter(Boolean);
    console.log('Puntos convertidos desde coordinates (fallback):', routePoints);
    setPoints(routePoints);
    originalPointsRef.current = JSON.parse(JSON.stringify(routePoints));
  };

  const postMessageToWebView = (message) => {
    if (webViewRef.current) {
      try {
        const payload = JSON.stringify(message);
        console.log('Enviando mensaje al WebView:', payload);
        // Enviar siempre el mensaje al WebView (no depender exclusivamente de mapReady)
        webViewRef.current.postMessage(payload);
      } catch (e) {
        console.error('Error al enviar mensaje al WebView:', e);
      }
    } else {
      console.warn('Referencia WebView no disponible, mensaje no enviado:', message);
    }
  };

  const updateMapPoints = () => {
    console.log('updateMapPoints llamado con:', points.length, 'puntos');
    
    if (points.length === 0) {
      console.log('No hay puntos para mostrar');
      setPointsLoaded(false);
      return;
    }
    
    // Siempre mostrar la ruta conectada si hay al menos 2 puntos
    if (points.length >= 2) {
      const coordinates = points.map(p => [p.longitude, p.latitude]);
      console.log('Coordenadas para la ruta conectada:', coordinates);
      
      postMessageToWebView({
        type: 'showRoute',
        route: {
          coordinates,
          color: editableRoute?.color || '#1976D2',
          name: editableRoute?.name || 'Ruta en edición'
        }
      });
    }
    
    // Enviar puntos como marcadores editables
    const pointsData = points.map((p, index) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      name: p.name,
      street: p.street,
      index: index
    }));
    
    console.log('Enviando puntos editables al WebView:', pointsData.length, 'marcadores');
    
    postMessageToWebView({
      type: 'showEditablePoints',
      points: pointsData
    });
    
    setPointsLoaded(true);
    console.log('Mapa actualizado con', points.length, 'puntos y ruta conectada');
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Mensaje recibido del WebView:', data);
      
      switch (data.type) {
        case 'mapReady':
          console.log('Mapa listo');
          setMapReady(true);
          // Centrar en la primera coordenada de la ruta si existe
          if (points.length > 0) {
            postMessageToWebView({
              type: 'setCenter',
              latitude: points[0].latitude,
              longitude: points[0].longitude
            });
          } else if (location) {
            postMessageToWebView({
              type: 'setCenter',
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            });
          }
          // NO cargar puntos automáticamente - esperar que el usuario presione "Cargar Puntos"
          break;
          
        case 'pointClicked':
          console.log('Punto clickeado:', data.pointIndex);
          // Si estamos en modo multiselección, alternar selección en vez de abrir el modal
          if (isMultiSelectMode) {
            handleToggleSelect(data.pointIndex);
          } else {
            handlePointClick(data.pointIndex);
          }
          break;
          
        case 'mapClicked':
          console.log('Mapa clickeado en modo agregar:', data);
          console.log('isAddingNewPoint:', isAddingNewPoint);
          if (isAddingNewPoint) {
            const tempPointData = {
              latitude: data.latitude,
              longitude: data.longitude
            };
            console.log('Coordenadas para auto-llenado:', tempPointData);
            // Pasar coordenadas directamente al modal
            openPointModalWithCoords(tempPointData);
          }
          break;
          
        case 'pointMoved':
          console.log('Punto movido:', data);
          handlePointMove(data.pointIndex, data.latitude, data.longitude);
          break;
      }
    } catch (error) {
      console.error('Error procesando mensaje del WebView:', error);
    }
  };

  const handlePointClick = (pointIndex) => {
    const point = points[pointIndex];
    if (point) {
      setSelectedPointIndex(pointIndex);
      setPointName(point.name || '');
      setPointStreet(point.street || '');
      setPointLatitude(point.latitude.toFixed(6)); // Mejor precisión
      setPointLongitude(point.longitude.toFixed(6));
      setTempPoint(null);
      openPointModal(false);
    }
  };

  const handlePointMove = (pointIndex, latitude, longitude) => {
    console.log('Moviendo punto', pointIndex, 'a', latitude, longitude);
    setPoints(prevPoints => 
      prevPoints.map((p, i) => 
        i === pointIndex 
          ? { ...p, latitude, longitude }
          : p
      )
    );
    // Marcar que hay cambios no guardados
    setHasUnsavedChanges(true);
    // El useEffect se encargará de actualizar el mapa automáticamente
  };

  const handleToggleSelect = (pointIndex) => {
    setSelectedPoints(prev => {
      const exists = prev.includes(pointIndex);
      let next;
      if (exists) {
        next = prev.filter(i => i !== pointIndex);
      } else {
        next = [...prev, pointIndex];
      }
      // Enviar selección al WebView para resaltar marcadores
      postMessageToWebView({ type: 'setSelectedPoints', selected: next });
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedPoints([]);
    postMessageToWebView({ type: 'setSelectedPoints', selected: [] });
  };

  const deleteSelectedPoints = () => {
    if (selectedPoints.length === 0) {
      Alert.alert('Sin selección', 'No hay puntos seleccionados para eliminar');
      return;
    }

    Alert.alert(
      'Eliminar puntos',
      `¿Eliminar ${selectedPoints.length} punto(s)? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setPoints(prevPoints => {
              const next = prevPoints.filter((_, i) => !selectedPoints.includes(i))
                .map((p, i) => ({ ...p, index: i }));
              return next;
            });
            clearSelection();
            Alert.alert('Éxito', 'Puntos eliminados');
            // El useEffect se encarga de actualizar el mapa
          }
        }
      ]
    );
  };

  const openPointModal = (isNewPoint) => {
    console.log('openPointModal - isNewPoint:', isNewPoint, 'tempPoint:', tempPoint);
    setIsAddingNewPoint(isNewPoint);
    if (isNewPoint && tempPoint) {
      // Autollenar coordenadas automáticamente cuando se agrega un nuevo punto
      setPointName('');
      setPointStreet('');
      const latStr = tempPoint.latitude.toFixed(6);
      const lngStr = tempPoint.longitude.toFixed(6);
      console.log('Auto-llenando coordenadas:', latStr, lngStr);
      setPointLatitude(latStr);
      setPointLongitude(lngStr);
    }
    setShowPointModal(true);
  };

  // Nueva función para abrir modal con coordenadas específicas
  const openPointModalWithCoords = (coords) => {
    console.log('openPointModalWithCoords - coords:', coords);
    setIsAddingNewPoint(true);
    setTempPoint(coords); // Establecer tempPoint para referencia
    
    // Autollenar campos directamente con las coordenadas recibidas
    setPointName('');
    setPointStreet('');
    const latStr = coords.latitude.toFixed(6);
    const lngStr = coords.longitude.toFixed(6);
    console.log('Auto-llenando coordenadas directamente:', latStr, lngStr);
    setPointLatitude(latStr);
    setPointLongitude(lngStr);
    
    setShowPointModal(true);
  };

  const savePointChanges = () => {
    // Limpiar espacios y caracteres no deseados
    const cleanLat = pointLatitude.toString().trim();
    const cleanLng = pointLongitude.toString().trim();
    
    console.log('Validando coordenadas:');
    console.log('Latitud original:', pointLatitude, 'tipo:', typeof pointLatitude);
    console.log('Longitud original:', pointLongitude, 'tipo:', typeof pointLongitude);
    console.log('Latitud limpia:', cleanLat);
    console.log('Longitud limpia:', cleanLng);
    
    const lat = parseFloat(cleanLat);
    const lng = parseFloat(cleanLng);
    
    console.log('Después de parseFloat - lat:', lat, 'lng:', lng);
    console.log('isNaN lat:', isNaN(lat), 'isNaN lng:', isNaN(lng));
    
    if (isNaN(lat) || isNaN(lng) || cleanLat === '' || cleanLng === '') {
      Alert.alert('Error', `Las coordenadas deben ser números válidos\nLatitud: "${cleanLat}"\nLongitud: "${cleanLng}"`);
      return;
    }

    const updatedPoint = {
      latitude: lat,
      longitude: lng,
      name: pointName.trim() || `Punto ${points.length + 1}`,
      street: pointStreet.trim() || ''
    };

    if (isAddingNewPoint) {
      // Agregar nuevo punto
      const newPoints = [...points, { ...updatedPoint, index: points.length }];
      console.log('Agregando nuevo punto. Total puntos:', newPoints.length);
      setPoints(newPoints);
      Alert.alert('Éxito', 'Nuevo punto agregado');
      // Si no estaban cargados, marcar como cargados para activar el auto-update
      if (!pointsLoaded) {
        setPointsLoaded(true);
      }
    } else if (selectedPointIndex !== null) {
      // Actualizar punto existente
      setPoints(prevPoints => 
        prevPoints.map((p, i) => 
          i === selectedPointIndex 
            ? { ...updatedPoint, index: i }
            : p
        )
      );
      Alert.alert('Éxito', 'Punto actualizado');
    }

    closePointModal();
    // El useEffect se encargará de actualizar el mapa automáticamente
  };

  const deletePoint = () => {
    if (selectedPointIndex === null) return;
    
    Alert.alert(
      'Eliminar punto',
      `¿Estás seguro de que quieres eliminar "${points[selectedPointIndex]?.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setPoints(prevPoints => 
              prevPoints.filter((_, i) => i !== selectedPointIndex)
                .map((p, i) => ({ ...p, index: i }))
            );
            closePointModal();
            Alert.alert('Éxito', 'Punto eliminado');
            // El useEffect se encarga de actualizar el mapa
          }
        }
      ]
    );
  };

  const closePointModal = () => {
    setShowPointModal(false);
    setSelectedPointIndex(null);
    setIsAddingNewPoint(false);
    setTempPoint(null);
    setPointName('');
    setPointStreet('');
    setPointLatitude('');
    setPointLongitude('');
  };

  const saveRouteChanges = async () => {
    if (!editableRoute?.id) {
      Alert.alert('Error', 'No se puede guardar: ID de ruta no encontrado');
      return;
    }

    if (points.length < 2) {
      Alert.alert('Error', 'La ruta debe tener al menos 2 puntos');
      return;
    }

    try {
      // Preparar datos para guardar
      const coordinates = points.map(p => ({ lat: p.latitude, lng: p.longitude }));
      // Conservar metadata (street/name) usando snapshot original como fallback
      const pointsWithMetadata = points.map((p, idx) => {
        const original = originalPointsRef.current && originalPointsRef.current[idx] ? originalPointsRef.current[idx] : {};
        const street = (p.street !== undefined && p.street !== null && p.street !== '') ? p.street : (original.street || '');
        const name = (p.name !== undefined && p.name !== null && p.name !== '') ? p.name : (original.name || `Punto ${idx + 1}`);
        return {
          latitude: p.latitude,
          longitude: p.longitude,
          street,
          name,
          coordinates: [p.longitude, p.latitude]
        };
      });

      // Actualizar en Firestore
      const routeRef = doc(db, 'routes', editableRoute.id);
      await updateDoc(routeRef, {
        coordinates,
        points: pointsWithMetadata,
        totalPoints: points.length,
        updatedAt: new Date()
      });

      // Actualizar snapshot original a la versión guardada (para futuros reverts)
      originalPointsRef.current = JSON.parse(JSON.stringify(pointsWithMetadata));

      // Intentar volver a la pantalla anterior de forma segura.
      const navigateBackSafe = () => {
        try {
          // 1) Si se pasó explicitamente returnTo, usarlo siempre (determinista)
          if (route?.params?.returnTo) {
            navigation.navigate(route.params.returnTo, route.params.returnParams || {});
            return;
          }

          // 2) Si hay historial y el previo NO es Login, hacer goBack
          if (navigation.canGoBack && navigation.canGoBack()) {
            try {
              const navState = navigation.getState && navigation.getState();
              if (navState && typeof navState.index === 'number' && Array.isArray(navState.routes)) {
                const prevIndex = navState.index - 1;
                if (prevIndex >= 0 && navState.routes[prevIndex]) {
                  const prev = navState.routes[prevIndex];
                  // Evitar retroceder al Login
                  if (prev.name && prev.name.toLowerCase().includes('login')) {
                    // En su lugar, navegar a una ruta segura para admins si existe
                    if (navigation.navigate) {
                      navigation.navigate('AdminLines');
                      return;
                    }
                  }
                }
              }
            } catch (inner) { console.warn('Error leyendo nav state previo', inner); }

            // Si no detectamos prev como Login, hacer goBack normalmente
            navigation.goBack();
            return;
          }

          // 3) Intentar navegar a pantallas seguras por defecto
          if (navigation.navigate) {
            try {
              navigation.navigate('AdminLines');
              return;
            } catch (e) {
              try { navigation.navigate('AdminMap'); return; } catch (_) { /* ignore */ }
            }
          }

          // 4) Fallback final a goBack
          try { navigation.goBack(); } catch (e) { console.warn('Fallback goBack fallo', e); }
        } catch (e) {
          console.warn('navigateBackSafe fallo inesperado:', e);
        }
      };

      Alert.alert(
        'Éxito',
        'Ruta actualizada correctamente',
        [
          {
            text: 'OK',
            onPress: navigateBackSafe
          }
        ]
      );
    } catch (error) {
      console.error('Error guardando cambios:', error);
      Alert.alert('Error', 'No se pudieron guardar los cambios: ' + error.message);
    }
  };

  // Confirmar cambios realizados en el mapa (guardar y volver)
  const confirmMapChanges = () => {
    // Primero refrescamos el mapa con los puntos actuales
    try {
      updateMapPoints();
    } catch (e) {
      console.warn('Error refrescando mapa antes de confirmar:', e);
    }
    // Marcar como confirmados y proceder a guardar
    setHasUnsavedChanges(false);
    saveRouteChanges();
  };

  // Revertir cambios hechos en el mapa a la última snapshot
  const cancelMapChanges = () => {
    if (originalPointsRef.current && originalPointsRef.current.length > 0) {
      setPoints(JSON.parse(JSON.stringify(originalPointsRef.current)));
      setHasUnsavedChanges(false);
      // Forzar refresco en WebView
      setTimeout(() => updateMapPoints(), 50);
      Alert.alert('Cancelado', 'Los cambios han sido revertidos');
    } else {
      Alert.alert('No hay cambios previos', 'No se encontró un estado anterior para revertir');
    }
  };

  const loadPointsInMap = () => {
    if (points.length === 0) {
      Alert.alert('Sin puntos', 'Esta ruta no tiene puntos para mostrar');
      return;
    }
    
    console.log('Cargando puntos en el mapa manualmente...');
    updateMapPoints();
  };

  const clearPointsFromMap = () => {
    console.log('Limpiando puntos del mapa...');
    postMessageToWebView({ type: 'clearPoints' });
    setPointsLoaded(false);
  };

  const toggleAddPointMode = () => {
    setIsAddingNewPoint(!isAddingNewPoint);
    postMessageToWebView({
      type: 'setAddPointMode',
      enabled: !isAddingNewPoint
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Cargando mapa...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header con controles */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Editar Ruta</Text>
          <Text style={styles.headerSubtitle}>
            {editableRoute?.name} • {points.length} puntos
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={saveRouteChanges}
        >
          <Ionicons name="save" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Controles de edición */}
      <View style={styles.controlsSection}>
        {/* Información de puntos */}
        <View style={styles.pointsInfoHeader}>
          <Text style={styles.pointsInfoTitle}>
            {editableRoute?.name || 'Ruta'} • {points.length} punto{points.length !== 1 ? 's' : ''}
          </Text>
          {pointsLoaded && (
            <View style={styles.loadedIndicator}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.loadedText}>Cargados</Text>
            </View>
          )}
        </View>

        {/* Primera fila de controles */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.controlsRow}
          contentContainerStyle={styles.controlsRowContent}
        >
          {/* Botón para cargar/limpiar puntos */}
          <TouchableOpacity 
            style={[
              styles.primaryButton,
              { backgroundColor: pointsLoaded ? '#FF9800' : '#4CAF50' }
            ]} 
            onPress={pointsLoaded ? clearPointsFromMap : loadPointsInMap}
            disabled={!mapReady}
          >
            <Ionicons 
              name={pointsLoaded ? "eye-off" : "eye"} 
              size={22} 
              color="#fff" 
            />
            <Text style={styles.primaryButtonText}>
              {pointsLoaded ? 'Ocultar puntos' : 'Ver puntos'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.secondaryButton,
              { 
                backgroundColor: isAddingNewPoint ? '#4CAF50' : '#1976D2',
                opacity: pointsLoaded ? 1 : 0.6
              }
            ]} 
            onPress={toggleAddPointMode}
            disabled={!pointsLoaded}
          >
            <Ionicons 
              name={isAddingNewPoint ? "checkmark" : "add"} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.secondaryButtonText}>
              {isAddingNewPoint ? 'Agregar ON' : 'Agregar'}
            </Text>
          </TouchableOpacity>
          
          {/* Botón para activar multiselección */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              {
                backgroundColor: isMultiSelectMode ? '#FF5722' : '#9E9E9E',
                opacity: pointsLoaded ? 1 : 0.6
              }
            ]}
            onPress={() => {
              const next = !isMultiSelectMode;
              setIsMultiSelectMode(next);
              if (!next) clearSelection();
            }}
            disabled={!pointsLoaded}
          >
            <Ionicons name={isMultiSelectMode ? 'checkbox' : 'square-outline'} size={18} color="#fff" />
            <Text style={styles.secondaryButtonText}>
              {isMultiSelectMode ? 'Multiselección ON' : 'Multiselección'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Botón de eliminar seleccionados - Solo visible cuando hay selección */}
      {selectedPoints.length > 0 && (
        <View style={styles.deleteSelectedContainer}>
          <View style={styles.deleteSelectedContent}>
            <View style={styles.selectionInfo}>
              <Ionicons name="checkmark-circle" size={18} color="#FF5722" />
              <Text style={styles.selectionText}>
                {selectedPoints.length} punto{selectedPoints.length !== 1 ? 's' : ''} seleccionado{selectedPoints.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteSelectedButton}
              onPress={deleteSelectedPoints}
            >
              <Ionicons name="trash" size={18} color="#fff" />
              <Text style={styles.deleteSelectedButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* WebView del mapa */}
      <WebView
        ref={webViewRef}
        source={{
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Editor de Ruta</title>
              <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
              <style>
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                #map { height: 100vh; width: 100%; }
                .point-popup { max-width: 200px; }
                .point-info { font-size: 12px; margin: 4px 0; }
              </style>
            </head>
            <body>
              <div id="map"></div>
              
              <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
              <script>
                let map = null;
                let routeLayer = null;
                let pointMarkers = [];
                let addPointMode = false;
                
                console.log('Inicializando mapa del editor...');
                
                // Inicializar mapa
                map = L.map('map').setView([-17.394, -66.165], 13);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                  attribution: '© OpenStreetMap contributors'
                }).addTo(map);
                
                // Notificar que el mapa está listo
                console.log('Mapa inicializado, notificando...');
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
                
                // Escuchar mensajes de React Native (tanto window como document para compatibilidad Android/iOS)
                function onNativeMessage(event) {
                  try {
                    const raw = event.data || (event && event.detail) || event;
                    const payload = typeof raw === 'string' ? raw : JSON.stringify(raw);
                    const data = JSON.parse(payload);
                    console.log('Mensaje recibido en WebView:', data.type, data);
                    handleMessage(data);
                  } catch (error) {
                    console.error('Error procesando mensaje en WebView:', error, event);
                  }
                }

                window.addEventListener('message', onNativeMessage);
                document.addEventListener('message', onNativeMessage); // Android older WebView
                
                function handleMessage(data) {
                  switch(data.type) {
                    case 'setCenter':
                      console.log('Centrando mapa en:', data.latitude, data.longitude);
                      map.setView([data.latitude, data.longitude], 15);
                      break;
                      
                    case 'showRoute':
                      console.log('Mostrando ruta:', data.route);
                      showRoute(data.route);
                      break;
                      
                    case 'showEditablePoints':
                      console.log('Mostrando puntos editables:', data.points.length);
                      showEditablePoints(data.points);
                      break;
                      
                    case 'setAddPointMode':
                      console.log('Cambiando modo agregar punto:', data.enabled);
                      addPointMode = data.enabled;
                      // Cambiar cursor del mapa
                      map.getContainer().style.cursor = data.enabled ? 'crosshair' : '';
                      break;
                      
                    case 'clearPoints':
                      console.log('Limpiando todos los puntos del mapa');
                      clearAllPoints();
                      break;
                    case 'setSelectedPoints':
                      console.log('Seleccion de puntos recibida:', data.selected);
                      updateMarkerSelection(Array.isArray(data.selected) ? data.selected : []);
                      break;
                  }
                }
                
                function showRoute(route) {
                  if (routeLayer) {
                    map.removeLayer(routeLayer);
                    routeLayer = null;
                  }
                  
                  if (route.coordinates && route.coordinates.length > 1) {
                    console.log('Creando polyline con', route.coordinates.length, 'coordenadas');
                    const latLngs = route.coordinates.map(coord => [coord[1], coord[0]]);
                    routeLayer = L.polyline(latLngs, {
                      color: route.color || '#1976D2',
                      weight: 4,
                      opacity: 0.8
                    }).addTo(map);
                    
                    // Ajustar vista para mostrar toda la ruta
                    map.fitBounds(routeLayer.getBounds(), { padding: [20, 20] });
                  }
                }
                
                let selectedIndices = [];

                function updateMarkerSelection(selected) {
                  selectedIndices = selected || [];
                  // Recorrer marcadores y actualizar estilo
                  pointMarkers.forEach((entry, idx) => {
                    try {
                      const marker = entry.marker;
                      if (!marker) return;
                      const isSel = selectedIndices.includes(idx);
                      // Cambiar icono simple: color rojo para seleccionado, azul por defecto
                      const iconHtml = '<div style="background:' + (isSel ? '#FF5722' : '#1976D2') + ';width:18px;height:18px;border-radius:9px;border:2px solid white"></div>';
                      const icon = L.divIcon({ className: '', html: iconHtml, iconSize: [18, 18] });
                      marker.setIcon(icon);
                    } catch (e) {
                      console.error('Error actualizando estilo marcador', idx, e);
                    }
                  });
                }

                function showEditablePoints(points) {
                  console.log('Limpiando', pointMarkers.length, 'marcadores existentes');
                  // Limpiar marcadores existentes
                  pointMarkers.forEach(entry => map.removeLayer(entry.marker));
                  pointMarkers = [];
                  
                  console.log('Creando', points.length, 'nuevos marcadores');
                  points.forEach((point, index) => {
                    try {
                      // Icono por defecto
                      const iconHtml = '<div style="background:#1976D2;width:18px;height:18px;border-radius:9px;border:2px solid white"></div>';
                      const defaultIcon = L.divIcon({ className: '', html: iconHtml, iconSize: [18, 18] });

                      const marker = L.marker([point.latitude, point.longitude], {
                        draggable: true,
                        title: point.name || 'Punto ' + (index + 1),
                        icon: defaultIcon
                      }).addTo(map);
                      
                      const popupContent = \`
                        <div class="point-popup">
                          <strong>\${point.name || 'Punto ' + (index + 1)}</strong>
                          <div class="point-info">\${point.street || 'Sin calle especificada'}</div>
                          <div class="point-info">Lat: \${point.latitude.toFixed(5)}</div>
                          <div class="point-info">Lng: \${point.longitude.toFixed(5)}</div>
                          <div style="margin-top: 8px; font-size: 11px; color: #666;">
                            📝 Toca para editar<br>
                            🔄 Arrastra para mover
                          </div>
                        </div>
                      \`;
                      
                      marker.bindPopup(popupContent);
                      
                      // Evento click para editar
                      marker.on('click', function(e) {
                        console.log('Marcador clickeado:', index);
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'pointClicked',
                          pointIndex: index
                        }));
                      });
                      
                      // Evento drag para mover
                      marker.on('dragend', function(event) {
                        const position = event.target.getLatLng();
                        console.log('Marcador movido:', index, 'a', position.lat, position.lng);
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'pointMoved',
                          pointIndex: index,
                          latitude: position.lat,
                          longitude: position.lng
                        }));
                      });
                      
                      pointMarkers.push({ marker, data: point });
                      console.log('Marcador', index, 'creado en', point.latitude, point.longitude);
                    } catch (error) {
                      console.error('Error creando marcador', index, ':', error);
                    }
                  });
                  
                  console.log('Total marcadores creados:', pointMarkers.length);
                  // Aplicar selección si ya existe
                  updateMarkerSelection(selectedIndices);
                }
                
                function clearAllPoints() {
                  console.log('Limpiando', pointMarkers.length, 'marcadores y ruta');
                  
                  // Limpiar marcadores
                  pointMarkers.forEach(marker => map.removeLayer(marker));
                  pointMarkers = [];
                  
                  // Limpiar ruta
                  if (routeLayer) {
                    map.removeLayer(routeLayer);
                    routeLayer = null;
                  }
                  
                  console.log('Mapa limpiado completamente');
                }
                
                // Escuchar clics en el mapa para agregar puntos
                map.on('click', function(event) {
                  if (addPointMode) {
                    console.log('Click en mapa para agregar punto:', event.latlng.lat, event.latlng.lng);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'mapClicked',
                      latitude: event.latlng.lat,
                      longitude: event.latlng.lng
                    }));
                  }
                });
                
                console.log('WebView del editor configurado completamente');
              </script>
            </body>
            </html>
          `
        }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        mixedContentMode="compatibility"
      />

      {/* Botones flotantes para confirmar/cancelar cambios en el mapa */}
      {hasUnsavedChanges && (
        <View style={styles.unsavedContainer} pointerEvents="box-none">
          <TouchableOpacity style={[styles.unsavedButton, styles.cancelFloating]} onPress={cancelMapChanges} accessibilityLabel="Cancelar cambios">
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.unsavedButton, styles.confirmFloating]} onPress={confirmMapChanges} accessibilityLabel="Confirmar cambios">
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de edición de punto */}
      <Modal
        visible={showPointModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closePointModal}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isAddingNewPoint ? 'Agregar Punto' : 'Editar Punto'}
              </Text>
              <TouchableOpacity onPress={closePointModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {isAddingNewPoint && (
                <View style={styles.autoFillNotice}>
                  <Ionicons name="location" size={16} color="#1976D2" />
                  <Text style={styles.autoFillText}>
                    Coordenadas obtenidas automáticamente del mapa
                  </Text>
                </View>
              )}
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre del punto</Text>
                <TextInput
                  style={styles.textInput}
                  value={pointName}
                  onChangeText={setPointName}
                  placeholder="Ej: Parada Central, Plaza Principal"
                  autoFocus={isAddingNewPoint} // Auto-foco en nombre cuando se agrega nuevo punto
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Calle o Avenida</Text>
                <TextInput
                  style={styles.textInput}
                  value={pointStreet}
                  onChangeText={setPointStreet}
                  placeholder="Ej: Av. Bolivia, Calle Comercio"
                />
              </View>
              
              <View style={styles.coordinatesRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Latitud</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: isAddingNewPoint ? '#f0f8ff' : '#fff' }]}
                    value={pointLatitude}
                    onChangeText={setPointLatitude}
                    keyboardType="numeric"
                    placeholder="Ej: -17.394567"
                    editable={!isAddingNewPoint} // Solo lectura cuando se agrega punto automáticamente
                  />
                </View>
                
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Longitud</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: isAddingNewPoint ? '#f0f8ff' : '#fff' }]}
                    value={pointLongitude}
                    onChangeText={setPointLongitude}
                    keyboardType="numeric"
                    placeholder="Ej: -66.165432"
                    editable={!isAddingNewPoint} // Solo lectura cuando se agrega punto automáticamente
                  />
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              {!isAddingNewPoint && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]} 
                  onPress={deletePoint}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Eliminar</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]} 
                onPress={closePointModal}
              >
                <Text style={[styles.actionButtonText, { color: '#666' }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]} 
                onPress={savePointChanges}
              >
                <Ionicons name="save" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>
                  {isAddingNewPoint ? 'Agregar' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  controlsSection: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  pointsInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pointsInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  loadedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  loadedText: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '500',
    marginLeft: 4,
  },
  controlsRow: {
    paddingHorizontal: 16,
  },
  controlsRowContent: {
    alignItems: 'center',
    paddingRight: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 15,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 13,
  },
  webview: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalContent: {
    padding: 20,
  },
  autoFillNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  autoFillText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  coordinatesRow: {
    flexDirection: 'row',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 44,
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  deleteSelectedContainer: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
  },
  deleteSelectedContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectionText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  deleteSelectedButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  unsavedContainer: {
    position: 'absolute',
    right: 16,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 999,
  },
  unsavedButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  cancelFloating: {
    backgroundColor: '#9E9E9E',
    marginRight: 12,
  },
  confirmFloating: {
    backgroundColor: '#4CAF50',
  },
});

export default EditMapScreen;
