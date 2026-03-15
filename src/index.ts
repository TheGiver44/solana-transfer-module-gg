/**
 * Solana Transfer Module
 * A reusable module for SOL transfers that can be dropped into any JS/TSX project
 * 
 * Features:
 * - SOL transfers with priority fees
 * - Robust RPC connection with fallbacks
 * - TypeScript support
 * - React hook integration
 * - Vanilla JS support
 * - Error handling and retry logic
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  ComputeBudgetProgram,
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableAccount
} from '@solana/web3.js';

// Types
export interface TransferConfig {
  rpcUrl?: string;
  priorityFee?: number; // in microLamports
  commitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
  retryDelay?: number;
}

export interface TransferParams {
  from: string;
  to: string;
  amount: number; // in SOL
  memo?: string;
}

export interface TransferResult {
  success: boolean;
  signature?: string;
  error?: string;
  transaction?: string; // base64 encoded transaction
}

export interface RPCConfig {
  endpoints: string[];
  maxRetries: number;
  retryDelay: number;
  rateLimitDelay: number;
}

// Default configuration
const DEFAULT_CONFIG: TransferConfig = {
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  priorityFee: 50000, // 0.00005 SOL
  commitment: 'confirmed',
  maxRetries: 3,
  retryDelay: 1000
};

const DEFAULT_RPC_CONFIG: RPCConfig = {
  endpoints: [
    'https://mainnet.helius-rpc.com/?api-key=YOUR API KEY HERE',
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.g.alchemy.com/v2/demo'
  ],
  maxRetries: 3,
  retryDelay: 1000,
  rateLimitDelay: 100
};

// Constants
const LAMPORTS_PER_SOL = 1000000000;

/**
 * Robust RPC Connection Manager
 * Handles multiple RPC endpoints with fallback and rate limiting
 */
class RobustRPCManager {
  private config: RPCConfig;
  private currentEndpointIndex = 0;
  private failedEndpoints = new Set<string>();
  private requestTimestamps = new Map<string, number[]>();
  private readonly MAX_REQUESTS_PER_MINUTE = 10;
  private readonly RATE_LIMIT_WINDOW = 60 * 1000;

  constructor(config: Partial<RPCConfig> = {}) {
    this.config = { ...DEFAULT_RPC_CONFIG, ...config };
  }

  private isEndpointRateLimited(endpoint: string): boolean {
    const now = Date.now();
    const timestamps = this.requestTimestamps.get(endpoint) || [];
    const recentTimestamps = timestamps.filter(ts => now - ts < this.RATE_LIMIT_WINDOW);
    this.requestTimestamps.set(endpoint, recentTimestamps);
    return recentTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE;
  }

  private canMakeRequest(endpoint: string): boolean {
    const timestamps = this.requestTimestamps.get(endpoint) || [];
    if (timestamps.length === 0) return true;
    const lastRequest = timestamps[timestamps.length - 1];
    return Date.now() - lastRequest >= this.config.rateLimitDelay;
  }

  private recordRequest(endpoint: string): void {
    const now = Date.now();
    const timestamps = this.requestTimestamps.get(endpoint) || [];
    timestamps.push(now);
    this.requestTimestamps.set(endpoint, timestamps);
  }

  private markEndpointAsFailed(endpoint: string): void {
    this.failedEndpoints.add(endpoint);
    setTimeout(() => {
      this.failedEndpoints.delete(endpoint);
    }, 5 * 60 * 1000); // Remove from failed list after 5 minutes
  }

  private async getNextAvailableEndpoint(): Promise<string> {
    let attempts = 0;
    const maxAttempts = this.config.endpoints.length * 2;

    while (attempts < maxAttempts) {
      const endpoint = this.config.endpoints[this.currentEndpointIndex];
      
      if (this.failedEndpoints.has(endpoint)) {
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.config.endpoints.length;
        attempts++;
        continue;
      }
      
      if (this.isEndpointRateLimited(endpoint)) {
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.config.endpoints.length;
        attempts++;
        continue;
      }
      
      if (!this.canMakeRequest(endpoint)) {
        await new Promise(resolve => setTimeout(resolve, this.config.rateLimitDelay));
      }
      
      return endpoint;
    }
    
    this.failedEndpoints.clear();
    this.currentEndpointIndex = 0;
    return this.config.endpoints[0];
  }

