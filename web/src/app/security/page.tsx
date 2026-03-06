import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap, ShieldCheck, Lock, UploadCloud } from "lucide-react";

export const metadata: Metadata = {
    title: "Security - ShadowTest",
    description: "Enterprise-grade security measures. Discover how we protect your product's code, URLs, and simulation data.",
};

export default function SecurityPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="px-6 h-16 flex items-center border-b border-border/40 bg-background/95 backdrop-blur">
                <Link className="flex items-center gap-2 font-bold text-lg" href="/">
                    <img src="/logo.png" alt="ShadowTest Logo" className="h-8 w-8 rounded-md" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">ShadowTest</span>
                </Link>
                <nav className="ml-auto flex gap-6 items-center">
                    <Link className="text-sm font-medium hover:text-primary" href="/features">Features</Link>
                    <Link className="text-sm font-medium hover:text-primary" href="/pricing">Pricing</Link>
                    <Link className="text-sm font-medium text-primary" href="/security">Security</Link>
                    <Link href="/signup"><Button size="sm">Get Started</Button></Link>
                </nav>
            </header>

            <main className="flex-1 py-20">
                <div className="container px-4 md:px-6 max-w-4xl mx-auto">
                    <div className="mb-16 text-center">
                        <ShieldCheck className="h-16 w-16 text-accent mx-auto mb-6" />
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-6">Security & Compliance</h1>
                        <p className="text-xl text-muted-foreground">We understand the sensitivity of handling your unreleased product links and GitHub repositories. ShadowTest ensures enterprise-level protections.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 mt-12">
                        <div className="bg-card p-8 rounded-xl border border-border/50">
                            <Lock className="h-8 w-8 text-primary mb-4" />
                            <h3 className="text-2xl font-bold mb-2">Secure Authentication</h3>
                            <p className="text-muted-foreground">We use industry-standard JSON Web Tokens (JWT) with 15-minute expiration logic and 7-day revolving refresh tokens. Auth infrastructure is fully backed by NextAuth ensuring proper OAuth 2.0 specs.</p>
                        </div>
                        <div className="bg-card p-8 rounded-xl border border-border/50">
                            <UploadCloud className="h-8 w-8 text-secondary mb-4" />
                            <h3 className="text-2xl font-bold mb-2">Data Isolation</h3>
                            <p className="text-muted-foreground">Simulation reports and reasoning traces are siloed per user in our PostgreSQL clusters. Private GitHub repository ingestion is strictly ephemeral during simulation runs and destroyed post-run.</p>
                        </div>
                    </div>

                    <div className="mt-16 bg-muted/20 p-8 rounded-xl border border-border/30 text-center">
                        <h3 className="text-xl font-bold mb-4">Want to talk compliance?</h3>
                        <p className="text-muted-foreground mb-6">If your Enterprise requires SOC2 reporting or DPA agreements, we accommodate dedicated requests for Pro and higher tiers.</p>
                        <Link href="/contact"><Button>Contact Security Team</Button></Link>
                    </div>
                </div>
            </main>
            <footer className="w-full py-6 flex justify-center border-t border-border/40 bg-background text-xs text-muted-foreground">
                © 2026 ShadowTest Inc. All rights reserved.
            </footer>
        </div>
    );
}
