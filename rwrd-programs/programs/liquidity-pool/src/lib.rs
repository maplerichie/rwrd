use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

// Importing merchant registry for CPI to verify merchants
use merchant_registry::{program::MerchantRegistry, MerchantAccount};

declare_id!("CJpW4FJkG86qj6p41S2NFBzWYCcYESNaCRDwGew21DyA");

#[program]
pub mod liquidity_pool {
    use super::*;

    // Initialize the pool state
    pub fn initialize(
        ctx: Context<Initialize>,
        authority: Pubkey,
        base_rate: u64,           // Base interest rate in basis points (1/100 of 1%)
        utilization_slope: u64,   // Utilization rate multiplier in basis points
        protocol_fee_percent: u8, // Protocol fee percentage (0-100)
    ) -> Result<()> {
        require!(protocol_fee_percent <= 100, ErrorCode::InvalidFeePercentage);

        let pool_state = &mut ctx.accounts.pool_state;
        pool_state.authority = authority;
        pool_state.total_deposited = 0;
        pool_state.total_borrowed = 0;
        pool_state.base_rate = base_rate;
        pool_state.utilization_slope = utilization_slope;
        pool_state.protocol_fee_percent = protocol_fee_percent;
        pool_state.bump = ctx.bumps.pool_state;

        Ok(())
    }

