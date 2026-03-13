"use client";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Cpu } from "lucide-react";
import { motion } from "framer-motion";

export default function SignupPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#020202] text-zinc-100">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
            >
                <Link className="flex items-center justify-center font-bold text-lg gap-3 group" href="/">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:border-primary/50 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        <Cpu className="h-6 w-6 text-primary" />
                    </div>
                    <span className="tracking-tighter text-3xl">
                        Shadow<span className="text-primary">Test</span>
                    </span>
                </Link>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="w-full max-w-md"
            >
                <SignUp
                    routing="path"
                    path="/signup"
                    signInUrl="/login"
                    forceRedirectUrl="/dashboard"
                    appearance={{
                        elements: {
                            rootBox: "w-full mx-auto",
                            card: "bg-zinc-900/50 border border-white/[0.05] shadow-2xl backdrop-blur-xl rounded-3xl",
                            headerTitle: "text-white tracking-tight",
                            headerSubtitle: "text-zinc-500 font-light",
                            socialButtonsBlockButton: "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] text-white transition-all",
                            socialButtonsBlockButtonText: "text-zinc-300 font-medium",
                            dividerLine: "bg-white/[0.05]",
                            dividerText: "text-zinc-600 font-mono text-[10px] uppercase tracking-widest",
                            formLabelFontWeight: "font-mono text-[10px] uppercase tracking-widest text-zinc-500",
                            formFieldInput: "bg-zinc-950/50 border-white/[0.05] text-white focus:ring-primary/20 transition-all rounded-xl h-11",
                            formButtonPrimary: "bg-primary text-primary-foreground hover:opacity-90 shadow-[0_4px_20px_rgba(16,185,129,0.2)] transition-all rounded-xl h-11 font-semibold",
                            footerActionText: "text-zinc-500",
                            footerActionLink: "text-primary hover:text-primary/80 transition-colors",
                            identityPreviewText: "text-white",
                            identityPreviewEditButtonIcon: "text-primary",
                        }
                    }}
                />
            </motion.div>
            
            <p className="mt-8 text-[10px] font-mono text-zinc-600 uppercase tracking-widest opacity-50">
                Secure Authentication Node v2.4.0
            </p>
        </div>
    );
}
