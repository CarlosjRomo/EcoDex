<script setup>
import { ref } from 'vue'
import { loginUser, registerUser, loginWithGoogle } from '../lib/auth'

const email = ref('')
const password = ref('')
const isLogin = ref(true)
const message = ref('')

async function handleAuth() {
  try {
    if (isLogin.value) {
      await loginUser(email.value, password.value)
      message.value = 'Sesión iniciada ✅'
    } else {
      await registerUser(email.value, password.value)
      message.value = 'Usuario registrado 🎉'
    }
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

async function handleGoogleLogin() {
  try {
    await loginWithGoogle()
    message.value = 'Sesión iniciada con Google ✅'
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}
</script>

<template>
  <div class="auth-container">
    <h2>{{ isLogin ? 'Iniciar sesión' : 'Registrarse' }}</h2>

    <input v-model="email" type="email" placeholder="Correo electrónico" />
    <input v-model="password" type="password" placeholder="Contraseña" />

    <button @click="handleAuth">
      {{ isLogin ? 'Entrar' : 'Registrar' }}
    </button>

    <button @click="handleGoogleLogin" class="google">
      🔥 Iniciar con Google
    </button>

    <p class="switch">
      <span @click="isLogin = !isLogin">
        {{ isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión' }}
      </span>
    </p>

    <p v-if="message" class="msg">{{ message }}</p>
  </div>
</template>

<style scoped>
.auth-container {
  max-width: 360px;
  margin: 5rem auto;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  background: #fff;
  text-align: center;
}

input {
  width: 100%;
  padding: .7rem;
  margin: .5rem 0;
  border: 1px solid #ddd;
  border-radius: .5rem;
}

button {
  width: 100%;
  margin-top: 1rem;
  padding: .7rem;
  border: none;
  border-radius: .5rem;
  cursor: pointer;
}

button.google {
  background: #db4437;
  color: white;
}

button:hover { filter: brightness(1.05); }

.switch span {
  color: #007bff;
  cursor: pointer;
  text-decoration: underline;
}

.msg { margin-top: 1rem; color: #444; }
</style>
