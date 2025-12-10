// ORSService.js
// Cliente para llamar a la Cloud Function `orsRoute` que proxyee OpenRouteService.
// Uso:
//   import ORSService from '../services/ORSService';
//   const res = await ORSService.getRoute({ functionUrl: '<CLOUD_FUNCTION_URL>', profile: 'cycling-regular', coordinates: [[lng,lat],[lng,lat],...] });

const DEFAULT_FUNCTION_URL = '<REPLACE_WITH_YOUR_FUNCTION_URL>'; // e.g. https://us-central1-<PROJECT>.cloudfunctions.net/orsRoute

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data && data.error ? JSON.stringify(data.error) : `Request failed: ${res.status}`);
  return data;
}

export default {
  // options: { functionUrl, profile, coordinates }
  async getRoute(options = {}) {
    const { functionUrl = DEFAULT_FUNCTION_URL, profile = 'driving-car', coordinates } = options;
    if (!functionUrl || functionUrl.includes('<REPLACE')) {
      throw new Error('Please set `functionUrl` to your deployed functions URL or update DEFAULT_FUNCTION_URL in ORSService.js');
    }
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error('Provide `coordinates` as an array of at least two [lng,lat] pairs');
    }

    const body = { profile, coordinates };
    const result = await postJson(functionUrl, body);
    if (!result.success) throw new Error(result.error || 'ORS function returned unsuccessful response');
    return result.geojson;
  }
};
