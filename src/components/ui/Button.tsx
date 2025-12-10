import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", isLoading, children, disabled, ...props }, ref) => {
        const variants = {
            primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
            secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
            danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
            ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={twMerge(
                    clsx(
                        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2",
                        variants[variant],
                        className
                    )
                )}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";
