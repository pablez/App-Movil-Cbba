/**
 * Script para hacer todas las rutas públicas
 * Esto permitirá que los invitados vean las rutas sin autenticarse
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDyvw6YdotzdYWwKhfWOTj99_PmJzDiJO8",
  authDomain: "transportapp-cochabamba.firebaseapp.com",
  projectId: "transportapp-cochabamba",
  storageBucket: "transportapp-cochabamba.appspot.com",
  messagingSenderId: "443534221039",
  appId: "1:443534221039:web:591b10b292727a5419851a",
  measurementId: "G-J35RR0PZQ6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function hacerRutasPublicas() {
  try {
    console.log('🔑 Autenticando de forma anónima...');
    await signInAnonymously(auth);
    console.log('✅ Autenticado exitosamente');

    console.log('\n📍 Obteniendo todas las rutas...');
    const routesSnapshot = await getDocs(collection(db, 'routes'));
    
    if (routesSnapshot.empty) {
      console.log('⚠️ No se encontraron rutas para actualizar');
      return;
    }

    console.log(`📦 Encontradas ${routesSnapshot.size} rutas. Actualizando...`);

    let updated = 0;
    for (const routeDoc of routesSnapshot.docs) {
      const data = routeDoc.data();
      
      if (!data.public) {
        console.log(`📝 Actualizando ruta: ${data.name || routeDoc.id}`);
        await updateDoc(doc(db, 'routes', routeDoc.id), {
          public: true,
          updatedAt: new Date()
        });
        updated++;
      } else {
        console.log(`✅ Ruta ya pública: ${data.name || routeDoc.id}`);
      }
    }

    console.log(`\n🎉 Proceso completado! ${updated} rutas actualizadas a públicas`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
  }
}

hacerRutasPublicas()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });