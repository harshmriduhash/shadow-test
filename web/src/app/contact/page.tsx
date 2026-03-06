import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Zap, Mail, MessageSquare, MapPin } from "lucide-react";

export const metadata: Metadata = {
    title: "Contact Us - ShadowTest Support",
    description: "Get in touch with the ShadowTest team for sales inquiries, enterprise deployment support, or technical assistance.",
};

export default function ContactPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="px-6 h-16 flex items-center border-b border-border/40 bg-background/95 backdrop-blur">
                <Link className="flex items-center gap-2 font-bold text-lg" href="/">
                    <img src="/logo.png" alt="ShadowTest Logo" className="h-8 w-8 rounded-md" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">ShadowTest</span>
                </Link>
                <nav className="ml-auto flex gap-6 items-center">
                    <Link className="text-sm font-medium hover:text-primary transition-colors" href="/features">Features</Link>
                    <Link className="text-sm font-medium hover:text-primary transition-colors" href="/pricing">Pricing</Link>
                    <Link className="text-sm font-medium text-primary" href="/contact">Contact</Link>
                    <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
                    <Link href="/signup"><Button size="sm">Get Started</Button></Link>
                </nav>
            </header>

            <main className="flex-1 py-16">
                <div className="container px-4 md:px-6 max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">Get in touch</h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Whether you're looking for an enterprise plan, a custom AI persona, or just need support, our team is here to help.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 mt-8">
                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                                    <Mail className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Sales & Support</h3>
                                    <p className="text-muted-foreground mt-1">Found a bug or need to elevate your tier? Reach us at:</p>
                                    <a href="mailto:hello@shadowtest.ai" className="text-primary hover:underline mt-2 inline-block">hello@shadowtest.ai</a>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="bg-secondary/10 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                                    <MessageSquare className="h-6 w-6 text-secondary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Community Discord</h3>
                                    <p className="text-muted-foreground mt-1">Join other founders and QA engineers building better UX loops.</p>
                                    <a href="#" className="text-primary hover:underline mt-2 inline-block">Join our server</a>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="bg-accent/10 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                                    <MapPin className="h-6 w-6 text-accent" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Headquarters</h3>
                                    <p className="text-muted-foreground mt-1">Based entirely async, but formally registered in Delaware, USA.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card p-8 rounded-xl border border-border/50">
                            <h3 className="font-bold text-2xl mb-6">Send a message</h3>
                            <form className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="first-name">First name</Label>
                                        <Input id="first-name" placeholder="Ada" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last-name">Last name</Label>
                                        <Input id="last-name" placeholder="Lovelace" required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" placeholder="ada@example.com" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea id="message" className="min-h-[120px]" placeholder="How can we help your team?" required />
                                </div>
                                <Button type="submit" className="w-full">Send Message</Button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="w-full py-6 flex justify-center border-t border-border/40 bg-background text-xs text-muted-foreground mt-auto">
                © 2026 ShadowTest Inc. All rights reserved.
            </footer>
        </div>
    );
}
