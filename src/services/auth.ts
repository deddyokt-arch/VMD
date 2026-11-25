// Web Crypto API SHA-256 Hashing & Auth Utilities
import { User, UserRole } from '../types';

export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const AUTH_USER_KEY = 'vaicafe_current_user';
const SUPERADMIN_SESSION_KEY = 'vaicafe_superadmin_session';
const SUPERADMIN_MFA_KEY = 'vaicafe_superadmin_mfa_verified';

// Expected SHA-256 hash for Superadmin password
export const SUPERADMIN_USERNAME = 'DiVailean';
export const SUPERADMIN_PASS_HASH = 'e82faef81543edca2bd02d08a543ec865be9f70d24c0ef550f214f7d4323c914';

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed: User = JSON.parse(raw);
    if (parsed.role === 'SUPERADMIN') {
      // Store POS must not run under SUPERADMIN session
      localStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  if (user && user.role !== 'SUPERADMIN') {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export function createSuperadminSessionUser(): User {
  return {
    user_id: 'user_superadmin_01',
    username: SUPERADMIN_USERNAME,
    password_hash: '',
    full_name: 'DiVailean (Superadmin Pusat)',
    role: 'SUPERADMIN',
    active: true,
    pin_hash: '',
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  };
}

export function getSuperadminSession(): User | null {
  try {
    const raw = localStorage.getItem(SUPERADMIN_SESSION_KEY);
    if (!raw) return null;
    const parsed: User = JSON.parse(raw);
    if (parsed.role !== 'SUPERADMIN' || !isSuperadminMFAVerified()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSuperadminSession(user: User | null): void {
  if (user && user.role === 'SUPERADMIN') {
    localStorage.setItem(SUPERADMIN_SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SUPERADMIN_SESSION_KEY);
    localStorage.removeItem(SUPERADMIN_MFA_KEY);
  }
}

export function isSuperadminMFAVerified(): boolean {
  return localStorage.getItem(SUPERADMIN_MFA_KEY) === 'true';
}

export function setSuperadminMFAVerified(verified: boolean): void {
  if (verified) {
    localStorage.setItem(SUPERADMIN_MFA_KEY, 'true');
  } else {
    localStorage.removeItem(SUPERADMIN_MFA_KEY);
  }
}

export async function verifySuperAdminCredentials(usernameInput: string, passwordInput: string): Promise<boolean> {
  const cleanUser = usernameInput.trim().toLowerCase();
  if (cleanUser !== SUPERADMIN_USERNAME.toLowerCase() && cleanUser !== 'divailean') {
    return false;
  }

  const hashed = await hashString(passwordInput);
  return hashed === SUPERADMIN_PASS_HASH;
}

export function hasPermission(currentUser: User | null, requiredRole: UserRole): boolean {
  if (!currentUser) return false;
  if (currentUser.role === 'SUPERADMIN') return true;
  if (currentUser.role === 'ADMIN') return requiredRole !== 'SUPERADMIN';
  return currentUser.role === requiredRole;
}
