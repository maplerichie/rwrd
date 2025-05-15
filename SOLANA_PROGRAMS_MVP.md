# RWRD Protocol: Smart Contract Specifications (MVP)

Chain: Solana
Framework: Anchor 0.31.1

## Core Programs

### 1. Merchant Registry Program

**Purpose:** Central authority for merchant verification and management.

**Account Structure:**
- **Registry State Account (PDA):** Stores protocol authority, governance, and fee.
- **Merchant Accounts (PDA, derived from merchant wallet):** Stores merchant information.

**Key Functions:**
- `register_merchant(merchant_wallet, merchant_info)`: Registers a new merchant.
- `get_merchant_data(merchant_id)`: Retrieves merchant information.

**Access Control:**
- Public read access to verified merchant data.

### 2. SubscriptionFactory Program

**Purpose:** Creates and manages subscription programs.

**Account Structure:**
- **Factory State Account (PDA):** Stores factory parameters.
- **Subscription Program Accounts (PDA, derived from merchant + program name):** Stores subscription program parameters.

**Key Functions:**
- `create_subscription_program(merchant_wallet, program_params)`: Creates a new subscription program and registers it with Merchant Registry.
- `close_subscription_program(program_id)`: Permanently closes a program.
- `get_subscription_program_details(program_id)`: Retrieves program details.

**Program Parameters:**
- Subscription price.
- Duration (days).
- Redemption quota.
- Merchant wallet.

### 3. SubscriptionManager Program

**Purpose:** Handles subscription creation, NFT minting, and redemption in a unified workflow.

**Account Structure:**
- **Manager State Account (PDA):** Stores manager parameters.
- **Subscription Accounts (PDA, derived from user + program):** Stores subscription metadata.
- **NFT Mint Accounts:** The actual NFT tokens representing subscriptions.

**Key Functions:**
- `subscribe(user_wallet, program_id)`: Creates subscription, processes payment to liquidity pool and mints NFT to subscriber in a single transaction.
- `redeem(subscription_id, redemption_amount, merchant_signature)`: Processes a redemption and updates metadata.

**Subscription Metadata:**
- Remaining quota.
- Expiry timestamp.
- Last redeemed timestamp.
- Program ID reference.

### 4. LiquidityPool Program

**Purpose:** Manages user deposits, payments from deposited funds, and merchant financing.

**Account Structure:**
- **Pool State Account (PDA):** Stores pool parameters.
- **User Deposit Accounts (PDA, derived from user wallet):** Tracks user deposit and earned interest.
- **Merchant Loan Accounts (PDA):** Tracks merchant loans and interest accrual.

**Key Functions:**
- `deposit(user_wallet, amount, token_mint)`:  User deposit funds into the pool.
- `withdraw(user_wallet, amount, token_mint)`: Withdraws deposited funds instantly.
- `pay_via_pool(user_wallet, merchant_wallet, amount)`: Processes payment using deposits funds with priority Interest > Deposit > Wallet.
- `calculate_earned(user_wallet)`: Calculates interest earned by a user.
- `withdraw_earned(user_wallet, amount)`: Allows users to withdraw earned interest.
- `borrow(merchant_id, amount)`: Processes merchant financing via (trust score, borrow limit).
- `repay_loan(merchant_id, amount)`: Processes loan repayments.
- `get_deposit_apr()`: Get deposit APR based on dynamic calculation (eg: utilization).
- `get_borrow_apr()`: Get borrow APR based on dynamic calculation (eg: utilization).

**Trust Score Calculation:**
- Total revenue analysis.
- Loan repayment history.
- Borrow limit compliance.

## Account Structure Details

> **Best Practice:** Only store minimal, necessary state on-chain. Do not store growing lists, analytics, or history. Use events and off-chain indexers for all history and analytics.

### Registry State Account (PDA)
```rust
{
  authority: Pubkey,
  governance: Pubkey, // DAO/multisig
  fee: u8,
}
```

### Subscription Program Account (PDA)
```rust
{
  merchant: Pubkey,
  program_name: String,
  subscription_price: u64,
  duration_days: u16,
  redemption_quota: u16,
  is_active: bool,
  created_at: i64,
  updated_at: i64
}
```

### Subscription Account (PDA)
```rust
{
  user: Pubkey,
  program_id: Pubkey,
  token_mint: Pubkey,
  remaining_quota: u16,
  expiry_timestamp: i64,
  created_at: i64,
  last_redeemed_at: i64
}
```

### User Deposit Account (PDA)
```rust
{
  user: Pubkey,
  token_mint: Pubkey,
  deposited_amount: u64,
  interest_earned: u64,
  last_interest_calculation: i64,
  deposit_date: i64
}
```

