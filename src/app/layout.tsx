import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { SiteAuthGate } from "@/components/SiteAuthGate";
import { Inter, Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

export const metadata: Metadata = {
    title: "NMA",
    description: "A research-first archive of 850 architectural scale models.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={cn("font-sans", geist.variable)}>
            <body className="font-sans antialiased">
                <SiteAuthGate>
                    <Nav />
                    {children}
                </SiteAuthGate>
            </body>
        </html>
    );
}
