import { forwardRef, ReactNode } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: "fadeInUp" | "fadeIn" | "slideInLeft" | "slideInRight";
  delay?: number;
  duration?: number;
}

const AnimatedSection = forwardRef<HTMLElement, AnimatedSectionProps>(
  (
    {
      children,
      className = "",
      animation = "fadeInUp",
      delay = 0,
      duration = 600,
    },
    ref
  ) => {
    const { elementRef, isIntersecting } = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
      triggerOnce: true,
    });

    const getAnimationClasses = () => {
      const baseClasses = "transition-all ease-out";

      if (!isIntersecting) {
        switch (animation) {
          case "fadeInUp":
            return `${baseClasses} opacity-0 translate-y-8`;
          case "fadeIn":
            return `${baseClasses} opacity-0`;
          case "slideInLeft":
            return `${baseClasses} opacity-0 -translate-x-8`;
          case "slideInRight":
            return `${baseClasses} opacity-0 translate-x-8`;
          default:
            return `${baseClasses} opacity-0 translate-y-8`;
        }
      } else {
        return `${baseClasses} opacity-100 translate-y-0 translate-x-0`;
      }
    };

    const getInlineStyles = () => {
      return {
        transitionDuration: `${duration}ms`,
        transitionDelay: delay > 0 ? `${delay}ms` : undefined,
        willChange: isIntersecting ? "auto" : "opacity, transform",
        backfaceVisibility: "hidden" as const,
        transform: "translateZ(0)",
      };
    };

    const combinedRef = (element: HTMLElement | null) => {
      if (elementRef) {
        (elementRef as React.MutableRefObject<HTMLElement | null>).current =
          element;
      }
      if (ref) {
        if (typeof ref === "function") {
          ref(element);
        } else {
          (ref as React.MutableRefObject<HTMLElement | null>).current = element;
        }
      }
    };

    return (
      <section
        ref={combinedRef}
        className={`${getAnimationClasses()} ${className}`}
        style={getInlineStyles()}
      >
        {children}
      </section>
    );
  }
);

AnimatedSection.displayName = "AnimatedSection";

export default AnimatedSection;
