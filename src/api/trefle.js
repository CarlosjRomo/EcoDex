const TOKEN = import.meta.env.VITE_TREFLE_TOKEN

const API_BASE_PATH = '/trefle/api/v1'
const ORIGIN = window.location.origin

async function fetchJson(path, params = {}) {
  const url = new URL(API_BASE_PATH + path, ORIGIN)

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, v)
    }
  })

  url.searchParams.set('token', TOKEN)

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return res.json()
}

export function listSpecies(page = 1) {
  return fetchJson('/species', { page })
}

// 🔍 Buscar especies por texto
export function searchSpecies(q, page = 1) {
  return fetchJson('/species/search', { q, page })
}

export function getSpecies(id) {
  return fetchJson(`/species/${id}`)
}
