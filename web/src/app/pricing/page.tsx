"use client";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Cpu, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { api, authOptions } from "@/lib/api";

type PricingPlan = {
    name: string;
    price: string;
    desc: string;
    features: string[];
    button: string;
    variant: "outline" | "default";
    popular?: boolean;
};

const plans: PricingPlan[] = [
    {
        name: "Node",
        price: "$0",
        desc: "For individual labs and hypotheses.",
        features: ["3 simulations / month", "1 project", "Standard persona library", "Live trace and reports"],
        button: "Initialize Free",
        variant: "outline"
    },
    {
        name: "Network",
        price: "$29",
        desc: "For scaling products and active dev teams.",
        features: ["100 simulations / month", "10 projects", "Custom persona profiles", "CSV report export"],
        button: "Deploy Network",
        variant: "default",
        popular: true
    },
    {
        name: "Cluster",
        price: "$99",
        desc: "Higher monthly simulation capacity for product teams.",
        features: ["1,000 simulations / month", "Unlimited projects", "Custom persona profiles", "CSV report export"],
        button: "Scale Cluster",
        variant: "outline"
    }
];

export default function PricingPage() {
    const { isSignedIn, getToken } = useAuth();
    const router = useRouter();
    const [checkoutPlan, setCheckoutPlan] = useState<"STARTER" | "PRO" | null>(null);
    const [billingError, setBillingError] = useState("");

    const choosePlan = async (plan: "FREE" | "STARTER" | "PRO") => {
        setBillingError("");
        if (plan === "FREE") {
            router.push("/signup");
            return;
        }
        if (!isSignedIn) {
            router.push("/signup?redirect_url=%2Fpricing");
            return;
        }
        setCheckoutPlan(plan);
        try {
            const session = await api.billing.checkout(plan, authOptions(await getToken()));
            window.location.assign(session.url);
        } catch (error) {
            setBillingError(error instanceof Error ? error.message : "Unable to start checkout.");
        } finally {
            setCheckoutPlan(null);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#020202] text-zinc-100">
            {/* Nav */}
            <header className="fixed top-0 w-full z-50 px-6 h-16 flex items-center border-b border-white/[0.05] bg-black/50 backdrop-blur-xl">
                <Link className="flex items-center justify-center font-bold text-lg gap-2 group" href="/">
                    <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                        <Cpu className="h-5 w-5 text-primary" />
                    </div>
                    <span className="tracking-tighter text-xl text-white">
                        Shadow<span className="text-primary">Test</span>
                    </span>
                </Link>
                <nav className="ml-auto flex gap-8 items-center">
                    <Link className="text-sm font-medium text-zinc-400 hover:text-primary transition-colors" href="/features">Features</Link>
                    <Link className="text-sm font-medium text-primary" href="/pricing">Pricing</Link>
                    <Link href="/login"><Button variant="ghost" className="text-sm text-zinc-400">Log in</Button></Link>
                    <Link href="/signup">
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">Launch</Button>
                    </Link>
                </nav>
            </header>

            <main className="flex-1 pt-32 pb-20">
                <div className="container px-4 md:px-6 max-w-6xl mx-auto">
                    <div className="text-center mb-20 space-y-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05] text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]"
                        >
                            <Sparkles className="h-3 w-3 text-primary" />
                            Tokenized Infrastructure
                        </motion.div>
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-white">Investment Levels.</h1>
                        <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-light leading-relaxed">
                            Choose a monthly simulation and project allowance that fits your current testing needs.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 items-stretch pt-8">
                        {plans.map((plan, i) => (
                            <motion.div
                                key={plan.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="relative h-full"
                            >
                                <Card className={`h-full rounded-[2.5rem] border-white/[0.05] bg-zinc-900/20 backdrop-blur-sm flex flex-col overflow-hidden ${plan.popular ? 'border-primary/20 ring-1 ring-primary/20' : ''}`}>
                                    {plan.popular && (
                                        <div className="absolute top-0 right-0 p-6">
                                            <div className="text-[10px] font-mono text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">Primary Rank</div>
                                        </div>
                                    )}
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.3em]">{plan.name}</CardTitle>
                                        <div className="text-5xl font-bold mt-4 tracking-tighter">{plan.price}<span className="text-xl font-light text-zinc-600">/mo</span></div>
                                        <CardDescription className="mt-4 text-zinc-400 font-light text-sm">{plan.desc}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-8 pt-0 flex-1">
                                        <div className="h-[1px] bg-white/[0.05] my-6" />
                                        <ul className="space-y-4">
                                            {plan.features.map((f, idx) => (
                                                <li key={idx} className="flex items-center gap-3 text-sm font-light text-zinc-300">
                                                    <CheckCircle2 className={`h-4 w-4 ${plan.popular ? 'text-primary' : 'text-zinc-600'}`} />
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <CardFooter className="p-8">
                                        <Button 
                                            variant={plan.variant}
                                            disabled={checkoutPlan !== null}
                                            onClick={() => void choosePlan(plan.name === "Node" ? "FREE" : plan.name === "Network" ? "STARTER" : "PRO")}
                                            className={`w-full rounded-2xl h-14 font-semibold transition-all ${
                                                plan.variant === 'default'
                                                ? 'bg-primary text-primary-foreground shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.4)]' 
                                                : 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.08] text-white'
                                            }`}
                                        >
                                            {checkoutPlan === (plan.name === "Network" ? "STARTER" : plan.name === "Cluster" ? "PRO" : null) && plan.name !== "Node"
                                                ? "Opening checkout…"
                                                : plan.button}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                    {billingError && <p role="alert" className="mt-6 text-center text-sm text-destructive">{billingError}</p>}
                </div>
            </main>

            <footer className="w-full py-12 border-t border-white/[0.05] bg-black/50">
                <div className="container px-4 text-center">
                    <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.4em]">© 2026 ShadowTest // Financial Layer v1.2</p>
                </div>
            </footer>
        </div>
    );
}
