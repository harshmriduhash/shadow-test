import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

export default function SignupPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <Link href="/" className="mb-8 flex items-center gap-2 font-bold text-xl text-foreground">
                <img src="/logo.png" alt="ShadowTest Logo" className="h-10 w-10 rounded-lg shadow-lg shadow-primary/20" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">ShadowTest</span>
            </Link>
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Create an account</CardTitle>
                    <CardDescription>Start simulating users before launch</CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" type="text" placeholder="John Doe" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="name@example.com" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" required />
                        </div>
                        <Button type="submit" className="w-full mt-4">Sign up</Button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="w-full">Google</Button>
                        <Button variant="outline" className="w-full">GitHub</Button>
                    </div>
                </CardContent>
                <CardFooter className="justify-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary hover:underline ml-1">
                        Log in
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
