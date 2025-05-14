/**
 * Retries a database operation with exponential backoff
 * @param operation The database operation to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @returns The result of the operation
 */
export async function retryDbOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  initialDelay: number = 100,
): Promise<T> {
  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      const err = error as Error & {
        code?: string;
        cause?: { code?: string };
      };
      lastError = err;

      if (
        !err.code?.includes("LOCK") &&
        !err.cause?.code?.includes("LOCK") &&
        !err.message?.includes("lock") &&
        !err.message?.includes("Resource temporarily unavailable")
      ) {
        throw error;
      }

      if (attempt === maxRetries) {
        throw error;
      }

      console.warn(
        `Database operation failed with locking error, retrying (${attempt + 1}/${maxRetries})...`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  throw lastError || new Error("Failed after maximum retries");
}
