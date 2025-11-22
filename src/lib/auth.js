// src/lib/auth.js
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from 'firebase/auth'
import { app } from '../firebase' // 👈 IMPORTANTE: ruta RELATIVA, sin @

export const auth = getAuth(app)

// ✅ Registrar usuario con correo y contraseña
export async function registerUser(email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

// ✅ Iniciar sesión con correo y contraseña
export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

// ✅ Iniciar sesión con Google
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  return result.user
}

// ✅ Cerrar sesión
export async function logoutUser() {
  await signOut(auth)
}

// ✅ Detectar cambios de sesión
export function listenToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback)
}
