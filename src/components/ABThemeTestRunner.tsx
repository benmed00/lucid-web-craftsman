import { useABThemeTest } from '@/hooks/useABThemeTest';

/**
 * Invisible component that activates A/B theme testing for visitors.
 * Place inside Router + QueryClientProvider but outside admin routes.
 */
const ABThemeTestRunner = () => {
  useABThemeTest();
  return null;
};

export default ABThemeTestRunner;
