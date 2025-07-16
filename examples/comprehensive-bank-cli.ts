#!/usr/bin/env bun

import { Agent } from '../src/core/agent';
import type { StateConfig, Context, Tool } from '../src/types';
import { InMemoryConversationStorage } from './storage-implementations';
import chalk from 'chalk';
import { createInterface } from 'readline';
import * as figlet from 'figlet';

/**
 * Comprehensive Banking Agent CLI Application
 * A complete banking system showcasing Agento's capabilities with document tools
 */

interface BankAccount {
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'business' | 'credit';
  balance: number;
  customerName: string;
  customerId: string;
  openDate: Date;
  status: 'active' | 'frozen' | 'closed';
  interestRate?: number;
  creditLimit?: number;
  minimumBalance?: number;
}

interface Transaction {
  transactionId: string;
  accountNumber: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'fee';
  amount: number;
  description: string;
  timestamp: Date;
  balanceAfter: number;
  merchantInfo?: {
    name: string;
    category: string;
    location: string;
  };
  transferDetails?: {
    fromAccount: string;
    toAccount: string;
  };
}

interface Customer {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  dateOfBirth: Date;
  ssn: string; // In real app, this would be encrypted
  accounts: string[];
  creditScore?: number;
  employmentInfo?: {
    employer: string;
    position: string;
    annualIncome: number;
  };
}

// Mock banking data
class BankingDatabase {
  private static instance: BankingDatabase;
  private customers: Map<string, Customer> = new Map();
  private accounts: Map<string, BankAccount> = new Map();
  private transactions: Map<string, Transaction[]> = new Map();

  static getInstance(): BankingDatabase {
    if (!BankingDatabase.instance) {
      BankingDatabase.instance = new BankingDatabase();
      BankingDatabase.instance.initializeData();
    }
    return BankingDatabase.instance;
  }

  private initializeData() {
    // Initialize with sample data
    const customer1: Customer = {
      customerId: 'CUST001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@email.com',
      phone: '(555) 123-4567',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001'
      },
      dateOfBirth: new Date('1985-06-15'),
      ssn: '123-45-6789',
      accounts: ['ACC001', 'ACC002'],
      creditScore: 750,
      employmentInfo: {
        employer: 'Tech Corp',
        position: 'Software Engineer',
        annualIncome: 95000
      }
    };

    const customer2: Customer = {
      customerId: 'CUST002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@email.com',
      phone: '(555) 987-6543',
      address: {
        street: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210'
      },
      dateOfBirth: new Date('1990-03-22'),
      ssn: '987-65-4321',
      accounts: ['ACC003', 'ACC004'],
      creditScore: 820,
      employmentInfo: {
        employer: 'Design Studio',
        position: 'Creative Director',
        annualIncome: 85000
      }
    };

    this.customers.set('CUST001', customer1);
    this.customers.set('CUST002', customer2);

    // Sample accounts
    const accounts: BankAccount[] = [
      {
        accountNumber: 'ACC001',
        accountType: 'checking',
        balance: 2540.75,
        customerName: 'John Doe',
        customerId: 'CUST001',
        openDate: new Date('2020-01-15'),
        status: 'active',
        minimumBalance: 100
      },
      {
        accountNumber: 'ACC002',
        accountType: 'savings',
        balance: 15750.50,
        customerName: 'John Doe',
        customerId: 'CUST001',
        openDate: new Date('2020-01-15'),
        status: 'active',
        interestRate: 2.5,
        minimumBalance: 500
      },
      {
        accountNumber: 'ACC003',
        accountType: 'checking',
        balance: 4820.30,
        customerName: 'Jane Smith',
        customerId: 'CUST002',
        openDate: new Date('2019-08-22'),
        status: 'active',
        minimumBalance: 100
      },
      {
        accountNumber: 'ACC004',
        accountType: 'credit',
        balance: -1250.00,
        customerName: 'Jane Smith',
        customerId: 'CUST002',
        openDate: new Date('2021-03-10'),
        status: 'active',
        creditLimit: 5000
      }
    ];

    accounts.forEach(account => this.accounts.set(account.accountNumber, account));

    // Sample transactions
    this.initializeTransactions();
  }

  private initializeTransactions() {
    const sampleTransactions: Transaction[] = [
      {
        transactionId: 'TXN001',
        accountNumber: 'ACC001',
        type: 'deposit',
        amount: 1500.00,
        description: 'Salary deposit',
        timestamp: new Date('2024-01-01T09:00:00Z'),
        balanceAfter: 2540.75
      },
      {
        transactionId: 'TXN002',
        accountNumber: 'ACC001',
        type: 'withdrawal',
        amount: 120.00,
        description: 'ATM withdrawal',
        timestamp: new Date('2024-01-02T14:30:00Z'),
        balanceAfter: 2420.75,
        merchantInfo: {
          name: 'Bank ATM #1234',
          category: 'ATM',
          location: 'New York, NY'
        }
      },
      {
        transactionId: 'TXN003',
        accountNumber: 'ACC001',
        type: 'payment',
        amount: 85.50,
        description: 'Coffee Shop',
        timestamp: new Date('2024-01-03T08:15:00Z'),
        balanceAfter: 2335.25,
        merchantInfo: {
          name: 'Downtown Coffee',
          category: 'Food & Beverage',
          location: 'New York, NY'
        }
      }
    ];

    this.transactions.set('ACC001', sampleTransactions);
    this.transactions.set('ACC002', []);
    this.transactions.set('ACC003', []);
    this.transactions.set('ACC004', []);
  }

  getCustomer(customerId: string): Customer | undefined {
    return this.customers.get(customerId);
  }

  getCustomerByAccount(accountNumber: string): Customer | undefined {
    const account = this.accounts.get(accountNumber);
    if (!account) return undefined;
    return this.customers.get(account.customerId);
  }

  getAccount(accountNumber: string): BankAccount | undefined {
    return this.accounts.get(accountNumber);
  }

  getCustomerAccounts(customerId: string): BankAccount[] {
    return Array.from(this.accounts.values()).filter(
      account => account.customerId === customerId
    );
  }

  getTransactions(accountNumber: string, limit?: number): Transaction[] {
    const transactions = this.transactions.get(accountNumber) || [];
    return limit ? transactions.slice(-limit) : transactions;
  }

  addTransaction(transaction: Transaction): void {
    const transactions = this.transactions.get(transaction.accountNumber) || [];
    transactions.push(transaction);
    this.transactions.set(transaction.accountNumber, transactions);

    // Update account balance
    const account = this.accounts.get(transaction.accountNumber);
    if (account) {
      account.balance = transaction.balanceAfter;
    }
  }

  updateAccount(accountNumber: string, updates: Partial<BankAccount>): boolean {
    const account = this.accounts.get(accountNumber);
    if (!account) return false;
    
    Object.assign(account, updates);
    return true;
  }

  getAllAccounts(): BankAccount[] {
    return Array.from(this.accounts.values());
  }

  getAllCustomers(): Customer[] {
    return Array.from(this.customers.values());
  }
}

