import { useState, useEffect } from 'react'

/**
 * Hook to match media queries
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    if (media.matches !== matches) {
      setMatches(media.matches)
    }

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Use addEventListener for modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    } else {
      // Fallback for older browsers
      media.addListener(listener)
      return () => media.removeListener(listener)
    }
  }, [matches, query])

  return matches
}

/**
 * Hook to check if viewport is mobile
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)')
}

/**
 * Hook to check if viewport is tablet
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
}

/**
 * Hook to check if viewport is desktop
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1025px)')
}
