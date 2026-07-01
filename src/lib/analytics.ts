/**
 * src/lib/analytics.ts
 *
 * This file handles initialization and tracking for Google Analytics and Microsoft Clarity.
 * In development / preview, it logs events to the browser console for testing and verification.
 */

import { config } from './config';

// Declare global types for third-party scripts
declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    clarity?: (...args: any[]) => void;
  }
}

/**
 * Initialize Google Analytics (gtag) and Microsoft Clarity dynamically.
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;

  const { GA_TRACKING_ID, CLARITY_PROJECT_ID } = config;

  // 1. Google Analytics Setup
  if (GA_TRACKING_ID) {
    try {
      // Inject GA Script
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
      document.head.appendChild(gaScript);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
      
      window.gtag('js', new Date());
      window.gtag('config', GA_TRACKING_ID, {
        send_page_view: true,
        cookie_flags: 'SameSite=None;Secure' // Ensure compatibility inside iframe previews
      });
      
      console.log(`📈 Google Analytics initialized with ID: ${GA_TRACKING_ID}`);
    } catch (error) {
      console.error('⚠️ Failed to initialize Google Analytics:', error);
    }
  }

  // 2. Microsoft Clarity Setup
  if (CLARITY_PROJECT_ID) {
    try {
      /* eslint-disable */
      (function(c: any, l: any, a: any, r: any, i: any, t: any, y: any){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", CLARITY_PROJECT_ID, undefined, undefined);
      /* eslint-enable */
      console.log(`🔍 Microsoft Clarity initialized with Project ID: ${CLARITY_PROJECT_ID}`);
    } catch (error) {
      console.error('⚠️ Failed to initialize Microsoft Clarity:', error);
    }
  }

  // Set up Scroll Depth tracking automatically
  setupScrollDepthTracking();
}

/**
 * Tracks custom events to GA and Microsoft Clarity.
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}): void {
  if (typeof window === 'undefined') return;

  // Console logging for verification
  console.log(`📊 [Analytics Event] "${eventName}"`, params);

  // Send to Google Analytics
  if (window.gtag && config.GA_TRACKING_ID) {
    window.gtag('event', eventName, params);
  }

  // Send to Microsoft Clarity
  if (window.clarity && config.CLARITY_PROJECT_ID) {
    window.clarity('event', eventName, params);
  }
}

/**
 * Listen to scroll and track milestones (25%, 50%, 75%, 100%)
 */
function setupScrollDepthTracking(): void {
  if (typeof window === 'undefined') return;

  const trackedDepths = new Set<number>();
  
  const handleScroll = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return;
    
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollPercentage = Math.round((scrollTop / scrollHeight) * 100);
    
    const milestones = [25, 50, 75, 100];
    for (const milestone of milestones) {
      if (scrollPercentage >= milestone && !trackedDepths.has(milestone)) {
        trackedDepths.add(milestone);
        trackEvent('Scroll_Depth', { depth_percentage: milestone });
      }
    }
  };

  // Throttle scroll listener for performance
  let timeout: any = null;
  window.addEventListener('scroll', () => {
    if (timeout) return;
    timeout = setTimeout(() => {
      handleScroll();
      timeout = null;
    }, 250);
  }, { passive: true });
}
