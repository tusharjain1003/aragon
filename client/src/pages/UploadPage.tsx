import { useState, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import type { UploadItem } from '../components/FileListItem'
import {
  ChevronDown,
  ChevronUp,
  Check,
  ClipboardList,
  Sun,
  User,
  Eye,
  Expand,
  Image,
  Ban,
  UserCheck,
  Hash,
  Minimize,
  XCircle,
  Trash2,
  ImageUp,
} from 'lucide-react'
import { api } from '../lib/api'
import { UploadDropzone } from '../components/UploadDropzone'
import { AcceptedGrid } from '../components/AcceptedGrid'
import { RejectedGrid } from '../components/RejectedGrid'
import { SessionGrid } from '../components/SessionGrid'
import { ThemeToggle } from '../components/ThemeToggle'
import type { ImagesResponse } from '../types'

function Collapsible({
  title,
  icon,
  children,
  defaultOpen = false,
  compact = false,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  compact?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`border border-border rounded-xl overflow-hidden bg-surface ${compact ? '' : 'h-full flex flex-col'}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 text-left hover:bg-surface-muted transition-colors ${compact ? 'px-3 py-2.5' : 'px-5 py-4'}`}
      >
        {icon}
        <span className={`flex-1 font-medium text-text ${compact ? 'text-xs' : 'text-sm'}`}>{title}</span>
        {open ? (
          <ChevronUp className={`text-text-dim ${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
        ) : (
          <ChevronDown className={`text-text-dim ${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
        )}
      </button>
      {open && <div className={compact ? 'px-3 pb-3 space-y-2' : 'px-5 pb-5 space-y-3 flex-1'}>{children}</div>}
    </div>
  )
}

function Requirement({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-text-dim">
      <span className="text-violet-500 mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function Restriction({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-text-dim">
      <span className="text-red-400 mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function ConfirmDeleteModal({
  open,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  open: boolean
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-surface border border-border shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-1 self-center">
            <Trash2 className="w-5 h-5 text-rose-400" />
          </div>
          <h2 className="text-base font-semibold text-text">Delete all images?</h2>
          <p className="text-sm text-text-dim leading-relaxed">
            This will permanently remove all uploaded photos. You'll need to start over.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 h-9 rounded-lg border border-border text-sm font-medium text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 h-9 rounded-lg bg-rose-500 hover:bg-rose-600 text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete all'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: acceptedData, isLoading: acceptedLoading } = useQuery({
    queryKey: ['images', 'ACCEPTED'],
    queryFn: () => api.get<ImagesResponse>('/api/images?status=ACCEPTED&limit=50'),
  })
  const { data: rejectedData, isLoading: rejectedLoading } = useQuery({
    queryKey: ['images', 'REJECTED'],
    queryFn: () => api.get<ImagesResponse>('/api/images?status=REJECTED&limit=50'),
  })

  const removeSessionImage = useCallback((imageId: string) => {
    setItems((prev) => prev.filter((i) => i.result?.id !== imageId))
  }, [])

  const confirmDeleteAll = useCallback(async () => {
    setIsDeleting(true)
    try {
      // Cancel any in-progress uploads
      const inProgress = items.filter((i) => i.pendingId && i.status !== 'success' && i.status !== 'error')
      await Promise.allSettled(inProgress.map((i) => api.cancelUpload(i.pendingId!)))

      // Collect all completed image IDs (deduplicated)
      const ids = [
        ...new Set<string>([
          ...(acceptedData?.items ?? []).map((i) => i.id),
          ...(rejectedData?.items ?? []).map((i) => i.id),
          ...items.filter((i) => i.result?.id).map((i) => i.result!.id),
        ])
      ]
      await api.delMany(ids)

      setItems([])
      queryClient.setQueryData(['images', 'ACCEPTED'], { items: [], nextCursor: null })
      queryClient.setQueryData(['images', 'REJECTED'], { items: [], nextCursor: null })
      toast.success('All images deleted')
      setShowDeleteModal(false)
    } finally {
      setIsDeleting(false)
    }
  }, [items, acceptedData, rejectedData, queryClient])

  // IDs tracked in session — exclude from historical query lists to avoid duplicates
  const sessionImageIds = useMemo(
    () => new Set(items.flatMap((i) => [i.pendingId, i.result?.id]).filter(Boolean) as string[]),
    [items]
  )

  const sessionAccepted = useMemo(
    () => items.filter((i) => i.status === 'success' && i.result?.status === 'ACCEPTED').map((i) => i.result!),
    [items]
  )

  // Session images that finished as REJECTED — shown in RejectedGrid, not SessionGrid
  const sessionRejected = useMemo(
    () => items.filter((i) => i.status === 'success' && i.result?.status === 'REJECTED').map((i) => i.result!),
    [items]
  )

  const accepted = (acceptedData?.items ?? []).filter((img) => !sessionImageIds.has(img.id))
  const rejected = [
    ...(rejectedData?.items ?? []).filter((img) => !sessionImageIds.has(img.id)),
    ...sessionRejected,
  ].sort((a, b) => a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)

  const hasSessionContent = items.some(
    (i) => i.status === 'requesting' || i.status === 'uploading' || i.status === 'validating' || i.status === 'error'
  )
  const showAccepted = acceptedLoading || sessionAccepted.length > 0 || accepted.length > 0
  const showRejected = rejected.length > 0

  // Exclude rejected items — they're already counted in rejected.length via sessionRejected
  const sessionCount = items.filter(
    (i) => i.status !== 'error' && i.result?.status !== 'REJECTED'
  ).length
  const total = accepted.length + rejected.length + sessionCount
  const target = Math.max(total, 10)
  const progressPct = target === 0 ? 0 : Math.round(
    (accepted.length + items.filter((i) => i.result?.status === 'ACCEPTED').length) / target * 100
  )
  const isGreen = progressPct >= 80

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background transition-colors duration-300">
      {/* ── Left panel ── */}
      <aside className="w-full md:w-96 md:h-screen md:shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-border bg-surface-muted/50 md:sticky md:top-0 md:overflow-y-auto">
        <div className="p-6 pb-0 flex flex-col gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="photo-badge py-1">
                <ImageUp className="w-3 h-3 text-accent" />
                PhotoUpload
              </div>
              <ThemeToggle />
            </div>
            <h1 className="text-xl font-semibold text-text leading-tight">Add Your Photos</h1>
            <p className="mt-2 text-sm text-text-dim leading-relaxed">
              Select at least{' '}
              <strong className="text-text font-semibold">6 high-quality portraits.</strong>{' '}
              A mix of close-ups, selfies, and mid-range shots helps the AI
              capture your look accurately.
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <UploadDropzone items={items} setItems={setItems} />
        </div>

        {/* Guidelines pinned to bottom of sidebar */}
        <div className="shrink-0 px-5 pb-4 pt-2 border-t border-border">
          <Collapsible
            title="Photo Guidelines"
            icon={<ClipboardList className="w-4 h-4 text-accent shrink-0" />}
            defaultOpen
            compact
          >
            <div className="grid grid-cols-1 gap-4 pt-1">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-2">
                  <Check className="w-3 h-3" /> Requirements
                </p>
                <div className="space-y-2">
                  <Requirement icon={<Sun className="w-4 h-4" />} text="Well-lit with face visible" />
                  <Requirement icon={<User className="w-4 h-4" />} text="One person per photo" />
                  <Requirement icon={<Eye className="w-4 h-4" />} text="Face fills enough of the frame" />
                  <Requirement icon={<Expand className="w-4 h-4" />} text="At least 800×800px &amp; 50KB" />
                  <Requirement icon={<Image className="w-4 h-4" />} text="JPEG, PNG, or HEIC" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-2">
                  <XCircle className="w-3 h-3" /> Avoid
                </p>
                <div className="space-y-2">
                  <Restriction icon={<Ban className="w-4 h-4" />} text="Blurry or out-of-focus shots" />
                  <Restriction icon={<UserCheck className="w-4 h-4" />} text="Group photos" />
                  <Restriction icon={<Hash className="w-4 h-4" />} text="Near-duplicates" />
                  <Restriction icon={<Minimize className="w-4 h-4" />} text="Images under 800×800px" />
                </div>
              </div>
            </div>
          </Collapsible>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <main className="flex-1 md:h-full md:overflow-y-auto">
        {/* Progress bar — sticky on desktop */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex items-center gap-3 sm:gap-4">
            <span className="text-sm font-medium text-text shrink-0">Accepted</span>
            <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: isGreen
                    ? 'linear-gradient(90deg, #7c3aed, #6366f1)'
                    : 'linear-gradient(90deg, #f43f5e, #f97316, #fbbf24)',
                }}
              />
            </div>
            <span className="text-sm text-text-dim shrink-0 tabular-nums">
              {accepted.length + items.filter((i) => i.result?.status === 'ACCEPTED').length}{' '}
              <span className="text-text-mute">of {target}</span>
            </span>
            {(total > 0 || items.length > 0) && (
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={isDeleting}
                title="Delete all images"
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
          <div className="space-y-8 md:space-y-10">
            <AnimatePresence mode="popLayout">
              {hasSessionContent && (
                <motion.div
                  key="session-section"
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
                  exit={{ opacity: 0, y: -12, transition: { duration: 0.2, ease: 'easeIn' } }}
                >
                  <SessionGrid items={items} />
                </motion.div>
              )}

              {showAccepted && (
                <motion.div
                  key="accepted-section"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  layout="position"
                >
                  <AcceptedGrid
                    images={accepted}
                    sessionImages={sessionAccepted}
                    onSessionImageDeleted={removeSessionImage}
                    isLoading={acceptedLoading}
                  />
                </motion.div>
              )}

              {showRejected && (
                <motion.div
                  key="rejected-section"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  layout="position"
                >
                  <RejectedGrid
                    images={rejected}
                    isLoading={rejectedLoading}
                    acceptedCount={accepted.length + items.filter((i) => i.result?.status === 'ACCEPTED').length}
                  />
                </motion.div>
              )}

              {!acceptedLoading && !rejectedLoading && total === 0 && items.length === 0 && (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.15 } }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-24 text-center"
                >
                  <div className="w-20 h-20 rounded-3xl bg-surface-muted flex items-center justify-center mb-5 border border-border group-hover:border-accent/30 transition-colors">
                    <Image className="w-8 h-8 text-text-mute" />
                  </div>
                  <p className="text-base font-semibold text-text">No photos yet</p>
                  <p className="text-sm text-text-mute mt-1.5 max-w-xs mx-auto leading-relaxed">
                    Add your portraits from the panel on the left
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <ConfirmDeleteModal
        open={showDeleteModal}
        isDeleting={isDeleting}
        onConfirm={confirmDeleteAll}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  )
}
