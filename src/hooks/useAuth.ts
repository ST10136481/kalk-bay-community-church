import { useState, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  AuthError,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { auth, storage } from '../lib/firebase';
import { toast } from 'sonner';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as databaseRef, set, serverTimestamp, get } from 'firebase/database';
import { database } from '../lib/firebase';

const DEFAULT_PROFILE_PIC = 'https://api.dicebear.com/7.x/avatars/svg?seed=default';

export function useAuth() {
  const [user, setUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    role: 'admin' | 'user';
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get user role from database
        const userRef = databaseRef(database, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        const role = snapshot.exists() ? snapshot.val().role : 'user';

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          role: role
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string, verificationCode: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check verification code
      const verificationRef = databaseRef(database, `verificationCodes/${user.uid}`);
      const snapshot = await get(verificationRef);
      
      if (!snapshot.exists()) {
        toast.error('Verification code not found');
        await signOut(auth);
        return false;
      }

      const data = snapshot.val();
      if (data.code !== verificationCode) {
        toast.error('Invalid verification code');
        await signOut(auth);
        return false;
      }

      if (!data.verified) {
        // Update verification status
        await set(verificationRef, {
          ...data,
          verified: true
        });
      }

      toast.success('Successfully logged in!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to login');
      return false;
    }
  };

  const signup = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    profilePic?: File
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Set default user role
      await set(databaseRef(database, `users/${user.uid}`), {
        role: 'user',
        email: email,
        createdAt: serverTimestamp()
      });

      // Generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the verification code in Firebase Realtime Database
      await set(databaseRef(database, `verificationCodes/${user.uid}`), {
        code: verificationCode,
        email: email,
        verified: false,
        createdAt: serverTimestamp()
      });

      // Upload profile picture if provided
      let photoURL = DEFAULT_PROFILE_PIC;
      if (profilePic) {
        const storageRef = ref(storage, `profilePics/${user.uid}`);
        await uploadBytes(storageRef, profilePic);
        photoURL = await getDownloadURL(storageRef);
      }

      // Update profile
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
        photoURL: photoURL
      });

      // Send verification code via email
      await sendEmailVerification(user, {
        url: window.location.origin,
        handleCodeInApp: true,
      });

      toast.success('Verification code sent! Please check your email.');
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