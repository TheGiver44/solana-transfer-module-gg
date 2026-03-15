/**
 * React Hook for Solana Transfer Module
 * Provides easy integration with React components
 */

import { useState, useCallback, useRef } from 'react';
import { SolanaTransferModule, TransferConfig, TransferParams, TransferResult } from './index';

export interface UseSolanaTransferOptions extends Partial<TransferConfig> {
  onSuccess?: (result: TransferResult) => void;
  onError?: (error: string) => void;
  onProgress?: (step: string) => void;
}

export interface UseSolanaTransferReturn {
  // State
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  lastResult: TransferResult | null;
  
  // Actions
  transfer: (params: TransferParams) => Promise<TransferResult>;
  createTransaction: (params: TransferParams) => Promise<TransferResult>;
  sendTransaction: (signedTransaction: string) => Promise<TransferResult>;
  getBalance: (address: string) => Promise<number>;
  clearError: () => void;
  reset: () => void;
  
  // Configuration
  updateConfig: (config: Partial<TransferConfig>) => void;
  getConfig: () => TransferConfig;
}

/**
 * React hook for Solana transfers
 */
export function useSolanaTransfer(options: UseSolanaTransferOptions = {}): UseSolanaTransferReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TransferResult | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const transferModuleRef = useRef<SolanaTransferModule | null>(null);
  
  // Initialize transfer module
  if (!transferModuleRef.current) {
    transferModuleRef.current = new SolanaTransferModule({
      rpcUrl: options.rpcUrl,
      priorityFee: options.priorityFee,
      commitment: options.commitment,
      maxRetries: options.maxRetries,
      retryDelay: options.retryDelay
    });
  }

  const handleSuccess = useCallback((result: TransferResult) => {
    setLastResult(result);
    setError(null);
    setIsConnected(true);
    options.onSuccess?.(result);
  }, [options]);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsConnected(false);
    options.onError?.(errorMessage);
  }, [options]);

  const handleProgress = useCallback((step: string) => {
    options.onProgress?.(step);
  }, [options]);

  const transfer = useCallback(async (params: TransferParams): Promise<TransferResult> => {
    if (!transferModuleRef.current) {
      const error = 'Transfer module not initialized';
      handleError(error);
      return { success: false, error };
    }

    setIsLoading(true);
    setError(null);
    
    try {
      handleProgress('Creating transaction...');
      
      // Step 1: Create transaction
      const createResult = await transferModuleRef.current.createTransferTransaction(params);
      
      if (!createResult.success) {
        handleError(createResult.error || 'Failed to create transaction');
        return createResult;
      }

      handleProgress('Transaction created successfully');
      
      // Note: In a real implementation, you would need to sign the transaction
      // This is just the transaction creation part
      const result: TransferResult = {
        success: true,
        transaction: createResult.transaction,
        signature: undefined // Will be set when transaction is signed and sent
      };

      handleSuccess(result);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      handleError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [handleError, handleSuccess, handleProgress]);

  const createTransaction = useCallback(async (params: TransferParams): Promise<TransferResult> => {
    if (!transferModuleRef.current) {
      const error = 'Transfer module not initialized';
      handleError(error);
      return { success: false, error };
    }

    setIsLoading(true);
    setError(null);
    
    try {
      handleProgress('Creating transaction...');
      
      const result = await transferModuleRef.current.createTransferTransaction(params);
      
      if (result.success) {
        handleSuccess(result);
      } else {
        handleError(result.error || 'Failed to create transaction');
      }
      
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      handleError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [handleError, handleSuccess, handleProgress]);

  const sendTransaction = useCallback(async (signedTransaction: string): Promise<TransferResult> => {
    if (!transferModuleRef.current) {
      const error = 'Transfer module not initialized';
      handleError(error);
      return { success: false, error };
    }

    setIsLoading(true);
    setError(null);
    
    try {
      handleProgress('Sending transaction...');
      
      const result = await transferModuleRef.current.sendSignedTransaction(signedTransaction);
      
      if (result.success) {
        handleSuccess(result);
      } else {
        handleError(result.error || 'Failed to send transaction');
      }
      
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      handleError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [handleError, handleSuccess, handleProgress]);

  const getBalance = useCallback(async (address: string): Promise<number> => {
    if (!transferModuleRef.current) {
      throw new Error('Transfer module not initialized');
    }

    try {
      const balance = await transferModuleRef.current.getBalance(address);
      setIsConnected(true);
      return balance;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      handleError(errorMessage);
      throw err;
    }
  }, [handleError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setLastResult(null);
    setIsConnected(false);
  }, []);

  const updateConfig = useCallback((config: Partial<TransferConfig>) => {
    if (transferModuleRef.current) {
      transferModuleRef.current.updateConfig(config);
    }
  }, []);

  const getConfig = useCallback((): TransferConfig => {
    if (!transferModuleRef.current) {
      throw new Error('Transfer module not initialized');
    }
    return transferModuleRef.current.getConfig();
  }, []);

  return {
    // State
    isLoading,
    isConnected,
    error,
    lastResult,
    
    // Actions
    transfer,
    createTransaction,
    sendTransaction,
    getBalance,
    clearError,
    reset,
    
    // Configuration
    updateConfig,
    getConfig
  };
}

/**
 * Hook for wallet integration (requires wallet adapter)
 */
export function useWalletTransfer(
  wallet: { publicKey: string | null; signTransaction: (transaction: any) => Promise<any> } | null,
  options: UseSolanaTransferOptions = {}
): UseSolanaTransferReturn & { 
  transferWithWallet: (params: Omit<TransferParams, 'from'>) => Promise<TransferResult>;
} {
  const transferHook = useSolanaTransfer(options);
  
  const transferWithWallet = useCallback(async (params: Omit<TransferParams, 'from'>): Promise<TransferResult> => {
    if (!wallet?.publicKey) {
      const error = 'Wallet not connected';
      options.onError?.(error);
      return { success: false, error };
    }

    if (!wallet.signTransaction) {
      const error = 'Wallet does not support transaction signing';
      options.onError?.(error);
      return { success: false, error };
    }

    try {
      // Create transaction with wallet address
      const fullParams: TransferParams = {
        ...params,
        from: wallet.publicKey
      };

      const createResult = await transferHook.createTransaction(fullParams);
      
      if (!createResult.success || !createResult.transaction) {
        return createResult;
      }

      // Sign transaction with wallet
      const { Transaction } = await import('@solana/web3.js');
      const transaction = Transaction.from(Buffer.from(createResult.transaction, 'base64'));
      const signedTransaction = await wallet.signTransaction(transaction);
      
      // Send signed transaction
      const sendResult = await transferHook.sendTransaction(
        signedTransaction.serialize().toString('base64')
      );

      return sendResult;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }, [wallet, transferHook, options]);

  return {
    ...transferHook,
    transferWithWallet
  };
}
