# Tool Iteration Prevention Guide

## Problem: Maximum Tool Iterations Error

The "Maximum tool iterations reached without completion" error occurs when the LLM gets stuck in a loop calling tools without providing a final response. This typically happens due to:

1. **Tool Chains**: One tool result leads to another tool call, creating endless chains
2. **Ambiguous Completion**: LLM doesn't know when it has enough information
3. **Over-Engineering**: LLM calls unnecessary tools to "be thorough"
4. **Redundant Operations**: Multiple tools that provide similar information

## Solution: Multi-Layered Prevention System

### 1. **Increased Tool Iteration Limit**
```typescript
maxToolIterations: 8  // Increased from default 5
```
- Accommodates legitimate complex banking workflows
- Provides buffer for multi-step operations like transfers or reporting

### 2. **Task Completion Guidance Context**
High-priority context (98) that teaches the LLM when to stop:

```
TASK COMPLETION GUIDELINES:
- Use the MINIMUM number of tools necessary
- After getting required information, provide a response
- If you have enough information to answer, STOP and respond

Tool Usage Patterns:
- Single Information Request: Use 1 tool maximum
- Account Verification: Use 1-2 tools maximum  
- Complex Operations: Use 2-3 tools maximum
- Reporting Tasks: Use 2-4 tools maximum
```

### 3. **Tool Usage Optimization Context**
High-priority context (97) that prevents redundant tool calls:

```
PROHIBITED TOOL COMBINATIONS:
- verify_account + get_account_balance (choose ONE)
- customer_lookup + get_customer_accounts_by_session (redundant)
- get_account_details + get_account_balance (details includes balance)
```

### 4. **Atomic State Design**
Each leaf state has a single, specific purpose with clear completion criteria:

#### Before (Vague):
```typescript
{
  key: "balance_inquiry",
  prompt: "Provide account balance information. Verify account ownership..."
}
```

#### After (Atomic):
```typescript
{
  key: "balance_inquiry", 
  prompt: "Your ONLY task is to get and display the account balance. If account number is provided, use get_account_balance and respond immediately. Do not call additional tools after getting the balance."
}
```

### 5. **Clear Tool Sequencing Rules**

#### Account Operations:
- **Balance Check**: `get_account_balance` → respond (1 tool)
- **Account Details**: `get_account_details` → respond (1 tool)  
- **List Accounts**: `get_customer_accounts_by_session` → respond (1 tool)

#### Transaction Operations:
- **Transaction History**: `get_transaction_history` → respond (1 tool)
- **Fund Transfer**: `transfer_funds` → respond (1 tool)
- **Spending Analysis**: `analyze_spending` → respond (1 tool)

#### Reporting Operations:
- **Generate Statement**: `generate_statement` → `write_file` (optional) → respond (1-2 tools)
- **Export Data**: `get_transaction_history` → `write_file` → respond (2 tools)

## Implementation Results

### Common User Scenarios

#### ✅ Efficient: "Check my balance"
```
Flow: Ask for account number → get_account_balance → respond
Tools Used: 1
Result: Quick, efficient response
```

#### ✅ Efficient: "Show my accounts"  
```
Flow: get_customer_accounts_by_session → respond
Tools Used: 1
Result: Complete account list
```

#### ✅ Efficient: "Transfer $500 from ACC001 to ACC002"
```
Flow: transfer_funds → respond
Tools Used: 1  
Result: Transfer completed with confirmation
```

#### ❌ Prevented: Over-Engineering Pattern
```
Old Flow: verify_account → customer_lookup → get_account_balance → get_account_details → respond
Tools Used: 4 (EXCESSIVE)

New Flow: get_account_balance → respond  
Tools Used: 1 (EFFICIENT)
```

### Error Prevention Examples

#### Scenario 1: Balance Inquiry Loop Prevention
**User Request**: "What's my balance?"

**Old Problematic Flow**:
1. `customer_lookup` (to identify customer)
2. `list_customer_accounts` (to see accounts)  
3. `verify_account` (to verify each account)
4. `get_account_balance` (finally get balance)
5. `get_account_details` (to be thorough)
6. **ERROR: Max iterations reached**

**New Optimized Flow**:
1. Ask: "Which account balance would you like me to check?"
2. `get_account_balance` → respond
3. **Complete in 1 tool call**

#### Scenario 2: Transfer Loop Prevention
**User Request**: "Transfer money to my savings"

**Old Problematic Flow**:
1. `customer_lookup` (identify customer)
2. `list_customer_accounts` (find accounts)
3. `verify_account` (verify source)
4. `verify_account` (verify destination)  
5. `get_account_balance` (check funds)
6. `transfer_funds` (execute transfer)
7. `get_account_balance` (confirm new balance)
8. **ERROR: Max iterations reached**

**New Optimized Flow**:
1. Ask: "Which account would you like to transfer from and how much?"
2. `transfer_funds` → respond with confirmation
3. **Complete in 1 tool call**

### Context Priority System
```
task_completion_guidance: 98    (Highest - when to stop)
tool_usage_optimization: 97    (Very High - how to be efficient)  
security_protocols: 95         (High - security requirements)
account_operations: 90         (Medium - specific procedures)
```

Higher priority contexts are more likely to be included when token limits are reached, ensuring efficiency guidance is always available.

### Debugging Tool Iteration Issues

#### Signs of Potential Issues:
1. **Sequential Tool Calls**: Same type of tool called multiple times
2. **Information Redundancy**: Getting the same data through different tools
3. **Verification Loops**: Multiple verification steps for simple operations
4. **Exploration Behavior**: Calling tools to "see what's available"

#### Monitoring and Prevention:
1. **Tool Call Patterns**: Watch for repeated tool types
2. **Response Timing**: Long processing times indicate potential loops
3. **State Selection**: Ensure intent analysis selects atomic states
4. **Context Effectiveness**: Monitor if efficiency contexts are being followed

### Best Practices for Adding New States

#### 1. Single Responsibility
Each state should have ONE clear purpose:
```typescript
// Good
{
  key: "check_balance",
  description: "Check account balance only"
}

// Bad  
{
  key: "account_management", 
  description: "Handle all account-related operations"
}
```

#### 2. Clear Completion Criteria
State prompts should specify when the task is complete:
```typescript
prompt: "Get account balance using get_account_balance and respond immediately. Do not call additional tools."
```

#### 3. Tool Limitations
Specify maximum number of tools expected:
```typescript
prompt: "Generate report using generate_statement, optionally save with write_file, then respond. Maximum 2 tools total."
```

#### 4. Prohibited Actions
Explicitly state what NOT to do:
```typescript
prompt: "Do not call verify_account if you're only checking balance. Do not call multiple account tools for the same request."
```

## Conclusion

This multi-layered approach prevents tool iteration loops through:

1. **Clear Guidance**: High-priority contexts that teach efficiency
2. **Atomic States**: Single-purpose states with clear completion criteria  
3. **Tool Limitations**: Explicit limits and prohibited combinations
4. **Increased Buffer**: Higher iteration limit for legitimate complex operations

The result is a system that completes user requests efficiently while maintaining security and accuracy, virtually eliminating the "maximum tool iterations" error. 