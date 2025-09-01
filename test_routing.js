/**
 * Script de prueba actualizado para la funcionalidad de enrutamiento
 */

// Simulación de la función decodePolyline
function decodePolyline(encoded) {
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

      coords.push([lng / 1e5, lat / 1e5]);
    }
  } catch (error) {
    console.error('❌ Error decodificando polyline:', error);
    return [];
  }

  return coords;
}

const API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjliYzhiZDJmY2RjMTQxNzRhZGRkM2UyZDUyNWRhYmJiIiwiaCI6Im11cm11cjY0In0=';
const BASE_URL = 'https://api.openrouteservice.org';

async function testRoutingFixed() {
  console.log('🧪 Probando funcionalidad de enrutamiento actualizada...');
  
  const start = {
    latitude: -17.3763764,
    longitude: -66.1838282
  };
  
  const end = {
    latitude: -17.378017,
    longitude: -66.152254
  };

  try {
    const url = `${BASE_URL}/v2/directions/driving-car`;
    
    const requestCoordinates = [
      [start.longitude, start.latitude],
      [end.longitude, end.latitude]
    ];

    const requestBody = {
      coordinates: requestCoordinates,
      format: 'json',
      instructions: true,
      language: 'es',
      units: 'km',
      geometry: true,
      elevation: false
    };

    console.log('📡 Enviando solicitud...');

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
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const routeData = await response.json();
    
    if (routeData.routes && routeData.routes.length > 0) {
      const route = routeData.routes[0];
      const summary = route.summary;
      
      console.log('✅ Ruta encontrada:');
      console.log(`📏 Distancia: ${summary.distance.toFixed(2)} km`);
      console.log(`⏱️ Tiempo: ${Math.round(summary.duration / 60)} min`);
      console.log(`� Geometry type:`, typeof route.geometry);
      
      if (typeof route.geometry === 'string') {
        console.log('🔄 Decodificando polyline...');
        const decodedCoords = decodePolyline(route.geometry);
        console.log(`🗺️ Puntos decodificados: ${decodedCoords.length}`);
        console.log('📋 Primeros 3 puntos:', decodedCoords.slice(0, 3));
        console.log('📋 Últimos 3 puntos:', decodedCoords.slice(-3));
      } else {
        console.log('📊 Geometry data:', route.geometry);
      }
      
      console.log('📋 Instrucciones:');
      route.segments[0].steps.slice(0, 3).forEach((step, i) => {
        console.log(`  ${i + 1}. ${step.instruction} (${step.distance.toFixed(1)} km)`);
      });
      
    } else {
      console.log('❌ No se encontraron rutas');
    }

  } catch (error) {
    console.error('❌ Error en el test:', error.message);
  }
}

testRoutingFixed();
