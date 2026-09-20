import { runFirebaseCommand } from './cli';

export interface FirebaseAuthStatus {
  authenticated: boolean;
  email?: string;
  error?: string;
}

export function checkFirebaseAuth(): FirebaseAuthStatus {
  const res = runFirebaseCommand<{ status: string; result: Array<{ user?: { email?: string } }> }>(['login:list', '--json']);

  if (!res.success) {
    return {
      authenticated: false,
      error: res.error || 'Failed to check Firebase authentication status',
    };
  }

  const user = res.data?.result?.[0]?.user;
  if (user && user.email) {
    return {
      authenticated: true,
      email: user.email,
    };
  }

  // If login:list returned empty or invalid, user is not logged in
  return {
    authenticated: false,
    error: 'No active Firebase login session found. Please run "firebase login"',
  };
}
