import Link from "next/link";
import { Zap, LayoutDashboard, Users, Activity, FileText, Settings, Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/20">
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
                {/* Desktop Sidebar */}
                <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-border bg-card sm:flex">
                    <div className="flex h-16 shrink-0 items-center px-6 border-b border-border/50">
                        <Link className="flex items-center gap-2 font-bold text-xl px-2" href="/">
                            <img src="/logo.png" alt="ShadowTest Logo" className="h-8 w-8 rounded-md" />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                                ShadowTest
                            </span>
                        </Link>
                    </div>
                    <nav className="flex-1 overflow-auto py-4">
                        <ul className="grid gap-1 px-4">
                            <li>
                                <Link href="/dashboard" className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 text-primary transition-all hover:text-primary">
                                    <LayoutDashboard className="h-4 w-4" />
                                    Projects
                                </Link>
                            </li>
                            <li>
                                <Link href="/dashboard/personas" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground">
                                    <Users className="h-4 w-4" />
                                    Personas
                                </Link>
                            </li>
                            <li>
                                <Link href="/dashboard/simulations" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground">
                                    <Activity className="h-4 w-4" />
                                    Simulations
                                </Link>
                            </li>
                            <li>
                                <Link href="/dashboard/reports" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground">
                                    <FileText className="h-4 w-4" />
                                    Reports
                                </Link>
                            </li>
                        </ul>
                    </nav>
                    <div className="mt-auto p-4 border-t border-border/50">
                        <Link href="/dashboard/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground">
                            <Settings className="h-4 w-4" />
                            Settings
                        </Link>
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="sm:ml-64 flex flex-col flex-1">
                    {/* Topbar */}
                    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-background/95 px-4 sm:px-6 backdrop-blur">
                        <div className="relative mx-auto flex-1 md:grow-0">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search projects..."
                                className="w-full rounded-lg bg-background pl-8 md:w-[300px] lg:w-[400px]"
                            />
                        </div>
                        <div className="ml-auto flex items-center gap-4">
                            <UserButton />
                        </div>
                    </header>

                    <main className="flex-1 p-4 sm:p-6 lg:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
