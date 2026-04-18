"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Users,
  Settings,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { title: "대시보드", href: "/", icon: LayoutDashboard },
  { title: "상담 신청", href: "/consultations", icon: MessageSquare },
  { title: "계약서", href: "/contracts", icon: FileText },
  { title: "고객관리", href: "/customers", icon: Users },
]

const bottomNavItems = [
  { title: "설정", href: "/settings", icon: Settings },
]

export function MobileSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/life-form.png" alt="생활폼 오피스" width={28} height={28} />
          <span>생활폼 오피스</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Bottom Nav */}
      <div className="space-y-1 p-2">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
