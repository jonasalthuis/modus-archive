import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Inter } from "next/font/google";

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
        <html lang="en" className={inter.variable}>
            <body className="font-sans antialiased">
                <Nav />
                {children}
            </body>
        </html>
    );
}
