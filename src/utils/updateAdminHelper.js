// Helper para actualizar el documento del administrador desde la app
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const updateAdminDocument = async () => {
  try {
    const adminUid = 'CE7OYapsxcM2VlaRptGoDMibpHG3';
    
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
      updatedAt: new Date().toISOString(),
      approvedAt: '2025-08-27T17:39:16.000Z'
    };
    
    await updateDoc(doc(db, 'users', adminUid), adminData);
    console.log('✅ Admin document updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating admin document:', error);
    return false;
  }
};
