#!/usr/bin/env node

// Load environment variables from .env file
import 'dotenv/config';

import readline from 'readline';
import { Agent } from '../src/core/agent.js';
import { InMemoryConversationStorage } from './storage-implementations.js';
import type { ToolFunction } from '../src/types.js';

// ANSI color codes for better CLI experience
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Mock bank database
const mockDatabase = {
  users: new Map([
    ['12345', {
      accountNumber: '12345',
      name: 'John Doe',
      email: 'john.doe@email.com',
      balance: 2547.83,
      accountType: 'checking',
      cardNumber: '**** **** **** 1234',
      cardStatus: 'active',
      creditLimit: 5000,
      isVip: false,
    }],
    ['67890', {
      accountNumber: '67890',
      name: 'Jane Smith',
      email: 'jane.smith@email.com',
      balance: 15247.92,
      accountType: 'savings',
      cardNumber: '**** **** **** 5678',
      cardStatus: 'active',
      creditLimit: 10000,
      isVip: true,
    }],
  ]),
  
  transactions: new Map([
    ['12345', [
      { id: 'tx001', date: '2024-01-15', amount: -45.67, description: 'Coffee Shop', type: 'debit' },
      { id: 'tx002', date: '2024-01-14', amount: -120.00, description: 'Grocery Store', type: 'debit' },
      { id: 'tx003', date: '2024-01-13', amount: 2000.00, description: 'Salary Deposit', type: 'credit' },
      { id: 'tx004', date: '2024-01-12', amount: -89.99, description: 'Online Purchase', type: 'debit' },
    ]],                                                                                                              
    ['67890', [
      { id: 'tx005', date: '2024-01-15', amount: 5000.00, description: 'Investment Return', type: 'credit' },
      { id: 'tx006', date: '2024-01-14', amount: -1200.00, description: 'Rent Payment', type: 'debit' },
      { id: 'tx007', date: '2024-01-13', amount: -250.00, description: 'Utility Bill', type: 'debit' },
    ]],
  ]),

  supportTickets: [] as Array<{
    id: string;
    accountNumber: string;
    issue: string;
    status: 'open' | 'resolved';
    priority: 'low' | 'medium' | 'high';
    createdAt: string;
  }>,
};

