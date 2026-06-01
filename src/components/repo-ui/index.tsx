import React from "react";

export const Button = ({ children, variant = "primary", size = "md", className = "", ...props }: any) => {
    const baseStyles =
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variants: any = {
        primary: "bg-black text-white hover:bg-stone-800 focus:ring-stone-500 shadow-sm",
        secondary: "bg-white text-stone-700 border border-stone-300 hover:bg-stone-50 focus:ring-stone-500",
        ghost: "bg-transparent text-stone-600 hover:bg-stone-100 focus:ring-stone-400",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    };

    const sizes: any = {
        sm: "px-3 py-1.5 text-[10px] uppercase tracking-widest",
        md: "px-4 py-2 text-xs uppercase tracking-widest",
        lg: "px-6 py-3 text-sm uppercase tracking-widest",
    };

    return (
        <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
            {children}
        </button>
    );
};

import { DashboardLayout } from "./DashboardLayout";

export const CMSDashboard = DashboardLayout;

export * from "./DashboardLayout";
export * from "./StripePaymentForm";
