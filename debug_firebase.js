/**
 * Script de diagnóstico para problemas de Firebase
 * Ejecuta: node debug_firebase.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDyvw6YdotzdYWwKhfWOTj99_PmJzDiJO8",
  authDomain: "transportapp-cochabamba.firebaseapp.com",
  projectId: "transportapp-cochabamba",
  storageBucket: "transportapp-cochabamba.appspot.com",
  messagingSenderId: "443534221039",
  appId: "1:443534221039:web:591b10b292727a5419851a",
  measurementId: "G-J35RR0PZQ6"
};

console.log('🔧 Iniciando diagnóstico de Firebase...\n');

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function diagnosticar() {
  try {
    console.log('📡 Conectando a Firestore...');
    
    // Probar directamente las rutas que deberían ser públicas
    console.log('🔍 Verificando colección de rutas (ahora debería ser pública)...');
    const routesSnapshot = await getDocs(collection(db, 'routes'));
    
    console.log('✅ Conexión a Firestore exitosa - rutas accesibles sin autenticación');
    
    if (routesSnapshot.empty) {
      console.log('⚠️ La colección de rutas está VACÍA');
      console.log('💡 Esto significa que el problema NO es de permisos, sino que no hay datos en la base de datos.');
    } else {
      console.log(`✅ Encontradas ${routesSnapshot.size} rutas en la base de datos:`);
      
      routesSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  📍 ID: ${doc.id}`);
        console.log(`     Nombre: ${data.name || 'Sin nombre'}`);
        console.log(`     Público: ${data.public || false}`);
        console.log(`     Puntos: ${data.points?.length || 0}`);
        console.log(`     Coordenadas: ${data.coordinates?.length || 0}`);
        console.log(`     Creado: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Sin fecha'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('\n❌ Error durante el diagnóstico:', error);
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
    
    if (error.code === 'permission-denied') {
      console.log('\n💡 POSIBLE SOLUCIÓN:');
      console.log('   Las reglas de Firestore siguen bloqueando el acceso.');
      console.log('   Verifica en la consola web que las reglas se han desplegado correctamente.');
    }
  }
}

// Ejecutar diagnóstico
diagnosticar()
  .then(() => {
    console.log('\n✅ Diagnóstico completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });