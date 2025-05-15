# RWRD Protocol Smart Contracts

This repository contains the Solana smart contracts for the RWRD Protocol, a decentralized subscription and rewards platform.

## Project Structure

The RWRD Protocol consists of four main programs:

1. **Merchant Registry**: Central authority for merchant verification and management.
2. **Subscription Factory**: Creates and manages subscription programs.
3. **Subscription Manager**: Handles subscription creation, NFT minting, and redemption.
4. **Liquidity Pool**: Manages user deposits, payments from deposited funds, and merchant financing.

## Building the Project

To build the project, run:

```bash
anchor build
```

## Testing

The project includes comprehensive tests for each individual program as well as integration tests across all programs.

### Running All Tests

```bash
anchor test
```


## Deployment

The RWRD Protocol is designed to be deployed on the Solana blockchain. To deploy the programs, run:

```bash
anchor deploy
```

## Features

- **Merchant Verification**: Secure merchant registration and verification process.
- **Subscription Programs**: Create custom subscription programs with variable prices, durations, and redemption quotas.
- **User Deposits**: Allow users to deposit funds and earn interest on their deposits.
- **Payment Processing**: Process payments from user deposits or wallet with priority.
- **Merchant Financing**: Allow merchants to borrow funds based on a trust score.
- **Dynamic Interest Rates**: Interest rates dynamically adjust based on pool utilization.
- **NFT Subscriptions**: Represent subscriptions as NFTs for better composability. 