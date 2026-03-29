import { forwardRef, type AnchorHTMLAttributes } from "react"
import { cn } from "@tab-app-switcher/ui/lib/utils"

interface NavLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  className?: string
  activeClassName?: string
  /** When true, only match exact path (not prefix) */
  end?: boolean
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, end, href, ...props }, ref) => {
    const pathname = typeof window !== "undefined" ? window.location.pathname : ""
    const isActive = end ? pathname === href : pathname.startsWith(href)

    return <a ref={ref} href={href} className={cn(className, isActive && activeClassName)} {...props} />
  },
)

NavLink.displayName = "NavLink"

export { NavLink }
