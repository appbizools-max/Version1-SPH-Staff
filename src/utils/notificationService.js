import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { sendRemotePushNotification } from './notificationHelper';

/**
 * Creates a notification in the Firestore database and sends a push notification
 * @param {string} userId - The user ID to receive the notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {string} type - Notification type (e.g., 'leave_request', 'leave_status')
 * @param {object} metadata - Additional data
 */
export const createNotification = async (userId, title, body, type, metadata = {}) => {
  try {
    // 1. Write Firestore document
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      body,
      type,
      metadata,
      isRead: false,
      createdAt: serverTimestamp()
    });

    // 2. Fetch recipient's push tokens and send remote push notification
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (userSnap.exists()) {
        const u = userSnap.data();
        const tokens = [];
        if (u.expoPushToken) tokens.push(u.expoPushToken);
        if (Array.isArray(u.expoPushTokens)) {
          u.expoPushTokens.forEach(t => {
            if (t && !tokens.includes(t)) tokens.push(t);
          });
        }
        if (tokens.length > 0) {
          await sendRemotePushNotification(tokens, title, body, { type, ...metadata });
        }
      }
    } catch (tokenErr) {
      console.warn("[Push] Error fetching token for user:", userId, tokenErr);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

/**
 * Sends a notification to all HRs in a specific branch (and pushes to their device)
 */
export const notifyBranchHRs = async (branchId, title, body, type, metadata = {}) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', 'in', ['hr', 'HR', 'Hr', 'hr manager', 'HR Manager', 'hr_manager', 'HR_Manager'])
    );
    const hrSnapshot = await getDocs(q);
    
    for (const docSnap of hrSnapshot.docs) {
      await createNotification(docSnap.id, title, body, type, metadata);
    }
  } catch (error) {
    console.error('Error notifying HRs:', error);
  }
};

/**
 * Sends a notification to all HR users across all branches (and pushes to their device)
 */
export const notifyAllHRs = async (title, body, type, metadata = {}) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', 'in', ['hr', 'HR', 'Hr', 'hr manager', 'HR Manager', 'hr_manager', 'HR_Manager'])
    );
    const hrSnapshot = await getDocs(q);
    
    for (const docSnap of hrSnapshot.docs) {
      await createNotification(docSnap.id, title, body, type, metadata);
    }
  } catch (error) {
    console.error('Error notifying all HRs:', error);
  }
};

/**
 * Sends a notification to all Receptionist users across all branches (and pushes to their device)
 */
export const notifyAllReceptionists = async (title, body, type, metadata = {}) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', 'in', ['receptionist', 'Receptionist'])
    );
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      await createNotification(docSnap.id, title, body, type, metadata);
    }
  } catch (error) {
    console.error('Error notifying receptionists:', error);
  }
};

