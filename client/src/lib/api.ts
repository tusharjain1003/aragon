import type { Image } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export interface UploadUrlResponse {
  uploadUrl: string
  storagePath: string
  id: string
}

export const api = {
  get: <T>(path: string) =>
    request<T>(path, { headers: { 'Content-Type': 'application/json' } }),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  del: async (path: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok && res.status !== 404) throw new Error(`Delete failed: HTTP ${res.status}`)
  },

  delMany: async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return
    const res = await fetch(`${BASE_URL}/api/images`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) throw new Error(`Bulk delete failed: HTTP ${res.status}`)
  },

  requestUploadUrl: (filename: string, mimeType: string) =>
    request<UploadUrlResponse>('/api/images/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, mimeType }),
    }),

  uploadDirect: async (uploadUrl: string, file: File): Promise<void> => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })
    if (!res.ok) throw new Error(`Direct upload failed: HTTP ${res.status}`)
  },

  validateUpload: (id: string) =>
    request<{ id: string; status: string }>(`/api/images/${id}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }),

  getImage: async (id: string): Promise<Image | null> => {
    const res = await fetch(`${BASE_URL}/api/images/${id}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },

  cancelUpload: (id: string) =>
    fetch(`${BASE_URL}/api/images/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }),
}
