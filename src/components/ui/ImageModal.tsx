import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt: string;
  imageName?: string;
  onDownload?: () => void;
  isDownloading?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  currentIndex?: number;
  totalImages?: number;
}

const ImageModal = ({
  isOpen,
  onClose,
  imageSrc,
  imageAlt,
  imageName,
  onDownload,
  isDownloading = false,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  currentIndex,
  totalImages,
}: ImageModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // Preload current image and adjacent images
  useEffect(() => {
    if (!imageSrc) return;

    const imagesToPreload = [imageSrc];
    
    // Add next and previous images if they exist
    if (onNext && hasNext) {
      // We don't have access to next image src here, but we can still optimize current image
    }

    const loadImage = (src: string) => {
      if (preloadedImages.has(src)) {
        setImageLoaded(true);
        return;
      }

      const img = new Image();
      img.fetchPriority = "high";
      img.decoding = "async";
      
      img.onload = () => {
        setPreloadedImages(prev => new Set([...prev, src]));
        if (src === imageSrc) {
          setImageLoaded(true);
        }
      };
      
      img.src = src;
    };

    // Load current image immediately
    loadImage(imageSrc);
    setIsZoomed(false);
  }, [imageSrc]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasPrevious && onPrevious) {
            onPrevious();
          }
          break;
        case "ArrowRight":
          if (hasNext && onNext) {
            onNext();
          }
          break;
        case " ":
          e.preventDefault();
          setIsZoomed(!isZoomed);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onNext, onPrevious, hasNext, hasPrevious, isZoomed]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  // Handle image click to toggle zoom
  const handleImageClick = () => {
    setIsZoomed(!isZoomed);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleBackdropClick}
      style={{ contain: "layout style paint" }}
    >
      {/* Modal Container */}
      <div className="relative w-full h-full max-w-7xl mx-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 bg-background/10 backdrop-blur-sm border-b border-border/20">
          <div className="flex items-center gap-3">
            <h3 className="text-lg sm:text-xl font-semibold text-white truncate">
              {imageName || imageAlt}
            </h3>
            {currentIndex !== undefined && totalImages && (
              <span className="px-3 py-1 bg-background/20 backdrop-blur-sm rounded-full text-sm text-white/80">
                {currentIndex + 1} / {totalImages}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Download Button */}
            {onDownload && (
              <Button
                onClick={onDownload}
                disabled={isDownloading}
                variant="outline"
                size="sm"
                className="bg-background/20 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    <span className="hidden sm:inline">Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} className="mr-2" />
                    <span className="hidden sm:inline">Download</span>
                  </>
                )}
              </Button>
            )}

            {/* Close Button */}
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="bg-background/20 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 relative overflow-hidden">
          {/* Navigation Buttons */}
          {hasPrevious && onPrevious && (
            <Button
              onClick={onPrevious}
              variant="outline"
              size="lg"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/20 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 p-3"
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </Button>
          )}

          {hasNext && onNext && (
            <Button
              onClick={onNext}
              variant="outline"
              size="lg"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/20 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 p-3"
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </Button>
          )}

          {/* Image */}
          <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
            {!imageLoaded && (
              <div className="w-32 h-32 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            )}

            <img
              ref={imageRef}
              src={imageSrc}
              alt={imageAlt}
              className={`
                max-w-full max-h-full object-contain cursor-pointer transition-all duration-300 ease-out
                ${imageLoaded ? "opacity-100" : "opacity-0"}
                ${isZoomed ? "scale-150 sm:scale-200" : "scale-100"}
                ${isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"}
              `}
              onLoad={() => setImageLoaded(true)}
              onClick={handleImageClick}
              draggable={false}
              style={{
                contain: "layout style paint",
                willChange: isZoomed ? "transform" : "auto",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-background/10 backdrop-blur-sm border-t border-border/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Instructions */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
              <span className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white/10 rounded text-xs">ESC</kbd>
                Close
              </span>
              <span className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white/10 rounded text-xs">SPACE</kbd>
                Zoom
              </span>
              {(hasNext || hasPrevious) && (
                <span className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">←</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">→</kbd>
                  Navigate
                </span>
              )}
            </div>

            {/* Mobile Navigation */}
            <div className="flex items-center gap-2 sm:hidden">
              {hasPrevious && onPrevious && (
                <Button
                  onClick={onPrevious}
                  variant="outline"
                  size="sm"
                  className="bg-background/20 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                >
                  <ChevronLeft size={16} />
                </Button>
              )}

              {hasNext && onNext && (
                <Button
                  onClick={onNext}
                  variant="outline"
                  size="sm"
                  className="bg-background/20 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                >
                  <ChevronRight size={16} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;