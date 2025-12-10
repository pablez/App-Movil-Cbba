// Constantes y configuraciones del mapa

export const MAP_TYPES = [
  { key: 'osm', name: 'Estándar', icon: 'map', color: '#1976D2', desc: 'Mapa clásico con calles' },
  { key: 'cyclo', name: 'Ciclista', icon: 'bicycle', color: '#00A676', desc: 'Mapa orientado a ciclistas (carriles y vías ciclables)' },
  { key: 'transport', name: 'Transporte', icon: 'bus', color: '#FF5722', desc: 'Mapa optimizado para transporte público (rutas y paraderos)' },
  { key: 'satellite', name: 'Satélite', icon: 'earth', color: '#4CAF50', desc: 'Vista satelital' },
  { key: 'terrain', name: 'Terreno', icon: 'triangle', color: '#FF9800', desc: 'Relieve y topografía' },
  { key: 'dark', name: 'Oscuro', icon: 'moon', color: '#424242', desc: 'Modo nocturno optimizado' },
  { key: 'light', name: 'Claro', icon: 'sunny', color: '#FFC107', desc: 'Tema claro minimalista' },
  { key: 'watercolor', name: 'Acuarela', icon: 'brush', color: '#E91E63', desc: 'Estilo artístico único' }
];

export const DEFAULT_LOCATION = {
  latitude: -17.3895, // Cochabamba, Bolivia
  longitude: -66.1568
};

export const MAP_CONFIG = {
  INITIAL_ZOOM: 14,
  MIN_ZOOM: 8,
  MAX_ZOOM: 19,
  TAB_BAR_HEIGHT: 70,
  MIN_BOTTOM_PADDING: 16
};

export const MAP_COLORS = {
  primary: '#1976D2',
  secondary: '#FF5722', 
  success: '#4CAF50',
  danger: '#f44336',
  purple: '#9C27B0',
  userLocation: '#4CAF50',
  startMarker: '#2196F3',
  endMarker: '#FF5722',
  routeLine: '#FF5722'
};

export const MESSAGE_TYPES = {
  UPDATE_LOCATION: 'updateLocation',
  UPDATE_MARKERS: 'updateMarkers',
  UPDATE_ROUTE: 'updateRoute',
  CLEAR_ALL: 'clearAll',
  ENABLE_POINT_SELECTION: 'enablePointSelection',
  CHANGE_MAP_TYPE: 'changeMapType',
  POINT_SELECTED: 'pointSelected',
  MAP_READY: 'mapReady'
};