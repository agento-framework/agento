# 🏦 SecureBank AI Customer Service Demo

This CLI application demonstrates the full capabilities of the Agento Framework through a realistic bank customer service agent simulation.

## 🚀 Quick Start

### Prerequisites
1. **Node.js 18+** installed
2. **Groq API Key** - Get one free at [console.groq.com](https://console.groq.com)

### Setup & Run

1. **Install dependencies:**
```bash
npm install
```

2. **Set your Groq API key:**
```bash
export GROQ_API_KEY="your-groq-api-key-here"
```

3. **Run the demo:**
```bash
npm run demo:bank
```

4. **Run with debug info:**
```bash
npm run demo:bank:debug
```

## 🎯 Demo Features

### 🧠 Framework Capabilities Demonstrated

✅ **State-Based Intent Routing**
- Automatically routes to appropriate banking services
- Account Services, Transfers, Card Services, General Support

✅ **Guard Functions & Security**
- Account verification required for sensitive operations
- Contextual security checks

✅ **Tool Integration**
- Real-time account balance checking
- Transaction history retrieval
- Fund transfers between accounts
- Card issue reporting
- Support ticket creation

✅ **Conversation Persistence**
- Maintains context across the entire session
- Intelligent message history management
- Session summarization for long conversations

✅ **Hierarchical State Inheritance**
- Banking policies inherited across all states
- Security guidelines applied contextually

### 🏦 Banking Features

**Account Services:**
- Check account balance
- View transaction history
- Search transactions by merchant
- Account validation

**Transfer & Payments:**
- Transfer funds between accounts
- Payment processing
- Transaction assistance

**Card Services:**
- Card information and status
- Report lost/stolen cards
- Fraud reporting
- Card issue resolution

**General Support:**
- Create support tickets
- General banking information
- Policy information

## 📊 Demo Accounts

The demo includes two pre-configured accounts for testing:

### Account 1: John Doe
- **Account Number:** `12345`
- **Type:** Checking Account
- **Balance:** $2,547.83
- **Card:** **** **** **** 1234 (Active)
- **Status:** Regular Customer

### Account 2: Jane Smith
- **Account Number:** `67890`
- **Type:** Savings Account
- **Balance:** $15,247.92
- **Card:** **** **** **** 5678 (Active)
- **Status:** VIP Customer

## 🎮 How to Use

### 1. Start a Conversation
```
💬 Customer > Hello, I need help with my account
```

### 2. Provide Account Number
The system will ask for your account number for security:
```
💬 Customer > My account number is 12345
```

### 3. Try Different Banking Services

**Check Balance:**
```
💬 Customer > What's my account balance?
```

**View Transactions:**
```
💬 Customer > Show me my recent transactions
```

**Transfer Money:**
```
💬 Customer > I want to transfer $100 to account 67890
```

**Card Issues:**
```
💬 Customer > My card was stolen
```

**General Help:**
```
💬 Customer > I need help setting up online banking
```

### 4. Special Commands

- `help` - Show help information
- `session` - View session details and conversation history
- `clear` - Clear screen and show welcome message
- `exit` or `quit` - Exit the application

## 🔍 Technical Highlights

### State Machine Architecture
The demo showcases a sophisticated 4-level state hierarchy:

```
banking (root)
├── account_services (with account validation guard)
├── transfers_payments (with security guards)
├── card_services
└── general_support
```

### Intelligent Context Management
- **Automatic account validation** when account numbers are mentioned
- **Security-aware routing** to appropriate states
- **Conversation persistence** maintains context across interactions

### Tool Integration
The demo implements 8 banking tools:
- `getAccountBalance` - Real-time balance checking
- `getTransactionHistory` - Historical transaction data
- `transferFunds` - Inter-account transfers
- `getCardInfo` - Card status and information
- `reportCardIssue` - Card problem reporting
- `createSupportTicket` - Issue escalation
- `validateAccount` - Security verification
- `searchTransactions` - Transaction search

### LLM Configuration
- **Provider:** Groq (Mixtral-8x7B-32768)
- **Temperature:** 0.1 (for consistent banking responses)
- **Context Management:** Intelligent token optimization
- **Conversation Memory:** Hybrid relevance strategy

## 🏗️ Architecture Deep Dive

### Security Model
```typescript
// Account validation guard
onEnter: async ({ metadata }) => {
  if (!metadata?.accountValidated) {
    return {
      allowed: false,
      reason: 'Account verification required',
      customMessage: 'Please provide your account number for security.'
    };
  }
  return { allowed: true };
}
```

### Tool Implementation Example
```typescript
const getAccountBalance: ToolFunction = async ({ accountNumber }) => {
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
};
```

### Conversation Persistence
```typescript
conversationConfig: {
  storage: new InMemoryConversationStorage(),
  maxWorkingMemoryMessages: 20,
  enableSummarization: true,
  maxContextTokens: 6000,
  defaultRelevanceStrategy: 'hybrid',
}
```

## 🧪 Testing Scenarios

### 1. Basic Account Inquiry
Test the fundamental banking operations and state routing.

### 2. Multi-Account Transfer
Demonstrate tool chaining and validation across multiple accounts.

### 3. Security Scenarios
Test guard functions and security-aware routing.

### 4. Long Conversation
Test conversation persistence and summarization with many interactions.

### 5. Error Handling
Test with invalid account numbers and edge cases.

## 🔧 Customization

### Adding New Banking Services
1. **Create new tool function** in `bankTools`
2. **Add tool definition** to agent configuration
3. **Update state configuration** to include the tool
4. **Implement business logic** in the tool function

### Modifying States
Edit the state configuration in `createBankAgent()` function to:
- Add new banking service categories
- Modify prompts and behaviors
- Adjust security requirements
- Change tool associations

### Database Integration
Replace `mockDatabase` with real database connections:
- PostgreSQL for transaction data
- Redis for session caching
- External banking APIs for real-time data

## 🎯 Key Takeaways

This demo showcases how the Agento Framework enables:

1. **Sophisticated Routing** - Intent-based navigation to appropriate services
2. **Security Integration** - Guard functions for sensitive operations
3. **Tool Orchestration** - Seamless integration with banking APIs
4. **Conversation Memory** - Context-aware interactions across sessions
5. **Production Readiness** - Error handling, validation, and user experience

The framework's design makes it easy to build production-grade conversational AI applications with complex business logic and security requirements.

## 📝 Next Steps

- Explore the conversation persistence guide in `CONVERSATION_PERSISTENCE_GUIDE.md`
- Review storage implementations in `storage-implementations.ts`
- Check out the full framework documentation in the main README

For questions or issues, refer to the main framework documentation or create an issue in the repository. 