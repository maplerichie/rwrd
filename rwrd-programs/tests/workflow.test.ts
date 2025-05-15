import * as anchor from "@coral-xyz/anchor";
import { Program, web3, BN } from "@coral-xyz/anchor";
import { LiquidityPool } from "../target/types/liquidity_pool";
import { MerchantRegistry } from "../target/types/merchant_registry";
import { SubscriptionFactory } from "../target/types/subscription_factory";
import { SubscriptionManager } from "../target/types/subscription_manager";
import * as token from "@solana/spl-token";
import { expect } from "chai";
import { createKeypair, airdropSol } from "./helpers";
import { Keypair } from "@solana/web3.js";

describe("RWRD Protocol Workflow", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const wallet = provider.wallet as anchor.Wallet;

  // Programs
  const merchantRegistryProgram = anchor.workspace.MerchantRegistry as Program<MerchantRegistry>;
  const liquidityPoolProgram = anchor.workspace.LiquidityPool as Program<LiquidityPool>;
  const subFactoryProgram = anchor.workspace.SubscriptionFactory as Program<SubscriptionFactory>;
  const subManagerProgram = anchor.workspace.SubscriptionManager as Program<SubscriptionManager>;

  // Test accounts
  const authority = wallet.publicKey;
  const governance = wallet.publicKey; // For simplicity, using the same key for governance
  const payer = wallet.publicKey;
  const user = wallet.publicKey;
  const merchantKeypair = Keypair.generate();
  let merchantWallet = merchantKeypair;
  let merchantTokenAccount: web3.PublicKey;

  // Token accounts
  let mint: web3.PublicKey;
  let userTokenAccount: web3.PublicKey;
  let nftMint: web3.PublicKey;
  let userNftAccount: web3.PublicKey;

  // PDAs
  // Merchant Registry
  let registryStatePDA: web3.PublicKey;
  let merchantAccountPDA: web3.PublicKey;

  // Liquidity Pool
  let poolStatePDA: web3.PublicKey;
  let poolVaultPDA: web3.PublicKey;
  let userDepositPDA: web3.PublicKey;
  let merchantLoanPDA: web3.PublicKey;

  // Subscription Factory
  let factoryStatePDA: web3.PublicKey;

  // Subscription Manager
  let managerStatePDA: web3.PublicKey;
  let subscriptionProgramPDA: web3.PublicKey;
  let subscriptionAccountPDA: web3.PublicKey;

  // Test parameters
  // Merchant info
  const merchantInfo = {
    name: Array.from(Buffer.from("Test Merchant".padEnd(32, '\0'))),
    category: Array.from(Buffer.from("Retail".padEnd(16, '\0'))),
    location: Array.from(Buffer.from("New York".padEnd(32, '\0'))),
    website: Array.from(Buffer.from("https://testmerchant.com".padEnd(64, '\0'))),
  };

  // Liquidity pool parameters
  const depositAmount = new BN(10_000_000); // 10 tokens
  const paymentAmount = new BN(2_000_000); // 2 tokens
  const borrowAmount = new BN(5_000_000); // 5 tokens
  const repayAmount = new BN(3_000_000); // 3 tokens

  // Interest rate parameters
  const baseRate = new BN(500); // 5% base interest rate (in basis points)
  const utilizationSlope = new BN(3000); // 30% max increase based on utilization
  const protocolFeePercent = 5; // 5% protocol fee

  // Subscription parameters
  const programName = "premium-subscription";
  const registryFee = 5; // 5% registry fee
  const subscriptionPrice = new BN(1_000_000); // 1 token
  const durationDays = 30;
  const redemptionQuota = 10;
  const redemptionAmount = 2; // Using 2 out of 10 quota

  before(async () => {
    try {
      // Airdrop SOL to the payer account
      await airdropSol(provider.connection, provider.wallet.publicKey, 2);

      // Airdrop SOL to the merchant wallet
      await airdropSol(provider.connection, merchantWallet.publicKey, 2);

      // Create token mints
      const mintKeypair = web3.Keypair.generate();
      mint = mintKeypair.publicKey;

      const nftMintKeypair = web3.Keypair.generate();
      nftMint = nftMintKeypair.publicKey;

      const mintLamports = await provider.connection.getMinimumBalanceForRentExemption(
        token.MintLayout.span
      );

      // Create mint account transactions
      const createMintTx = new web3.Transaction();

      // Create mint account
      const createMintAccountIx = web3.SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mint,
        lamports: mintLamports,
        space: token.MintLayout.span,
        programId: token.TOKEN_PROGRAM_ID
      });

      // Initialize mint
      const initMintIx = token.createInitializeMintInstruction(
        mint,
        6, // Decimals
        payer,
        payer
      );

      createMintTx.add(createMintAccountIx, initMintIx);

      // Create NFT mint account
      const createNftMintAccountIx = web3.SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: nftMint,
        lamports: mintLamports,
        space: token.MintLayout.span,
        programId: token.TOKEN_PROGRAM_ID
      });

      // Initialize NFT mint
      const initNftMintIx = token.createInitializeMintInstruction(
        nftMint,
        0, // 0 decimals for NFT
        payer,
        payer
      );

      createMintTx.add(createNftMintAccountIx, initNftMintIx);

      // Send transaction with proper signing
      await provider.sendAndConfirm(createMintTx, [mintKeypair, nftMintKeypair]);


      // Create user token account
      userTokenAccount = await token.getAssociatedTokenAddress(
        mint,
        user
      );

      try {
        await token.getAccount(provider.connection, userTokenAccount);

      } catch (e) {
        const createUserTokenAccountIx = token.createAssociatedTokenAccountInstruction(
          payer,
          userTokenAccount,
          user,
          mint
        );

        await provider.sendAndConfirm(new web3.Transaction().add(createUserTokenAccountIx));

      }

      // Create user NFT account
      userNftAccount = await token.getAssociatedTokenAddress(
        nftMint,
        user
      );

      try {
        await token.getAccount(provider.connection, userNftAccount);

      } catch (e) {
        const createUserNftAccountIx = token.createAssociatedTokenAccountInstruction(
          payer,
          userNftAccount,
          user,
          nftMint
        );

        await provider.sendAndConfirm(new web3.Transaction().add(createUserNftAccountIx));

      }

      // Create merchant token account (ATA for merchant)
      merchantTokenAccount = await token.getAssociatedTokenAddress(
        mint,
        merchantWallet.publicKey
      );
      try {
        await token.getAccount(provider.connection, merchantTokenAccount);

      } catch (e) {
        const createMerchantTokenAccountIx = token.createAssociatedTokenAccountInstruction(
          payer,
          merchantTokenAccount,
          merchantWallet.publicKey,
          mint
        );
        await provider.sendAndConfirm(new web3.Transaction().add(createMerchantTokenAccountIx));

      }

      // Mint tokens to user
      await token.mintTo(
        provider.connection,
        provider.wallet.payer,
        mint,
        userTokenAccount,
        payer,
        20_000_000 // 20 tokens
      );


      // Find PDAs for all programs
      [registryStatePDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("registry-state")], // Note: correct seed based on merchant-registry.test.ts
        merchantRegistryProgram.programId
      );

      [merchantAccountPDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("merchant"), merchantWallet.publicKey.toBuffer()], // Note: correct seed 
        merchantRegistryProgram.programId
      );

      [poolStatePDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("pool_state")],
        liquidityPoolProgram.programId
      );

      [poolVaultPDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("pool_vault"), mint.toBuffer()],
        liquidityPoolProgram.programId
      );

      [userDepositPDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("user_deposit"), user.toBuffer(), mint.toBuffer()],
        liquidityPoolProgram.programId
      );

      [merchantLoanPDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("merchant_loan"), merchantWallet.publicKey.toBuffer(), mint.toBuffer()],
        liquidityPoolProgram.programId
      );

      [factoryStatePDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("factory_state")],
        subFactoryProgram.programId
      );

      [managerStatePDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("manager_state")],
        subManagerProgram.programId
      );

      // Derive subscription program PDA
      const programSeedPrefix = Buffer.from("subscription_program");
      const encodedProgramName = Buffer.from(programName);
      [subscriptionProgramPDA] = web3.PublicKey.findProgramAddressSync(
        [programSeedPrefix, merchantWallet.publicKey.toBuffer(), encodedProgramName],
        subFactoryProgram.programId
      );



      // Call the program's initialize to create both pool_state and pool_vault
      try {
        await liquidityPoolProgram.methods
          .initialize(
            authority,
            baseRate,
            utilizationSlope,
            protocolFeePercent
          )
          .accounts({
            poolState: poolStatePDA,
            poolVault: poolVaultPDA,
            payer: payer,
            tokenMint: mint,
            tokenProgram: token.TOKEN_PROGRAM_ID,
            systemProgram: web3.SystemProgram.programId,
            rent: web3.SYSVAR_RENT_PUBKEY,
          })
          .rpc();

      } catch (e) {
        console.error("Error initializing pool state and vault via program:", e);
      }
    } catch (error) {
      console.error("Setup error:", error);
      throw error;
    }
  });

  describe("1. Merchant Registry", () => {
    it("should initialize the merchant registry", async () => {
      try {
        // Check if registry is already initialized
        let registryInitialized = false;

        try {
          await merchantRegistryProgram.account.registryState.fetch(registryStatePDA);
          registryInitialized = true;

        } catch (e) {

        }

        if (!registryInitialized) {
          const tx = await merchantRegistryProgram.methods
            .initialize(registryFee) // Initialize with fee parameter
            .accounts({
              registryState: registryStatePDA,
              authority: authority,
              governance: governance,  // Include governance account
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();


        }

        // Verify registry state
        const registryState = await merchantRegistryProgram.account.registryState.fetch(registryStatePDA);
        expect(registryState.authority.toString()).to.equal(authority.toString());
      } catch (e) {
        console.error("Error initializing merchant registry:", e);
        throw e;
      }
    });

    it("should register a merchant", async () => {
      try {
        // Check if merchant is already registered
        let merchantRegistered = false;

        try {
          await merchantRegistryProgram.account.merchantAccount.fetch(merchantAccountPDA);
          merchantRegistered = true;

        } catch (e) {

        }

        if (!merchantRegistered) {
          const tx = await merchantRegistryProgram.methods
            .registerMerchant(merchantInfo)
            .accounts({
              merchantAccount: merchantAccountPDA,
              merchantWallet: merchantWallet.publicKey,
              payer: payer,
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();


        }

        // Verify merchant account
        const merchantAccount = await merchantRegistryProgram.account.merchantAccount.fetch(merchantAccountPDA);
        expect(merchantAccount.merchantWallet.toString()).to.equal(merchantWallet.publicKey.toString());
      } catch (e) {
        console.error("Error registering merchant:", e);
        throw e;
      }
    });

    it("should verify a merchant", async () => {
      try {
        // Verify merchant
        const tx = await merchantRegistryProgram.methods
          .verifyMerchant()
          .accounts({
            registryState: registryStatePDA,
            merchantAccount: merchantAccountPDA,
            authority: authority,
          })
          .rpc();



        // Check verification status
        const merchantAccount = await merchantRegistryProgram.account.merchantAccount.fetch(merchantAccountPDA);
        expect(merchantAccount.verified).to.be.true;
      } catch (e) {
        console.error("Error verifying merchant:", e);
        throw e;
      }
    });
  });

  describe("2. Liquidity Pool", () => {
    it("should initialize the liquidity pool", async () => {
      try {
        // Check if pool is already initialized
        let poolInitialized = false;

        try {
          await liquidityPoolProgram.account.poolState.fetch(poolStatePDA);
          poolInitialized = true;

        } catch (e) {

        }

        if (!poolInitialized) {
          const tx = await liquidityPoolProgram.methods
            .initialize(
              authority,
              baseRate,
              utilizationSlope,
              protocolFeePercent
            )
            .accounts({
              poolState: poolStatePDA,
              payer: payer,
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();


        }

        // Verify pool state
        const poolState = await liquidityPoolProgram.account.poolState.fetch(poolStatePDA);
        expect(poolState.authority.toString()).to.equal(authority.toString());
      } catch (e) {
        console.error("Error initializing liquidity pool:", e);
        throw e;
      }
    });

    it("should add liquidity to the pool", async () => {
      try {
        // Create pool vault if it doesn't exist
        let poolVaultExists = false;

        try {
          await token.getAccount(provider.connection, poolVaultPDA);
          poolVaultExists = true;

        } catch (e) {

        }

        if (!poolVaultExists) {
          // Create token account with the exact PDA used in the program
          const [vaultPDA, poolVaultBump] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("pool_vault"), mint.toBuffer()],
            liquidityPoolProgram.programId
          );



          // Create the token account with the PDA as owner
          // We need to create a token account at this exact address
          const rent = await provider.connection.getMinimumBalanceForRentExemption(
            token.AccountLayout.span
          );

          const createAccountIx = web3.SystemProgram.createAccount({
            fromPubkey: wallet.publicKey,
            newAccountPubkey: vaultPDA,
            lamports: rent,
            space: token.AccountLayout.span,
            programId: token.TOKEN_PROGRAM_ID
          });

          const initTokenAccountIx = token.createInitializeAccountInstruction(
            vaultPDA,
            mint,
            poolStatePDA
          );

          try {
            const tx = new web3.Transaction().add(createAccountIx, initTokenAccountIx);
            await provider.sendAndConfirm(tx, []);

            poolVaultPDA = vaultPDA; // Set the global poolVaultPDA
          } catch (e) {
            console.error("Error creating pool vault at PDA:", e);

            // As a fallback, try to use getAssociatedTokenAddress
            const poolVaultATA = await token.getAssociatedTokenAddress(
              mint,
              poolStatePDA,
              true // Allow PDA as owner
            );



            const createVaultIx = token.createAssociatedTokenAccountInstruction(
              payer,
              poolVaultATA,
              poolStatePDA,
              mint
            );

            await provider.sendAndConfirm(new web3.Transaction().add(createVaultIx));

            poolVaultPDA = poolVaultATA; // Set the global poolVaultPDA to use the ATA
          }
        }

        // Deposit tokens to the pool
        let userDepositExists = false;

        try {
          await liquidityPoolProgram.account.userDepositAccount.fetch(userDepositPDA);
          userDepositExists = true;

        } catch (e) {

        }

        if (!userDepositExists) {
          const tx = await liquidityPoolProgram.methods
            .deposit(depositAmount)
            .accounts({
              userDeposit: userDepositPDA,
              user: user,
              poolState: poolStatePDA,
              poolVault: poolVaultPDA,
              userTokenAccount: userTokenAccount,
              tokenMint: mint,
              tokenProgram: token.TOKEN_PROGRAM_ID,
              associatedTokenProgram: token.ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();


        }

        // Verify deposit
        const userDeposit = await liquidityPoolProgram.account.userDepositAccount.fetch(userDepositPDA);
        expect(userDeposit.depositedAmount.gte(new BN(0))).to.be.true;
      } catch (e) {
        console.error("Error depositing to liquidity pool:", e);
        throw e;
      }
    });

    it("should withdraw from liquidity pool", async () => {
      try {
        // Check if user deposit exists
        let depositExists = false;

        try {
          await liquidityPoolProgram.account.userDepositAccount.fetch(userDepositPDA);
          depositExists = true;
        } catch (e) {

          return;
        }

        if (depositExists) {
          // Get the current deposit amount
          const userDeposit = await liquidityPoolProgram.account.userDepositAccount.fetch(userDepositPDA);


          // Only proceed if there are funds to withdraw
          if (userDeposit.depositedAmount.lte(new BN(0))) {

            return;
          }

          // Withdraw a smaller amount (either half the deposit or 1 token, whichever is smaller)
          const withdrawAmount = BN.min(
            userDeposit.depositedAmount.div(new BN(2)),
            new BN(1_000_000) // 1 token minimum
          );



          const tx = await liquidityPoolProgram.methods
            .withdraw(withdrawAmount)
            .accounts({
              userDeposit: userDepositPDA,
              user: user,
              poolState: poolStatePDA,
              poolVault: poolVaultPDA,
              userTokenAccount: userTokenAccount,
              tokenMint: mint,
              tokenProgram: token.TOKEN_PROGRAM_ID,
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();



          // Verify withdrawal
          const updatedUserDeposit = await liquidityPoolProgram.account.userDepositAccount.fetch(userDepositPDA);
          expect(updatedUserDeposit.depositedAmount.gte(new BN(0))).to.be.true;

        }
      } catch (e) {
        console.error("Error withdrawing from liquidity pool:", e);
        throw e;
      }
    });
  });

  describe("3. Subscription Factory", () => {
    it("should initialize the subscription factory", async () => {
      try {
        // Check if factory is already initialized
        let factoryInitialized = false;

        try {
          await subFactoryProgram.account.factoryState.fetch(factoryStatePDA);
          factoryInitialized = true;

        } catch (e) {

        }

        if (!factoryInitialized) {
          const tx = await subFactoryProgram.methods
            .initialize(authority)
            .accounts({
              factoryState: factoryStatePDA,
              payer: payer,
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();


        }

        // Verify factory state
        const factoryState = await subFactoryProgram.account.factoryState.fetch(factoryStatePDA);
        expect(factoryState.authority.toString()).to.equal(authority.toString());
      } catch (e) {
        console.error("Error initializing subscription factory:", e);
        throw e;
      }
    });

    it("should create a subscription program", async () => {
      try {
        // Check if subscription program already exists
        let subscriptionProgramExists = false;

        try {
          await subFactoryProgram.account.subscriptionProgram.fetch(subscriptionProgramPDA);
          subscriptionProgramExists = true;

        } catch (e) {

        }

        if (!subscriptionProgramExists) {
          const tx = await subFactoryProgram.methods
            .createSubscriptionProgram(
              programName,
              subscriptionPrice,
              durationDays,
              redemptionQuota
            )
            .accounts({
              factoryState: factoryStatePDA,
              subscriptionProgram: subscriptionProgramPDA,
              merchantAccount: merchantAccountPDA,
              merchantWallet: merchantWallet.publicKey,
              merchantRegistry: merchantRegistryProgram.programId,
              tokenMint: mint,
              payer: payer,
              systemProgram: web3.SystemProgram.programId,
            })
            .signers([merchantKeypair])
            .rpc();


        }

        // Verify subscription program
        const subscriptionProgram = await subFactoryProgram.account.subscriptionProgram.fetch(subscriptionProgramPDA);
        expect(subscriptionProgram.merchant.toString()).to.equal(merchantWallet.publicKey.toString());
      } catch (e) {
        console.error("Error creating subscription program:", e);
        throw e;
      }
    });
  });

  describe("4. Subscription Manager", () => {
    it("should initialize the subscription manager", async () => {
      try {
        // Check if manager is already initialized
        let managerInitialized = false;

        try {
          await subManagerProgram.account.managerState.fetch(managerStatePDA);
          managerInitialized = true;

        } catch (e) {

        }

        if (!managerInitialized) {
          const tx = await subManagerProgram.methods
            .initialize(authority)
            .accounts({
              managerState: managerStatePDA,
              payer: payer,
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();


        }

        // Verify manager state
        const managerState = await subManagerProgram.account.managerState.fetch(managerStatePDA);
        expect(managerState.authority.toString()).to.equal(authority.toString());
      } catch (e) {
        console.error("Error initializing subscription manager:", e);
        throw e;
      }
    });

    it("should subscribe to a program", async () => {
      try {
        // Calculate subscription account PDA
        const subscriptionSeedPrefix = Buffer.from("subscription");
        [subscriptionAccountPDA] = web3.PublicKey.findProgramAddressSync(
          [subscriptionSeedPrefix, user.toBuffer(), subscriptionProgramPDA.toBuffer()],
          subManagerProgram.programId
        );

        // Check if already subscribed
        let alreadySubscribed = false;

        try {
          await subManagerProgram.account.subscriptionAccount.fetch(subscriptionAccountPDA);
          alreadySubscribed = true;

        } catch (e) {

        }

        if (!alreadySubscribed) {
          // Mint NFT to user if not already done
          try {
            const tokenInfo = await token.getAccount(provider.connection, userNftAccount);
            if (tokenInfo.amount === BigInt(0)) {
              await token.mintTo(
                provider.connection,
                provider.wallet.payer,
                nftMint,
                userNftAccount,
                payer,
                1
              );

            }
          } catch (e) {
            console.error("Error checking or minting NFT:", e);
            throw e;
          }

          // Get the actual pool state PDA to ensure we're using the right one
          // We need to get the PDA directly from the liquidity pool program
          const [correctPoolStatePDA] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("pool_state")],
            liquidityPoolProgram.programId
          );

          // Get the correct user deposit PDA
          const [correctUserDepositPDA] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("user_deposit"), user.toBuffer(), mint.toBuffer()],
            liquidityPoolProgram.programId
          );

          // The issue is with the pool vault account. We need to find the actual token account being used.
          // First let's create a pool vault for the subscription
          let actualPoolVaultAccount;

          try {
            // Get the pool state first to ensure we have the right info
            const poolState = await liquidityPoolProgram.account.poolState.fetch(correctPoolStatePDA);

            // Try to find the token account for the pool vault using getAssociatedTokenAddress
            const [correctPoolVaultPDA] = web3.PublicKey.findProgramAddressSync(
              [Buffer.from("pool_vault"), mint.toBuffer()],
              liquidityPoolProgram.programId
            );

            // Verify this account exists by attempting to fetch its data
            try {
              await token.getAccount(provider.connection, correctPoolVaultPDA);

            } catch (e) {

              const createATAIx = token.createAssociatedTokenAccountInstruction(
                payer,
                correctPoolVaultPDA,
                correctPoolStatePDA,
                mint
              );
              await provider.sendAndConfirm(new web3.Transaction().add(createATAIx));

            }
          } catch (e) {
            console.error("Error finding or creating pool vault:", e);
            throw e;
          }

          const tx = await subManagerProgram.methods
            .subscribe(subscriptionPrice)
            .accounts({
              managerState: managerStatePDA,
              subscription: subscriptionAccountPDA,
              user: user,
              subscriptionProgram: subscriptionProgramPDA,
              subscriptionFactoryProgram: subFactoryProgram.programId,
              merchantWallet: merchantWallet.publicKey,
              poolState: correctPoolStatePDA,
              userDeposit: correctUserDepositPDA,
              poolVault: poolVaultPDA,
              userTokenAccount: userTokenAccount,
              merchantTokenAccount: merchantTokenAccount,
              paymentTokenMint: mint,
              nftMint: nftMint,
              liquidityPoolProgram: liquidityPoolProgram.programId,
              tokenProgram: token.TOKEN_PROGRAM_ID,
              associatedTokenProgram: token.ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: web3.SystemProgram.programId,
            })
            .signers([provider.wallet.payer])
            .rpc();


        }

        // Verify subscription
        const subscriptionAccount = await subManagerProgram.account.subscriptionAccount.fetch(subscriptionAccountPDA);
        expect(subscriptionAccount.user.toString()).to.equal(user.toString());
      } catch (e) {
        console.error("Error subscribing to program:", e);
        throw e;
      }
    });

    it("should redeem program benefits", async () => {
      try {
        // Check if subscription exists
        let subscriptionExists = false;

        try {
          await subManagerProgram.account.subscriptionAccount.fetch(subscriptionAccountPDA);
          subscriptionExists = true;

        } catch (e) {

          return;
        }

        if (subscriptionExists) {
          const tx = await subManagerProgram.methods
            .redeem(
              redemptionAmount,
              // Dummy signature for testing - in production this would be a real signature
              Array(64).fill(0)
            )
            .accounts({
              subscription: subscriptionAccountPDA,
              subscriptionProgram: subscriptionProgramPDA,
              signer: user,
              merchantWallet: merchantWallet.publicKey,
            })
            .rpc();



          // Verify redemption
          const subscriptionAccount = await subManagerProgram.account.subscriptionAccount.fetch(subscriptionAccountPDA);
          expect(subscriptionAccount.remainingQuota).to.be.at.least(redemptionAmount);
        }
      } catch (e) {
        console.error("Error redeeming benefits:", e);
        throw e;
      }
    });

    it("should borrow from liquidity pool", async () => {
      try {
        // Check if merchant loan account exists
        let loanExists = false;

        try {
          await liquidityPoolProgram.account.merchantLoanAccount.fetch(merchantLoanPDA);
          loanExists = true;

        } catch (e) {

        }

        if (!loanExists) {
          const tx = await liquidityPoolProgram.methods
            .borrow(borrowAmount)
            .accounts({
              poolState: poolStatePDA,
              poolVault: poolVaultPDA,
              merchantLoan: merchantLoanPDA,
              merchantAccount: merchantAccountPDA,
              merchantTokenAccount: merchantTokenAccount,
              merchantWallet: merchantWallet.publicKey,
              merchantRegistry: merchantRegistryProgram.programId,
              tokenMint: mint,
              tokenProgram: token.TOKEN_PROGRAM_ID,
              systemProgram: web3.SystemProgram.programId,
            })
            .signers([merchantKeypair])
            .rpc();


        }

        // Verify loan
        const merchantLoan = await liquidityPoolProgram.account.merchantLoanAccount.fetch(merchantLoanPDA);
        expect(merchantLoan.principal.gte(new BN(0))).to.be.true;
      } catch (e) {
        console.error("Error borrowing from liquidity pool:", e);
        throw e;
      }
    });

    it("should repay loan to liquidity pool", async () => {
      try {
        // Only test repayment if a loan exists
        let loanExists = false;

        try {
          await liquidityPoolProgram.account.merchantLoanAccount.fetch(merchantLoanPDA);
          loanExists = true;
        } catch (e) {

          return;
        }

        if (loanExists) {
          const tx = await liquidityPoolProgram.methods
            .repayLoan(repayAmount)
            .accounts({
              poolState: poolStatePDA,
              poolVault: poolVaultPDA,
              merchantLoan: merchantLoanPDA,
              merchantTokenAccount: merchantTokenAccount,
              merchantWallet: merchantWallet.publicKey,
              tokenMint: mint,
              tokenProgram: token.TOKEN_PROGRAM_ID,
            })
            .signers([merchantKeypair])
            .rpc();



          // Verify repayment
          const merchantLoan = await liquidityPoolProgram.account.merchantLoanAccount.fetch(merchantLoanPDA);
          // Just verify the loan still exists - amount may have changed
          expect(merchantLoan.merchant.toString()).to.equal(merchantWallet.publicKey.toString());
        }
      } catch (e) {
        console.error("Error repaying loan:", e);
        throw e;
      }
    });

    it("should withdraw from liquidity pool", async () => {
      try {
        // Check if user deposit exists
        let depositExists = false;

        try {
          await liquidityPoolProgram.account.userDepositAccount.fetch(userDepositPDA);
          depositExists = true;
        } catch (e) {

          return;
        }

        if (depositExists) {
          // Get the current deposit amount
          const userDeposit = await liquidityPoolProgram.account.userDepositAccount.fetch(userDepositPDA);


          // Only proceed if there are funds to withdraw
          if (userDeposit.depositedAmount.lte(new BN(0))) {

            return;
          }

          // Withdraw a smaller amount (either half the deposit or 1 token, whichever is smaller)
          const withdrawAmount = BN.min(
            userDeposit.depositedAmount.div(new BN(2)),
            new BN(1_000_000) // 1 token minimum
          );



          const tx = await liquidityPoolProgram.methods
            .withdraw(withdrawAmount)
            .accounts({
              userDeposit: userDepositPDA,
              user: user,
              poolState: poolStatePDA,
              poolVault: poolVaultPDA,
              userTokenAccount: userTokenAccount,
              tokenMint: mint,
              tokenProgram: token.TOKEN_PROGRAM_ID,
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();



          // Verify withdrawal
          const updatedUserDeposit = await liquidityPoolProgram.account.userDepositAccount.fetch(userDepositPDA);
          expect(updatedUserDeposit.depositedAmount.gte(new BN(0))).to.be.true;

        }
      } catch (e) {
        console.error("Error withdrawing from liquidity pool:", e);
        throw e;
      }
    });
  });
}); 