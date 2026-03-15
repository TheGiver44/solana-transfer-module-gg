/**
 * Vanilla JavaScript version of Solana Transfer Module
 * For use in non-React projects
 */

import { SolanaTransferModule, TransferConfig, TransferParams, TransferResult } from './index';

/**
 * Vanilla JS Transfer Manager
 * Provides a simple interface for non-React projects
 */
export class VanillaTransferManager {
  private transferModule: SolanaTransferModule;
  private callbacks: {
    onSuccess?: (result: TransferResult) => void;
    onError?: (error: string) => void;
    onProgress?: (step: string) => void;
  } = {};

  constructor(config?: Partial<TransferConfig>) {
    this.transferModule = new SolanaTransferModule(config);
  }

  /**
   * Set event callbacks
   */
  onSuccess(callback: (result: TransferResult) => void): this {
    this.callbacks.onSuccess = callback;
    return this;
  }

  onError(callback: (error: string) => void): this {
    this.callbacks.onError = callback;
    return this;
  }

  onProgress(callback: (step: string) => void): this {
    this.callbacks.onProgress = callback;
    return this;
  }

  /**
   * Create a transfer transaction
   */
  async createTransaction(params: TransferParams): Promise<TransferResult> {
    try {
      this.callbacks.onProgress?.('Creating transaction...');
      
      const result = await this.transferModule.createTransferTransaction(params);
      
      if (result.success) {
        this.callbacks.onSuccess?.(result);
      } else {
        this.callbacks.onError?.(result.error || 'Failed to create transaction');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.callbacks.onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send a signed transaction
   */
  async sendTransaction(signedTransaction: string): Promise<TransferResult> {
    try {
      this.callbacks.onProgress?.('Sending transaction...');
      
      const result = await this.transferModule.sendSignedTransaction(signedTransaction);
      
      if (result.success) {
        this.callbacks.onSuccess?.(result);
      } else {
        this.callbacks.onError?.(result.error || 'Failed to send transaction');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.callbacks.onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<number> {
    try {
      this.callbacks.onProgress?.('Getting balance...');
      
      const balance = await this.transferModule.getBalance(address);
      
      this.callbacks.onSuccess?.({ success: true, signature: undefined });
      return balance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.callbacks.onError?.(errorMessage);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TransferConfig>): void {
    this.transferModule.updateConfig(config);
  }

  /**
   * Get current configuration
   */
  getConfig(): TransferConfig {
    return this.transferModule.getConfig();
  }
}

/**
 * Create a vanilla transfer manager instance
 */
export const createVanillaTransfer = (config?: Partial<TransferConfig>): VanillaTransferManager => {
  return new VanillaTransferManager(config);
};

/**
 * Simple transfer function for one-off transfers
 */
export async function quickTransfer(
  from: string,
  to: string,
  amount: number,
  config?: Partial<TransferConfig>
): Promise<TransferResult> {
  const manager = new VanillaTransferManager(config);
  
  const createResult = await manager.createTransaction({ from, to, amount });
  
  if (!createResult.success || !createResult.transaction) {
    return createResult;
  }

  // Note: In a real implementation, you would need to sign the transaction
  // This returns the unsigned transaction that needs to be signed
  return {
    success: true,
    transaction: createResult.transaction,
    error: 'Transaction created but needs to be signed before sending'
  };
}

/**
 * Utility functions for common operations
 */
export const TransferUtils = {
  /**
   * Validate Solana address
   */
  isValidAddress: (address: string): boolean => {
    try {
      new (require('@solana/web3.js').PublicKey)(address);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Convert SOL to lamports
   */
  solToLamports: (sol: number): number => {
    return Math.floor(sol * 1000000000);
  },

  /**
   * Convert lamports to SOL
   */
  lamportsToSol: (lamports: number): number => {
    return lamports / 1000000000;
  },

  /**
   * Format SOL amount for display
   */
  formatSol: (sol: number, decimals: number = 4): string => {
    return sol.toFixed(decimals);
  }
};