### Merchant Loan Account (PDA)
```rust
{
  merchant: Pubkey,
  principal: u64,         // original borrowed amount
  issue_date: i64,
  last_repayment_date: i64,
  status: LoanStatus      // Active, Repaid, WrittenOff
}
```
- **Outstanding amount, interest accrued, and borrow limit are calculated on-the-fly from the above state and protocol parameters.**
- **Loans are uncollateralized, have no time limit, and cannot be liquidated. If a merchant never repays, the protocol may write off the loan as a business/accounting action.**
```

## Optimized Workflows

### Merchant Registration Flow (Single Transaction)
```
User Transaction:
  → Merchant Registry.register_merchant(merchant_wallet, merchant_info)
```

### Subscription Program Creation Flow (Single Transaction)
```
User Transaction:
  → SubscriptionFactory.create_subscription_program(merchant_wallet, program_params)
    → Create Subscription Program Account
    → [CPI] Merchant Registry.register_program(program_id, merchant_id)
```

### User Subscription Flow (Single Transaction)
```
User Transaction:
  → SubscriptionManager.create_subscription(user_wallet, program_id)
    → [CPI] SubscriptionFactory.get_subscription_program_details(program_id)
    → Process payment and transfer to Liquidity Pool
    → Mint NFT to user wallet (Metaplex CPI)
    → Create Subscription Account with metadata
```

### Depositing Flow (Single Transaction)
```
User Transaction:
  → LiquidityPool.deposit_funds(user_wallet, amount, token_mint)
    → Transfer to Liquidity Pool (Token Program CPI)
    → Create/Update User Deposit Account
    → Record desposit timestamp for interest calculation
```

### Payment from Deposit Flow (Single Transaction)
```
User Transaction:
  → LiquidityPool.pay_via_pool(user_wallet, merchant_wallet, amount)
    → Calculate and update interest earned
    → Determine payment source (Interest > Deposit > Wallet) based on available balances
    → Transfer payment to merchant (Token Program CPI)
    → Update User Deposit Account
```

### Redemption Flow (Single Transaction)
```
User Transaction:
  → SubscriptionManager.redeem(subscription_id, redemption_amount, merchant_signature)
    → Verify merchant signature
    → Verify subscription validity
    → Update subscription metadata
    → Update NFT metadata (Metaplex CPI)
```

### Merchant Financing Flow (Single Transaction)
```
Merchant Transaction:
  → LiquidityPool.borrow(merchant_id, amount)
    → Calculate trust score based on revenue and repayment history
    → Determine loan criteria and borrow limit (enforce amount <= borrow_limit)
    → Transfer funds to merchant wallet (Token Program CPI)
    → Create Loan Account with interest parameters
```

## Dynamic APRs (DeFi Best Practice)
- **Borrow APR** and **Deposit APR** are dynamic and based on pool utilization (not fixed).
- **Pool Utilization** = Total Borrowed / Total Supplied
- As utilization increases, borrow APR increases (to incentivize more depositing and discourage excessive borrowing).
- Deposit APR is derived from borrow APR and protocol fee.
- **Example formulas:**
    - `borrow_apr = base_rate + utilization * slope`
    - `deposit_apr = (borrow_apr * utilization) * (1 - protocol_fee_percent)`
- These rates are recalculated on-the-fly in contract logic and exposed via get_deposit_apr() and get_borrow_apr().

## Borrow Limit Enforcement
- **Borrow Limit** is calculated for each merchant as a function of trust score and merchant revenue (and protocol parameters).
- **Example formula:**
    - `borrow_limit = trust_score_percent * merchant_revenue`
    - Where `trust_score_percent` is determined by trust score (e.g., 10% for score 1, 30% for score 3, 50% for score 5).
- The borrow instruction must check `total_borrowed + amount <= borrow_limit` and reject if exceeded.


## Cross-Program Invocation (CPI) Relationships

- **SubscriptionFactory → Merchant Registry:** For merchant verification and program registration.
- **SubscriptionManager → SubscriptionFactory:** For program details and validity.
- **LiquidityPool → Merchant Registry:** For merchant verification and trust score.
- **All Programs → Token Program:** For token transfers.
- **ALL Programs → Metaplex Programs:** For NFT operation, minting and metadata.

## Events

Emit events for:
- Deposit/withdraw
- Subscription creation/closed
- Redemption
- Borrow/repayment


## Key Design Principles (DeFi Best Practice)
- **NFT Receipt Tokens:** Depositing, borrowing and subscribing positions are represented by NFTs (receipt/position NFTs), enabling composability and secondary market trading.
- **Dynamic Interest Rates:** Deposit and borrow APR/APY are calculated dynamically based on pool utilization and protocol parameters, following established DeFi standards (Aave, Compound, Solend, etc.).