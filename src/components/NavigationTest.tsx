import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Navigation Animation Test Component
 * This component tests and logs the navigation animation behavior
 */
const NavigationTest = () => {
  const location = useLocation();
  const [animationTests, setAnimationTests] = useState({
    cssLoaded: false,
    currentPageActive: false,
    hoverEffects: false,
    gpuAcceleration: false,
    touchTargets: false,
    accessibility: false
  });

  useEffect(() => {
    const runTests = () => {
      const tests = { ...animationTests };

      // Test 1: Check if nav-link CSS is loaded
      const navLink = document.querySelector('.nav-link');
      if (navLink) {
        const styles = window.getComputedStyle(navLink);
        tests.cssLoaded = styles.position === 'relative' && styles.minHeight === '44px';
      }

      // Test 2: Check current page indication
      const currentPageLink = document.querySelector('.nav-link[aria-current="page"]');
      if (currentPageLink) {
        const afterStyles = window.getComputedStyle(currentPageLink, '::after');
        tests.currentPageActive = afterStyles.transform.includes('scaleX(1)') || 
                                 afterStyles.transform === 'matrix(1, 0, 0, 1, 0, 0)';
      }

      // Test 3: Check hover effects with pseudo-element
      const firstNavLink = document.querySelector('.nav-link');
      if (firstNavLink) {
        const afterStyles = window.getComputedStyle(firstNavLink, '::after');
        tests.hoverEffects = afterStyles.content === '""' && 
                           afterStyles.position === 'absolute';
      }

      // Test 4: Check GPU acceleration (transform property)
      if (firstNavLink) {
        const afterStyles = window.getComputedStyle(firstNavLink, '::after');
        tests.gpuAcceleration = afterStyles.transform.includes('scaleX') || 
                              afterStyles.transform !== 'none';
      }

      // Test 5: Check touch targets
      const navLinks = document.querySelectorAll('.nav-link');
      let allLinksHaveTouchTargets = true;
      navLinks.forEach(link => {
        const rect = link.getBoundingClientRect();
        if (rect.height < 44) {
          allLinksHaveTouchTargets = false;
        }
      });
      tests.touchTargets = allLinksHaveTouchTargets;

      // Test 6: Check accessibility features
      const hasAriaLabels = document.querySelector('nav[aria-label]') !== null;
      const hasCurrentPage = document.querySelector('[aria-current="page"]') !== null;
      tests.accessibility = hasAriaLabels && hasCurrentPage;

      setAnimationTests(tests);

      // Log results to console for debugging
      console.group('🧪 Navigation Animation Tests');
      console.log('✅ CSS Loaded:', tests.cssLoaded);
      console.log('✅ Current Page Active:', tests.currentPageActive);
      console.log('✅ Hover Effects:', tests.hoverEffects);
      console.log('✅ GPU Acceleration:', tests.gpuAcceleration);
      console.log('✅ Touch Targets (44px):', tests.touchTargets);
      console.log('✅ Accessibility:', tests.accessibility);
      console.log('📍 Current Route:', location.pathname);
      console.groupEnd();
    };

    // Run tests after DOM is ready
    setTimeout(runTests, 100);
  }, [location.pathname]);

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  const allTestsPassed = Object.values(animationTests).every(test => test === true);

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: allTestsPassed ? '#10b981' : '#ef4444',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        minWidth: '200px'
      }}
    >
      <div style={{ marginBottom: '8px' }}>
        🧪 Nav Tests: {allTestsPassed ? '✅ PASSED' : '❌ FAILED'}
      </div>
      <div style={{ fontSize: '12px', opacity: 0.9 }}>
        CSS: {animationTests.cssLoaded ? '✅' : '❌'} | 
        Active: {animationTests.currentPageActive ? '✅' : '❌'} | 
        Hover: {animationTests.hoverEffects ? '✅' : '❌'}<br/>
        GPU: {animationTests.gpuAcceleration ? '✅' : '❌'} | 
        Touch: {animationTests.touchTargets ? '✅' : '❌'} | 
        A11y: {animationTests.accessibility ? '✅' : '❌'}
      </div>
      <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
        Route: {location.pathname}
      </div>
    </div>
  );
};

export default NavigationTest;