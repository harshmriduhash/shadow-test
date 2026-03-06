import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <Link href="/" className="mb-8 flex items-center gap-2 font-bold text-xl text-foreground">
                <img src="/logo.png" alt="ShadowTest Logo" className="h-10 w-10 rounded-lg shadow-lg shadow-primary/20" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">ShadowTest</span>
            </Link>
            <SignIn
                routing="path"
                path="/login"
                signUpUrl="/signup"
                forceRedirectUrl="/dashboard"
            />
        </div>
    );
}
