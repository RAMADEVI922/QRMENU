/**
 * Clerk Authentication Diagnostics
 * Helps debug Clerk configuration and authentication errors
 * 
 * Common Issues:
 * - 400 errors from identitytoolkit.googleapis.com: Invalid API keys or credentials
 * - Cookie digest errors: Session/token validation issues
 * - Development keys warning: Expected in development, add production keys for live environment
 * 
 * Usage:
 * __clerkDiag.check() - Run full diagnostics
 * __clerkDiag.getStatus() - Get current auth status
 * __clerkDiag.testAuth() - Test authentication flow
 * __clerkDiag.getConfig() - View current Clerk config
 */

interface ClerkConfig {
  publishableKey?: string;
  isConfigured: boolean;
  isDevelopment: boolean;
  hasValidKey: boolean;
  keyType: string;
}

interface ClerkStatus {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId?: string;
  sessionId?: string;
  organizationId?: string;
}

class ClerkDiagnostics {
  /**
   * Get current Clerk configuration
   */
  getConfig(): ClerkConfig {
    const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
    const isDevelopment = !publishableKey || publishableKey.includes('test');
    const hasValidKey = !!(publishableKey && publishableKey.length > 10);

    return {
      publishableKey: publishableKey ? `${publishableKey.substring(0, 10)}...` : 'NOT SET',
      isConfigured: !!publishableKey,
      isDevelopment,
      hasValidKey,
      keyType: publishableKey?.includes('live') ? 'PRODUCTION' : 'DEVELOPMENT',
    };
  }

  /**
   * Get current authentication status
   */
  getStatus(): ClerkStatus {
    const window_ = typeof window !== 'undefined' ? (window as any) : null;
    const clerk = window_?.Clerk || null;

    return {
      isLoaded: !!clerk?.loaded,
      isSignedIn: !!clerk?.user,
      userId: clerk?.user?.id,
      sessionId: clerk?.session?.id,
      organizationId: clerk?.organization?.id,
    };
  }

  /**
   * Run full diagnostics
   */
  check(): void {
    console.group('🔍 Clerk Diagnostics Report');

    // Configuration check
    console.group('⚙️ Configuration');
    const config = this.getConfig();
    console.log('Publishable Key Set:', config.isConfigured);
    console.log('Key Type:', config.keyType);
    console.log('Has Valid Format:', config.hasValidKey);
    if (!config.hasValidKey) {
      console.warn(
        '⚠️ WARNING: Publishable key appears invalid.\n' +
        'Make sure VITE_CLERK_PUBLISHABLE_KEY is set in .env.local\n' +
        'Get it from: app.clerk.com → Applications → API Keys'
      );
    }
    console.groupEnd();

    // Status check
    console.group('🔐 Authentication Status');
    const status = this.getStatus();
    console.log('Clerk Loaded:', status.isLoaded ? '✅' : '❌');
    console.log('User Signed In:', status.isSignedIn ? '✅' : '❌');
    console.log('User ID:', status.userId || 'Not authenticated');
    console.log('Session ID:', status.sessionId || 'Not available');
    console.groupEnd();

    // Common issues
    console.group('⚠️ Common Issues');

    // Issues related to 400 errors
    console.group('400 errors from identitytoolkit.googleapis.com');
    console.log('Possible causes:');
    console.log('1. Invalid or misconfigured Clerk API keys');
    console.log('2. API key from wrong environment (mixing dev/prod keys)');
    console.log('3. Clerk provider not properly initialized in main.tsx');
    console.log('4. Missing or invalid VITE_CLERK_PUBLISHABLE_KEY environment variable');
    console.log('\nSolution:');
    console.log('- Verify .env.local has correct VITE_CLERK_PUBLISHABLE_KEY');
    console.log('- Check ClerkProvider is wrapping your app in main.tsx');
    console.log('- Make sure key matches your Clerk application instance');
    console.log('- Try clearing browser cache and local storage');
    console.groupEnd();

    // Cookie/digest errors
    console.group('Cookie digest errors');
    console.log('Possible causes:');
    console.log('1. Session data corruption');
    console.log('2. Mismatch between development/production environments');
    console.log('3. Old session data from different Clerk instance');
    console.log('4. Browser privacy/incognito mode restrictions');
    console.log('\nSolution:');
    console.log('- Clear browser cookies and local storage');
    console.log('- Close incognito/private window');
    console.log('- Sign out and sign back in');
    console.log('- Restart development server');
    console.groupEnd();

    console.groupEnd();

    // Recommendations
    console.group('✅ Recommendations');
    if (config.isDevelopment) {
      console.log('✓ Development keys are active (expected for development)');
      console.log('✓ Switch to production keys before deploying');
    }
    if (!status.isLoaded) {
      console.warn('Clerk is not loaded yet. Wait for page to fully load.');
    }
    if (!status.isSignedIn) {
      console.log('User not signed in. This is normal for public pages.');
    }
    console.groupEnd();

    console.groupEnd();
  }

  /**
   * Test authentication flow
   */
  testAuth(): void {
    console.log('🧪 Testing Clerk Authentication...');
    console.log('Current Status:');
    const status = this.getStatus();
    console.table(status);

    if (!status.isLoaded) {
      console.warn('⚠️ Clerk not loaded yet');
      return;
    }

    if (status.isSignedIn) {
      console.log('✅ Authentication successful');
      console.log('User ID:', status.userId);
      console.log('Session ID:', status.sessionId);
    } else {
      console.log('ℹ️ User not signed in. Navigate to login page to test sign-in flow.');
    }
  }

  /**
   * Clear Clerk session (for testing)
   */
  clearSession(): void {
    console.log('🗑️ Clearing Clerk session...');
    if (typeof window !== 'undefined') {
      // Clear Clerk-related cookies and storage
      document.cookie.split(';').forEach((c) => {
        const cookieName = c.split('=')[0].trim();
        if (cookieName.includes('clerk') || cookieName.includes('session')) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });

      // Clear localStorage items
      Object.keys(localStorage).forEach((key) => {
        if (key.includes('clerk')) {
          localStorage.removeItem(key);
        }
      });

      console.log('✅ Clerk session cleared');
      console.log('⚠️ Page will now reload...');
      setTimeout(() => window.location.reload(), 1000);
    }
  }

  /**
   * Display environment variables (safe - only shows keys)
   */
  showEnv(): void {
    console.group('🔑 Environment Variables');
    console.log('VITE_CLERK_PUBLISHABLE_KEY:', import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? '✅ SET' : '❌ NOT SET');
    console.log('VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY ? '✅ SET' : '❌ NOT SET');
    console.log('VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ SET' : '❌ NOT SET');
    console.groupEnd();
  }
}

// Create singleton
const clerkDiag = new ClerkDiagnostics();

// Register global commands
if (typeof window !== 'undefined') {
  try {
    (window as any).__clerkDiag = {
      check: () => clerkDiag.check(),
      getStatus: () => console.table(clerkDiag.getStatus()),
      getConfig: () => console.table(clerkDiag.getConfig()),
      testAuth: () => clerkDiag.testAuth(),
      clearSession: () => clerkDiag.clearSession(),
      showEnv: () => clerkDiag.showEnv(),
    };
    console.log('✅ Clerk diagnostics initialized');
  } catch (error) {
    console.warn('Failed to initialize Clerk diagnostics:', error);
  }
}

export { clerkDiag };
