"use client"

import { useRef, useState, type DragEvent } from "react"
import type { Post } from "../../shared/types"

interface FeedTabProps {
  posts: Post[]
  tailnetUrl: string
  onUploadFile: (file: File) => void
}

export function FeedTab({ posts, tailnetUrl, onUploadFile }: FeedTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const getDownloadUrl = (post: Post) => {
    // Use tailnet URL for remote downloads, localhost for host
    const baseUrl = tailnetUrl.includes("127.0.0.1") ? tailnetUrl : tailnetUrl
    return `${baseUrl}${post.downloadUrl}`
  }

  const isImage = (post: Post) => {
    if (post.mimeType?.startsWith("image/")) return true
    return /\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i.test(post.filename)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      onUploadFile(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  return (
    <div
      className={`h-full flex flex-col p-4 rounded-xl ${
        isDragging ? "border-2 border-dashed border-primary/60 bg-primary/5" : ""
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {/* Upload button */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUploadFile(file)
            e.target.value = ""
          }}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 rounded-lg glass-panel flex items-center justify-center gap-2 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload File
        </button>
      </div>

      {/* Posts list */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {posts.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto mb-2 opacity-50"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            No posts yet. Take a screenshot or upload a file!
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="glass-panel rounded-xl p-3 animate-slide-in">
              {post.type === "screenshot" || isImage(post) ? (
                <a
                  href={getDownloadUrl(post)}
                  download={post.filename}
                  className="block group cursor-pointer"
                  title="Download"
                >
                  <div className="relative rounded-lg overflow-hidden mb-2 border border-border group-hover:border-primary/50 transition-colors">
                    <img
                      src={getDownloadUrl(post) || "/placeholder.svg"}
                      alt={post.caption || post.filename || "Image"}
                      className="w-full h-40 object-cover group-hover:opacity-95"
                    />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center justify-center text-xs font-medium text-primary-foreground/90" style={{
                      background:
                        "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.25), transparent 32%), radial-gradient(circle at 80% 25%, rgba(56,189,248,0.22), transparent 35%), radial-gradient(circle at 50% 80%, rgba(56,189,248,0.22), transparent 32%), linear-gradient(135deg, rgba(56,189,248,0.08), rgba(56,189,248,0.12))",
                    }}>
                      <span className="px-3 py-1 rounded-full bg-primary/70 backdrop-blur-sm shadow-sm">Click to download</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary">{post.filename}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(post.size)}</p>
                    </div>
                    <span className="p-2 rounded-lg transition-colors group-hover:bg-primary/10 group-hover:text-primary shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </span>
                  </div>
                  {post.caption && <p className="text-sm mt-1 group-hover:text-primary">{post.caption}</p>}
                </a>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-muted-foreground"
                    >
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.filename}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(post.size)}</p>
                  </div>
                  <a
                    href={getDownloadUrl(post)}
                    download={post.filename}
                    className="p-2 rounded-lg transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">{post.senderIdentity.deviceName}</span>
                <span className="text-xs text-muted-foreground">{formatTime(post.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
