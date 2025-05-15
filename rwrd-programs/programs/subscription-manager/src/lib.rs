use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer as SplTransfer};

// Importing from subscription factory for context
use subscription_factory::{program::SubscriptionFactory, SubscriptionProgram};

// Importing from liquidity pool for payments
use liquidity_pool::{cpi::accounts::PayViaPool, cpi::pay_via_pool, program::LiquidityPool};

declare_id!("ES4jrcNmiwq87RFZ8dXhbXdc6aYSrwQDoJ8CyGsyjNF8");

#[program]
pub mod subscription_manager {
    use super::*;

    // Initialize the manager state
    pub fn initialize(ctx: Context<Initialize>, authority: Pubkey) -> Result<()> {
        let manager_state = &mut ctx.accounts.manager_state;
        manager_state.authority = authority;
        manager_state.bump = ctx.bumps.manager_state;

        Ok(())
    }

    // Create a subscription (single transaction flow)
    pub fn subscribe(
        ctx: Context<Subscribe>,
        payment_amount: u64, // Amount to pay
    ) -> Result<()> {
        // 1. Verify the subscription program is active
        require!(
            ctx.accounts.subscription_program.is_active,
            ErrorCode::InactiveProgram
        );

        // 2. Validate payment amount matches subscription price
        require!(
            payment_amount == ctx.accounts.subscription_program.subscription_price,
            ErrorCode::InvalidPaymentAmount
        );

        // 3. Calculate expiry timestamp
        let current_timestamp = Clock::get()?.unix_timestamp;
        let duration_seconds =
            ctx.accounts.subscription_program.duration_days as i64 * 24 * 60 * 60;
        let expiry_timestamp = current_timestamp + duration_seconds;

        // 4. Create subscription account with metadata
        let subscription = &mut ctx.accounts.subscription;
        subscription.user = ctx.accounts.user.key();
        subscription.program_id = ctx.accounts.subscription_program.key();
        subscription.token_mint = ctx.accounts.nft_mint.key();
        subscription.remaining_quota = ctx.accounts.subscription_program.redemption_quota;
        subscription.expiry_timestamp = expiry_timestamp;
        subscription.created_at = current_timestamp;
        subscription.last_redeemed_at = 0; // Never redeemed yet
        subscription.bump = ctx.bumps.subscription;

        // 5. Transfer payment directly from user to pool vault
        let cpi_accounts = SplTransfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.pool_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, payment_amount)?;

        // 6. Mint NFT to user (for MVP we're omitting actual Metaplex CPI)
        // Instead, for MVP simplicity, we'll just emit an event
        emit!(SubscriptionCreatedEvent {
            subscription_id: subscription.key(),
            user: subscription.user,
            program_id: subscription.program_id,
            token_mint: subscription.token_mint,
            expiry_timestamp: subscription.expiry_timestamp,
        });

