import { DEFAULT_LOCATION } from '../../constants/mapConstants';

export const generateMapHTML = (location) => {
  const currentLat = location ? location.latitude : DEFAULT_LOCATION.latitude;
  const currentLng = location ? location.longitude : DEFAULT_LOCATION.longitude;
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
      <title>Mapa Invitado - OpenRouteService</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v7.4.0/ol.css">
      <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { 
              width: 100%; 
              height: 100%; 
              overflow: hidden;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              background: #f0f0f0;
          }
          #map { 
              width: 100%; 
              height: 100vh; 
              background: #e8f4f8;
              position: relative;
              cursor: default;
          }
          .map-loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(25, 118, 210, 0.9);
              color: white;
              padding: 20px 30px;
              border-radius: 12px;
              z-index: 1000;
              text-align: center;
              font-size: 16px;
              font-weight: 600;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }
                    .ol-zoom { top: 20px; left: 20px; }
                     /* Make OpenLayers controls (attribution, zoom, etc.) transparent
                         to avoid the white rounded surface overlaying the map. If you
                         prefer a subtle card, change background to a semi-transparent
                         white like rgba(255,255,255,0.85) and restore box-shadow. */
                    .ol-control, .ol-attribution, .ol-zoom, .ol-scale-line {
                            background: transparent !important;
                            box-shadow: none !important;
                            border: none !important;
                            padding: 0 !important;
                        color: rgba(0,0,0,0.85) !important;
                    }
                    /* Tweak attribution placement and reduce default button chrome */
                    .ol-attribution {
                            bottom: 8px;
                            right: 8px;
                            font-size: 11px;
                            background: transparent !important;
                        padding: 0 !important;
                    }
                    .ol-attribution button, .ol-control button {
                            background: transparent !important;
                            box-shadow: none !important;
                            border: none !important;
                        color: rgba(0,0,0,0.7) !important;
                    }
          .rn-popup {
              background: #fff;
              color: #222;
              padding: 8px 10px;
              border-radius: 10px;
              box-shadow: 0 6px 18px rgba(0,0,0,0.18);
              font-size: 13px;
              line-height: 16px;
              max-width: 240px;
          }
          .rn-popup .title { color: #1976D2; font-weight: 800; margin-bottom: 6px; }
          .rn-popup .desc { color: #444; font-size: 12px; }
          .rn-popup .close-btn { background:#1976D2; color:#fff; border-radius:6px; padding:6px 8px; border:0; cursor:pointer; }
      </style>
  </head>
  <body>
      <div id="loading" class="map-loading">🗺️ Cargando mapa...</div>
      <div id="map"></div>
      
      <script src="https://cdn.jsdelivr.net/npm/ol@v7.4.0/dist/ol.js"></script>
      <script>
          console.log('🚀 Iniciando mapa de invitado con ubicación:', ${currentLat}, ${currentLng});
          
          var loadingEl = document.getElementById('loading');
          var pointSelectionEnabled = false;
          var mapInitialized = false;
          // Si followUser es true, las actualizaciones de ubicación centrarán el mapa automáticamente.
          // Si es false, el usuario puede navegar libremente sin que el mapa lo recentre.
          var followUser = true;
          
          // Función de inicialización principal
          function initializeMap() {
              try {
                  console.log('📦 Creando fuentes de vectores...');
                  
                  // Crear fuentes de vectores
                  window.userLocationSource = new ol.source.Vector();
                  window.markersSource = new ol.source.Vector();
                  window.routeSource = new ol.source.Vector();
                  
                  // Definir estilos
                  var userLocationStyle = new ol.style.Style({
                      image: new ol.style.Circle({
                          radius: 14,
                          fill: new ol.style.Fill({ color: '#4CAF50' }),
                          stroke: new ol.style.Stroke({ color: '#ffffff', width: 4 })
                      })
                  });
                  
                  var startMarkerStyle = new ol.style.Style({
                      image: new ol.style.Circle({
                          radius: 12,
                          fill: new ol.style.Fill({ color: '#2196F3' }),
                          stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
                      })
                  });
                  
                  var endMarkerStyle = new ol.style.Style({
                      image: new ol.style.Circle({
                          radius: 12,
                          fill: new ol.style.Fill({ color: '#FF5722' }),
                          stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
                      })
                  });
                  
                  var routeStyle = new ol.style.Style({
                      stroke: new ol.style.Stroke({
                          color: '#FF5722',
                          width: 5,
                          lineDash: [10, 5]
                      })
                  });
                  
                  // Configurar vista centrada en ubicación actual o Cochabamba
                  var initialCenter = [${currentLng}, ${currentLat}];
                  var centerProjected = ol.proj.fromLonLat(initialCenter);
                  
                  console.log('🎯 Centro del mapa:', initialCenter);
                  
                  var view = new ol.View({
                      center: centerProjected,
                      zoom: 14,
                      minZoom: 8,
                      maxZoom: 19,
                      constrainResolution: true
                  });
                  
                  // Configurar múltiples fuentes de tiles
                  console.log('🌍 Configurando tiles del mapa...');
                  
                  // Definir todas las fuentes de mapa disponibles
                  var mapSources = {
                      osm: new ol.source.OSM({
                          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          crossOrigin: 'anonymous',
                          attributions: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                          maxZoom: 19
                      }),
                      satellite: new ol.source.XYZ({
                          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                          crossOrigin: 'anonymous',
                          attributions: '© <a href="https://www.esri.com/">Esri</a>, DigitalGlobe, GeoEye',
                          maxZoom: 19
                      }),
                      terrain: new ol.source.XYZ({
                          url: 'https://tiles.wmflabs.org/hikebike/{z}/{x}/{y}.png',
                          crossOrigin: 'anonymous',
                          attributions: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, © Wikimedia',
                          maxZoom: 18
                      }),
                      watercolor: new ol.source.XYZ({
                          url: 'https://tile.openstreetmap.fr/openriverboatmap/{z}/{x}/{y}.png',
                          crossOrigin: 'anonymous',
                          attributions: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, © OpenRiverboatMap',
                          maxZoom: 16
                      }),
                      dark: new ol.source.XYZ({
                          url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                          crossOrigin: 'anonymous',
                          attributions: '© <a href="https://carto.com/attributions">CARTO Dark Premium</a>',
                          maxZoom: 19,
                          tilePixelRatio: 1,
                          opaque: true
                      }),
                      darkWithStreets: new ol.source.XYZ({
                          url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                          crossOrigin: 'anonymous',
                          attributions: '© CARTO Dark Optimizado',
                          maxZoom: 19,
                          tilePixelRatio: 1
                      }),
                      light: new ol.source.XYZ({
                          url: 'https://cartodb-basemaps-{a-d}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
                          crossOrigin: 'anonymous',
                          attributions: '© <a href="https://carto.com/">CARTO</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                          maxZoom: 19
                      })
                  };
                  
                  // Crear capas para cada tipo de mapa
                  console.log('📋 Creando capas del mapa...');
                  var tileLayers = {};
                  var fallbackSources = {
                      terrain: new ol.source.OSM({
                          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          crossOrigin: 'anonymous',
                          attributions: '© OpenStreetMap (Terreno Fallback)',
                          maxZoom: 19
                      }),
                      watercolor: new ol.source.XYZ({
                          url: 'https://cartodb-basemaps-{a-d}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
                          crossOrigin: 'anonymous',
                          attributions: '© CARTO (Acuarela Fallback)',
                          maxZoom: 19
                      }),
                      dark: new ol.source.XYZ({
                          url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                          crossOrigin: 'anonymous',
                          attributions: '© CARTO Dark Mejorado (Fallback)',
                          maxZoom: 19,
                          tilePixelRatio: 1
                      }),
                      darkBackup: new ol.source.XYZ({
                          url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
                          crossOrigin: 'anonymous',
                          attributions: '© Stadia Maps Dark',
                          maxZoom: 19
                      })
                  };
                  
                  Object.keys(mapSources).forEach(function(key) {
                      tileLayers[key] = new ol.layer.Tile({
                          source: mapSources[key],
                          visible: key === 'osm',
                          preload: 2
                      });
                      
                      // Agregar manejo de errores automático
                      if (fallbackSources[key]) {
                          var errorCount = 0;
                          var isUsingFallback = false;
                          
                          mapSources[key].on('tileloaderror', function(event) {
                              errorCount++;
                              console.warn('⚠️ Error ' + errorCount + ' cargando ' + key + ':', event.tile.src_);
                              
                              // Sistema de fallback inteligente para tema oscuro
                              if (key === 'dark' && !isUsingFallback) {
                                  if (errorCount === 1) {
                                      console.log('🔄 Nivel 1: Optimizando CARTO Dark para mejor visibilidad');
                                      var enhancedDarkSource = new ol.source.XYZ({
                                          url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                                          crossOrigin: 'anonymous',
                                          attributions: '© CARTO Dark Mejorado - Calles Visibles',
                                          maxZoom: 19,
                                          tilePixelRatio: 1,
                                          transition: 0
                                      });
                                      tileLayers[key].setSource(enhancedDarkSource);
                                      isUsingFallback = true;
                                  } else if (errorCount >= 2) {
                                      console.log('🔄 Nivel 2: Activando Stadia Maps Dark como respaldo');
                                      tileLayers[key].setSource(fallbackSources['darkBackup']);
                                      isUsingFallback = true;
                                  }
                              } else if (errorCount >= 3 && !isUsingFallback && fallbackSources[key]) {
                                  console.log('🔄 Activando fallback estándar para ' + key);
                                  tileLayers[key].setSource(fallbackSources[key]);
                                  isUsingFallback = true;
                              }
                          });
                      }
                  });
                  
                  // Variable global para referencias
                  window.tileLayers = tileLayers;
                  window.currentMapType = 'osm';
                  
                  var userLocationLayer = new ol.layer.Vector({ 
                      source: window.userLocationSource,
                      style: userLocationStyle,
                      zIndex: 10
                  });
                  
                  var markersLayer = new ol.layer.Vector({ 
                      source: window.markersSource,
                      style: function(feature) {
                          var type = feature.get('markerType');
                          return type === 'start' ? startMarkerStyle : endMarkerStyle;
                      },
                      zIndex: 15
                  });
                  
                  var routeLayer = new ol.layer.Vector({ 
                      source: window.routeSource,
                      style: routeStyle,
                      zIndex: 5
                  });
                  
                  // Crear mapa principal
                  console.log('🗺️ Inicializando mapa...');
                  
                  // Configurar controles manualmente para evitar problemas de compatibilidad
                  var controls = [
                      new ol.control.Zoom(),
                      new ol.control.Attribution({
                          collapsed: true,
                          collapsible: true
                      })
                  ];
                  
                  // Configurar interacciones manualmente
                  var interactions = [
                      new ol.interaction.DragPan(),
                      new ol.interaction.MouseWheelZoom(),
                      new ol.interaction.PinchZoom(),
                      new ol.interaction.KeyboardPan(),
                      new ol.interaction.KeyboardZoom(),
                      new ol.interaction.DoubleClickZoom()
                  ];
                  
                  // Crear array de capas base
                  var baseLayers = Object.values(tileLayers);
                  var allLayers = baseLayers.concat([routeLayer, userLocationLayer, markersLayer]);
                  
                  window.map = new ol.Map({
                      target: 'map',
                      layers: allLayers,
                      view: view,
                      controls: controls,
                      interactions: interactions
                  });
                  
                  // Función para cambiar tipo de mapa
                  window.changeMapType = function(newType) {
                      console.log('🔄 Cambiando a mapa tipo:', newType);
                      if (window.tileLayers && window.tileLayers[newType]) {
                          // Ocultar todas las capas base
                          Object.keys(window.tileLayers).forEach(function(key) {
                              window.tileLayers[key].setVisible(false);
                          });
                          
                          // Mostrar la capa seleccionada
                          window.tileLayers[newType].setVisible(true);
                          window.currentMapType = newType;
                          
                          // Optimización avanzada para tema oscuro
                          if (newType === 'dark') {
                              setTimeout(function() {
                                  console.log('🌙 Aplicando optimizaciones avanzadas para modo oscuro...');
                                  var darkLayer = window.tileLayers['dark'];
                                  
                                  // Aplicar fuente ultra-optimizada para tema oscuro
                                  var ultraDarkSource = new ol.source.XYZ({
                                      url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                                      crossOrigin: 'anonymous',
                                      attributions: '© CARTO Dark Ultra - Máxima Visibilidad',
                                      maxZoom: 19,
                                      tilePixelRatio: 1,
                                      transition: 200,
                                      opaque: true
                                  });
                                  
                                  darkLayer.setSource(ultraDarkSource);
                                  
                                  // Aplicar ajustes adicionales de contraste
                                  var mapElement = document.getElementById('map');
                                  if (mapElement) {
                                      mapElement.style.filter = 'contrast(1.1) brightness(1.05)';
                                      mapElement.style.backgroundColor = '#1a1a1a';
                                  }
                                  
                                  console.log('✅ Modo oscuro ultra-optimizado activado');
                              }, 200);
                          } else {
                              // Limpiar filtros para otros modos
                              var mapElement = document.getElementById('map');
                              if (mapElement) {
                                  mapElement.style.filter = 'none';
                                  mapElement.style.backgroundColor = '#e8f4f8';
                              }
                          }
                          
                          console.log('✅ Tipo de mapa cambiado a:', newType);
                      }
                  };
                  
                  // Detectar cuando los tiles se cargan
                  var tilesLoaded = 0;
                  mapSources.osm.on('tileloadend', function() {
                      tilesLoaded++;
                      console.log('✅ Tile cargado:', tilesLoaded);
                      
                      if (tilesLoaded >= 2) {
                          setTimeout(function() {
                              console.log('✅ Mapa completamente cargado');
                              if (loadingEl) loadingEl.style.display = 'none';
                              mapInitialized = true;
                              
                              if (window.ReactNativeWebView) {
                                  window.ReactNativeWebView.postMessage('mapReady');
                              }
                          }, 300);
                      }
                  });
                  
                  // Manejar clics en el mapa
                  window.map.on('click', function(evt) {
                      console.log('🖱️ Clic en mapa, selección habilitada:', pointSelectionEnabled);
                      if (!pointSelectionEnabled) return;
                      
                      var coordinate = ol.proj.toLonLat(evt.coordinate);
                      var pointData = {
                          latitude: coordinate[1],
                          longitude: coordinate[0]
                      };
                      
                      console.log('📍 Punto seleccionado:', pointData);
                      if (window.ReactNativeWebView) {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                              type: 'pointSelected',
                              coordinate: pointData
                          }));
                      }
                  });
                  
                  // Timeout de seguridad para asegurar que el mapa se muestre
                  setTimeout(function() {
                      console.log('⏰ Timeout - forzando carga del mapa');
                      if (loadingEl) loadingEl.style.display = 'none';
                      if (!mapInitialized) {
                          mapInitialized = true;
                          
                          if (window.ReactNativeWebView) {
                              window.ReactNativeWebView.postMessage('mapReady');
                          }
                      }
                  }, 5000);

                  // Cuando el usuario comienza a mover el mapa deshabilitamos el seguimiento automático
                  window.map.on('movestart', function() {
                      try {
                          followUser = false;
                          console.log('🔒 Usuario movió el mapa - seguimiento automático deshabilitado');
                      } catch (e) { console.warn('movestart handler error', e); }
                  });
                  
                  console.log('🎉 Configuración del mapa completada');
                  
              } catch (error) {
                  console.error('❌ ERROR inicializando mapa:', error);
                  if (loadingEl) {
                      loadingEl.innerHTML = '❌ Error: ' + error.message;
                      loadingEl.style.backgroundColor = '#f44336';
                  }
                  
                  if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage('error: ' + error.message);
                  }
              }
          }
          
          // Funciones de actualización
          // Actualiza la ubicación del usuario. Si force es true o followUser está activo,
          // la vista se centra en la posición. Si no, sólo se actualiza el marcador para permitir
          // que el usuario navegue libremente por el mapa.
          function updateUserLocation(lat, lng, force) {
              if (!window.map || !window.userLocationSource) {
                  console.warn('⚠️ Mapa no listo para ubicación');
                  return;
              }
              
              try {
                  console.log('📍 Actualizando ubicación del usuario:', lat, lng, 'force=', !!force, 'followUser=', !!followUser);
                  window.userLocationSource.clear();
                  var coords = ol.proj.fromLonLat([lng, lat]);
                  var feature = new ol.Feature({ 
                      geometry: new ol.geom.Point(coords)
                  });
                  window.userLocationSource.addFeature(feature);
                  // Centrar sólo si se fuerza o si el seguimiento automático está activado
                  if (force === true || followUser === true) {
                      window.map.getView().animate({
                          center: coords,
                          zoom: 15,
                          duration: 1000
                      });
                      console.log('✅ Ubicación actualizada y centrada');
                  } else {
                      console.log('ℹ️ Ubicación actualizada (sin centrar)');
                  }
              } catch (e) { 
                  console.error('❌ Error actualizando ubicación:', e);
              }
          }

          function updateMarkers(markers) {
              if (!window.map || !window.markersSource) return;
              
              try {
                  console.log('🏷️ Actualizando marcadores:', markers?.length || 0);
                  window.markersSource.clear();
                  
                  if (markers && Array.isArray(markers)) {
                      markers.forEach(function(marker) {
                          if (marker.latitude && marker.longitude) {
                              var coords = ol.proj.fromLonLat([marker.longitude, marker.latitude]);
                              var feature = new ol.Feature({ 
                                  geometry: new ol.geom.Point(coords),
                                  markerType: marker.type,
                                  title: marker.title || 'Marcador'
                              });
                              window.markersSource.addFeature(feature);
                          }
                      });
                  }
              } catch (e) { 
                  console.error('❌ Error actualizando marcadores:', e);
              }
          }

          function updateRoute(route) {
              if (!window.map || !window.routeSource) return;
              
              try {
                  console.log('🛣️ Actualizando ruta...');
                  window.routeSource.clear();
                  
                  if (route && route.coordinates && route.coordinates.length > 0) {
                      var routeCoords = route.coordinates.map(function(coord) {
                          return ol.proj.fromLonLat([coord[0], coord[1]]);
                      });
                      
                      var routeFeature = new ol.Feature({
                          geometry: new ol.geom.LineString(routeCoords)
                      });
                      
                      window.routeSource.addFeature(routeFeature);
                      
                      // Ajustar vista a la ruta
                      var extent = routeFeature.getGeometry().getExtent();
                      window.map.getView().fit(extent, {
                          padding: [50, 50, 50, 50],
                          duration: 1500,
                          maxZoom: 16
                      });
                      console.log('✅ Ruta actualizada y vista ajustada');
                  }
              } catch (e) { 
                  console.error('❌ Error actualizando ruta:', e);
              }
          }

          function clearAll() {
              if (!window.map) return;
              
              try {
                  console.log('🧹 Limpiando mapa...');
                  if (window.markersSource) window.markersSource.clear();
                  if (window.routeSource) window.routeSource.clear();
                  pointSelectionEnabled = false;
                  document.getElementById('map').style.cursor = 'default';
              } catch (e) { 
                  console.error('❌ Error limpiando mapa:', e);
              }
          }

          function enablePointSelection() {
              pointSelectionEnabled = true;
              document.getElementById('map').style.cursor = 'crosshair';
              console.log('✅ Selección de puntos habilitada');
          }

          // Mostrar una burbuja de información (overlay) en el mapa
          function showPopup(popup) {
              if (!window.map) return;
              try {
                  hidePopup();
                  var lat = popup.latitude;
                  var lng = popup.longitude;
                  if (typeof lat === 'undefined' || typeof lng === 'undefined') return;
                  var coords = ol.proj.fromLonLat([lng, lat]);

                  var container = document.createElement('div');
                  container.className = 'rn-popup';

                  // Build content from popup.title, popup.description and popup.meta (if provided)
                  var html = '';
                  if (popup.title) html += '<div class="title">' + popup.title + '</div>';
                  if (popup.description) html += '<div class="desc">' + popup.description + '</div>';

                  // If meta is provided, render its known fields in a compact list
                                    if (popup.meta && typeof popup.meta === 'object' && Object.keys(popup.meta).length > 0) {
                                            html += '<div style="margin-top:8px;font-size:12px;color:#555;">';
                                            if (popup.meta.street) html += '<div><strong>Calle:</strong> ' + popup.meta.street + '</div>';
                                            if (popup.meta.rawStreet) html += '<div style="font-style:italic;color:#666;margin-top:4px;">Atributo: ' + popup.meta.rawStreet + '</div>';
                                            if (popup.meta.name) html += '<div style="margin-top:6px;"><strong>Nombre:</strong> ' + popup.meta.name + '</div>';
                                            if (popup.meta.coordinates) html += '<div style="margin-top:6px;color:#444;"><strong>Coords:</strong> ' + JSON.stringify(popup.meta.coordinates) + '</div>';
                                            if (typeof popup.meta.latitude !== 'undefined' && typeof popup.meta.longitude !== 'undefined') html += '<div style="margin-top:6px;color:#444;"><strong>Lat:</strong> ' + Number(popup.meta.latitude).toFixed(6) + ' • <strong>Lng:</strong> ' + Number(popup.meta.longitude).toFixed(6) + '</div>';
                                            html += '</div>';
                                    } else {
                                            // Fallback de depuración: mostrar payload entero si no hay meta para ayudar a diagnosticar
                                            try {
                                                var pretty = JSON.stringify(popup, null, 2);
                                                html += '<div style="margin-top:8px;font-size:11px;color:#333;background:#f7f7f7;padding:6px;border-radius:6px;max-width:260px;overflow:auto;"><strong>Debug:</strong><pre style="white-space:pre-wrap;word-break:break-word;">' + pretty + '</pre></div>';
                                            } catch (e) {
                                                // ignore
                                            }
                                    }

                  html += '<div style="text-align:right;margin-top:8px;"><button id="rn-popup-close" class="close-btn">Cerrar</button></div>';

                  container.innerHTML = html;
                  document.body.appendChild(container);

                  // stopEvent true to prevent clicks inside the popup from propagating to the map
                  var overlay = new ol.Overlay({ element: container, positioning: 'bottom-center', stopEvent: true, offset: [0, -14] });
                  overlay.setPosition(coords);
                  window.map.addOverlay(overlay);
                  window._rnPopupOverlay = overlay;

                  var btn = document.getElementById('rn-popup-close');
                  if (btn) btn.addEventListener('click', function(e) { e.stopPropagation(); hidePopup(); });

                  // centrar ligeramente en la burbuja para asegurar visibilidad
                  try {
                    window.map.getView().animate({ center: coords, duration: 600, zoom: Math.max(window.map.getView().getZoom(), 15) });
                  } catch(e) { /* ignore animation errors */ }
              } catch (e) { console.error('❌ showPopup error', e); }
          }

          function hidePopup() {
              try {
                  if (window._rnPopupOverlay) {
                      var el = window._rnPopupOverlay.getElement();
                      window.map.removeOverlay(window._rnPopupOverlay);
                      if (el && el.parentNode) el.parentNode.removeChild(el);
                      window._rnPopupOverlay = null;
                  }
              } catch (e) { console.warn('❌ hidePopup error', e); }
          }

          // Manejo de mensajes de React Native
          function handleMessage(event) {
              if (!mapInitialized) {
                  console.warn('⚠️ Mensaje recibido pero mapa no inicializado');
                  return;
              }
              
              var data = event && event.data ? event.data : null;
              if (!data) return;
              
              try {
                  var msg = JSON.parse(data);
                  console.log('📨 Procesando mensaje:', msg.type, msg);
                  
                  switch(msg.type) {
                      case 'updateLocation':
                          if (msg.latitude && msg.longitude) {
                              // Si el mensaje solicita force: true, forzamos el centrado aunque followUser esté false
                              updateUserLocation(msg.latitude, msg.longitude, !!msg.force);
                          }
                          break;
                      case 'setFollowUser':
                          // Permite al RN habilitar/deshabilitar el centrado automático
                          if (typeof msg.follow !== 'undefined') {
                              followUser = !!msg.follow;
                              console.log('🔁 followUser cambiado a', followUser);
                          }
                          break;
                      case 'centerOnUser':
                          // Alternativa: centro inmediato en coordenadas indicadas
                          if (msg.latitude && msg.longitude) {
                              updateUserLocation(msg.latitude, msg.longitude, true);
                          }
                          break;
                      case 'centerOnRoute':
                          // Centrar la vista en la ruta actual si existe
                          if (window.routeSource) {
                              const features = window.routeSource.getFeatures();
                              if (features.length > 0) {
                                  const extent = window.routeSource.getExtent();
                                  if (extent && ol.extent.isEmpty(extent) === false) {
                                      window.map.getView().fit(extent, {
                                          padding: [50, 50, 50, 50],
                                          duration: 1000
                                      });
                                  }
                              }
                          }
                          break;
                      case 'updateMarkers':
                          if (msg.markers) {
                              updateMarkers(msg.markers);
                          }
                          break;
                      case 'updateRoute':
                          if (msg.route) {
                              updateRoute(msg.route);
                          }
                          break;
                      case 'showPopup':
                          if (msg.popup) {
                                                            console.log('📌 showPopup payload:', msg.popup);
                                                            // Forward the popup payload to React Native for debugging/inspection
                                                            try {
                                                                if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
                                                                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'webviewDebug', payload: msg.popup }));
                                                                }
                                                            } catch (e) { /* ignore */ }
                                                            showPopup(msg.popup);
                          }
                          break;
                      case 'hidePopup':
                          hidePopup();
                          break;
                      case 'clearAll':
                          clearAll();
                          break;
                      case 'enablePointSelection':
                          enablePointSelection();
                          break;
                      case 'changeMapType':
                          if (msg.mapType && window.changeMapType) {
                              window.changeMapType(msg.mapType);
                          }
                          break;
                  }
              } catch (err) {
                  console.log('📨 Mensaje no JSON:', data.substring(0, 50));
              }
          }

          // Configurar listeners
          window.addEventListener('message', handleMessage);
          document.addEventListener('message', handleMessage);
          
          // Inicializar cuando el DOM esté listo
          if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', initializeMap);
          } else {
              initializeMap();
          }
          
          console.log('🎯 Script del mapa cargado completamente');
      </script>
  </body>
  </html>`;
};