
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Placeholder configuration. In a real environment, these would be injected.
const firebaseConfig = {
  apiKey: "AIzaSyCfUDCSA4ubUeVtoJxmlKBOlOAozaEMb_M",
  authDomain: "inventory-management-4eeab.firebaseapp.com",
  projectId: "inventory-management-4eeab",
  storageBucket: "inventory-management-4eeab.firebasestorage.app",
  messagingSenderId: "816685502552",
  appId: "1:816685502552:web:91653a6b548493dee7ba2d",
  measurementId: "G-EFEWMMTSR3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
