import { useState, useEffect, useCallback } from "react";

interface ImageLoadOptions {
  priority?: "high" | "medium" | "low";
  delay?: number;
  retryAttempts?: number;
}

export const useOptimizedImageLoader = () => {
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());
  const [loadingQueue, setLoadingQueue] = useState<
    Map<string, ImageLoadOptions>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const loadImage = useCallback(
    (src: string, options: ImageLoadOptions = {}) => {
      const { priority = "medium", delay = 0, retryAttempts = 2 } = options;

      // Don't reload already loaded images
      if (imagesLoaded.has(src)) return Promise.resolve();

      return new Promise<void>((resolve, reject) => {
        const loadWithRetry = (attempts: number) => {
          const img = new Image();

          // Set priority
          if (priority === "high") {
            img.fetchPriority = "high";
          }

          img.decoding = "async";

          img.onload = () => {
            setImagesLoaded((prev) => new Set([...prev, src]));
            resolve();
          };

          img.onerror = () => {
            if (attempts > 0) {
              setTimeout(() => loadWithRetry(attempts - 1), 1000);
            } else {
              reject(new Error(`Failed to load image: ${src}`));
            }
          };

          // Load with delay for lower priority images
          if (delay > 0) {
            setTimeout(() => {
              img.src = src;
            }, delay);
          } else {
            img.src = src;
          }
        };

        loadWithRetry(retryAttempts);
      });
    },
    [imagesLoaded]
  );

  const preloadImages = useCallback(
    async (imageGroups: {
      critical: string[];
      normal: string[];
      lazy: string[];
    }) => {
      setIsLoading(true);

      try {
        // Load critical images immediately
        await Promise.all(
          imageGroups.critical.map((src) =>
            loadImage(src, { priority: "high" })
          )
        );

        // Load normal priority images with small delay
        setTimeout(() => {
          imageGroups.normal.forEach((src) =>
            loadImage(src, { priority: "medium", delay: 100 })
          );
        }, 100);

        // Load lazy images with larger delay
        setTimeout(() => {
          imageGroups.lazy.forEach((src) =>
            loadImage(src, { priority: "low", delay: 500 })
          );
        }, 500);
      } catch (error) {
        console.warn("Some images failed to preload:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [loadImage]
  );

  const isImageLoaded = useCallback(
    (src: string) => {
      return imagesLoaded.has(src);
    },
    [imagesLoaded]
  );

  return {
    imagesLoaded,
    isLoading,
    loadImage,
    preloadImages,
    isImageLoaded,
  };
};
