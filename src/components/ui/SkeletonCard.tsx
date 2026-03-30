import { memo } from "react";

interface SkeletonCardProps {
  className?: string;
  aspectRatio?: "square" | "auto";
  showButton?: boolean;
}

const SkeletonCard = memo(
  ({
    className = "",
    aspectRatio = "auto",
    showButton = false,
  }: SkeletonCardProps) => {
    return (
      <div
        className={`bg-card/20 backdrop-blur-sm overflow-hidden rounded-2xl animate-pulse ${className}`}
      >
        <div
          className={`bg-gradient-to-r from-card/30 via-card/50 to-card/30 ${
            aspectRatio === "square" ? "aspect-square" : "h-48"
          }`}
        />

        {showButton && (
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-card/40 w-20 h-8 rounded-full" />
        )}
      </div>
    );
  }
);

SkeletonCard.displayName = "SkeletonCard";

export default SkeletonCard;
