/**
 * Vanilla JavaScript Example - Solana Transfer Module
 * 
 * This example shows how to use the Solana Transfer Module
 * in a vanilla JavaScript application.
 */

import { createVanillaTransfer, quickTransfer, TransferUtils } from '../src/vanilla.js';

// Example 1: Using VanillaTransferManager
async function example1() {
  console.log('=== Example 1: VanillaTransferManager ===');
  
  const transferManager = createVanillaTransfer({
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    priorityFee: 50000
  })
  .onSuccess((result) => {
    console.log('✅ Transfer successful!', result);
  })
  .onError((error) => {
    console.error('❌ Transfer failed:', error);
  })
  .onProgress((step) => {
    console.log('📝 Progress:', step);
  });

  try {
    // Create transaction
    const result = await transferManager.createTransaction({
      from: 'your-wallet-address-here',
      to: 'recipient-address-here',
      amount: 0.1,
      memo: 'Payment for services'
    });

    console.log('Transaction created:', result);

    if (result.success && result.transaction) {
      console.log('Transaction ready for signing:', result.transaction);
      // In a real app, you would sign the transaction here
      // const signedTx = await signTransaction(result.transaction);
      // await transferManager.sendTransaction(signedTx);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 2: Quick transfer (one-liner)
async function example2() {
  console.log('\n=== Example 2: Quick Transfer ===');
  
  try {
    const result = await quickTransfer(
      'your-wallet-address-here',
      'recipient-address-here',
      0.05 // 0.05 SOL
    );
    
    console.log('Quick transfer result:', result);
  } catch (error) {
    console.error('Quick transfer error:', error);
  }
}

// Example 3: Using utility functions
function example3() {
  console.log('\n=== Example 3: Utility Functions ===');
  
  // Validate addresses
  const validAddress = '11111111111111111111111111111112'; // System Program
  const invalidAddress = 'invalid-address';
  
  console.log('Valid address:', TransferUtils.isValidAddress(validAddress));
  console.log('Invalid address:', TransferUtils.isValidAddress(invalidAddress));
  
  // Convert SOL to lamports
  const solAmount = 0.1;
  const lamports = TransferUtils.solToLamports(solAmount);
  console.log(`${solAmount} SOL = ${lamports} lamports`);
  
  // Convert lamports to SOL
  const solFromLamports = TransferUtils.lamportsToSol(lamports);
  console.log(`${lamports} lamports = ${solFromLamports} SOL`);
  
  // Format SOL for display
  const formattedSol = TransferUtils.formatSol(solAmount, 6);
  console.log(`Formatted SOL: ${formattedSol}`);
}

// Example 4: Complete transfer flow with error handling
async function example4() {
  console.log('\n=== Example 4: Complete Transfer Flow ===');
  
  const transferManager = createVanillaTransfer({
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    priorityFee: 100000, // Higher priority fee
    maxRetries: 5,
    retryDelay: 2000
  })
  .onSuccess((result) => {
    console.log('🎉 Transfer completed successfully!');
    console.log('Signature:', result.signature);
    console.log('Transaction:', result.transaction);
  })
  .onError((error) => {
    console.error('💥 Transfer failed:', error);
  })
  .onProgress((step) => {
    console.log('⏳', step);
  });

  try {
    // Get balance first
    console.log('Getting sender balance...');
    const balance = await transferManager.getBalance('your-wallet-address-here');
    console.log(`Sender balance: ${balance.toFixed(4)} SOL`);

    // Create transaction
    console.log('Creating transfer transaction...');
    const createResult = await transferManager.createTransaction({
      from: 'your-wallet-address-here',
      to: 'recipient-address-here',
      amount: 0.01, // Small amount for testing
      memo: 'Test transfer from vanilla JS'
    });

    if (createResult.success) {
      console.log('✅ Transaction created successfully');
      console.log('Transaction data:', createResult.transaction);
      
      // In a real application, you would:
      // 1. Sign the transaction with a wallet
      // 2. Send the signed transaction
      // 3. Wait for confirmation
      
      console.log('📝 Next steps:');
      console.log('1. Sign the transaction with your wallet');
      console.log('2. Send the signed transaction');
      console.log('3. Wait for confirmation');
    } else {
      console.error('❌ Failed to create transaction:', createResult.error);
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Example 5: Configuration management
function example5() {
  console.log('\n=== Example 5: Configuration Management ===');
  
  const transferManager = createVanillaTransfer({
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    priorityFee: 50000,
    commitment: 'confirmed'
  });

  // Get current configuration
  const config = transferManager.getConfig();
  console.log('Current configuration:', config);

  // Update configuration
  transferManager.updateConfig({
    priorityFee: 100000, // Increase priority fee
    maxRetries: 5
  });

  const updatedConfig = transferManager.getConfig();
  console.log('Updated configuration:', updatedConfig);
}

// Run all examples
async function runExamples() {
  console.log('🚀 Solana Transfer Module - Vanilla JavaScript Examples\n');
  
  try {
    await example1();
    await example2();
    example3();
    await example4();
    example5();
    
    console.log('\n✅ All examples completed!');
  } catch (error) {
    console.error('💥 Error running examples:', error);
  }
}

// Export for use in other modules
export {
  example1,
  example2,
  example3,
  example4,
  example5,
  runExamples
};

// Run examples if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.runSolanaTransferExamples = runExamples;
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    runExamples,
    example1,
    example2,
    example3,
    example4,
    example5
  };
}
