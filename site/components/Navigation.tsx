import { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Menu, User, LogOut, FolderOpen, Settings, Home } from "lucide-react"
import { Button } from "@tab-app-switcher/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tab-app-switcher/ui/components/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@tab-app-switcher/ui/components/sheet"
import { useAuth } from "@tas/hooks/useAuth"
import { NavLink } from "./NavLink"
import { ThemeToggle } from "./ThemeToggle"
import logo from "@/assets/logo.jpg"

// Main nav items (right to left in the UI: User, Theme, Downloads, About, Home)
const mainNavItems = [
  { to: "/about", label: "About" },
  { to: "/downloads", label: "Downloads" },
]

export interface SubnavItem {
  to: string
  label: string
}

interface NavigationProps {
  /** Optional slot to render above the main nav row (e.g., demo tabs preview) */
  topSlot?: ReactNode
  /** Optional slot to render on the left side of the nav row (e.g., help button on landing) */
  leftSlot?: ReactNode
  /** Optional subnav items to show below the main nav */
  subnavItems?: SubnavItem[]
}

export function Navigation({ topSlot, leftSlot, subnavItems }: NavigationProps) {
  const { user, isLoading, signIn, signOut } = useAuth()

  const avatarUrl = user?.user_metadata?.avatar_url
  const userName = user?.user_metadata?.full_name || user?.email

  const navLinkClass = "px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
  const activeNavLinkClass = "text-foreground"

  // Default left content: logo and title
  const defaultLeftContent = (
    <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <img src={logo} alt="TAS" className="w-8 h-8 rounded-lg" />
      <span className="text-sm font-medium text-foreground hidden sm:inline">Tab Application Switcher</span>
    </Link>
  )

  return (
    <header className="bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      {/* Optional top slot (e.g., demo tabs) */}
      {topSlot}

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - custom slot or default logo/title */}
          <div className="flex items-center">{leftSlot ?? defaultLeftContent}</div>

          {/* Right side - nav items */}
          <div className="flex items-center gap-1">
            {/* Desktop Nav - right aligned: Home icon, About, Downloads, Theme, User */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" className={navLinkClass} activeClassName={activeNavLinkClass} end>
                <Home className="w-4 h-4" />
              </NavLink>
              {mainNavItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass} activeClassName={activeNavLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <ThemeToggle />

            {/* Auth - Desktop */}
            <div className="hidden md:block">
              {isLoading ? (
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={userName || "User"} className="w-8 h-8 rounded-full" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{userName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/collections">
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Collections
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/account">
                        <Settings className="mr-2 h-4 w-4" />
                        Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="icon" onClick={signIn}>
                  <User className="w-5 h-5" />
                </Button>
              )}
            </div>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Site navigation links</SheetDescription>
                <nav className="flex flex-col gap-2 mt-8">
                  <NavLink to="/" className={navLinkClass} activeClassName={activeNavLinkClass} end>
                    Home
                  </NavLink>
                  {mainNavItems.map((item) => (
                    <NavLink key={item.to} to={item.to} className={navLinkClass} activeClassName={activeNavLinkClass}>
                      {item.label}
                    </NavLink>
                  ))}
                  {subnavItems && subnavItems.length > 0 && (
                    <>
                      <div className="h-px bg-border my-2" />
                      {subnavItems.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={navLinkClass}
                          activeClassName={activeNavLinkClass}
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </>
                  )}
                  {user && (
                    <>
                      <div className="h-px bg-border my-2" />
                      <NavLink to="/collections" className={navLinkClass} activeClassName={activeNavLinkClass}>
                        Collections
                      </NavLink>
                      <NavLink to="/account" className={navLinkClass} activeClassName={activeNavLinkClass}>
                        Account
                      </NavLink>
                    </>
                  )}
                  <div className="h-px bg-border my-2" />
                  {user ? (
                    <Button variant="ghost" className="justify-start" onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  ) : (
                    <Button variant="ghost" className="justify-start" onClick={signIn}>
                      Sign in with Google
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Subnav */}
      {subnavItems && subnavItems.length > 0 && (
        <div className="hidden md:block bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <nav className="flex items-center gap-1 py-2">
              {subnavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-foreground"
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
