import { useState, useRef, useEffect } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: "high" | "low";
  onLoad?: () => void;
  aspectRatio?: "square" | "auto";
  fallback?: string;
}

const LazyImage = ({
  src,
  alt,
  className = "",
  style,
  priority = "low",
  onLoad,
  aspectRatio = "auto",
  fallback,
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageSrc, setImageSrc] = useState<string>("");

  // Convert to WebP if supported
  const getOptimizedSrc = (originalSrc: string) => {
    // All our images are already in WebP format, so just return the original
    return originalSrc;
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Load image when in view or high priority
  useEffect(() => {
    if (isInView || priority === "high") {
      const optimizedSrc = getOptimizedSrc(src);
      setImageSrc(optimizedSrc);

      // Preload image
      const img = new Image();
      img.fetchPriority = priority;
      img.decoding = "async";

      img.onload = () => {
        setIsLoaded(true);
        onLoad?.();
      };

      img.onerror = () => {
        if (fallback) {
          setImageSrc(fallback);
          setError(false);
        } else {
          setError(true);
        }
      };

      img.src = optimizedSrc;
    }
  }, [isInView, priority, src, onLoad, fallback]);

  const containerClasses = `
    relative overflow-hidden transition-all duration-300
    ${aspectRatio === "square" ? "aspect-square" : ""}
    ${className}
  `;

  const imageClasses = `
    w-full h-full object-cover transition-all duration-500 ease-out
    ${isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"}
  `;

  const skeletonClasses = `
    absolute inset-0 bg-gradient-to-r from-card/30 via-card/50 to-card/30 
    animate-pulse transition-opacity duration-500
    ${isLoaded ? "opacity-0" : "opacity-100"}
  `;

  return (
    <div ref={imgRef} className={containerClasses} style={style}>
      {/* Skeleton loader */}
      <div className={skeletonClasses} />

      {/* Actual image */}
      {imageSrc && !error && (
        <img
          src={imageSrc}
          alt={alt}
          className={imageClasses}
          style={{
            willChange: isLoaded ? "auto" : "opacity, transform",
            backfaceVisibility: "hidden",
            transform: "translateZ(0)",
          }}
          loading={priority === "high" ? "eager" : "lazy"}
          decoding="async"
        />
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/20">
          <div className="text-center text-muted-foreground">
            <div className="w-8 h-8 mx-auto mb-2 opacity-50">📷</div>
            <p className="text-xs">Image failed to load</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