    // User deposits funds into the pool
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Transfer tokens from the user to the pool vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );

        token::transfer(transfer_ctx, amount)?;

        // Update user deposit account
        let user_deposit = &mut ctx.accounts.user_deposit;
        let current_timestamp = Clock::get()?.unix_timestamp;

        // If existing deposit, calculate interest first
        if user_deposit.deposited_amount > 0 {
            let earned_interest = calculate_interest(
                user_deposit.deposited_amount,
                user_deposit.last_interest_calculation,
                current_timestamp,
                ctx.accounts.pool_state.base_rate,
                ctx.accounts.pool_state.utilization_slope,
                ctx.accounts.pool_state.protocol_fee_percent,
                ctx.accounts.pool_state.total_deposited,
                ctx.accounts.pool_state.total_borrowed,
            );

            user_deposit.interest_earned =
                user_deposit.interest_earned.saturating_add(earned_interest);
        } else {
            // First deposit for this user
            user_deposit.user = ctx.accounts.user.key();
            user_deposit.token_mint = ctx.accounts.token_mint.key();
            user_deposit.deposit_date = current_timestamp;
        }

        // Update deposit amount and timestamp
        user_deposit.deposited_amount = user_deposit.deposited_amount.saturating_add(amount);
        user_deposit.last_interest_calculation = current_timestamp;

        // Update pool total deposited amount
        let pool_state = &mut ctx.accounts.pool_state;
        pool_state.total_deposited = pool_state.total_deposited.saturating_add(amount);

        // Emit deposit event
        emit!(DepositEvent {
            user: ctx.accounts.user.key(),
            token_mint: ctx.accounts.token_mint.key(),
            amount,
            total_deposited: user_deposit.deposited_amount,
            timestamp: current_timestamp,
        });

        Ok(())
    }

    // User withdraws deposited funds
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let user_deposit = &mut ctx.accounts.user_deposit;
        require!(
            user_deposit.deposited_amount >= amount,
            ErrorCode::InsufficientFunds
        );

        // Calculate and update interest accrued up to now
        let current_timestamp = Clock::get()?.unix_timestamp;
        let earned_interest = calculate_interest(
            user_deposit.deposited_amount,
            user_deposit.last_interest_calculation,
            current_timestamp,
            ctx.accounts.pool_state.base_rate,
            ctx.accounts.pool_state.utilization_slope,
            ctx.accounts.pool_state.protocol_fee_percent,
            ctx.accounts.pool_state.total_deposited,
            ctx.accounts.pool_state.total_borrowed,
        );

        user_deposit.interest_earned = user_deposit.interest_earned.saturating_add(earned_interest);
        user_deposit.last_interest_calculation = current_timestamp;

        // Update deposit amount
        user_deposit.deposited_amount = user_deposit.deposited_amount.saturating_sub(amount);

        // Update pool total deposited amount
        let pool_state = &mut ctx.accounts.pool_state;
        pool_state.total_deposited = pool_state.total_deposited.saturating_sub(amount);

        // Transfer tokens from the pool vault to the user
        let bump = ctx.accounts.pool_state.bump;
        let seeds = &[b"pool_state".as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool_state.to_account_info(),
            },
            signer_seeds,
        );

        token::transfer(transfer_ctx, amount)?;

        // Emit withdraw event
        emit!(WithdrawEvent {
            user: ctx.accounts.user.key(),
            token_mint: ctx.accounts.token_mint.key(),
            amount,
            remaining_deposit: user_deposit.deposited_amount,
            timestamp: current_timestamp,
        });

        Ok(())
    }

    // Process a payment from user to merchant via the pool
    // Priority: Interest earned > Deposited funds > Direct wallet
    pub fn pay_via_pool(ctx: Context<PayViaPool>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let current_timestamp = Clock::get()?.unix_timestamp;
        let user = ctx.accounts.user_wallet.key();
        let merchant = ctx.accounts.merchant_wallet.key();
        let token_mint = ctx.accounts.token_mint.key();

        // Calculate payment sources
        let mut from_interest = 0;
        let mut from_deposit = 0;
        let mut from_wallet = 0;

        // If user has a deposit account, use interest first, then deposit
        if let Some(user_deposit) = &mut ctx.accounts.user_deposit {
            // Calculate and update earned interest
            let earned_interest = calculate_interest(
                user_deposit.deposited_amount,
                user_deposit.last_interest_calculation,
                current_timestamp,
                ctx.accounts.pool_state.base_rate,
                ctx.accounts.pool_state.utilization_slope,
                ctx.accounts.pool_state.protocol_fee_percent,
                ctx.accounts.pool_state.total_deposited,
                ctx.accounts.pool_state.total_borrowed,
            );

            user_deposit.interest_earned =
                user_deposit.interest_earned.saturating_add(earned_interest);
            user_deposit.last_interest_calculation = current_timestamp;

            // Use interest first
            if user_deposit.interest_earned > 0 {
                from_interest = std::cmp::min(user_deposit.interest_earned, amount);
                user_deposit.interest_earned =
                    user_deposit.interest_earned.saturating_sub(from_interest);
            }

            // If interest not enough, use deposit
            let remaining = amount.saturating_sub(from_interest);
            if remaining > 0 && user_deposit.deposited_amount > 0 {
                from_deposit = std::cmp::min(user_deposit.deposited_amount, remaining);
                user_deposit.deposited_amount =
                    user_deposit.deposited_amount.saturating_sub(from_deposit);

                // Update pool total deposited
                let pool_state = &mut ctx.accounts.pool_state;
                pool_state.total_deposited =
                    pool_state.total_deposited.saturating_sub(from_deposit);
            }
        }

        // If interest + deposit not enough, use wallet
        from_wallet = amount.saturating_sub(from_interest + from_deposit);

        // Process transfers based on source allocation

        // Transfer from wallet if needed
        if from_wallet > 0 {
            let transfer_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.merchant_token_account.to_account_info(),
                    authority: ctx.accounts.user_wallet.to_account_info(),
                },
            );

            token::transfer(transfer_ctx, from_wallet)?;
        }

        // Transfer from pool if using interest or deposit
        if from_interest > 0 || from_deposit > 0 {
            let bump = ctx.accounts.pool_state.bump;
            let seeds = &[b"pool_state".as_ref(), &[bump]];
            let signer_seeds = &[&seeds[..]];

            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_vault.to_account_info(),
                    to: ctx.accounts.merchant_token_account.to_account_info(),
                    authority: ctx.accounts.pool_state.to_account_info(),
                },
                signer_seeds,
            );

            token::transfer(transfer_ctx, from_interest + from_deposit)?;
        }

        // Emit payment event
        emit!(PaymentEvent {
            user,
            merchant,
            token_mint,
            total_amount: amount,
            from_interest,
            from_deposit,
            from_wallet,
            timestamp: current_timestamp,
        });

        Ok(())
    }

    // Merchant borrows funds from the pool
    pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Verify merchant is registered and verified
        let merchant_account = &ctx.accounts.merchant_account;
        require!(merchant_account.verified, ErrorCode::MerchantNotVerified);

        // Calculate merchant trust score (1-5) and borrow limit
        let trust_score = calculate_trust_score(merchant_account);
        let borrow_limit = calculate_borrow_limit(trust_score, amount);

        // Check if merchant can borrow this amount
        let merchant_loan = &ctx.accounts.merchant_loan;
        let current_loans = get_outstanding_loan_amount(merchant_loan);
        let total_borrowed_after = current_loans.saturating_add(amount);
        require!(
            total_borrowed_after <= borrow_limit,
            ErrorCode::ExceedsBorrowLimit
        );

        // Check if there's enough liquidity in the pool
        let pool_state = &mut ctx.accounts.pool_state;
        require!(
            pool_state.total_deposited >= amount,
            ErrorCode::InsufficientLiquidity
        );

        // Update merchant loan account
        let merchant_loan = &mut ctx.accounts.merchant_loan;
        let current_timestamp = Clock::get()?.unix_timestamp;

        // For simplicity, we'll just update/overwrite the loan
        merchant_loan.merchant = ctx.accounts.merchant_wallet.key();
        merchant_loan.principal = merchant_loan.principal.saturating_add(amount);
        merchant_loan.issue_date = current_timestamp;
        merchant_loan.last_repayment_date = current_timestamp;
        merchant_loan.status = LoanStatus::Active;

        // Update pool state
        pool_state.total_borrowed = pool_state.total_borrowed.saturating_add(amount);

        // Transfer tokens from pool vault to merchant
        let bump = ctx.accounts.pool_state.bump;
        let seeds = &[b"pool_state".as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_vault.to_account_info(),
                to: ctx.accounts.merchant_token_account.to_account_info(),
                authority: ctx.accounts.pool_state.to_account_info(),
            },
            signer_seeds,
        );

        token::transfer(transfer_ctx, amount)?;

        // Emit borrow event
        emit!(BorrowEvent {
            merchant: ctx.accounts.merchant_wallet.key(),
            token_mint: ctx.accounts.token_mint.key(),
            amount,
            borrow_limit,
            current_outstanding: total_borrowed_after,
            timestamp: current_timestamp,
        });

        Ok(())
    }

    // Merchant repays loan
    pub fn repay_loan(ctx: Context<RepayLoan>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let merchant_loan = &mut ctx.accounts.merchant_loan;
        require!(
            merchant_loan.status == LoanStatus::Active,
            ErrorCode::LoanNotActive
        );

        // Calculate total outstanding including interest
        let current_timestamp = Clock::get()?.unix_timestamp;
        let accrued_interest = calculate_loan_interest(
            merchant_loan.principal,
            merchant_loan.last_repayment_date,
            current_timestamp,
            ctx.accounts.pool_state.base_rate,
            ctx.accounts.pool_state.utilization_slope,
            ctx.accounts.pool_state.total_deposited,
            ctx.accounts.pool_state.total_borrowed,
        );

        let total_outstanding = merchant_loan.principal.saturating_add(accrued_interest);

        // Transfer tokens from merchant to pool vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.merchant_token_account.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.merchant_wallet.to_account_info(),
            },
        );

        token::transfer(transfer_ctx, amount)?;

        // Update loan state
        let repayment_amount = std::cmp::min(amount, total_outstanding);

        // Apply repayment to interest first, then principal
        if repayment_amount <= accrued_interest {
            // Only paying interest
            merchant_loan.last_repayment_date = current_timestamp;
        } else {
            // Paying off some principal
            let principal_payment = repayment_amount.saturating_sub(accrued_interest);
            merchant_loan.principal = merchant_loan.principal.saturating_sub(principal_payment);
            merchant_loan.last_repayment_date = current_timestamp;

            // Update pool total borrowed
            let pool_state = &mut ctx.accounts.pool_state;
            pool_state.total_borrowed = pool_state.total_borrowed.saturating_sub(principal_payment);

            // If loan fully repaid, update status
            if merchant_loan.principal == 0 {
                merchant_loan.status = LoanStatus::Repaid;
            }
        }

        // Emit repayment event
        emit!(RepaymentEvent {
            merchant: ctx.accounts.merchant_wallet.key(),
            token_mint: ctx.accounts.token_mint.key(),
            amount: repayment_amount,
            to_interest: std::cmp::min(repayment_amount, accrued_interest),
            to_principal: repayment_amount.saturating_sub(accrued_interest),
            remaining_principal: merchant_loan.principal,
            timestamp: current_timestamp,
        });

        Ok(())
    }

    // Get the current deposit APR
    pub fn get_deposit_apr(ctx: Context<GetInterestRate>) -> Result<u64> {
        let pool_state = &ctx.accounts.pool_state;
        let borrow_apr = calculate_borrow_apr(
            pool_state.base_rate,
            pool_state.utilization_slope,
            pool_state.total_deposited,
            pool_state.total_borrowed,
        );

        // Calculate utilization rate (in basis points)
        let utilization_rate = if pool_state.total_deposited == 0 {
            0
        } else {
            ((pool_state.total_borrowed as u128) * 10_000 / (pool_state.total_deposited as u128))
                as u64
        };

        // deposit_apr = (borrow_apr * utilization) * (1 - protocol_fee_percent)
        let deposit_apr = (borrow_apr as u128)
            .saturating_mul(utilization_rate as u128)
            .saturating_div(10_000)
            .saturating_mul((100 - pool_state.protocol_fee_percent as u128))
            .saturating_div(100)
            .try_into()
            .unwrap_or(0);

        Ok(deposit_apr)
    }

    // Get the current borrow APR
    pub fn get_borrow_apr(ctx: Context<GetInterestRate>) -> Result<u64> {
        let pool_state = &ctx.accounts.pool_state;
        let borrow_apr = calculate_borrow_apr(
            pool_state.base_rate,
            pool_state.utilization_slope,
            pool_state.total_deposited,
            pool_state.total_borrowed,
        );

        Ok(borrow_apr)
    }
}

