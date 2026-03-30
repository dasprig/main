import { SITE_DISPLAY_NAME } from "@/config/siteBrand";
import { Download } from "lucide-react";
import { forwardRef } from "react";

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

interface GallerySectionProps {
  imagesLoaded: Set<string>;
  downloadingImages: Set<number | string>;
  handleDownload: (imageSrc: string, index: number | string) => Promise<void>;
  handleKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
}

const GallerySection = forwardRef<HTMLElement, GallerySectionProps>(
  ({ imagesLoaded, downloadingImages, handleDownload, handleKeyDown }, ref) => {
    return (
      <section ref={ref} className="py-12 sm:py-16 md:py-20 px-4 opacity-0">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {GALLERY_IMAGES.map((image, index) => (
              <div
                key={index}
                className="bg-card/30 backdrop-blur-sm overflow-hidden rounded-2xl transition-all duration-300 hover:bg-card/50 cursor-pointer relative group focus-within:ring-4 focus-within:ring-primary/30"
                tabIndex={0}
                onKeyDown={(e) =>
                  handleKeyDown(e, () => handleDownload(image, index))
                }
              >
                <div className="aspect-square overflow-hidden relative">
                  {!imagesLoaded.has(image) && (
                    <div className="absolute inset-0 image-shimmer" />
                  )}
                  <img
                    src={image}
                    alt={`${SITE_DISPLAY_NAME} adventure ${index + 1}`}
                    className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${
                      imagesLoaded.has(image) ? "opacity-100" : "opacity-0"
                    }`}
                    loading="lazy"
                  />
                </div>
                <button
                  onClick={() => handleDownload(image, index)}
                  disabled={downloadingImages.has(index)}
                  className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-background/90 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium opacity-0 translate-y-2 transition-all duration-200 hover:bg-primary hover:text-primary-foreground group-hover:opacity-100 group-hover:translate-y-0 focus:opacity-100 focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Download ${SITE_DISPLAY_NAME} image ${index + 1}`}
                >
                  {downloadingImages.has(index) ? (
                    <>
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span className="hidden sm:inline">Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download
                        size={12}
                        className="sm:w-3 sm:h-3 md:w-4 md:h-4"
                      />
                      <span className="hidden sm:inline">Download</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
);

GallerySection.displayName = "GallerySection";

export default GallerySection;
