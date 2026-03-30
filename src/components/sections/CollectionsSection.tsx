import { Button } from "@/components/ui/button";
import { SITE_DISPLAY_NAME, SITE_NAME_LOWER } from "@/config/siteBrand";
import { Download } from "lucide-react";
import { forwardRef, useState, useEffect } from "react";
import LazyImage from "@/components/optimized/LazyImage";

// Special 1/1's with custom names
const ONE_OF_ONES = [
  { image: "/17.webp", name: "Jup Studio" },
  { image: "/18.webp", name: "JUP & JUICE" },
  { image: "/21.webp", name: "Jupiter" },
  { image: "/22.webp", name: "meow" },
  { image: "/23.webp", name: "kash" },
  { image: "/24.webp", name: "mei" },
];

// V1 Sprig — first drawings
const V1_SPRIG_IMAGES = [
  "/v1/1.webp",
  // "/v1/2.webp",
  "/v1/3.webp",
  "/v1/4.webp",
  "/v1/5.webp",
  "/v1/6.webp",
  "/v1/7.webp",
  "/v1/8.webp",
  "/v1/9.webp",
  "/v1/10.webp",
  "/v1/11.webp",
  "/v1/12.webp",
  "/v1/13.webp",
  "/v1/14.webp",
  "/v1/15.webp",
  "/v1/16.webp",
  "/v1/17.webp",
];

// Sticker collection
const STICKER_IMAGES = [
  "/stickers/alfie_smile.webp",
  "/stickers/alfie_shok.webp",
  "/stickers/alfie_green chart.webp",
  "/stickers/alfie_g-string.webp",
  "/stickers/alfie_fly.webp",
  "/stickers/alfie_fly wit chart.webp",
  "/stickers/alfie_cup.webp",
  "/stickers/alfie_big smile.webp",
  "/stickers/alfie_beard.webp",
  "/stickers/alfie_bald.webp",
  "/stickers/alfie_sad.webp",
  "/stickers/alfie_multiple.webp",
  "/stickers/alfie_joint.webp",
  "/stickers/alfie_amaze.webp",
];

interface CollectionsSectionProps {
  oneOfOnesRef: React.RefObject<HTMLElement>;
  v1SprigRef: React.RefObject<HTMLElement>;
  stickersRef: React.RefObject<HTMLElement>;
  imagesLoaded: Set<string>;
  downloadingImages: Set<number | string>;
  handleDownload: (imageSrc: string, index: number | string) => Promise<void>;
  handleKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
  onImageClick: (collection: string, index: number) => void;
}

