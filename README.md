# Solana Transfer Module

A reusable, robust Solana transfer module that can be dropped into any JS/TSX project. Features robust RPC connection management, priority fees, and comprehensive error handling.

## Features

- 🚀 **Easy Integration** - Drop into any JS/TSX project
- 🔄 **Robust RPC Management** - Multiple endpoints with automatic fallback
- ⚡ **Priority Fees** - Configurable transaction priority
- 🛡️ **Error Handling** - Comprehensive error handling and retry logic
- 📱 **React Support** - Custom hooks for React integration
- 🌐 **Vanilla JS Support** - Works in any JavaScript environment
- 📝 **TypeScript** - Full TypeScript support with type definitions
- 🔧 **Configurable** - Flexible configuration options

## Installation

```bash
npm install @solana/web3.js
```

## Quick Start

### React Integration

```tsx
import { useSolanaTransfer } from './solana-transfer-module';

function TransferComponent() {
  const { 
    createTransaction, 
    sendTransaction, 
    isLoading, 
    error 
  } = useSolanaTransfer({
    onSuccess: (result) => console.log('Transfer successful!', result),
    onError: (error) => console.error('Transfer failed:', error)
  });

  const handleTransfer = async () => {
    // Create transaction
    const result = await createTransaction({
      from: 'your-wallet-address',
      to: 'recipient-address',
      amount: 0.1, // 0.1 SOL
      memo: 'Payment for services'
    });

    if (result.success && result.transaction) {
      // Sign transaction with your wallet
      const signedTx = await signTransaction(result.transaction);
      
      // Send signed transaction
      await sendTransaction(signedTx);
    }
  };

  return (
    <button onClick={handleTransfer} disabled={isLoading}>
      {isLoading ? 'Processing...' : 'Send 0.1 SOL'}
    </button>
  );
}
```

### Vanilla JavaScript

```javascript
import { createVanillaTransfer } from './solana-transfer-module';

const transferManager = createVanillaTransfer({
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  priorityFee: 50000
})
.onSuccess((result) => console.log('Success!', result))
.onError((error) => console.error('Error:', error))
.onProgress((step) => console.log('Step:', step));

// Create transaction
const result = await transferManager.createTransaction({
  from: 'your-wallet-address',
  to: 'recipient-address',
  amount: 0.1
});

// Sign and send transaction
if (result.success && result.transaction) {
  const signedTx = await signTransaction(result.transaction);
  await transferManager.sendTransaction(signedTx);
}
```

### Simple One-Liner

```javascript
import { quickTransfer } from './solana-transfer-module';

// Create transaction in one line
const result = await quickTransfer(
  'your-wallet-address',
  'recipient-address', 
  0.1 // 0.1 SOL
);
```

## API Reference

### Core Classes

#### `SolanaTransferModule`

Main class for handling SOL transfers.

```typescript
const transferModule = new SolanaTransferModule({
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  priorityFee: 50000,
  commitment: 'confirmed',
  maxRetries: 3,
  retryDelay: 1000
});
```

**Methods:**
- `createTransferTransaction(params: TransferParams): Promise<TransferResult>`
- `sendSignedTransaction(signedTransaction: string): Promise<TransferResult>`
- `getBalance(address: string): Promise<number>`
- `updateConfig(config: Partial<TransferConfig>): void`
- `getConfig(): TransferConfig`

#### `useSolanaTransfer` (React Hook)

React hook for easy integration.

```typescript
const {
  isLoading,
  isConnected,
  error,
  lastResult,
  createTransaction,
  sendTransaction,
  getBalance,
  clearError,
  reset,
  updateConfig,
  getConfig
} = useSolanaTransfer(options);
```

#### `VanillaTransferManager`

For non-React projects.

```typescript
const manager = createVanillaTransfer(config)
  .onSuccess((result) => console.log('Success!', result))
  .onError((error) => console.error('Error:', error))
  .onProgress((step) => console.log('Step:', step));
```

### Types

```typescript
interface TransferConfig {
  rpcUrl?: string;
  priorityFee?: number; // in microLamports
  commitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
  retryDelay?: number;
}

interface TransferParams {
  from: string;
  to: string;
  amount: number; // in SOL
  memo?: string;
}

interface TransferResult {
  success: boolean;
  signature?: string;
  error?: string;
  transaction?: string; // base64 encoded transaction
}
```

## Configuration

### RPC Endpoints

The module comes with multiple RPC endpoints for reliability:

1. Helius (Primary)
2. Solana Mainnet
3. Project Serum
4. Ankr
5. Alchemy

### Priority Fees

Configure priority fees to ensure your transactions are processed quickly:

```typescript
const transferModule = new SolanaTransferModule({
  priorityFee: 50000 // 0.00005 SOL priority fee
});
```

### Retry Logic

Automatic retry with exponential backoff:

```typescript
const transferModule = new SolanaTransferModule({
  maxRetries: 3,
  retryDelay: 1000 // 1 second base delay
});
```

## Examples

### React Component with Wallet Integration

```tsx
import { useWallet } from '@solana/wallet-adapter-react';
import { useSolanaTransfer } from './solana-transfer-module';

function WalletTransfer() {
  const { publicKey, signTransaction } = useWallet();
  const { createTransaction, sendTransaction, isLoading, error } = useSolanaTransfer();

  const handleTransfer = async () => {
    if (!publicKey || !signTransaction) return;

    // Create transaction
    const result = await createTransaction({
      from: publicKey.toString(),
      to: 'recipient-address',
      amount: 0.1
    });

    if (result.success && result.transaction) {
      // Sign with wallet
      const transaction = Transaction.from(Buffer.from(result.transaction, 'base64'));
      const signedTx = await signTransaction(transaction);
      
      // Send transaction
      await sendTransaction(signedTx.serialize().toString('base64'));
    }
  };

  return (
    <button onClick={handleTransfer} disabled={isLoading}>
      Send 0.1 SOL
    </button>
  );
}
```

### Node.js Server Integration

```javascript
import { SolanaTransferModule } from './solana-transfer-module';

const transferModule = new SolanaTransferModule({
  rpcUrl: process.env.SOLANA_RPC_URL,
  priorityFee: 100000
});

// Express.js endpoint
app.post('/api/transfer', async (req, res) => {
  const { from, to, amount } = req.body;
  
  const result = await transferModule.createTransferTransaction({
    from,
    to,
    amount
  });
  
  res.json(result);
});
```

### Error Handling

```typescript
const transferModule = new SolanaTransferModule();

try {
  const result = await transferModule.createTransferTransaction({
    from: 'invalid-address',
    to: 'recipient-address',
    amount: 0.1
  });
  
  if (!result.success) {
    console.error('Transfer failed:', result.error);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Building

```bash
npm run build
```

## Development

```bash
npm run dev
```

## Testing

```bash
npm test
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support, please open an issue on GitHub or contact the maintainers.
