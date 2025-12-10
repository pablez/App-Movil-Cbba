import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { uploadUserImages } from '../utils/imageUpload';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Obtener el perfil del usuario desde Firestore para exponer nombre, foto y rol
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Verificar si el usuario está aprobado
            if (userData.status !== 'approved' && userData.role !== 'ADMIN' && !userData.isAdmin) {
              console.log('Usuario no aprobado, cerrando sesión');
              await signOut(auth);
              setUser(null);
              setUserRole(null);
              setIsAdmin(false);
              setLoading(false);
              return;
            }
            
            // Aplanar la URL de la imagen de perfil para compatibilidad retroactiva.
            // Preferimos: top-level profileImage || userData.images.profileImage
            const profileImageFromImages = userData.images && userData.images.profileImage;
            const profileImageUrl = userData.profileImage || profileImageFromImages || null;

            // Merge: mantén todos los campos de userData pero fuerza el campo profileImage a la URL resuelta
            const merged = { ...userData, profileImage: profileImageUrl };

            // Guardar en `user` la información combinada (uid + datos de Firestore)
            setUser({ uid: user.uid, email: user.email, ...merged });
            setUserRole(merged.role);
            setIsAdmin(merged.role === 'ADMIN' || merged.isAdmin === true);
            console.log('=== AUTH DEBUG ===');
            console.log('User data:', merged);
            console.log('User role:', merged.role);
            console.log('Is admin:', merged.role === 'ADMIN' || merged.isAdmin === true);
            console.log('User status:', merged.status);
            console.log('User isApproved:', merged.isApproved);
            console.log('==================');
          } else {
            // Si no hay documento en Firestore, usar el objeto auth básico
            setUser({ uid: user.uid, email: user.email });
            setUserRole(null);
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // En caso de error, exponer al menos el usuario de auth
          setUser({ uid: user.uid, email: user.email });
          setUserRole(null);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setUserRole(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Permite forzar recarga del documento de usuario desde Firestore
  const refreshUser = async () => {
    try {
      const current = auth.currentUser;
      if (!current) return null;
      const userDoc = await getDoc(doc(db, 'users', current.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profileImageFromImages = userData.images && userData.images.profileImage;
        const profileImageUrl = userData.profileImage || profileImageFromImages || null;
        const merged = { ...userData, profileImage: profileImageUrl };
        setUser({ uid: current.uid, email: current.email, ...merged });
        setUserRole(merged.role);
        setIsAdmin(merged.role === 'ADMIN' || merged.isAdmin === true);
        return merged;
      }
      // si no existe doc
      setUser({ uid: current.uid, email: current.email });
      setUserRole(null);
      setIsAdmin(false);
      return null;
    } catch (e) {
      console.error('refreshUser error', e);
      return null;
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Intentando autenticar usuario...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ AuthContext: Usuario autenticado exitosamente');
      
      return {
        success: true,
        user: userCredential.user
      };
    } catch (error) {
      console.error('❌ AuthContext: Error en login:', error.code, error.message);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  };

  // onUploadProgress: optional callback(receives { key, status, url?, error? }) for UI
  const register = async (email, password, userData, onUploadProgress) => {
    try {
      // Pre-check: evitar crear usuario si el correo ya existe
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods && methods.length > 0) {
          console.warn('AuthProvider.register: email already in use', email, methods);
          return { success: false, code: 'auth/email-already-in-use', error: 'El correo ya está registrado' };
        }
      } catch (checkErr) {
        // No bloquear el registro por fallos en la comprobación, continuar y confiar en createUserWithEmailAndPassword
        console.warn('AuthProvider.register: fetchSignInMethodsForEmail failed, proceeding', checkErr);
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      // Si el frontend envió un objeto `images` en userData, subirlas a Storage
      let uploadedImages = {};
      try {
        if (userData && userData.images) {
          const resp = await uploadUserImages(userId, userData.images, onUploadProgress);
          if (resp && resp.uploaded) {
            uploadedImages = resp.uploaded;
          }
        }
      } catch (uploadErr) {
        console.error('Error uploading user images during registration:', uploadErr);
        // seguir sin bloquear el registro
      }

      // Build final images map: prefer uploadedImages; ensure we never save local file:// URIs
      const finalImages = {};
      const incomingImages = (userData && userData.images) || {};
      const keys = Array.from(new Set([...Object.keys(incomingImages), ...Object.keys(uploadedImages)]));
      keys.forEach((k) => {
        const uploaded = uploadedImages[k];
        if (uploaded && typeof uploaded === 'string' && (uploaded.startsWith('http://') || uploaded.startsWith('https://'))) {
          finalImages[k] = uploaded;
        } else {
          // If upload failed (null) or no upload performed, avoid storing local URIs: set null
          finalImages[k] = null;
        }
      });

      const userDataToSave = {
        ...userData,
        images: finalImages,
        email,
        createdAt: new Date().toISOString(),
        status: 'pending', // Registration needs approval
      };

      // Log y pequeño retry: asegurar que auth.currentUser está presente para pasar las reglas de seguridad
      console.log('AuthProvider.register: attempt to save user doc for uid', userId);
      if (!auth.currentUser) {
        console.warn('AuthProvider.register: auth.currentUser not yet available, waiting 500ms');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      console.log('AuthProvider.register: auth.currentUser now', auth.currentUser?.uid);
      try {
        await setDoc(doc(db, 'users', userId), userDataToSave);
      } catch (setDocErr) {
        console.error('AuthProvider.register: setDoc failed, attempting rollback (delete auth user)', setDocErr);
        // Intentar eliminar el usuario de Auth para evitar cuentas huérfanas
        try {
          // userCredential.user.delete() requiere que el usuario esté autenticado recientemente;
          // como acaba de crearse, esto normalmente funcionará.
          await userCredential.user.delete();
          console.log('AuthProvider.register: rollback successful, deleted auth user', userId);
        } catch (deleteErr) {
          console.error('AuthProvider.register: rollback delete failed', deleteErr);
        }
        return { success: false, code: 'firestore/setDoc-failed', error: 'Error al guardar datos del usuario. Intenta de nuevo más tarde.' };
      }

      // Cerrar sesión explícitamente: la cuenta queda en estado 'pending' y no debe permanecer autenticada
      try {
        await signOut(auth);
      } catch (soErr) {
        console.warn('AuthProvider.register: signOut after register failed', soErr);
      }

      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Registration error:', error);
      // Normalizar respuesta de error para que la UI pueda mostrar mensajes adecuados
      return { success: false, code: error?.code || 'unknown', error: error?.message || String(error) };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserRole(null);
      setIsAdmin(false);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    userRole,
    isAdmin,
    login,
    register,
    logout,
  refreshUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
