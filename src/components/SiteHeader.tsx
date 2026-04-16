import { Link, useNavigate } from "react-router-dom";
import { Activity, Building2, ChevronDown, Code2, FileClock, FileText, LifeBuoy, Lock, Mail, Menu, Shield, Sparkles, Tags, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navGroups = [
  {
    label: "Product",
    items: [
      { label: "Features", description: "Professional mail tools", path: "/features", icon: Sparkles },
      { label: "Solutions", description: "Use cases and workflows", path: "/solutions", icon: Users },
      { label: "Pricing", description: "Plans and future upgrades", path: "/pricing", icon: Tags },
      { label: "Security", description: "Privacy and protection", path: "/security", icon: Shield },
    ],
  },
  {
    label: "Developers",
    items: [
      { label: "Documentation", description: "API reference and guides", path: "/docs", icon: FileText },
      { label: "Developer Console", description: "OAuth apps and API keys", path: "/developers", icon: Code2 },
    ],
  },
  {
    label: "Company",
    items: [
      { label: "About", description: "Mission and values", path: "/about", icon: Building2 },
      { label: "Contact", description: "Support and inquiries", path: "/contact", icon: LifeBuoy },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Help Center", description: "Guides and support", path: "/help", icon: LifeBuoy },
      { label: "Status", description: "System availability", path: "/status", icon: Activity },
      { label: "Changelog", description: "Product updates", path: "/changelog", icon: FileClock },
      { label: "Privacy", description: "How data is handled", path: "/privacy", icon: Lock },
      { label: "Terms", description: "Service policies", path: "/terms", icon: FileText },
    ],
  },
];

export function SiteHeader() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" data-testid="link-home">
          <img src="/logo.png" alt="AfuChat Mail" className="h-8 w-8" width={32} height={32} />
          <span className="text-base font-black tracking-tight sm:text-lg">AfuChat Mail</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          <NavigationMenu>
            <NavigationMenuList className="gap-0">
              {navGroups.map((group) => (
                <NavigationMenuItem key={group.label}>
                  <NavigationMenuTrigger
                    className="h-10 rounded-xl bg-transparent px-3 text-sm font-bold text-muted-foreground hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
                    data-testid={`button-nav-${group.label.toLowerCase()}`}
                  >
                    {group.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="rounded-2xl border-border bg-popover p-2 shadow-lg">
                    <div className="w-72">
                      <p className="px-3 pb-1 pt-2 text-xs uppercase tracking-wider text-muted-foreground font-bold">
                        {group.label}
                      </p>
                      <div className="my-1 h-px bg-border" />
                      {group.items.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="flex items-start gap-3 rounded-xl p-3 hover:bg-accent transition-colors"
                          data-testid={`link-nav-${item.label.toLowerCase()}`}
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                            <item.icon className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block text-sm font-bold text-foreground">{item.label}</span>
                            <span className="block text-xs font-medium text-muted-foreground">{item.description}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button
            variant="ghost"
            className="rounded-xl font-bold"
            onClick={() => navigate("/auth")}
            data-testid="button-sign-in"
          >
            Sign in
          </Button>
          <Button
            className="rounded-xl font-bold shadow-none"
            onClick={() => navigate("/auth")}
            data-testid="button-get-started"
          >
            Get started
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-sm p-0">
              <div className="border-b border-border p-5">
                <SheetTitle className="flex items-center gap-2.5 text-base font-black">
                  <img src="/logo.png" alt="AfuChat Mail" className="h-8 w-8" width={32} height={32} />
                  AfuChat Mail
                </SheetTitle>
                <SheetDescription className="mt-2 text-sm">
                  Professional email for modern work.
                </SheetDescription>
              </div>
              <div className="space-y-5 p-5">
                {navGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">{group.label}</p>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <SheetClose asChild key={item.path}>
                          <Link
                            to={item.path}
                            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold hover:bg-muted"
                            data-testid={`link-mobile-${item.label.toLowerCase()}`}
                          >
                            <item.icon className="h-4 w-4 text-primary" />
                            {item.label}
                          </Link>
                        </SheetClose>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="grid gap-2 border-t border-border pt-5">
                  <SheetClose asChild>
                    <Button variant="outline" className="h-11 rounded-xl font-bold" onClick={() => navigate("/auth")}>
                      Sign in
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button className="h-11 rounded-xl font-bold shadow-none" onClick={() => navigate("/auth")}>
                      Create account
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
