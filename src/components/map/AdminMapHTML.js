// Función para generar HTML del mapa admin con Leaflet
export const generateAdminMapHTML = (editMode = false) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
      <title>Admin Map - OpenRouteService - Cochabamba</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
      <style>
          html, body, #map { 
              margin: 0; padding: 0; width: 100%; height: 100%; 
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          }
          .loading { 
              position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
              background: rgba(33, 150, 243, 0.95); color: white; padding: 20px; 
              border-radius: 15px; z-index: 1000; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          }
          .loading-spinner { 
              width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.3); 
              border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite; 
              margin: 0 auto 10px;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .location-info {
              position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.9);
              padding: 8px 12px; border-radius: 8px; font-size: 12px; z-index: 1000;
          }
      </style>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" 
              integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  </head>
  <body>
      <div id="loading" class="loading">
          <div class="loading-spinner"></div>
          <div>🗺️ Cargando Mapa Administrativo...</div>
      </div>
      <div id="map"></div>
      <div id="location-info" class="location-info" style="display:none;"></div>
      
      <script>
          console.log('🗺️ Iniciando mapa administrativo...');
          
          // Inicializar mapa con Leaflet
          window.map = L.map('map', {
              center: [-17.3895, -66.1568], // Cochabamba
              zoom: 13,
              zoomControl: true,
              attributionControl: false,
              preferCanvas: true,
              maxZoom: 19,
              minZoom: 10
          });

          // Capa de tiles OpenStreetMap
          const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19,
              tileSize: 256,
              crossOrigin: true,
              updateWhenIdle: true,
              updateWhenZooming: false,
              keepBuffer: 2
          });
          
          tileLayer.addTo(window.map);

                    // Exponer función para cambiar capa de tiles desde React Native
                    window.setTileLayer = function(url, attribution) {
                        try {
                            if (tileLayer) {
                                try { window.map.removeLayer(tileLayer); } catch (e) { /* ignore */ }
                                tileLayer = null;
                            }
                            tileLayer = L.tileLayer(url, {
                                attribution: attribution || '',
                                maxZoom: 19,
                                tileSize: 256,
                                crossOrigin: true
                            }).addTo(window.map);
                            console.log('Tile layer cambiada a', url);
                        } catch (e) {
                            console.error('Error cambiando tile layer', e);
                        }
                    };

          // Variables globales
          window.currentLocationMarker = null;
          window.searchMarkers = [];
          window.transportRoutes = [];
          window.routeLayer = null;
          window.originMarker = null;
          window.destinationMarker = null;

          // Iconos personalizados
          const locationIcon = L.divIcon({
              className: 'current-location-marker',
              html: \`<div style="
                  width: 20px; height: 20px; border-radius: 50%; 
                  background: #4CAF50; border: 3px solid white; 
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  animation: pulse 2s infinite;
              "></div>
              <style>
              @keyframes pulse {
                  0% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.2); opacity: 0.7; }
                  100% { transform: scale(1); opacity: 1; }
              }
              </style>\`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
          });

          // Manejar carga del mapa
          let mapLoaded = false;
          tileLayer.on('load', function() {
              if (!mapLoaded) {
                  mapLoaded = true;
                  document.getElementById('loading').style.display = 'none';
                  console.log('✅ Mapa administrativo cargado');
                  
                  if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage('mapReady');
                  }
              }
          });

          setTimeout(function() {
              if (!mapLoaded) {
                  document.getElementById('loading').style.display = 'none';
                  console.log('⚠️ Mapa cargado por timeout');
                  if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage('mapReady');
                  }
              }
          }, 3000);

          // Modo edición para admin
          window.adminEditMode = ${editMode ? 'true' : 'false'};
          window.adminSelectedPoints = window.adminSelectedPoints || [];

          window.onMapClickForAdmin = function(e) {
              try {
                  const lat = e.latlng.lat;
                  const lng = e.latlng.lng;
                  console.log('✏️ admin map click', lat, lng);

                  const index = window.adminSelectedPoints.length + 1;
                  const pinHtml = '<div style="background:#1976D2;color:#fff;padding:6px 8px;border-radius:12px;font-weight:700;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">' + index + '</div>';
                  const pinIcon = L.divIcon({ className: 'admin-pin', html: pinHtml, iconSize: [30, 30], iconAnchor: [15, 15] });
                  const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(window.map).bindPopup('<b>Punto ' + index + '</b><br>' + lat.toFixed(6) + ', ' + lng.toFixed(6));

                  window.adminSelectedPoints.push({ lat, lng, marker });

                  if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({ 
                          type: 'adminMapPoint', 
                          latitude: lat, 
                          longitude: lng, 
                          index 
                      }));
                  }
              } catch (err) { 
                  console.error('admin click error', err); 
              }
          };

          if (window.adminEditMode) {
              window.map.on('click', window.onMapClickForAdmin);
              console.log('✏️ Modo edición admin activado');
          }

          // Funciones para React Native
          window.updateLocation = function(lat, lng, address) {
              console.log('📍 Actualizando ubicación admin:', lat, lng);
              
              if (window.currentLocationMarker) {
                  window.map.removeLayer(window.currentLocationMarker);
              }
              
              window.currentLocationMarker = L.marker([lat, lng], {icon: locationIcon})
                  .addTo(window.map);
              
              window.map.setView([lat, lng], 16, {animate: true});
              
              if (address) {
                  const locationInfo = document.getElementById('location-info');
                  locationInfo.innerHTML = \`📍 \${address}\`;
                  locationInfo.style.display = 'block';
              }
          };

          window.addSearchMarker = function(lat, lng, title, address) {
              const marker = L.marker([lat, lng])
                  .addTo(window.map)
                  .bindPopup(\`<b>\${title}</b><br>\${address || ''}\`);
              
              window.searchMarkers.push(marker);
              return marker;
          };

          window.clearSearchMarkers = function() {
              window.searchMarkers.forEach(marker => {
                  window.map.removeLayer(marker);
              });
              window.searchMarkers = [];
          };

          // Funciones para rutas de transporte
          window.addTransportRoute = function(coordinates, color, routeName) {
              console.log('🚌 Agregando ruta admin:', routeName);
              
              window.clearTransportRoutes();
              
              const latLngCoords = coordinates.map(coord => [coord[1], coord[0]]);
              
              const route = L.polyline(latLngCoords, {
                  color: color,
                  weight: 4,
                  opacity: 0.8,
                  smoothFactor: 1.0
              }).addTo(window.map);
              
              route.bindPopup(\`<b>\${routeName}</b><br>Ruta de transporte público\`);
              window.transportRoutes.push(route);
              
              if (latLngCoords.length > 0) {
                  const startPoint = latLngCoords[0];
                  const endPoint = latLngCoords[latLngCoords.length - 1];
                  
                  const startIcon = L.divIcon({
                      className: 'route-marker',
                      html: \`<div style="background: \${color}; color: white; padding: 4px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">INICIO</div>\`,
                      iconSize: [50, 20],
                      iconAnchor: [25, 10]
                  });
                  
                  const endIcon = L.divIcon({
                      className: 'route-marker',
                      html: \`<div style="background: \${color}; color: white; padding: 4px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">FIN</div>\`,
                      iconSize: [50, 20],
                      iconAnchor: [25, 10]
                  });
                  
                  const startMarker = L.marker(startPoint, {icon: startIcon}).addTo(window.map);
                  const endMarker = L.marker(endPoint, {icon: endIcon}).addTo(window.map);
                  
                  window.transportRoutes.push(startMarker, endMarker);
              }
              
              console.log('✅ Ruta admin agregada:', routeName);
          };

          window.clearTransportRoutes = function() {
              window.transportRoutes.forEach(item => {
                  window.map.removeLayer(item);
              });
              window.transportRoutes = [];
          };

          window.centerMap = function(lng, lat, zoom = 13) {
              window.map.setView([lat, lng], zoom, {animate: true});
          };

          // Funciones para rutas personalizadas
          window.showRoute = function(originLat, originLng, destLat, destLng, originName = 'Origen', destName = 'Destino') {
              console.log('🛣️ Mostrando ruta admin:', originName, '->', destName);
              
              window.clearRoute();
              
              try {
                  const originIcon = L.divIcon({
                      className: 'origin-marker',
                      html: \`<div style="width: 16px; height: 16px; border-radius: 50%; background: #4CAF50; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>\`,
                      iconSize: [16, 16],
                      iconAnchor: [8, 8]
                  });
                  
                  window.originMarker = L.marker([originLat, originLng], {icon: originIcon})
                      .addTo(window.map)
                      .bindPopup(\`📍 <b>\${originName}</b>\`);
                  
                  const destIcon = L.divIcon({
                      className: 'destination-marker',
                      html: \`<div style="width: 16px; height: 16px; border-radius: 50%; background: #F44336; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>\`,
                      iconSize: [16, 16],
                      iconAnchor: [8, 8]
                  });
                  
                  window.destinationMarker = L.marker([destLat, destLng], {icon: destIcon})
                      .addTo(window.map)
                      .bindPopup(\`🎯 <b>\${destName}</b>\`);
                  
                  const routeCoords = [[originLat, originLng], [destLat, destLng]];
                  
                  window.routeLayer = L.polyline(routeCoords, {
                      color: '#2196F3',
                      weight: 4,
                      opacity: 0.7,
                      dashArray: '10, 5',
                      smoothFactor: 1.0
                  }).addTo(window.map);
                  
                  const distance = window.calculateDistance(originLat, originLng, destLat, destLng);
                  const midLat = (originLat + destLat) / 2;
                  const midLng = (originLng + destLng) / 2;
                  
                  const routeInfo = L.popup({
                      closeButton: true,
                      autoClose: false
                  })
                      .setLatLng([midLat, midLng])
                      .setContent(\`<div style="text-align: center;"><b>🛣️ Ruta Admin</b><br><small>\${originName} → \${destName}</small><br><b>📏 \${distance.toFixed(1)} km</b></div>\`)
                      .openOn(window.map);
                  
                  const bounds = L.latLngBounds([[originLat, originLng], [destLat, destLng]]);
                  window.map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
                  
                  console.log('✅ Ruta admin mostrada');
                  
              } catch (error) {
                  console.error('❌ Error mostrando ruta admin:', error);
              }
          };

          window.calculateDistance = function(lat1, lng1, lat2, lng2) {
              const R = 6371;
              const dLat = (lat2 - lat1) * Math.PI / 180;
              const dLng = (lng2 - lng1) * Math.PI / 180;
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                       Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                       Math.sin(dLng/2) * Math.sin(dLng/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              return R * c;
          };

          window.showDetailedRoute = function(originLat, originLng, destLat, destLng, routeCoords, originName = 'Origen', destName = 'Destino', distance = null, duration = null) {
              console.log('🗺️ Mostrando ruta detallada admin:', originName, '->', destName);
              
              window.clearRoute();
              
              try {
                  const originIcon = L.divIcon({
                      className: 'origin-marker',
                      html: \`<div style="width: 16px; height: 16px; border-radius: 50%; background: #4CAF50; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>\`,
                      iconSize: [16, 16],
                      iconAnchor: [8, 8]
                  });
                  
                  window.originMarker = L.marker([originLat, originLng], {icon: originIcon})
                      .addTo(window.map)
                      .bindPopup(\`📍 <b>\${originName}</b>\`);
                  
                  const destIcon = L.divIcon({
                      className: 'destination-marker',
                      html: \`<div style="width: 16px; height: 16px; border-radius: 50%; background: #F44336; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>\`,
                      iconSize: [16, 16],
                      iconAnchor: [8, 8]
                  });
                  
                  window.destinationMarker = L.marker([destLat, destLng], {icon: destIcon})
                      .addTo(window.map)
                      .bindPopup(\`🎯 <b>\${destName}</b>\`);
                  
                  const leafletCoords = routeCoords.map(coord => [coord[1], coord[0]]);
                  
                  window.routeLayer = L.polyline(leafletCoords, {
                      color: '#2196F3',
                      weight: 4,
                      opacity: 0.8,
                      smoothFactor: 1.0
                  }).addTo(window.map);
                  
                  let routeInfoText = \`<div style="text-align: center;"><b>🛣️ Ruta Admin Detallada</b><br><small>\${originName} → \${destName}</small><br>\`;
                  
                  if (distance && duration) {
                      const distanceKm = (distance / 1000).toFixed(1);
                      const durationMin = Math.round(duration / 60);
                      routeInfoText += \`<b>📏 \${distanceKm} km</b><br><b>⏱️ \${durationMin} min</b>\`;
                  } else if (distance) {
                      const distanceKm = (distance / 1000).toFixed(1);
                      routeInfoText += \`<b>📏 \${distanceKm} km</b>\`;
                  }
                  
                  routeInfoText += \`</div>\`;
                  
                  const midIndex = Math.floor(leafletCoords.length / 2);
                  const midPoint = leafletCoords[midIndex] || [(originLat + destLat) / 2, (originLng + destLng) / 2];
                  
                  const routeInfo = L.popup({ closeButton: true, autoClose: false })
                      .setLatLng(midPoint)
                      .setContent(routeInfoText)
                      .openOn(window.map);
                  
                  const bounds = L.latLngBounds(leafletCoords);
                  window.map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
                  
                  console.log('✅ Ruta detallada admin mostrada');
                  
              } catch (error) {
                  console.error('❌ Error mostrando ruta detallada admin:', error);
                  
                  if (window.showRoute) {
                      console.log('🔄 Fallback a ruta simple admin');
                      window.showRoute(originLat, originLng, destLat, destLng, originName, destName);
                  }
              }
          };

          window.clearRoute = function() {
              if (window.routeLayer) {
                  window.map.removeLayer(window.routeLayer);
                  window.routeLayer = null;
              }
              if (window.originMarker) {
                  window.map.removeLayer(window.originMarker);
                  window.originMarker = null;
              }
              if (window.destinationMarker) {
                  window.map.removeLayer(window.destinationMarker);
                  window.destinationMarker = null;
              }
              console.log('🧹 Ruta admin limpiada');
          };

          // Manejo de mensajes desde React Native
          window.addEventListener('message', function(event) {
              try { eval(event.data); } catch (e) { console.error('❌ Error ejecutando script admin:', e); }
          });
          
          document.addEventListener('message', function(event) {
              try { eval(event.data); } catch (e) { console.error('❌ Error ejecutando script admin:', e); }
          });

          console.log('✅ Mapa administrativo inicializado');
      </script>
  </body>
  </html>`;
};