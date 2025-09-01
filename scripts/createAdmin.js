// Script para crear el usuario administrador inicial
// Ejecutar este código una sola vez para crear el admin

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Configuración de Firebase (reemplaza con tu configuración)
const firebaseConfig = {
  apiKey: "AIzaSyC8lxiIhcBDa2tkLaB0WtNyJZb_tW9KOGY",
  authDomain: "transportapp-cbba.firebaseapp.com",
  projectId: "transportapp-cbba",
  storageBucket: "transportapp-cbba.firebasestorage.app",
  messagingSenderId: "241297999462",
  appId: "1:241297999462:web:a4e3ef68de45aeb0f926a3"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const createAdminUser = async () => {
  try {
    console.log('Creando usuario administrador...');
    
    const adminEmail = 'admin@transportapp.com';
    const adminPassword = 'admin123456';
    
    // Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const userId = userCredential.user.uid;
    
    console.log('Usuario creado en Auth:', userId);
    
    // Crear documento del usuario administrador en Firestore
    const adminData = {
      email: adminEmail,
      fullName: 'Administrador Sistema',
      firstName: 'Administrador',
      lastName: 'Sistema',
      phone: '+59112345678',
      role: 'ADMIN',
      status: 'approved',
      isApproved: true,
      isActive: true,
      isAdmin: true,
      createdAt: '2025-08-27T17:39:16.000Z', // Fecha exacta que proporcionaste
      updatedAt: '2025-08-27T17:39:16.000Z',
      approvedAt: '2025-08-27T17:39:16.000Z'
    };
    
    await setDoc(doc(db, 'users', userId), adminData);
    
    console.log('✅ Usuario administrador creado exitosamente!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('⚠️  Cambia la contraseña después del primer login');
    
  } catch (error) {
    console.error('Error creando usuario administrador:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️  El usuario administrador ya existe');
    }
  }
};

// Ejecutar la función
createAdminUser();
