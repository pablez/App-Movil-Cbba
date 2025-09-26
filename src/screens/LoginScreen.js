import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { isValidEmail } from '../utils/helpers';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user, logout, userRole, isAdmin } = useAuth();

  const handleLogin = async () => {
    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Intentando login con:', email);
      const result = await login(email, password);
      
      if (result.success) {
        console.log('✅ Login exitoso:', result?.user?.email);
        // NOTA: la navegación por rol la maneja `AppNavigator` a través del estado de AuthContext.
        // Se quita el reset aquí para evitar el doble-reset / flash de navegación.
      } else {
        throw new Error(result.error || 'Error de autenticación');
      }
      
    } catch (error) {
      console.error('❌ Login error:', error);
      let errorMessage = 'Error al iniciar sesión';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No existe una cuenta con este correo';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña incorrecta';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Correo electrónico inválido';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Inténtalo más tarde';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = () => {
    Alert.alert(
      'Acceso de Administrador',
      '¿Iniciar sesión como administrador?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Sí',
          onPress: () => {
            setEmail('admin@transportapp.com');
            setPassword('admin123456');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Modal moderno que avisa si ya hay sesión iniciada */}
        <Modal transparent visible={!!user} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sesión detectada</Text>
              </View>
              <View style={styles.modalBody}>
                <View style={styles.modalAvatarWrap}>
                  {user?.photoURL || user?.profileImage ? (
                    <Image source={{ uri: user.photoURL || user.profileImage }} style={styles.modalAvatar} />
                  ) : (
                    <View style={[styles.modalAvatar, styles.avatarPlaceholderSmall]}>
                      <Ionicons name="person" size={32} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={styles.modalText}>Has iniciado sesión como</Text>
                <Text style={styles.modalEmail}>{user?.email}</Text>
              </View>
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.modalButton} onPress={() => {
                  // navegar al panel según rol
                  let target = 'AdminMap';
                  if (isAdmin) target = 'AdminMap';
                  else if (userRole === 'PASSENGER') target = 'PassengerMain';
                  else if (userRole === 'DRIVER') target = 'DriverMain';
                  try {
                    const { CommonActions } = require('@react-navigation/native');
                    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: target }] }));
                  } catch (e) {
                    navigation.navigate(target);
                  }
                }}>
                  <Text style={styles.modalButtonText}>Ir al panel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, styles.modalButtonDanger]} onPress={async () => { await logout(); }}>
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Cerrar sesión</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
        {/* Botón de regreso */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1976D2" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoCircle}>
              <Ionicons name="bus" size={24} color="#fff" />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.titleMain}><Text style={{}}>Ñan</Text><Text style={styles.titleAccent}> Go</Text></Text>
              <Text style={styles.subtitle}>Cochabamba</Text>
            </View>
          </View>
          <Text style={styles.tagline}>Tu movilidad, más cerca</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { paddingRight: 48 }]}
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(s => !s)}
              accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              accessibilityHint="Alterna la visibilidad de la contraseña"
            >
              <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerLinkText}>
              ¿No tienes cuenta? Regístrate
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.guestButton}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.guestButtonText}>Continuar como invitado</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.adminLink}
            onPress={handleAdminLogin}
          >
            <Text style={styles.adminLinkText}>
              🔐 Acceso de Administrador
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 1000,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1976D2', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  titleMain: { fontSize: 28, fontWeight: '800', color: '#1b2565' },
  titleAccent: { color: '#FF5722' },
  tagline: { marginTop: 8, color: '#777', fontSize: 12, textAlign: 'center' },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E86AB',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  loggedBanner: {
    backgroundColor: '#e6f7ff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  notLoggedBanner: {
    backgroundColor: '#fff7e6',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  bannerText: { color: '#1B6EA8', fontWeight: '600' },
  bannerButton: { backgroundColor: '#1976D2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  bannerButtonText: { color: '#fff', fontWeight: '700' },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordContainer: {
    position: 'relative',
    width: '100%'
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loginButton: {
    backgroundColor: '#2E86AB',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerLinkText: {
    color: '#2E86AB',
    fontSize: 16,
  },
  guestButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1976D2'
  },
  guestButtonText: { color: '#1976D2', fontWeight: '700' },
  adminLink: {
    marginTop: 30,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F24236',
    borderRadius: 20,
    marginHorizontal: 50,
  },
  adminLinkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 6,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A73E8' },
  modalBody: { padding: 20, alignItems: 'center' },
  modalAvatarWrap: { marginBottom: 12 },
  modalAvatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#ccc' },
  avatarPlaceholderSmall: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#2E86AB' },
  modalText: { color: '#666', marginTop: 6 },
  modalEmail: { marginTop: 6, fontWeight: '700', color: '#333' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  modalButton: { flex: 1, backgroundColor: '#1A73E8', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 6 },
  modalButtonDanger: { backgroundColor: '#F24236' },
  modalButtonText: { color: '#fff', fontWeight: '700' },
});

export default LoginScreen;
