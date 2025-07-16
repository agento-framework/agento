#!/usr/bin/env bun

/**
 * Banking CLI Demo Script
 * Demonstrates the comprehensive banking agent capabilities
 */

import { Agent } from '../src/core/agent';
import type { StateConfig, Context, Tool } from '../src/types';
import { InMemoryConversationStorage } from './storage-implementations';
import chalk from 'chalk';
import * as figlet from 'figlet';

// Import banking configuration from the main CLI
import { BankingDatabase } from './comprehensive-bank-cli';

// Simplified banking contexts for demo
const bankingContexts: Context[] = [
  {
    key: "banking_expert",
    description: "Expert knowledge about banking operations",
    content: `You are a professional banking expert. You can help with account management, transactions, and financial analysis.`,
    priority: 100,
  }
];

// Simplified banking states for demo
const bankingStates: StateConfig[] = [
  {
    key: "banking_hub",
    description: "Main banking operations center",
    prompt: "You are SecureBank AI Assistant. I provide comprehensive banking services with the highest security standards.",
    contexts: ["banking_expert"],
    children: [
      {
        key: "account_services",
        description: "Account management services",
        prompt: "I'll help you with account-related services.",
        tools: ["verify_account", "get_account_balance", "get_account_details"]
      },
      {
        key: "transaction_services", 
        description: "Transaction processing",
        prompt: "I'll help you with transactions and transfers.",
        tools: ["get_transaction_history", "transfer_funds", "search_transactions"]
      },
      {
        key: "reporting_services",
        description: "Financial reports and statements", 
        prompt: "I can generate comprehensive financial reports and statements.",
        tools: ["generate_statement", "analyze_spending", "write_file", "write_json"]
      }
    ]
  }
];

// Demo tool implementations (simplified versions)
const demoToolImplementations = {
  verify_account: async ({ accountNumber }: any) => {
    const db = BankingDatabase.getInstance();
    const account = db.getAccount(accountNumber);
    
    if (!account) {
      return { success: false, error: "Account not found" };
    }

    return {
      success: true,
      data: {
        accountNumber: `****${accountNumber.slice(-4)}`,
        accountType: account.accountType,
        customerName: account.customerName,
        status: account.status,
        verified: true
      }
    };
  },

  get_account_balance: async ({ accountNumber }: any) => {
    const db = BankingDatabase.getInstance();
    const account = db.getAccount(accountNumber);
    
    if (!account) {
      return { success: false, error: "Account not found" };
    }

    return {
      success: true,
      data: {
        accountNumber: `****${accountNumber.slice(-4)}`,
        balance: account.balance,
        accountType: account.accountType,
        status: account.status
      }
    };
  },

  get_account_details: async ({ accountNumber }: any) => {
    const db = BankingDatabase.getInstance();
    const account = db.getAccount(accountNumber);
    
    if (!account) {
      return { success: false, error: "Account not found" };
    }

    return {
      success: true,
      data: {
        accountNumber: `****${accountNumber.slice(-4)}`,
        accountType: account.accountType,
        balance: account.balance,
        customerName: account.customerName,
        status: account.status,
        openDate: account.openDate
      }
    };
  },

  get_transaction_history: async ({ accountNumber, limit = 5 }: any) => {
    const db = BankingDatabase.getInstance();
    const account = db.getAccount(accountNumber);
    
    if (!account) {
      return { success: false, error: "Account not found" };
    }

    const transactions = db.getTransactions(accountNumber, limit);

    return {
      success: true,
      data: {
        accountNumber: `****${accountNumber.slice(-4)}`,
        transactions: transactions.slice(-limit),
        totalCount: transactions.length
      }
    };
  },

  transfer_funds: async ({ fromAccount, toAccount, amount }: any) => {
    const db = BankingDatabase.getInstance();
    const sourceAccount = db.getAccount(fromAccount);
    const destAccount = db.getAccount(toAccount);
    
    if (!sourceAccount || !destAccount) {
      return { success: false, error: "Account not found" };
    }

    if (sourceAccount.balance < amount) {
      return { success: false, error: "Insufficient funds" };
    }

    return {
      success: true,
      data: {
        transactionId: `TXN${Date.now()}`,
        fromAccount: `****${fromAccount.slice(-4)}`,
        toAccount: `****${toAccount.slice(-4)}`,
        amount,
        newSourceBalance: sourceAccount.balance - amount,
        timestamp: new Date()
      }
    };
  },

  generate_statement: async ({ accountNumber, startDate, endDate }: any) => {
    const db = BankingDatabase.getInstance();
    const account = db.getAccount(accountNumber);
    
    if (!account) {
      return { success: false, error: "Account not found" };
    }

    const transactions = db.getTransactions(accountNumber);
    
    return {
      success: true,
      data: {
        accountNumber: `****${accountNumber.slice(-4)}`,
        customerName: account.customerName,
        statementPeriod: { startDate, endDate },
        currentBalance: account.balance,
        transactionCount: transactions.length,
        generatedAt: new Date().toISOString()
      }
    };
  },

  analyze_spending: async ({ accountNumber, period }: any) => {
    const db = BankingDatabase.getInstance();
    const account = db.getAccount(accountNumber);
    
    if (!account) {
      return { success: false, error: "Account not found" };
    }

    const transactions = db.getTransactions(accountNumber);
    const expenses = transactions.filter(tx => tx.amount < 0);
    
    return {
      success: true,
      data: {
        period,
        totalSpent: expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
        transactionCount: expenses.length,
        averageTransaction: expenses.length > 0 ? 
          expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / expenses.length : 0,
        categories: {
          "Food & Beverage": expenses.filter(tx => tx.merchantInfo?.category === "Food & Beverage").length,
          "ATM": expenses.filter(tx => tx.merchantInfo?.category === "ATM").length,
          "Other": expenses.filter(tx => !tx.merchantInfo?.category).length
        }
      }
    };
  }
};

