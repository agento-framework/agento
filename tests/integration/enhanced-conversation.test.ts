import { describe, it, expect, beforeEach } from 'bun:test';
import { Agent } from '../../src/core/agent';
import type { AgentConfig, StateConfig, Context, Tool } from '../../src/types';
import { InMemoryConversationStorage } from '../../examples/storage-implementations';

describe('Enhanced Conversation Integration', () => {
  let agent: Agent;
  let conversationStorage: InMemoryConversationStorage;

  beforeEach(() => {
    conversationStorage = new InMemoryConversationStorage();

    // Enhanced banking state configuration with conversation features
    const bankingStates: StateConfig[] = [
      {
        key: "banking_hub",
        description: "Main banking operations center with enhanced conversation",
        prompt: "You are a professional banking AI assistant with enhanced conversation capabilities. Maintain natural, fluent conversations while providing accurate banking services.",
        contexts: ["banking_expert", "conversation_flow", "personalization"],
        tools: ["get_account_balance", "verify_account"],
        children: [
          {
            key: "account_services",
            description: "Account management with personalized responses",
            prompt: "Handle account inquiries with personalized, context-aware responses that feel natural and engaging.",
            contexts: ["account_operations"],
            tools: ["get_account_details", "list_customer_accounts"],
            children: [
              {
                key: "balance_inquiry",
                description: "Check account balance with emotional intelligence",
                prompt: "Provide account balance information in a conversational, personalized manner that acknowledges the user's context and emotional state."
              }
            ]
          }
        ]
      }
    ];

    // Enhanced contexts with conversation intelligence
    const bankingContexts: Context[] = [
      {
        key: "banking_expert",
        description: "Enhanced banking expertise with conversation awareness",
        content: `ENHANCED BANKING OPERATIONS EXPERTISE:

Account Management with Emotional Intelligence:
- Always acknowledge user emotions and context
- Provide personalized responses based on user history
- Use natural conversation flow patterns
- Adapt technical complexity to user's demonstrated level

Customer Service Excellence:
- Recognize returning customers and reference previous interactions
- Use appropriate tone based on conversation context
- Provide proactive suggestions based on user patterns
- Maintain conversation continuity across sessions

Natural Conversation Patterns:
- Use conversational connectors ("I see", "Let me help", "That makes sense")
- Reference previous topics naturally
- Ask clarifying questions when appropriate
- Provide clear next steps and follow-up options

Personalization Features:
- Adapt response length to user preferences
- Match communication style (formal, casual, technical)
- Remember user preferences within conversations
- Build rapport through consistent interaction patterns`,
        priority: 100,
      },
      {
        key: "account_operations",
        description: "Account operations with enhanced user experience",
        content: `ENHANCED ACCOUNT OPERATIONS:

Conversation-Aware Account Access:
- Always greet returning users warmly
- Reference previous account interactions when relevant
- Use personalized language based on user communication style
- Provide context-appropriate level of detail

Emotional Intelligence in Banking:
- Recognize signs of frustration or confusion
- Adjust tone and approach based on user mood
- Provide reassurance for concerned users
- Celebrate successful transactions and positive outcomes

Natural Flow Patterns:
- Use smooth transitions between topics
- Acknowledge user questions before answering
- Provide clear explanations without being condescending
- Ask for confirmation when user seems uncertain

Account Information Delivery:
- Present information in user's preferred format
- Use examples when helpful for understanding
- Break down complex information into digestible steps
- Always include helpful next steps or suggestions`,
        priority: 90,
      }
    ];

    // Mock banking tools with enhanced responses
    const bankingTools: Tool[] = [
      {
        type: "function",
        function: {
          name: "get_account_balance",
          description: "Get account balance with enhanced user experience",
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
          name: "verify_account",
          description: "Verify account with personalized service",
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
          description: "Get comprehensive account details",
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
          description: "List all customer accounts",
          parameters: {
            type: "object",
            properties: {
              customerId: { type: "string", description: "Customer ID" }
            },
            required: ["customerId"]
          }
        }
      }
    ];

    const agentConfig: AgentConfig = {
      states: bankingStates,
      contexts: bankingContexts,
      tools: bankingTools,
      defaultLLMConfig: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        apiKey: process.env.GROQ_API_KEY || 'test-key',
        temperature: 0.6,
      },
      maxToolIterations: 5,
      conversationConfig: {
        storage: conversationStorage,
        maxWorkingMemoryMessages: 20,
        enableSummarization: true,
        maxContextTokens: 2000,
        defaultRelevanceStrategy: 'hybrid',
        enableEmbeddings: false,
      },
      enhancedResponseConfig: {
        enableConversationFlow: true,
        enablePersonalization: true,
        enableIterationPrevention: true,
        naturalLanguagePatterns: true,
        emotionalIntelligence: true,
      }
    };

    agent = new Agent(agentConfig);

    // Register enhanced banking tool implementations
    agent.registerTools({
      get_account_balance: async ({ accountNumber }: any) => ({
        success: true,
        result: {
          accountNumber,
          balance: 2540.75,
          accountType: 'checking',
          status: 'active',
          lastUpdated: new Date().toISOString()
        }
      }),

      verify_account: async ({ accountNumber }: any) => ({
        success: true,
        result: {
          accountNumber,
          verified: true,
          customerName: 'John Doe',
          accountType: 'checking',
          status: 'active'
        }
      }),

      get_account_details: async ({ accountNumber }: any) => ({
        success: true,
        result: {
          accountNumber,
          accountType: 'checking',
          balance: 2540.75,
          status: 'active',
          openDate: '2020-01-15',
          minimumBalance: 100,
          interestRate: 0.01,
          features: ['online_banking', 'mobile_deposits', 'overdraft_protection']
        }
      }),

      list_customer_accounts: async ({ customerId }: any) => ({
        success: true,
        result: {
          customerId,
          accounts: [
            { accountNumber: 'ACC001', type: 'checking', balance: 2540.75 },
            { accountNumber: 'ACC002', type: 'savings', balance: 15750.50 }
          ]
        }
      })
    });
  });

  describe('Enhanced Conversation Flow', () => {
    it('should provide natural, personalized responses for first-time user', async () => {
      const userId = 'first_time_user';
      const sessionId = 'session_001';

      const response = await agent.processQuery(
        userId,
        "Hi, I'd like to check my account balance please",
        sessionId,
        [],
        { isFirstTime: true }
      );

      expect(response.response).toBeDefined();
      expect(response.confidence).toBeGreaterThan(70);
      expect(response.selectedState.key).toContain('balance');
      
      // Should have a warm, welcoming tone for first-time user
      expect(response.response.toLowerCase()).toMatch(/(welcome|hello|hi|help)/);
      
      // Should ask for account number since not provided
      expect(response.response.toLowerCase()).toMatch(/(account number|which account)/);
    });

    it('should maintain conversation context across multiple turns', async () => {
      const userId = 'returning_user';
      const sessionId = 'session_002';

      // First interaction
      const response1 = await agent.processQuery(
        userId,
        "Hello, I need help with my banking",
        sessionId,
        [],
        { userType: 'returning' }
      );

      expect(response1.response).toBeDefined();

      // Second interaction - should reference the previous context
      const response2 = await agent.processQuery(
        userId,
        "Can you check my balance for account ACC001?",
        sessionId,
        [],
        { continuingConversation: true }
      );

      expect(response2.response).toBeDefined();
      expect(response2.toolResults.length).toBeGreaterThan(0);
      expect(response2.toolResults[0].toolName).toBe('get_account_balance');
      expect(response2.toolResults[0].success).toBe(true);
      
      // Should include the balance information
      expect(response2.response).toMatch(/2540\.75|\$2,?540\.75/);
    });

    it('should adapt tone based on conversation context', async () => {
      const userId = 'concerned_user';
      const sessionId = 'session_003';

      // User expresses concern
      const response = await agent.processQuery(
        userId,
        "I'm worried about some charges on my account. Can you help me understand them?",
        sessionId,
        [],
        { emotionalContext: 'concerned' }
      );

      expect(response.response).toBeDefined();
      expect(response.confidence).toBeGreaterThan(70);
      
      // Should use empathetic, reassuring tone
      expect(response.response.toLowerCase()).toMatch(/(understand|help|concern|worry|assist)/);
      
      // Should offer to get account details to help investigate
      expect(response.response.toLowerCase()).toMatch(/(account|details|transactions|review)/);
    });

    it('should prevent repetitive tool calls', async () => {
      const userId = 'repetitive_user';
      const sessionId = 'session_004';

      // First balance check
      const response1 = await agent.processQuery(
        userId,
        "What's my balance for ACC001?",
        sessionId,
        []
      );

      expect(response1.toolResults.length).toBeGreaterThan(0);

      // Immediate repeat of same query
      const response2 = await agent.processQuery(
        userId,
        "What's my balance for ACC001?",
        sessionId,
        []
      );

      // Should recognize repetition and potentially use cached result
      // or suggest alternative action
      expect(response2.response).toBeDefined();
    });

    it('should provide personalized suggestions based on user patterns', async () => {
      const userId = 'regular_user';
      const sessionId = 'session_005';

      // User checks balance regularly
      const response1 = await agent.processQuery(
        userId,
        "Check balance for ACC001",
        sessionId,
        [],
        { userPattern: 'frequent_balance_checker' }
      );

      expect(response1.response).toBeDefined();
      expect(response1.toolResults[0].success).toBe(true);

      // Follow-up interaction should include personalized suggestions
      const response2 = await agent.processQuery(
        userId,
        "Thanks, that's helpful",
        sessionId,
        [],
        { followUp: true }
      );

      expect(response2.response).toBeDefined();
      
      // Should offer relevant next steps or suggestions
      expect(response2.response.toLowerCase()).toMatch(/(anything else|help|additional|more)/);
    });

    it('should handle complex multi-step banking scenarios', async () => {
      const userId = 'complex_user';
      const sessionId = 'session_006';

      // Start with general inquiry
      const response1 = await agent.processQuery(
        userId,
        "I need to review my accounts and possibly make some changes",
        sessionId,
        []
      );

      expect(response1.response).toBeDefined();
      
      // Follow up with specific account request
      const response2 = await agent.processQuery(
        userId,
        "Can you show me all my accounts first?",
        sessionId,
        [],
        { complexScenario: true }
      );

      // Should attempt to list accounts, which requires customer ID
      expect(response2.response).toBeDefined();
      
      // Then ask for specific account details
      const response3 = await agent.processQuery(
        userId,
        "Tell me more about account ACC001",
        sessionId,
        []
      );

      expect(response3.response).toBeDefined();
      expect(response3.toolResults.some(t => t.toolName === 'get_account_details')).toBeTruthy();
    });

    it('should maintain emotional intelligence throughout conversation', async () => {
      const userId = 'emotional_user';
      const sessionId = 'session_007';

      // User starts frustrated
      const response1 = await agent.processQuery(
        userId,
        "This is really frustrating! I can't figure out why my account balance seems wrong!",
        sessionId,
        [],
        { emotionalState: 'frustrated' }
      );

      expect(response1.response).toBeDefined();
      
      // Should acknowledge frustration and offer help
      expect(response1.response.toLowerCase()).toMatch(/(understand|frustrating|help|sorry|apologize)/);
      
      // User calms down after help
      const response2 = await agent.processQuery(
        userId,
        "Okay, can you check account ACC001 please?",
        sessionId,
        [],
        { emotionalState: 'calmer' }
      );

      expect(response2.response).toBeDefined();
      expect(response2.toolResults.length).toBeGreaterThan(0);
      
      // Should maintain supportive but professional tone
      expect(response2.response.toLowerCase()).toMatch(/(of course|certainly|here|found)/);
    });
  });

  describe('Conversation Memory and Learning', () => {
    it('should remember user preferences within session', async () => {
      const userId = 'pref_user';
      const sessionId = 'session_008';

      // User demonstrates preference for brief responses
      const response1 = await agent.processQuery(
        userId,
        "Just the balance please",
        sessionId,
        [],
        { prefersBrief: true }
      );

      expect(response1.response).toBeDefined();

      // Later query should maintain brief style
      const response2 = await agent.processQuery(
        userId,
        "And account details?",
        sessionId,
        []
      );

      expect(response2.response).toBeDefined();
      // Response should be more concise based on learned preference
    });

    it('should track conversation topics and provide relevant context', async () => {
      const userId = 'topic_user';
      const sessionId = 'session_009';

      // Discuss balance
      const response1 = await agent.processQuery(
        userId,
        "What's my current balance?",
        sessionId,
        []
      );

      // Move to related topic
      const response2 = await agent.processQuery(
        userId,
        "Are there any recent transactions?",
        sessionId,
        []
      );

      expect(response2.response).toBeDefined();
      
      // Should reference the previous balance discussion
      expect(response2.response.toLowerCase()).toMatch(/(balance|account|recent|previous)/);
    });
  });

  describe('Error Handling with Natural Conversation', () => {
    it('should handle tool failures gracefully with empathetic responses', async () => {
      const userId = 'error_user';
      const sessionId = 'session_010';

      // Override tool to simulate failure
      agent.registerTool('get_account_balance', async () => ({
        success: false,
        error: 'Account service temporarily unavailable'
      }));

      const response = await agent.processQuery(
        userId,
        "Check my balance for ACC001",
        sessionId,
        []
      );

      expect(response.response).toBeDefined();
      
      // Should acknowledge the issue empathetically and suggest alternatives
      expect(response.response.toLowerCase()).toMatch(/(sorry|apologize|issue|problem|try)/);
      expect(response.response.toLowerCase()).toMatch(/(alternative|later|again|different)/);
    });

    it('should provide helpful guidance when user is confused', async () => {
      const userId = 'confused_user';
      const sessionId = 'session_011';

      const response = await agent.processQuery(
        userId,
        "I don't really know what I need... something about my money?",
        sessionId,
        [],
        { userState: 'confused' }
      );

      expect(response.response).toBeDefined();
      
      // Should provide gentle guidance and options
      expect(response.response.toLowerCase()).toMatch(/(help|options|can|balance|accounts|transactions)/);
      expect(response.response.toLowerCase()).toMatch(/(what|which|how)/);
    });
  });

  describe('Conversation Analytics', () => {
    it('should track conversation effectiveness metrics', async () => {
      const userId = 'metrics_user';
      const sessionId = 'session_012';

      const response = await agent.processQuery(
        userId,
        "Show me my account balance for ACC001",
        sessionId,
        []
      );

      expect(response.response).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.selectedState).toBeDefined();
      expect(response.reasoning).toBeDefined();
      
      // Should have tool results for balance inquiry
      expect(response.toolResults.length).toBeGreaterThan(0);
      expect(response.toolResults[0].success).toBe(true);
    });

    it('should provide insights into conversation patterns', async () => {
      const userId = 'pattern_user';
      const sessionId = 'session_013';

      // Multiple interactions to establish patterns
      await agent.processQuery(userId, "Check balance ACC001", sessionId, []);
      await agent.processQuery(userId, "Account details ACC001", sessionId, []);
      await agent.processQuery(userId, "Balance again ACC001", sessionId, []);

      const finalResponse = await agent.processQuery(
        userId,
        "What can you tell me about my usage patterns?",
        sessionId,
        []
      );

      expect(finalResponse.response).toBeDefined();
      // Should recognize the pattern of repeated balance and detail checks
    });
  });
}); 