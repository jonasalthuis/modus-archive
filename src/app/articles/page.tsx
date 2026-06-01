import React from "react";
import Link from "next/link";

export default function ArticlesPage() {
    // TODO: replace with Firestore fetch from ma_articles
    const articles = [
        {
            slug: "preserving-analog-history",
            title: "Preserving Analog History",
            excerpt: "Why physical models matter in a digital age.",
            date: "Oct 12, 2025",
        },
    ];

    return (
        <div className="bg-white min-h-screen text-black font-sans p-8 md:p-16 selection:bg-black selection:text-white">
            <nav className="mb-16">
                <Link href="/" className="text-[10px] uppercase tracking-widest font-bold hover:underline">
                    ← NMA
                </Link>
            </nav>

            <h1 className="text-4xl font-light mb-12 uppercase tracking-widest">Articles</h1>

            <div className="grid gap-12 max-w-2xl">
                {articles.map((article) => (
                    <div key={article.slug} className="border-b border-black pb-12">
                        <span className="text-xs text-stone-400 uppercase tracking-widest block mb-2">
                            {article.date}
                        </span>
                        <h2 className="text-2xl font-normal mb-4">
                            <Link
                                href={`/articles/${article.slug}`}
                                className="hover:underline decoration-1 underline-offset-4 transition-all"
                            >
                                {article.title}
                            </Link>
                        </h2>
                        <p className="text-lg text-stone-600 leading-relaxed mb-6">{article.excerpt}</p>
                        <Link
                            href={`/articles/${article.slug}`}
                            className="text-xs uppercase tracking-widest font-bold hover:underline"
                        >
                            Read More →
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
