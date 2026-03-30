// Debounce function for scroll and resize events
export const debounce = <T extends (...args: never[]) => unknown>(
  func: T,
  wait: number,
  immediate = false
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
};

// Throttle function for high-frequency events
export const throttle = <T extends (...args: never[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Optimize CSS animations for better performance
export const optimizeForAnimation = (element: HTMLElement) => {
  element.style.willChange = 'transform, opacity';
  element.style.backfaceVisibility = 'hidden';
  element.style.transform = 'translateZ(0)';
};

// Clean up animation optimization
export const cleanupAnimation = (element: HTMLElement) => {
  element.style.willChange = 'auto';
};

// Intersection Observer with better performance defaults
export const createOptimizedObserver = (
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
) => {
  const defaultOptions: IntersectionObserverInit = {
    threshold: 0.1,
    rootMargin: '50px 0px',
    ...options
  };
  
  return new IntersectionObserver(callback, defaultOptions);
};

// Preload critical resources
export const preloadResource = (href: string, as: string, type?: string) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (type) link.type = type;
  document.head.appendChild(link);
};

// Image format detection and optimization
export const getOptimizedImageSrc = (src: string): string => {
  // Check WebP support
  const canvas = document.createElement('canvas');
  const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  
  if (supportsWebP && src.match(/\.(jpg|jpeg|png)$/i)) {
    return src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  }
  
  return src;
};

// Bundle splitting helper
export const loadComponentAsync = <T>(
  importFunc: () => Promise<{ default: T }>
) => {
  return importFunc();
};

// Performance monitoring
export const measurePerformance = (name: string, fn: () => void) => {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`${name}-start`);
    fn();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  } else {
    fn();
  }
}; 