<script setup>
import { ref, onMounted, computed } from 'vue'
import { listSpecies, searchSpecies, getSpecies } from './api/trefle'

// Firebase / Firestore
import { db } from './firebase'
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc
} from 'firebase/firestore'

// Auth helpers reutilizados de la Pokédex
import { listenToAuthChanges, logoutUser } from './lib/auth'

// Formulario de autenticación
import AuthForm from './components/AuthForm.vue'

// límite de páginas en modo exploración
const MAX_PAGES = 5

// listado principal
const species = ref([])
const loading = ref(false)
const error = ref(null)
const page = ref(1)
const hasMore = ref(true)

// estado del buscador
const query = ref('')
const isSearching = ref(false)

// mostrar solo favoritos
const showFavoritesOnly = ref(false)

// estado de detalles
const selectedPlant = ref(null)
const detailsLoading = ref(false)
const detailsError = ref(null)

// favoritos (ahora sincronizados con Firestore)
const favoriteIds = ref(new Set())
const favoritePlants = ref([])

// usuario actual de Firebase
const user = ref(null)

// para desuscribirse de la colección de favoritos cuando cambie el usuario
let favoritesUnsubscribe = null

// -------- helpers favoritos (versión Firebase) --------
function isFavorite(plant) {
  if (!plant || plant.id == null) return false
  return favoriteIds.value.has(plant.id)
}

async function toggleFavorite(plant) {
  if (!plant || plant.id == null) return

  if (!user.value) {
    alert('Debes iniciar sesión para guardar tus favoritos en la nube.')
    return
  }

  const plantIdStr = String(plant.id)
  const favRef = doc(db, 'users', user.value.uid, 'plantFavorites', plantIdStr)

  const alreadyFav = favoriteIds.value.has(plant.id)

  try {
    if (alreadyFav) {
      // quitar de favoritos
      await deleteDoc(favRef)
    } else {
      // agregar a favoritos
      await setDoc(favRef, {
        common_name: plant.common_name ?? null,
        scientific_name: plant.scientific_name ?? null,
        image_url: plant.image_url ?? null,
        family: plant.family ?? null,
        addedAt: new Date()
      })
    }
    // No actualizamos manualmente favoritePlants/favoriteIds:
    // onSnapshot mantiene todo sincronizado.
  } catch (e) {
    console.error('Error al cambiar favorito', e)
    alert('Ocurrió un error al actualizar tus favoritos.')
  }
}

// lista que realmente se muestra en el grid
const visibleSpecies = computed(() =>
  showFavoritesOnly.value ? favoritePlants.value : species.value
)

// ---------- carga de datos (explorar / buscar) ----------

