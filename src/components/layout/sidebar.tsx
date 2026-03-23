"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  BarChart3,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Users", href: "/users", icon: Users },
  { title: "Products", href: "/products", icon: Package },
  { title: "Orders", href: "/orders", icon: FileText },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
]

const bottomNavItems = [
  { title: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex h-full flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b px-4">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Package className="size-5 text-sidebar-primary" />
              <span>Lifeform Admin</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="mx-auto">
              <Package className="size-5 text-sidebar-primary" />
            </Link>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              )
            }

            return link
          })}
        </nav>

        <Separator />

        {/* Bottom Nav */}
        <div className="space-y-1 p-2">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href
            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              )
            }

            return link
          })}
        </div>

        {/* Collapse Toggle */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full", collapsed && "px-2")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <>
                <ChevronLeft className="size-4" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
