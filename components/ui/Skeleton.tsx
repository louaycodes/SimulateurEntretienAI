import { clsx } from "clsx";

interface SkeletonProps {
    className?: string;
    variant?: "text" | "circular" | "rectangular";
}

export function Skeleton({ className, variant = "rectangular" }: SkeletonProps) {
    const variants = {
        text: "h-4 rounded",
        circular: "rounded-full",
        rectangular: "rounded-xl",
    };

    return (
        <div
            className={clsx(
                "skeleton",
                variants[variant],
                className
            )}
        />
    );
}

export function CardSkeleton() {
    return (
        <div className="card">
            <Skeleton className="h-6 w-1/3 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-2" />
            <Skeleton className="h-4 w-4/6" />
        </div>
    );
}

export function SessionCardSkeleton() {
    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        </div>
    );
}
