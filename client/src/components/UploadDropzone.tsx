import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { toast } from 'sonner'
import { Loader2, ImageUp } from 'lucide-react'
import { api } from '../lib/api'
import { FileListItem, type UploadItem } from './FileListItem'
import type { ImagesResponse } from '../types'

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
}

const MAX_SIZE = 15 * 1024 * 1024

function makeId() {
  return Math.random().toString(36).slice(2)
}

function setItemField(
  prev: UploadItem[],
  clientId: string,
  patch: Partial<UploadItem>
): UploadItem[] {
  return prev.map((it) => (it.clientId === clientId ? { ...it, ...patch } : it))
}

interface Props {
  items: UploadItem[]
  setItems: React.Dispatch<React.SetStateAction<UploadItem[]>>
}

export function UploadDropzone({ items, setItems }: Props) {
  const queryClient = useQueryClient()
  const isUploading = items.some(
    (i) => i.status === 'requesting' || i.status === 'uploading' || i.status === 'validating'
  )

  // Handles upload + validation for a single file once its URL is known.
  // Called in parallel — URL requests happen sequentially before this to preserve order.
  const processFile = useCallback(
    async (file: File, clientId: string, uploadUrl: string, pendingId: string) => {
      try {
        // Step 1 — PUT bytes directly to Supabase
        await api.uploadDirect(uploadUrl, file)
        setItems((prev) => setItemField(prev, clientId, { status: 'validating' }))

        // Step 2 — kick off async validation (returns 202 immediately)
        await api.validateUpload(pendingId)

        // Step 3 — poll GET /api/images/:id every 2s until status leaves PENDING_UPLOAD
        const POLL_INTERVAL = 2000
        const POLL_TIMEOUT = 120_000
        const deadline = Date.now() + POLL_TIMEOUT

        let result = null
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL))
          const image = await api.getImage(pendingId)

          // null = 404 — file was never uploaded or download failed
          if (image === null) {
            setItems((prev) => setItemField(prev, clientId, { status: 'error', error: 'Upload not found' }))
            toast.error(`${file.name}: Upload not found`)
            return
          }

          if (image.status !== 'PENDING_UPLOAD') {
            result = image
            break
          }
        }

        if (!result) throw new Error('Validation timed out — please try again')

        setItems((prev) => setItemField(prev, clientId, { status: 'success', result }))

        // Seed result into the query cache so AcceptedGrid/RejectedGrid show it
        // immediately after the item is removed from session state below.
        queryClient.setQueryData<ImagesResponse>(
          ['images', result.status],
          (old) => old
            ? { ...old, items: [...old.items, result] }
            : { items: [result], nextCursor: null }
        )

        // Remove from sidebar — image is now in the cache so the grid won't flicker.
        // Errors are kept so the user can see which files failed (no card appears for them).
        setTimeout(() => {
          setItems((prev) => prev.filter((it) => it.clientId !== clientId))
        }, 3000)
      } catch (err) {
        const message = (err as Error).message || 'Upload failed'
        setItems((prev) => setItemField(prev, clientId, { status: 'error', error: message }))
        toast.error(`${file.name}: ${message}`)
        api.cancelUpload(pendingId).catch(() => undefined)
      }
    },
    [queryClient]
  )

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      rejected.forEach((r) => {
        const code = r.errors[0]?.code
        if (code === 'file-too-large') toast.error(`${r.file.name}: exceeds 15 MB limit`)
        else if (code === 'file-invalid-type') toast.error(`${r.file.name}: unsupported format`)
        else toast.error(`${r.file.name}: rejected`)
      })

      const newItems: UploadItem[] = accepted.map((file) => ({
        clientId: makeId(),
        file,
        status: 'requesting' as const,
      }))

      setItems((prev) => [...newItems, ...prev])

      // Upload-URL requests are sequential so the server assigns CUIDs in selection order.
      // Each file's upload starts immediately once its URL arrives, so uploads run in parallel.
      ;(async () => {
        for (const { file, clientId } of newItems) {
          try {
            const { uploadUrl, id } = await api.requestUploadUrl(file.name, file.type)
            setItems((prev) => setItemField(prev, clientId, { status: 'uploading', pendingId: id }))
            processFile(file, clientId, uploadUrl, id) // fire-and-forget
          } catch (err) {
            const message = (err as Error).message || 'Upload failed'
            setItems((prev) => setItemField(prev, clientId, { status: 'error', error: message }))
            toast.error(`${file.name}: ${message}`)
          }
        }
      })()
    },
    [processFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: true,
  })

  return (
    <div className="flex flex-col md:h-full md:overflow-hidden p-6 gap-3">
      <div
        {...getRootProps()}
        className={[
          'flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-10 cursor-pointer transition-all duration-300 shrink-0',
          isDragActive
            ? 'border-accent bg-accent/10 scale-[1.02] shadow-accent/20 shadow-lg animate-pulse-ring'
            : 'border-accent/20 hover:border-accent bg-surface hover:bg-accent/5 hover:shadow-md hover:scale-[1.01]',
        ].join(' ')}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-1">
          <div className={isUploading ? '' : 'animate-float'}>
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            ) : (
              <ImageUp className="w-8 h-8 text-accent/70" />
            )}
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-text">
            {isUploading ? 'Uploading photos…' : isDragActive ? 'Drop your photos here' : 'Upload your photos'}
          </p>
          <p className="text-xs text-text-dim">
            {isDragActive
              ? 'Release to start uploading'
              : 'Drag and drop or click to browse'}
          </p>
          <p className="text-[11px] text-text-mute">PNG, JPG, HEIC &middot; Up to 15MB each</p>
        </div>

        <button
          type="button"
          className="photo-btn w-full justify-center pointer-events-none mt-1"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <ImageUp className="w-4 h-4" />
              Browse files
            </>
          )}
        </button>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col md:flex-1 min-h-0">
          <p className="text-[10px] text-text-mute px-1 mb-2">
            It can take up to 1 minute to upload
          </p>
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 pr-1 custom-scrollbar max-h-[300px] md:max-h-none">
            {items.map((item) => (
              <FileListItem key={item.clientId} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
