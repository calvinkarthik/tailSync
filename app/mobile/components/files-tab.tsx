"use client"

import { useRef } from "react"
import type { Post } from "../mobile-app"

interface FilesTabProps {
  posts: Post[]
  hostUrl: string
  onUploadFile: (file: File) => void
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function isImage(post: Post) {
  if (post.mimeType?.startsWith("image/")) return true
  return /\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i.test(post.filename)
}

export function FilesTab({ posts, hostUrl, onUploadFile }: FilesTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getDownloadUrl = (post: Post) => `${hostUrl}${post.downloadUrl}`

  return (
    <div className="h-full flex flex-col relative">
      {/* Scrollable file list */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-20"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
      >
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[rgba(255,255,255,0.2)]">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[rgba(255,255,255,0.4)]">
              No files shared yet
            </p>
            <p className="text-xs text-[rgba(255,255,255,0.25)] mt-1">
              Tap the + button to share a file
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <a
                key={post.id}
                href={getDownloadUrl(post)}
                download={post.filename}
                className="ts-card block active:scale-[0.98] transition-transform duration-100"
              >
                {(post.type === "screenshot" || isImage(post)) ? (
                  <>
                    <div className="rounded-lg overflow-hidden mb-3 border border-[rgba(255,255,255,0.06)]">
                      <img
                        src={getDownloadUrl(post)}
                        alt={post.caption || post.filename}
                        className="w-full h-44 object-cover"
                        crossOrigin="anonymous"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{post.filename}</p>
                        <p className="text-xs text-[rgba(255,255,255,0.35)]">{formatSize(post.size)}</p>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-[rgba(91,42,214,0.12)] flex items-center justify-center shrink-0 ml-3">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b2ad6" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[rgba(255,255,255,0.4)]">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{post.filename}</p>
                      <p className="text-xs text-[rgba(255,255,255,0.35)]">{formatSize(post.size)}</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-[rgba(91,42,214,0.12)] flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b2ad6" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </div>
                  </div>
                )}

                {post.caption && (
                  <p className="text-xs text-[rgba(255,255,255,0.5)] mt-2">{post.caption}</p>
                )}

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.04)]">
                  <span className="text-[11px] text-[rgba(255,255,255,0.3)] font-medium">
                    {post.senderIdentity.deviceName}
                  </span>
                  <span className="text-[11px] text-[rgba(255,255,255,0.25)]">
                    {formatTime(post.createdAt)}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* FAB - Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUploadFile(file)
          e.target.value = ""
        }}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="absolute bottom-4 right-4 w-14 h-14 rounded-2xl bg-[#5b2ad6] text-white flex items-center justify-center shadow-[0_4px_24px_rgba(91,42,214,0.4)] active:scale-[0.93] transition-transform duration-100"
        aria-label="Upload file"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