  async createConnection(): Promise<Connection> {
    const endpoint = await this.getNextAvailableEndpoint();
    this.recordRequest(endpoint);
    return new Connection(endpoint, 'confirmed');
  }

  async executeWithRetry<T>(
    operation: (connection: Connection) => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const connection = await this.createConnection();
        const result = await operation(connection);
        this.currentEndpointIndex = 0; // Reset to prefer working endpoint
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('429') || errorMessage.includes('403') || 
            errorMessage.includes('fetch') || errorMessage.includes('network')) {
          const currentEndpoint = this.config.endpoints[this.currentEndpointIndex];
          this.markEndpointAsFailed(currentEndpoint);
        }
        
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.config.endpoints.length;
        
        if (attempt < this.config.maxRetries - 1) {
          const delay = Math.min(this.config.retryDelay * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('All RPC endpoints failed');
  }
}

/**
 * Solana Transfer Module
 * Main class for handling SOL transfers
 */
export class SolanaTransferModule {
  private rpcManager: RobustRPCManager;
  private config: TransferConfig;

  constructor(config: Partial<TransferConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rpcManager = new RobustRPCManager();
  }

  /**
   * Create a transfer transaction
   */
  async createTransferTransaction(params: TransferParams): Promise<TransferResult> {
    try {
      // Validate addresses
      new PublicKey(params.from);
      new PublicKey(params.to);

      // Validate amount
      if (params.amount <= 0) {
        return {
          success: false,
          error: 'Amount must be greater than 0'
        };
      }

      const result = await this.rpcManager.executeWithRetry(async (connection) => {
        // Create transaction
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(params.from),
            toPubkey: new PublicKey(params.to),
            lamports: Math.floor(params.amount * LAMPORTS_PER_SOL),
          })
        );

        // Add priority fee
        if (this.config.priorityFee && this.config.priorityFee > 0) {
          const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: this.config.priorityFee
          });
          transaction.add(computeBudgetInstruction);
        }

        // Add memo if provided
        if (params.memo) {
          const memoInstruction = {
            keys: [],
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2'),
            data: Buffer.from(params.memo, 'utf8')
          };
          transaction.add(memoInstruction);
        }

        // Get latest blockhash
        const latestBlockhash = await connection.getLatestBlockhash(this.config.commitment);
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = new PublicKey(params.from);

        // Serialize transaction
        const serializedTransaction = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false
        }).toString('base64');

        return {
          success: true,
          transaction: serializedTransaction
        };
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send a signed transaction
   */
  async sendSignedTransaction(signedTransaction: string): Promise<TransferResult> {
    try {
      const result = await this.rpcManager.executeWithRetry(async (connection) => {
        // Decode and send transaction
        const decodedTransaction = Buffer.from(signedTransaction, 'base64');
        const transaction = Transaction.from(decodedTransaction);
        
        const signature = await connection.sendRawTransaction(decodedTransaction, {
          skipPreflight: true,
          maxRetries: 3,
          preflightCommitment: this.config.commitment,
        });

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
          signature,
          this.config.commitment
        );

        if (confirmation.value.err) {
          throw new Error('Transaction failed to confirm');
        }

        return {
          success: true,
          signature
        };
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<number> {
    try {
      const result = await this.rpcManager.executeWithRetry(async (connection) => {
        const balance = await connection.getBalance(new PublicKey(address));
        return balance / LAMPORTS_PER_SOL;
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TransferConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): TransferConfig {
    return { ...this.config };
  }
}

// Export default instance
export const solanaTransfer = new SolanaTransferModule();

// Export utility functions
export const createTransferModule = (config?: Partial<TransferConfig>) => new SolanaTransferModule(config);

// Export constants
export { LAMPORTS_PER_SOL };
