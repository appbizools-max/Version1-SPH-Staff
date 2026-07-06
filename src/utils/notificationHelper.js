import { Platform } from 'react-native';
import Constants from 'expo-constants';

let ExpoNotifications = null;
try {
  ExpoNotifications = require('expo-notifications');
} catch (e) {
  console.log('[notificationHelper] Failed to load expo-notifications:', e);
}

export const AndroidImportance = ExpoNotifications?.AndroidImportance || {
  UNKNOWN: 0,
  UNSPECIFIED: -1000,
  NONE: 0,
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
};

export const AndroidNotificationPriority = ExpoNotifications?.AndroidNotificationPriority || {
  MIN: 'min',
  LOW: 'low',
  DEFAULT: 'default',
  HIGH: 'high',
  MAX: 'max',
};

const Notifications = ExpoNotifications || {
  setNotificationHandler: () => { },
  getPermissionsAsync: async () => ({ status: 'granted' }),
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  getExpoPushTokenAsync: async () => ({ data: null }),
  scheduleNotificationAsync: async () => { },
  setNotificationChannelAsync: async () => { }
};

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  // Silently ignore
}

// ─── ANDROID CHANNELS ──────────────────────────────────────────────────────────
async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('booking_v3', {
      name: 'Bookings',
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0ea5e9',
    });
    await Notifications.setNotificationChannelAsync('payment_v3', {
      name: 'Payments',
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 300, 150, 300],
      lightColor: '#10b981',
    });
  } catch (e) {
    console.warn('[staffNotification] Channel setup error:', e);
  }
}

// ─── PERMISSIONS ───────────────────────────────────────────────────────────────
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;
  try {
    await setupNotificationChannels();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[staffNotification] Push permission denied by user');
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn('[staffNotification] Project ID not found in expoConfig');
      return null;
    }

    // Only skip token fetch when truly inside Expo Go (not a real APK build)
    const isExpoGo = Constants.appOwnership === 'expo' && Constants.executionEnvironment === 'storeClient';
    if (isExpoGo) {
      console.log('[staffNotification] Running in Expo Go, skipping remote push token fetch');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[staffNotification] Got push token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    if (error?.message?.includes('Expo Go')) {
      console.log('[staffNotification] Running in Expo Go, skipping remote push token fetch.');
      return null;
    }
    console.warn('[staffNotification] Permission/token fetch error:', error);
    return null;
  }
}

// ─── INTERNAL FIRE HELPER ──────────────────────────────────────────────────────
async function fire(title, body, channelId = 'booking_v3', data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: AndroidNotificationPriority.MAX,
        data,
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('[staffNotification] fire error:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF APP NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Walk-in appointment booked */
export async function scheduleWalkInBookingNotification(patientName, doctorName, dateStr, timeSlot) {
  await fire(
    '📋 Walk-in Appointment Booked',
    `${patientName} booked with Dr. ${doctorName} on ${dateStr} at ${timeSlot}.`,
    'booking_v3',
    { type: 'walkin_booking' }
  );
}

/** Walk-in payment collected at reception */
export async function scheduleWalkInPaymentNotification(patientName, amount, method) {
  await fire(
    '💰 Payment Collected',
    `₹${amount} collected from ${patientName} via ${(method || 'cash').toUpperCase()}.`,
    'payment_v3',
    { type: 'walkin_payment' }
  );
}

/** Payment request sent to patient from reception */
export async function schedulePaymentSentToPatientNotification(patientName, amount) {
  await fire(
    '📤 Payment Request Sent',
    `₹${amount} fee request sent to ${patientName}. Waiting for patient to pay via app.`,
    'payment_v3',
    { type: 'payment_request_sent' }
  );
}

/** Patient has paid (detected via QR polling or Firestore update) */
export async function schedulePatientPaidNotification(patientName, amount, method) {
  await fire(
    '✅ Patient Paid',
    `${patientName} paid ₹${amount} via ${(method || 'online').toUpperCase()}. Appointment confirmed!`,
    'payment_v3',
    { type: 'patient_paid' }
  );
}

/** Walk-in booking confirmed — shown on receptionist device after booking */
export async function scheduleBookingSuccessNotification(doctorName, dateStr, timeSlot) {
  await fire(
    '✅ Appointment Booked',
    `Appointment confirmed with Dr. ${doctorName} on ${dateStr} at ${timeSlot}.`,
    'booking_v3',
    { type: 'booking_success' }
  );
}

/** Appointment reminder — scheduled at booking time */
export async function scheduleAppointmentReminder(doctorName, dateString, timeSlot) {
  await fire(
    '⏰ Appointment Reminder',
    `Upcoming appointment with  ${doctorName} on ${dateString} at ${timeSlot}.`,
    'booking_v3',
    { type: 'appointment_reminder' }
  );
}

/** Payment success — shown on receptionist device after collecting payment */
export async function schedulePaymentSuccessNotification(patientName, amount, method) {
  await fire(
    '✅ Payment Successful',
    `₹${amount} received from ${patientName} via ${(method || 'cash').toUpperCase()}.`,
    'payment_v3',
    { type: 'payment_success' }
  );
}

/** Sends an Expo Push Notification to another device */
export async function sendRemotePushNotification(expoPushTokenOrTokens, title, body, data = {}) {
  if (!expoPushTokenOrTokens) return;
  const tokens = Array.isArray(expoPushTokenOrTokens)
    ? expoPushTokenOrTokens
    : [expoPushTokenOrTokens];

  const validTokens = tokens.filter(t => t && typeof t === 'string');
  if (validTokens.length === 0) return;

  try {
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      channelId: 'booking_v3',
      priority: 'high',
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const resData = await response.json();
    console.log('[sendRemotePushNotification] Response:', resData);
  } catch (error) {
    console.error('[sendRemotePushNotification] Error sending remote push notification:', error);
  }
}
