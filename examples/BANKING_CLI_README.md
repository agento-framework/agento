# 🏦 SecureBank AI Assistant - Comprehensive Banking CLI

A complete banking agent CLI application showcasing the full capabilities of the Agento framework, including document tools, temporal operations, and secure financial processing.

## 🌟 Features

### 🔐 Security & Compliance
- **Multi-factor Authentication** - Account verification with customer details
- **Data Privacy Protection** - Sensitive information masking
- **Regulatory Compliance** - FDIC, AML, KYC compliance built-in
- **Audit Trail Logging** - Complete transaction logging
- **Encrypted Data Handling** - Secure data processing

### 💰 Banking Services

#### Account Management
- **Balance Inquiries** - Real-time balance checking
- **Account Details** - Comprehensive account information
- **Multi-Account Support** - Checking, Savings, Business, Credit accounts
- **Account Status Management** - Active, frozen, closed status tracking

#### Transaction Processing
- **Transaction History** - Detailed transaction records with search
- **Fund Transfers** - Secure account-to-account transfers
- **Payment Processing** - Bill payments and merchant transactions
- **Transaction Categorization** - Automatic expense categorization
- **Real-time Balance Updates** - Instant balance calculations

#### Financial Reports & Analytics
- **Account Statements** - Detailed monthly/quarterly statements
- **Spending Analysis** - Category-based expense analysis
- **Financial Insights** - Spending patterns and projections
- **Tax Documents** - Year-end tax document generation
- **Data Export** - CSV, JSON, and PDF export capabilities

#### Document Generation
- **Statement Generation** - Professional account statements
- **Transaction Reports** - Customizable transaction reports
- **Financial Summaries** - Comprehensive financial analysis
- **Backup & Archive** - Secure data backup and archival

### 🤖 AI-Powered Assistance
- **Natural Language Processing** - Conversational banking interface
- **Intent Recognition** - Smart query understanding
- **Context Awareness** - Maintains conversation context
- **Proactive Suggestions** - Intelligent financial recommendations

## 🚀 Quick Start

### Prerequisites
- Bun runtime installed
- Groq API key for LLM services

### Installation
```bash
# Clone and navigate to the project
cd agento-version-2

# Install dependencies
bun install

# Set your API key
export GROQ_API_KEY="your_groq_api_key_here"

# Run the banking CLI
bun run run-bank-cli.ts
```

### Sample Data
The application comes pre-loaded with sample data:

**Customers:**
- John Doe (Customer ID: CUST001)
  - Checking Account: ACC001 ($2,540.75)
  - Savings Account: ACC002 ($15,750.50)
- Jane Smith (Customer ID: CUST002)
  - Checking Account: ACC003 ($4,820.30)
  - Credit Account: ACC004 (-$1,250.00)

## 📋 Usage Examples

### Basic Operations
```
SecureBank> Check balance for account ACC001
SecureBank> Show transaction history for ACC001
SecureBank> Transfer $500 from ACC001 to ACC002
SecureBank> List all accounts for customer CUST001
```

### Advanced Analytics
```
SecureBank> Analyze my spending patterns for this quarter
SecureBank> Generate monthly statement for ACC001 from 2024-01-01 to 2024-01-31
SecureBank> Search for all coffee shop transactions
SecureBank> Export my transaction history to CSV file
```

### Report Generation
```
SecureBank> Create a financial report for all my accounts
SecureBank> Generate year-end tax documents
SecureBank> Save my account statement to a PDF file
SecureBank> Create a spending analysis report
```

### Customer Service
```
SecureBank> Update my contact information
SecureBank> Check my account status and security settings
SecureBank> What are the current interest rates?
SecureBank> Help me understand my credit card charges
```

## 🎨 CLI Interface Features

### Beautiful ASCII Art Headers
- Professional banking logo on startup
- Clear section dividers
- Color-coded information display

### Intelligent Formatting
- **Green**: Success messages, positive balances
- **Red**: Errors, negative balances, warnings
- **Yellow**: Important information, amounts
- **Blue**: System messages, processing indicators
- **Cyan**: Headers, prompts, sections