// Banking contexts - These should be knowledge/data/expertise areas
const bankingContexts: Context[] = [
  {
    key: "banking_expert",
    description: "Expert knowledge about banking operations and regulations",
    content: `
BANKING OPERATIONS EXPERTISE:

Account Types & Management:
- Checking accounts: Transaction accounts for daily banking, minimum balance requirements
- Savings accounts: Interest-bearing accounts, withdrawal limitations, higher minimum balances
- Business accounts: Commercial banking, merchant services, business loans
- Credit accounts: Credit cards, lines of credit, credit limits, interest calculations

Transaction Processing:
- Deposits: Cash, check, electronic transfers, mobile deposits
- Withdrawals: ATM, teller, electronic transfers, withdrawal limits
- Transfers: Internal transfers, external transfers, wire transfers, ACH transfers
- Payments: Bill pay, merchant payments, online payments, scheduled payments

Financial Calculations:
- Interest calculations: Simple interest, compound interest, APR, APY
- Fee structures: Overdraft fees, maintenance fees, transaction fees
- Credit calculations: Credit utilization, payment calculations, minimum payments

Regulatory Compliance:
- Know Your Customer (KYC): Identity verification, documentation requirements
- Anti-Money Laundering (AML): Transaction monitoring, suspicious activity reporting
- Bank Secrecy Act (BSA): Record keeping, reporting requirements
- Truth in Lending Act: Disclosure requirements, APR calculations
- Fair Credit Reporting Act: Credit reporting, dispute resolution

Security Protocols:
- Multi-factor authentication, encryption standards, fraud detection
- Account verification procedures, transaction authorization
- Privacy protection, data security, audit trails
    `,
    priority: 100,
  },
  {
    key: "account_operations",
    description: "Specific knowledge about account management operations",
    content: `
ACCOUNT OPERATIONS KNOWLEDGE:

Account Number Requirements:
- ALWAYS ask for account number when not provided by customer
- Never assume which account a customer wants to access
- Use phrases like "Which account would you like me to check?" or "Please provide the account number"
- If customer is unsure, offer to list all their accounts first
- Account numbers are required for ALL account-specific operations

Account Status Management:
- Active: Full functionality, all transactions allowed
- Frozen: Limited access, specific restrictions applied
- Closed: No transactions, historical access only
- Suspended: Temporary restriction, pending investigation

Balance Management:
- Available balance: Immediately accessible funds
- Current balance: Total account balance including pending transactions
- Minimum balance: Required balance to avoid fees
- Overdraft protection: Coverage for insufficient funds

Account Verification Process:
1. Account number validation (REQUIRED - ask if not provided)
2. Customer identity confirmation (name, last 4 SSN)
3. Security question verification (optional)
4. Transaction history review for suspicious activity

Account Information Access Levels:
- Basic info: Account type, status, balance (requires account number)
- Detailed info: Interest rates, fees, terms (requires account number)
- Transaction history: Date, amount, description, merchant info (requires account number)
- Customer profile: Contact info, preferences, linked accounts (can show all accounts)

Customer Interaction Guidelines:
- When customer says "check my balance" → Ask "Which account balance would you like me to check?"
- When customer says "account details" → Ask "For which account number would you like details?"
- When customer is vague about account → Offer to list all accounts first
- Always confirm account number before proceeding with operations

CRITICAL EFFICIENCY RULES:
- Balance inquiry: get_account_balance → respond (1 tool maximum)
- Account details: get_account_details → respond (1 tool maximum)
- List accounts: get_customer_accounts_by_session → respond (1 tool maximum)
- NEVER call multiple account tools for the same request
    `,
    priority: 90,
  },
  {
    key: "transaction_knowledge",
    description: "Knowledge about transaction processing and analysis",
    content: `
TRANSACTION PROCESSING KNOWLEDGE:

Transaction Types:
- Deposit: Incoming funds (salary, transfers, cash deposits)
- Withdrawal: Outgoing funds (ATM, teller, transfers)
- Transfer: Movement between accounts (internal/external)
- Payment: Bill payments, merchant transactions
- Fee: Bank charges (maintenance, overdraft, etc.)

Transaction Validation:
- Sufficient funds check for debits
- Account status verification (active, not frozen)
- Daily/monthly limits validation
- Fraud detection screening
- Merchant verification for payments

Transaction Categories:
- Food & Beverage: Restaurants, groceries, coffee shops
- Shopping: Retail, online purchases, subscriptions
- Transportation: Gas, public transit, rideshare
- Bills & Utilities: Electric, water, internet, phone
- Healthcare: Medical, pharmacy, insurance
- Entertainment: Movies, streaming, events
- ATM: Cash withdrawals, fees

Search and Analysis:
- Date range filtering
- Amount range filtering
- Category-based grouping
- Merchant name searching
- Description text matching
- Spending pattern analysis
    `,
    priority: 85,
  },
  {
    key: "reporting_knowledge",
    description: "Knowledge about financial reporting and statement generation",
    content: `
FINANCIAL REPORTING KNOWLEDGE:

Statement Components:
- Account summary: Opening/closing balance, account details
- Transaction listing: Date, description, amount, running balance
- Summary totals: Deposits, withdrawals, fees, interest
- Account analysis: Average balance, transaction count

Report Formats:
- JSON: Structured data for systems integration
- CSV: Spreadsheet-compatible format for analysis
- Text: Human-readable format for printing
- PDF: Professional format for archival

Statement Periods:
- Monthly: Calendar month or statement cycle
- Quarterly: 3-month periods for business reporting
- Annual: Year-end summaries for tax purposes
- Custom: User-defined date ranges

Analysis Types:
- Spending analysis: Category breakdown, trends
- Income analysis: Deposit sources, regularity
- Cash flow: Inflows vs outflows over time
- Budget analysis: Spending vs targets

Tax Documentation:
- Interest income statements (1099-INT)
- Mortgage interest paid (1098)
- Investment summaries
- Business expense categorization
    `,
    priority: 80,
  },
  {
    key: "security_protocols",
    description: "Banking security and compliance guidelines",
    content: `
SECURITY & COMPLIANCE PROTOCOLS:

Authentication Requirements:
- Primary: Account number + customer verification
- Secondary: Security questions, PIN verification
- Multi-factor: SMS codes, authentication apps
- Biometric: Fingerprint, voice recognition (when available)

Data Protection:
- PII masking: Partial account numbers (****1234)
- SSN protection: Never display full SSN
- Encryption: All sensitive data encrypted in transit/storage
- Access logging: All account access logged with timestamps

Transaction Security:
- Authorization limits: Daily/monthly transaction limits
- Fraud detection: Unusual pattern monitoring
- High-value alerts: Notifications for large transactions
- Geographic validation: Location-based verification

Compliance Requirements:
- Audit trails: Complete transaction history
- Retention policies: Data storage requirements
- Regulatory reporting: Suspicious activity reporting
- Privacy rights: Customer data access/deletion rights

Error Handling:
- Graceful degradation: Partial service during issues
- Error logging: Technical issues tracked
- Customer communication: Clear error messages
- Escalation procedures: When to involve human agents
    `,
    priority: 95,
  },
  {
    key: "task_completion_guidance",
    description: "Guidelines for completing tasks efficiently without excessive tool use",
    content: `
TASK COMPLETION GUIDELINES:

Response Efficiency Rules:
- Use the MINIMUM number of tools necessary to complete the task
- After getting required information, provide a response - don't call more tools unnecessarily
- If you have enough information to answer the user, STOP and respond

Tool Usage Patterns:
- Single Information Request: Use 1 tool maximum (e.g., get balance → respond)
- Account Verification: Use 1-2 tools maximum (verify account → get info → respond)  
- Complex Operations: Use 2-3 tools maximum (verify → execute → confirm → respond)
- Reporting Tasks: Use 2-4 tools maximum (get data → process → format → save → respond)

Completion Signals:
- Account balance retrieved → Provide balance and stop
- Account details obtained → Display details and stop
- Transaction completed → Confirm completion and stop
- Report generated → Confirm generation and stop
- Error encountered → Explain error and stop

CRITICAL: Always aim to complete the user's request in the FEWEST possible tool calls. 
Each tool call should bring you closer to a final response. If you have the information 
needed to help the user, provide the response immediately.

Common Completion Patterns:
1. Information Query: Tool → Response
2. Simple Transaction: Verify → Execute → Response  
3. Complex Analysis: Get Data → Analyze → Response
4. Report Generation: Get Data → Generate → Save → Response

NEVER call tools just to "be thorough" - only call tools that are essential for the user's request.
    `,
    priority: 98,
  },
  {
    key: "tool_usage_optimization",
    description: "Guidelines for optimal tool usage and avoiding unnecessary iterations",
    content: `
TOOL USAGE OPTIMIZATION:

Efficient Tool Selection:
- Choose the MOST SPECIFIC tool for the task
- Avoid calling multiple tools that provide similar information
- Use batch operations when available (e.g., get_customer_accounts_by_session vs multiple account calls)

Tool Call Sequencing:
- Plan your tool usage before starting
- Each tool call should have a clear purpose
- Stop as soon as you have sufficient information

Account Operations Efficiency:
- For "check my balance": get_account_balance OR ask for account number → respond
- For "show my accounts": get_customer_accounts_by_session → respond
- For "account details": get_account_details → respond
- For "transfer money": verify accounts → transfer_funds → respond

Transaction Operations Efficiency:
- For "transaction history": get_transaction_history → respond
- For "search transactions": search_transactions → respond
- For "spending analysis": analyze_spending → respond

Reporting Operations Efficiency:
- For "generate statement": generate_statement → write_file (if needed) → respond
- For "export data": get_transaction_history → write_file → respond

RED FLAGS (Stop These Patterns):
- Calling the same tool multiple times with slight variations
- Getting account info AND balance AND details when only one was requested
- Verifying account multiple times in the same conversation
- Calling tools after you already have the answer the user needs
- Using verify_account AND get_account_balance for a simple balance request
- Using customer_lookup AND verify_account in the same operation
- Calling get_customer_accounts_by_session AND list_customer_accounts together

PROHIBITED TOOL COMBINATIONS (Never use these together in one request):
- verify_account + get_account_balance (choose ONE based on what's needed)
- customer_lookup + get_customer_accounts_by_session (redundant)
- get_account_details + get_account_balance (get_account_details includes balance)
- Multiple file write operations for the same data

GOAL: Satisfy user request with MINIMUM tool calls while maintaining security and accuracy.
    `,
    priority: 97,
  }
];

