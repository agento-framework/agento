# Intent Reasoning Enhancement

## Overview

This enhancement includes the intent analysis reasoning in the LLM prompt **and stores it in conversation history**, enabling the intent analyzer to learn from past reasoning patterns and make better decisions over time.

## Key Features

### 1. **Reasoning Stored in Conversation History**
Intent reasoning is now stored alongside user messages in conversation history, creating a learning feedback loop.

### 2. **Intent Analyzer Learning**
The intent analyzer can reference previous intent decisions to improve current analysis quality.

### 3. **Enhanced LLM Context**
The final LLM receives both current intent reasoning and historical reasoning patterns in conversation context.

## Benefits

### 1. **Enhanced Context Understanding**
The LLM receives explicit information about the reasoning behind state selection, leading to more contextually appropriate responses.

### 2. **Improved Decision Making Over Time**
When the LLM understands why it was selected for a task, it can make better decisions about:
- Which tools to use
- How to respond to the user
- What information to prioritize

### 3. **Intent Analysis Learning**
The intent analyzer learns from previous decisions:
- Recognizes conversation patterns
- Improves accuracy for similar future queries
- Maintains consistency across related interactions

### 4. **Self-Correction Capability**
If the intent analysis was slightly off-target, the LLM can understand the intended direction and adjust its response accordingly.

### 5. **Better Debugging and Transparency**
The reasoning provides insight into the decision-making process for both developers and users.

## Example: Before vs After

### Before (without conversation history reasoning):
```
System Message:
You are a professional banking AI assistant...

--- Intent Analysis ---
Selected State: balance_inquiry (85% confidence)
Reasoning: User is asking about account balance

--- Context ---
BANKING OPERATIONS EXPERTISE:
```

### After (with conversation history reasoning):
```
System Message:
You are a professional banking AI assistant...

--- Intent Analysis ---
Selected State: transfer_services (92% confidence)
Reasoning: User is following through on planned transfer after previous balance check, continuing established workflow pattern

--- Context ---
Conversation History:
user: Check my balance for ACC001
  [Intent Reasoning: User wants to verify funds before planned transfer]
assistant: Your account ACC001 has a balance of $2,540.75
user: Transfer $500 to savings account
  [Intent Reasoning: User is following through on planned transfer after balance check, continuing established workflow pattern]
```

## Real-World Impact Examples

### Scenario 1: Multi-Step Banking Workflow
```
Step 1:
User: "Check if I have enough for rent"
Intent: balance_inquiry
Reasoning: "User needs to verify available funds for specific purpose"

Step 2: 
User: "Transfer $1200 to my checking"
Intent: transfer_services  
Reasoning: "User is executing planned transfer after balance verification, following established rent payment pattern"
```

### Scenario 2: Learning User Patterns
```
Session 1:
User: "Show my spending"
Intent: spending_analysis
Reasoning: "User wants spending analysis"

Session 2:
User: "Show my spending" 
Intent: spending_analysis
Reasoning: "User consistently requests spending analysis, familiar with this feature"

Session 3:
User: "How much did I spend?"
Intent: spending_analysis  
Reasoning: "Based on previous patterns, user typically wants spending analysis rather than simple transaction history"
```

### Scenario 3: Context Continuation
```
User: "I need to pay my credit card"
Intent: transfer_services
Reasoning: "Credit card payment requires transfer functionality"

User: "Actually, show me the balance first"
Intent: balance_inquiry
Reasoning: "User wants to verify funds before proceeding with previously planned credit card payment"

User: "Okay, go ahead with the payment"  
Intent: transfer_services
Reasoning: "User is continuing with original credit card payment plan after balance verification"
```

## Technical Implementation

### 1. Enhanced Type Definitions
```typescript
export interface StoredMessage {
  // ... existing fields ...
  /** Intent reasoning for user messages (optional) */
  intentReasoning?: string;
}

export interface AgentContext {
  conversationHistory: Array<{
    role: "user" | "assistant" | "tool";
    content: string;
    intentReasoning?: string; // New field
    // ... other fields ...
  }>;
}
```

