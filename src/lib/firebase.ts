import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, deleteUser as firebaseDeleteUser, User } from 'firebase/auth';
import { getFirestore,setLogLevel, Firestore } from 'firebase/firestore';
import { doc, deleteDoc, collection, getDocs, query, setDoc } from 'firebase/firestore';


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
const db: Firestore = getFirestore(app);

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

// New function to get unique countries and continents for all users
const getAllUsersUniqueLocationsData = async () => {
  const usersRef = collection(db, 'users');
  const usersSnapshot = await getDocs(usersRef);
  const allUsersUniqueData: { [key: string]: { countries: string[], continents: string[] } } = {};
  const uniqueCountries = new Set<string>();
 const uniqueContinents = new Set<string>();

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const locationsRef = collection(db, 'users', userId, 'locations');
    const locationsSnapshot = await getDocs(locationsRef);

    locationsSnapshot.docs.forEach(locationDoc => {
      const locationData = locationDoc.data();
      // console.log('Processing location:', locationDoc.id, locationData.country, locationData.continent); // Optional: Log individual location data
      if (locationData.country) {
        uniqueCountries.add(locationData.country);
      }
      if (locationData.continent) {
        uniqueContinents.add(locationData.continent);
      }
    });

    allUsersUniqueData[userId] = {
      countries: Array.from(uniqueCountries),
      continents: Array.from(uniqueContinents),
    };
  }
  return allUsersUniqueData;
};
export { app, auth, db, deleteUser, deleteUserDocument, getAllUsersUniqueLocationsData, doc, setDoc };
