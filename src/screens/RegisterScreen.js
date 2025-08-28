import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Image,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES, PASSENGER_TYPES } from '../utils/constants';
import { isValidEmail, isValidPhone } from '../utils/helpers';

const { width } = Dimensions.get('window');

const RegisterScreen = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageType, setCurrentImageType] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Usar useRef para los valores del formulario para evitar re-renders
  const formData = useRef({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    passengerType: PASSENGER_TYPES.REGULAR.id,
    vehiclePlate: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleCapacity: ''
  });
  
  const [images, setImages] = useState({
    profileImage: null,
    idCardFront: null,
    idCardBack: null,
    studentCard: null,
    vehicleFront: null,
    vehicleBack: null,
    vehicleInterior: null,
    driverLicense: null,
    proofOfOwnership: null,
    criminalBackground: null
  });
  
  const { register } = useAuth();

  // Función para verificar y solicitar permisos específicos
  const requestSpecificPermissions = useCallback(async (forCamera = false) => {
    try {
      if (forCamera) {
        // Solicitar permisos de cámara
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        console.log('Camera Permission Status:', cameraStatus);
        
        if (cameraStatus.status !== 'granted') {
          Alert.alert(
            'Permiso de Cámara Requerido',
            'Para tomar fotos, necesitamos acceso a tu cámara. Por favor, concede el permiso en la configuración de tu dispositivo.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Configuración', onPress: () => console.log('Abrir configuración') }
            ]
          );
          return false;
        }
      } else {
        // Solicitar permisos de galería
        const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('Media Library Permission Status:', mediaLibraryStatus);
        
        if (mediaLibraryStatus.status !== 'granted') {
          Alert.alert(
            'Permiso de Galería Requerido',
            'Para seleccionar fotos, necesitamos acceso a tu galería. Por favor, concede el permiso en la configuración de tu dispositivo.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Configuración', onPress: () => console.log('Abrir configuración') }
            ]
          );
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting specific permissions:', error);
      Alert.alert('Error', 'Error solicitando permisos: ' + error.message);
      return false;
    }
  }, []);

  const handleRoleSelection = useCallback((role) => {
    setSelectedRole(role);
    setCurrentStep(1);
  }, []);

  const updateFormData = useCallback((field, value) => {
    formData.current[field] = value;
  }, []);

  const openImageModal = useCallback(async (imageType) => {
    console.log('Opening image modal for:', imageType);
    setCurrentImageType(imageType);
    
    // Verificar permisos existentes para mostrar información en el modal
    try {
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      const mediaLibraryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      console.log('Existing Camera Permission:', cameraStatus.status);
      console.log('Existing Media Library Permission:', mediaLibraryStatus.status);
    } catch (error) {
      console.error('Error checking existing permissions:', error);
    }
    
    setShowImageModal(true);
  }, []);

  const pickImage = useCallback(async (useCamera = false) => {
    console.log('pickImage called with useCamera:', useCamera);
    console.log('currentImageType:', currentImageType);
    
    try {
      setShowImageModal(false); // Cerrar modal primero
      
      // Solicitar permisos específicos antes de proceder
      const hasPermission = await requestSpecificPermissions(useCamera);
      if (!hasPermission) {
        console.log('Permission denied, aborting image selection');
        return;
      }
      
      const options = {
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      };

      console.log('Launching image picker with options:', options);

      let result;
      if (useCamera) {
        console.log('Using launchCameraAsync');
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        console.log('Using launchImageLibraryAsync');
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        console.log('Selected image URI:', imageUri);
        
        setImages(prev => ({
          ...prev,
          [currentImageType]: imageUri
        }));
        
        Alert.alert('¡Éxito!', 'Imagen seleccionada correctamente');
      } else {
        console.log('User cancelled image selection or no assets returned');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      console.error('Error stack:', error.stack);
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Detalle: ' + error.message);
    }
  }, [currentImageType, requestSpecificPermissions]);

  const validateForm = useCallback(() => {
    const data = formData.current;
    
    if (!data.firstName.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return false;
    }

    if (!data.lastName.trim()) {
      Alert.alert('Error', 'El apellido es requerido');
      return false;
    }

    if (!isValidEmail(data.email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return false;
    }

    if (data.password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    if (data.password !== data.confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return false;
    }

    if (!data.phone.trim()) {
      Alert.alert('Error', 'El teléfono es requerido');
      return false;
    }

    // Validaciones específicas para conductor
    if (selectedRole === USER_ROLES.DRIVER) {
      if (!data.vehiclePlate.trim()) {
        Alert.alert('Error', 'La placa del vehículo es requerida');
        return false;
      }
      if (!data.vehicleModel.trim()) {
        Alert.alert('Error', 'El modelo del vehículo es requerido');
        return false;
      }
      if (!data.vehicleYear.trim()) {
        Alert.alert('Error', 'El año del vehículo es requerido');
        return false;
      }
      if (!data.vehicleCapacity.trim()) {
        Alert.alert('Error', 'La capacidad del vehículo es requerida');
        return false;
      }
    }

    return true;
  }, [selectedRole]);

  const handleRegister = useCallback(async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data = formData.current;
      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: selectedRole,
        ...(selectedRole === USER_ROLES.PASSENGER && {
          passengerType: data.passengerType
        }),
        ...(selectedRole === USER_ROLES.DRIVER && {
          vehicleInfo: {
            plate: data.vehiclePlate,
            model: data.vehicleModel,
            year: data.vehicleYear,
            capacity: data.vehicleCapacity
          }
        }),
        ...images // Incluir todas las imágenes
      };

      await register(data.email, data.password, userData);
      Alert.alert('Éxito', 'Cuenta creada exitosamente. Tu cuenta será revisada antes de la aprobación.');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }, [validateForm, selectedRole, images, register]);

  const ImageButton = React.memo(({ imageType, label, required = false }) => {
    const imageUri = images[imageType];
    
    const handlePress = useCallback(() => {
      openImageModal(imageType);
    }, [imageType]);
    
    return (
      <TouchableOpacity 
        style={styles.imageButton}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.imageButtonContent}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="camera" size={40} color="#666" />
            </View>
          )}
          <Text style={styles.imageButtonText}>
            {label} {required && <Text style={styles.required}>*</Text>}
          </Text>
        </View>
      </TouchableOpacity>
    );
  });

  const CustomInput = React.memo(({ 
    placeholder, 
    field,
    keyboardType = 'default',
    secureTextEntry = false,
    autoCapitalize = 'sentences'
  }) => {
    const handleChangeText = useCallback((text) => {
      updateFormData(field, text);
    }, [field]);

    return (
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        onChangeText={handleChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        blurOnSubmit={false}
      />
    );
  });

  const RoleSelectionScreen = () => (
    <View style={styles.roleSelectionContainer}>
      <Text style={styles.roleTitle}>Selecciona tu rol</Text>
      <Text style={styles.roleSubtitle}>¿Cómo quieres usar TransportApp?</Text>
      
      <TouchableOpacity 
        style={styles.roleCard}
        onPress={() => handleRoleSelection(USER_ROLES.PASSENGER)}
      >
        <Ionicons name="person" size={60} color="#2E86AB" />
        <Text style={styles.roleCardTitle}>Pasajero</Text>
        <Text style={styles.roleCardDescription}>
          Encuentra y paga por viajes en transporte público
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.roleCard}
        onPress={() => handleRoleSelection(USER_ROLES.DRIVER)}
      >
        <Ionicons name="car" size={60} color="#F24236" />
        <Text style={styles.roleCardTitle}>Conductor</Text>
        <Text style={styles.roleCardDescription}>
          Conduce vehículos de transporte público y acepta pagos digitales
        </Text>
      </TouchableOpacity>
    </View>
  );

  const RegistrationForm = () => (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setCurrentStep(0)}
          >
            <Ionicons name="arrow-back" size={24} color="#2E86AB" />
          </TouchableOpacity>
          <Text style={styles.title}>
            Registro como {selectedRole === USER_ROLES.PASSENGER ? 'Pasajero' : 'Conductor'}
          </Text>
        </View>

      <View style={styles.form}>
        {/* Foto de perfil */}
        <Text style={styles.sectionTitle}>Información Personal</Text>
        <ImageButton 
          imageType="profileImage" 
          label="Foto de Perfil" 
          required 
        />

        <CustomInput
          placeholder="Nombre"
          field="firstName"
        />

        <CustomInput
          placeholder="Apellido"
          field="lastName"
        />

        <CustomInput
          placeholder="Correo electrónico"
          field="email"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <CustomInput
          placeholder="Teléfono"
          field="phone"
          keyboardType="phone-pad"
        />

        <CustomInput
          placeholder="Contraseña"
          field="password"
          secureTextEntry
        />

        <CustomInput
          placeholder="Confirmar contraseña"
          field="confirmPassword"
          secureTextEntry
        />

        {/* Campos específicos para pasajeros */}
        {selectedRole === USER_ROLES.PASSENGER && (
          <View style={styles.passengerSection}>
            <Text style={styles.sectionTitle}>Tipo de Pasajero</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.current.passengerType}
                onValueChange={(value) => updateFormData('passengerType', value)}
                style={styles.picker}
              >
                <Picker.Item label="Regular" value={PASSENGER_TYPES.REGULAR.id} />
                <Picker.Item label="Estudiante" value={PASSENGER_TYPES.STUDENT.id} />
                <Picker.Item label="Universitario" value={PASSENGER_TYPES.UNIVERSITY.id} />
                <Picker.Item label="Adulto Mayor" value={PASSENGER_TYPES.SENIOR.id} />
                <Picker.Item label="Persona con Discapacidad" value={PASSENGER_TYPES.DISABLED.id} />
              </Picker>
            </View>

            <Text style={styles.sectionTitle}>Documentos</Text>
            
            <ImageButton 
              imageType="idCardFront" 
              label="Cédula de Identidad (Frente)" 
            />
            <ImageButton 
              imageType="idCardBack" 
              label="Cédula de Identidad (Reverso)" 
            />
            
            {(formData.current.passengerType === PASSENGER_TYPES.STUDENT.id || formData.current.passengerType === PASSENGER_TYPES.UNIVERSITY.id) && (
              <ImageButton 
                imageType="studentCard" 
                label="Carnet Estudiantil" 
              />
            )}
          </View>
        )}

        {/* Campos específicos para conductores */}
        {selectedRole === USER_ROLES.DRIVER && (
          <View style={styles.driverSection}>
            <Text style={styles.sectionTitle}>Información del Vehículo</Text>
            <CustomInput
              placeholder="Placa del vehículo"
              field="vehiclePlate"
              autoCapitalize="characters"
            />
            <CustomInput
              placeholder="Modelo del vehículo"
              field="vehicleModel"
            />
            <CustomInput
              placeholder="Año del vehículo"
              field="vehicleYear"
              keyboardType="numeric"
            />
            <CustomInput
              placeholder="Capacidad de pasajeros"
              field="vehicleCapacity"
              keyboardType="numeric"
            />

            <Text style={styles.sectionTitle}>Fotos del Vehículo</Text>
            <ImageButton 
              imageType="vehicleFront" 
              label="Foto Frontal del Vehículo" 
            />
            <ImageButton 
              imageType="vehicleBack" 
              label="Foto Trasera del Vehículo" 
            />
            <ImageButton 
              imageType="vehicleInterior" 
              label="Foto Interior del Vehículo" 
            />

            <Text style={styles.sectionTitle}>Documentos del Conductor</Text>
            <ImageButton 
              imageType="driverLicense" 
              label="Licencia de Conducir" 
            />
            <ImageButton 
              imageType="proofOfOwnership" 
              label="Prueba de Propiedad del Vehículo" 
            />
            <ImageButton 
              imageType="criminalBackground" 
              label="Antecedentes Penales" 
            />
          </View>
        )}

        <TouchableOpacity 
          style={styles.registerButton} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.registerButtonText}>Completar Registro</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginLinkText}>
            ¿Ya tienes cuenta? Inicia sesión
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {currentStep === 0 ? <RoleSelectionScreen /> : <RegistrationForm />}
      
      {/* Modal para selección de imagen */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar imagen</Text>
            <Text style={styles.modalSubtitle}>
              Se solicitarán permisos según la opción seleccionada
            </Text>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => pickImage(true)}
            >
              <Ionicons name="camera" size={24} color="#2E86AB" />
              <View style={styles.modalButtonTextContainer}>
                <Text style={styles.modalButtonText}>Tomar foto</Text>
                <Text style={styles.modalButtonSubtext}>Requiere permiso de cámara</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => pickImage(false)}
            >
              <Ionicons name="images" size={24} color="#2E86AB" />
              <View style={styles.modalButtonTextContainer}>
                <Text style={styles.modalButtonText}>Elegir de galería</Text>
                <Text style={styles.modalButtonSubtext}>Requiere permiso de galería</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowImageModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  roleSelectionContainer: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  roleTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E86AB',
    textAlign: 'center',
    marginBottom: 10,
  },
  roleSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  roleCard: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  roleCardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  roleCardDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E86AB',
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 20,
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
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerLabel: {
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  picker: {
    height: 50,
  },
  imageButton: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  imageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  imageButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  required: {
    color: '#F24236',
  },
  passengerSection: {
    marginVertical: 10,
  },
  driverSection: {
    marginVertical: 10,
  },
  registerButton: {
    backgroundColor: '#2E86AB',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#2E86AB',
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    width: width * 0.8,
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f0f8ff',
  },
  modalButtonTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#2E86AB',
    fontWeight: '600',
  },
  modalButtonSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default RegisterScreen;
