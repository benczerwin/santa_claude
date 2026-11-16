// Firebase web config (Firebase console → Project settings → Your apps → Web app).
// These values are safe to commit: access is controlled by firestore.rules, not by hiding this.
// While projectId is 'YOUR_PROJECT' (or with ?local in the URL) the app runs in local demo mode.
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT',
  storageBucket: 'YOUR_PROJECT.firebasestorage.app',
  messagingSenderId: '',
  appId: '',
};
