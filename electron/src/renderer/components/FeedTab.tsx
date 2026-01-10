"use client"

import { useRef } from "react"
import type { Post } from "../../shared/types"

interface FeedTabProps {
  posts: Post[]
  tailnetUrl: string
  onUploadFile: (file: File) => void
}

export function FeedTab({ posts, tailnetUrl, onUploadFile }: FeedTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="h-full flex flex-col p-4">
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
          className="w-full py-2.5 rounded-lg glass-light flex items-center justify-center gap-2 text-sm hover:bg-secondary/80 transition-colors"
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
            <div key={post.id} className="glass-light rounded-xl p-3 animate-slide-in">
              {post.type === "screenshot" ? (
                <div>
                  <img
                    src={getDownloadUrl(post) || "/placeholder.svg"}
                    alt={post.caption || "Screenshot"}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                  {post.caption && <p className="text-sm mb-2">{post.caption}</p>}
                </div>
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
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
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