async function loadBrowsePage(p) {
  if (p > MAX_PAGES) {
    hasMore.value = false
    return
  }

  loading.value = true
  error.value = null
  try {
    const res = await listSpecies(p)

    const cleaned = res.data.filter(
      (plant) => plant.common_name && plant.image_url
    )

    if (p === 1) {
      species.value = cleaned
    } else {
      species.value = [...species.value, ...cleaned]
    }

    if (!res.links || !res.links.next || p >= MAX_PAGES) {
      hasMore.value = false
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function loadSearchPage(p) {
  const q = query.value.trim()
  if (!q) return

  loading.value = true
  error.value = null
  try {
    const res = await searchSpecies(q, p)

    const cleaned = res.data.filter(
      (plant) => plant.common_name && plant.image_url
    )

    if (p === 1) {
      species.value = cleaned
    } else {
      species.value = [...species.value, ...cleaned]
    }

    if (!res.links || !res.links.next) {
      hasMore.value = false
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// login/logout manejados por Firebase + helpers
async function logout() {
  try {
    await logoutUser()
  } catch (e) {
    console.error('Error al cerrar sesión', e)
  }
}

onMounted(() => {
  // escuchar cambios en la sesión de Firebase (login/logout)
  listenToAuthChanges((firebaseUser) => {
    user.value = firebaseUser

    // si ya había una suscripción de favoritos, la limpiamos
    if (favoritesUnsubscribe) {
      favoritesUnsubscribe()
      favoritesUnsubscribe = null
    }

    if (firebaseUser) {
      // escuchamos los favoritos de este usuario en Firestore
      const favsRef = collection(db, 'users', firebaseUser.uid, 'plantFavorites')

      favoritesUnsubscribe = onSnapshot(favsRef, (snapshot) => {
        const arr = []
        const ids = new Set()

        snapshot.forEach((d) => {
          const data = d.data()
          const idNum = Number(d.id)
          const id = Number.isNaN(idNum) ? d.id : idNum

          arr.push({ id, ...data })
          ids.add(id)
        })

        favoritePlants.value = arr
        favoriteIds.value = ids
      })
    } else {
      // sin usuario → sin favoritos
      favoritePlants.value = []
      favoriteIds.value = new Set()
    }
  })

  // cargar la primera página de exploración
  loadBrowsePage(page.value)
})

async function loadMore() {
  if (loading.value || !hasMore.value) return
  page.value += 1

  if (isSearching.value) {
    await loadSearchPage(page.value)
  } else {
    await loadBrowsePage(page.value)
  }
}

async function handleSearch() {
  const q = query.value.trim()

  if (!q) {
    // si limpian el input, regresamos a modo exploración
    if (isSearching.value) {
      isSearching.value = false
      page.value = 1
      hasMore.value = true
      await loadBrowsePage(page.value)
    }
    return
  }

  // si el usuario busca, salimos de modo favoritos
  showFavoritesOnly.value = false

  isSearching.value = true
  page.value = 1
  hasMore.value = true
  await loadSearchPage(page.value)
}

async function clearSearch() {
  query.value = ''
  isSearching.value = false
  page.value = 1
  hasMore.value = true
  error.value = null
  await loadBrowsePage(page.value)
}

// cambiar entre vista normal y solo favoritos
function toggleFavoritesView() {
  if (showFavoritesOnly.value) {
    // regresar a todas
    showFavoritesOnly.value = false
  } else {
    // mostrar solo favoritos
    showFavoritesOnly.value = true
    isSearching.value = false
    query.value = ''
    error.value = null
  }
}

// ---------- Detalles ----------

async function openDetails(plant) {
  detailsLoading.value = true
  detailsError.value = null
  selectedPlant.value = null

  try {
    const res = await getSpecies(plant.id)
    selectedPlant.value = res.data
  } catch (e) {
    detailsError.value = e.message
  } finally {
    detailsLoading.value = false
  }
}

function closeDetails() {
  selectedPlant.value = null
  detailsError.value = null
}
</script>

<template>
  <div class="app">
    <header class="header">
      <span class="logo">🌱</span>
      <h1 class="title">EcoDex - Plantas</h1>
    </header>

    <!-- BARRA DE USUARIO -->
    <section class="user-bar">
      <template v-if="user">
        <span class="user-info">
          Conectado como:
          <strong>{{ user.displayName || user.email }}</strong>
        </span>

        <button
          class="btn secondary"
          @click="logout"
        >
          Cerrar sesión
        </button>
      </template>

      <template v-else>
        <AuthForm />
      </template>
    </section>

    <!-- BUSCADOR + BOTÓN FAVORITOS -->
    <section class="search-bar">
      <input
        v-model="query"
        type="text"
        placeholder="Buscar por nombre común o científico..."
        @keyup.enter="handleSearch"
      />
      <button
        class="btn primary"
        @click="handleSearch"
        :disabled="loading"
      >
        {{ loading && isSearching ? 'Buscando...' : 'Buscar' }}
      </button>
      <button
        v-if="isSearching || query"
        class="btn secondary"
        @click="clearSearch"
        :disabled="loading"
      >
        Limpiar
      </button>

      <button
        class="btn tertiary"
        @click="toggleFavoritesView"
        :disabled="loading && !showFavoritesOnly"
      >
        {{
          showFavoritesOnly
            ? 'Ver todas las plantas'
            : `Ver favoritos (${favoritePlants.length})`
        }}
      </button>
    </section>

    <p class="mode-label">
      {{
        showFavoritesOnly
          ? 'Mostrando tus plantas favoritas'
          : isSearching
            ? 'Mostrando resultados de búsqueda'
            : 'Explorando especies populares'
      }}
    </p>

    <main class="main">
      <p v-if="error" class="error">Error: {{ error }}</p>

      <p
        v-if="showFavoritesOnly && favoritePlants.length === 0"
        class="empty-favs"
      >
        Todavía no tienes plantas en favoritos. Marca alguna con la ⭐.
      </p>

      <section class="grid">
        <article
          v-for="p in visibleSpecies"
          :key="p.id"
          class="card"
          @click="openDetails(p)"
        >
          <!-- botón estrella en la card -->
          <button
            class="favorite-toggle"
            @click.stop="toggleFavorite(p)"
            :aria-pressed="isFavorite(p)"
          >
            <span v-if="isFavorite(p)">★</span>
            <span v-else>☆</span>
          </button>

          <div class="image-wrapper" v-if="p.image_url">
            <img
              :src="p.image_url"
              :alt="p.scientific_name"
            />
          </div>

          <h2 class="sci-name">
            {{ p.scientific_name }}
          </h2>

          <p class="common-name">
            {{ p.common_name || 'Sin nombre común' }}
          </p>

          <p v-if="p.family" class="family">
            {{ p.family }}
          </p>
        </article>
      </section>

      <div class="actions">
        <button
          v-if="!showFavoritesOnly && hasMore"
          class="load-more"
          @click="loadMore"
          :disabled="loading"
        >
          {{ loading ? 'Cargando...' : 'Cargar más plantas' }}
        </button>

        <p v-else-if="!showFavoritesOnly" class="no-more">
          No hay más resultados.
        </p>
      </div>
    </main>

    <!-- MODAL DE DETALLES -->
    <div
      v-if="detailsLoading || detailsError || selectedPlant"
      class="backdrop"
      @click.self="closeDetails"
    >
      <div class="modal">
        <button class="close-btn" @click="closeDetails">✕</button>

        <p v-if="detailsLoading" class="details-loading">
          Cargando detalles...
        </p>

        <p v-else-if="detailsError" class="error">
          Error al cargar detalles: {{ detailsError }}
        </p>

        <div v-else-if="selectedPlant" class="details">
          <div class="details-header">
            <h2>{{ selectedPlant.common_name || 'Sin nombre común' }}</h2>
            <p class="details-sci">
              {{ selectedPlant.scientific_name }}
            </p>
          </div>

          <div class="details-body">
            <div class="details-image" v-if="selectedPlant.image_url">
              <img :src="selectedPlant.image_url" :alt="selectedPlant.scientific_name" />
            </div>

            <ul class="details-info">
              <li v-if="selectedPlant.family">
                <strong>Familia:</strong> {{ selectedPlant.family }}
              </li>
              <li v-if="selectedPlant.genus">
                <strong>Género:</strong> {{ selectedPlant.genus }}
              </li>
              <li v-if="selectedPlant.year">
                <strong>Año de descripción:</strong> {{ selectedPlant.year }}
              </li>
              <li v-if="selectedPlant.author">
                <strong>Autor:</strong> {{ selectedPlant.author }}
              </li>
              <li v-if="selectedPlant.status">
                <strong>Estatus:</strong> {{ selectedPlant.status }}
              </li>
            </ul>
          </div>

          <div class="details-footer">
            <button
              class="fav-btn"
              @click="toggleFavorite(selectedPlant)"
            >
              {{ isFavorite(selectedPlant) ? 'Quitar de favoritos' : 'Agregar a favoritos' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #111;
  color: #f5f5f5;
  padding: 2rem 1rem 3rem;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.logo {
  font-size: 2.5rem;
}

.title {
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

/* BARRA DE USUARIO */
.user-bar {
  max-width: 800px;
  margin: 0 auto 0.75rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  color: #e5e7eb;
}

.user-info strong {
  color: #a5b4fc;
}

/* BUSCADOR */
.search-bar {
  max-width: 800px;
  margin: 0 auto 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.search-bar input {
  flex: 1 1 200px;
  padding: 0.55rem 0.75rem;
  border-radius: 999px;
  border: 1px solid #27272a;
  background: #18181b;
  color: #f9fafb;
  outline: none;
}

.search-bar input::placeholder {
  color: #6b7280;
}

.btn {
  padding: 0.55rem 1rem;
  border-radius: 999px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.btn.primary {
  background: #22c55e;
  color: #111827;
}

.btn.primary:hover:not(:disabled) {
  background: #16a34a;
  box-shadow: 0 8px 20px rgba(34, 197, 94, 0.35);
  transform: translateY(-1px);
}

.btn.secondary {
  background: #27272a;
  color: #e5e7eb;
}

.btn.secondary:hover:not(:disabled) {
  background: #3f3f46;
  transform: translateY(-1px);
}

.btn.tertiary {
  background: transparent;
  color: #e5e7eb;
  border: 1px solid #3f3f46;
}

.btn.tertiary:hover:not(:disabled) {
  background: #18181b;
  transform: translateY(-1px);
}

.mode-label {
  text-align: center;
  font-size: 0.9rem;
  color: #9ca3af;
  margin-bottom: 1.25rem;
}

.main {
  max-width: 1100px;
  margin: 0 auto;
}

.error {
  text-align: center;
  color: #ff6b6b;
  margin-bottom: 1rem;
}

.empty-favs {
  text-align: center;
  color: #9ca3af;
  margin-bottom: 1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.card {
  background: #1b1b1b;
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
  position: relative;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 35px rgba(0, 0, 0, 0.55);
  border-color: rgba(34, 197, 94, 0.5);
}

.favorite-toggle {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fbbf24;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
}

.favorite-toggle span {
  transform: translateY(-1px);
}

.favorite-toggle:hover {
  background: rgba(15, 23, 42, 0.9);
}

.image-wrapper {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 0.75rem;
  margin-bottom: 0.5rem;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sci-name {
  font-size: 1rem;
  font-weight: 700;
}

.common-name {
  font-size: 0.95rem;
  color: #cbd5f5;
}

.family {
  font-size: 0.8rem;
  color: #9ca3af;
}

.actions {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.load-more {
  padding: 0.75rem 1.5rem;
  border-radius: 999px;
  border: none;
  background: #22c55e;
  color: #111;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
}

.load-more:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(34, 197, 94, 0.35);
  background: #16a34a;
}

.load-more:disabled {
  opacity: 0.6;
  cursor: default;
}

.no-more {
  color: #9ca3af;
}

/* MODAL DETALLES */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  z-index: 50;
}

.modal {
  position: relative;
  background: #020617;
  border-radius: 1.25rem;
  padding: 1.5rem;
  max-width: 700px;
  width: 100%;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.4);

  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.close-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 1.25rem;
  cursor: pointer;
}

.close-btn:hover {
  color: #e5e7eb;
}

.details-loading {
  text-align: center;
  color: #e5e7eb;
}

/* la sección de detalles hace scroll */
.details {
  margin-top: 0.5rem;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.details-header h2 {
  font-size: 1.4rem;
  margin-bottom: 0.25rem;
}

.details-sci {
  font-size: 0.95rem;
  color: #9ca3af;
}

.details-body {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}

.details-image {
  flex: 1 1 220px;
}

.details-image img {
  width: 100%;
  border-radius: 0.75rem;
  object-fit: cover;
}

.details-info {
  flex: 1 1 220px;
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.details-info strong {
  color: #e5e7eb;
}

.details-footer {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.fav-btn {
  padding: 0.6rem 1.4rem;
  border-radius: 999px;
  border: none;
  background: #22c55e;
  color: #111827;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.1s ease, box-shadow 0.1s ease, transform 0.1s ease;
}

.fav-btn:hover {
  background: #16a34a;
  box-shadow: 0 10px 25px rgba(34, 197, 94, 0.4);
  transform: translateY(-1px);
}

@media (max-width: 640px) {
  .search-bar {
    flex-direction: column;
  }

  .search-bar .btn {
    width: 100%;
  }

  .user-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .details-body {
    flex-direction: column;
  }

  .details-footer {
    justify-content: center;
  }
}
</style>
