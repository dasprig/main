import { ArrowUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";

// Import section components
import HeroSection from "@/components/sections/HeroSection";
import MiddleSections from "@/components/sections/MiddleSections";
import CollectionsSection from "@/components/sections/CollectionsSection";
import TokenomicsSection from "@/components/sections/TokenomicsSection";
import FooterSection from "@/components/sections/FooterSection";
// Import optimized components
import { PerformantGallery } from "@/components/optimized";
// Import modal component
import ImageModal from "@/components/ui/ImageModal";
import {
  LAUNCHMYNFT_BASE,
  LAUNCHMYNFT_COLLECTION_ID,
  LAUNCHMYNFT_OWNER_ID,
  LAUNCHMYNFT_SOLANA_JS_PATH,
  SITE_DISPLAY_NAME,
  SITE_NAME_LOWER,
} from "@/config/siteBrand";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// Static image arrays moved outside component to prevent re-creation on every render
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

// V1 Sprig — first drawings
const V1_SPRIG_IMAGES = [
  "/v1/1.webp",
  "/v1/2.webp",
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

// Special 1/1's with custom names
const ONE_OF_ONES = [
  { image: "/17.webp", name: "Jup Studio" },
  { image: "/18.webp", name: "JUP & JUICE" },
  { image: "/21.webp", name: "Jupiter" },
  { image: "/22.webp", name: "meow" },
  { image: "/23.webp", name: "kash" },
  { image: "/24.webp", name: "mei" },
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

const Index = () => {
  const { toast } = useToast();
  const [heroVisible, setHeroVisible] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [downloadingImages, setDownloadingImages] = useState<
    Set<number | string>
  >(new Set());
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<{
    src: string;
    alt: string;
    name: string;
    collection: string;
    index: number;
  } | null>(null);

  // Refs for intersection observer
  const mintSectionRef = useRef<HTMLDivElement>(null);
  const contractRef = useRef<HTMLElement>(null);
  const wordsRef = useRef<HTMLElement>(null);
  const tokenomicsRef = useRef<HTMLElement>(null);
  const galleryRef = useRef<HTMLElement>(null);
  const v1SprigRef = useRef<HTMLElement>(null);
  const oneOfOnesRef = useRef<HTMLElement>(null);
  const stickersRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  // Scroll functions for navigation
  const scrollToSection = (ref: React.RefObject<HTMLElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Create comprehensive image collections for modal navigation
  const allImageCollections = {
    gallery: GALLERY_IMAGES.map((src, index) => ({
      src,
      alt: `${SITE_DISPLAY_NAME} adventure ${index + 1}`,
      name: `${SITE_DISPLAY_NAME} ${index + 1}`,
      collection: 'gallery',
      index
    })),
    v1: V1_SPRIG_IMAGES.map((src, index) => ({
      src,
      alt: `V1 ${SITE_DISPLAY_NAME} ${index + 1}`,
      name: `V1 ${SITE_DISPLAY_NAME} ${index + 1}`,
      collection: 'v1',
      index
    })),
    oneOfOnes: ONE_OF_ONES.map((item, index) => ({
      src: item.image,
      alt: `1/1 ${item.name}`,
      name: item.name,
      collection: 'oneOfOnes',
      index
    })),
    stickers: STICKER_IMAGES.map((src, index) => ({
      src,
      alt: `${SITE_DISPLAY_NAME} sticker ${index + 1}`,
      name: `Sticker ${index + 1}`,
      collection: 'stickers',
      index
    }))
  };

  // Hero animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setHeroVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // LaunchMyNFT embed (same order as their site: globals → module script → stylesheet)
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.ownerId = LAUNCHMYNFT_OWNER_ID;
    window.collectionId = LAUNCHMYNFT_COLLECTION_ID;

    const script = document.createElement("script");
    script.type = "module";
    script.src = LAUNCHMYNFT_SOLANA_JS_PATH;
    document.head.appendChild(script);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${LAUNCHMYNFT_BASE}/solana.css`;
    document.head.appendChild(link);

    return () => {
      script.remove();
      link.remove();
      delete window.ownerId;
      delete window.collectionId;
    };
  }, []);

  // Optimized image preloading with priority management
  useEffect(() => {
    const loadImage = (src: string, priority: "high" | "medium" | "low" = "low") => {
      const img = new Image();
      img.fetchPriority = priority === "high" ? "high" : "auto";
      img.decoding = "async";
      
      img.onload = () => {
        setImagesLoaded((prev) => new Set([...prev, src]));
      };
      
      img.onerror = () => {
        console.warn(`Failed to load image: ${src}`);
      };
      
      img.src = src;
    };

    // Load critical images immediately
    const criticalImages = [
      "/alfie.webp",
      ...GALLERY_IMAGES.slice(0, 6),
      ...ONE_OF_ONES.map(item => item.image).slice(0, 4),
      ...STICKER_IMAGES.slice(0, 6)
    ];
    
    criticalImages.forEach(src => loadImage(src, "high"));

    // Load remaining images with lower priority
    const loadRemainingImages = () => {
      const remainingImages = [
        ...GALLERY_IMAGES.slice(6),
        ...ONE_OF_ONES.map(item => item.image).slice(4),
        ...STICKER_IMAGES.slice(6),
        ...V1_SPRIG_IMAGES
      ];
      
      remainingImages.forEach(src => loadImage(src, "low"));
    };

    // Use requestIdleCallback if available, otherwise use setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadRemainingImages);
    } else {
      setTimeout(loadRemainingImages, 100);
    }
  }, []);

  // Optimized Intersection Observer for animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "50px 0px -50px 0px",
    };

    let animationFrame: number;

    const observer = new IntersectionObserver((entries) => {
      // Batch DOM updates in a single animation frame
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      animationFrame = requestAnimationFrame(() => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up");
            // Optimize for animation
            (entry.target as HTMLElement).style.willChange =
              "transform, opacity";

            // Clean up after animation
            setTimeout(() => {
              (entry.target as HTMLElement).style.willChange = "auto";
            }, 1000);
          }
        });
      });
    }, observerOptions);

    const elements = [
      contractRef.current,
      wordsRef.current,
      tokenomicsRef.current,
      galleryRef.current,
      v1SprigRef.current,
      oneOfOnesRef.current,
      stickersRef.current,
      footerRef.current,
    ];
    elements.forEach((el) => el && observer.observe(el));

    return () => {
      observer.disconnect();
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  // Optimized scroll handler for back to top button
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setShowBackToTop(window.scrollY > 500);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle image click to open modal
  const handleImageClick = (collection: string, index: number) => {
    const imageCollection = allImageCollections[collection as keyof typeof allImageCollections];
    if (imageCollection && imageCollection[index]) {
      setModalImage(imageCollection[index]);
      setModalOpen(true);
    }
  };

  // Handle modal navigation
  const handleModalNext = () => {
    if (!modalImage) return;
    const collection = allImageCollections[modalImage.collection as keyof typeof allImageCollections];
    const nextIndex = modalImage.index + 1;
    if (nextIndex < collection.length) {
      setModalImage(collection[nextIndex]);
    }
  };

  const handleModalPrevious = () => {
    if (!modalImage) return;
    const collection = allImageCollections[modalImage.collection as keyof typeof allImageCollections];
    const prevIndex = modalImage.index - 1;
    if (prevIndex >= 0) {
      setModalImage(collection[prevIndex]);
    }
  };

  // Handle download function
  const handleDownload = async (imageSrc?: string, index?: number | string) => {
    // Use modal image if no specific image provided
    const srcToDownload = imageSrc || modalImage?.src;
    const indexToDownload = index || modalImage?.index || 0;
    
    if (!srcToDownload) return;

    // Add to downloading set
    setDownloadingImages((prev) => new Set([...prev, indexToDownload]));

    try {
      const response = await fetch(srcToDownload);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${SITE_NAME_LOWER}-${indexToDownload}.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Complete!",
        description: `${SITE_NAME_LOWER}-${indexToDownload}.webp has been saved to your device.`,
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading the image.",
        variant: "destructive",
      });
    } finally {
      // Remove from downloading set
      setDownloadingImages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(indexToDownload);
        return newSet;
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  return (
    <>
      <style>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .image-shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        /* Enhanced Performance optimizations */
        .columns-1 img {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }
        
        /* Optimize large images */
        img[loading="lazy"] {
          contain: layout style paint;
        }
        
        /* GPU acceleration for animations */
        .will-change-transform {
          will-change: transform;
        }
        
        /* Optimize animation performance */
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          backface-visibility: hidden;
        }
        
        /* Reduce paint complexity */
        .backdrop-blur-sm {
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          contain: layout style paint;
        }
        
        /* Optimize grid layouts */
        .grid {
          contain: layout;
        }
      `}</style>

      <div className="min-h-screen bg-background text-foreground">
        {/* Hero Section */}
        <HeroSection
          heroVisible={heroVisible}
          imagesLoaded={imagesLoaded}
          scrollToSection={scrollToSection}
          mintSectionRef={mintSectionRef}
          contractRef={contractRef}
          galleryRef={galleryRef}
          oneOfOnesRef={oneOfOnesRef}
          stickersRef={stickersRef}
          v1SprigRef={v1SprigRef}
          tokenomicsRef={tokenomicsRef}
          handleKeyDown={handleKeyDown}
          onImageClick={() => handleImageClick('gallery', 12)}
        />

        <MiddleSections contractRef={contractRef} wordsRef={wordsRef} />

        {/* Gallery Section - Now Optimized */}
        <PerformantGallery
          ref={galleryRef}
          imagesLoaded={imagesLoaded}
          downloadingImages={downloadingImages}
          handleDownload={handleDownload}
          handleKeyDown={handleKeyDown}
          onImageClick={(index) => handleImageClick('gallery', index)}
        />

        {/* Collections Section (1/1's, V1 Sprig, stickers) */}
        <CollectionsSection
          oneOfOnesRef={oneOfOnesRef}
          v1SprigRef={v1SprigRef}
          stickersRef={stickersRef}
          imagesLoaded={imagesLoaded}
          downloadingImages={downloadingImages}
          handleDownload={handleDownload}
          handleKeyDown={handleKeyDown}
          onImageClick={handleImageClick}
        />

        {/* Tokenomics Section */}
        <TokenomicsSection ref={tokenomicsRef} />

        {/* Footer Section */}
        <FooterSection ref={footerRef} />

        {/* Image Modal */}
        {modalImage && (
          <ImageModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            imageSrc={modalImage.src}
            imageAlt={modalImage.alt}
            imageName={modalImage.name}
            onDownload={() => handleDownload()}
            isDownloading={downloadingImages.has(modalImage.index)}
            onNext={handleModalNext}
            onPrevious={handleModalPrevious}
            hasNext={
              modalImage.index <
              allImageCollections[modalImage.collection as keyof typeof allImageCollections].length - 1
            }
            hasPrevious={modalImage.index > 0}
            currentIndex={modalImage.index}
            totalImages={
              allImageCollections[modalImage.collection as keyof typeof allImageCollections].length
            }
          />
        )}

        {/* Enhanced Back to Top Button */}
        <button
          onClick={scrollToTop}
          className={`fixed bottom-6 right-6 z-40 bg-primary text-primary-foreground p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/30 will-change-transform ${
            showBackToTop
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
          aria-label="Back to top"
          style={{
            backfaceVisibility: "hidden",
            transform: "translateZ(0)",
          }}
        >
          <ArrowUp size={20} />
        </button>
      </div>
    </>
  );
};

export default Index;
