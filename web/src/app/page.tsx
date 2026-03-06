import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Brain, ChartSpline, Code, ArrowRight, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="px-6 h-16 flex items-center border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link className="flex items-center justify-center font-bold text-lg gap-2" href="/">
          <img src="/logo.png" alt="ShadowTest Logo" className="h-8 w-8 rounded-md" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            ShadowTest
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="#pricing">
            Pricing
          </Link>
          <Link href="/login">
            <Button variant="ghost" className="text-sm font-medium">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-24 md:py-32 lg:py-48 flex justify-center items-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -z-10 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
          <div className="container px-4 md:px-6 text-center max-w-4xl">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
              Synthetic Users That Test Your Product
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl mb-10 leading-relaxed">
              Before your real users encounter friction, let our AI personas explore, attempt tasks, and experience confusion. Fix UX issues before launch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
                  Start Testing Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-24 bg-muted/30 flex justify-center border-y border-border/40">
          <div className="container px-4 md:px-6 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Behavior Testing Infrastructure</h2>
              <p className="text-muted-foreground md:text-lg max-w-2xl mx-auto">
                Developers test APIs. We test human behavior. Discover usability issues autonomously.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <Brain className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>AI Personas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Select from pre-built personas varying in technical knowledge, patience, and decision speed.</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <Activity className="h-10 w-10 text-secondary mb-2" />
                  <CardTitle>Behavior Simulation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Simulates the reasoning loop: Observation, Interpretation, Decision, Action, Outcome.</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <ChartSpline className="h-10 w-10 text-accent mb-2" />
                  <CardTitle>UX Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Generate comprehensive behavioral traces highlighting friction and confusion points.</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader>
                  <Code className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Developer Testing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Analyze your product using just a GitHub repository URL or a live Product URL.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="w-full py-24 flex justify-center">
          <div className="container px-4 md:px-6 max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Pricing Plans</h2>
              <p className="text-muted-foreground md:text-lg max-w-2xl mx-auto">
                Scale your synthetic user testing as your product grows.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 items-start">
              <Card className="border-border bg-card/50">
                <CardHeader>
                  <CardTitle className="text-xl">Free</CardTitle>
                  <div className="text-4xl font-bold mt-4">$0<span className="text-xl font-normal text-muted-foreground">/mo</span></div>
                  <CardDescription className="mt-2">Perfect for side projects.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground font-medium">
                  <p>• 3 simulations / month</p>
                  <p>• 1 project limit</p>
                  <p>• Basic personas</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">Get Started</Button>
                </CardFooter>
              </Card>

              <Card className="border-primary/50 bg-primary/5 relative scale-105 shadow-xl shadow-primary/10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</div>
                <CardHeader>
                  <CardTitle className="text-xl text-primary">Starter</CardTitle>
                  <div className="text-4xl font-bold mt-4">$29<span className="text-xl font-normal text-muted-foreground">/mo</span></div>
                  <CardDescription className="mt-2">For startups and indie hackers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground font-medium">
                  <p>• 100 simulations / month</p>
                  <p>• 10 projects limit</p>
                  <p>• Unlimited personas</p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-primary hover:bg-primary/90">Choose Starter</Button>
                </CardFooter>
              </Card>

              <Card className="border-border bg-card/50">
                <CardHeader>
                  <CardTitle className="text-xl">Pro</CardTitle>
                  <div className="text-4xl font-bold mt-4">$99<span className="text-xl font-normal text-muted-foreground">/mo</span></div>
                  <CardDescription className="mt-2">For professional dev teams.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground font-medium">
                  <p>• 1000 simulations / month</p>
                  <p>• Unlimited projects</p>
                  <p>• Team collaboration</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">Choose Pro</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 flex justify-center border-t border-border/40 bg-background">
        <div className="container px-4 md:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 ShadowTest Inc. All rights reserved.
          </p>
          <nav className="flex gap-4 sm:gap-6">
            <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">
              Terms of Service
            </Link>
            <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
