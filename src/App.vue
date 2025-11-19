<script setup>
import { ref, onMounted } from 'vue'
import { listSpecies, searchSpecies, getSpecies } from './api/trefle'

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

// estado de detalles
const selectedPlant = ref(null)
const detailsLoading = ref(false)
const detailsError = ref(null)

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

onMounted(() => {
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

// ---------- Detalles ----------

async function openDetails(plant) {
  detailsLoading.value = true
  detailsError.value = null
  selectedPlant.value = null

  try {
    const res = await getSpecies(plant.id)
    // la API de Trefle regresa { data: {...} }
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

    <!-- BUSCADOR -->
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
    </section>

    <p class="mode-label">
      {{ isSearching ? 'Mostrando resultados de búsqueda' : 'Explorando especies populares' }}
    </p>

    <main class="main">
      <p v-if="error" class="error">Error: {{ error }}</p>

      <section class="grid">
        <article
          v-for="p in species"
          :key="p.id"
          class="card"
          @click="openDetails(p)"
        >
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
          v-if="hasMore"
          class="load-more"
          @click="loadMore"
          :disabled="loading"
        >
          {{ loading ? 'Cargando...' : 'Cargar más plantas' }}
        </button>

        <p v-else class="no-more">
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
  margin-bottom: 1.5rem;
}

.logo {
  font-size: 2.5rem;
}

.title {
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

/* BUSCADOR */
.search-bar {
  max-width: 600px;
  margin: 0 auto 0.5rem;
  display: flex;
  gap: 0.5rem;
}

.search-bar input {
  flex: 1;
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
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 35px rgba(0, 0, 0, 0.55);
  border-color: rgba(34, 197, 94, 0.5);
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

@media (max-width: 640px) {
  .search-bar {
    flex-direction: column;
  }

  .search-bar .btn {
    width: 100%;
  }
}
</style>