const CollectionsSection = forwardRef<HTMLDivElement, CollectionsSectionProps>(
  (
    {
      oneOfOnesRef,
      v1SprigRef,
      stickersRef,
      imagesLoaded,
      downloadingImages,
      handleDownload,
      handleKeyDown,
      onImageClick,
    },
    ref
  ) => {
    return (
      <div ref={ref}>
        {/* Stickers Section */}
        <section
          ref={stickersRef}
          className="py-12 sm:py-16 md:py-20 px-4 opacity-0"
        >
          <div className="w-full max-w-6xl mx-auto">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-primary-color mb-4">
              {SITE_NAME_LOWER} stickers
            </h3>
            <p className="text-center text-lg text-muted-foreground mb-8 sm:mb-12">
              download and use them anywhere you want
            </p>

            {STICKER_IMAGES.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {STICKER_IMAGES.map((sticker, index) => (
                  <div
                    key={index}
                    className="bg-card/30 backdrop-blur-sm overflow-hidden rounded-2xl transition-all duration-300 hover:bg-card/50 cursor-pointer relative group focus-within:ring-4 focus-within:ring-primary/30 aspect-square"
                    tabIndex={0}
                    onClick={() => onImageClick('stickers', index)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, () => onImageClick('stickers', index))
                    }
                  >
                    <div className="relative h-full p-2">
                      <LazyImage
                        src={sticker}
                        alt={`${SITE_DISPLAY_NAME} sticker ${index + 1}`}
                        className="w-full h-full object-contain transition-all duration-500 ease-out group-hover:scale-110"
                        aspectRatio="square"
                        priority={index < 6 ? "high" : "low"}
                      />
                    </div>

                    {/* Download Button */}
                    <button
                      onClick={() =>
                        handleDownload(sticker, `${SITE_NAME_LOWER}-sticker-${index}`)
                      }
                      disabled={downloadingImages.has(
                        `${SITE_NAME_LOWER}-sticker-${index}`
                      )}
                      className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm p-2 rounded-full text-xs font-medium opacity-0 translate-y-2 transition-all duration-200 hover:bg-primary hover:text-primary-foreground group-hover:opacity-100 group-hover:translate-y-0 focus:opacity-100 focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Download ${SITE_DISPLAY_NAME} sticker ${index + 1}`}
                    >
                      {downloadingImages.has(
                        `${SITE_NAME_LOWER}-sticker-${index}`
                      ) ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-card/30 flex items-center justify-center">
                  <span className="text-3xl">🎨</span>
                </div>
                <p className="text-lg text-muted-foreground italic">
                  stickers coming soon...
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {SITE_NAME_LOWER} is working on some awesome stickers for you
                </p>
              </div>
            )}

            {/* Download All Button */}
            {STICKER_IMAGES.length > 0 && (
              <div className="text-center mt-8 sm:mt-12">
                <Button
                  onClick={() => {
                    STICKER_IMAGES.forEach((sticker, index) => {
                      setTimeout(
                        () =>
                          handleDownload(
                            sticker,
                            `${SITE_NAME_LOWER}-sticker-${index}`
                          ),
                        index * 200
                      );
                    });
                  }}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium transition-all duration-200 hover:scale-105"
                >
                  <Download size={16} className="mr-2" />
                  download all stickers
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Sprig 1/1's section */}
        <section
          ref={oneOfOnesRef}
          className="py-12 sm:py-16 md:py-20 px-4 opacity-0"
        >
          <div className="w-full max-w-6xl mx-auto">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-primary-color mb-8 sm:mb-12">
              {SITE_NAME_LOWER} 1/1's
            </h3>

            {/* 1/1's Grid - Similar style to gallery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {ONE_OF_ONES.map((item, index) => (
                <div
                  key={index}
                  className="bg-card/30 backdrop-blur-sm overflow-hidden rounded-2xl transition-all duration-300 hover:bg-card/50 cursor-pointer relative group focus-within:ring-4 focus-within:ring-primary/30"
                  tabIndex={0}
                  onClick={() => onImageClick('oneOfOnes', index)}
                  onKeyDown={(e) =>
                    handleKeyDown(e, () => onImageClick('oneOfOnes', index))
                  }
                >
                  <div className="aspect-square overflow-hidden relative">
                    <LazyImage
                      src={item.image}
                      alt={`${SITE_DISPLAY_NAME} 1/1 - ${item.name}`}
                      className="w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-105"
                      aspectRatio="square"
                      priority={index < 3 ? "high" : "low"}
                    />

                    {/* 1/1 Badge */}
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-accent/90 backdrop-blur-sm text-accent-foreground px-3 py-1 rounded-full text-xs sm:text-sm font-bold shadow-lg">
                      1/1
                    </div>

                    {/* Name Badge */}
                    <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-sm sm:text-base font-medium text-foreground">
                        {item.name}
                      </span>
                    </div>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={() =>
                      handleDownload(
                        item.image,
                        `${SITE_NAME_LOWER}-1-1-${item.name}`
                      )
                    }
                    disabled={downloadingImages.has(
                      `${SITE_NAME_LOWER}-1-1-${item.name}`
                    )}
                    className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-background/90 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium opacity-0 translate-y-2 transition-all duration-200 hover:bg-primary hover:text-primary-foreground group-hover:opacity-100 group-hover:translate-y-0 focus:opacity-100 focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Download ${SITE_DISPLAY_NAME} 1/1 - ${item.name}`}
                  >
                    {downloadingImages.has(
                      `${SITE_NAME_LOWER}-1-1-${item.name}`
                    ) ? (
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

        {/* V1 Sprig section */}
        <section
          ref={v1SprigRef}
          className="py-12 sm:py-16 md:py-20 px-4 opacity-0"
        >
          <div className="w-full max-w-6xl mx-auto">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-primary-color mb-8 sm:mb-12">
              v1 {SITE_NAME_LOWER}
            </h3>

            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-6 md:gap-8 space-y-4 sm:space-y-6 md:space-y-8">
              {V1_SPRIG_IMAGES.map((image, index) => (
                <div
                  key={index}
                  className="bg-card/30 backdrop-blur-sm overflow-hidden rounded-2xl transition-all duration-300 hover:bg-card/50 cursor-pointer relative group focus-within:ring-4 focus-within:ring-primary/30 break-inside-avoid mb-4 sm:mb-6 md:mb-8"
                  tabIndex={0}
                  onClick={() => onImageClick('v1', index)}
                  onKeyDown={(e) =>
                    handleKeyDown(e, () => onImageClick('v1', index))
                  }
                >
                  <div className="relative bg-card/50">
                    <LazyImage
                      src={image}
                      alt={`V1 ${SITE_DISPLAY_NAME} ${index + 1}`}
                      className="w-full h-auto object-contain"
                      priority={index < 10 ? "low" : "low"}
                    />

                    {/* V1 Badge */}
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-secondary/90 backdrop-blur-sm text-secondary-foreground px-3 py-1 rounded-full text-xs sm:text-sm font-bold shadow-lg z-10">
                      V1
                    </div>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={() =>
                      handleDownload(image, `v1-${SITE_NAME_LOWER}-${index}`)
                    }
                    disabled={downloadingImages.has(
                      `v1-${SITE_NAME_LOWER}-${index}`
                    )}
                    className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-background/90 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium opacity-0 translate-y-2 transition-all duration-200 hover:bg-primary hover:text-primary-foreground group-hover:opacity-100 group-hover:translate-y-0 focus:opacity-100 focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Download V1 ${SITE_DISPLAY_NAME} ${index + 1}`}
                  >
                    {downloadingImages.has(`v1-${SITE_NAME_LOWER}-${index}`) ? (
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
      </div>
    );
  }
);

CollectionsSection.displayName = "CollectionsSection";

export default CollectionsSection;
