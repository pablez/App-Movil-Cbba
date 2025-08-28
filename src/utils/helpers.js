import { PASSENGER_TYPES } from './constants';

// Calcular tarifa basada en el tipo de pasajero
export const calculateFare = (passengerType) => {
  const type = PASSENGER_TYPES[passengerType] || PASSENGER_TYPES.GENERAL;
  return type.price;
};

// Validar email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validar teléfono (formato boliviano)
export const isValidPhone = (phone) => {
  // Formato: +591 followed by 8 digits
  const phoneRegex = /^\+591[67]\d{7}$/;
  return phoneRegex.test(phone);
};

// Generar ID único
export const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Formatear fecha
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-BO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Calcular distancia entre dos puntos (fórmula de Haversine)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distancia en km
};
