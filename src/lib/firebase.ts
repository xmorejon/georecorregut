import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'georecorregut',
  appId: '1:591461101049:web:cd25344250ea1fb3fda128',
  storageBucket: 'georecorregut.firebasestorage.app',
  apiKey: 'AIzaSyAJeTVGraafrtfYO2XUS9Owjt_LqCZw2xQ',
  authDomain: 'georecorregut.firebaseapp.com',
  messagingSenderId: '591461101049',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