class BankingDemo {
  private agent!: Agent;

  constructor() {
    this.initializeAgent();
  }

  private initializeAgent() {
    const conversationStorage = new InMemoryConversationStorage();

    this.agent = new Agent({
      states: bankingStates,
      contexts: bankingContexts,
      tools: [], // Banking tools are automatically included
      defaultLLMConfig: {
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        apiKey: process.env.GROQ_API_KEY || 'demo-key',
        temperature: 0.2,
      },
      conversationConfig: {
        storage: conversationStorage,
        maxWorkingMemoryMessages: 15,
        enableSummarization: true,
        maxContextTokens: 6000,
        defaultRelevanceStrategy: 'hybrid',
        enableEmbeddings: false,
      }
    });

    // Register demo tool implementations
    this.agent.registerTools(demoToolImplementations);
  }

  private displayHeader() {
    console.clear();
    console.log(chalk.blue(figlet.textSync('SecureBank AI', { 
      font: 'Standard',
      horizontalLayout: 'fitted' 
    })));
    
    console.log(chalk.cyan('═'.repeat(80)));
    console.log(chalk.white('🏦 Banking Agent Demo - Showcasing Agento Framework Capabilities'));
    console.log(chalk.gray('Comprehensive banking system with document tools, temporal operations, and AI assistance\n'));
  }

