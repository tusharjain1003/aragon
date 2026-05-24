import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { rejectionMessages } from '../lib/rejectionMessages'
import type { Image, ImagesResponse } from '../types'

export function ImageCard({ image, onDeleted }: { image: Image; onDeleted?: () => void }) {
  const queryClient = useQueryClient()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => api.del(`/api/images/${image.id}`),
    onMutate: () => setDeleted(true),
    onSuccess: () => {
      const drop = (key: unknown[]) =>
        queryClient.setQueryData<ImagesResponse>(key, (old) =>
          old ? { ...old, items: old.items.filter((i) => i.id !== image.id) } : old,
        )
      drop(['images', 'ACCEPTED'])
      drop(['images', 'REJECTED'])
      queryClient.invalidateQueries({ queryKey: ['images'], refetchType: 'none' })
      toast.success('Image deleted')
      onDeleted?.()
    },
    onError: () => {
      setDeleted(false)
      toast.error('Failed to delete image')
    },
  })

  const handleImgLoad = useCallback(() => setImgLoaded(true), [])
  const handleImgError = useCallback(() => {
    setImgError(true)
    setImgLoaded(true)
  }, [])

  if (deleted) return null

  const primaryReason = image.rejectionReasons[0]
  const reasonMsg = primaryReason ? rejectionMessages[primaryReason] : null
  const showPlaceholder = imgError || (!image.publicUrl || image.publicUrl === '')

  return (
    <div className="flex flex-col gap-1.5 group/card">
      <div className="relative rounded-xl overflow-hidden aspect-square bg-surface border border-border transition-all duration-300 group-hover/card:shadow-lg group-hover/card:-translate-y-0.5">
        {/* Loading shimmer */}
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-shimmer z-10" />
        )}

        {/* Error / no-url placeholder */}
        {showPlaceholder ? (
          <div className="w-full h-full flex items-center justify-center text-text-dim text-xs">
            Preview unavailable
          </div>
        ) : (
          <img
            src={image.publicUrl}
            alt={image.filename}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={handleImgLoad}
            onError={handleImgError}
          />
        )}

        {/* Delete button — visible on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => deleteMutation.mutate()}
            className="w-8 h-8 rounded-full bg-background/90 border border-border flex items-center justify-center text-text-dim hover:text-accent hover:border-accent/40 hover:bg-background hover:scale-105 active:scale-95 transition-all"
            title="Delete image"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Rejection reason tooltip */}
        {reasonMsg && (
          <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="m-2 rounded-lg bg-background/95 border border-border p-3 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-semibold text-text mb-0.5">Try again</p>
              <p className="text-xs text-text-dim leading-relaxed">{reasonMsg.tooltip}</p>
            </div>
          </div>
        )}
      </div>

      {reasonMsg && (
        <p className="text-xs text-center text-text-dim underline underline-offset-2 decoration-dashed cursor-help truncate px-1">
          {reasonMsg.label}
        </p>
      )}
    </div>
  )
}
