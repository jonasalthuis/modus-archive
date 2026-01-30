"use client";

import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface StripePaymentFormProps {
    publishableKey: string;
    clientSecret: string;
    onSuccess?: () => void;
    returnUrl: string;
}

function CheckoutForm({ onSuccess, returnUrl }: { onSuccess?: () => void; returnUrl: string }) {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsLoading(true);

        const { error } = await stripe.confirmSetup({
            elements,
            confirmParams: {
                return_url: returnUrl,
            },
        });

        if (error) {
            setMessage(error.message ?? "An unexpected error occurred.");
        } else {
            setMessage("Success! Your payment method has been saved.");
            if (onSuccess) onSuccess();
        }

        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                <PaymentElement />
            </div>
            <button
                disabled={isLoading || !stripe || !elements}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:translate-y-[-2px] transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
            >
                {isLoading ? "Processing..." : "Save Payment Method"}
            </button>
            {message && (
                <div className={`text-sm text-center font-medium mt-4 ${message.includes('Success') ? 'text-emerald-500' : 'text-red-500'}`}>
                    {message}
                </div>
            )}
        </form>
    );
}

export const StripePaymentForm = ({ publishableKey, clientSecret, onSuccess, returnUrl }: StripePaymentFormProps) => {
    const stripePromise = loadStripe(publishableKey);

    return (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm onSuccess={onSuccess} returnUrl={returnUrl} />
        </Elements>
    );
};
