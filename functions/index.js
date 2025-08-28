/**
 * Cloud Functions for TransportApp
 */

const {setGlobalOptions} = require("firebase-functions");

// For cost control, set the maximum number of containers
setGlobalOptions({maxInstances: 10});

// Funciones comentadas para evitar errores de ESLint
// Descomenta y personaliza según necesites

// const {onRequest} = require("firebase-functions/https");
// const logger = require("firebase-functions/logger");

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello from TransportApp!", {structuredData: true});
//   response.send("Hello from TransportApp!");
// });

// Función de ejemplo para crear viaje
// exports.createTrip = functions.firestore
//   .document('trips/{tripId}')
//   .onCreate((snap, context) => {
//     const newValue = snap.data();
//     console.log('New trip created:', newValue);
//   });
