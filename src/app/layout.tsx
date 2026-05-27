import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

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
        <html lang="en">
            <body className="font-sans antialiased">
                <Nav />
                {children}
            </body>
        </html>
    );
}