// Bank tool implementations  
const bankToolImplementations: Record<string, ToolFunction> = {
  getAccountBalance: async ({ accountNumber }: { accountNumber: string }) => {
    const user = mockDatabase.users.get(accountNumber);
    if (!user) {
      return { error: 'Account not found', success: false };
    }
    
    return {
      success: true,
      accountNumber: user.accountNumber,
      balance: user.balance,
      accountType: user.accountType,
      lastUpdated: new Date().toISOString(),
    };
  },

  getTransactionHistory: async ({ accountNumber, limit = 5 }: { accountNumber: string; limit?: number }) => {
    const user = mockDatabase.users.get(accountNumber);
    if (!user) {
      return { error: 'Account not found', success: false };
    }

    const transactions = mockDatabase.transactions.get(accountNumber) || [];
    const recentTransactions = transactions.slice(0, limit);
    
    return {
      success: true,
      accountNumber,
      transactions: recentTransactions,
      totalTransactions: transactions.length,
    };
  },

  transferFunds: async ({ fromAccount, toAccount, amount, description = 'Transfer' }: { 
    fromAccount: string; 
    toAccount: string; 
    amount: number; 
    description?: string 
  }) => {
    const fromUser = mockDatabase.users.get(fromAccount);
    const toUser = mockDatabase.users.get(toAccount);
    
    if (!fromUser) {
      return { error: 'Source account not found', success: false };
    }
    
    if (!toUser) {
      return { error: 'Destination account not found', success: false };
    }
    
    if (fromUser.balance < amount) {
      return { error: 'Insufficient funds', success: false };
    }

    // Simulate transfer (in real app, this would be a database transaction)
    fromUser.balance -= amount;
    toUser.balance += amount;
    
    // Add transaction records
    const transferId = `tx${Date.now()}`;
    const fromTransactions = mockDatabase.transactions.get(fromAccount) || [];
    const toTransactions = mockDatabase.transactions.get(toAccount) || [];
    
    fromTransactions.unshift({
      id: transferId + '_out',
      date: new Date().toISOString().split('T')[0],
      amount: -amount,
      description: `Transfer to ${toAccount}: ${description}`,
      type: 'debit',
    });
    
    toTransactions.unshift({
      id: transferId + '_in',
      date: new Date().toISOString().split('T')[0],
      amount: amount,
      description: `Transfer from ${fromAccount}: ${description}`,
      type: 'credit',
    });
    
    return {
      success: true,
      transferId,
      fromAccount,
      toAccount,
      amount,
      newBalance: fromUser.balance,
      description,
    };
  },

  getCardInfo: async ({ accountNumber }: { accountNumber: string }) => {
    const user = mockDatabase.users.get(accountNumber);
    if (!user) {
      return { error: 'Account not found', success: false };
    }
    
    return {
      success: true,
      accountNumber,
      cardNumber: user.cardNumber,
      cardStatus: user.cardStatus,
      creditLimit: user.creditLimit,
    };
  },

  reportCardIssue: async ({ accountNumber, issueType, description }: { 
    accountNumber: string; 
    issueType: string; 
    description: string 
  }) => {
    const user = mockDatabase.users.get(accountNumber);
    if (!user) {
      return { error: 'Account not found', success: false };
    }
    
    const ticketId = `CARD${Date.now()}`;
    const ticket = {
      id: ticketId,
      accountNumber,
      issue: `Card Issue - ${issueType}: ${description}`,
      status: 'open' as const,
      priority: issueType === 'fraud' ? 'high' as const : 'medium' as const,
      createdAt: new Date().toISOString(),
    };
    
    mockDatabase.supportTickets.push(ticket);
    
    return {
      success: true,
      ticketId,
      issueType,
      description,
      priority: ticket.priority,
      estimatedResolution: ticket.priority === 'high' ? '1-2 hours' : '24-48 hours',
    };
  },

  createSupportTicket: async ({ accountNumber, issue, priority = 'medium' }: { 
    accountNumber: string; 
    issue: string; 
    priority?: string 
  }) => {
    const user = mockDatabase.users.get(accountNumber);
    if (!user) {
      return { error: 'Account not found', success: false };
    }
    
    const ticketId = `SUP${Date.now()}`;
    const ticket = {
      id: ticketId,
      accountNumber,
      issue,
      status: 'open' as const,
      priority: priority as 'low' | 'medium' | 'high',
      createdAt: new Date().toISOString(),
    };
    
    mockDatabase.supportTickets.push(ticket);
    
    return {
      success: true,
      ticketId,
      issue,
      priority,
      estimatedResolution: priority === 'high' ? '1-2 hours' : 
                         priority === 'medium' ? '24-48 hours' : '3-5 business days',
    };
  },

  validateAccount: async ({ accountNumber }: { accountNumber: string }) => {
    const user = mockDatabase.users.get(accountNumber);
    if (!user) {
      return { error: 'Account not found', success: false };
    }
    
    return {
      success: true,
      accountNumber,
      accountHolder: user.name,
      accountType: user.accountType,
      isVip: user.isVip,
      email: user.email,
    };
  },

  searchTransactions: async ({ accountNumber, query, limit = 10 }: { 
    accountNumber: string; 
    query: string; 
    limit?: number 
  }) => {
    const user = mockDatabase.users.get(accountNumber);
    if (!user) {
      return { error: 'Account not found', success: false };
    }

    const transactions = mockDatabase.transactions.get(accountNumber) || [];
    const searchResults = transactions.filter(tx => 
      tx.description.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit);
    
    return {
      success: true,
      accountNumber,
      query,
      results: searchResults,
      totalFound: searchResults.length,
    };
  },
};

