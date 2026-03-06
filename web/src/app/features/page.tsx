import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap, Brain, Activity, ChartSpline, Code } from "lucide-react";

export const metadata: Metadata = {
    title: "Features - AI User Testing Platform",
    description: "Explore the deep behavioral analytics features of ShadowTest. From AI Personas mimicking non-technical founders to comprehensive developer testing.",
};

export default function FeaturesPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="px-6 h-16 flex items-center border-b border-border/40 bg-background/95 backdrop-blur">
                <Link className="flex items-center gap-2 font-bold text-lg" href="/">
                    <img src="/logo.png" alt="ShadowTest Logo" className="h-8 w-8 rounded-md" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">ShadowTest</span>
                </Link>
                <nav className="ml-auto flex gap-6 items-center">
                    <Link className="text-sm font-medium text-primary" href="/features">Features</Link>
                    <Link className="text-sm font-medium hover:text-primary transition-colors" href="/pricing">Pricing</Link>
                    <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
                    <Link href="/signup"><Button size="sm">Get Started</Button></Link>
                </nav>
            </header>

            <main className="flex-1 py-20">
                <div className="container px-4 md:px-6 max-w-5xl mx-auto">
                    <div className="mb-16 text-center">
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-6">Powerful Testing Features</h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Discover bugs you didn't know existed with AI personas running simulated actions iteratively across your platform.</p>
                    </div>

                    <div className="space-y-24">
                        <section className="flex flex-col md:flex-row items-center gap-12">
                            <div className="flex-1">
                                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                                    <Brain className="h-6 w-6 text-primary" />
                                </div>
                                <h2 className="text-3xl font-bold mb-4">Deep Synthetic Personas</h2>
                                <p className="text-lg text-muted-foreground mb-6">
                                    Not all users interact with a product the same way. Synthesizer simulates "Impatient Developers", "Non-technical Founders", and "Enterprise Buyers". Each persona differs in:
                                </p>
                                <ul className="space-y-3 text-muted-foreground">
                                    <li className="flex items-center gap-2">✓ Technical knowledge</li>
                                    <li className="flex items-center gap-2">✓ Patience level and drop-off likelihood</li>
                                    <li className="flex items-center gap-2">✓ Decision speed</li>
                                    <li className="flex items-center gap-2">✓ Expected risk tolerance</li>
                                </ul>
                            </div>
                            <div className="flex-1 bg-card border border-border/50 rounded-xl p-8 shadow-2xl shadow-primary/5">
                                <pre className="text-sm text-primary-foreground/80 overflow-x-auto">
                                    {`{
  "persona": "Impatient Developer",
  "traits": {
    "technical_knowledge": "Expert",
    "patience_score": 0.2,
    "decision_speed": "Fast",
    "drop_off_trigger": "Requires credit card on free trial"
  }
}`}
                                </pre>
                            </div>
                        </section>

                        <section className="flex flex-col md:flex-row-reverse items-center gap-12">
                            <div className="flex-1">
                                <div className="bg-secondary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                                    <Activity className="h-6 w-6 text-secondary" />
                                </div>
                                <h2 className="text-3xl font-bold mb-4">The Behavior Loop Engine</h2>
                                <p className="text-lg text-muted-foreground">
                                    At the core of the ShadowTest platform is our 5-stage behavioral loop powered by state-of-the-art Large Language Models (LLMs). The AI engine systematically approaches every DOM state through a human lens: Observation, Interpretation, Decision, Action, and Outcome. You see exactly *why* a synthetic user chose one click over another.
                                </p>
                            </div>
                            <div className="flex-1 bg-gradient-to-br from-card to-background border border-border/50 rounded-xl p-8 flex flex-col gap-4">
                                <div className="bg-background border border-border p-4 rounded-lg flex items-center gap-4">
                                    <div className="bg-accent/20 text-accent font-bold px-3 py-1 rounded text-xs tracking-wider">OBSERVATION</div>
                                    <p className="text-sm text-muted-foreground">"The settings cog is hidden in a hamburger menu."</p>
                                </div>
                                <div className="bg-background border border-border p-4 rounded-lg flex items-center gap-4">
                                    <div className="bg-primary/20 text-primary font-bold px-3 py-1 rounded text-xs tracking-wider">INTERPRETATION</div>
                                    <p className="text-sm text-muted-foreground">"I can't find where to change my billing cycle."</p>
                                </div>
                                <div className="bg-background border border-border p-4 rounded-lg flex items-center gap-4">
                                    <div className="bg-destructive/20 text-destructive font-bold px-3 py-1 rounded text-xs tracking-wider">ACTION</div>
                                    <p className="text-sm text-muted-foreground">"Leaves settings page."</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
            <footer className="w-full py-6 flex justify-center border-t border-border/40 bg-background text-xs text-muted-foreground">
                © 2026 ShadowTest Inc. All rights reserved.
            </footer>
        </div>
    );
}
