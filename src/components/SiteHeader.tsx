import { Link, useNavigate } from "react-router-dom";
import { Activity, Building2, Code2, FileClock, FileText, LifeBuoy, Lock, Menu, Shield, Sparkles, Tags, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    label: "Platform",
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
    label: "Docs",
    items: [
      { label: "About", description: "Mission and values", path: "/about", icon: Building2 },
      { label: "Contact", description: "Support and inquiries", path: "/contact", icon: LifeBuoy },
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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2" data-testid="link-home">
          <img src="/logo.png" alt="AfuChat Mail" className="h-7 w-7" width={28} height={28} />
          <span className="text-sm font-semibold text-white tracking-tight">AfuChat Mail</span>
        </Link>

        <nav className="hidden items-center gap-0 lg:flex" aria-label="Primary navigation">
          <NavigationMenu>
            <NavigationMenuList className="gap-0">
              {navGroups.map((group) => (
                <NavigationMenuItem key={group.label}>
                  <NavigationMenuTrigger
                    className="h-9 rounded bg-transparent px-3 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white data-[state=open]:bg-white/8 data-[state=open]:text-white"
                    data-testid={`button-nav-${group.label.toLowerCase()}`}
                  >
                    {group.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="rounded border border-border bg-popover p-1 shadow-md">
                    <div className="w-60">
                      <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                        {group.label}
                      </p>
                      <div className="my-1 h-px bg-border" />
                      {group.items.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="flex items-center gap-2.5 rounded px-3 py-2 hover:bg-accent transition-colors"
                          data-testid={`link-nav-${item.label.toLowerCase()}`}
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span>
                            <span className="block text-sm font-medium text-foreground">{item.label}</span>
                            <span className="block text-xs text-muted-foreground">{item.description}</span>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded px-4 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white"
            onClick={() => navigate("/auth")}
            data-testid="button-sign-in"
          >
            Sign in
          </Button>
          <Button
            size="sm"
            className="h-9 rounded px-4 text-sm font-medium bg-white text-[#0a0a0a] hover:bg-white/90 shadow-none"
            onClick={() => navigate("/auth")}
            data-testid="button-get-started"
          >
            Get started
          </Button>
        </div>

        <div className="flex items-center md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded text-white hover:bg-white/10" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm p-0 bg-[#0a0a0a] border-white/10">
              <div className="border-b border-white/10 p-5">
                <SheetTitle className="flex items-center gap-2 text-sm font-semibold text-white">
                  <img src="/logo.png" alt="AfuChat Mail" className="h-7 w-7" width={28} height={28} />
                  AfuChat Mail
                </SheetTitle>
                <SheetDescription className="mt-1 text-xs text-white/40">
                  Professional email platform
                </SheetDescription>
              </div>
              <div className="space-y-5 p-5">
                {navGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">{group.label}</p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <SheetClose asChild key={item.path}>
                          <Link
                            to={item.path}
                            className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white"
                            data-testid={`link-mobile-${item.label.toLowerCase()}`}
                          >
                            <item.icon className="h-4 w-4 text-white/30" />
                            {item.label}
                          </Link>
                        </SheetClose>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="grid gap-2 border-t border-white/10 pt-5">
                  <SheetClose asChild>
                    <Button variant="outline" className="h-10 rounded font-medium border-white/20 text-white bg-transparent hover:bg-white/10" onClick={() => navigate("/auth")}>
                      Sign in
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button className="h-10 rounded font-medium bg-white text-[#0a0a0a] hover:bg-white/90 shadow-none" onClick={() => navigate("/auth")}>
                      Get started
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
