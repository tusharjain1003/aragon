export type RejectionReason =
  | 'TOO_SMALL'
  | 'INVALID_FORMAT'
  | 'DUPLICATE'
  | 'BLURRY'
  | 'FACE_TOO_SMALL'
  | 'MULTIPLE_FACES'
  | 'NO_FACE'
  | 'PROCESSING_FAILED'

export type ImageStatus = 'PENDING_UPLOAD' | 'ACCEPTED' | 'REJECTED'

export interface Image {
  id: string
  filename: string
  publicUrl: string
  status: ImageStatus
  rejectionReasons: RejectionReason[]
  fileSize: number
  width: number
  height: number
  mimeType: string
  createdAt: string
  storagePath?: string
  pHash?: string | null
  updatedAt?: string
}

export interface ImagesResponse {
  items: Image[]
  nextCursor: string | null
}
