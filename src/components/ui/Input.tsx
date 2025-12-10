import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, helperText, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={cn(
                        "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                        "dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-blue-400",
                        error ? "border-red-500 focus:ring-red-500" : "",
                        className
                    )}
                    {...props}
                />
                {helperText && !error && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
                )}
                {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
            </div>
        );
    }
);
Input.displayName = "Input";
