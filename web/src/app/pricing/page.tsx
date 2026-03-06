import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
    title: "Pricing - ShadowTest",
    description: "Transparent pricing for AI-driven UX testing. Start free with 3 simulations, or scale to enterprise.",
};

export default function PricingPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="px-6 h-16 flex items-center border-b border-border/40 bg-background/95 backdrop-blur">
                <Link className="flex items-center gap-2 font-bold text-lg" href="/">
                    <img src="/logo.png" alt="ShadowTest Logo" className="h-8 w-8 rounded-md" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">ShadowTest</span>
                </Link>
                <nav className="ml-auto flex gap-6 items-center">
                    <Link className="text-sm font-medium hover:text-primary transition-colors" href="/features">Features</Link>
                    <Link className="text-sm font-medium text-primary" href="/pricing">Pricing</Link>
                    <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
                    <Link href="/signup"><Button size="sm">Get Started</Button></Link>
                </nav>
            </header>

            <main className="flex-1 py-20 flex flex-col items-center">
                <div className="container px-4 md:px-6 max-w-6xl">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-6">Pricing Plans</h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Scale your synthetic user testing as your codebase and traffic grows.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 items-stretch pt-8">
                        <Card className="border-border bg-card/50 flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-2xl">Free</CardTitle>
                                <div className="text-5xl font-bold mt-4">$0<span className="text-xl font-normal text-muted-foreground">/mo</span></div>
                                <CardDescription className="mt-4">Perfect for indie hackers and side projects.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm text-foreground flex-1 mt-4">
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-muted-foreground" /> 3 simulations / month</div>
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-muted-foreground" /> 1 project limit</div>
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-muted-foreground" /> Basic personas only</div>
                                <div className="flex items-center gap-3 text-muted-foreground/50"><CheckCircle2 className="h-5 w-5 opacity-50" /> GitHub Repo Analysis</div>
                            </CardContent>
                            <CardFooter>
                                <Link href="/signup" className="w-full">
                                    <Button variant="outline" className="w-full h-12">Start Building Free</Button>
                                </Link>
                            </CardFooter>
                        </Card>

                        <Card className="border-primary bg-card relative scale-105 shadow-2xl shadow-primary/10 flex flex-col z-10">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">Most Popular</div>
                            <CardHeader>
                                <CardTitle className="text-2xl text-primary">Starter</CardTitle>
                                <div className="text-5xl font-bold mt-4">$29<span className="text-xl font-normal text-muted-foreground">/mo</span></div>
                                <CardDescription className="mt-4">For fast-growing startups requiring constant behavioral validation.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm text-foreground flex-1 mt-4">
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> 100 simulations / month</div>
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> 10 project limits</div>
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Unlimited personas</div>
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Custom persona creation</div>
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Live URL Analysis</div>
                            </CardContent>
                            <CardFooter>
                                <Link href="/signup" className="w-full">
                                    <Button className="w-full h-12 text-base">Start 14-Day Free Trial</Button>
                                </Link>
                            </CardFooter>
                        </Card>

                        <Card className="border-border bg-card/50 flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-2xl">Pro</CardTitle>
                                <div className="text-5xl font-bold mt-4">$99<span className="text-xl font-normal text-muted-foreground">/mo</span></div>
                                <CardDescription className="mt-4">For professional dev teams and agencies managing multiple spaces.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm text-foreground flex-1 mt-4">
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-muted-foreground" /> 1,000 simulations / month</div>
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-muted-foreground" /> Unlimited projects</div>
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-muted-foreground" /> Team collaboration (5 seats)</div>
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-muted-foreground" /> GitHub Repository Analysis</div>
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-muted-foreground" /> Priority Support</div>
                            </CardContent>
                            <CardFooter>
                                <Link href="/signup" className="w-full">
                                    <Button variant="outline" className="w-full h-12">Upgrade to Pro</Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
            <footer className="w-full py-6 flex justify-center border-t border-border/40 bg-background text-xs text-muted-foreground">
                © 2026 ShadowTest Inc. All rights reserved.
            </footer>
        </div>
    );
}
