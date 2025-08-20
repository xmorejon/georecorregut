import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, deleteUser as firebaseDeleteUser, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { doc, deleteDoc, collection, getDocs, query } from 'firebase/firestore';
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

const deleteUser = async (user: User) => {
  try {
    await firebaseDeleteUser(user);
  } catch (error) {
    throw error;
  }
};

const deleteUserDocument = async (uid: string) => {
  try {
    // Delete subcollections first (e.g., 'locations')
    const locationsRef = collection(db, 'users', uid, 'locations');
    const locationDocs = await getDocs(query(locationsRef));
    await Promise.all(locationDocs.docs.map(doc => deleteDoc(doc.ref)));

    // Delete the user document
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    console.error("Error deleting user document:", error);
    throw error;
  }
};
export { app, auth, db, deleteUser, deleteUserDocument };
