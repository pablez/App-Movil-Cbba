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
  Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { isValidEmail } from '../utils/helpers';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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
      await login(email, password);
      // La navegación se manejará automáticamente por el AuthContext
    } catch (error) {
      Alert.alert('Error', error.message);
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
        <View style={styles.header}>
          <Text style={styles.title}>TransportApp</Text>
          <Text style={styles.subtitle}>Cochabamba</Text>
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
          
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

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
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
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
});

export default LoginScreen;
