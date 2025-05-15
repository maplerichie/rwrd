use anchor_lang::prelude::*;
use anchor_spl::token::Token;

// Importing merchant registry for CPI
use merchant_registry::{
    cpi::accounts::RegisterProgram as MerchantRegisterProgram,
    cpi::register_program as merchant_register_program, program::MerchantRegistry,
};

declare_id!("AmZj2VQDPnsNaUBHQXAiifMhaKWDLgQ1GmgXDGTjY5Lw");

#[program]
pub mod subscription_factory {
    use super::*;

    // Initialize the factory state
    pub fn initialize(ctx: Context<Initialize>, authority: Pubkey) -> Result<()> {
        let factory_state = &mut ctx.accounts.factory_state;
        factory_state.authority = authority;
        factory_state.bump = ctx.bumps.factory_state;

        Ok(())
    }

    // Create a new subscription program
    pub fn create_subscription_program(
        ctx: Context<CreateSubscriptionProgram>,
        program_name: String,
        subscription_price: u64,
        duration_days: u16,
        redemption_quota: u16,
    ) -> Result<()> {
        // Validate parameters
        require!(subscription_price > 0, ErrorCode::InvalidPrice);
        require!(duration_days > 0, ErrorCode::InvalidDuration);
        require!(redemption_quota > 0, ErrorCode::InvalidQuota);
        require!(
            program_name.len() > 0 && program_name.len() <= 50,
            ErrorCode::InvalidProgramName
        );

        // Create the subscription program account
        let subscription_program = &mut ctx.accounts.subscription_program;
        subscription_program.merchant = ctx.accounts.merchant_wallet.key();
        subscription_program.program_name = program_name;
        subscription_program.subscription_price = subscription_price;
        subscription_program.duration_days = duration_days;
        subscription_program.redemption_quota = redemption_quota;
        subscription_program.is_active = true;
        subscription_program.created_at = Clock::get()?.unix_timestamp;
        subscription_program.updated_at = subscription_program.created_at;
        subscription_program.bump = ctx.bumps.subscription_program;

        // CPI to Merchant Registry to register the program
        let merchant_registry_program = ctx.accounts.merchant_registry_program.to_account_info();
        let merchant_account = ctx.accounts.merchant_account.to_account_info();

        let cpi_accounts = MerchantRegisterProgram {
            merchant_account,
            program_authority: ctx.accounts.merchant_wallet.to_account_info(),
        };

        let cpi_program = merchant_registry_program;
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        merchant_register_program(cpi_ctx, subscription_program.key())?;

        Ok(())
    }

    // Close a subscription program - can only be done by merchant
    pub fn close_subscription_program(ctx: Context<CloseSubscriptionProgram>) -> Result<()> {
        let subscription_program = &mut ctx.accounts.subscription_program;
        subscription_program.is_active = false;
        subscription_program.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    // Update a subscription program's parameters
    pub fn update_subscription_program(
        ctx: Context<UpdateSubscriptionProgram>,
        subscription_price: Option<u64>,
        duration_days: Option<u16>,
        redemption_quota: Option<u16>,
    ) -> Result<()> {
        let subscription_program = &mut ctx.accounts.subscription_program;

        // Only update fields that were provided
        if let Some(price) = subscription_price {
            require!(price > 0, ErrorCode::InvalidPrice);
            subscription_program.subscription_price = price;
        }

        if let Some(days) = duration_days {
            require!(days > 0, ErrorCode::InvalidDuration);
            subscription_program.duration_days = days;
        }

        if let Some(quota) = redemption_quota {
            require!(quota > 0, ErrorCode::InvalidQuota);
            subscription_program.redemption_quota = quota;
        }

        subscription_program.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + FactoryState::SPACE,
        seeds = [b"factory_state"],
        bump
    )]
    pub factory_state: Account<'info, FactoryState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(program_name: String)]
pub struct CreateSubscriptionProgram<'info> {
    #[account(
        init,
        payer = merchant_wallet,
        space = 8 + SubscriptionProgram::SPACE,
        seeds = [
            b"subscription_program", 
            merchant_wallet.key().as_ref(),
            program_name.as_bytes()
        ],
        bump
    )]
    pub subscription_program: Account<'info, SubscriptionProgram>,

    #[account(mut)]
    pub merchant_wallet: Signer<'info>,

    #[account(
        seeds = [b"factory_state"],
        bump = factory_state.bump
    )]
    pub factory_state: Account<'info, FactoryState>,

    // Merchant Registry Program accounts for CPI
    /// CHECK: This is verified in the CPI call
    #[account(mut)]
    pub merchant_account: UncheckedAccount<'info>,

    pub merchant_registry_program: Program<'info, MerchantRegistry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseSubscriptionProgram<'info> {
    #[account(
        mut,
        seeds = [
            b"subscription_program", 
            merchant_wallet.key().as_ref(),
            &subscription_program.program_name.as_bytes()
        ],
        bump = subscription_program.bump,
        constraint = merchant_wallet.key() == subscription_program.merchant @ ErrorCode::UnauthorizedAccess
    )]
    pub subscription_program: Account<'info, SubscriptionProgram>,
    #[account(mut)]
    pub merchant_wallet: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateSubscriptionProgram<'info> {
    #[account(
        mut,
        seeds = [
            b"subscription_program", 
            merchant_wallet.key().as_ref(),
            &subscription_program.program_name.as_bytes()
        ],
        bump = subscription_program.bump,
        constraint = merchant_wallet.key() == subscription_program.merchant @ ErrorCode::UnauthorizedAccess
    )]
    pub subscription_program: Account<'info, SubscriptionProgram>,
    #[account(mut)]
    pub merchant_wallet: Signer<'info>,
}

#[account]
pub struct FactoryState {
    pub authority: Pubkey,
    pub bump: u8,
}

impl FactoryState {
    pub const SPACE: usize = 32 + // authority
                           1; // bump
}

#[account]
pub struct SubscriptionProgram {
    pub merchant: Pubkey,
    pub program_name: String, // Up to 50 chars
    pub subscription_price: u64,
    pub duration_days: u16,
    pub redemption_quota: u16,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl SubscriptionProgram {
    pub const SPACE: usize = 32 +         // merchant
                            4 + 50 +      // program_name (String prefix + max chars)
                            8 +           // subscription_price
                            2 +           // duration_days
                            2 +           // redemption_quota
                            1 +           // is_active
                            8 +           // created_at
                            8 +           // updated_at
                            1; // bump
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
    #[msg("Invalid subscription price")]
    InvalidPrice,
    #[msg("Invalid duration period")]
    InvalidDuration,
    #[msg("Invalid redemption quota")]
    InvalidQuota,
    #[msg("Invalid program name")]
    InvalidProgramName,
}
