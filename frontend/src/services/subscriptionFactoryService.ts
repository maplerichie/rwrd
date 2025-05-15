import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import idl from '../idl/subscription_factory.json';

export async function createSubscriptionProgramOnChain(
  provider: AnchorProvider,
  args: { 
    programName: string, 
    subscriptionPrice: number, 
    durationDays: number, 
    redemptionQuota: number, 
    merchantWallet: PublicKey, // required for PDA
    merchantAccount: PublicKey // required for accounts
  }
): Promise<string> {
  const program = new Program(idl as any, idl.address, provider);

  // Find PDAs as per IDL
  const [subscriptionProgram] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('subscription_program'),
      args.merchantWallet.toBuffer(),
      Buffer.from(args.programName)
    ],
    program.programId
  );

  const [factoryState] = PublicKey.findProgramAddressSync(
    [Buffer.from('factory_state')],
    program.programId
  );

  // Send transaction
  let txSig = '';
  try {
    txSig = await program.methods
      .createSubscriptionProgram(
        args.programName,
        args.subscriptionPrice,
        args.durationDays,
        args.redemptionQuota
      )
      .accounts({
        subscriptionProgram,
        merchantWallet: args.merchantWallet,
        factoryState,
        merchantAccount: args.merchantAccount,
        merchantRegistryProgram: new PublicKey('9MCcaFZBat4AcRvQmt5GxunDrBYN7yGgnBWGRPVETvrE'),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    return txSig;
  } catch (err) {
    console.error('[createSubscriptionProgramOnChain] On-chain transaction failed:', err);
    throw err;
  }
}
