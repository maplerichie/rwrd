import { web3 } from "@coral-xyz/anchor";
import crypto from "crypto";

// Creates a keypair that will work with transaction signing
export function createKeypair(seed?: string): web3.Keypair {
  // Generate a random keypair if no seed is provided
  if (!seed) {
    return web3.Keypair.generate();
  }

  // Create a deterministic keypair from seed
  const seedBytes = seed ? Buffer.from(seed) : crypto.randomBytes(32);
  const seedBuffer = Buffer.alloc(32);
  seedBytes.copy(seedBuffer, 0, 0, Math.min(seedBytes.length, 32));

  // Create a keypair directly from the properly-sized seed buffer
  return web3.Keypair.fromSeed(seedBuffer);
}

// Safely sign transactions with keypair
export function signTransaction(transaction: web3.Transaction, keypair: web3.Keypair): web3.Transaction {
  try {
    // Make a copy of the transaction to avoid modifying the original
    const txCopy = transaction.serialize({ verifySignatures: false });
    const newTx = web3.Transaction.from(txCopy);

    // Add keypair signature
    newTx.partialSign({
      publicKey: keypair.publicKey,
      secretKey: keypair.secretKey
    });

    return newTx;
  } catch (error) {
    console.error("Error signing transaction:", error);
    throw error;
  }
}

// Airdrop SOL to an account
export async function airdropSol(
  connection: web3.Connection,
  recipient: web3.PublicKey,
  amount: number = 1
): Promise<string> {
  try {
    const signature = await connection.requestAirdrop(
      recipient,
      amount * web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(signature, "confirmed");
    return signature;
  } catch (err) {
    console.error("Error in airdropSol:", err);
    throw err;
  }
} 