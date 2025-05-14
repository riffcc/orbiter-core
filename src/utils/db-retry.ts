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
  initialDelay: number = 100
): Promise<T> {
  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (!error.code?.includes('LOCK') && 
          !error.cause?.code?.includes('LOCK') &&
          !error.message?.includes('lock') &&
          !error.message?.includes('Resource temporarily unavailable')) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.warn(`Database operation failed with locking error, retrying (${attempt + 1}/${maxRetries})...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  
  throw lastError || new Error('Failed after maximum retries');
}
