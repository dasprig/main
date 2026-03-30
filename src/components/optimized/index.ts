import { lazy } from "react";

// Barrel exports for optimized components
export { default as LazyImage } from "./LazyImage";
export { default as AnimatedSection } from "./AnimatedSection";
export { default as PerformantGallery } from "./PerformantGallery";

// Lazy loaded components for code splitting
export const OptimizedHeroSection = lazy(
  () => import("./OptimizedHeroSection")
);
