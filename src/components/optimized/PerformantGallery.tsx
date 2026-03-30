import { SITE_DISPLAY_NAME } from "@/config/siteBrand";
import { Download } from "lucide-react";
import { forwardRef, memo, useCallback, useMemo } from "react";
import LazyImage from "./LazyImage";
import AnimatedSection from "./AnimatedSection";

// Static image arrays
const GALLERY_IMAGES = [
  "/32.webp",
  "/11.webp",
  "/26.webp",
  "/12.webp",
  "/28.webp",
  "/27.webp",
  "/13.webp",
  "/29.webp",
  "/14.webp",
  "/25.webp",
  "/15.webp",
  "/30.webp",
  "/alfie.webp",
  "/16.webp",
];

interface PerformantGalleryProps {
  imagesLoaded: Set<string>;
  downloadingImages: Set<number | string>;
  handleDownload: (imageSrc: string, index: number | string) => Promise<void>;
  handleKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
  onImageClick: (index: number) => void;
}

// Memoized gallery item to prevent unnecessary re-renders
const GalleryItem = memo(
  ({
    image,
    index,
    isImageLoaded,
    isDownloading,
    onDownload,
    onKeyDown,
    onImageClick,
  }: {
    image: string;
    index: number;
    isImageLoaded: boolean;
    isDownloading: boolean;
    onDownload: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onImageClick: () => void;
  }) => {
    return (
             <div
         className="bg-card/30 backdrop-blur-sm overflow-hidden rounded-2xl transition-all duration-300 hover:bg-card/50 cursor-pointer relative group focus-within:ring-4 focus-within:ring-primary/30 will-change-transform"
         tabIndex={0}
         onClick={onImageClick}
         onKeyDown={onKeyDown}
         style={{
           contain: "layout style paint",
         }}
       >
        <LazyImage
          src={image}
          alt={`${SITE_DISPLAY_NAME} adventure ${index + 1}`}
          aspectRatio="square"
          className="group-hover:scale-105 transition-transform duration-500 ease-out"
          priority={index < 4 ? "high" : "low"}
        />

        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-background/90 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium opacity-0 translate-y-2 transition-all duration-200 hover:bg-primary hover:text-primary-foreground group-hover:opacity-100 group-hover:translate-y-0 focus:opacity-100 focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed will-change-transform"
          aria-label={`Download ${SITE_DISPLAY_NAME} image ${index + 1}`}
        >
          {isDownloading ? (
            <>
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">Downloading...</span>
            </>
          ) : (
            <>
              <Download size={12} className="sm:w-3 sm:h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Download</span>
            </>
          )}
        </button>
      </div>
    );
  }
);

GalleryItem.displayName = "GalleryItem";

const PerformantGallery = forwardRef<HTMLElement, PerformantGalleryProps>(
  ({ imagesLoaded, downloadingImages, handleDownload, handleKeyDown, onImageClick }, ref) => {
    // Memoize expensive calculations
    const galleryItems = useMemo(() => {
      return GALLERY_IMAGES.map((image, index) => ({
        image,
        index,
        id: `gallery-${index}`,
      }));
    }, []);

    // Memoize callbacks to prevent re-renders
    const createDownloadHandler = useCallback(
      (image: string, index: number) => {
        return () => handleDownload(image, index);
      },
      [handleDownload]
    );

    const createKeyDownHandler = useCallback(
      (image: string, index: number) => {
        return (e: React.KeyboardEvent) =>
          handleKeyDown(e, () => onImageClick(index));
      },
      [handleKeyDown, onImageClick]
    );

    const createImageClickHandler = useCallback(
      (index: number) => {
        return () => onImageClick(index);
      },
      [onImageClick]
    );

    return (
      <AnimatedSection
        ref={ref}
        className="py-12 sm:py-16 md:py-20 px-4"
        animation="fadeInUp"
        duration={800}
      >
        <div className="w-full max-w-6xl mx-auto">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8"
            style={{
              contain: "layout style paint",
            }}
          >
            {galleryItems.map(({ image, index, id }) => (
              <GalleryItem
                key={id}
                image={image}
                index={index}
                isImageLoaded={imagesLoaded.has(image)}
                isDownloading={downloadingImages.has(index)}
                onDownload={createDownloadHandler(image, index)}
                onKeyDown={createKeyDownHandler(image, index)}
                onImageClick={createImageClickHandler(index)}
              />
            ))}
          </div>
        </div>
      </AnimatedSection>
    );
  }
);

PerformantGallery.displayName = "PerformantGallery";

export default PerformantGallery;
