import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ScrollView, Platform, StatusBar, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../config/firebase';
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { uploadUserImages } from '../utils/imageUpload';
import { USER_ROLES } from '../utils/constants';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

const EditProfileScreen = ({ navigation }) => {
  const { user, logout, userRole, isAdmin, refreshUser } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [showReauth, setShowReauth] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);

  const navigateToRootForRole = useCallback(() => {
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (isAdmin) {
      try {
        const { CommonActions } = require('@react-navigation/native');
        if (navigation && navigation.dispatch) {
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'AdminDashboard' }] }));
          return;
        }
      } catch (e) {
        // ignore
      }
      navigation.navigate('AdminMap');
      return;
    }
    if (userRole === USER_ROLES.PASSENGER) return navigation.navigate('PassengerMain');
    if (userRole === USER_ROLES.DRIVER) return navigation.navigate('DriverMain');
    return navigation.navigate('Login');
  }, [navigation, isAdmin, userRole]);

  const onSave = useCallback(async () => {
    setLoading(true);
    try {
      const updates = {};
      // handle email
      if (email && email !== user?.email) {
        try {
          await updateEmail(auth.currentUser, email);
          try { await sendEmailVerification(auth.currentUser); } catch (e) { console.warn('sendEmailVerification failed', e); }
        } catch (e) {
          if (e?.code === 'auth/requires-recent-login') {
            setPendingEmail(email);
            setShowReauth(true);
            return;
          }
          if (e?.code === 'auth/operation-not-allowed') {
            // save as pending
            try {
              await updateDoc(doc(db, 'users', user.uid), { pendingEmail: email });
              Alert.alert('Guardado', 'Correo pendiente guardado; un administrador lo revisará.');
            } catch (updErr) {
              console.error('Error saving pendingEmail:', updErr);
              Alert.alert('Error', 'No se pudo guardar el correo pendiente.');
            }
            return;
          }
          throw e;
        }
        updates.email = email;
      }

      // password
      if (password && password.length >= 6) {
        try {
          await updatePassword(auth.currentUser, password);
        } catch (e) {
          if (e?.code === 'auth/requires-recent-login') {
            setShowReauth(true);
            return;
          }
          throw e;
        }
      }

      // collect other updates
      if (phone !== user?.phone) updates.phone = phone;

      if (Object.keys(updates).length) {
        await updateDoc(doc(db, 'users', user.uid), updates);
      }

      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (err) {
      console.error('Error updating profile:', err);
      Alert.alert('Error', err.message || String(err));
      // if session invalid -> suggest logout
      if (err?.code === 'auth/requires-recent-login') {
        Alert.alert('Reautenticación requerida', 'Vuelve a iniciar sesión para cambiar datos sensibles', [
          { text: 'OK', onPress: () => { logout(); navigateToRootForRole(); } }
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, phone, user, navigateToRootForRole, logout]);

  useEffect(() => {
    // inicializar la imagen de perfil desde user o auth
    const initial = user?.profileImage || (user?.images && user.images.profileImage) || auth.currentUser?.photoURL || null;
    setProfileImageUri(initial);
  }, [user]);
  const pickImage = useCallback(async (source = 'library') => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permiso requerido', 'Se necesita permiso para acceder a las imágenes.');

      let res;
      if (source === 'camera') {
        const camPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!camPerm.granted) return Alert.alert('Permiso requerido', 'Se necesita permiso para usar la cámara.');
        res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      } else {
        // Compatibilidad con distintas versiones de expo-image-picker:
        // algunos SDK usan ImagePicker.MediaTypeOptions.Images, otros ImagePicker.MediaType.image
        const mediaTypes = (ImagePicker.MediaTypeOptions && ImagePicker.MediaTypeOptions.Images)
          || (ImagePicker.MediaType && ImagePicker.MediaType.image)
          || ImagePicker.MediaTypeOptions?.Images;

        res = await ImagePicker.launchImageLibraryAsync({ mediaTypes, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      }
      // Normalizar respuesta: puede contener `canceled` o `cancelled`, y `assets` (nuevo) o `uri` (antiguo)
      const cancelled = res?.canceled || res?.cancelled;
      const uri = res?.assets?.[0]?.uri || res?.uri;
      if (cancelled || !uri) return;
      handleUploadProfileImage(uri);
    } catch (e) {
      console.error('pickImage error', e);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  }, [handleUploadProfileImage]);

  const handleUploadProfileImage = useCallback(async (localUri) => {
    if (!localUri) return;
    setUploadingImage(true);
    try {
      const resp = await uploadUserImages(user.uid, { profileImage: localUri }, (p) => {
        // se podría mostrar progreso si se desea
      });
      // Compatibilidad: uploadUserImages ahora devuelve { uploaded, publicIds }
      const uploaded = resp && (resp.uploaded || resp);
      const newUrl = uploaded && uploaded.profileImage ? uploaded.profileImage : null;
      if (newUrl) {
        const userRef = doc(db, 'users', user.uid);
        // Update both top-level and images map for compatibility with Register/others
        await updateDoc(userRef, { profileImage: newUrl, images: { ...(user.images || {}), profileImage: newUrl } });
        try { await updateProfile(auth.currentUser, { photoURL: newUrl }); } catch (e) { console.warn('updateProfile failed', e); }
        setProfileImageUri(newUrl);
        // refresh context so other screens see new image
        try { await refreshUser(); } catch (e) { /* ignore */ }
        Alert.alert('Éxito', 'Foto de perfil actualizada');
      } else {
        Alert.alert('Error', 'No se pudo subir la imagen.');
      }
    } catch (err) {
      console.error('upload profile image error', err);
      Alert.alert('Error', 'Error subiendo la imagen: ' + (err.message || String(err)));
    } finally {
      setUploadingImage(false);
    }
  }, [user]);

  const handleReauth = async () => {
    if (!reauthPassword) return Alert.alert('Contraseña requerida', 'Ingresa tu contraseña actual para reautenticar.');
    setReauthLoading(true);
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, reauthPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);

      // Intentar de nuevo la actualización del email si había quedado pendiente
      if (pendingEmail) {
        await updateEmail(auth.currentUser, pendingEmail);
        try { await sendEmailVerification(auth.currentUser); } catch (e) { console.warn('sendEmailVerification failed', e); }
        // Actualizar también en Firestore
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { email: pendingEmail, phone });
        Alert.alert('Éxito', 'Correo actualizado y verificación enviada.');
        setPendingEmail(null);
      }
      setShowReauth(false);
      setReauthPassword('');
    } catch (reauthErr) {
      console.error('Reauth error:', reauthErr);
      Alert.alert('Error de reautenticación', reauthErr.message || String(reauthErr));
    } finally {
      setReauthLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating pill to open drawer (75% width) */}
      <TouchableOpacity
        style={[styles.floatingPill, { top: STATUSBAR_HEIGHT + 8 }]}
        onPress={() => { try { navigation.openDrawer(); } catch (e) { console.warn('openDrawer no disponible', e); } }}
        activeOpacity={0.9}
      >
        <Ionicons name="menu" size={20} color="#fff" style={{ marginRight: 10 }} />
        <Text style={styles.floatingPillText}>Menú</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Editar perfil</Text>
          <View style={styles.avatarRow}>
            <View>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={36} color="#fff" />
                </View>
              )}
              <TouchableOpacity style={styles.editAvatarButton} onPress={() => {
                Alert.alert('Actualizar foto', 'Selecciona una opción', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Tomar foto', onPress: () => pickImage('camera') },
                  { text: 'Galería', onPress: () => pickImage('library') },
                ]);
              }}>
                {uploadingImage ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
  </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
  <View style={styles.formCard}>
        <Text style={styles.label}>Correo</Text>
        <TextInput value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Contraseña (opcional)</Text>
        <TextInput value={password} onChangeText={setPassword} style={styles.input} secureTextEntry placeholder="Dejar vacío para mantener" />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />


  <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={loading}>
          <Text style={styles.saveButtonText}>{loading ? 'Guardando...' : 'Guardar cambios'}</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* Reauth modal simple */}
      {showReauth && (
        <View style={styles.reauthOverlay}>
          <View style={styles.reauthCard}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Reautenticación requerida</Text>
            <Text style={{ marginBottom: 12 }}>Ingresa tu contraseña actual para confirmar cambios sensibles (correo/contraseña).</Text>
            <TextInput value={reauthPassword} onChangeText={setReauthPassword} style={styles.input} secureTextEntry placeholder="Contraseña actual" />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#ccc', marginRight: 8 }]} onPress={() => { setShowReauth(false); setReauthPassword(''); setPendingEmail(null); }} disabled={reauthLoading}>
                <Text style={[styles.saveButtonText, { color: '#333' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleReauth} disabled={reauthLoading}>
                <Text style={styles.saveButtonText}>{reauthLoading ? 'Procesando...' : 'Confirmar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', paddingTop: STATUSBAR_HEIGHT + 6 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  floatingPill: {
    position: 'absolute',
    left: '3%',
    right: '75%',
    height: 44,
    borderRadius: 28,
    backgroundColor: '#1976D2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 120,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingPillText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  scroll: { padding: 16 },
  formCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  label: { fontSize: 14, color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#fff', padding: 10, borderRadius: 6, marginBottom: 12 },
  saveButton: { backgroundColor: '#1976D2', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  saveButtonText: { color: '#fff', fontWeight: '700' },
  pickerContainer: { backgroundColor: '#fff', borderRadius: 6, marginBottom: 12 },
  helperText: { fontSize: 12, color: '#888', marginBottom: 8 }
  ,
  headerCenter: { flex: 1, alignItems: 'center' },
  avatarRow: { marginTop: 8 },
  avatar: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#ddd' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1976D2' },
  editAvatarButton: { position: 'absolute', right: -6, bottom: -6, width: 36, height: 36, borderRadius: 18, backgroundColor: '#1976D2', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  reauthOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  reauthCard: { backgroundColor: '#fff', padding: 16, borderRadius: 8, width: '90%' },
});

export default EditProfileScreen;