// Create the bank customer service agent
function createBankAgent() {
  const storage = new InMemoryConversationStorage();
  
  const agent = new Agent({
    states: [
      {
        key: 'banking',
        description: 'Main banking assistance',
        prompt: `You are SecureBank's AI customer service assistant. You are helpful, professional, and security-conscious.

Key guidelines:
- Always verify the customer's account number before performing sensitive operations
- Be empathetic and understanding with customer concerns
- Explain banking processes clearly and avoid jargon
- For complex issues, offer to create support tickets
- Maintain customer privacy and security at all times`,
        children: [
          {
            key: 'account_services',
            description: 'Account balance, statements, and account information',
            prompt: `Focus on helping customers with account-related inquiries:
- Check account balances
- View transaction history
- Account information and details
- Statement requests

Always ask for account number if not provided. Be precise with financial information.`,
            tools: ['getAccountBalance', 'getTransactionHistory', 'validateAccount', 'searchTransactions'],
            onEnter: async ({ metadata }) => {
              // Require account validation for sensitive account operations
              if (!metadata?.accountValidated) {
                return {
                  allowed: false,
                  reason: 'Account verification required',
                  customMessage: 'For your security, I need to verify your account number before accessing account information. Please provide your account number.',
                };
              }
              return { allowed: true };
            },
          },
          {
            key: 'transfers_payments',
            description: 'Money transfers, payments, and transaction services',
            prompt: `Help customers with transfer and payment services:
- Transfer money between accounts
- Payment processing
- Transaction assistance
- Payment troubleshooting

Verify all transfer details carefully and confirm amounts before processing.`,
            tools: ['transferFunds', 'getTransactionHistory', 'validateAccount'],
            onEnter: async ({ metadata }) => {
              if (!metadata?.accountValidated) {
                return {
                  allowed: false,
                  reason: 'Account verification required for financial transactions',
                  customMessage: 'For security reasons, I need to verify your account before processing any transfers or payments. Please provide your account number.',
                };
              }
              return { allowed: true };
            },
          },
          {
            key: 'card_services',
            description: 'Credit/debit card support, activation, and issues',
            prompt: `Assist customers with card-related services:
- Card activation and deactivation
- Report lost or stolen cards
- Card information and limits
- Fraud reporting and disputes

Take card security issues very seriously and escalate fraud reports immediately.`,
            tools: ['getCardInfo', 'reportCardIssue', 'validateAccount'],
          },
          {
            key: 'general_support',
            description: 'General banking questions and support ticket creation',
            prompt: `Provide general banking support and assistance:
- Answer general banking questions
- Help with account setup information
- Create support tickets for complex issues
- Provide branch and contact information

Be helpful and informative while directing customers to appropriate specialized services when needed.`,
            tools: ['createSupportTicket', 'validateAccount'],
          }
        ]
      }
    ],
    contexts: [
      {
        key: 'bank_policies',
        description: 'Standard bank policies and procedures',
        content: `SecureBank Policies:
- Business hours: Monday-Friday 9 AM - 6 PM, Saturday 9 AM - 2 PM
- Customer service: 24/7 phone support at 1-800-SECURE-1
- Online banking: Available 24/7 at securebank.com
- ATM locations: 500+ locations nationwide
- Transfer limits: $5,000 daily for online transfers, $10,000 for VIP customers
- Card replacement: 3-5 business days for standard, 1-2 days for expedited
- Fraud protection: 24/7 monitoring, zero liability for unauthorized transactions`,
        priority: 5,
      },
      {
        key: 'security_guidelines',
        description: 'Security and privacy guidelines',
        content: `Security Protocols:
- Never share account passwords or PINs
- Always verify customer identity before sensitive operations
- Monitor for suspicious activity
- Report fraud immediately
- Use secure channels for sensitive information
- Account numbers should be verified for financial operations`,
        priority: 10,
      }
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'getAccountBalance',
          description: 'Get current account balance and account information',
          parameters: {
            type: 'object',
            properties: {
              accountNumber: { 
                type: 'string', 
                description: 'Customer account number' 
              }
            },
            required: ['accountNumber']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'getTransactionHistory',
          description: 'Get recent transaction history for an account',
          parameters: {
            type: 'object',
            properties: {
              accountNumber: { 
                type: 'string', 
                description: 'Customer account number' 
              },
              limit: { 
                type: 'number', 
                description: 'Number of transactions to retrieve (default: 5)' 
              }
            },
            required: ['accountNumber']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'transferFunds',
          description: 'Transfer money between accounts',
          parameters: {
            type: 'object',
            properties: {
              fromAccount: { 
                type: 'string', 
                description: 'Source account number' 
              },
              toAccount: { 
                type: 'string', 
                description: 'Destination account number' 
              },
              amount: { 
                type: 'number', 
                description: 'Amount to transfer' 
              },
              description: { 
                type: 'string', 
                description: 'Transfer description (optional)' 
              }
            },
            required: ['fromAccount', 'toAccount', 'amount']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'getCardInfo',
          description: 'Get credit/debit card information and status',
          parameters: {
            type: 'object',
            properties: {
              accountNumber: { 
                type: 'string', 
                description: 'Customer account number' 
              }
            },
            required: ['accountNumber']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'reportCardIssue',
          description: 'Report a card-related issue or fraud',
          parameters: {
            type: 'object',
            properties: {
              accountNumber: { 
                type: 'string', 
                description: 'Customer account number' 
              },
              issueType: { 
                type: 'string', 
                description: 'Type of issue (lost, stolen, fraud, damaged, etc.)' 
              },
              description: { 
                type: 'string', 
                description: 'Detailed description of the issue' 
              }
            },
            required: ['accountNumber', 'issueType', 'description']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'createSupportTicket',
          description: 'Create a support ticket for complex issues',
          parameters: {
            type: 'object',
            properties: {
              accountNumber: { 
                type: 'string', 
                description: 'Customer account number' 
              },
              issue: { 
                type: 'string', 
                description: 'Description of the issue' 
              },
              priority: { 
                type: 'string', 
                description: 'Priority level (low, medium, high)' 
              }
            },
            required: ['accountNumber', 'issue']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'validateAccount',
          description: 'Validate and get basic account information',
          parameters: {
            type: 'object',
            properties: {
              accountNumber: { 
                type: 'string', 
                description: 'Customer account number to validate' 
              }
            },
            required: ['accountNumber']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'searchTransactions',
          description: 'Search transaction history by description or merchant',
          parameters: {
            type: 'object',
            properties: {
              accountNumber: { 
                type: 'string', 
                description: 'Customer account number' 
              },
              query: { 
                type: 'string', 
                description: 'Search term to find in transaction descriptions' 
              },
              limit: { 
                type: 'number', 
                description: 'Maximum number of results (default: 10)' 
              }
            },
            required: ['accountNumber', 'query']
          }
        }
      }
    ],
    defaultLLMConfig: {
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      apiKey: process.env.GROQ_API_KEY!,
      temperature: 0.1, // Lower temperature for more consistent banking responses
    },
    conversationConfig: {
      storage,
      maxWorkingMemoryMessages: 20,
      enableSummarization: true,
      maxContextTokens: 6000,
      defaultRelevanceStrategy: 'hybrid',
      enableEmbeddings: false, // In-memory storage doesn't support embeddings
    }
  });

  // Register all bank tool implementations
  agent.registerTools(bankToolImplementations);

  return agent;
}

// CLI interface
class BankCLIApp {
  private agent: Agent;
  private rl: readline.Interface;
  private sessionId: string;
  private currentUser: string | null = null;
  private accountValidated = false;

  constructor() {
    this.agent = createBankAgent();
    this.sessionId = `cli_${Date.now()}`;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private colorize(text: string, color: keyof typeof colors): string {
    return `${colors[color]}${text}${colors.reset}`;
  }

  private async displayWelcome(): Promise<void> {
    console.clear();
    console.log(this.colorize('=' .repeat(60), 'cyan'));
    console.log(this.colorize('🏦 SecureBank AI Customer Service Demo', 'bright'));
    console.log(this.colorize('   Powered by Agento Framework + Groq', 'blue'));
    console.log(this.colorize('=' .repeat(60), 'cyan'));
    console.log();
    console.log(this.colorize('Available Demo Accounts:', 'yellow'));
    console.log('  • Account: 12345 (John Doe) - Checking Account');
    console.log('  • Account: 67890 (Jane Smith) - Savings Account, VIP');
    console.log();
    console.log(this.colorize('Features to try:', 'green'));
    console.log('  • Check account balance');
    console.log('  • View transaction history');
    console.log('  • Transfer funds between accounts');
    console.log('  • Report card issues');
    console.log('  • Create support tickets');
    console.log('  • Search transactions');
    console.log();
    console.log(this.colorize('Commands:', 'magenta'));
    console.log('  • Type "help" for assistance');
    console.log('  • Type "exit" to quit');
    console.log('  • Type "clear" to clear screen');
    console.log('  • Type "session" to see session info');
    console.log();
    console.log(this.colorize('AI Agent Status:', 'blue'));
    console.log(`  • Conversation persistence: ${this.agent.isPersistenceEnabled() ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`  • Session ID: ${this.sessionId}`);
    console.log('  • LLM Provider: Groq (Mixtral-8x7B)');
    console.log();
  }

  private async handleSpecialCommands(input: string): Promise<boolean> {
    const command = input.toLowerCase().trim();
    
    switch (command) {
      case 'exit':
      case 'quit':
        console.log(this.colorize('\n👋 Thank you for using SecureBank! Goodbye!\n', 'green'));
        process.exit(0);
        
      case 'clear':
        console.clear();
        await this.displayWelcome();
        return true;
        
      case 'help':
        console.log(this.colorize('\n🆘 Help Information:', 'yellow'));
        console.log('This is a demo of an AI banking assistant. Try asking:');
        console.log('  • "What is my account balance?"');
        console.log('  • "Show me my recent transactions"');
        console.log('  • "I want to transfer $100 to account 67890"');
        console.log('  • "My card was stolen"');
        console.log('  • "I need help with online banking"');
        console.log();
        return true;
        
      case 'session':
        const history = await this.agent.getConversationHistory(this.sessionId);
        console.log(this.colorize('\n📊 Session Information:', 'blue'));
        console.log(`  • Session ID: ${this.sessionId}`);
        console.log(`  • Messages in history: ${history.messages.length}`);
        console.log(`  • Account validated: ${this.accountValidated ? '✅ Yes' : '❌ No'}`);
        console.log(`  • Current user: ${this.currentUser || 'Not identified'}`);
        if (history.summary) {
          console.log(`  • Conversation summary: ${history.summary}`);
        }
        console.log();
        return true;
        
      default:
        return false;
    }
  }

  private detectAccountNumber(input: string): string | null {
    // Simple regex to detect 5-digit account numbers
    const accountMatch = input.match(/\b(\d{5})\b/);
    return accountMatch ? accountMatch[1] : null;
  }

  private async processUserInput(input: string): Promise<void> {
    try {
      console.log(this.colorize('\n🤖 AI Assistant is thinking...', 'yellow'));
      
      // Build metadata
      const metadata: Record<string, any> = {
        timestamp: new Date().toISOString(),
        channel: 'cli',
        accountValidated: this.accountValidated,
      };

      if (this.currentUser) {
        metadata.currentUser = this.currentUser;
      }

      // Detect account numbers in input for validation
      const accountNumber = this.detectAccountNumber(input);
      if (accountNumber && !this.accountValidated) {
        // Try to validate the account
        const validation = await bankToolImplementations.validateAccount({ accountNumber });
        if (validation && validation.success) {
          this.accountValidated = true;
          this.currentUser = validation.accountHolder;
          metadata.accountValidated = true;
          metadata.currentUser = this.currentUser;
          console.log(this.colorize(`✅ Account verified for ${this.currentUser}`, 'green'));
        }
      }

      // Process with the agent
      const response = await this.agent.processQuery(input, this.sessionId, [], metadata);
      
      // Display response with formatting
      console.log(this.colorize('\n💬 SecureBank Assistant:', 'cyan'));
      console.log(response.response);
      
      // Show additional info in debug mode
      if (process.env.DEBUG) {
        console.log(this.colorize(`\n🔍 Debug Info:`, 'magenta'));
        console.log(`  • Selected state: ${response.selectedState.key}`);
        console.log(`  • Confidence: ${response.confidence}`);
        console.log(`  • Tool results: ${response.toolResults.length}`);
        if (response.toolResults.length > 0) {
          response.toolResults.forEach((result, i) => {
            console.log(`    ${i + 1}. ${result.toolName}: ${result.success ? '✅' : '❌'}`);
          });
        }
      }
      
    } catch (error) {
      console.error(this.colorize('\n❌ Error:', 'red'), error instanceof Error ? error.message : error);
      console.log(this.colorize('Please try again or type "help" for assistance.', 'yellow'));
    }
  }

  private promptUser(): Promise<string> {
    const prompt = this.accountValidated 
      ? this.colorize(`\n💬 ${this.currentUser} > `, 'green')
      : this.colorize('\n💬 Customer > ', 'blue');
      
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  async start(): Promise<void> {
    // Check for Groq API key
    if (!process.env.GROQ_API_KEY) {
      console.error(this.colorize('❌ Error: GROQ_API_KEY environment variable not set!', 'red'));
      console.log('Please set your Groq API key:');
      console.log('export GROQ_API_KEY="your-api-key-here"');
      process.exit(1);
    }

    await this.displayWelcome();
    
    console.log(this.colorize('🎯 Welcome to SecureBank! How can I assist you today?', 'bright'));
    
    while (true) {
      try {
        const userInput = await this.promptUser();
        
        if (!userInput.trim()) continue;
        
        // Handle special commands
        const isSpecialCommand = await this.handleSpecialCommands(userInput);
        if (isSpecialCommand) continue;
        
        // Process regular banking queries
        await this.processUserInput(userInput);
        
      } catch (error) {
        console.error(this.colorize('\n❌ Unexpected error:', 'red'), error);
        console.log(this.colorize('Type "exit" to quit or continue chatting.', 'yellow'));
      }
    }
  }

  cleanup(): void {
    this.rl.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye! Thank you for using SecureBank.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Goodbye! Thank you for using SecureBank.');
  process.exit(0);
});

// Run the application
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = new BankCLIApp();
  app.start().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}

export { BankCLIApp, createBankAgent, bankTools }; 