// Banking state hierarchy - Proper inheritance structure
const bankingStates: StateConfig[] = [
  {
    key: "banking_hub",
    description: "Main banking operations center",
    prompt: "You are a professional banking AI assistant with comprehensive knowledge of banking operations, regulations, and security protocols. Always prioritize customer security, regulatory compliance, and accurate financial information. Use the available tools to provide accurate, helpful banking services. Use the MINIMUM number of tools necessary and provide a response as soon as you have sufficient information to help the user.",
    contexts: ["banking_expert", "security_protocols", "task_completion_guidance", "tool_usage_optimization"],
    tools: ["verify_account", "customer_lookup"],
    children: [
      {
        key: "account_services",
        description: "Account management and information services",
        prompt: "Handle account-related inquiries including balance checks, account details, and account management. Always verify customer identity before providing sensitive information. If no account number is provided, ask the customer to specify which account they want to access.",
        contexts: ["account_operations"],
        tools: ["get_account_balance", "get_account_details", "list_customer_accounts", "get_customer_accounts_by_session"],
        children: [
          {
            key: "account_inquiry",
            description: "View account information and balances",
            prompt: "Provide account balance and basic account information. Always ask for the specific account number if not provided. Do not assume which account the customer wants to access.",
            children: [
              {
                key: "balance_inquiry",
                description: "Check account balance for a specific account",
                prompt: "Your ONLY task is to get and display the account balance. If account number is provided, use get_account_balance and respond immediately. If no account number, ask for it and stop. Do not call additional tools after getting the balance."
              },
              {
                key: "account_overview",
                description: "Get comprehensive account details and summary",
                prompt: "Your ONLY task is to get and display account details. If account number is provided, use get_account_details and respond immediately. If no account number, ask for it and stop. Do not call additional tools after getting the details."
              },
              {
                key: "account_list",
                description: "List all accounts for a customer",
                prompt: "Your ONLY task is to list customer accounts. Use get_customer_accounts_by_session tool once and respond immediately with the account list. Do not call any other tools."
              }
            ]
          },
          {
            key: "account_management", 
            description: "Manage account settings and status",
            prompt: "Handle account setting updates, status changes, and maintenance requests. Always request the specific account number if not provided. Verify authorization for any account modifications.",
            children: [
              {
                key: "account_settings",
                description: "Update account preferences and settings",
                prompt: "Handle account preference updates, notification settings, and general account configuration. Always request the account number if not provided."
              },
              {
                key: "account_status",
                description: "Check or modify account status",
                prompt: "Provide account status information or process status change requests. Always request the account number if not provided. Status changes require additional authorization."
              },
              {
                key: "account_maintenance",
                description: "Handle account maintenance requests",
                prompt: "Process account maintenance requests such as address updates, contact changes, or service modifications. Always request the account number if not provided."
              }
            ]
          },
          {
            key: "account_verification", 
            description: "Verify account ownership and identity",
            prompt: "Your ONLY task is to verify account ownership. Use verify_account tool once with provided account number and customer information, then respond immediately with verification status. Do not call additional tools."
          }
        ]
      },
      {
        key: "transaction_services",
        description: "Transaction processing and history services",
        prompt: "Process transaction-related requests including history, transfers, and transaction analysis. Validate all transactions for security and compliance.",
        contexts: ["transaction_knowledge"],
        tools: ["get_transaction_history", "search_transactions"],
        children: [
          {
            key: "transaction_history",
            description: "View and search transaction history",
            prompt: "Your ONLY task is to retrieve and display transaction history. Use get_transaction_history tool once with provided parameters and respond immediately. Do not call additional tools unless specifically asked to search with different criteria."
          },
          {
            key: "transfer_services",
            description: "Handle fund transfers between accounts",
            prompt: "Your ONLY task is to process a fund transfer. Validate required information (from account, to account, amount), use transfer_funds tool once, and respond immediately with confirmation. Ask for missing information but do not call additional verification tools.",
            tools: ["transfer_funds"]
          }
        ]
      },
      {
        key: "reporting_services", 
        description: "Financial reports and document generation",
        prompt: "Generate comprehensive financial reports, statements, and analytical documents. Ensure all reports are accurate and formatted appropriately.",
        contexts: ["reporting_knowledge"],
        tools: ["generate_statement", "analyze_spending", "write_file", "write_json"],
        children: [
          {
            key: "statement_generation",
            description: "Generate account statements in various formats",
            prompt: "Your ONLY task is to generate an account statement. Use generate_statement tool once with the provided parameters, optionally save with write_file if requested, then respond immediately with confirmation. Maximum 2 tools total."
          },
          {
            key: "spending_analysis",
            description: "Analyze spending patterns and financial trends", 
            prompt: "Your ONLY task is to analyze spending patterns. Use analyze_spending tool once with provided account and period, then respond immediately with the analysis results. Do not call additional tools."
          },
          {
            key: "document_export",
            description: "Export financial data and documents",
            prompt: "Your ONLY task is to export data. Get the requested data with ONE tool call (e.g., get_transaction_history), then save it with write_file or write_json, then respond immediately. Maximum 2 tools total."
          }
        ]
      },
      {
        key: "customer_support",
        description: "General customer service and assistance",
        prompt: "Provide comprehensive customer support for banking inquiries, issues, and general assistance. Maintain professional service standards.",
        children: [
          {
            key: "profile_management",
            description: "Manage customer profile information",
            prompt: "Handle customer profile updates, contact information changes, and preference management. Verify identity before making changes."
          },
          {
            key: "issue_resolution",
            description: "Resolve customer issues and disputes",
            prompt: "Address customer concerns, transaction disputes, and account issues. Document issues and provide clear resolution paths."
          },
          {
            key: "product_information",
            description: "Provide information about banking products and services",
            prompt: "Explain banking products, services, fees, and features. Help customers understand available options and make informed decisions."
          }
        ]
      }
    ]
  }
];

