import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID || "",
            clientSecret: process.env.GITHUB_SECRET || "",
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_ID || "",
            clientSecret: process.env.GOOGLE_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "hello@shadowtest.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // Implement logic to authenticate user via the Express backend API
                // For MVP frontend development, we simulate a successful login
                if (credentials?.email === "test@shadowtest.com" && credentials.password === "password") {
                    return { id: "1", name: "Test User", email: "test@shadowtest.com" };
                }
                return null;
            }
        })
    ],
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days (Refresh Token Equivalent)
    },
    jwt: {
        maxAge: 15 * 60, // 15 minutes as per PRD
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user = {
                    ...session.user,
                    email: token.email
                };
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    }
};
