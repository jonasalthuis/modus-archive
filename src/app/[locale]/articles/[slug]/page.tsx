import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// In a real implementation, this would fetch from Firestore based on slug
async function getArticle(slug: string) {
    // Mock data
    if (slug === 'preserving-analog-history') {
        return {
            title: 'Preserving Analog History',
            author: 'Jonas Althuis',
            date: 'Oct 12, 2025',
            content: `
                <p>The role of the physical model in architecture has shifted from a primary design tool to a representational artifact. Yet, the <strong>"Modus"</strong> collection reveals a different story: one where the model was the site of active experimentation.</p>
                <p>In our digital era, the tactile resistance of basswood and the chemical smell of glue are often replaced by the infinite malleability of the mesh. But something is lost in this friction-less translation.</p>
            `,
            tags: ['Theory', 'Archival']
        };
    }
    return null;
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = await getArticle(slug);

    if (!article) {
        notFound();
    }

    return (
        <article className="min-h-screen bg-stone-50 font-serif text-stone-900 pb-24">
            <nav className="p-8 border-b border-stone-200 bg-white sticky top-0 z-50">
                <Link href="/articles" className="text-xs uppercase tracking-widest font-bold hover:text-amber-800 flex items-center">
                    <span className="mr-2">←</span> Return to Journal
                </Link>
            </nav>

            <header className="px-8 md:px-24 py-20 max-w-4xl mx-auto text-center">
                <div className="flex justify-center space-x-2 mb-6">
                    {article.tags.map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-widest bg-stone-200 px-2 py-1 rounded-sm">{tag}</span>
                    ))}
                </div>
                <h1 className="text-4xl md:text-6xl font-light leading-tight mb-8">{article.title}</h1>
                <div className="text-xs uppercase tracking-widest text-stone-500 font-bold flex justify-center space-x-4">
                    <span>{article.author}</span>
                    <span>•</span>
                    <span>{article.date}</span>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-8">
                <div
                    className="prose prose-stone prose-lg prose-p:leading-loose prose-p:italic first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-3"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                />
            </div>
        </article>
    );
}