// Helper function to calculate interest earned on deposits
fn calculate_interest(
    amount: u64,
    last_calculation: i64,
    current_timestamp: i64,
    base_rate: u64,
    utilization_slope: u64,
    protocol_fee_percent: u8,
    total_deposited: u64,
    total_borrowed: u64,
) -> u64 {
    if amount == 0 || last_calculation >= current_timestamp {
        return 0;
    }

    // Calculate time elapsed in seconds
    let time_elapsed = (current_timestamp - last_calculation) as u64;

    // Calculate borrow APR in basis points (1/100 of 1%)
    let borrow_apr = calculate_borrow_apr(
        base_rate,
        utilization_slope,
        total_deposited,
        total_borrowed,
    );

    // Calculate utilization rate (in basis points)
    let utilization_rate = if total_deposited == 0 {
        0
    } else {
        ((total_borrowed as u128) * 10_000 / (total_deposited as u128)) as u64
    };

    // deposit_apr = (borrow_apr * utilization) * (1 - protocol_fee_percent)
    let deposit_apr = (borrow_apr as u128)
        .saturating_mul(utilization_rate as u128)
        .saturating_div(10_000)
        .saturating_mul((100 - protocol_fee_percent as u128))
        .saturating_div(100)
        .try_into()
        .unwrap_or(0);

    // Convert APR to per-second rate
    // deposit_apr is in basis points (1/100 of 1%), so we divide by 10000 * seconds_per_year
    let seconds_per_year: u64 = 365 * 24 * 60 * 60;
    let interest_rate_per_second = (deposit_apr as u128) / (10_000 * seconds_per_year as u128);

    // Calculate interest: principal * rate * time
    let interest = (amount as u128)
        .saturating_mul(interest_rate_per_second)
        .saturating_mul(time_elapsed as u128)
        .try_into()
        .unwrap_or(0);

    interest
}

