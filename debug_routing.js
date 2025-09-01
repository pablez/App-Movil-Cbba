/**
 * Script de debug para la API de OpenRouteService
 */

const API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjliYzhiZDJmY2RjMTQxNzRhZGRkM2UyZDUyNWRhYmJiIiwiaCI6Im11cm11cjY0In0=';
const BASE_URL = 'https://api.openrouteservice.org';

async function debugRouting() {
  console.log('🔍 Debug de la API de OpenRouteService...');
  
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
    
    const coordinates = [
      [start.longitude, start.latitude],
      [end.longitude, end.latitude]
    ];

    const requestBody = {
      coordinates: coordinates,
      format: 'geojson',
      instructions: true,
      language: 'es',
      units: 'km'
    };

    console.log('📡 Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': API_KEY,
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📊 Response headers:', response.headers);
    
    const responseText = await response.text();
    console.log('📄 Response text:', responseText);

    try {
      const routeData = JSON.parse(responseText);
      console.log('📊 Parsed response:', JSON.stringify(routeData, null, 2));
    } catch (parseError) {
      console.log('❌ Error parsing JSON:', parseError.message);
    }

  } catch (error) {
    console.error('❌ Error en debug:', error.message);
  }
}

debugRouting();
