import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Platform, StatusBar, Modal, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useIsFocused } from '@react-navigation/native';
import { ROUTE_150_DATA, ROUTE_230_DATA, ROUTE_INFO } from '../data/routes';
import { db, auth } from '../config/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, deleteDoc, doc, getDoc, updateDoc, getDocs } from 'firebase/firestore';

const extractCoordinatesFromGeo = (geo) => {
  try {
    return geo.features && geo.features[0] && geo.features[0].geometry && geo.features[0].geometry.coordinates
      ? geo.features[0].geometry.coordinates
      : [];
  } catch (e) { return []; }
};

const AdminLinesScreen = ({ navigation, route }) => {
  const isFocused = useIsFocused();
  // Opciones rápidas de color para las rutas
  const COLOR_OPTIONS = ['#1976D2', '#FF5722', '#9C27B0', '#4CAF50', '#FFC107', '#E91E63', '#607D8B', '#00BCD4'];
  // Rutas persistidas en Firestore
  const [persistedRoutes, setPersistedRoutes] = useState([]);


  // Estado para crear/editar línea
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#FF5722');
  const [points, setPoints] = useState([]); // puntos como {latitude, longitude}
  const [editingRouteId, setEditingRouteId] = useState(null);
  // Modal para pedir metadata del punto seleccionado
  const [showPointModal, setShowPointModal] = useState(false);
  const [pendingPoint, setPendingPoint] = useState(null);
  const [pointStreet, setPointStreet] = useState('');
  const [pointName, setPointName] = useState('');
  const [editingPointIndex, setEditingPointIndex] = useState(null);
  // Modal para mostrar detalles de la ruta
  const [showRouteDetailsModal, setShowRouteDetailsModal] = useState(false);
  const [selectedRouteForDetails, setSelectedRouteForDetails] = useState(null);
  // Modal de color personalizado
  const [showColorModal, setShowColorModal] = useState(false);
  const [customR, setCustomR] = useState('255');
  const [customG, setCustomG] = useState('87');
  const [customB, setCustomB] = useState('34');
  // Helpers para paleta
  const clampByte = (v) => Math.max(0, Math.min(255, Number(v) || 0));
  const incColor = (which, delta) => {
    if (which === 'r') setCustomR(String(clampByte(Number(customR || 0) + delta)));
    if (which === 'g') setCustomG(String(clampByte(Number(customG || 0) + delta)));
    if (which === 'b') setCustomB(String(clampByte(Number(customB || 0) + delta)));
  };
  const previewR = clampByte(customR);
  const previewG = clampByte(customG);
  const previewB = clampByte(customB);
  const previewHex = `#${((1<<24) + (previewR<<16) + (previewG<<8) + previewB).toString(16).slice(1).toUpperCase()}`;

  // Recibir puntos seleccionados desde AdminMap (vía navigation params)
  useEffect(() => {
    if (!isFocused) return;
    if (route?.params?.adminMapPoint) {
      const p = route.params.adminMapPoint;
      if (p && p.latitude && p.longitude) {
        // Abrir modal para pedir nombre de calle/avenida y nombre del punto
          setPendingPoint(p);
          setPointStreet('');
          setPointName('');
          setEditingPointIndex(null); // nuevo punto, no edición de lista
          setShowPointModal(true);
      }
      // Limpiar el param para no re-procesar
      navigation.setParams({ adminMapPoint: null });
    }
    // Si venimos del mapa con una ruta editada (guardar)
    if (route?.params?.adminEditedRoute) {
      const edited = route.params.adminEditedRoute; // { id, coordinates: [[lng,lat],...], name, color }
      if (edited && edited.coordinates) {
        const pts = edited.coordinates.map(c => ({ latitude: c[1], longitude: c[0] }));
        setName(edited.name || '');
        setColor(edited.color || '#FF5722');
        setPoints(pts);
        setEditingRouteId(edited.id || null);
        setEditing(true);
        Alert.alert('Edición', 'Ruta cargada desde el mapa para continuar la edición');
      }
      navigation.setParams({ adminEditedRoute: null });
    }
  }, [isFocused, route?.params]);

  // Suscribirse a coleccion 'routes' en Firestore para cargar rutas guardadas
  useEffect(() => {
    const q = query(collection(db, 'routes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPersistedRoutes(docs);
    }, (err) => {
      console.error('Error subscribing to routes collection', err);
    });
    return () => unsub();
  }, []);

  const startMapSelection = () => {
    // Navegar al mapa en modo edición. AdminMap enviará puntos seleccionados de vuelta.
    navigation.navigate('AdminMap', { editMode: true, returnTo: 'AdminLines' });
  };

  const savePendingPoint = () => {
    if (!pendingPoint) return setShowPointModal(false);
    const p = { latitude: pendingPoint.latitude, longitude: pendingPoint.longitude, street: (pointStreet || '').trim(), name: (pointName || '').trim() };
    if (editingPointIndex !== null && editingPointIndex >= 0) {
      // actualizar punto existente
      setPoints(prev => prev.map((pt, i) => (i === editingPointIndex ? p : pt)));
      Alert.alert('Punto actualizado', `Lat: ${p.latitude.toFixed(6)}, Lng: ${p.longitude.toFixed(6)}\n${p.street ? 'Calle: ' + p.street : ''}${p.name ? '\nNombre: ' + p.name : ''}`);
    } else {
      // nuevo punto
      setPoints(prev => [...prev, p]);
      Alert.alert('Punto agregado', `Lat: ${p.latitude.toFixed(6)}, Lng: ${p.longitude.toFixed(6)}\n${p.street ? 'Calle: ' + p.street : ''}${p.name ? '\nNombre: ' + p.name : ''}`);
    }
    setShowPointModal(false);
    setPendingPoint(null);
    setEditingPointIndex(null);
  };

  const cancelPendingPoint = () => {
    setShowPointModal(false);
    setPendingPoint(null);
    setEditingPointIndex(null);
  };

  const openEditPoint = (index) => {
    const pt = points[index];
    if (!pt) return;
    setPendingPoint({ latitude: pt.latitude, longitude: pt.longitude });
    setPointStreet(pt.street || '');
    setPointName(pt.name || '');
    setEditingPointIndex(index);
    setShowPointModal(true);
  };

  const openPointOnMap = () => {
    if (!pendingPoint) return;
    // Enviar como customRoute para que AdminMap muestre/centre el punto
    const coordsPairs = [[pendingPoint.longitude, pendingPoint.latitude]];
    setShowPointModal(false);
    // Abrir en la pantalla de edición (EditMap) para ver/centrear el punto
    navigation.navigate('EditMap', { customRoute: { coordinates: coordsPairs, color: color || '#FF5722', name: pointName || 'Punto' }, returnTo: 'AdminLines' });
  };

  const populateDefaultRoutes = async () => {
    // Confirmar acción
    Alert.alert('Cargar rutas', '¿Deseas cargar las rutas por defecto (150 y 230) en Firestore? Esto solo añadirá las que no existan.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cargar', onPress: async () => {
        try {
          const userId = auth && auth.currentUser ? auth.currentUser.uid : null;
          if (!userId) {
            Alert.alert('Error', 'No hay usuario autenticado en Firebase. Inicia sesión y vuelve a intentar.');
            return;
          }

          const defaults = [
            { name: ROUTE_INFO.line150.name, color: ROUTE_INFO.line150.color, coordinates: extractCoordinatesFromGeo(ROUTE_150_DATA) },
            { name: ROUTE_INFO.line230.name, color: ROUTE_INFO.line230.color, coordinates: extractCoordinatesFromGeo(ROUTE_230_DATA) }
          ];

          let added = 0;

          // Verificar documento users/{uid} localmente para diagnosticar permisos
          try {
            const userDocRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userDocRef);
            if (!userSnap.exists()) {
              console.warn('Usuario admin no encontrado en Firestore users/{uid}');
              Alert.alert('Advertencia', 'Documento de usuario admin no encontrado en Firestore (users/{uid}). Revisa que exista.');
              // continuar y dejar que las reglas fallen si corresponde
            } else {
              const ud = userSnap.data();
              console.log('users/{uid} doc:', ud);
              if (!ud.role || (ud.role || '').toLowerCase() !== 'admin') {
                console.warn('El usuario autenticado no tiene role admin en su doc:', ud.role);
                Alert.alert('Advertencia', `El documento users/${userId} no indica role 'admin' (role: ${ud.role}). Las reglas podrían denegar escrituras.`);
              }
            }
          } catch (errUser) {
            console.error('Error leyendo users/{uid} antes de insertar rutas:', errUser);
          }
          for (const r of defaults) {
            // Evitar duplicados por nombre
            const exists = persistedRoutes.find(pr => (pr.name || '').toLowerCase() === (r.name || '').toLowerCase());
            if (exists) continue;

            // Firestore no permite arrays anidados. Convertimos [lng,lat] -> { lng, lat }
            const coords = (r.coordinates || []).map(c => ({ lng: c[0], lat: c[1] }));

            const payload = {
              name: r.name,
              color: r.color || '#607D8B',
              coordinates: coords,
              createdBy: userId,
              createdAt: serverTimestamp(),
              public: true // Marcar rutas por defecto como públicas
            };
            await addDoc(collection(db, 'routes'), payload);
            added += 1;
          }

          Alert.alert('Rutas cargadas', `${added} rutas añadidas a Firestore.`);
        } catch (err) {
          console.error('Error cargando rutas por defecto:', err);
          Alert.alert('Error', 'No se pudieron cargar las rutas: ' + (err.message || err.toString()));
        }
      } }
    ]);
  };

  const markAllRoutesAsPublic = async () => {
    Alert.alert(
      'Marcar rutas como públicas',
      '¿Deseas marcar TODAS las rutas existentes como públicas? Esto añadirá el campo "public: true" a todas las rutas que no lo tengan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Marcar todas', onPress: async () => {
          try {
            const userId = auth && auth.currentUser ? auth.currentUser.uid : null;
            if (!userId) {
              Alert.alert('Error', 'No hay usuario autenticado en Firebase.');
              return;
            }

            // Obtener todas las rutas
            const q = query(collection(db, 'routes'));
            const snap = await getDocs(q);
            const allRoutes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            let updated = 0;
            
            for (const route of allRoutes) {
              // Solo actualizar si no tiene el campo 'public' o si es false
              if (!route.hasOwnProperty('public') || route.public !== true) {
                await updateDoc(doc(db, 'routes', route.id), {
                  public: true,
                  updatedBy: userId,
                  updatedAt: serverTimestamp()
                });
                updated++;
              }
            }

            Alert.alert(
              'Actualización completada',
              `${updated} rutas marcadas como públicas de ${allRoutes.length} rutas totales.`
            );
          } catch (err) {
            console.error('Error marcando rutas como públicas:', err);
            Alert.alert('Error', 'No se pudieron marcar las rutas como públicas: ' + (err.message || err.toString()));
          }
        }}
      ]
    );
  };

  const saveLine = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Ingresa un nombre para la línea'); return; }
    if (!points || points.length < 2) { Alert.alert('Error', 'Selecciona al menos 2 puntos en el mapa'); return; }

  // Convertir puntos a formato [lng, lat] para guardado y para AdminMap (addTransportRoute espera [lng,lat])
  const coordsPairs = points.map(p => [p.longitude, p.latitude]);

    try {
      // Firestore no acepta arrays anidados (ej. [[lng,lat],...]) — guardamos como objetos {lng, lat}
      // coordsPairs están en [lng, lng], por lo que mapeamos directamente
      const coordsObjects = coordsPairs.map(c => ({ lng: c[0], lat: c[1] }));

      // Preparar información completa de los puntos con metadatos
      const pointsWithMetadata = points.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        street: p.street || '', // Calle o avenida
        name: p.name || '', // Nombre del punto
        // Mantener compatibilidad con formato [lng, lat]
        coordinates: [p.longitude, p.latitude]
      }));

      // Construir payload base
      const payloadBase = {
        name,
        color,
        coordinates: coordsObjects, // Formato compatible con el sistema existente
        points: pointsWithMetadata, // Nueva información completa de puntos
        totalPoints: points.length, // Contador de puntos
        public: true // Marcar automáticamente nuevas rutas como públicas
      };

      // Guardar/actualizar documento en Firestore
      let createdRef = null;
      if (editingRouteId) {
        const updPayload = {
          ...payloadBase,
          updatedBy: auth.currentUser ? auth.currentUser.uid : null,
          updatedAt: serverTimestamp()
        };
        await updateDoc(doc(db, 'routes', editingRouteId), updPayload);
        console.log('Ruta actualizada en Firestore:', editingRouteId);
      } else {
        const newPayload = {
          ...payloadBase,
          createdBy: auth.currentUser ? auth.currentUser.uid : null,
          createdAt: serverTimestamp()
        };
        createdRef = await addDoc(collection(db, 'routes'), newPayload);
        console.log('Ruta guardada en Firestore:', createdRef.id);
      }

      // Navegar a la pantalla de edición `EditMap` con la ruta recién guardada/actualizada
      const savedRouteId = editingRouteId || (createdRef ? createdRef.id : null);
      if (savedRouteId) {
        // Pasar metadata completa de puntos para que EditMap tenga calles/nombres
        navigation.navigate('EditMap', { editMode: true, editableRoute: { id: savedRouteId, coordinates: coordsPairs, name, color, points: pointsWithMetadata }, returnTo: 'AdminLines' });
      } else {
        // Fallback: si por alguna razón no tenemos id, mostrar en AdminMap
        navigation.navigate('AdminMap', { customRoute: { coordinates: coordsPairs, color, name } });
      }

      // Reset formulario
      setEditing(false);
      setEditingRouteId(null);
      setName('');
      setColor('#FF5722');
      setPoints([]);
    } catch (err) {
      console.error('Error guardando ruta:', err);
      Alert.alert('Error', 'No se pudo guardar la ruta: ' + err.message);
    }
  };

  const deleteLine = (id) => {
    Alert.alert('Confirmar', '¿Eliminar esta línea?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          // Si es una ruta persistida en Firestore
          const existsPersisted = persistedRoutes.find(r => r.id === id);
          if (existsPersisted) {
            await deleteDoc(doc(db, 'routes', id));
            return;
          }
          // Si no es persistida (builtin), no permitir borrado
          Alert.alert('No permitido', 'No se puede eliminar una ruta integrada');
        } catch (err) {
          console.error('Error eliminando ruta:', err);
          Alert.alert('Error', 'No se pudo eliminar la ruta: ' + err.message);
        }
      } }
    ]);
  };

  const convertCoordsToPairs = (coords) => {
    if (!coords) return [];
    // already [lng,lat] pairs?
    if (Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0])) return coords;
    // convert {lng,lat} objects to [lng,lat]
    return coords.map(c => [c.lng, c.lat]);
  };

  const renderLine = ({ item }) => {
    // Mostrar información más detallada si está disponible
    const pointsInfo = item.points ? `${item.points.length} puntos con detalles` : `${item.coordinates.length} puntos`;
    const hasDetailedPoints = item.points && item.points.some(p => p.street || p.name);
    
    return (
      <View style={styles.lineItem}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[styles.colorBox, { backgroundColor: item.color }]} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.lineName}>{item.name}</Text>
            <Text style={styles.lineMeta}>{pointsInfo}</Text>
            {hasDetailedPoints && (
              <Text style={[styles.lineMeta, { color: '#4CAF50', fontSize: 11 }]}>
                ✓ Con información de calles y nombres
              </Text>
            )}
          </View>
        </View>
        <View style={styles.lineActions}>
          <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#FFA000' }]} onPress={() => {
            // Abrir la pantalla dedicada de edición para mover/añadir puntos.
            const coords = convertCoordsToPairs(item.coordinates);
            // Si el item ya contiene metadata de puntos, pásala para preservar street/name
            const pointsMeta = item.points && item.points.length > 0 ? item.points.map(p => ({ latitude: p.latitude, longitude: p.longitude, street: p.street || '', name: p.name || '' })) : undefined;
            navigation.navigate('EditMap', { editMode: true, editableRoute: { id: item.id, coordinates: coords, name: item.name, color: item.color, points: pointsMeta }, returnTo: 'AdminLines' });
          }}>
            <Text style={styles.smallButtonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallButton} onPress={() => {
            const coords = convertCoordsToPairs(item.coordinates);
            navigation.navigate('AdminMap', { customRoute: { coordinates: coords, color: item.color, name: item.name } });
          }}>
            <Text style={styles.smallButtonText}>Mostrar</Text>
          </TouchableOpacity>
          
          {/* Botón para ver detalles si tiene información de puntos */}
          {hasDetailedPoints && (
            <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#9C27B0' }]} onPress={() => {
              setSelectedRouteForDetails(item);
              setShowRouteDetailsModal(true);
            }}>
              <Text style={styles.smallButtonText}>Detalles</Text>
            </TouchableOpacity>
          )}
          
          {/* Mostrar botón eliminar solo si la ruta viene de Firestore (persisted) */}
          {persistedRoutes.find(r => r.id === item.id) ? (
            <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#F44336' }]} onPress={() => deleteLine(item.id)}>
              <Text style={styles.smallButtonText}>Eliminar</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  // Calcular offset superior para evitar solapamiento con la barra de notificación / notch
  const topOffset = Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 20) : 44;

  const containerPaddingTop = Math.max(12, topOffset + 8);

  return (
    <View style={[styles.container, { paddingTop: containerPaddingTop }]}>
      {/* Botón flotante superior izquierdo para abrir el drawer */}
      <TouchableOpacity
        style={[styles.floatingButton, { top: topOffset }]}
        onPress={() => navigation.openDrawer && navigation.openDrawer()}
        accessibilityLabel="Abrir menú"
        accessibilityHint="Abre el drawer de navegación"
        activeOpacity={0.8}
      >
        <Ionicons name="menu" size={25} color="#fff" />
      </TouchableOpacity>
      <View style={styles.headerRow}>
        <View style={styles.headerCenter}>
          <Ionicons name="bus" size={28} color="#1976D2" />
          <View style={{ marginLeft: 12, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Administrar Líneas</Text>
            <Text style={styles.headerSubtitle}>Crea, edita y muestra las rutas del sistema</Text>
          </View>
        </View>
      </View>

      {/* Modal para pedir metadata del punto seleccionado en el mapa */}
      <Modal visible={showPointModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Agregar punto</Text>
            <Text style={styles.modalLabel}>Calle o Avenida</Text>
            <TextInput value={pointStreet} onChangeText={setPointStreet} placeholder="Ej: Av. Bolivia" style={styles.input} />
            <Text style={styles.modalLabel}>Nombre del punto</Text>
            <TextInput value={pointName} onChangeText={setPointName} placeholder="Ej: Parada Central" style={styles.input} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 8 }}>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#BDBDBD', flex: 1 }]} onPress={cancelPendingPoint}><Text style={styles.saveButtonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#2196F3', flex: 1 }]} onPress={openPointOnMap}><Text style={styles.saveButtonText}>Ver en mapa</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { flex: 1 }]} onPress={savePendingPoint}><Text style={styles.saveButtonText}>Guardar Punto</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {!editing ? (
        <View style={{ flex: 1, paddingHorizontal: 12, marginTop: 8 }}>
          <TouchableOpacity style={styles.createButton} onPress={() => setEditing(true)}>
            <Text style={styles.createButtonText}>+ Crear Línea</Text>
          </TouchableOpacity>
          
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[styles.utilityButton, { backgroundColor: '#FF9800' }]} onPress={populateDefaultRoutes}>
              <Text style={styles.utilityButtonText}>Cargar rutas por defecto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.utilityButton, { backgroundColor: '#4CAF50' }]} onPress={markAllRoutesAsPublic}>
              <Text style={styles.utilityButtonText}>Marcar todas como públicas</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={[...persistedRoutes]}
            keyExtractor={i => i.id}
            renderItem={renderLine}
            style={{ marginTop: 12, flex: 1 }}
            contentContainerStyle={{ paddingBottom: 140 }}
          />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.form}>
              <TextInput placeholder="Nombre de la línea" style={styles.input} value={name} onChangeText={setName} />
              <Text style={styles.sub}>Seleccionar color</Text>
              <View style={styles.swatchesRow}>
                {COLOR_OPTIONS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.swatch, { backgroundColor: c, borderColor: color === c ? '#fff' : 'transparent', borderWidth: color === c ? 2 : 0 }]}
                    onPress={() => setColor(c)}
                    activeOpacity={0.8}
                  >
                    {color === c && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.customSwatch]} onPress={() => setShowColorModal(true)}>
                  <Text style={{ color: '#1976D2', fontWeight: '700' }}>＋</Text>
                </TouchableOpacity>
              </View>

              <TextInput placeholder="Color (hex)" style={styles.input} value={color} onChangeText={setColor} />

              {/* Modal de paleta personalizada */}
              <Modal visible={showColorModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                  <View style={[styles.modalContainer, { width: '90%' }] }>
                    <Text style={styles.modalTitle}>Color personalizado (RGB)</Text>
                    <View style={{ marginTop: 8 }}>
                      {['r','g','b'].map((ch) => {
                        const label = ch.toUpperCase();
                        const val = ch === 'r' ? customR : ch === 'g' ? customG : customB;
                        const tint = label === 'R' ? '#f44336' : label === 'G' ? '#4CAF50' : '#2196F3';
                        return (
                          <View key={ch} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ width: 28, fontWeight: '700' }}>{label}</Text>
                            <Slider
                              style={{ flex: 1, marginHorizontal: 8 }}
                              minimumValue={0}
                              maximumValue={255}
                              step={1}
                              minimumTrackTintColor={tint}
                              maximumTrackTintColor="#e0e0e0"
                              value={Number(val) || 0}
                              onValueChange={(v) => {
                                const s = String(Math.round(v));
                                if (ch === 'r') setCustomR(s);
                                if (ch === 'g') setCustomG(s);
                                if (ch === 'b') setCustomB(s);
                              }}
                            />
                            <TextInput
                              keyboardType="numeric"
                              value={val}
                              onChangeText={t => { const v = t.replace(/[^0-9]/g,''); if (ch === 'r') setCustomR(v); if (ch === 'g') setCustomG(v); if (ch === 'b') setCustomB(v); }}
                              placeholder={label}
                              style={{ width: 64, marginLeft: 8, backgroundColor: '#fff', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0', textAlign: 'center' }}
                            />
                          </View>
                        );
                      })}

                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: `rgb(${previewR}, ${previewG}, ${previewB})`, borderWidth: 1, borderColor: '#e0e0e0' }} />
                          <View>
                            <Text style={{ fontWeight: '800', fontSize: 16 }}>{previewHex}</Text>
                            <Text style={{ color: '#666', marginTop: 6 }}>Ejemplo:</Text>
                            <View style={{ marginTop: 6, padding: 6, backgroundColor: previewHex, borderRadius: 6 }}>
                              <Text style={{ color: previewR*0.299 + previewG*0.587 + previewB*0.114 > 186 ? '#000' : '#fff', fontWeight: '700' }}>Texto de muestra</Text>
                            </View>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#BDBDBD' }]} onPress={() => setShowColorModal(false)}><Text style={styles.saveButtonText}>Cancelar</Text></TouchableOpacity>
                          <TouchableOpacity style={[styles.saveButton, { marginLeft: 8 }]} onPress={() => {
                            const r = clampByte(customR);
                            const g = clampByte(customG);
                            const b = clampByte(customB);
                            setColor(previewHex);
                            setShowColorModal(false);
                          }}><Text style={styles.saveButtonText}>Aplicar</Text></TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </Modal>

              <Text style={styles.sub}>Puntos seleccionados: {points.length}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.mapButton} onPress={startMapSelection}>
                  <Text style={styles.mapButtonText}>Seleccionar en mapa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mapButton, { backgroundColor: '#9E9E9E' }]} onPress={() => setPoints([])}>
                  <Text style={styles.mapButtonText}>Limpiar puntos</Text>
                </TouchableOpacity>
              </View>

              {/* Lista de puntos con metadatos */}
              {points && points.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  {points.map((pt, idx) => (
                    <View key={`${pt.latitude}_${pt.longitude}_${idx}`} style={styles.pointItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700' }}>{pt.name || 'Sin nombre'}</Text>
                        <Text style={{ color: '#666', fontSize: 12 }}>{pt.street || 'Sin calle/avenida'}</Text>
                        <Text style={{ color: '#999', fontSize: 11 }}>{pt.latitude.toFixed(6)}, {pt.longitude.toFixed(6)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#FFA000' }]} onPress={() => openEditPoint(idx)}>
                          <Text style={styles.smallButtonText}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#F44336' }]} onPress={() => setPoints(prev => prev.filter((_, i) => i !== idx))}>
                          <Text style={styles.smallButtonText}>Eliminar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ marginTop: 12, marginBottom: 30 }}>
                <TouchableOpacity style={styles.saveButton} onPress={saveLine}>
                  <Text style={styles.saveButtonText}>Guardar Línea y Mostrar en Mapa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#BDBDBD', marginTop: 8 }]} onPress={() => { setEditing(false); setPoints([]); setEditingRouteId(null); setName(''); setColor('#FF5722'); }}>
                  <Text style={styles.saveButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Modal de detalles de ruta */}
      <Modal visible={showRouteDetailsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>
              Detalles de la ruta: {selectedRouteForDetails?.name}
            </Text>
            
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={true}>
              {selectedRouteForDetails?.points && selectedRouteForDetails.points.length > 0 ? (
                <>
                  <Text style={[styles.modalLabel, { marginBottom: 10, fontSize: 14, fontWeight: '600' }]}>
                    Puntos de la ruta ({selectedRouteForDetails.points.length})
                  </Text>
                  {selectedRouteForDetails.points.map((point, index) => (
                    <View key={index} style={[styles.pointItem, { marginBottom: 8 }]}>
                      <View style={[styles.smallCircle, { backgroundColor: selectedRouteForDetails.color || '#1976D2' }]}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={{ fontWeight: '600', fontSize: 14 }}>
                          {point.name || `Punto ${index + 1}`}
                        </Text>
                        <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                          {point.street || 'Calle no especificada'}
                        </Text>
                        <Text style={{ color: '#888', fontSize: 10, marginTop: 1 }}>
                          Lat: {point.latitude?.toFixed(5)}, Lng: {point.longitude?.toFixed(5)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <Text style={{ color: '#666', fontSize: 14 }}>
                    Esta ruta no tiene información detallada de puntos
                  </Text>
                  <Text style={{ color: '#999', fontSize: 12, marginTop: 5 }}>
                    Solo contiene coordenadas básicas ({selectedRouteForDetails?.coordinates?.length || 0} puntos)
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <View style={{ marginTop: 15 }}>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: '#1976D2' }]} 
                onPress={() => setShowRouteDetailsModal(false)}
              >
                <Text style={styles.saveButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: 12 },
  floatingButton: {
    position: 'absolute',
    left: 12,
    top: 12,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 1000,
  },
  title: { fontSize: 20, fontWeight: '700', paddingHorizontal: 12, marginBottom: 8 },
  headerRow: { paddingHorizontal: 12, paddingVertical: 6 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1b2565' },
  headerSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  swatchesRow: { flexDirection: 'row', marginTop: 8, marginBottom: 8, flexWrap: 'wrap' },
  swatch: { width: 36, height: 36, borderRadius: 18, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  customSwatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#1976D2', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalLabel: { fontSize: 13, color: '#666', marginTop: 8 },
  pointItem: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  smallCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  createButton: { backgroundColor: '#1976D2', padding: 12, borderRadius: 10, alignItems: 'center' },
  createButtonText: { color: '#fff', fontWeight: '700' },
  utilityButton: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  utilityButtonText: { color: '#fff', fontWeight: '600', fontSize: 12, textAlign: 'center' },
  lineItem: { backgroundColor: '#fff', marginVertical: 8, marginHorizontal: 2, padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  colorBox: { width: 18, height: 18, borderRadius: 4 },
  lineName: { fontWeight: '700', fontSize: 16 },
  lineMeta: { color: '#666', fontSize: 12 },
  lineActions: { flexDirection: 'row', gap: 8 },
  smallButton: { backgroundColor: '#1976D2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  smallButtonText: { color: '#fff', fontWeight: '600' },
  form: { paddingHorizontal: 12 },
  formScroll: { paddingHorizontal: 12, paddingTop: 12 },
  input: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#e9ecef' },
  sub: { marginTop: 8, color: '#666', fontSize: 13 },
  mapButton: { backgroundColor: '#FF5722', padding: 10, borderRadius: 8, marginTop: 8 },
  mapButtonText: { color: '#fff', fontWeight: '700' },
  saveButton: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 10, marginTop: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '700' }
});

export default AdminLinesScreen;
