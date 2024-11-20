import { useState, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  AuthError
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { toast } from 'sonner';
import { onAuthStateChanged } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        });
      } else {
        setUser(null);
      }
    });
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Successfully logged in!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to login');
      return false;
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success('Successfully signed up!');
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Failed to sign up');
      return false;
    }
  };

  const loginWithGoogle = async () => {
    try {
      // Initialize Google Auth Provider
      const provider = new GoogleAuthProvider();
      
      // Add custom parameters
      provider.setCustomParameters({
        prompt: 'select_account',
        login_hint: 'user@example.com'
      });

      // Attempt sign in with specific error handling
      const result = await signInWithPopup(auth, provider);
      
      // Get the user credential
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential) {
        const token = credential.accessToken;
        console.log('Successfully obtained Google token:', token);
      }
      
      if (result.user) {
        toast.success('Successfully logged in with Google!');
        return true;
      }
      
      toast.error('Failed to login with Google');
      return false;
    } catch (error) {
      const authError = error as AuthError;
      console.error('Google login error:', authError);
      
      switch (authError.code) {
        case 'auth/popup-blocked':
          toast.error('Please enable popups for this website');
          break;
        case 'auth/popup-closed-by-user':
          toast.error('Login cancelled. Please try again.');
          break;
        case 'auth/cancelled-popup-request':
          // Ignore this error as it's common when multiple popups are attempted
          break;
        case 'auth/unauthorized-domain':
          toast.error('This domain is not authorized for Google login. Please contact support.');
          break;
        default:
          toast.error('Failed to login with Google. Please try again later.');
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  };

  return { user, loading, login, signup, loginWithGoogle, logout };
}