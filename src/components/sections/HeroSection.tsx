import { SITE_NAME_LOWER } from "@/config/siteBrand";

interface HeroSectionProps {
  heroVisible: boolean;
  imagesLoaded: Set<string>;
  scrollToSection: (ref: React.RefObject<HTMLElement | null>) => void;
  mintSectionRef: React.RefObject<HTMLDivElement | null>;
  contractRef: React.RefObject<HTMLElement | null>;
  galleryRef: React.RefObject<HTMLElement>;
  oneOfOnesRef: React.RefObject<HTMLElement>;
  stickersRef: React.RefObject<HTMLElement>;
  v1SprigRef: React.RefObject<HTMLElement>;
  tokenomicsRef: React.RefObject<HTMLElement>;
  handleKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
  onImageClick: () => void;
}

const HeroSection = ({
  heroVisible,
  imagesLoaded,
  scrollToSection,
  mintSectionRef,
  contractRef,
  galleryRef,
  oneOfOnesRef,
  stickersRef,
  v1SprigRef,
  tokenomicsRef,
  handleKeyDown,
  onImageClick,
}: HeroSectionProps) => {
  return (
    <section
      className={`min-h-screen flex flex-col transition-all duration-1000 ease-out ${
        heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {/* Header */}
      <header
        className={`py-6 text-center transition-all duration-1000 delay-100 ease-out ${
          heroVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
          {SITE_NAME_LOWER}
        </h1>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl mx-auto text-center space-y-8">
          {/* Hero image */}
          <div
            className={`relative transition-all duration-1200 delay-300 ease-out ${
              heroVisible
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-12 scale-95"
            }`}
          >
            {!imagesLoaded.has("/alfie.webp") && (
              <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 mx-auto rounded-full image-shimmer" />
            )}
            <img
              src="/alfie.webp"
              alt={`${SITE_NAME_LOWER}_memecoin`}
              className={`w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 mx-auto rounded-full transition-all duration-500 hover:scale-105 focus:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/30 cursor-pointer ${
                imagesLoaded.has("/alfie.webp")
                  ? "opacity-100"
                  : "opacity-0 absolute top-0"
              }`}
              style={{
                filter: "drop-shadow(0 4px 20px rgba(224, 122, 93, 0.15))",
              }}
              tabIndex={0}
              onClick={onImageClick}
              onKeyDown={(e) => handleKeyDown(e, onImageClick)}
              loading="eager"
            />
          </div>

          {/* Main Title */}
          <h2
            className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold transition-all duration-1000 delay-500 ease-out hover:text-primary/90 ${
              heroVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            hey anon
          </h2>

          {/* LaunchMyNFT embed IDs (see storage.googleapis.com/.../solana.html): button → slider → progress */}
          <div
            ref={mintSectionRef}
            id="mint-section"
            className={`flex flex-col items-center gap-4 w-full max-w-lg mx-auto min-h-[52px] pt-4 transition-all duration-1000 delay-700 ease-out ${
              heroVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <div id="mint-button-container" className="flex justify-center w-full" />
            <div
              id="slider-container"
              className="flex flex-row gap-2 items-center justify-center w-full max-w-md"
            >
              <span id="mint-slider" className="block w-[min(100%,200px)] min-w-[12.5rem] flex-1" />
              <span id="mint-slider-amount" className="block shrink-0 tabular-nums min-w-[1.5ch]" />
            </div>
            <div id="mint-counter" className="flex justify-center items-center w-full min-h-[44px]" />
          </div>

          {/* Navigation Links */}
          <div
            className={`flex flex-wrap justify-center gap-3 sm:gap-4 mb-6 transition-all duration-1000 delay-900 ease-out ${
              heroVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <button
              onClick={() => scrollToSection(contractRef)}
              className="bg-card/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-card/50 hover:text-primary transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              ca
            </button>
            <button
              onClick={() => scrollToSection(galleryRef)}
              className="bg-card/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-card/50 hover:text-primary transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              gallery
            </button>
            <button
              onClick={() => scrollToSection(stickersRef)}
              className="bg-card/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-card/50 hover:text-primary transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              stickers
            </button>
            <button
              onClick={() => scrollToSection(oneOfOnesRef)}
              className="bg-card/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-card/50 hover:text-primary transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              1/1's
            </button>
            <button
              onClick={() => scrollToSection(v1SprigRef)}
              className="bg-card/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-card/50 hover:text-primary transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              v1 {SITE_NAME_LOWER}
            </button>
            <button
              onClick={() => scrollToSection(tokenomicsRef)}
              className="bg-card/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-card/50 hover:text-primary transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              tokenomics
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
