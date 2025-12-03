import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PublicRoutesScreen = ({ navigation }) => {
  const [routes, setRoutes] = useState([]);
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [expandedRoutes, setExpandedRoutes] = useState(new Set()); // Para controlar qué rutas están expandidas
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Calcular espaciado dinámico para evitar superposición con bottom tabs
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 70;
  const BOTTOM_SPACING = TAB_BAR_HEIGHT + Math.max(insets.bottom, 0); // Espacio para el tab bar integrado

  useEffect(() => {
    // Primero intentamos rutas marcadas como públicas
    const qPublic = query(collection(db, 'routes'), where('public', '==', true));
    const unsub = onSnapshot(qPublic, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (docs.length === 0) {
        // Si no hay rutas públicas, intentamos leer todas las rutas (fallback para usuarios autenticados)
        console.log('No hay rutas públicas, intentando leer todas las rutas...');
        const qAll = query(collection(db, 'routes'));
        const unsubAll = onSnapshot(qAll, (snapAll) => {
          const allDocs = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
          // Ordenar en cliente por createdAt
          const getTime = (v) => {
            if (!v) return 0;
            if (v && typeof v.toMillis === 'function') return v.toMillis();
            if (typeof v === 'number') return v;
            return 0;
          };
          allDocs.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
          setRoutes(allDocs);
          setFilteredRoutes(allDocs); // Inicializar rutas filtradas
          setLoading(false);
        }, (errAll) => {
          console.error('Error cargando todas las rutas', errAll);
          setErrorMsg(`No se encontraron rutas públicas y falló el acceso general: ${errAll.message || errAll}`);
          setLoading(false);
        });
        return unsubAll;
      } else {
        // Ordenar rutas públicas encontradas
        const getTime = (v) => {
          if (!v) return 0;
          if (v && typeof v.toMillis === 'function') return v.toMillis();
          if (typeof v === 'number') return v;
          return 0;
        };
        docs.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
        setRoutes(docs);
        setFilteredRoutes(docs); // Inicializar rutas filtradas
        setLoading(false);
      }
    }, (err) => {
      console.error('Error cargando rutas públicas', err);
      setErrorMsg(err && err.message ? err.message : String(err));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Función de búsqueda
  const searchRoutes = (text) => {
    setSearchText(text);
    setIsSearching(text.length > 0);
    
    if (text.length === 0) {
      setFilteredRoutes(routes);
      return;
    }

    const searchTerm = text.toLowerCase().trim();
    const filtered = routes.filter(route => {
      // Buscar en el nombre de la ruta
      if (route.name && route.name.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Buscar en los puntos detallados si existen
      if (route.points && route.points.length > 0) {
        return route.points.some(point => {
          return (point.name && point.name.toLowerCase().includes(searchTerm)) ||
                 (point.street && point.street.toLowerCase().includes(searchTerm));
        });
      }

      // Fallback: buscar en las paradas antiguas si existen
      if (route.stops && route.stops.length > 0) {
        return route.stops.some(stop => {
          return (stop.name && stop.name.toLowerCase().includes(searchTerm)) ||
                 (stop.address && stop.address.toLowerCase().includes(searchTerm));
        });
      }

      return false;
    });

    setFilteredRoutes(filtered);
  };

  const openOnMap = (r) => {
    // Normalizar coordenadas a [[lng,lat], ...]
    let coords = [];
    
    if (r.coordinates && Array.isArray(r.coordinates) && r.coordinates.length > 0) {
      // Si coordinates ya es un array de arrays [[lng,lat], ...]
      if (Array.isArray(r.coordinates[0])) {
        coords = r.coordinates;
      } 
      // Si coordinates es un array de objetos {lat, lng}
      else if (r.coordinates[0] && typeof r.coordinates[0] === 'object' && 'lat' in r.coordinates[0]) {
        coords = r.coordinates.map(c => [c.lng, c.lat]);
      }
    }
    
    // Navegar al tab 'Mapa' dentro del stack de tabs para mantener la barra inferior visible
    // Usamos el stack principal `MainTabs` y pasamos params al screen `Mapa`.
    // IMPORTANTE: Incluir TODOS los campos de Firebase, especialmente 'points' con info detallada de paradas
    navigation.navigate('MainTabs', { 
      screen: 'Mapa', 
      params: { 
        customRoute: { 
          coordinates: coords, 
          color: r.color, 
          name: r.name,
          // Incluir todos los campos adicionales de Firebase
          points: r.points || [], // Array con name, street, latitude, longitude de cada parada
          stops: r.stops || [],   // Fallback por si usa 'stops' en lugar de 'points'
          totalPoints: r.totalPoints,
          public: r.public,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          // Preservar cualquier otro campo que pueda tener la ruta
          ...r
        } 
      } 
    });
  };

  const fetchAllRoutesDebug = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Primero intentar rutas públicas
      const qPublic = query(collection(db, 'routes'), where('public', '==', true));
      const snapPublic = await getDocs(qPublic);
      const publicDocs = snapPublic.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (publicDocs.length > 0) {
        setDebugInfo({ 
          count: publicDocs.length, 
          sample: publicDocs.slice(0, 5),
          type: 'públicas'
        });
        console.log('DEBUG public routes:', publicDocs.slice(0, 10));
      } else {
        // Si no hay públicas, intentar todas las rutas
        console.log('No hay rutas públicas, intentando leer todas...');
        const qAll = query(collection(db, 'routes'));
        const snapAll = await getDocs(qAll);
        const allDocs = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
        
        setDebugInfo({ 
          count: allDocs.length, 
          sample: allDocs.slice(0, 5),
          type: 'todas (sin campo public)'
        });
        console.log('DEBUG all routes:', allDocs.slice(0, 10));
        
        if (allDocs.length === 0) {
          setErrorMsg('No se encontraron documentos en la colección `routes`.');
        } else {
          setErrorMsg(`Se encontraron ${allDocs.length} rutas, pero ninguna tiene el campo 'public: true'. Añade este campo a los documentos que quieras hacer públicos.`);
        }
      }
    } catch (e) {
      console.error('DEBUG fetchRoutes failed', e);
      const msg = e && e.message ? e.message : String(e);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
        setErrorMsg('Permisos denegados. Asegúrate de desplegar las reglas de Firestore actualizadas.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para alternar la expansión de una ruta
  const toggleRouteExpansion = (routeId) => {
    const newExpanded = new Set(expandedRoutes);
    if (newExpanded.has(routeId)) {
      newExpanded.delete(routeId);
    } else {
      newExpanded.add(routeId);
    }
    setExpandedRoutes(newExpanded);
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1976D2" />
      <Text style={{ marginTop: 12 }}>Cargando rutas...</Text>
    </View>
  );

  if (!routes || routes.length === 0) return (
    <View style={styles.center}>
      <Text>No hay rutas públicas disponibles.</Text>
      {errorMsg && <Text style={{ color: '#b00020', marginTop: 8 }}>{errorMsg}</Text>}
      <TouchableOpacity onPress={fetchAllRoutesDebug} style={{ marginTop: 12, backgroundColor: '#1976D2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Diagnóstico: listar todas las rutas</Text>
      </TouchableOpacity>
      {debugInfo && (
        <View style={{ marginTop: 12, paddingHorizontal: 10 }}>
          <Text>Documentos encontrados ({debugInfo.type}): {debugInfo.count}</Text>
          <Text style={{ marginTop: 6, fontWeight: '600' }}>Muestra:</Text>
          {debugInfo.sample.map(s => (
            <Text key={s.id} style={{ fontSize: 12 }}>
              {s.id} — {s.name || 'sin nombre'} {s.public ? '(público)' : '(sin campo public)'}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Título del screen */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 15 }]}>
        <Text style={styles.headerTitle}>🚌 Rutas Públicas</Text>
        <Text style={styles.headerSubtitle}>
          {isSearching 
            ? `${filteredRoutes.length} ${filteredRoutes.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}` 
            : `${routes.length} ${routes.length === 1 ? 'ruta disponible' : 'rutas disponibles'}`
          }
        </Text>
        
        {/* Botón para ir al Login */}
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Ionicons name="log-in-outline" size={18} color="#1976D2" />
          <Text style={styles.loginButtonText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre de ruta o parada..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={searchRoutes}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity 
              onPress={() => searchRoutes('')}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredRoutes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ 
          paddingHorizontal: 12,
          paddingBottom: BOTTOM_SPACING + 20, // Espacio dinámico para tab bar
        }}
        ListEmptyComponent={
          isSearching ? (
            <View style={styles.emptySearch}>
              <Ionicons name="search-outline" size={48} color="#ccc" />
              <Text style={styles.emptySearchText}>
                No se encontraron rutas que coincidan con "{searchText}"
              </Text>
              <Text style={styles.emptySearchHint}>
                Intenta buscar por nombre de ruta o parada
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isExpanded = expandedRoutes.has(item.id);
          const hasDetailedPoints = item.points && item.points.length > 0;
          const hasStops = item.stops && item.stops.length > 0;
          const hasCoordinates = item.coordinates && item.coordinates.length > 0;
          
          // Función para resaltar texto de búsqueda
          const highlightText = (text, highlight) => {
            if (!highlight || !text) return text;
            const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
            return parts.map((part, index) => 
              part.toLowerCase() === highlight.toLowerCase() 
                ? `**${part}**` 
                : part
            ).join('');
          };
          
          return (
            <View style={[styles.item, isSearching && styles.searchResultItem]}>
              <View style={styles.row}>
                <View style={[styles.swatch, { backgroundColor: item.color || '#607D8B' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>
                    {item.name || 'Sin nombre'}
                    {isSearching && item.name && item.name.toLowerCase().includes(searchText.toLowerCase()) && (
                      <Text style={styles.matchIndicator}> ✓</Text>
                    )}
                  </Text>
                  <Text style={styles.sub}>
                    {hasDetailedPoints 
                      ? `${item.points.length} paradas con detalles` 
                      : hasCoordinates 
                        ? `${item.coordinates.length} puntos básicos` 
                        : 'Sin coordenadas'
                    }
                    {hasStops && ` • ${item.stops.length} paradas adicionales`}
                  </Text>
                  
                  {/* Mostrar paradas/puntos según el estado de expansión */}
                  {(hasDetailedPoints || hasStops || hasCoordinates) && (
                    <View style={styles.stopsContainer}>
                      {/* Mostrar puntos detallados si existen */}
                      {hasDetailedPoints && (
                        <>
                          <Text style={styles.stopsTitle}>🚏 Paradas de la ruta:</Text>
                          {(isExpanded ? item.points : item.points.slice(0, 3)).map((point, index) => (
                            <View key={index} style={styles.stopItem}>
                              <View style={styles.stopInfo}>
                                <Text style={styles.stopText}>
                                  🟢 {point.name || `Parada ${index + 1}`}
                                </Text>
                                <Text style={styles.streetText}>
                                  📍 {point.street || 'Calle no especificada'}
                                </Text>
                              </View>
                              {/* Indicador si esta parada coincide con la búsqueda */}
                              {isSearching && searchText && (
                                (point.name && point.name.toLowerCase().includes(searchText.toLowerCase())) ||
                                (point.street && point.street.toLowerCase().includes(searchText.toLowerCase()))
                              ) && (
                                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" style={styles.matchIcon} />
                              )}
                            </View>
                          ))}
                          {!isExpanded && item.points.length > 3 && (
                            <Text style={styles.moreStops}>
                              +{item.points.length - 3} paradas más
                            </Text>
                          )}
                        </>
                      )}

                      {/* Mostrar paradas antiguas si existen y no hay points */}
                      {!hasDetailedPoints && hasStops && (
                        <>
                          <Text style={styles.stopsTitle}>📍 Paradas principales:</Text>
                          {(isExpanded ? item.stops : item.stops.slice(0, 3)).map((stop, index) => (
                            <View key={index} style={styles.stopItem}>
                              <Text style={styles.stopText}>
                                • {stop.name || stop.address || `Parada ${index + 1}`}
                              </Text>
                              {/* Indicador si esta parada coincide con la búsqueda */}
                              {isSearching && searchText && (
                                (stop.name && stop.name.toLowerCase().includes(searchText.toLowerCase())) ||
                                (stop.address && stop.address.toLowerCase().includes(searchText.toLowerCase()))
                              ) && (
                                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" style={styles.matchIcon} />
                              )}
                            </View>
                          ))}
                          {!isExpanded && item.stops.length > 3 && (
                            <Text style={styles.moreStops}>
                              +{item.stops.length - 3} paradas más
                            </Text>
                          )}
                        </>
                      )}
                      
                      {/* Mostrar coordenadas básicas si no hay points ni paradas definidas */}
                      {!hasDetailedPoints && !hasStops && hasCoordinates && (
                        <>
                          <Text style={styles.stopsTitle}>🗺️ Puntos de ruta:</Text>
                          {isExpanded ? (
                            // Mostrar todas las coordenadas
                            item.coordinates.map((coord, index) => (
                              <Text key={index} style={styles.stopText}>
                                • Punto {index + 1}: {coord[1]?.toFixed(4)}, {coord[0]?.toFixed(4)}
                              </Text>
                            ))
                          ) : (
                            // Mostrar solo inicio y final
                            <>
                              <Text style={styles.stopText}>
                                • Inicio: {item.coordinates[0] ? `${item.coordinates[0][1]?.toFixed(4)}, ${item.coordinates[0][0]?.toFixed(4)}` : 'No disponible'}
                              </Text>
                              {item.coordinates.length > 1 && (
                                <Text style={styles.stopText}>
                                  • Final: {item.coordinates[item.coordinates.length - 1] ? `${item.coordinates[item.coordinates.length - 1][1]?.toFixed(4)}, ${item.coordinates[item.coordinates.length - 1][0]?.toFixed(4)}` : 'No disponible'}
                                </Text>
                              )}
                              {item.coordinates.length > 2 && (
                                <Text style={styles.moreStops}>
                                  {item.coordinates.length - 2} puntos intermedios
                                </Text>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>
              </View>
              
              {/* Botones de acción */}
              <View style={styles.actions}>
                {/* Botón para expandir/colapsar */}
                {((hasDetailedPoints && item.points.length > 3) || (hasStops && item.stops.length > 3) || (!hasDetailedPoints && !hasStops && hasCoordinates && item.coordinates.length > 2)) && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.expandBtn]} 
                    onPress={() => toggleRouteExpansion(item.id)}
                  >
                    <Ionicons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={18} 
                      color="#666" 
                    />
                    <Text style={[styles.actionText, { color: '#666' }]}>
                      {isExpanded ? ' Ocultar' : ' Ver todos'}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Botón para ver en mapa */}
                <TouchableOpacity style={styles.actionBtn} onPress={() => openOnMap(item)}>
                  <Ionicons name="map-outline" size={18} color="#fff" />
                  <Text style={styles.actionText}> Ver en mapa</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  loginButtonText: {
    color: '#1976D2',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  item: { 
    backgroundColor: '#fafafa', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#eee',
    marginHorizontal: 12
  },
  searchResultItem: {
    borderColor: '#1976D2',
    borderWidth: 2,
    backgroundColor: '#f8f9ff',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  swatch: { width: 32, height: 32, borderRadius: 8, marginRight: 12, marginTop: 2 },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  sub: { color: '#666', marginTop: 4, fontSize: 14 },
  stopsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  stopsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  stopText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
    paddingLeft: 8,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stopInfo: {
    flex: 1,
  },
  stopText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    marginBottom: 2,
    paddingLeft: 8,
  },
  streetText: {
    fontSize: 12,
    color: '#666',
    paddingLeft: 8,
    marginBottom: 4,
  },
  matchIcon: {
    marginLeft: 8,
  },
  matchIndicator: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  moreStops: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    paddingLeft: 8,
    marginTop: 2,
  },
  actions: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1976D2', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8,
    marginBottom: 4
  },
  expandBtn: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  
  // Estilos para estado vacío de búsqueda
  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptySearchText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySearchHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default PublicRoutesScreen;
