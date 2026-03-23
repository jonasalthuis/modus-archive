import type { Metadata } from "next";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export const metadata: Metadata = {
    title: "Modus Modelmaking Archive",
    description: "Preserving the Analogue DNA of Architecture in a Digital Era.",
};

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    // Ensure that the locale is valid, or fallback (handled by middleware usually, but good practice)
    const { locale } = await params;
    const messages = await getMessages();

    return (
        <html lang={locale}>
            <body className={`font-sans antialiased`}>
                <NextIntlClientProvider messages={messages} locale={locale}>
                    {children}
                </NextIntlClientProvider>

            </body>
        </html>
    );
}
