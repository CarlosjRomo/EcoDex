
<script setup>

import { ref, onMounted } from 'vue'
import { listSpecies } from './api/trefle'

const MAX_PAGES = 7 // limite de paginas que se pueden cargar

const species = ref([])
const loading = ref(false)
const error = ref(null)
const page = ref(1)
const hasMore = ref(true)

async function loadPage(p) {
  loading.value = true
  error.value = null
  try {
    const res = await listSpecies(p)

    // solo plantas "mas conocidas": con nombre comun e imagen
    const cleaned = res.data.filter(
      (plant) => plant.common_name && plant.image_url
    )

    if (p === 1) {
      species.value = cleaned
    } else {
      species.value = [...species.value, ...cleaned]
    }

    // si ya no hay next O llegamos al limite de paginas, apagamos "cargar mas"
    if (!res.links || !res.links.next || p >= MAX_PAGES) {
      hasMore.value = false
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPage(page.value)
})

async function loadMore() {
  if (loading.value || !hasMore.value) return
  page.value += 1
  await loadPage(page.value)
}
</script>

<template>
  <div class="app">
    <header class="header">
      <span class="logo">🌱</span>
      <h1 class="title">EcoDex - Plantas</h1>
    </header>

    <main class="main">
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
          {{ loading ? 'Cargando...' : 'Cargar más plantas' }}
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
