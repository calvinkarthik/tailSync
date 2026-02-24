"use client"

import { useState, useRef, useEffect } from "react"
import type { ChatMessage, Identity } from "../mobile-app"

interface ChatTabProps {
  messages: ChatMessage[]
  identity: Identity
  onSendMessage: (text: string) => void
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function ChatTab({ messages, identity, onSendMessage }: ChatTabProps) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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

  const isOwn = (msg: ChatMessage) =>
    msg.senderIdentity.deviceName === identity.deviceName

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 pt-4 pb-2"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[rgba(255,255,255,0.2)]">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[rgba(255,255,255,0.4)]">
              No messages yet
            </p>
            <p className="text-xs text-[rgba(255,255,255,0.25)] mt-1">
              Send a message to get started
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn(msg) ? "items-end" : "items-start"}`}
              >
                {!isOwn(msg) && (
                  <span className="text-[10px] text-[rgba(255,255,255,0.3)] mb-0.5 px-2 font-medium">
                    {msg.senderIdentity.deviceName}
                  </span>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    isOwn(msg)
                      ? "bg-[#5b2ad6] text-white rounded-br-md"
                      : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-white rounded-bl-md"
                  }`}
                >
                  <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
                </div>
                <span className="text-[10px] text-[rgba(255,255,255,0.2)] mt-0.5 px-2">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-3 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(5,5,10,0.95)] backdrop-blur-xl"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="ts-input flex-1 !py-2.5 !text-[15px]"
          enterKeyHint="send"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-10 h-10 rounded-xl bg-[#5b2ad6] text-white flex items-center justify-center shrink-0 disabled:opacity-30 active:scale-[0.93] transition-all duration-100"
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  )
}