// Helper function to calculate loan interest
fn calculate_loan_interest(
    principal: u64,
    last_repayment: i64,
    current_timestamp: i64,
    base_rate: u64,
    utilization_slope: u64,
    total_deposited: u64,
    total_borrowed: u64,
) -> u64 {
    if principal == 0 || last_repayment >= current_timestamp {
        return 0;
    }

    // Calculate time elapsed in seconds
    let time_elapsed = (current_timestamp - last_repayment) as u64;

    // Calculate borrow APR in basis points (1/100 of 1%)
    let borrow_apr = calculate_borrow_apr(
        base_rate,
        utilization_slope,
        total_deposited,
        total_borrowed,
    );

    // Convert APR to per-second rate
    let seconds_per_year: u64 = 365 * 24 * 60 * 60;
    let interest_rate_per_second = (borrow_apr as u128) / (10_000 * seconds_per_year as u128);

    // Calculate interest: principal * rate * time
    let interest = (principal as u128)
        .saturating_mul(interest_rate_per_second)
        .saturating_mul(time_elapsed as u128)
        .try_into()
        .unwrap_or(0);

    interest
}

// Helper function to calculate borrow APR
fn calculate_borrow_apr(
    base_rate: u64,
    utilization_slope: u64,
    total_deposited: u64,
    total_borrowed: u64,
) -> u64 {
    // Calculate utilization rate (in basis points)
    let utilization_rate = if total_deposited == 0 {
        0
    } else {
        ((total_borrowed as u128) * 10_000 / (total_deposited as u128)) as u64
    };

    // Calculate borrow APR: base_rate + (utilization_rate * slope)
    // All rates are in basis points (1/100 of 1%)
    base_rate.saturating_add(
        (utilization_rate as u128)
            .saturating_mul(utilization_slope as u128)
            .saturating_div(10_000)
            .try_into()
            .unwrap_or(0),
    )
}

