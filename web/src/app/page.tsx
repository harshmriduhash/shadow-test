"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { Brain, Activity, ArrowRight, Zap, Target, Cpu } from "lucide-react";
import { useRef } from "react";

export default function LandingPage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen bg-[#020202] text-zinc-100 selection:bg-primary/30 selection:text-primary">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 px-6 h-16 flex items-center border-b border-white/[0.05] bg-black/50 backdrop-blur-xl">
        <Link className="flex items-center justify-center font-bold text-lg gap-2 group" href="/">
          <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:border-primary/50 transition-colors">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <span className="tracking-tighter text-xl">
            Shadow<span className="text-primary">Test</span>
          </span>
        </Link>
        <nav className="ml-auto flex gap-8 items-center">
          <Link className="text-sm font-medium text-zinc-400 hover:text-primary transition-colors" href="/features">
            Features
          </Link>
          <Link className="text-sm font-medium text-zinc-400 hover:text-primary transition-colors" href="/pricing">
            Pricing
          </Link>
          <div className="h-4 w-[1px] bg-white/10" />
          <Link href="/login">
            <Button variant="ghost" className="text-sm font-medium text-zinc-400">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all">
              Launch
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full min-h-screen flex flex-col justify-center items-center overflow-hidden pt-20">
          <motion.div 
            style={{ y, opacity }}
            className="absolute inset-0 -z-10 bg-[url('/ai_mesh_hero_1773415944431.png')] bg-cover bg-center opacity-30 brightness-[0.4]" 
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-[#020202]/80 to-[#020202]" />
          
          <div className="container px-4 md:px-6 text-center max-w-5xl z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono mb-8 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                BEHAVIOR TESTING INFRASTRUCTURE v1.0
              </div>
              <h1 className="text-5xl font-bold tracking-tight sm:text-7xl md:text-8xl mb-8 leading-[0.9] text-white">
                Redefining <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 italic font-light font-serif">User Simulation</span>
              </h1>
              <p className="mx-auto max-w-[640px] text-zinc-400 md:text-xl mb-12 font-light leading-relaxed">
                Synthetic personas review public product pages and repository context, then produce a trace of task-oriented usability findings.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-lg bg-primary text-primary-foreground shadow-[0_10px_40px_rgba(16,185,129,0.2)]">
                    Start Simulation <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-10 text-lg border-white/10 hover:bg-white/5">
                    Explore Engine
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
          
          {/* Scroll Indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Discover</span>
            <div className="h-10 w-[1px] bg-gradient-to-b from-primary to-transparent" />
          </motion.div>
        </section>

        {/* Bento Grid Features */}
        <section id="features" className="w-full py-32 flex justify-center bg-[#020202]">
          <div className="container px-4 md:px-6 max-w-7xl">
            <div className="mb-20 space-y-4">
              <h2 className="text-sm font-mono text-primary uppercase tracking-[0.4em]">Proprietary Engine</h2>
              <h3 className="text-4xl font-bold tracking-tight text-white sm:text-6xl max-w-2xl">
                Testing Beyond <br />The Surface.
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[240px]">
              {/* Feature 1: AI Personas */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-8 group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 flex flex-col justify-end"
              >
                <div className="absolute top-0 right-0 p-12 -z-10 opacity-20 group-hover:opacity-40 transition-opacity">
                  <Brain className="h-40 w-40 text-primary" />
                </div>
                <div className="max-w-md space-y-2">
                  <h4 className="text-2xl font-bold text-white">Task-specific Personas</h4>
                  <p className="text-zinc-400 font-light">Set persona traits such as technical experience and patience to guide the model&apos;s evaluation of product context.</p>
                </div>
              </motion.div>

              {/* Feature 2: High Performance */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-4 relative overflow-hidden rounded-3xl border border-white/10 bg-primary/10 p-8 flex flex-col justify-between"
              >
                <Zap className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h4 className="text-2xl font-bold text-white">Background Runs</h4>
                  <p className="text-zinc-400 text-sm font-light">Durable queued simulations run independently from the dashboard request.</p>
                </div>
              </motion.div>

              {/* Feature 3: Live Trace */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-4 relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 flex flex-col justify-between"
              >
                <Activity className="h-12 w-12 text-primary/60" />
                <div className="space-y-2">
                  <h4 className="text-2xl font-bold text-white">Real-time Traces</h4>
                  <p className="text-zinc-400 text-sm font-light">Follow persisted reasoning steps as the read-only walkthrough progresses.</p>
                </div>
              </motion.div>

              {/* Feature 4: Graph Insights */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-8 group relative overflow-hidden rounded-3xl border border-white/10 p-1 flex justify-center items-center bg-gradient-to-br from-zinc-800 to-black"
              >
                <Image src="/simulation_graph_1773416200123.png" alt="Simulation analytics preview" fill sizes="(max-width: 768px) 100vw, 66vw" className="object-cover opacity-30 transition-transform duration-700 group-hover:scale-105" />
                <div className="relative z-10 p-8 w-full h-full flex flex-col justify-end">
                  <div className="max-w-md space-y-2">
                    <h4 className="text-2xl font-bold text-white">UX Friction Mapping</h4>
                    <p className="text-zinc-400 font-light">Review reported friction points and task outcomes from completed simulations.</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Pricing Section - Clinical Style */}
        <section id="pricing" className="w-full py-32 flex justify-center border-t border-white/[0.05]">
          <div className="container px-4 md:px-6 max-w-6xl">
            <div className="text-center mb-24">
              <h2 className="text-sm font-mono text-primary uppercase tracking-[0.4em] mb-4">Pricing Packages</h2>
              <h3 className="text-4xl font-bold tracking-tight text-white max-w-2xl mx-auto">Scalable Neural Compute</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-0 border border-white/10 rounded-3xl overflow-hidden divide-x divide-white/10">
              <div className="p-12 space-y-8 hover:bg-white/[0.02] transition-colors">
                <div>
                  <h4 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">Entry</h4>
                  <div className="text-5xl font-bold text-white">$0</div>
                </div>
                <div className="space-y-4 text-sm text-zinc-400">
                  <p className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> 3 simulations / month</p>
                  <p className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> 1 dedicated project</p>
                  <p className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Basic persona library</p>
                </div>
                <Link href="/pricing"><Button variant="outline" className="w-full border-white/10 hover:bg-white/5 py-6">Initiate</Button></Link>
              </div>

              <div className="p-12 space-y-8 bg-primary/5 hover:bg-primary/10 transition-colors relative">
                <div className="absolute top-6 right-6 px-2 py-0.5 border border-primary/30 text-[10px] text-primary font-mono uppercase rounded">Recommended</div>
                <div>
                  <h4 className="text-sm font-mono text-primary uppercase tracking-widest mb-4">Explorer</h4>
                  <div className="text-5xl font-bold text-white">$29</div>
                </div>
                <div className="space-y-4 text-sm text-zinc-400">
                  <p className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> 100 simulations / month</p>
                  <p className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> 10 projects capacity</p>
                  <p className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Full persona tuning</p>
                </div>
                <Link href="/pricing"><Button className="w-full bg-primary text-primary-foreground py-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">Propel</Button></Link>
              </div>

              <div className="p-12 space-y-8 hover:bg-white/[0.02] transition-colors">
                <div>
                  <h4 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">Elite</h4>
                  <div className="text-5xl font-bold text-white">$99</div>
                </div>
                <div className="space-y-4 text-sm text-zinc-400">
                  <p className="flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> 1000 simulations / month</p>
                  <p className="flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Unlimited projects</p>
                  <p className="flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> CSV report export</p>
                </div>
                <Link href="/pricing"><Button variant="outline" className="w-full border-white/10 hover:bg-white/5 py-6">Scale</Button></Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 flex justify-center border-t border-white/[0.05] bg-black">
        <div className="container px-4 md:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
          <div className="space-y-4">
            <Link className="flex items-center font-bold text-lg gap-2" href="/">
              <span className="tracking-tighter text-xl">Shadow<span className="text-primary">Test</span></span>
            </Link>
            <p className="text-xs text-zinc-500 max-w-sm">
              Early-access synthetic usability walkthroughs for product teams.
            </p>
          </div>
          <div className="flex flex-wrap gap-12">
            <div className="space-y-4">
              <h5 className="text-xs font-mono text-white uppercase tracking-widest">Product</h5>
              <div className="flex flex-col gap-2 text-xs text-zinc-500">
                <Link href="#" className="hover:text-primary transition-colors">Documentation</Link>
                <Link href="#" className="hover:text-primary transition-colors">API Reference</Link>
                <Link href="#" className="hover:text-primary transition-colors">Status</Link>
              </div>
            </div>
            <div className="space-y-4">
              <h5 className="text-xs font-mono text-white uppercase tracking-widest">Company</h5>
              <div className="flex flex-col gap-2 text-xs text-zinc-500">
                <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
                <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
                <Link href="#" className="hover:text-primary transition-colors">Security</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
