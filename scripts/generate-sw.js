const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Read both templates
const fcmTemplate = fs.readFileSync(
  path.join(__dirname, '../public/firebase-messaging-sw.template.js'),
  'utf-8'
);
const offlineTemplate = fs.readFileSync(
  path.join(__dirname, '../public/offline-sw.template.js'),
  'utf-8'
);

// Get Firebase config from environment variables
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Check if all required config values are present
const missingVars = Object.entries(config)
  .filter(([key, value]) => !value && key !== 'measurementId') // measurementId is optional
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.warn('⚠️  Warning: Missing Firebase environment variables:', missingVars.join(', '));
  console.warn('⚠️  Service worker will be generated but may not work without proper config');
}

// Replace placeholders in FCM template with actual values
let fcmOutput = fcmTemplate
  .replace('REPLACE_WITH_FIREBASE_API_KEY', config.apiKey)
  .replace('REPLACE_WITH_AUTH_DOMAIN', config.authDomain)
  .replace('REPLACE_WITH_PROJECT_ID', config.projectId)
  .replace('REPLACE_WITH_STORAGE_BUCKET', config.storageBucket)
  .replace('REPLACE_WITH_MESSAGING_SENDER_ID', config.messagingSenderId)
  .replace('REPLACE_WITH_APP_ID', config.appId)
  .replace('REPLACE_WITH_MEASUREMENT_ID', config.measurementId || '');

// Extract the header comment and imports from FCM template
const fcmHeaderEnd = fcmOutput.indexOf('firebase.initializeApp(firebaseConfig);');
const fcmHeader = fcmOutput.substring(0, fcmHeaderEnd + 'firebase.initializeApp(firebaseConfig);'.length);

// Extract FCM-specific handlers (everything after Firebase initialization)
const fcmHandlers = fcmOutput.substring(fcmHeaderEnd + 'firebase.initializeApp(firebaseConfig);'.length);

// Extract offline template content (skip the initial comment block)
const offlineContentStart = offlineTemplate.indexOf('// Cache configuration');
const offlineContent = offlineTemplate.substring(offlineContentStart);

// Combine templates: FCM header + offline caching + FCM handlers
const combinedOutput = `${fcmHeader}

${offlineContent}
${fcmHandlers}`;

// Write the combined service worker
fs.writeFileSync(
  path.join(__dirname, '../public/firebase-messaging-sw.js'),
  combinedOutput
);

console.log('✓ Service worker generated with Firebase config and offline support');