// Helper function to calculate trust score (simplified for MVP)
fn calculate_trust_score(merchant_account: &MerchantAccount) -> u8 {
    // For MVP, we use a simplified trust score based on verification status
    // In a real implementation, this would use merchant revenue history,
    // repayment data, and other factors
    if merchant_account.verified {
        30 // Default 30% for verified merchants
    } else {
        0
    }
}

// Helper function to get outstanding loan amount
fn get_outstanding_loan_amount(merchant_loan: &Account<MerchantLoanAccount>) -> u64 {
    // Logic for handling a regular Account
    if merchant_loan.status != LoanStatus::Active {
        return 0;
    }

    // Calculate interest
    let current_timestamp = Clock::get().unwrap().unix_timestamp;
    let principal = merchant_loan.principal;
    let last_repayment = merchant_loan.last_repayment_date;

    // Simple interest calculation for demo
    // In a real implementation, we would use a more complex formula
    let days_elapsed = ((current_timestamp - last_repayment) / (24 * 60 * 60)) as u64;
    let interest_rate = 5; // 5% annual interest rate
    let interest = principal * interest_rate * days_elapsed / (365 * 100);

    principal + interest
}

// Add a separate function for handling optional merchant loan accounts
fn get_outstanding_loan_amount_option(merchant_loan: &Option<Account<MerchantLoanAccount>>) -> u64 {
    match merchant_loan {
        Some(loan) => get_outstanding_loan_amount(loan),
        None => 0,
    }
}

// Add a helper function to calculate borrow limit
fn calculate_borrow_limit(trust_score: u8, amount: u64) -> u64 {
    // Simple formula: trust_score * amount / 10
    // Trust score 1: can borrow 10% of their revenue
    // Trust score 5: can borrow 50% of their revenue
    let trust_percent = trust_score as u64 * 10;
    (amount * trust_percent) / 100
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + PoolState::SPACE,
        seeds = [b"pool_state"],
        bump
    )]
    pub pool_state: Account<'info, PoolState>,
    #[account(
        init,
        payer = payer,
        seeds = [b"pool_vault", token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = pool_state,
    )]
    pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserDepositAccount::SPACE,
        seeds = [
            b"user_deposit", 
            user.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump
    )]
    pub user_deposit: Account<'info, UserDepositAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"pool_state"],
        bump = pool_state.bump
    )]
    pub pool_state: Account<'info, PoolState>,

    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [
            b"user_deposit", 
            user.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump,
        constraint = user_deposit.user == user.key() @ ErrorCode::UnauthorizedAccess
    )]
    pub user_deposit: Account<'info, UserDepositAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"pool_state"],
        bump = pool_state.bump
    )]
    pub pool_state: Account<'info, PoolState>,

    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PayViaPool<'info> {
    #[account(mut)]
    pub user_wallet: Signer<'info>,
    /// CHECK: This is the merchant wallet
    pub merchant_wallet: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"pool_state"],
        bump = pool_state.bump
    )]
    pub pool_state: Account<'info, PoolState>,

    // User deposit account is optional because the user might not have a deposit
    #[account(
        mut,
        seeds = [
            b"user_deposit", 
            user_wallet.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump,
    )]
    pub user_deposit: Option<Account<'info, UserDepositAccount>>,

    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub merchant_token_account: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(mut)]
    pub merchant_wallet: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool_state"],
        bump = pool_state.bump
    )]
    pub pool_state: Account<'info, PoolState>,

    // Merchant verification via merchant registry
    pub merchant_account: Account<'info, MerchantAccount>,
    pub merchant_registry_program: Program<'info, MerchantRegistry>,

    // Merchant loan account
    #[account(
        init_if_needed,
        payer = merchant_wallet,
        space = 8 + MerchantLoanAccount::SPACE,
        seeds = [
            b"merchant_loan", 
            merchant_wallet.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump
    )]
    pub merchant_loan: Account<'info, MerchantLoanAccount>,

    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub merchant_token_account: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RepayLoan<'info> {
    #[account(mut)]
    pub merchant_wallet: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool_state"],
        bump = pool_state.bump
    )]
    pub pool_state: Account<'info, PoolState>,

    #[account(
        mut,
        seeds = [
            b"merchant_loan", 
            merchant_wallet.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump,
        constraint = merchant_loan.merchant == merchant_wallet.key() @ ErrorCode::UnauthorizedAccess
    )]
    pub merchant_loan: Account<'info, MerchantLoanAccount>,

    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub merchant_token_account: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct GetInterestRate<'info> {
    #[account(
        seeds = [b"pool_state"],
        bump = pool_state.bump
    )]
    pub pool_state: Account<'info, PoolState>,
}

