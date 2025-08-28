// Script simple para crear usuario administrador
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDyvw6YdotzdYWwKhfWOTj99_PmJzDiJO8",
  authDomain: "transportapp-cochabamba.firebaseapp.com",
  projectId: "transportapp-cochabamba",
  storageBucket: "transportapp-cochabamba.firebasestorage.app",
  messagingSenderId: "443534221039",
  appId: "1:443534221039:web:591b10b292727a5419851a",
  measurementId: "G-J35RR0PZQ6"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  try {
    console.log('Creando usuario administrador...');
    
    // Crear usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      'admin@transportapp.com', 
      'admin123456'
    );
    
    const user = userCredential.user;
    console.log('Usuario creado en Authentication:', user.uid);
    
    // Crear documento en Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: 'admin@transportapp.com',
      fullName: 'Administrador Sistema',
      phone: '+59112345678',
      role: 'ADMIN',
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Usuario administrador creado exitosamente!');
    console.log('Email: admin@transportapp.com');
    console.log('Password: admin123456');
    console.log('Role: ADMIN');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando administrador:', error.message);
    process.exit(1);
  }
}

createAdmin();