  private async runDemo() {
    this.displayHeader();

    const demos = [
      {
        title: "Account Balance Inquiry",
        query: "Check the balance for account ACC001",
        description: "Demonstrating account verification and balance retrieval"
      },
      {
        title: "Account Details Lookup", 
        query: "Show me detailed information for account ACC002",
        description: "Comprehensive account information with security masking"
      },
      {
        title: "Transaction History",
        query: "Show me the recent transaction history for account ACC001",
        description: "Transaction retrieval with proper formatting"
      },
      {
        title: "Fund Transfer",
        query: "Transfer $100 from account ACC001 to account ACC002",
        description: "Secure fund transfer with balance validation"
      },
      {
        title: "Spending Analysis",
        query: "Analyze the spending patterns for account ACC001 this month",
        description: "AI-powered financial analysis and categorization"
      },
      {
        title: "Statement Generation", 
        query: "Generate a monthly statement for account ACC001 from 2024-01-01 to 2024-01-31",
        description: "Professional statement generation with document tools"
      },
      {
        title: "Document Export",
        query: "Create a JSON file with the account summary for ACC001 and save it as account-summary.json",
        description: "Document generation and file operations"
      }
    ];

    for (let i = 0; i < demos.length; i++) {
      const demo = demos[i];
      
      console.log(chalk.yellow(`\n📋 Demo ${i + 1}/${demos.length}: ${demo.title}`));
      console.log(chalk.gray(`   ${demo.description}\n`));
      
      console.log(chalk.cyan('User Query:'), chalk.white(`"${demo.query}"`));
      
      try {
        console.log(chalk.blue('\n🤖 Processing request...\n'));
        
        const startTime = Date.now();
        const response = await this.agent.processQuery(
          'demo-user',
          demo.query,
          `demo-session-${i}`,
          [],
          { demo: true, step: i + 1 }
        );
        
        const processingTime = Date.now() - startTime;
        
        console.log(chalk.green('✅ Response:'));
        console.log(chalk.white(this.formatResponse(response.response)));
        
        console.log(chalk.gray(`\n📊 Metadata:`));
        console.log(chalk.gray(`   State: ${response.selectedState.key}`));
        console.log(chalk.gray(`   Confidence: ${response.confidence}%`));
        console.log(chalk.gray(`   Tools Used: ${response.toolResults.length > 0 ? response.toolResults.map(t => t.toolName).join(', ') : 'None'}`));
        console.log(chalk.gray(`   Processing Time: ${processingTime}ms`));
        
        if (response.toolResults.length > 0) {
          console.log(chalk.gray(`\n🔧 Tool Results:`));
          response.toolResults.forEach((result) => {
            const status = result.success ? chalk.green('✓') : chalk.red('✗');
            console.log(chalk.gray(`   ${status} ${result.toolName}: ${result.success ? 'Success' : result.error}`));
          });
        }
        
      } catch (error) {
        console.log(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      }
      
      console.log(chalk.cyan('═'.repeat(80)));
      
      // Brief pause between demos
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(chalk.green('\n🎉 Demo Complete!'));
    console.log(chalk.white('The SecureBank AI Assistant showcases:'));
    console.log(chalk.white('  ✓ Intelligent state management and routing'));
    console.log(chalk.white('  ✓ Secure banking operations with proper validation'));
    console.log(chalk.white('  ✓ Document tools integration for report generation'));
    console.log(chalk.white('  ✓ Temporal tools for date/time operations'));
    console.log(chalk.white('  ✓ Context-aware AI responses'));
    console.log(chalk.white('  ✓ Comprehensive error handling'));
    console.log(chalk.white('  ✓ Professional banking compliance features\n'));
    
    console.log(chalk.yellow('🚀 To run the interactive CLI:'));
    console.log(chalk.gray('   bun run run-bank-cli.ts\n'));
  }

  private formatResponse(response: string): string {
    return response
      .replace(/\*\*(.*?)\*\*/g, chalk.bold('$1'))
      .replace(/\*(.*?)\*/g, chalk.italic('$1'))
      .replace(/Account\s+[A-Z]{3}\d{3}/g, (match) => chalk.green(match))
      .replace(/\$[\d,]+\.?\d*/g, (match) => chalk.yellow(match))
      .replace(/\b(SUCCESS|COMPLETED|VERIFIED)\b/gi, (match) => chalk.green(match))
      .replace(/\b(ERROR|FAILED|DENIED)\b/gi, (match) => chalk.red(match));
  }

  async start() {
    await this.runDemo();
  }
}

// Main execution
if (require.main === module) {
  const demo = new BankingDemo();
  demo.start().catch(console.error);
}

export { BankingDemo }; 