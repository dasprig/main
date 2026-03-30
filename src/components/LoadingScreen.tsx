import { SITE_NAME_LOWER } from "@/config/siteBrand";
import { useEffect, useState } from "react";
import LetterGlitch from "./LetterGlitch";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
  loadingDuration?: number;
}

const LoadingScreen = ({
  onLoadingComplete,
  loadingDuration = 4000,
}: LoadingScreenProps) => {
  const [showBrandName, setShowBrandName] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const revealTimer = setTimeout(() => {
      setShowBrandName(true);
    }, loadingDuration - 2500);

    // Start fade out transition
    const fadeOutTimer = setTimeout(() => {
      setFadeOut(true);
    }, loadingDuration - 800);

    // Complete loading after fade out completes
    const completeTimer = setTimeout(() => {
      onLoadingComplete();
    }, loadingDuration);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, [onLoadingComplete, loadingDuration]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-black transition-all duration-800 ease-out ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Letter Glitch Background - Full Screen Matrix Effect */}
      <div className="absolute inset-0">
        <LetterGlitch
          glitchColors={["#e07a5d", "#61dca3", "#61b3dc", "#ffffff", "#00ff41"]}
          glitchSpeed={50}
          centerVignette={false}
          outerVignette={false}
          smooth={false}
        />
      </div>

      {/* Brand name — appears at the end */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div
          className={`text-center transition-all duration-1000 ${
            showBrandName ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white tracking-wider drop-shadow-lg">
            {SITE_NAME_LOWER}
          </h1>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
