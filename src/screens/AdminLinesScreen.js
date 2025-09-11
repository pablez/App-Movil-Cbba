import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { ROUTE_150_DATA, ROUTE_230_DATA, ROUTE_INFO } from '../data/routes';
import { db, auth } from '../config/firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';

const extractCoordinatesFromGeo = (geo) => {
  try {
    return geo.features && geo.features[0] && geo.features[0].geometry && geo.features[0].geometry.coordinates
      ? geo.features[0].geometry.coordinates
      : [];
  } catch (e) { return []; }
};

const AdminLinesScreen = ({ navigation, route }) => {
  const isFocused = useIsFocused();
  // Rutas persistidas en Firestore
  const [persistedRoutes, setPersistedRoutes] = useState([]);

  // Líneas incorporadas en el app (constantes)
  const builtinLines = [
    {
      id: 'line150',
      name: ROUTE_INFO.line150.name,
      color: ROUTE_INFO.line150.color,
      coordinates: extractCoordinatesFromGeo(ROUTE_150_DATA)
    },
    {
      id: 'line230',
      name: ROUTE_INFO.line230.name,
      color: ROUTE_INFO.line230.color,
      coordinates: extractCoordinatesFromGeo(ROUTE_230_DATA)
    }
  ];

  // Estado para crear/editar línea
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#FF5722');
  const [points, setPoints] = useState([]); // puntos como {latitude, longitude}
  const [editingRouteId, setEditingRouteId] = useState(null);

  // Recibir puntos seleccionados desde AdminMap (vía navigation params)
  useEffect(() => {
    if (!isFocused) return;
    if (route?.params?.adminMapPoint) {
      const p = route.params.adminMapPoint;
      if (p && p.latitude && p.longitude) {
        setPoints(prev => [...prev, { latitude: p.latitude, longitude: p.longitude }]);
        Alert.alert('Punto agregado', `Lat: ${p.latitude.toFixed(6)}, Lng: ${p.longitude.toFixed(6)}`);
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
              createdAt: serverTimestamp()
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

  const saveLine = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Ingresa un nombre para la línea'); return; }
    if (!points || points.length < 2) { Alert.alert('Error', 'Selecciona al menos 2 puntos en el mapa'); return; }

  // Convertir puntos a formato [lng, lat] para guardado y para AdminMap (addTransportRoute espera [lng,lat])
  const coordsPairs = points.map(p => [p.longitude, p.latitude]);

    try {
      // Firestore no acepta arrays anidados (ej. [[lng,lat],...]) — guardamos como objetos {lng, lat}
      // coordsPairs están en [lng, lng], por lo que mapeamos directamente
      const coordsObjects = coordsPairs.map(c => ({ lng: c[0], lat: c[1] }));

      // Construir payload base
      const payloadBase = {
        name,
        color,
        coordinates: coordsObjects
      };

      if (editingRouteId) {
        // Actualizar documento existente
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
        const ref = await addDoc(collection(db, 'routes'), newPayload);
        console.log('Ruta guardada en Firestore:', ref.id);
      }

      // Mostrar en el mapa usando pares [lng, lat]
      navigation.navigate('AdminMap', { customRoute: { coordinates: coordsPairs, color, name } });

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

  const renderLine = ({ item }) => (
    <View style={styles.lineItem}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.colorBox, { backgroundColor: item.color }]} />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.lineName}>{item.name}</Text>
          <Text style={styles.lineMeta}>{item.coordinates.length} puntos</Text>
        </View>
      </View>
      <View style={styles.lineActions}>
        <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#FFA000' }]} onPress={() => {
          // Abrir la pantalla dedicada de edición para mover/añadir puntos.
          const coords = convertCoordsToPairs(item.coordinates);
          navigation.navigate('EditMap', { editMode: true, editableRoute: { id: item.id, coordinates: coords, name: item.name, color: item.color }, returnTo: 'AdminLines' });
        }}>
          <Text style={styles.smallButtonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.smallButton} onPress={() => {
          const coords = convertCoordsToPairs(item.coordinates);
          navigation.navigate('AdminMap', { customRoute: { coordinates: coords, color: item.color, name: item.name } });
        }}>
          <Text style={styles.smallButtonText}>Mostrar</Text>
        </TouchableOpacity>
        {/* Mostrar botón eliminar solo si la ruta viene de Firestore (persisted) */}
        {persistedRoutes.find(r => r.id === item.id) ? (
          <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#F44336' }]} onPress={() => deleteLine(item.id)}>
            <Text style={styles.smallButtonText}>Eliminar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Administrar Líneas</Text>

      {!editing ? (
        <View style={{ paddingHorizontal: 12 }}>
          <TouchableOpacity style={styles.createButton} onPress={() => setEditing(true)}>
            <Text style={styles.createButtonText}>+ Crear Línea</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.createButton, { backgroundColor: '#00796B', marginTop: 8 }]} onPress={populateDefaultRoutes}>
            <Text style={styles.createButtonText}>+ Cargar rutas por defecto</Text>
          </TouchableOpacity>

          <FlatList
            data={[...persistedRoutes, ...builtinLines]}
            keyExtractor={i => i.id}
            renderItem={renderLine}
            style={{ marginTop: 12 }}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput placeholder="Nombre de la línea" style={styles.input} value={name} onChangeText={setName} />
          <TextInput placeholder="Color (hex)" style={styles.input} value={color} onChangeText={setColor} />

          <Text style={styles.sub}>Puntos seleccionados: {points.length}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.mapButton} onPress={startMapSelection}>
              <Text style={styles.mapButtonText}>Seleccionar en mapa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mapButton, { backgroundColor: '#9E9E9E' }]} onPress={() => setPoints([])}>
              <Text style={styles.mapButtonText}>Limpiar puntos</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 12 }}>
            <TouchableOpacity style={styles.saveButton} onPress={saveLine}>
              <Text style={styles.saveButtonText}>Guardar Línea y Mostrar en Mapa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#BDBDBD', marginTop: 8 }]} onPress={() => { setEditing(false); setPoints([]); setEditingRouteId(null); setName(''); setColor('#FF5722'); }}>
              <Text style={styles.saveButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: 12 },
  title: { fontSize: 20, fontWeight: '700', paddingHorizontal: 12, marginBottom: 8 },
  createButton: { backgroundColor: '#1976D2', padding: 12, borderRadius: 10, alignItems: 'center' },
  createButtonText: { color: '#fff', fontWeight: '700' },
  lineItem: { backgroundColor: '#fff', marginVertical: 8, marginHorizontal: 2, padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  colorBox: { width: 18, height: 18, borderRadius: 4 },
  lineName: { fontWeight: '700', fontSize: 16 },
  lineMeta: { color: '#666', fontSize: 12 },
  lineActions: { flexDirection: 'row', gap: 8 },
  smallButton: { backgroundColor: '#1976D2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  smallButtonText: { color: '#fff', fontWeight: '600' },
  form: { paddingHorizontal: 12 },
  input: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#e9ecef' },
  sub: { marginTop: 8, color: '#666', fontSize: 13 },
  mapButton: { backgroundColor: '#FF5722', padding: 10, borderRadius: 8, marginTop: 8 },
  mapButtonText: { color: '#fff', fontWeight: '700' },
  saveButton: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 10, marginTop: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '700' }
});

export default AdminLinesScreen;
