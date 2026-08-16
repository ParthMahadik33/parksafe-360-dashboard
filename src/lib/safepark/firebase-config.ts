// ============================================================
// FIREBASE CONFIGURATION  ->  PASTE YOUR CREDENTIALS HERE
// ============================================================
// 1. Go to https://console.firebase.google.com -> your project
// 2. Project settings -> General -> "Your apps" -> Web app (</>)
// 3. Copy the firebaseConfig object and replace the values below.
// 4. Realtime Database -> create database -> copy its URL into databaseURL.
//
// While these values are still the "YOUR_..." placeholders, the dashboard
// automatically runs in SIMULATION MODE so you can demo it without hardware.
// ============================================================

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

/** Root node used by both the ESP32 and this dashboard. */
export const DB_ROOT = "SAFEPARK360";

/** True once real credentials have been pasted above. */
export const isFirebaseConfigured = () =>
  !Object.values(firebaseConfig).some((v) => v.includes("YOUR_"));
