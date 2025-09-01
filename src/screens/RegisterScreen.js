import React, { useState, useCallback } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
  Modal,
  Dimensions,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES, PASSENGER_TYPES } from '../utils/constants';
import { isValidEmail, isValidPhone } from '../utils/helpers';

const { width } = Dimensions.get('window');

// Componente CustomInput definido a nivel superior: forwardRef, reenvía props y añade logs ligeros para diagnóstico
const CustomInput = React.forwardRef(function CustomInput({
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  returnKeyType = 'default',
  onSubmitEditing,
  onFocus,
  onBlur
}, ref) {
  // Log ligero para detectar renders/remounts durante diagnóstico
  console.log('CustomInput render:', placeholder);

  // Detectar mount / unmount para ver si el componente se remonta al teclear
  React.useEffect(() => {
    console.log('CustomInput mounted:', placeholder);
    return () => {
      console.log('CustomInput unmounted:', placeholder);
    };
  }, [placeholder]);

  return (
    <TextInput
      ref={ref}
      style={styles.input}
      placeholder={placeholder}
      onChangeText={onChangeText}
      value={value}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      blurOnSubmit={false}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      onFocus={() => { console.log(placeholder, 'onFocus'); if (onFocus) onFocus(); }}
      onBlur={() => { console.log(placeholder, 'onBlur'); if (onBlur) onBlur(); }}
    />
  );
});

