#!/usr/bin/env bun

/**
 * SecureBank AI Assistant Launcher
 * Run this script to start the comprehensive banking CLI application
 */

import { BankingCLI } from './examples/comprehensive-bank-cli';

console.log('🚀 Starting SecureBank AI Assistant...\n');

// Check for required environment variables
if (!process.env.GROQ_API_KEY) {
  console.error('❌ Error: GROQ_API_KEY environment variable is required');
  console.error('Please set your Groq API key:');
  console.error('export GROQ_API_KEY="your_api_key_here"');
  process.exit(1);
}

// Start the banking CLI
const cli = new BankingCLI();
cli.start().catch((error) => {
  console.error('❌ Failed to start banking CLI:', error);
  process.exit(1);
}); 