#[account]
pub struct PoolState {
    pub authority: Pubkey,
    pub total_deposited: u64,
    pub total_borrowed: u64,
    pub base_rate: u64,         // Base interest rate in basis points (1/100 of 1%)
    pub utilization_slope: u64, // Utilization rate multiplier in basis points
    pub protocol_fee_percent: u8, // Protocol fee percentage (0-100)
    pub bump: u8,
}

impl PoolState {
    pub const SPACE: usize = 32 + // authority
                           8 +  // total_deposited
                           8 +  // total_borrowed
                           8 +  // base_rate
                           8 +  // utilization_slope
                           1 +  // protocol_fee_percent
                           1; // bump
}

#[account]
pub struct UserDepositAccount {
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub deposited_amount: u64,
    pub interest_earned: u64,
    pub last_interest_calculation: i64,
    pub deposit_date: i64,
}

impl UserDepositAccount {
    pub const SPACE: usize = 32 + // user
                           32 + // token_mint
                           8 +  // deposited_amount
                           8 +  // interest_earned
                           8 +  // last_interest_calculation
                           8; // deposit_date
}

#[account]
pub struct MerchantLoanAccount {
    pub merchant: Pubkey,
    pub principal: u64,
    pub issue_date: i64,
    pub last_repayment_date: i64,
    pub status: LoanStatus,
}

impl MerchantLoanAccount {
    pub const SPACE: usize = 32 + // merchant
                           8 +  // principal
                           8 +  // issue_date
                           8 +  // last_repayment_date
                           1; // status (enum)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum LoanStatus {
    Active,
    Repaid,
    WrittenOff,
}

// Events
#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub total_deposited: u64,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub remaining_deposit: u64,
    pub timestamp: i64,
}

#[event]
pub struct PaymentEvent {
    pub user: Pubkey,
    pub merchant: Pubkey,
    pub token_mint: Pubkey,
    pub total_amount: u64,
    pub from_interest: u64,
    pub from_deposit: u64,
    pub from_wallet: u64,
    pub timestamp: i64,
}

#[event]
pub struct BorrowEvent {
    pub merchant: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub borrow_limit: u64,
    pub current_outstanding: u64,
    pub timestamp: i64,
}

#[event]
pub struct RepaymentEvent {
    pub merchant: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub to_interest: u64,
    pub to_principal: u64,
    pub remaining_principal: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Insufficient liquidity in pool")]
    InsufficientLiquidity,
    #[msg("Merchant is not verified")]
    MerchantNotVerified,
    #[msg("Merchant exceeds borrow limit")]
    ExceedsBorrowLimit,
    #[msg("Loan is not active")]
    LoanNotActive,
    #[msg("Invalid fee percentage")]
    InvalidFeePercentage,
}
