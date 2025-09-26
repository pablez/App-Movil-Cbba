import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import LocationService from '../services/LocationService';
import { LocationService as FirestoreLocationService } from '../services/firestoreService';

const AdminMapScreen = ({ navigation, route }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const webViewRef = useRef(null);
  // Animación para botón atrás
  const backScale = useRef(new Animated.Value(1)).current;
  const [webIsEditing, setWebIsEditing] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [pendingRoute, setPendingRoute] = useState(null);

  // Obtener ubicación actual al cargar el componente
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Suscribirse a conductores en Firestore y reenviarlos al WebView
  useEffect(() => {
    const unsub = FirestoreLocationService.getNearbyDrivers((driversData) => {
      setDrivers(driversData || []);
      // Si mapa listo, enviar inmediatamente
      postDriversToWebView(driversData || []);
    });

    return () => { if (unsub) unsub(); };
  }, [mapReady]);

  // Manejar params.navigation para mostrar rutas persistidas o personalizadas
  useEffect(() => {
    try {
      const cr = route && route.params && route.params.customRoute ? route.params.customRoute : null;
      if (cr && cr.coordinates) {
        // cr.coordinates expected as [[lng, lat], ...]
        const payload = JSON.stringify({ type: 'showRoute', coordinates: cr.coordinates, color: cr.color || '#FF5722', name: cr.name || '' });
        if (mapReady && webViewRef.current) {
          console.log('LOG 🔧 Enviando ruta custom al WebView:', cr.name || 'sin nombre');
          webViewRef.current.postMessage(payload);
        } else {
          console.log('LOG 🔧 Pendiente ruta hasta mapReady:', cr.name || 'sin nombre');
          setPendingRoute(payload);
        }
        // limpiar params para evitar reenvíos
        navigation.setParams({ customRoute: null, routeType: null });
      }

      // Si venimos a editar (editableRoute) — enviar al WebView modo edición
      const editable = route && route.params && route.params.editableRoute ? route.params.editableRoute : null;
      if (editable && editable.coordinates) {
        const payloadEdit = JSON.stringify({ type: 'startEdit', route: editable });
  // marcar que estamos en modo edición (aunque el WebView la aplicará cuando reciba el mensaje)
  setWebIsEditing(true);
        if (mapReady && webViewRef.current) {
          console.log('LOG 🔧 Enviando editableRoute al WebView:', editable.id || '(sin id)');
          webViewRef.current.postMessage(payloadEdit);
        } else {
          console.log('LOG 🔧 Pendiente editableRoute hasta mapReady:', editable.id || '(sin id)');
          setPendingRoute(payloadEdit);
        }
        // no limpiar aquí: AdminMap enviará adminEditedRoute de vuelta al navegar
      }
    } catch (e) {
      console.warn('Error procesando params.customRoute', e);
    }
  }, [route && route.params, mapReady]);

  // Enviar pendingRoute cuando el mapa quede listo
  useEffect(() => {
    if (mapReady && pendingRoute && webViewRef.current) {
      console.log('LOG 🔧 Enviando pendingRoute al WebView');
      webViewRef.current.postMessage(pendingRoute);
      setPendingRoute(null);
    }
  }, [mapReady, pendingRoute]);

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

  // Actualizar ubicación en el mapa
  const updateMapLocation = (latitude, longitude) => {
    if (webViewRef.current) {
      const message = JSON.stringify({ type: 'center', latitude, longitude });
      webViewRef.current.postMessage(message);
    }
  };

  // Enviar lista de conductores al WebView
  const postDriversToWebView = (driversList = []) => {
    if (webViewRef.current && mapReady) {
      const payload = JSON.stringify({ type: 'driversUpdate', drivers: driversList });
      webViewRef.current.postMessage(payload);
    }
  };

  // Centrar en la ubicación actual
  const centerOnLocation = () => {
    if (location) {
      updateMapLocation(location.latitude, location.longitude);
      console.log('📍 Centrando en ubicación:', location);
    }
  };

  // Generar HTML del mapa con OpenRouteService
  const generateMapHTML = () => {    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>OpenRouteService Map</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v7.4.0/ol.css">
        <style>
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
            #map { 
              position: absolute; 
              top: 0; left: 0; right: 0; bottom: 0; 
              touch-action: pan-x pan-y pinch-zoom;
            }
            .edit-marker {
              pointer-events: auto;
              user-select: none;
            }
            .loading { 
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(255,255,255,0.9); padding: 20px; border-radius: 10px;
                z-index: 1000; text-align: center;
            }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/ol@v7.4.0/dist/ol.js"></script>
    </head>
    <body>
        <div id="loading" class="loading">🗺️ Cargando mapa...</div>
        <div id="map"></div>
        <script>
      window.vectorSource = new ol.source.Vector();
      window.routeSource = new ol.source.Vector();
            
  window.map = new ol.Map({
        target: 'map',
        layers: [
          (function(){
            var tileSource = new ol.source.XYZ({
              url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              crossOrigin: 'anonymous',
              attributions: '© OpenStreetMap contributors'
            });
            // Crear la capa tile usando la fuente y exponer un listener para tileloadend
            var tileLayer = new ol.layer.Tile({ source: tileSource });
            // Cuando al menos un tile termine de cargar, esconder overlay y notificar
            tileSource.on && tileSource.on('tileloadend', function() {
              try {
                var ld = document.getElementById('loading'); if (ld) ld.style.display = 'none';
                if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('mapReady');
              } catch (e) { }
            });
            return tileLayer;
          })(),
          new ol.layer.Vector({ source: window.routeSource }),
          new ol.layer.Vector({ source: window.vectorSource })
        ],
    view: new ol.View({
      center: ol.proj.fromLonLat([-66.1568, -17.3895]), // Cochabamba
      zoom: 13
    })
    });

  // Asegurar que OL reconozca el tamaño del contenedor y habilite interacciones táctiles
  try { if (window.map && window.map.updateSize) window.map.updateSize(); } catch(e) {}
  window.addEventListener('resize', function() { try { if (window.map && window.map.updateSize) window.map.updateSize(); } catch(e){} });

      // Ocultar cargando cuando el mapa esté listo
      // Algunas versiones de OL no disparan 'loadend' en el mapa directamente,
      // así que esperamos un breve timeout y luego notificamos a la app.
      setTimeout(function() {
        document.getElementById('loading').style.display = 'none';
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage('mapReady');
        }
      }, 800);

  // Manejar mensajes desde React Native (esperamos JSON con {type, ...})
      function updateDrivers(drivers) {
        try {
          window.vectorSource.clear();
          drivers.forEach(function(d) {
            if (!d || !d.latitude || !d.longitude) return;
            const coords = ol.proj.fromLonLat([d.longitude, d.latitude]);
            const feature = new ol.Feature({ geometry: new ol.geom.Point(coords) });
            feature.setStyle(new ol.style.Style({
              image: new ol.style.Circle({
                radius: 8,
                fill: new ol.style.Fill({ color: '#2196F3' }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
              })
            }));
            window.vectorSource.addFeature(feature);
          });
        } catch (e) { console.error(e); }
      }

      // Dibuja o actualiza una ruta: coords = [ [lng,lat], ... ]
      function updateRoute(coords, color, name) {
        try {
          window.routeSource.clear();
          if (!coords || !Array.isArray(coords) || coords.length === 0) return;

          var lineCoords = coords.map(function(p) { return ol.proj.fromLonLat([p[0], p[1]]); });
          var line = new ol.geom.LineString(lineCoords);
          var lineFeat = new ol.Feature({ geometry: line });
          lineFeat.setStyle(new ol.style.Style({ stroke: new ol.style.Stroke({ color: color || '#FF5722', width: 4 }) }));
          window.routeSource.addFeature(lineFeat);

          // marcadores inicio/fin
          var start = coords[0];
          var end = coords[coords.length - 1];
          var startF = new ol.Feature({ geometry: new ol.geom.Point(ol.proj.fromLonLat([start[0], start[1]])) });
          startF.setStyle(new ol.style.Style({ image: new ol.style.Circle({ radius: 7, fill: new ol.style.Fill({ color: '#4CAF50' }), stroke: new ol.style.Stroke({ color: '#fff', width: 2 }) }) }));
          var endF = new ol.Feature({ geometry: new ol.geom.Point(ol.proj.fromLonLat([end[0], end[1]])) });
          endF.setStyle(new ol.style.Style({ image: new ol.style.Circle({ radius: 7, fill: new ol.style.Fill({ color: '#F44336' }), stroke: new ol.style.Stroke({ color: '#fff', width: 2 }) }) }));
          window.routeSource.addFeature(startF);
          window.routeSource.addFeature(endF);

          try { var extent = window.routeSource.getExtent(); window.map.getView().fit(extent, { padding: [50,50,50,50], maxZoom: 16 }); } catch (e) {}
          // Notificar a la app que la ruta fue dibujada
          try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'routeShown', name: name || '' })); } catch (e) {}
        } catch (e) { console.error('updateRoute error', e); }
      }

      function handleStartEdit(route) {
        try {
          enterEditMode(route || {});
        } catch (e) { console.error('handleStartEdit error', e); }
      }

      function centerOnCoords(lat, lon) {
        try {
          if (window.map) {
            const coords = ol.proj.fromLonLat([lon, lat]);
            window.map.getView().setCenter(coords);
            window.map.getView().setZoom(15);
          }
        } catch (e) { console.error(e); }
      }

          // --- Inicio: helpers para modo edición ---
          window.editMarkers = [];
          window.isEditing = false;

          function clearEditState() {
            try {
              // Limpiar markers y overlays
              window.editMarkers.forEach(m => {
                if (m.overlay) window.map.removeOverlay(m.overlay);
              });
              window.editMarkers = [];
              
              // Limpiar rutas del source
              window.routeSource.clear();
              
              // Restaurar cursor del mapa
              if (window.map && window.map.getTargetElement()) {
                window.map.getTargetElement().style.cursor = 'default';
              }
              
              // Remover controles de edición del WebView si existen
              const editControls = document.getElementById('edit-controls');
              if (editControls) {
                editControls.remove();
              }
              
              // Resetear estado
              window.isEditing = false;
              window.currentEditId = null;
              window.currentEditName = '';
              window.currentEditColor = '#FF5722';
              
            } catch (e) { 
              console.error('Error clearing edit state:', e);
            }
          }

          function enterEditMode(route) {
            try {
              clearEditState();
              window.isEditing = true;
              window.currentEditId = route.id || null;
              window.currentEditName = route.name || '';
              window.currentEditColor = route.color || '#FF5722';

              const coords = route.coordinates || [];
              if (!coords || !coords.length) return;

              // Dibujar linea base en routeSource
              var lineCoords = coords.map(function(p) { return ol.proj.fromLonLat([p[0], p[1]]); });
              var line = new ol.geom.LineString(lineCoords);
              var lineFeat = new ol.Feature({ geometry: line });
              lineFeat.setStyle(new ol.style.Style({ stroke: new ol.style.Stroke({ color: window.currentEditColor, width: 4 }) }));
              window.routeSource.addFeature(lineFeat);

              // Crear markers editables con mejor UX
              coords.forEach(function(p, idx) {
                const lon = p[0], lat = p[1];
                const markerEl = document.createElement('div');
                markerEl.className = 'edit-marker';
                markerEl.style.width = '14px';
                markerEl.style.height = '14px';
                markerEl.style.borderRadius = '50%';
                markerEl.style.background = '#FFC107';
                markerEl.style.border = '2px solid #fff';
                markerEl.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
                markerEl.style.cursor = 'grab';
                markerEl.style.transition = 'transform 0.2s ease';
                markerEl.style.zIndex = '1000';

                const overlay = new ol.Overlay({ 
                  element: markerEl, 
                  positioning: 'center-center',
                  stopEvent: false // Permitir que los eventos lleguen al mapa
                });
                overlay.setPosition(ol.proj.fromLonLat([lon, lat]));
                window.map.addOverlay(overlay);
                window.editMarkers.push({ overlay, index: idx });
              });

              try { var extent = window.routeSource.getExtent(); window.map.getView().fit(extent, { padding: [50,50,50,50], maxZoom: 16 }); } catch (e) {}

              // Agregar controles Save/Cancel si no existen
              if (!document.getElementById('edit-controls')) {
                const controlsDiv = document.createElement('div');
                controlsDiv.id = 'edit-controls';
                controlsDiv.style.position = 'absolute';
                controlsDiv.style.top = '10px';
                controlsDiv.style.right = '10px';
                controlsDiv.style.zIndex = '2000';
                controlsDiv.style.display = 'flex';
                controlsDiv.style.flexDirection = 'column';
                controlsDiv.style.gap = '8px';

                const btnSave = document.createElement('button');
                btnSave.innerText = 'Guardar';
                btnSave.style.padding = '8px 12px';
                btnSave.style.background = '#4CAF50';
                btnSave.style.color = '#fff';
                btnSave.style.border = 'none';
                btnSave.style.borderRadius = '8px';

                const btnCancel = document.createElement('button');
                btnCancel.innerText = 'Cancelar';
                btnCancel.style.padding = '8px 12px';
                btnCancel.style.background = '#F44336';
                btnCancel.style.color = '#fff';
                btnCancel.style.border = 'none';
                btnCancel.style.borderRadius = '8px';

                controlsDiv.appendChild(btnSave);
                controlsDiv.appendChild(btnCancel);
                document.body.appendChild(controlsDiv);

                btnSave.addEventListener('click', function() {
                  if (!window.isEditing) return;
                  try {
                    const coordsOut = window.editMarkers.map(em => {
                      const ll = ol.proj.toLonLat(em.overlay.getPosition());
                      return [ll[0], ll[1]];
                    });
                    const payload = { type: 'editFinished', route: { id: window.currentEditId || null, coordinates: coordsOut, name: window.currentEditName || '', color: window.currentEditColor || '#FF5722' } };
                    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
                    clearEditState();
                  } catch (err) { console.error('save edit error', err); }
                });

                btnCancel.addEventListener('click', function() {
                  if (!window.isEditing) return;
                  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'editCanceled' }));
                  clearEditState();
                });
              }
            } catch (e) { console.error('enterEditMode error', e); }
          }

          // Soporte mejorado para arrastrar markers sin interferir con navegación del mapa
          let dragging = null;
          let isDraggingMarker = false;
          
          window.map.on('pointerdown', function(evt) {
            if (!window.isEditing) return;
            
            // Resetear estado
            dragging = null;
            isDraggingMarker = false;
            
            const pixel = evt.pixel;
            // Buscar si el click fue sobre un marker editable
            for (let i = 0; i < window.editMarkers.length; i++) {
              const ov = window.editMarkers[i];
              const pos = window.map.getPixelFromCoordinate(ov.overlay.getPosition());
              const dx = pos[0] - pixel[0];
              const dy = pos[1] - pixel[1];
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              if (dist < 20) { // Área de detección un poco más grande
                dragging = ov;
                isDraggingMarker = true;
                // Prevenir navegación del mapa cuando arrastramos un marker
                evt.preventDefault();
                evt.stopPropagation();
                // Cambiar cursor para indicar que se puede arrastrar
                if (ov.overlay.getElement()) {
                  ov.overlay.getElement().style.cursor = 'grabbing';
                  ov.overlay.getElement().style.transform = 'scale(1.2)';
                }
                break;
              }
            }
          });
          
          window.map.on('pointermove', function(evt) {
            if (!window.isEditing) return;
            
            if (dragging && isDraggingMarker) {
              // Arrastramos un marker - actualizar posición
              evt.preventDefault();
              evt.stopPropagation();
              
              dragging.overlay.setPosition(evt.coordinate);
              
              // Actualizar la línea en tiempo real
              try {
                const coords = window.editMarkers.map(em => ol.proj.toLonLat(em.overlay.getPosition()));
                window.routeSource.clear();
                
                if (coords.length > 1) {
                  var lineCoords = coords.map(function(p) { return ol.proj.fromLonLat([p[0], p[1]]); });
                  var line = new ol.geom.LineString(lineCoords);
                  var lineFeat = new ol.Feature({ geometry: line });
                  lineFeat.setStyle(new ol.style.Style({ 
                    stroke: new ol.style.Stroke({ 
                      color: window.currentEditColor || '#FF5722', 
                      width: 4 
                    }) 
                  }));
                  window.routeSource.addFeature(lineFeat);
                }
              } catch (err) { console.error('Error updating route during drag:', err); }
            } else {
              // No arrastramos marker - permitir navegación normal del mapa
              // Cambiar cursor sobre markers para indicar que se pueden arrastrar
              const pixel = evt.pixel;
              let overMarker = false;
              
              for (let i = 0; i < window.editMarkers.length; i++) {
                const ov = window.editMarkers[i];
                const pos = window.map.getPixelFromCoordinate(ov.overlay.getPosition());
                const dx = pos[0] - pixel[0];
                const dy = pos[1] - pixel[1];
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < 20) {
                  overMarker = true;
                  if (ov.overlay.getElement()) {
                    ov.overlay.getElement().style.cursor = 'grab';
                    ov.overlay.getElement().style.transform = 'scale(1.1)';
                  }
                } else {
                  if (ov.overlay.getElement()) {
                    ov.overlay.getElement().style.cursor = 'default';
                    ov.overlay.getElement().style.transform = 'scale(1)';
                  }
                }
              }
              
              // Cambiar cursor del mapa
              window.map.getTargetElement().style.cursor = overMarker ? 'grab' : 'default';
            }
          });
          
          window.map.on('pointerup', function(evt) {
            if (dragging && isDraggingMarker) {
              // Restaurar cursor y escala del marker
              if (dragging.overlay.getElement()) {
                dragging.overlay.getElement().style.cursor = 'grab';
                dragging.overlay.getElement().style.transform = 'scale(1)';
              }
            }
            
            // Resetear estado
            dragging = null;
            isDraggingMarker = false;
            window.map.getTargetElement().style.cursor = 'default';
          });

          // Añadir punto al hacer click simple (solo si no arrastramos markers)
          let clickStartTime = 0;
          let clickStartPixel = null;
          
          window.map.on('pointerdown', function(evt) {
            clickStartTime = Date.now();
            clickStartPixel = evt.pixel;
          });
          
          window.map.on('singleclick', function(evt) {
            if (!window.isEditing) return;
            
            // Verificar que fue un click rápido y sin arrastrar mucho
            const clickDuration = Date.now() - clickStartTime;
            let dragDistance = 0;
            
            if (clickStartPixel) {
              const dx = evt.pixel[0] - clickStartPixel[0];
              const dy = evt.pixel[1] - clickStartPixel[1];
              dragDistance = Math.sqrt(dx*dx + dy*dy);
            }
            
            // Solo añadir punto si fue un click corto y sin arrastre significativo
            if (clickDuration < 300 && dragDistance < 5) {
              // Verificar que no clickeamos sobre un marker existente
              let clickedOnMarker = false;
              for (let i = 0; i < window.editMarkers.length; i++) {
                const ov = window.editMarkers[i];
                const pos = window.map.getPixelFromCoordinate(ov.overlay.getPosition());
                const dx = pos[0] - evt.pixel[0];
                const dy = pos[1] - evt.pixel[1];
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 20) {
                  clickedOnMarker = true;
                  break;
                }
              }
              
              if (!clickedOnMarker) {
                // Añadir nuevo punto
                const coord = evt.coordinate;
                const ll = ol.proj.toLonLat(coord);
                
                const markerEl = document.createElement('div');
                markerEl.className = 'edit-marker';
                markerEl.style.width = '14px';
                markerEl.style.height = '14px';
                markerEl.style.borderRadius = '50%';
                markerEl.style.background = '#FFC107';
                markerEl.style.border = '2px solid #fff';
                markerEl.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
                markerEl.style.cursor = 'grab';
                markerEl.style.transition = 'transform 0.2s ease';

                const overlay = new ol.Overlay({ 
                  element: markerEl, 
                  positioning: 'center-center',
                  stopEvent: false // Permitir que los eventos lleguen al mapa
                });
                overlay.setPosition(coord);
                window.map.addOverlay(overlay);
                window.editMarkers.push({ overlay, index: window.editMarkers.length });

                // Actualizar la línea
                try {
                  const coords = window.editMarkers.map(em => ol.proj.toLonLat(em.overlay.getPosition()));
                  window.routeSource.clear();
                  
                  if (coords.length > 1) {
                    var lineCoords = coords.map(function(p) { return ol.proj.fromLonLat([p[0], p[1]]); });
                    var line = new ol.geom.LineString(lineCoords);
                    var lineFeat = new ol.Feature({ geometry: line });
                    lineFeat.setStyle(new ol.style.Style({ 
                      stroke: new ol.style.Stroke({ 
                        color: window.currentEditColor || '#FF5722', 
                        width: 4 
                      }) 
                    }));
                    window.routeSource.addFeature(lineFeat);
                  }
                } catch (err) { console.error('Error updating route after adding point:', err); }
              }
            }
          });
          // --- Fin: helpers para modo edición ---


      function handleIncoming(event) {
        var data = event && event.data ? event.data : null;
        if (!data) return;
        try {
          var msg = JSON.parse(data);
          if (msg.type === 'driversUpdate') {
            updateDrivers(msg.drivers || []);
          } else if (msg.type === 'center') {
            centerOnCoords(msg.latitude, msg.longitude);
          } else if (msg.type === 'showRoute') {
            updateRoute(msg.coordinates || [], msg.color || '#FF5722', msg.name || '');
          } else if (msg.type === 'startEdit') {
            handleStartEdit(msg.route || {});
          } else if (msg.type === 'performCancel') {
            // Simular cancel desde RN
            try {
              if (window.isEditing) {
                if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'editCanceled' }));
                clearEditState();
              }
            } catch (e) { console.error('performCancel error', e); }
          } else if (msg.type === 'requestSave') {
            // Simular save desde RN
            try {
              if (window.isEditing) {
                const coordsOut = window.editMarkers.map(em => {
                  const ll = ol.proj.toLonLat(em.overlay.getPosition());
                  return [ll[0], ll[1]];
                });
                const payload = { type: 'editFinished', route: { id: window.currentEditId || null, coordinates: coordsOut, name: window.currentEditName || '', color: window.currentEditColor || '#FF5722' } };
                if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
                clearEditState();
              }
            } catch (e) { console.error('requestSave error', e); }
          } else if (msg.type === 'clearRoute') {
            window.routeSource.clear();
          }
        } catch (err) {
          // No es JSON -> ignorar
        }
      }

      window.addEventListener('message', handleIncoming);
      document.addEventListener('message', handleIncoming);
        </script>
    </body>
    </html>`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>🔍 Obteniendo ubicación GPS...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: backScale }], position: 'absolute', left: 8 }}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => {
              // Si el WebView está en edición, confirmar acción
              if (webIsEditing) {
                Alert.alert('Salir de edición', 'Tienes cambios en edición. ¿Qué deseas hacer?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Salir sin guardar', style: 'destructive', onPress: () => {
                    // enviar cancel al WebView para limpiar y navegar
                    try { if (webViewRef.current) webViewRef.current.postMessage(JSON.stringify({ type: 'performCancel' })); } catch (e) {}
                    setWebIsEditing(false);
                    navigation.navigate(route?.params?.returnTo || 'AdminLines');
                  }},
                  { text: 'Guardar y salir', onPress: () => {
                    try { if (webViewRef.current) webViewRef.current.postMessage(JSON.stringify({ type: 'requestSave' })); } catch (e) {}
                    // WebView enviará editFinished y navegaremos cuando llegue el mensaje
                  }}
                ]);
                return;
              }
              // animación pequeña y navegar atrás
              Animated.sequence([
                Animated.timing(backScale, { toValue: 0.86, duration: 120, useNativeDriver: true }),
                Animated.timing(backScale, { toValue: 1, duration: 180, useNativeDriver: true })
              ]).start(() => {
                const dest = route?.params?.returnTo || 'AdminLines';
                navigation.navigate(dest);
              });
            }} style={styles.backButtonContainer}>
              <View style={styles.backButtonInner}>
                <Ionicons name="arrow-back" size={20} color="#1976D2" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>📍 Mapa Admin</Text>
            <Text style={styles.subtitle}>Gestión de ubicaciones</Text>
          </View>
          {/* (Edit controls moved to the controlsContainer to avoid overlapping the header) */}
        </View>
      </View>

      {/* Controles */}
      <View style={styles.controlsContainer}>
        {/* Ocultar control de ubicación y coordenadas cuando estamos en modo edición
            (editMode explícito en params o cuando se pasa editableRoute) */}
        {!(route && route.params && (route.params.editMode || route.params.editableRoute)) && (
          <>
            <TouchableOpacity 
              style={[styles.controlButton, !location && styles.controlButtonDisabled]} 
              onPress={centerOnLocation}
              disabled={!location}
            >
              <Text style={styles.controlButtonText}>
                {location ? '🎯 Mi Ubicación' : '📍 Obteniendo GPS...'}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.locationText}>
              {location 
                ? `📍 ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                : '🔍 Buscando ubicación...'
              }
            </Text>
          </>
        )}
        {/* Native edit controls relocated here to avoid overlap with header */}
        {(route && route.params && route.params.editMode) ? (
          <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => { try { if (webViewRef.current) webViewRef.current.postMessage(JSON.stringify({ type: 'requestSave' })); } catch (e) { console.warn(e); } }} style={{ backgroundColor: '#4CAF50', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { try { if (webViewRef.current) webViewRef.current.postMessage(JSON.stringify({ type: 'performCancel' })); } catch (e) { console.warn(e); } setWebIsEditing(false); navigation.navigate(route?.params?.returnTo || 'AdminLines'); }} style={{ backgroundColor: '#F44336', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Mapa */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: generateMapHTML() }}
          style={styles.map}
          onMessage={(event) => {
            const message = event.nativeEvent.data;
            // WebView puede enviar 'mapReady' como string o JSON
            if (message === 'mapReady') {
              setMapReady(true);
              console.log('LOG 📍 mapReady recibido desde WebView');
              if (location) {
                updateMapLocation(location.latitude, location.longitude);
              }
              return;
            }
            try {
              const parsed = JSON.parse(message);
              if (parsed && parsed.type === 'routeShown') {
                console.log('LOG ✅ routeShown en WebView:', parsed.name || '(sin nombre)');
              }
              // Mensajes de edición desde WebView
              if (parsed && parsed.type === 'editFinished') {
                // parsed.route => { id, coordinates: [[lng,lat], ...], name, color }
                console.log('LOG ✅ editFinished recibido desde WebView', parsed.route);
                  // limpiar bandera de edición
                  setWebIsEditing(false);
                // Navegar de regreso a AdminLines con el resultado en params
                navigation.navigate(route?.params?.returnTo || 'AdminLines', { adminEditedRoute: parsed.route });
              }
              if (parsed && parsed.type === 'editCanceled') {
                console.log('LOG ℹ️ editCanceled recibido desde WebView');
                  setWebIsEditing(false);
                navigation.navigate(route?.params?.returnTo || 'AdminLines');
              }
            } catch (e) {
              // mensaje no JSON — ignorar
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 5,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    textAlign: 'center',
    marginTop: 5,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  controlButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  mapContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  backButtonContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AdminMapScreen;