        Ok(())
    }

    // Redeem from a subscription
    pub fn redeem(
        ctx: Context<Redeem>,
        redemption_amount: u16,
        merchant_signature: [u8; 64], // Signature from merchant authorizing the redemption
    ) -> Result<()> {
        // Verify the subscription is still valid
        let subscription = &mut ctx.accounts.subscription;
        let current_timestamp = Clock::get()?.unix_timestamp;

        require!(
            current_timestamp <= subscription.expiry_timestamp,
            ErrorCode::ExpiredSubscription
        );
        require!(
            subscription.remaining_quota >= redemption_amount,
            ErrorCode::InsufficientQuota
        );

        // For an MVP, we'll just check that the merchant matches
        // In a production environment, we would verify the merchant_signature
        // by recovering the signer and comparing with merchant_wallet
        require!(
            ctx.accounts.merchant_wallet.key() == ctx.accounts.subscription_program.merchant,
            ErrorCode::UnauthorizedMerchant
        );

        // Update the subscription metadata
        subscription.remaining_quota = subscription
            .remaining_quota
            .saturating_sub(redemption_amount);
        subscription.last_redeemed_at = current_timestamp;

        // Emit redemption event
        emit!(RedemptionEvent {
            subscription_id: subscription.key(),
            user: subscription.user,
            program_id: subscription.program_id,
            redemption_amount,
            remaining_quota: subscription.remaining_quota,
            timestamp: current_timestamp,
        });

        // In a real implementation, we would also update the NFT metadata
        // via Metaplex CPI to reflect the updated remaining quota

        Ok(())
    }

    // Renew an existing subscription
    pub fn renew_subscription(ctx: Context<RenewSubscription>, payment_amount: u64) -> Result<()> {
        // 1. Verify the subscription program is active
        require!(
            ctx.accounts.subscription_program.is_active,
            ErrorCode::InactiveProgram
        );

        // 2. Validate payment amount matches subscription price
        require!(
            payment_amount == ctx.accounts.subscription_program.subscription_price,
            ErrorCode::InvalidPaymentAmount
        );

        // 3. Calculate new expiry timestamp
        let current_timestamp = Clock::get()?.unix_timestamp;
        let duration_seconds =
            ctx.accounts.subscription_program.duration_days as i64 * 24 * 60 * 60;

        let subscription = &mut ctx.accounts.subscription;

        // If current subscription is expired, start from now, otherwise extend
        let new_expiry = if current_timestamp > subscription.expiry_timestamp {
            current_timestamp + duration_seconds
        } else {
            subscription.expiry_timestamp + duration_seconds
        };

        // 4. Process payment via liquidity pool using CPI
        let liquidity_pool_program = ctx.accounts.liquidity_pool_program.to_account_info();
        let liquidity_pool_accounts = PayViaPool {
            user_wallet: ctx.accounts.user.to_account_info(),
            merchant_wallet: ctx.accounts.merchant_wallet.to_account_info(),
            pool_state: ctx.accounts.pool_state.to_account_info(),
            user_deposit: match &ctx.accounts.user_deposit {
                Some(acct) => Some(acct.to_account_info()),
                None => None,
            },
            pool_vault: ctx.accounts.pool_vault.to_account_info(),
            user_token_account: ctx.accounts.user_token_account.to_account_info(),
            merchant_token_account: ctx.accounts.merchant_token_account.to_account_info(),
            token_mint: ctx.accounts.payment_token_mint.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(liquidity_pool_program, liquidity_pool_accounts);

        pay_via_pool(cpi_ctx, payment_amount)?;

        // 5. Update subscription data
        subscription.expiry_timestamp = new_expiry;
        subscription.remaining_quota = ctx.accounts.subscription_program.redemption_quota;

        // Emit renewal event
        emit!(SubscriptionRenewedEvent {
            subscription_id: subscription.key(),
            user: subscription.user,
            program_id: subscription.program_id,
            new_expiry_timestamp: subscription.expiry_timestamp,
            timestamp: current_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + ManagerState::SPACE,
        seeds = [b"manager_state"],
        bump
    )]
    pub manager_state: Account<'info, ManagerState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Subscribe<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + SubscriptionAccount::SPACE,
        seeds = [
            b"subscription", 
            user.key().as_ref(),
            subscription_program.key().as_ref()
        ],
        bump
    )]
    pub subscription: Account<'info, SubscriptionAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        seeds = [b"manager_state"],
        bump = manager_state.bump
    )]
    pub manager_state: Account<'info, ManagerState>,

    // Subscription program account (from subscription factory)
    pub subscription_program: Account<'info, SubscriptionProgram>,
    /// CHECK: This is just the program ID
    pub subscription_factory_program: UncheckedAccount<'info>,

    // Payment and token accounts
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    pub payment_token_mint: Account<'info, Mint>,

    // NFT mint account (for MVP, we're not actually minting the NFT)
    /// CHECK: For MVP we're not actually using this account
    pub nft_mint: UncheckedAccount<'info>,

    // Programs
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(
        mut,
        seeds = [
            b"subscription", 
            subscription.user.as_ref(),
            subscription.program_id.as_ref()
        ],
        bump = subscription.bump
    )]
    pub subscription: Account<'info, SubscriptionAccount>,

    // Either the user or merchant can initiate redemption
    pub signer: Signer<'info>,

    // We need to verify the merchant and program
    /// CHECK: This is the merchant wallet - verified in the instruction logic
    pub merchant_wallet: UncheckedAccount<'info>,
    pub subscription_program: Account<'info, SubscriptionProgram>,
}

