use anchor_lang::prelude::*;

declare_id!("9MCcaFZBat4AcRvQmt5GxunDrBYN7yGgnBWGRPVETvrE");

#[program]
pub mod merchant_registry {
    use super::*;

    // Initialize the registry with authority, governance, and fee
    pub fn initialize(ctx: Context<Initialize>, fee: u8) -> Result<()> {
        let registry_state = &mut ctx.accounts.registry_state;
        registry_state.authority = ctx.accounts.authority.key();
        registry_state.governance = ctx.accounts.governance.key();
        registry_state.fee = fee;
        registry_state.bump = ctx.bumps.registry_state;

        Ok(())
    }

    // Register a new merchant
    pub fn register_merchant(
        ctx: Context<RegisterMerchant>,
        merchant_info: MerchantInfo,
    ) -> Result<()> {
        let merchant_account = &mut ctx.accounts.merchant_account;
        merchant_account.merchant_wallet = ctx.accounts.merchant_wallet.key();
        merchant_account.info = merchant_info;
        merchant_account.verified = true; // New merchants need verification
        merchant_account.created_at = Clock::get()?.unix_timestamp;
        merchant_account.updated_at = merchant_account.created_at;
        merchant_account.bump = ctx.bumps.merchant_account;

        Ok(())
    }

    // Verify a merchant - only callable by authority
    pub fn verify_merchant(ctx: Context<VerifyMerchant>) -> Result<()> {
        let merchant_account = &mut ctx.accounts.merchant_account;
        merchant_account.verified = true;
        merchant_account.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    // Update merchant information
    pub fn update_merchant_info(
        ctx: Context<UpdateMerchantInfo>,
        merchant_info: MerchantInfo,
    ) -> Result<()> {
        let merchant_account = &mut ctx.accounts.merchant_account;
        merchant_account.info = merchant_info;
        merchant_account.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    // Register a subscription program for a merchant
    pub fn register_program(ctx: Context<RegisterProgram>, _program_id: Pubkey) -> Result<()> {
        let merchant_account = &mut ctx.accounts.merchant_account;

        // This function will be called via CPI from the SubscriptionFactory program
        // Simply verify the merchant exists and is verified
        require!(
            merchant_account.verified,
            MerchantRegistryError::MerchantNotVerified
        );

        Ok(())
    }
}

// Error codes for the merchant registry program
#[error_code]
pub enum MerchantRegistryError {
    #[msg("Merchant is not verified")]
    MerchantNotVerified,
    #[msg("Unauthorized. Only authority can perform this action")]
    Unauthorized,
    #[msg("Invalid merchant info")]
    InvalidMerchantInfo,
}

// Merchant information struct
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct MerchantInfo {
    pub name: [u8; 32],     // UTF-8 bytes, fixed size for on-chain storage efficiency
    pub category: [u8; 16], // UTF-8 bytes, fixed size
    pub location: [u8; 32], // UTF-8 bytes, fixed size
    pub website: [u8; 64],  // UTF-8 bytes, fixed size
}

// Registry state account
#[account]
pub struct RegistryState {
    pub authority: Pubkey,  // Protocol authority
    pub governance: Pubkey, // DAO/multisig
    pub fee: u8,            // Protocol fee in percentage
    pub bump: u8,           // PDA bump
}

// Merchant account
#[account]
pub struct MerchantAccount {
    pub merchant_wallet: Pubkey, // Merchant wallet address
    pub info: MerchantInfo,      // Merchant information
    pub verified: bool,          // Verification status
    pub created_at: i64,         // Unix timestamp
    pub updated_at: i64,         // Unix timestamp
    pub bump: u8,                // PDA bump
}

// Initialize context
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 1 + 1, // discriminator + authority + governance + fee + bump
        seeds = [b"registry-state"],
        bump
    )]
    pub registry_state: Account<'info, RegistryState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: This is the governance account, doesn't need to be a signer during initialization
    pub governance: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

// Register merchant context
#[derive(Accounts)]
pub struct RegisterMerchant<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + std::mem::size_of::<MerchantInfo>() + 1 + 8 + 8 + 1, // discriminator + wallet + info + verified + timestamps + bump
        seeds = [b"merchant", merchant_wallet.key().as_ref()],
        bump
    )]
    pub merchant_account: Account<'info, MerchantAccount>,

    /// CHECK: This is the merchant wallet
    pub merchant_wallet: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// Verify merchant context
#[derive(Accounts)]
pub struct VerifyMerchant<'info> {
    #[account(
        seeds = [b"registry-state"],
        bump = registry_state.bump,
        has_one = authority @ MerchantRegistryError::Unauthorized
    )]
    pub registry_state: Account<'info, RegistryState>,

    #[account(
        mut,
        seeds = [b"merchant", merchant_account.merchant_wallet.as_ref()],
        bump = merchant_account.bump
    )]
    pub merchant_account: Account<'info, MerchantAccount>,

    pub authority: Signer<'info>,
}

// Update merchant info context
#[derive(Accounts)]
pub struct UpdateMerchantInfo<'info> {
    #[account(
        mut,
        seeds = [b"merchant", merchant_wallet.key().as_ref()],
        bump = merchant_account.bump,
        has_one = merchant_wallet @ MerchantRegistryError::Unauthorized
    )]
    pub merchant_account: Account<'info, MerchantAccount>,

    pub merchant_wallet: Signer<'info>,
}

// Register program context
#[derive(Accounts)]
pub struct RegisterProgram<'info> {
    #[account(
        seeds = [b"merchant", merchant_account.merchant_wallet.as_ref()],
        bump = merchant_account.bump
    )]
    pub merchant_account: Account<'info, MerchantAccount>,

    pub program_authority: Signer<'info>,
}
