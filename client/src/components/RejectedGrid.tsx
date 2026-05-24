import { ListX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImageCard } from './ImageCard'
import type { Image } from '../types'

interface Props {
  images: Image[]
  isLoading: boolean
  acceptedCount: number
}

export function RejectedGrid({ images, isLoading, acceptedCount }: Props) {
  if (isLoading || images.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-2 mb-1">
          <ListX className="w-4 h-4 text-rose-400 shrink-0" />
          <h2 className="text-base font-semibold text-text">
            Needs Attention ({images.length})
          </h2>
        </div>
        <p className="text-sm text-text-dim">
          {acceptedCount > 0
            ? `You have ${acceptedCount} good photo${acceptedCount !== 1 ? 's' : ''} — replacing these is optional.`
            : 'Review the guidelines and try uploading different photos.'}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <AnimatePresence initial={false}>
          {images.map((img) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.25, ease: 'easeOut' } }}
            >
              <ImageCard image={img} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
