import type React from "react"
import type { Metadata, Viewport } from "next"
import { Lexend_Deca } from "next/font/google"

const lexendDeca = Lexend_Deca({ subsets: ["latin"], variable: "--font-lexend" })

export const metadata: Metadata = {
  title: "tailSync Mobile",
  description: "Instant file sharing between your phone and laptop over Tailscale",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "tailSync",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#05050a",
}

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${lexendDeca.variable} ts-mobile-root`}>
      {children}
    </div>
  )
}