const RegisterScreen = ({ navigation }) => {
  console.log('RegisterScreen render');
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageType, setCurrentImageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  
  // Usar useState para los valores del formulario para que los campos sean controlados
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    passengerType: PASSENGER_TYPES.REGULAR.id,
  universityCardExpiry: '',
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
  universityCardFront: null,
  universityCardBack: null,
    vehicleFront: null,
    vehicleBack: null,
    vehicleInterior: null,
    driverLicense: null,
    proofOfOwnership: null,
    criminalBackground: null
  });
  
  const { register } = useAuth();

  // refs para manejar foco entre inputs
  const firstNameRef = React.useRef(null);
  const lastNameRef = React.useRef(null);
  const emailRef = React.useRef(null);
  const phoneRef = React.useRef(null);
  const passwordRef = React.useRef(null);
  const confirmPasswordRef = React.useRef(null);
  const vehiclePlateRef = React.useRef(null);
  const vehicleModelRef = React.useRef(null);
  const vehicleYearRef = React.useRef(null);
  const vehicleCapacityRef = React.useRef(null);

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
    setFormData(prev => ({ ...prev, [field]: value }));
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
    const data = formData;
    
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

    // Validaciones para pasajero universitario
    if (selectedRole === USER_ROLES.PASSENGER && data.passengerType === PASSENGER_TYPES.UNIVERSITY.id) {
      if (!images.idCardFront) {
        Alert.alert('Error', 'Se requiere cédula (frente)');
        return false;
      }
      if (!images.idCardBack) {
        Alert.alert('Error', 'Se requiere cédula (reverso)');
        return false;
      }
      if (!images.universityCardFront) {
        Alert.alert('Error', 'Se requiere carnet universitario (frente)');
        return false;
      }
      if (!images.universityCardBack) {
        Alert.alert('Error', 'Se requiere carnet universitario (reverso)');
        return false;
      }
      if (!data.universityCardExpiry || !data.universityCardExpiry.trim()) {
        Alert.alert('Error', 'Se requiere la fecha de vencimiento del carnet universitario');
        return false;
      }
    }

    return true;
  }, [selectedRole, formData, images]);

  const handleRegister = useCallback(async () => {
    if (!validateForm()) return;

    setLoading(true);
  setUploadProgress({});
    try {
      const data = formData;
      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: selectedRole,
        ...(selectedRole === USER_ROLES.PASSENGER && {
            passengerType: data.passengerType
        }),
          ...(selectedRole === USER_ROLES.PASSENGER && data.passengerType === PASSENGER_TYPES.UNIVERSITY.id && {
            universityCardExpiry: data.universityCardExpiry
          }),
        ...(selectedRole === USER_ROLES.DRIVER && {
          vehicleInfo: {
            plate: data.vehiclePlate,
            model: data.vehicleModel,
            year: data.vehicleYear,
            capacity: data.vehicleCapacity
          }
        }),
  images: { ...images } // Incluir todas las imágenes bajo la clave `images` para que AuthContext las procese
      };

      // Pasar callback para recibir progreso de subida por imagen
      const res = await register(data.email, data.password, userData, ({ key, status, url, error }) => {
        setUploadProgress(prev => ({ ...prev, [key]: { status, url, error } }));
      });

      if (!res || res.success === false) {
        // Mostrar errores conocidos de forma amigable
        if (res && res.code === 'auth/email-already-in-use') {
          Alert.alert('Error', 'El correo ingresado ya está registrado. Por favor inicia sesión o recupera tu contraseña.');
        } else {
          const msg = (res && res.error) ? res.error : 'No se pudo crear la cuenta';
          Alert.alert('Error', msg);
        }
      } else {
        // Registro creado correctamente; la cuenta queda en estado 'pending' y el admin debe aprobarla.
        Alert.alert('Registro enviado', 'Tu cuenta fue creada y quedará en estado pendiente hasta que un administrador la apruebe.', [
          { text: 'Aceptar', onPress: () => navigation.navigate('Login') }
        ]);
      }
    } catch (error) {
      console.error('handleRegister exception', error);
      Alert.alert('Error', error?.message || String(error));
    } finally {
      setLoading(false);
    }
  }, [validateForm, selectedRole, images, register, formData]);

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

  const RoleSelectionScreen = () => (
    <View style={styles.roleSelectionContainer}>
      <View style={styles.roleHeader}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Ionicons name="log-in-outline" size={22} color="#2E86AB" />
          <Text style={styles.loginButtonText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
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
    <KeyboardAwareScrollView
      contentContainerStyle={[styles.scrollContent, { marginBottom: 10, paddingTop: 50 }]}
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={false}
      bounces={false}
      enableOnAndroid={true}
      extraScrollHeight={20}
      enableResetScrollToCoords={false}
    >
      <View style={[styles.header, { marginBottom: 10 }]}> 
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

    <View style={[styles.form, { marginTop: 10 }]}> 
      {/* Foto de perfil */}
      <Text style={styles.sectionTitle}>Información Personal</Text>
      <ImageButton 
        imageType="profileImage" 
        label="Foto de Perfil" 
        required 
      />

      <CustomInput
        key="firstName"
        ref={firstNameRef}
        placeholder="Nombre"
        value={formData.firstName}
        onChangeText={text => updateFormData('firstName', text)}
        returnKeyType="next"
        onSubmitEditing={() => lastNameRef.current && lastNameRef.current.focus()}
      />

      <CustomInput
        key="lastName"
        ref={lastNameRef}
        placeholder="Apellido"
        value={formData.lastName}
        onChangeText={text => updateFormData('lastName', text)}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current && emailRef.current.focus()}
      />

      <CustomInput
        key="email"
        ref={emailRef}
        placeholder="Correo electrónico"
        value={formData.email}
        onChangeText={text => updateFormData('email', text)}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current && phoneRef.current.focus()}
      />

      <CustomInput
        key="phone"
        ref={phoneRef}
        placeholder="Teléfono"
        value={formData.phone}
        onChangeText={text => updateFormData('phone', text)}
        keyboardType="phone-pad"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current && passwordRef.current.focus()}
      />

      <CustomInput
        key="password"
        ref={passwordRef}
        placeholder="Contraseña"
        value={formData.password}
        onChangeText={text => updateFormData('password', text)}
        secureTextEntry
        returnKeyType="next"
        onSubmitEditing={() => confirmPasswordRef.current && confirmPasswordRef.current.focus()}
      />

      <CustomInput
        key="confirmPassword"
        ref={confirmPasswordRef}
        placeholder="Confirmar contraseña"
        value={formData.confirmPassword}
        onChangeText={text => updateFormData('confirmPassword', text)}
        secureTextEntry
        returnKeyType="done"
      />

      {/* Campos específicos para pasajeros */}
      {selectedRole === USER_ROLES.PASSENGER && (
        <View style={[styles.passengerSection, { marginTop: 10 }]}> 
          <Text style={styles.sectionTitle}>Tipo de Pasajero</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.passengerType}
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
          
          {(formData.passengerType === PASSENGER_TYPES.STUDENT.id || formData.passengerType === PASSENGER_TYPES.UNIVERSITY.id) && (
                <>
                <ImageButton 
                  imageType="studentCard" 
                  label="Carnet Estudiantil (frente)" 
                />
                </>
          )}
              {formData.passengerType === PASSENGER_TYPES.UNIVERSITY.id && (
                <>
                  <Text style={styles.sectionTitle}>Carnet Universitario</Text>
                  <ImageButton
                    imageType="universityCardFront"
                    label="Carnet Universitario (Frente)"
                    required
                  />
                  <ImageButton
                    imageType="universityCardBack"
                    label="Carnet Universitario (Reverso)"
                    required
                  />
                  <Text style={styles.sectionTitle}>Fecha de Vencimiento del Carnet</Text>
                  <CustomInput
                    key="universityCardExpiry"
                    placeholder="Fecha de vencimiento (YYYY-MM-DD)"
                    value={formData.universityCardExpiry}
                    onChangeText={text => updateFormData('universityCardExpiry', text)}
                    keyboardType="default"
                    returnKeyType="done"
                  />
                </>
              )}
        </View>
      )}

      {/* Campos específicos para conductores */}
      {selectedRole === USER_ROLES.DRIVER && (
        <View style={styles.driverSection}>
          <Text style={styles.sectionTitle}>Información del Vehículo</Text>
          <CustomInput
            key="vehiclePlate"
            ref={vehiclePlateRef}
            placeholder="Placa del vehículo"
            value={formData.vehiclePlate}
            onChangeText={text => updateFormData('vehiclePlate', text)}
            autoCapitalize="characters"
            returnKeyType="next"
            onSubmitEditing={() => vehicleModelRef.current && vehicleModelRef.current.focus()}
          />
          <CustomInput
            key="vehicleModel"
            ref={vehicleModelRef}
            placeholder="Modelo del vehículo"
            value={formData.vehicleModel}
            onChangeText={text => updateFormData('vehicleModel', text)}
            returnKeyType="next"
            onSubmitEditing={() => vehicleYearRef.current && vehicleYearRef.current.focus()}
          />
          <CustomInput
            key="vehicleYear"
            ref={vehicleYearRef}
            placeholder="Año del vehículo"
            value={formData.vehicleYear}
            onChangeText={text => updateFormData('vehicleYear', text)}
            keyboardType="numeric"
            returnKeyType="next"
            onSubmitEditing={() => vehicleCapacityRef.current && vehicleCapacityRef.current.focus()}
          />
          <CustomInput
            key="vehicleCapacity"
            ref={vehicleCapacityRef}
            placeholder="Capacidad de pasajeros"
            value={formData.vehicleCapacity}
            onChangeText={text => updateFormData('vehicleCapacity', text)}
            keyboardType="numeric"
            returnKeyType="done"
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
          {/* Eliminado: Prueba de Propiedad y Antecedentes Penales según solicitud */}
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
    </KeyboardAwareScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {currentStep === 0 ? RoleSelectionScreen() : RegistrationForm()}
      
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

      {/* Modal para progreso de subida */}
      <Modal
        visible={loading}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: width * 0.9 }]}>
            <Text style={styles.modalTitle}>Subiendo imágenes...</Text>
            <View style={{ maxHeight: 260 }}>
              {Object.keys(uploadProgress).length === 0 && (
                <Text style={styles.modalSubtitle}>Preparando subida...</Text>
              )}
              {Object.entries(uploadProgress).map(([key, info]) => (
                <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: '#174f6f' }}>{key}</Text>
                    <Text style={{ color: '#666' }}>{info.status}{info.url ? ` — ${info.url.slice(0, 40)}...` : ''}{info.error ? ` — ${info.error}` : ''}</Text>
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity style={[styles.modalButton, { marginTop: 12 }]} onPress={() => { /* no close while loading */ }}>
              <ActivityIndicator color="#2E86AB" />
              <View style={styles.modalButtonTextContainer}>
                <Text style={styles.modalButtonText}>Subiendo</Text>
                <Text style={styles.modalButtonSubtext}>Espera mientras se suben los archivos</Text>
              </View>
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
  backgroundColor: '#eaf6fb',
  },
  roleSelectionContainer: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    marginTop: Platform.OS === 'ios' ? 30 : 18,
    minHeight: 48,
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
  },
  loginButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#dff4ff',
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 22,
  alignSelf: 'flex-start',
  shadowColor: '#0b3954',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 4,
  },
  loginButtonText: {
  color: '#1B6EA8',
  fontWeight: '700',
  fontSize: 18,
  marginLeft: 10,
  letterSpacing: 0.3,
  },
  roleTitle: {
  fontSize: 32,
  fontWeight: '800',
  color: '#175f86',
  textAlign: 'center',
  marginBottom: 10,
  },
  roleSubtitle: {
  fontSize: 16,
  color: '#4b6b86',
  textAlign: 'center',
  marginBottom: 40,
  },
  roleCard: {
  backgroundColor: '#ffffff',
  padding: 28,
  borderRadius: 16,
  alignItems: 'center',
  marginBottom: 20,
  elevation: 4,
  shadowColor: '#0b3954',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  borderWidth: 1,
  borderColor: '#d8ecf7',
  },
  roleCardTitle: {
  fontSize: 22,
  fontWeight: '700',
  color: '#174f6f',
  marginTop: 12,
  marginBottom: 8,
  },
  roleCardDescription: {
  fontSize: 14,
  color: '#4b6b86',
  textAlign: 'center',
  lineHeight: 20,
  },
  scrollContent: {
  flexGrow: 1,
  paddingHorizontal: 20,
  paddingVertical: 22,
  paddingBottom: 60,
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
  fontWeight: '800',
  color: '#1B6EA8',
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
  fontSize: 17,
  fontWeight: '700',
  color: '#155f86',
  marginBottom: 12,
  marginTop: 18,
  },
  input: {
  backgroundColor: '#ffffff',
  padding: 14,
  borderRadius: 12,
  fontSize: 16,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#cfeffb',
  },
  pickerContainer: {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#d7eef8',
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
  borderRadius: 12,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#d0eafc',
  overflow: 'hidden',
  },
  imageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  previewImage: {
  width: 64,
  height: 64,
  borderRadius: 10,
  marginRight: 15,
  },
  placeholderImage: {
  width: 64,
  height: 64,
  backgroundColor: '#eaf6fb',
  borderRadius: 10,
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
  backgroundColor: '#3aa0e6',
  padding: 14,
  borderRadius: 12,
  alignItems: 'center',
  marginTop: 20,
  shadowColor: '#0b3a58',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 5,
  },
  registerButtonText: {
  color: '#ffffff',
  fontSize: 17,
  fontWeight: '700',
  },
  loginLink: {
  marginTop: 18,
  alignItems: 'center',
  },
  loginLinkText: {
  color: '#1B6EA8',
  fontSize: 15,
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
  borderRadius: 14,
  padding: 18,
  width: width * 0.82,
  maxWidth: 320,
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
  padding: 14,
  borderRadius: 12,
  marginBottom: 10,
  backgroundColor: '#e6f7ff',
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
