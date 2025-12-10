/**
 * Cloud Functions for TransportApp
 *
 * Añade una función HTTPS `orsRoute` que actúa como proxy a OpenRouteService
 * para evitar exponer la API key en el cliente.
 */

const functions = require('firebase-functions');
const {setGlobalOptions} = functions;

// For cost control, set the maximum number of containers
setGlobalOptions({maxInstances: 10});

// ORS proxy: POST only. Body: { profile?: string, coordinates: [[lng,lat], ...] }
exports.orsRoute = functions.https.onRequest(async (req, res) => {
	// CORS preflight
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.set('Access-Control-Allow-Headers', 'Content-Type');
	if (req.method === 'OPTIONS') {
		return res.status(204).send('');
	}

	if (req.method !== 'POST') {
		return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
	}

	try {
		const { profile = 'driving-car', coordinates } = req.body || {};

		if (!Array.isArray(coordinates) || coordinates.length < 2) {
			return res.status(400).json({ success: false, error: 'Invalid coordinates. Provide an array of at least two [lng,lat] pairs.' });
		}

		// Read ORS key from environment (prefer functions config: functions.config().ors.key)
		const cfgKey = (functions.config && functions.config().ors && functions.config().ors.key) || process.env.ORS_API_KEY;
		if (!cfgKey) {
			return res.status(500).json({ success: false, error: 'ORS API key not configured. Set with `firebase functions:config:set ors.key="..."` or set ORS_API_KEY env var.' });
		}

		const url = `https://api.openrouteservice.org/v2/directions/${encodeURIComponent(profile)}/geojson`;

		const body = {
			coordinates,
			// request a geojson geometry; disable instructions by default to reduce payload
			instructions: false,
		};

		const fetchRes = await fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': cfgKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		const data = await fetchRes.json();

		if (!fetchRes.ok) {
			return res.status(fetchRes.status).json({ success: false, error: data });
		}

		return res.json({ success: true, geojson: data });
	} catch (err) {
		console.error('orsRoute error:', err);
		return res.status(500).json({ success: false, error: String(err) });
	}
});
