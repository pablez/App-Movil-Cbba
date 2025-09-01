// Script para actualizar el usuario administrador
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

// Configuración de Firebase
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
const db = getFirestore(app);

const updateAdminUser = async () => {
  try {
    console.log('Actualizando usuario administrador...');
    
    // UID del admin que me proporcionaste
    const adminUid = 'CE7OYapsxcM2VlaRptGoDMibpHG3';
    
    // Datos actualizados para el admin - usando los datos exactos que proporcionaste
    const adminData = {
      email: 'admin@transportapp.com',
      fullName: 'Administrador Sistema',
      firstName: 'Administrador',
      lastName: 'Sistema',
      phone: '+59112345678',
      role: 'ADMIN',
      status: 'approved',
      isApproved: true,
      isActive: true,
      isAdmin: true,
      createdAt: '2025-08-27T17:39:16.000Z',
      updatedAt: new Date().toISOString(), // Solo actualizar la fecha de modificación
      approvedAt: '2025-08-27T17:39:16.000Z'
    };
    
    await updateDoc(doc(db, 'users', adminUid), adminData);
    
    console.log('✅ Usuario administrador actualizado exitosamente!');
    console.log('📧 UID:', adminUid);
    console.log('🔄 Status:', adminData.status);
    
  } catch (error) {
    console.error('Error actualizando usuario administrador:', error);
  }
};

// Ejecutar la función
updateAdminUser();
