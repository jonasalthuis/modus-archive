import React from 'react';

interface SidebarItem {
    label: string;
    href: string;
    icon?: React.ReactNode;
    active?: boolean;
}

interface DashboardLayoutProps {
    children: React.ReactNode;
    title: string;
    sidebarItems: SidebarItem[];
    userInitials?: string;
    appName?: string;
}

export const DashboardLayout = ({
    children,
    title,
    sidebarItems = [],
    userInitials = 'MA',
    appName = 'NMA'
}: DashboardLayoutProps) => {
    return (
        <div className="min-h-screen bg-stone-50 dark:bg-[#050505] flex font-sans selection:bg-stone-200 selection:text-stone-900">
            {/* Sidebar */}
            <aside className="w-64 border-r border-stone-200 dark:border-white/5 bg-white dark:bg-black/20 backdrop-blur-xl hidden md:flex flex-col sticky top-0 h-screen">
                <div className="h-16 flex items-center px-6 border-b border-stone-200 dark:border-white/5">
                    <span className="font-mono font-bold text-sm tracking-tighter uppercase dark:text-white">
                        {appName} <span className="text-stone-400 font-normal">/ Archive</span>
                    </span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {sidebarItems.map((item, idx) => (
                        <a
                            key={idx}
                            href={item.href}
                            className={`flex items-center space-x-3 px-3 py-2 text-sm font-bold rounded-none transition-all duration-200 ${item.active
                                ? 'bg-stone-100 dark:bg-white/10 text-stone-900 dark:text-white'
                                : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white'
                                }`}
                        >
                            {item.icon && <span className="opacity-70">{item.icon}</span>}
                            <span>{item.label}</span>
                        </a>
                    ))}
                </nav>

                <div className="p-4 border-t border-stone-200 dark:border-white/5">
                    <div className="flex items-center space-x-3 px-3 py-2">
                        <div className="w-8 h-8 rounded-none bg-stone-900 flex items-center justify-center text-white font-mono text-xs shadow-lg">
                            {userInitials}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold dark:text-white uppercase tracking-tight">Archivist</span>
                            <span className="text-[10px] text-stone-400 font-mono">NMA</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-stone-200 dark:border-white/5 bg-white/80 dark:bg-black/40 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-50">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xs font-mono font-bold text-stone-900 dark:text-white uppercase tracking-widest leading-none">{title}</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-black transition-colors">Support</button>
                        <div className="h-4 w-[1px] bg-stone-200 dark:bg-white/10" />
                        <button className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-black transition-colors">Log Out</button>
                    </div>
                </header>


                <main className="flex-1 p-8 lg:p-12 max-w-7xl mx-auto w-full">
                    {children}
                </main>
            </div>
        </div>
    );
};