### Interactive Help System
```
SecureBank> help
```
Displays comprehensive command examples and usage instructions.

### Real-time Processing Indicators
- Processing time display
- Tool usage analytics
- Confidence scoring
- State transition tracking

## 🏗️ Architecture

### Agent State Hierarchy
```
banking_hub
├── account_services
│   ├── account_inquiry
│   └── account_management
├── transaction_services
│   ├── transaction_history
│   ├── transfer_money
│   └── payment_processing
├── reporting_services
│   ├── statement_generation
│   ├── financial_analysis
│   └── tax_documents
└── customer_service
    ├── profile_management
    ├── dispute_resolution
    └── product_information
```

### Built-in Tools Integration
- **Document Tools**: File read/write, CSV/JSON parsing, report generation
- **Temporal Tools**: Date/time handling, business day calculations
- **Banking Tools**: Account management, transaction processing, analytics

### Security Contexts
- **Banking Expert**: Professional banking knowledge
- **Security Protocols**: Authentication and fraud prevention
- **Regulatory Compliance**: Banking regulations and compliance

## 🔧 Advanced Features

### Document Generation
The application can generate various financial documents:

```typescript
// Generate account statement
await agent.processQuery('user', 
  'Generate a detailed statement for ACC001 from January 1st to January 31st and save it as a JSON file'
);

// Create spending analysis
await agent.processQuery('user',
  'Analyze my quarterly spending and create a CSV report with category breakdowns'
);

// Export transaction data
await agent.processQuery('user',
  'Export all my transactions from last year to a spreadsheet file'
);
```

### Custom Analytics
The system provides intelligent financial insights:

- **Spending Categorization**: Automatic transaction categorization
- **Trend Analysis**: Monthly/quarterly spending trends
- **Budget Recommendations**: AI-powered budget suggestions
- **Fraud Detection**: Unusual transaction pattern detection

### Multi-Format Support
- **JSON**: Structured data export
- **CSV**: Spreadsheet-compatible format
- **Text**: Human-readable reports
- **Markdown**: Rich-formatted documents

## 🛡️ Security Implementation

### Data Protection
- Account numbers are masked (****1234)
- SSN and sensitive data are never displayed
- Transaction amounts are properly validated
- All operations require account verification

### Banking Compliance
- **KYC (Know Your Customer)**: Customer verification processes
- **AML (Anti-Money Laundering)**: Transaction monitoring
- **BSA (Bank Secrecy Act)**: Reporting requirements
- **FDIC**: Federal deposit insurance compliance

### Audit Logging
Every operation is logged with:
- Timestamp
- User identification
- Operation type
- Result status
- Tool usage metrics

## 🔮 Future Enhancements

### Planned Features
- **Real Bank Integration**: Connect to actual banking APIs
- **Mobile Notifications**: Push notifications for transactions
- **Investment Tracking**: Portfolio management capabilities
- **Loan Processing**: Loan application and management
- **Cryptocurrency Support**: Digital asset management
- **Biometric Authentication**: Advanced security features

### Integration Capabilities
- **External APIs**: Third-party service integration
- **Database Connectivity**: Enterprise database support
- **Cloud Storage**: Secure cloud backup integration
- **Reporting Services**: Advanced analytics platforms

## 🚨 Important Notes

### Demo Application
This is a demonstration application with mock data. Do not use with real financial information.

### API Key Security
Always keep your API keys secure and never commit them to version control.

### Production Considerations
For production use, implement:
- Real database connectivity
- Enhanced security measures
- Proper encryption at rest and in transit
- Compliance with local banking regulations
- Professional audit and testing

## 🤝 Contributing

To extend the banking CLI:

1. Add new tools in the `bankingTools` array
2. Implement tool functions in `bankingToolImplementations`
3. Update state hierarchy as needed
4. Add appropriate security checks
5. Update documentation

## 📞 Support

For questions about the banking CLI implementation:
- Check the [Agento Framework Documentation](../docs/)
- Review the [Document Tools Guide](../docs/DOCUMENT_TOOLS_GUIDE.md)
- Examine the source code in `comprehensive-bank-cli.ts`

---

**SecureBank AI Assistant** - Powered by Agento Framework 🚀 