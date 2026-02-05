import { ReactNode } from "react";
import { clsx } from "clsx";

interface CardProps {
    children: ReactNode;
    className?: string;
    variant?: "default" | "glass";
    hover?: boolean;
}

export function Card({ children, className, variant = "default", hover = false }: CardProps) {
    const variants = {
        default: "card",
        glass: "card-glass",
    };

    return (
        <div
            className={clsx(
                variants[variant],
                hover && "hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer",
                className
            )}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    children: ReactNode;
    className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
    return (
        <div className={clsx("mb-4", className)}>
            {children}
        </div>
    );
}

interface CardTitleProps {
    children: ReactNode;
    className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
    return (
        <h3 className={clsx("text-xl font-bold text-gray-900 dark:text-white", className)}>
            {children}
        </h3>
    );
}

interface CardContentProps {
    children: ReactNode;
    className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
    return (
        <div className={className}>
            {children}
        </div>
    );
}
