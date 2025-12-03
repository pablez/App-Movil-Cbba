export default function generateMapHTML() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mapa Público</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v7.4.0/ol.css">
        <style>
            * { box-sizing: border-box; }
            html, body { 
                margin: 0; 
                padding: 0; 
                width: 100%; 
                height: 100%; 
                overflow: hidden;
                font-family: Arial, sans-serif;
            }
            #map { 
                width: 100%; 
                height: 100%; 
                background: #e8f4f8;
                position: relative;
            }
            .loading-indicator {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #2196F3;
                color: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 1000;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div id="loading" class="loading-indicator">🗺️ Cargando mapa...</div>
        <div id="map"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/ol@v7.4.0/dist/ol.js"></script>
        <script>
            console.log('🚀 Iniciando mapa público de Cochabamba...');
            
            var loadingElement = document.getElementById('loading');
            
            try {
                // Crear fuentes de vectores
                console.log('📦 Creando fuentes de vectores...');
                window.userLocationSource = new ol.source.Vector();
                window.markersSource = new ol.source.Vector();
                window.routeSource = new ol.source.Vector();
                window.customRouteSource = new ol.source.Vector();
                
                // Crear estilos
                console.log('🎨 Creando estilos...');
                var userLocationStyle = new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 12,
                        fill: new ol.style.Fill({ color: '#4CAF50' }),
                        stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
                    }),
                    text: new ol.style.Text({
                        text: '📍',
                        scale: 1.2,
                        offsetY: -2,
                        fill: new ol.style.Fill({ color: '#ffffff' })
                    })
                });
                
                var markerStyleFunction = function(feature) {
                    var color = feature.get('color') || '#2196F3';
                    var label = feature.get('label') || '';
                    return new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 10,
                            fill: new ol.style.Fill({ color: color }),
                            stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
                        }),
                        text: new ol.style.Text({
                            text: label,
                            scale: 1.2,
                            fill: new ol.style.Fill({ color: '#ffffff' }),
                            stroke: new ol.style.Stroke({ color: color, width: 2 })
                        })
                    });
                };
                
                var routeStyle = new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#FF5722',
                        width: 5,
                        lineDash: [10, 5]
                    })
                });
                
                var customRouteStyle = new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#1976D2',
                        width: 4
                    })
                });
                
                // Configurar vista centrada en Cochabamba
                console.log('🗺️ Configurando vista de Cochabamba...');
                var cochabambaCenter = [-66.1568, -17.3895];
                var centerProjected = ol.proj.fromLonLat(cochabambaCenter);
                
                var view = new ol.View({
                    center: centerProjected,
                    zoom: 12,
                    minZoom: 8,
                    maxZoom: 18
                });
                
                // Crear fuente OpenStreetMap (muestra calles y etiquetas)
                console.log('🌍 Creando fuente OpenStreetMap...');
                var osmSource = new ol.source.XYZ({
                  url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  crossOrigin: 'anonymous',
                  attributions: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                });
                
                // Crear capas
                console.log('📋 Creando capas...');
                var tileLayer = new ol.layer.Tile({
                  source: osmSource
                });
                
                var userLocationLayer = new ol.layer.Vector({ 
                    source: window.userLocationSource,
                    style: userLocationStyle,
                    zIndex: 4
                });
                
                var markersLayer = new ol.layer.Vector({ 
                    source: window.markersSource,
                    style: markerStyleFunction,
                    zIndex: 3
                });
                
                var routeLayer = new ol.layer.Vector({ 
                    source: window.routeSource,
                    style: routeStyle,
                    zIndex: 2
                });
                
                var customRouteLayer = new ol.layer.Vector({ 
                    source: window.customRouteSource,
                    style: customRouteStyle,
                    zIndex: 1
                });
                
                // Crear mapa principal
                console.log('🎯 Creando mapa...');
                window.map = new ol.Map({
                    target: 'map',
                    layers: [tileLayer, customRouteLayer, routeLayer, markersLayer, userLocationLayer],
                    view: view
                });
                
                // Manejar clics en el mapa
                window.map.on('click', function(event) {
                    var coordinate = ol.proj.toLonLat(event.coordinate);
                    var clickData = {
                        latitude: coordinate[1],
                        longitude: coordinate[0]
                    };
                    
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage('mapClick:' + JSON.stringify(clickData));
                    }
                });
                
                // Funciones para comunicación con React Native
                window.updateLocation = function(latitude, longitude) {
                    console.log('📍 Actualizando ubicación usuario:', latitude, longitude);
                    
                    window.userLocationSource.clear();
                    
                    var feature = new ol.Feature({
                        geometry: new ol.geom.Point(ol.proj.fromLonLat([longitude, latitude]))
                    });
                    
                    window.userLocationSource.addFeature(feature);
                    
                    // Centrar vista en la ubicación
                    window.map.getView().animate({
                        center: ol.proj.fromLonLat([longitude, latitude]),
                        zoom: 15,
                        duration: 1000
                    });
                };
                
                window.addMarker = function(id, latitude, longitude, color, label, title) {
                    console.log('📍 Agregando marcador:', { id, latitude, longitude, color, label });
                    
                    // Remover marcador existente con el mismo ID
                    var features = window.markersSource.getFeatures();
                    features.forEach(function(feature) {
                        if (feature.get('id') === id) {
                            window.markersSource.removeFeature(feature);
                        }
                    });
                    
                    var feature = new ol.Feature({
                        geometry: new ol.geom.Point(ol.proj.fromLonLat([longitude, latitude])),
                        id: id,
                        color: color,
                        label: label,
                        title: title
                    });
                    
                    window.markersSource.addFeature(feature);
                };
                
                window.clearMarkers = function() {
                    console.log('🧹 Limpiando marcadores...');
                    window.markersSource.clear();
                };
                
                window.showRoute = function(coordinates, color, style) {
                    console.log('🛣️ Mostrando ruta:', coordinates.length, 'puntos');
                    
                    window.routeSource.clear();
                    
                    if (coordinates && coordinates.length > 1) {
                        var routeCoords = coordinates.map(function(coord) {
                            return ol.proj.fromLonLat([coord[0], coord[1]]);
                        });
                        
                        var routeFeature = new ol.Feature({
                            geometry: new ol.geom.LineString(routeCoords)
                        });
                        
                        if (color) {
                            var customStyle = new ol.style.Style({
                                stroke: new ol.style.Stroke({
                                    color: color,
                                    width: 5,
                                    lineDash: style === 'dashed' ? [10, 5] : null
                                })
                            });
                            routeFeature.setStyle(customStyle);
                        }
                        
                        window.routeSource.addFeature(routeFeature);
                        
                        // Ajustar vista a la ruta
                        var extent = window.routeSource.getExtent();
                        window.map.getView().fit(extent, { 
                            padding: [50, 50, 50, 50],
                            duration: 1000 
                        });
                    }
                };
                
                window.centerOnRoute = function(coordinates, color, name) {
                    console.log('🎯 Centrando en ruta personalizada:', coordinates.length, 'puntos');
                    
                    window.customRouteSource.clear();
                    
                    if (coordinates && coordinates.length > 1) {
                        var routeCoords = coordinates.map(function(coord) {
                            return ol.proj.fromLonLat([coord.longitude, coord.latitude]);
                        });
                        
                        var routeFeature = new ol.Feature({
                            geometry: new ol.geom.LineString(routeCoords)
                        });
                        
                        if (color) {
                            var customStyle = new ol.style.Style({
                                stroke: new ol.style.Stroke({
                                    color: color,
                                    width: 4
                                })
                            });
                            routeFeature.setStyle(customStyle);
                        }
                        
                        window.customRouteSource.addFeature(routeFeature);
                        
                        // Agregar marcadores de inicio y fin
                        if (coordinates.length > 0) {
                            // Marcador de inicio
                            var startFeature = new ol.Feature({
                                geometry: new ol.geom.Point(ol.proj.fromLonLat([coordinates[0].longitude, coordinates[0].latitude])),
                                id: 'routeStart',
                                color: '#4CAF50',
                                label: '🚩',
                                title: 'Inicio: ' + name
                            });
                            window.markersSource.addFeature(startFeature);
                            
                            // Marcador de fin
                            var endFeature = new ol.Feature({
                                geometry: new ol.geom.Point(ol.proj.fromLonLat([coordinates[coordinates.length - 1].longitude, coordinates[coordinates.length - 1].latitude])),
                                id: 'routeEnd',
                                color: '#F44336',
                                label: '🏁',
                                title: 'Fin: ' + name
                            });
                            window.markersSource.addFeature(endFeature);
                        }
                        
                        // Ajustar vista a la ruta
                        var extent = window.customRouteSource.getExtent();
                        window.map.getView().fit(extent, { 
                            padding: [50, 50, 50, 50],
                            duration: 1000 
                        });
                    }
                };
                
                // Esperar a que se complete el render
                window.map.once('rendercomplete', function() {
                    console.log('✅ Mapa público renderizado correctamente');
                    loadingElement.style.display = 'none';
                    
                    // Notificar a React Native que el mapa está listo
                    if (window.ReactNativeWebView) {
                        setTimeout(function() {
                            window.ReactNativeWebView.postMessage('mapReady');
                        }, 500);
                    }
                });
                
                // Timeout de seguridad
                setTimeout(function() {
                    console.log('⏰ Timeout - removiendo loading...');
                    loadingElement.style.display = 'none';
                    
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage('mapReady');
                    }
                }, 5000);
                
                window.mapInitialized = true;
                console.log('🎉 Inicialización del mapa público completa');
                
            } catch (error) {
                console.error('❌ ERROR en inicialización:', error.message);
                loadingElement.innerHTML = '❌ Error: ' + error.message;
                
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage('error: ' + error.message);
                }
            }
            
            // Manejar mensajes de React Native
            document.addEventListener('message', function(event) {
                try {
                    var data = JSON.parse(event.data);
                    
                    switch(data.action) {
                        case 'updateLocation':
                            window.updateLocation(data.latitude, data.longitude);
                            break;
                        case 'addMarker':
                            window.addMarker(data.id, data.latitude, data.longitude, data.color, data.label, data.title);
                            break;
                        case 'clearMarkers':
                            window.clearMarkers();
                            break;
                        case 'showRoute':
                            window.showRoute(data.coordinates, data.color, data.style);
                            break;
                        case 'centerOnRoute':
                            window.centerOnRoute(data.coordinates, data.color, data.name);
                            break;
                    }
                } catch (error) {
                    console.error('❌ Error procesando mensaje:', error);
                }
            });
            
        </script>
    </body>
    </html>
    `;
}
