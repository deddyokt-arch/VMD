import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing Firebase app instance if already created
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Workspace Scopes for Drive files & Google Spreadsheets
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate if we are currently in the middle of a sign-in flow
let isSigningIn = false;
// Cache the access token in memory (NEVER in localStorage/sessionStorage as required by Workspace integration guidelines)
let cachedAccessToken: string | null = null;
let cachedFirebaseUser: FirebaseUser | null = null;

// Listen to auth state changes to clear cached token on sign-out
export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    cachedFirebaseUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token was lost or not yet retrieved
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export interface GoogleAuthResult {
  user: FirebaseUser;
  accessToken: string;
}

// User-initiated Google Sign-In with OAuth 2.0 popup
export const googleSignIn = async (): Promise<GoogleAuthResult | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal memperoleh Google OAuth Access Token dari Firebase Auth.');
    }

    cachedAccessToken = credential.accessToken;
    cachedFirebaseUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentGoogleUser = (): FirebaseUser | null => {
  return cachedFirebaseUser || auth.currentUser;
};

export const googleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
    cachedFirebaseUser = null;
  }
};
