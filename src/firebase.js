// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAG0bc5tq2lXbPYcNd3MRA49hoap4XCMgY",
  authDomain: "pokedexsergioromojohana.firebaseapp.com",
  projectId: "pokedexsergioromojohana",
  storageBucket: "pokedexsergioromojohana.appspot.com",
  messagingSenderId: "12593166113",
  appId: "1:12593166113:web:8b7c4c40c1887452367060",
  measurementId: "G-X9724MRC3Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
