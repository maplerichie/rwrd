// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import * as anchor from "@coral-xyz/anchor";
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async function (provider: anchor.AnchorProvider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  // Add your deploy script here.

  // CONFIGURATION
  const WALLET_PATH = process.env.WALLET || '/path/to/your/production-wallet.json';
  const CLUSTER = process.env.CLUSTER || 'mainnet-beta'; // or 'devnet', 'testnet'
  const ANCHOR_DIR = path.join(__dirname, 'programs');
  const PROGRAMS = [
    'subscription-manager',
    'subscription-factory',
    'liquidity-pool',
    'merchant-registry'
  ];

  // Helper to run shell commands
  function run(cmd) {
    console.log(`\n$ ${cmd}`);
    return execSync(cmd, { stdio: 'inherit' });
  }

  // 1. Build all programs
  run('anchor build');

  // 2. Deploy each program and save program ID
  const deployedPrograms = {};
  for (const program of PROGRAMS) {
    const programDir = path.join(ANCHOR_DIR, program);
    const deployCmd = [
      'anchor deploy',
      `--provider.cluster ${CLUSTER}`,
      `--provider.wallet ${WALLET_PATH}`,
      `--program-name ${program}`
    ].join(' ');
    run(`cd ${programDir} && ${deployCmd}`);

    // Read program ID from target/idl or Anchor.toml
    const anchorToml = fs.readFileSync(path.join(programDir, 'Anchor.toml'), 'utf8');
    const idMatch = anchorToml.match(/program-id *= *"([^"]+)"/);
    if (idMatch) {
      deployedPrograms[program] = idMatch[1];
    }
  }

  // 3. Initialize manager state for subscription-manager (example)
  const subManagerId = deployedPrograms['subscription-manager'];
  if (subManagerId) {
    // Replace with your actual initialization logic and arguments
    run(`anchor run initialize-manager --provider.cluster ${CLUSTER} --provider.wallet ${WALLET_PATH}`);
  }

  // 4. Save deployed program IDs
  fs.writeFileSync(
    path.join(__dirname, 'deployed-programs.json'),
    JSON.stringify(deployedPrograms, null, 2)
  );

  console.log('\nDeployment complete. Program IDs:');
  console.log(deployedPrograms);
};
