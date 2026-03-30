import { memo } from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "secondary" | "muted";
  className?: string;
}

const LoadingSpinner = memo(
  ({ size = "md", color = "primary", className = "" }: LoadingSpinnerProps) => {
    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-6 h-6",
      lg: "w-8 h-8",
    };

    const colorClasses = {
      primary: "border-primary",
      secondary: "border-secondary",
      muted: "border-muted-foreground",
    };

    return (
      <div
        className={`
        ${sizeClasses[size]} 
        ${colorClasses[color]} 
        border-2 border-t-transparent rounded-full animate-spin
        ${className}
      `}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

export default LoadingSpinner;