#[derive(Accounts)]
pub struct RenewSubscription<'info> {
    #[account(
        mut,
        seeds = [
            b"subscription", 
            user.key().as_ref(),
            subscription_program.key().as_ref()
        ],
        bump = subscription.bump,
        constraint = user.key() == subscription.user @ ErrorCode::UnauthorizedAccess
    )]
    pub subscription: Account<'info, SubscriptionAccount>,
    #[account(mut)]
    pub user: Signer<'info>,

    // Subscription program account (from subscription factory)
    pub subscription_program: Account<'info, SubscriptionProgram>,

    /// CHECK: The merchant wallet for payment
    pub merchant_wallet: UncheckedAccount<'info>,

    // Liquidity pool accounts
    #[account(
        seeds = [b"pool_state"],
        seeds::program = liquidity_pool_program.key(),
        bump
    )]
    pub pool_state: Account<'info, liquidity_pool::PoolState>,

    // User deposit is optional
    #[account(
        mut,
        seeds = [
            b"user_deposit", 
            user.key().as_ref(),
            payment_token_mint.key().as_ref()
        ],
        seeds::program = liquidity_pool_program.key(),
        bump,
    )]
    pub user_deposit: Option<Account<'info, liquidity_pool::UserDepositAccount>>,

    #[account(
        mut,
        seeds = [b"pool_vault", payment_token_mint.key().as_ref()],
        seeds::program = liquidity_pool_program.key(),
        bump
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    // Payment and token accounts
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub merchant_token_account: Account<'info, TokenAccount>,
    pub payment_token_mint: Account<'info, Mint>,

    // Programs
    pub liquidity_pool_program: Program<'info, LiquidityPool>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ManagerState {
    pub authority: Pubkey,
    pub bump: u8,
}

impl ManagerState {
    pub const SPACE: usize = 32 + // authority
                           1; // bump
}

#[account]
pub struct SubscriptionAccount {
    pub user: Pubkey,
    pub program_id: Pubkey,
    pub token_mint: Pubkey,
    pub remaining_quota: u16,
    pub expiry_timestamp: i64,
    pub created_at: i64,
    pub last_redeemed_at: i64,
    pub bump: u8,
}

impl SubscriptionAccount {
    pub const SPACE: usize = 32 + // user
                            32 + // program_id
                            32 + // token_mint
                            2 +  // remaining_quota
                            8 +  // expiry_timestamp
                            8 +  // created_at
                            8 +  // last_redeemed_at
                            1; // bump
}

// Events
#[event]
pub struct SubscriptionCreatedEvent {
    pub subscription_id: Pubkey,
    pub user: Pubkey,
    pub program_id: Pubkey,
    pub token_mint: Pubkey,
    pub expiry_timestamp: i64,
}

#[event]
pub struct RedemptionEvent {
    pub subscription_id: Pubkey,
    pub user: Pubkey,
    pub program_id: Pubkey,
    pub redemption_amount: u16,
    pub remaining_quota: u16,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionRenewedEvent {
    pub subscription_id: Pubkey,
    pub user: Pubkey,
    pub program_id: Pubkey,
    pub new_expiry_timestamp: i64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Subscription program is inactive")]
    InactiveProgram,
    #[msg("Payment amount does not match subscription price")]
    InvalidPaymentAmount,
    #[msg("Subscription has expired")]
    ExpiredSubscription,
    #[msg("Insufficient remaining quota for redemption")]
    InsufficientQuota,
    #[msg("Unauthorized merchant for this subscription")]
    UnauthorizedMerchant,
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
}
