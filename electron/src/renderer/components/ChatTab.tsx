"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import type { ChatMessage, Identity } from "../../shared/types"

interface ChatTabProps {
  messages: ChatMessage[]
  identity: Identity
  onSendMessage: (text: string) => void
}

export function ChatTab({ messages, identity, onSendMessage }: ChatTabProps) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onSendMessage(input.trim())
      setInput("")
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const isOwnMessage = (msg: ChatMessage) => {
    return msg.senderIdentity.deviceName === identity.deviceName
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
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
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col animate-fade-in ${isOwnMessage(msg) ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  isOwnMessage(msg)
                    ? "chat-accent-bg rounded-br-md"
                    : "glass-panel rounded-bl-md"
                }`}
              >
                <p className="text-sm break-words">{msg.text}</p>
              </div>
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-[10px] text-muted-foreground">{msg.senderIdentity.deviceName}</span>
                <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded-xl chat-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2 rounded-xl chat-accent-bg font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
