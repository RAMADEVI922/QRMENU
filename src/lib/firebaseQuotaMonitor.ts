/**
 * Firebase Quota Monitor
 * Tracks and reports quota exhaustion errors to help optimize usage
 * 
 * Firebase Spark Plan (Free) Limits:
 * - 50,000 read operations per day
 * - 20,000 write operations per day
 * - 20,000 delete operations per day
 * 
 * Usage:
 * - Monitor quota errors automatically
 * - Get quota status: __quotaMonitor.getStatus()
 * - Reset stats: __quotaMonitor.reset()
 * - Get suggestions: __quotaMonitor.getSuggestions()
 */

interface QuotaStats {
  totalErrors: number;
  lastErrorTime: number;
  lastErrorMessage: string;
  errorTimes: number[];
  isCurrentlyLimited: boolean;
  nextRetryAt: number;
}

class FirebaseQuotaMonitor {
  private stats: QuotaStats = {
    totalErrors: 0,
    lastErrorTime: 0,
    lastErrorMessage: '',
    errorTimes: [],
    isCurrentlyLimited: false,
    nextRetryAt: 0,
  };

  private readonly QUOTA_ERROR_WINDOW = 60000; // 1 minute window for checking error rate
  private readonly MAX_ERRORS_PER_WINDOW = 5; // If 5+ errors in 1 minute, flag as limited
  private readonly BACKOFF_DURATION = 30000; // 30 seconds backoff after quota error

  /**
   * Record a quota error
   */
  recordQuotaError(message: string): void {
    this.stats.totalErrors++;
    this.stats.lastErrorTime = Date.now();
    this.stats.lastErrorMessage = message;
    this.stats.errorTimes.push(Date.now());

    // Clean up old error times (older than 1 minute)
    const cutoffTime = Date.now() - this.QUOTA_ERROR_WINDOW;
    this.stats.errorTimes = this.stats.errorTimes.filter((time) => time > cutoffTime);

    // Check if we're hitting quota too frequently
    if (this.stats.errorTimes.length >= this.MAX_ERRORS_PER_WINDOW) {
      this.stats.isCurrentlyLimited = true;
      this.stats.nextRetryAt = Date.now() + this.BACKOFF_DURATION;
      console.error(
        `🚨 QUOTA LIMIT DETECTED 🚨\n` +
        `We've hit ${this.stats.errorTimes.length} quota errors in the last minute.\n` +
        `Backing off for ${this.BACKOFF_DURATION / 1000} seconds.\n` +
        `Suggestion: Upgrade to Firebase Blaze plan or reduce write frequency.`
      );
    } else if (this.stats.errorTimes.length >= 3) {
      console.warn(
        `⚠️ Multiple quota errors detected (${this.stats.errorTimes.length} in last minute).\n` +
        `If this continues, quota limit will be triggered.`
      );
    }
  }

  /**
   * Check if we should be backing off from writes
   */
  shouldBackoff(): boolean {
    if (!this.stats.isCurrentlyLimited) {
      return false;
    }

    const now = Date.now();
    if (now > this.stats.nextRetryAt) {
      console.log('✅ Quota backoff period expired. Resuming normal operations.');
      this.stats.isCurrentlyLimited = false;
      return false;
    }

    const remainingSeconds = Math.ceil((this.stats.nextRetryAt - now) / 1000);
    console.warn(`⏸️ Still in quota backoff (${remainingSeconds}s remaining)`);
    return true;
  }

  /**
   * Get current quota status
   */
  getStatus(): string {
    const status =
      `Firebase Quota Status:\n` +
      `📊 Total Quota Errors: ${this.stats.totalErrors}\n` +
      `⏰ Last Error: ${this.stats.lastErrorTime ? new Date(this.stats.lastErrorTime).toLocaleTimeString() : 'Never'}\n` +
      `📈 Recent Errors (last 60s): ${this.stats.errorTimes.length}\n` +
      `🚦 Currently Limited: ${this.stats.isCurrentlyLimited ? 'YES ⛔' : 'NO ✅'}`;

    if (this.stats.isCurrentlyLimited) {
      const remaining = Math.ceil((this.stats.nextRetryAt - Date.now()) / 1000);
      return status + `\n⏱️ Next Retry: ${remaining}s`;
    }

    return status;
  }

  /**
   * Get optimization suggestions
   */
  getSuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.stats.totalErrors === 0) {
      return ['✅ No quota errors detected. Keep up good practices!'];
    }

    if (this.stats.errorTimes.length >= this.MAX_ERRORS_PER_WINDOW) {
      suggestions.push(
        '❌ Quota limit triggered. You are writing too frequently.',
        '💡 Solution: Upgrade to Firebase Blaze plan (pay-as-you-go)',
        '💡 Or: Reduce write frequency by batching updates',
        '💡 Or: Implement exponential backoff (already enabled)'
      );
    } else if (this.stats.totalErrors >= 5) {
      suggestions.push(
        '⚠️ Multiple quota errors detected.',
        '💡 Try batching writes together',
        '💡 Implement debouncing for rapid updates',
        '💡 Check if offline mode is syncing too frequently'
      );
    } else {
      suggestions.push(
        '💡 Occasional quota errors are normal. Continue monitoring.',
        '💡 If errors persist, check your write frequency',
        '💡 Consider upgrading Firebase plan if using heavily'
      );
    }

    return suggestions;
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.stats = {
      totalErrors: 0,
      lastErrorTime: 0,
      lastErrorMessage: '',
      errorTimes: [],
      isCurrentlyLimited: false,
      nextRetryAt: 0,
    };
    console.log('✅ Quota monitor stats reset');
  }

  /**
   * Get detailed error log
   */
  getErrorLog(): string {
    if (this.stats.totalErrors === 0) {
      return 'No quota errors recorded';
    }

    const recentErrors = this.stats.errorTimes.map((time) => {
      return `  ${new Date(time).toLocaleTimeString()}`;
    });

    return (
      `Quota Error Timeline (last error at ${new Date(this.stats.lastErrorTime).toLocaleTimeString()}):\n` +
      recentErrors.join('\n')
    );
  }
}

// Create singleton instance
const quotaMonitor = new FirebaseQuotaMonitor();

// Register global commands for browser console
if (typeof window !== 'undefined') {
  try {
    (window as any).__quotaMonitor = {
      getStatus: () => console.log(quotaMonitor.getStatus()),
      getSuggestions: () => quotaMonitor.getSuggestions().forEach((s) => console.log(s)),
      reset: () => quotaMonitor.reset(),
      getErrorLog: () => console.log(quotaMonitor.getErrorLog()),
      shouldBackoff: () => quotaMonitor.shouldBackoff(),
      recordError: (msg: string) => quotaMonitor.recordQuotaError(msg),
    };
    console.log('✅ Quota monitor initialized');
  } catch (error) {
    console.warn('Failed to initialize quota monitor:', error);
  }
}

export { quotaMonitor };
export type { QuotaStats };
