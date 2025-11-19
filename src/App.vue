<script setup>
import { ref, onMounted } from 'vue'
import { listSpecies, searchSpecies } from './api/trefle'

const MAX_PAGES = 5 // limite de paginas en modo exploracion

const species = ref([])
const loading = ref(false)
const error = ref(null)
const page = ref(1)
const hasMore = ref(true)

// estado del buscador
const query = ref('')
const isSearching = ref(false)

async function loadBrowsePage(p) {
  // no pasarnos del maximo
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
  if (!q) {
    return
  }

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

  // si queda vacio el input, regresamos a modo exploracion
  if (!q) {
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
</script>

<template>
  <div class="app">
    <header class="header">
      <span class="logo">🌱</span>
      <h1 class="title">EcoDex - Plantas</h1>
    </header>

    <main class="main">
      <!-- 🔍 BUSCADOR -->
      <section class="search-bar">
        <input
          v-model="query"
          type="text"
          class="search-input"
          placeholder="Buscar por nombre común o científico..."
          @keyup.enter="handleSearch"
        />
        <button
          class="search-button"
          @click="handleSearch"
          :disabled="loading"
        >
          Buscar
        </button>
        <button
          v-if="isSearching"
          class="clear-button"
          @click="clearSearch"
          :disabled="loading"
        >
          Limpiar
        </button>
      </section>

      <p v-if="error" class="error">Error: {{ error }}</p>

      <section class="grid">
        <article
          v-for="p in species"
          :key="p.id"
          class="card"
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
          {{ loading ? 'Cargando...' : (isSearching ? 'Cargar más resultados' : 'Cargar más plantas') }}
        </button>

        <p v-else class="no-more">
          No hay más resultados.
        </p>
      </div>
    </main>
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
  margin-bottom: 2rem;
}

.logo {
  font-size: 2.5rem;
}

.title {
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.main {
  max-width: 1100px;
  margin: 0 auto;
}

/* 🔍 estilos del buscador */
.search-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.search-input {
  flex: 1 1 240px;
  max-width: 420px;
  padding: 0.6rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #181818;
  color: #f5f5f5;
  outline: none;
}

.search-input::placeholder {
  color: #6b7280;
  font-size: 0.9rem;
}

.search-button,
.clear-button {
  padding: 0.6rem 1.2rem;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
}

.search-button {
  background: #22c55e;
  color: #111;
}

.search-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.35);
  background: #16a34a;
}

.clear-button {
  background: #374151;
  color: #e5e7eb;
}

.clear-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.6);
  background: #4b5563;
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
</style>
