/**
 * React Example - Solana Transfer Module
 * 
 * This example shows how to integrate the Solana Transfer Module
 * into a React application with wallet integration.
 */

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { useSolanaTransfer } from '../src/useSolanaTransfer';

export function TransferExample() {
  const { publicKey, signTransaction, connected } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  const {
    createTransaction,
    sendTransaction,
    getBalance,
    isLoading,
    error,
    lastResult,
    clearError
  } = useSolanaTransfer({
    onSuccess: (result) => {
      console.log('Transfer successful!', result);
      alert(`Transfer successful! Signature: ${result.signature}`);
    },
    onError: (error) => {
      console.error('Transfer failed:', error);
      alert(`Transfer failed: ${error}`);
    },
    onProgress: (step) => {
      console.log('Progress:', step);
    }
  });

  const handleTransfer = async () => {
    if (!publicKey || !signTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    if (!recipient || !amount) {
      alert('Please fill in all fields');
      return;
    }

    try {
      clearError();

      // Create transaction
      const createResult = await createTransaction({
        from: publicKey.toString(),
        to: recipient,
        amount: parseFloat(amount),
        memo: memo || undefined
      });

      if (!createResult.success || !createResult.transaction) {
        alert(`Failed to create transaction: ${createResult.error}`);
        return;
      }

      // Sign transaction with wallet
      const transaction = Transaction.from(Buffer.from(createResult.transaction, 'base64'));
      const signedTransaction = await signTransaction(transaction);

      // Send signed transaction
      const sendResult = await sendTransaction(
        signedTransaction.serialize().toString('base64')
      );

      if (sendResult.success) {
        setRecipient('');
        setAmount('');
        setMemo('');
      }
    } catch (err) {
      console.error('Transfer error:', err);
      alert(`Transfer error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleGetBalance = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const balance = await getBalance(publicKey.toString());
      alert(`Your balance: ${balance.toFixed(4)} SOL`);
    } catch (err) {
      alert(`Failed to get balance: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (!connected) {
    return (
      <div className="transfer-example">
        <h2>Solana Transfer Example</h2>
        <p>Please connect your wallet to use the transfer functionality.</p>
      </div>
    );
  }

  return (
    <div className="transfer-example">
      <h2>Solana Transfer Example</h2>
      
      <div className="form-group">
        <label htmlFor="recipient">Recipient Address:</label>
        <input
          id="recipient"
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Enter recipient wallet address"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="amount">Amount (SOL):</label>
        <input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.1"
          step="0.001"
          min="0"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="memo">Memo (Optional):</label>
        <input
          id="memo"
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Payment for services"
          className="form-input"
        />
      </div>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={clearError}>Clear Error</button>
        </div>
      )}

      {lastResult && lastResult.success && (
        <div className="success-message">
          <p>Last transfer successful!</p>
          {lastResult.signature && (
            <p>Signature: {lastResult.signature}</p>
          )}
        </div>
      )}

      <div className="button-group">
        <button
          onClick={handleTransfer}
          disabled={isLoading || !recipient || !amount}
          className="transfer-button"
        >
          {isLoading ? 'Processing...' : 'Send Transfer'}
        </button>

        <button
          onClick={handleGetBalance}
          disabled={isLoading}
          className="balance-button"
        >
          Get Balance
        </button>
      </div>

      <style jsx>{`
        .transfer-example {
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }

        .form-input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .transfer-button,
        .balance-button {
          flex: 1;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .transfer-button {
          background-color: #007bff;
          color: white;
        }

        .transfer-button:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .transfer-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .balance-button {
          background-color: #28a745;
          color: white;
        }

        .balance-button:hover:not(:disabled) {
          background-color: #1e7e34;
        }

        .balance-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .error-message {
          background-color: #f8d7da;
          color: #721c24;
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
        }

        .success-message {
          background-color: #d4edda;
          color: #155724;
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
        }
      `}</style>
    </div>
  );
}
