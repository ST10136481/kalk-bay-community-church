import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCb0v092bzJXn6fPllPi-Y57-2vAomX6o4",
  authDomain: "timereaper-4f20e.firebaseapp.com",
  databaseURL: "https://timereaper-4f20e-default-rtdb.firebaseio.com",
  projectId: "timereaper-4f20e",
  storageBucket: "timereaper-4f20e.appspot.com",
  messagingSenderId: "1025154133696",
  appId: "1:1025154133696:web:75476c3344ebd8d0bb0725",
  measurementId: "G-VLVEMWZTP3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);