// Banking tools - Organized by functional area
const bankingTools: Tool[] = [
  // Core verification and lookup tools
  {
    type: "function",
    function: {
      name: "verify_account",
      description: "Verify account ownership and return basic account information",
      parameters: {
        type: "object",
        properties: {
          accountNumber: {
            type: "string",
            description: "Account number to verify"
          },
          customerInfo: {
            type: "object",
            description: "Customer verification information",
            properties: {
              lastName: { type: "string" },
              lastFourSSN: { type: "string" }
            }
          }
        },
        required: ["accountNumber"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "customer_lookup",
      description: "Look up customer information by account number",
      parameters: {
        type: "object",
        properties: {
          accountNumber: { type: "string", description: "Account number" }
        },
        required: ["accountNumber"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_customer_accounts_by_session",
      description: "Get all accounts for the current authenticated user/session when no specific account is provided",
      parameters: {
        type: "object",
        properties: {
          includeInactive: {
            type: "boolean",
            description: "Whether to include inactive/closed accounts",
            default: false
          }
        },
        required: []
      }
    }
  },
  
  // Account management tools
  {
    type: "function",
    function: {
      name: "get_account_balance",
      description: "Get current account balance with security verification",
      parameters: {
        type: "object",
        properties: {
          accountNumber: { type: "string", description: "Account number" }
        },
        required: ["accountNumber"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_account_details",
      description: "Get comprehensive account information including status, type, and terms",
      parameters: {
        type: "object",
        properties: {
          accountNumber: { type: "string", description: "Account number" }
        },
        required: ["accountNumber"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_customer_accounts",
      description: "List all accounts associated with a customer",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "Customer ID" }
        },
        required: ["customerId"]
      }
    }
  },
  
  // Transaction tools
  {
    type: "function",
    function: {
      name: "get_transaction_history",
      description: "Retrieve account transaction history with filtering options",
      parameters: {
        type: "object",
        properties: {
          accountNumber: { type: "string", description: "Account number" },
          limit: { type: "number", description: "Number of transactions to return (default: 10)" },
          startDate: { type: "string", description: "Start date for transaction search (YYYY-MM-DD)" },
          endDate: { type: "string", description: "End date for transaction search (YYYY-MM-DD)" }
        },
        required: ["accountNumber"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_transactions",
      description: "Search and filter transactions by multiple criteria",
      parameters: {
        type: "object",
        properties: {
          accountNumber: { type: "string", description: "Account number" },
          searchQuery: { type: "string", description: "Search term for transaction description or merchant" },
          amountRange: {
            type: "object",
            properties: {
              min: { type: "number" },
              max: { type: "number" }
            }
          },
          transactionType: { type: "string", enum: ["deposit", "withdrawal", "transfer", "payment", "fee"] }
        },
        required: ["accountNumber", "searchQuery"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "transfer_funds",
      description: "Securely transfer funds between accounts with validation",
      parameters: {
        type: "object",
        properties: {
          fromAccount: { type: "string", description: "Source account number" },
          toAccount: { type: "string", description: "Destination account number" },
          amount: { type: "number", description: "Amount to transfer" },
          description: { type: "string", description: "Transfer description" }
        },
        required: ["fromAccount", "toAccount", "amount"]
      }
    }
  },
  
  // Reporting and analysis tools  
  {
    type: "function",
    function: {
      name: "generate_statement",
      description: "Generate comprehensive account statement for specified period",
      parameters: {
        type: "object",
        properties: {
          accountNumber: { type: "string", description: "Account number" },
          startDate: { type: "string", description: "Statement start date (YYYY-MM-DD)" },
          endDate: { type: "string", description: "Statement end date (YYYY-MM-DD)" },
          format: { type: "string", enum: ["json", "csv", "text"], description: "Output format" }
        },
        required: ["accountNumber", "startDate", "endDate"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_spending",
      description: "Perform detailed spending analysis with categorization and trends",
      parameters: {
        type: "object",
        properties: {
          accountNumber: { type: "string", description: "Account number" },
          period: { type: "string", enum: ["month", "quarter", "year"], description: "Analysis period" },
          includeProjections: { type: "boolean", description: "Include spending projections" }
        },
        required: ["accountNumber", "period"]
      }
    }
  }
];

// Banking tool implementations
const bankingToolImplementations = {
  verify_account: async ({ accountNumber, customerInfo }: any) => {
    const db = BankingDatabase.getInstance();
    const account = db.getAccount(accountNumber);
    
    if (!account) {
      return {
        success: false,
        error: "Account not found"
      };
    }

    if (customerInfo) {
      const customer = db.getCustomer(account.customerId);
      if (customer && customerInfo.lastName && 
          customer.lastName.toLowerCase() !== customerInfo.lastName.toLowerCase()) {
        return {
          success: false,
          error: "Customer verification failed"
        };
      }
    }

    return {
      success: true,
      data: {
        accountNumber: account.accountNumber,
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
        accountNumber,
        balance: account.balance,
        accountType: account.accountType,
        status: account.status,
        lastUpdated: new Date().toISOString()
      }
    };
  },

  get_account_details: async ({ accountNumber }: any) => {
    const db = BankingDatabase.getInstance();
    const account = db.getAccount(accountNumber);
    
    if (!account) {
      return { success: false, error: "Account not found" };
    }

    const maskedAccount = {
      ...account,
      // Mask sensitive information
      accountNumber: `****${accountNumber.slice(-4)}`
    };

    return {
      success: true,
      data: maskedAccount
    };
  },

  get_transaction_history: async ({ accountNumber, limit = 10, startDate, endDate }: any) => {
    const db = BankingDatabase.getInstance();
    const account = db.getAccount(accountNumber);
    
    if (!account) {
      return { success: false, error: "Account not found" };
    }

    let transactions = db.getTransactions(accountNumber);

    // Filter by date range if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      
      transactions = transactions.filter(tx => 
        tx.timestamp >= start && tx.timestamp <= end
      );
    }

    // Apply limit
    const limitedTransactions = transactions.slice(-limit);

    return {
      success: true,
      data: {
        accountNumber,
        transactions: limitedTransactions,
        totalCount: transactions.length,
        period: { startDate, endDate }
      }
    };
  },

  search_transactions: async ({ accountNumber, searchQuery, amountRange, transactionType }: any) => {
    const db = BankingDatabase.getInstance();
    const account = db.getAccount(accountNumber);
    
    if (!account) {
      return { success: false, error: "Account not found" };
    }

    let transactions = db.getTransactions(accountNumber);

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      transactions = transactions.filter(tx => 
        tx.description.toLowerCase().includes(query) ||
        tx.merchantInfo?.name.toLowerCase().includes(query)
      );
    }

    // Filter by amount range
    if (amountRange) {
      transactions = transactions.filter(tx => {
        const amount = Math.abs(tx.amount);
        return (!amountRange.min || amount >= amountRange.min) &&
               (!amountRange.max || amount <= amountRange.max);
      });
    }

    // Filter by transaction type
    if (transactionType) {
      transactions = transactions.filter(tx => tx.type === transactionType);
    }

    return {
      success: true,
      data: {
        searchQuery,
        results: transactions,
        totalMatches: transactions.length
      }
    };
  },

  transfer_funds: async ({ fromAccount, toAccount, amount, description = "Transfer" }: any) => {
    const db = BankingDatabase.getInstance();
    const sourceAccount = db.getAccount(fromAccount);
    const destAccount = db.getAccount(toAccount);
    
    if (!sourceAccount) {
      return { success: false, error: "Source account not found" };
    }
    
    if (!destAccount) {
      return { success: false, error: "Destination account not found" };
    }

    if (sourceAccount.balance < amount) {
      return { success: false, error: "Insufficient funds" };
    }

    const transactionId = `TXN${Date.now()}`;
    const timestamp = new Date();

    // Create withdrawal transaction
    const withdrawalTx: Transaction = {
      transactionId: `${transactionId}_W`,
      accountNumber: fromAccount,
      type: 'transfer',
      amount: -amount,
      description: `Transfer to ${toAccount}`,
      timestamp,
      balanceAfter: sourceAccount.balance - amount,
      transferDetails: { fromAccount, toAccount }
    };

    // Create deposit transaction
    const depositTx: Transaction = {
      transactionId: `${transactionId}_D`,
      accountNumber: toAccount,
      type: 'transfer',
      amount: amount,
      description: `Transfer from ${fromAccount}`,
      timestamp,
      balanceAfter: destAccount.balance + amount,
      transferDetails: { fromAccount, toAccount }
    };

    // Add transactions
    db.addTransaction(withdrawalTx);
    db.addTransaction(depositTx);

    return {
      success: true,
      data: {
        transactionId,
        fromAccount,
        toAccount,
        amount,
        newSourceBalance: sourceAccount.balance - amount,
        newDestBalance: destAccount.balance + amount,
        timestamp
      }
    };
  },

  generate_statement: async ({ accountNumber, startDate, endDate, format = "json" }: any) => {
    const db = BankingDatabase.getInstance();
    const account = db.getAccount(accountNumber);
    
    if (!account) {
      return { success: false, error: "Account not found" };
    }

    const customer = db.getCustomer(account.customerId);
    const transactions = db.getTransactions(accountNumber);

    // Filter transactions by date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const filteredTransactions = transactions.filter(tx => 
      tx.timestamp >= start && tx.timestamp <= end
    );

    const statement = {
      accountNumber: `****${accountNumber.slice(-4)}`,
      customerName: account.customerName,
      statementPeriod: { startDate, endDate },
      openingBalance: account.balance - filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0),
      closingBalance: account.balance,
      transactions: filteredTransactions,
      summary: {
        totalDeposits: filteredTransactions
          .filter(tx => tx.amount > 0)
          .reduce((sum, tx) => sum + tx.amount, 0),
        totalWithdrawals: filteredTransactions
          .filter(tx => tx.amount < 0)
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
        transactionCount: filteredTransactions.length
      },
      generatedAt: new Date().toISOString()
    };

    return {
      success: true,
      data: {
        statement,
        format,
        filename: `statement_${accountNumber}_${startDate}_${endDate}.${format}`
      }
    };
  },

  analyze_spending: async ({ accountNumber, period, includeProjections = false }: any) => {
    const db = BankingDatabase.getInstance();
    const account = db.getAccount(accountNumber);
    
    if (!account) {
      return { success: false, error: "Account not found" };
    }

    const transactions = db.getTransactions(accountNumber);
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
    }

    const periodTransactions = transactions.filter(tx => tx.timestamp >= startDate);
    const expenses = periodTransactions.filter(tx => tx.amount < 0);

    // Categorize expenses
    const categories = expenses.reduce((acc, tx) => {
      const category = tx.merchantInfo?.category || 'Other';
      if (!acc[category]) {
        acc[category] = { total: 0, count: 0, transactions: [] };
      }
      acc[category].total += Math.abs(tx.amount);
      acc[category].count++;
      acc[category].transactions.push(tx);
      return acc;
    }, {} as any);

    const analysis = {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalSpent: expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      totalIncome: periodTransactions
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0),
      categories,
      topExpenses: expenses
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, 5),
      averageDaily: expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / 
        Math.max(1, (now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    };

    return {
      success: true,
      data: analysis
    };
  },

  list_customer_accounts: async ({ customerId }: any) => {
    const db = BankingDatabase.getInstance();
    const customer = db.getCustomer(customerId);
    
    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    const accounts = db.getCustomerAccounts(customerId);
    
    return {
      success: true,
      data: {
        customerId,
        customerName: `${customer.firstName} ${customer.lastName}`,
        accounts: accounts.map(acc => ({
          accountNumber: `****${acc.accountNumber.slice(-4)}`,
          accountType: acc.accountType,
          balance: acc.balance,
          status: acc.status
        }))
      }
    };
  },

  customer_lookup: async ({ accountNumber }: any) => {
    const db = BankingDatabase.getInstance();
    const customer = db.getCustomerByAccount(accountNumber);
    
    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    // Return limited customer info for privacy
    return {
      success: true,
      data: {
        customerId: customer.customerId,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone,
        accountCount: customer.accounts.length
      }
    };
  },

  get_customer_accounts_by_session: async ({ includeInactive = false }: any) => {
    const db = BankingDatabase.getInstance();
    
    // In a real implementation, this would get the customer ID from the authenticated session
    // For demo purposes, we'll use the first customer (CUST001)
    const customerId = 'CUST001'; // This would come from session/authentication
    
    const customer = db.getCustomer(customerId);
    if (!customer) {
      return { success: false, error: "Customer not found for current session" };
    }

    const accounts = db.getCustomerAccounts(customerId);
    
    // Filter out inactive accounts if not requested
    const filteredAccounts = includeInactive 
      ? accounts 
      : accounts.filter(acc => acc.status === 'active');
    
    return {
      success: true,
      data: {
        customerId,
        customerName: `${customer.firstName} ${customer.lastName}`,
        totalAccounts: filteredAccounts.length,
        accounts: filteredAccounts.map(acc => ({
          accountNumber: acc.accountNumber,
          maskedAccountNumber: `****${acc.accountNumber.slice(-4)}`,
          accountType: acc.accountType,
          balance: acc.balance,
          status: acc.status,
          openDate: acc.openDate
        })),
        message: filteredAccounts.length === 0 
          ? "No active accounts found" 
          : `Found ${filteredAccounts.length} account${filteredAccounts.length > 1 ? 's' : ''}`
      }
    };
  }
};

// CLI Application
class BankingCLI {
  private agent!: Agent;
  private rl: any;
  private userId: string = 'user-123';
  private currentSessionId: string = `session_${Date.now()}`;

  constructor() {
    this.initializeAgent();
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('SecureBank> ')
    });
  }

  private initializeAgent() {
    const conversationStorage = new InMemoryConversationStorage();

    this.agent = new Agent({
      states: bankingStates,
      contexts: bankingContexts,
      tools: bankingTools,
      defaultLLMConfig: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        // model: 'llama-3.1-8b-instant',
        apiKey: process.env.GROQ_API_KEY!,
        temperature: 0.4,
      },
      maxToolIterations: 8, // Increased from default 5 to handle banking workflows
      conversationConfig: {
        storage: conversationStorage,
        maxWorkingMemoryMessages: 25,
        enableSummarization: true,
        maxContextTokens: 2000,
        defaultRelevanceStrategy: 'hybrid',
        enableEmbeddings: false,
      }
    });

    // Register banking tool implementations
    this.agent.registerTools(bankingToolImplementations);
  }

  private displayWelcome() {
    console.clear();
    console.log(chalk.blue(figlet.textSync('SecureBank AI', { 
      font: 'Standard',
      horizontalLayout: 'fitted' 
    })));
    
    console.log(chalk.cyan('═'.repeat(80)));
    console.log(chalk.white('🏦 Welcome to SecureBank AI Assistant'));
    console.log(chalk.yellow('Your comprehensive banking companion with AI-powered assistance\n'));
    
    console.log(chalk.yellow('✨ Available Services:'));
    console.log(chalk.white('  • Account Management & Balance Inquiries'));
    console.log(chalk.white('  • Transaction History & Search'));
    console.log(chalk.white('  • Fund Transfers & Payments'));
    console.log(chalk.white('  • Financial Reports & Statements'));
    console.log(chalk.white('  • Spending Analysis & Insights'));
    console.log(chalk.white('  • Customer Profile Management\n'));
    
    console.log(chalk.yellow('🔐 Security Features:'));
    console.log(chalk.white('  • Multi-factor Authentication'));
    console.log(chalk.white('  • Encrypted Data Storage'));
    console.log(chalk.white('  • Regulatory Compliance (FDIC, AML, KYC)'));
    console.log(chalk.white('  • Real-time Fraud Detection\n'));
    
    console.log(chalk.green('📋 Sample Commands:'));
    console.log(chalk.yellow('  "Check my balance" (system will ask which account)'));
    console.log(chalk.yellow('  "Show my accounts"'));
    console.log(chalk.yellow('  "Account details for ACC001"'));
    console.log(chalk.yellow('  "Show transaction history for last month"'));
    console.log(chalk.yellow('  "Transfer $500 from ACC001 to ACC002"'));
    console.log(chalk.yellow('  "Generate monthly statement for ACC001"'));
    console.log(chalk.yellow('  "Analyze my spending patterns"'));
    console.log(chalk.yellow('  "Export transactions to CSV file"\n'));
    
    console.log(chalk.cyan('═'.repeat(80)));
    console.log(chalk.white('Type your banking request or "help" for assistance'));
    console.log(chalk.white('Type "quit" or "exit" to close the application\n'));
  }

  private displayHelp() {
    console.log(chalk.yellow('\n📖 SecureBank AI Assistant Help\n'));
    
    console.log(chalk.cyan('🏦 Account Services:'));
    console.log(chalk.white('  • "Check my balance" - The system will ask which account'));
    console.log(chalk.white('  • "Show my accounts" - List all your accounts'));
    console.log(chalk.white('  • "Account details for ACC001" - Specific account information'));
    console.log(chalk.white('  • "What accounts do I have?" - View all available accounts\n'));
    
    console.log(chalk.cyan('💸 Transaction Services:'));
    console.log(chalk.white('  • "Show recent transactions" - Last 10 transactions'));
    console.log(chalk.white('  • "Transaction history for last month" - Monthly history'));
    console.log(chalk.white('  • "Search for coffee transactions" - Find specific purchases'));
    console.log(chalk.white('  • "Transfer $100 from ACC001 to ACC002" - Move money\n'));
    
    console.log(chalk.cyan('📊 Reports & Analysis:'));
    console.log(chalk.white('  • "Generate statement for December" - Monthly statement'));
    console.log(chalk.white('  • "Analyze my spending this quarter" - Spending insights'));
    console.log(chalk.white('  • "Export transactions to CSV" - Data export'));
    console.log(chalk.white('  • "Create financial report" - Comprehensive analysis\n'));
    
    console.log(chalk.cyan('🛡️ Security Commands:'));
    console.log(chalk.white('  • "Verify account ACC001" - Account verification'));
    console.log(chalk.white('  • "Check account status" - Security status\n'));
    
    console.log(chalk.cyan('📁 File Operations:'));
    console.log(chalk.white('  • "Save statement to file" - Export statements'));
    console.log(chalk.white('  • "Create backup of transactions" - Data backup'));
    console.log(chalk.white('  • "Generate tax documents" - Tax preparation\n'));
  }

  private formatResponse(response: string): string {
    // Add some formatting to make responses more readable
    return response
      .replace(/\*\*(.*?)\*\*/g, chalk.bold('$1'))
      .replace(/\*(.*?)\*/g, chalk.italic('$1'))
      .replace(/Account\s+[A-Z]{3}\d{3}/g, (match) => chalk.green(match))
      .replace(/\$[\d,]+\.?\d*/g, (match) => chalk.yellow(match))
      .replace(/\b(SUCCESS|COMPLETED|VERIFIED)\b/gi, (match) => chalk.green(match))
      .replace(/\b(ERROR|FAILED|DENIED)\b/gi, (match) => chalk.red(match))
      .replace(/\b(WARNING|CAUTION)\b/gi, (match) => chalk.yellow(match));
  }

  async start() {
    this.displayWelcome();
    
    this.rl.prompt();
    
    this.rl.on('line', async (input: string) => {
      const trimmedInput = input.trim();
      
      if (trimmedInput === '' || trimmedInput === 'quit' || trimmedInput === 'exit') {
        console.log(chalk.green('\n👋 Thank you for using SecureBank AI Assistant!'));
        console.log(chalk.white('Your session has been securely terminated.\n'));
        this.rl.close();
        process.exit(0);
      }
      
      if (trimmedInput === 'help') {
        this.displayHelp();
        this.rl.prompt();
        return;
      }
      
      if (trimmedInput === 'clear') {
        console.clear();
        this.displayWelcome();
        this.rl.prompt();
        return;
      }
      
      try {
        console.log(chalk.blue('\n🤖 Processing your request...\n'));
        
        const startTime = Date.now();
        const response = await this.agent.processQuery(
          this.userId,
          trimmedInput,
          this.currentSessionId,
          [],
          { timestamp: new Date().toISOString() }
        );
        
        const processingTime = Date.now() - startTime;
        
        console.log(chalk.cyan('═'.repeat(80)));
        console.log(this.formatResponse(response.response));
        console.log(chalk.cyan('═'.repeat(80)));
        
        // Show some metadata about the response
        console.log(chalk.yellow(`\n📊 Response Details:`));
        console.log(chalk.yellow(`   State: ${response.selectedState.key}`));
        console.log(chalk.yellow(`   Confidence: ${response.confidence}%`));
        console.log(chalk.yellow(`   Tools Used: ${response.toolResults.length > 0 ? response.toolResults.map(t => t.toolName).join(', ') : 'None'}`));
        console.log(chalk.yellow(`   Processing Time: ${processingTime}ms`));
        
        // Show tool results if any
        if (response.toolResults.length > 0) {
          console.log(chalk.yellow(`\n🔧 Tool Results:`));
          response.toolResults.forEach((result, index) => {
            const status = result.success ? chalk.green('✓') : chalk.red('✗');
            console.log(chalk.yellow(`   ${status} ${result.toolName}: ${result.success ? 'Success' : result.error}`));
          });
        }
        
        console.log('');
        
      } catch (error) {
        console.log(chalk.red('❌ Error processing your request:'));
        console.log(chalk.red(error instanceof Error ? error.message : String(error)));
        console.log('');
      }
      
      this.rl.prompt();
    });
    
    this.rl.on('close', () => {
      console.log(chalk.green('\n👋 Goodbye! Have a great day!'));
      process.exit(0);
    });
  }
}

// Main execution
if (require.main === module) {
  const cli = new BankingCLI();
  cli.start().catch(console.error);
}

export { BankingCLI, BankingDatabase }; 