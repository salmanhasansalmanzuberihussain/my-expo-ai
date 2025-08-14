import { Platform } from 'react-native';

// Dev base (only if you run a local API)
const DEV_BASE =
  Platform.select({
    ios: 'http://localhost:8787',     // iOS Simulator
    android: 'http://10.0.2.2:8787',  // Android Emulator
  }) || 'http://192.168.1.50:8787';   // Physical device → replace with your LAN IP

// In production (Vercel), web can use same-origin; native should call the deployed domain.
const PROD_WEB = (typeof window !== 'undefined' && window.location?.origin) || 'https://<your-project>.vercel.app';
const PROD_NATIVE = 'https://<your-project>.vercel.app'; // replace after first deploy

export const API_BASE = __DEV__
  ? DEV_BASE
  : (Platform.OS === 'web' ? PROD_WEB : PROD_NATIVE);

export const ENDPOINTS = {
  health: `${API_BASE}/api/health`,
  chatStream: `${API_BASE}/api/chat`,
  chatJson: `${API_BASE}/api/chat-json`,
};