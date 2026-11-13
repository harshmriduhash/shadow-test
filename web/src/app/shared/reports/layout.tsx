import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Shared report | ShadowTest",
    robots: { index: false, follow: false },
};

export default function SharedReportLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return children;
}