### 2. Enhanced Message Storage
```typescript
// Store user message with intent reasoning
await this.conversationManager.storeMessage(sessionId, "user", userQuery, { 
  metadata,
  intentReasoning: intentAnalysis.reasoning 
});
```

### 3. Intent Analyzer Enhancement
```typescript
// Pass conversation history with intent reasoning
const intentAnalysis = await this.intentAnalyzer.analyzeIntentWithContext(
  userId,
  userQuery,
  effectiveHistory.map((h) => ({ 
    role: h.role, 
    content: h.content,
    intentReasoning: h.intentReasoning // Historical reasoning included
  })),
  metadata
);
```

### 4. Enhanced Conversation Context
```typescript
// Intent analyzer now sees previous reasoning patterns
const conversationContext = conversationHistory
  .map((msg) => {
    let msgStr = `${msg.role}: ${msg.content}`;
    if (msg.intentReasoning && msg.role === 'user') {
      msgStr += `\n  [Intent Reasoning: ${msg.intentReasoning}]`;
    }
    return msgStr;
  })
  .join("\n");
```

## Performance Considerations

### Token Usage
- **Added Tokens**: ~100-200 tokens per request (includes historical reasoning)
- **Token Efficiency**: High value-to-token ratio due to learning benefits
- **Context Limit**: Works well with reduced `maxContextTokens: 2000`

### Learning Benefits
- **Improved Accuracy**: Better state selection over time
- **Pattern Recognition**: Identifies user workflow patterns
- **Consistency**: More consistent decisions across similar contexts

### Storage Impact
- **Minimal Overhead**: Small additional field per user message
- **High Value**: Enables powerful learning capabilities
- **Optional**: Only stored for user messages with intent analysis

## Banking CLI Examples

### Multi-Step Workflow Learning
```
User Session:
1. "Check my balance" 
   → Intent: balance_inquiry
   → Reasoning: "User wants account balance information"

2. "Transfer $500 to savings"
   → Intent: transfer_services  
   → Reasoning: "User proceeding with transfer after balance check, typical pre-transfer verification pattern"

3. "Show me the transfer confirmation"
   → Intent: transaction_history
   → Reasoning: "User wants confirmation of recently completed transfer, following post-transfer verification pattern"
```

### Pattern Recognition
```
Multiple Sessions Show Pattern:
- User often checks balance before transfers
- User prefers spending analysis over raw transaction history  
- User typically verifies large transactions

Intent Analyzer Learns:
- "Check balance before transfer" → Higher confidence for balance_inquiry
- "Show spending" → Prefer spending_analysis over transaction_history
- "Verify transaction" → Look for transaction_history or account_details
```

## Migration Guide

### For Existing Applications
1. **Type Updates**: Update conversation history types to include `intentReasoning?`
2. **Storage Schema**: Add optional `intent_reasoning` column to message tables
3. **Backward Compatibility**: All changes are additive and optional

### Database Migration (PostgreSQL)
```sql
-- Add intent reasoning column (optional)
ALTER TABLE conversation_messages 
ADD COLUMN intent_reasoning TEXT;

-- Create index for intent reasoning queries (optional)
CREATE INDEX idx_messages_intent_reasoning 
ON conversation_messages(intent_reasoning) 
WHERE intent_reasoning IS NOT NULL;
```

## Configuration

No additional configuration required - this enhancement works with existing settings:

```typescript
const agent = new Agent({
  // ... existing configuration ...
  conversationConfig: {
    storage,
    maxWorkingMemoryMessages: 25, // Includes intent reasoning
    enableSummarization: true,
    maxContextTokens: 2000, // Sufficient for enhanced context
  }
});
```

## Future Enhancements

### 1. **Intent Reasoning Analytics**
- Track intent reasoning patterns across users
- Identify common reasoning chains
- Optimize state selection algorithms

### 2. **Reasoning Quality Metrics**
- Measure reasoning accuracy over time
- A/B test different reasoning strategies
- Automatic reasoning quality improvement

### 3. **Cross-Session Learning**
- Learn patterns across user sessions
- Personalized intent analysis per user
- Long-term user behavior modeling

This enhancement creates a powerful feedback loop that significantly improves the framework's intelligence and user experience over time. 