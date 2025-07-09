import type { IntentAnalysis, LLMConfig } from "../types";
import type { LLMMessage } from "../llm/providers";
import { createLLMProvider } from "../llm/providers";
import { StateMachine } from "./state-machine";

export class IntentAnalyzer {
  private llmProvider;
  private stateMachine: StateMachine;

  constructor(
    analyzerLLMConfig: LLMConfig,
    stateMachine: StateMachine
  ) {
    this.llmProvider = createLLMProvider(analyzerLLMConfig);
    this.stateMachine = stateMachine;
  }

  /**
   * Extract and parse JSON from LLM response, handling cases where extra text is included
   */
  private parseIntentResponse(responseContent: string): any {
    // First try to parse as-is
    try {
      return JSON.parse(responseContent.trim());
    } catch {
      // If that fails, try to extract JSON from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          // If JSON parsing still fails, try to find the largest JSON-like structure
          const matches = responseContent.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
          if (matches && matches.length > 0) {
            // Try parsing the largest match
            const largestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
            return JSON.parse(largestMatch);
          }
        }
      }
      throw new Error("No valid JSON found in response");
    }
  }

  /**
   * Analyze user query and determine the most appropriate leaf state
   */
  async analyzeIntent(userQuery: string): Promise<IntentAnalysis> {
    const leafStates = this.stateMachine.getLeafStateTree();
    
    // Build context about available states
    const stateDescriptions = leafStates
      .map((state) => {
        const pathStr = state.path.join(" > ");
        return `- ${state.key} (${pathStr}): ${state.description}`;
      })
      .join("\n");

    const systemPrompt = `You are an expert intent analyzer for an AI agent system. Your job is to analyze user queries and determine which specific leaf state should handle the request.

Available leaf states and their descriptions:
${stateDescriptions}

Your task:
1. Analyze the user's query to understand their intent
2. Select the MOST APPROPRIATE leaf state that can best handle this intent
3. Provide a confidence score (0-100) for your selection
4. Explain your reasoning

CRITICAL: You MUST respond with ONLY a JSON object, no additional text before or after.

IMPORTANT RULES:
- You MUST select one of the provided leaf state keys
- Consider the full path context when making decisions
- Higher specificity is better than generality
- If multiple states could work, choose the most specific one
- Confidence should reflect how certain you are about the match

Respond with a JSON object in this exact format:
{
  "selectedStateKey": "exact_key_from_list",
  "confidence": 85,
  "reasoning": "Brief explanation of why this state was chosen"
}`;

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Please analyze this query: "${userQuery}"` },
    ];

    try {
      const response = await this.llmProvider.generateResponse(messages);
      
      // Parse the JSON response
      const result = this.parseIntentResponse(response.content);
      
      // Validate the response
      if (!result.selectedStateKey || typeof result.confidence !== 'number' || !result.reasoning) {
        throw new Error("Invalid response format from intent analyzer");
      }

      // Verify the selected state exists
      const selectedState = this.stateMachine.getStateByKey(result.selectedStateKey);
      if (!selectedState) {
        console.error(`Selected state '${result.selectedStateKey}' does not exist. Available leaf states:`, leafStates.map(s => s.key));
        console.error('Full LLM response was:', response.content);
        console.error('Parsed result was:', result);
        
        // Check if the selected state is a parent state
        const allStates = this.stateMachine.getStateTree();
        const isParentState = allStates.find(s => s.key === result.selectedStateKey && !leafStates.find(l => l.key === s.key));
        
        if (isParentState) {
          console.error(`ERROR: LLM selected parent state '${result.selectedStateKey}' instead of a leaf state. This is not allowed.`);
          console.error('Available leaf states are:', leafStates.map(s => `${s.key} (${s.path.join(' > ')})`));
          
          // Try to find a suitable child state
          const childStates = leafStates.filter(s => s.path.includes(result.selectedStateKey));
          if (childStates.length > 0) {
            console.log(`Auto-correcting to first child state: ${childStates[0].key}`);
            return {
              selectedStateKey: childStates[0].key,
              confidence: Math.max(10, result.confidence - 20),
              reasoning: `Auto-corrected from parent state '${result.selectedStateKey}' to child state '${childStates[0].key}'. Original reasoning: ${result.reasoning}`,
            };
          }
        }
        
        throw new Error(`Selected state '${result.selectedStateKey}' does not exist`);
      }

      return {
        selectedStateKey: result.selectedStateKey,
        confidence: result.confidence,
        reasoning: result.reasoning,
      };
    } catch (error) {
      // Fallback: return the first available state with low confidence
      console.error("Intent analysis failed:", error);
      
      if (leafStates.length > 0) {
        return {
          selectedStateKey: leafStates[0].key,
          confidence: 10,
          reasoning: "Fallback selection due to analysis error",
        };
      }
      
      throw new Error("No states available and intent analysis failed");
    }
  }

  /**
   * Analyze intent with additional context (conversation history, metadata)
   */
  async analyzeIntentWithContext(
    userId: string,
    userQuery: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    metadata: Record<string, any> = {}
  ): Promise<IntentAnalysis> {
    const leafStates = this.stateMachine.getLeafStateTree();
    
    // Debug logging
    console.log('Available leaf states for intent analysis:', leafStates.map(s => ({ key: s.key, description: s.description, path: s.path })));
    
    // Build context about available states
    const stateDescriptions = leafStates
      .map((state) => {
        const pathStr = state.path.join(" > ");
        return `- ${state.key} (${pathStr}): ${state.description}`;
      })
      .join("\n");

    // Build conversation context
    const conversationContext = conversationHistory.length > 0
      ? `\n\nConversation History:\n${conversationHistory
          .slice(-5) // Last 5 messages
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join("\n")}`
      : "";

    // Build metadata context
    const metadataContext = Object.keys(metadata).length > 0
      ? `\n\nAdditional Context:\n${Object.entries(metadata)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")}`
      : "";

    const systemPrompt = `You are an expert intent analyzer for an AI agent system. Your job is to analyze user queries and determine which specific leaf state should handle the request.

Available leaf states and their descriptions:
${stateDescriptions}${conversationContext}${metadataContext}

CRITICAL INSTRUCTIONS:
1. You MUST select ONLY from the leaf state keys listed above
2. These are the ONLY valid options: ${leafStates.map(s => s.key).join(', ')}
3. DO NOT select parent/intermediate states - only the specific leaf states shown
4. Analyze the user's query to understand their intent
5. Consider the conversation history and additional context
6. Select the MOST APPROPRIATE leaf state that can best handle this intent
7. Provide a confidence score (0-100) for your selection
8. Explain your reasoning

RESPONSE FORMAT:
You MUST respond with ONLY a JSON object, no additional text before or after.

IMPORTANT RULES:
- You MUST select one of these exact leaf state keys: ${leafStates.map(s => s.key).join(', ')}
- Consider the full path context when making decisions
- Use conversation history to understand context and continuation
- Higher specificity is better than generality
- If multiple states could work, choose the most specific one
- Confidence should reflect how certain you are about the match

Respond with a JSON object in this exact format:
{
  "selectedStateKey": "exact_key_from_list",
  "confidence": 85,
  "reasoning": "Brief explanation of why this state was chosen"
}`;

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Please analyze this query: "${userQuery}"` },
    ];

    try {
      const response = await this.llmProvider.generateResponse(messages);
      
      console.log('LLM response for intent analysis:', response.content);
      
      // Parse the JSON response
      const result = this.parseIntentResponse(response.content);
      
      console.log('Parsed intent result:', result);
      
      // Validate the response
      if (!result.selectedStateKey || typeof result.confidence !== 'number' || !result.reasoning) {
        throw new Error("Invalid response format from intent analyzer");
      }

      // Verify the selected state exists
      const selectedState = this.stateMachine.getStateByKey(result.selectedStateKey);
      if (!selectedState) {
        console.error(`Selected state '${result.selectedStateKey}' does not exist. Available leaf states:`, leafStates.map(s => s.key));
        console.error('Full LLM response was:', response.content);
        console.error('Parsed result was:', result);
        
        // Check if the selected state is a parent state
        const allStates = this.stateMachine.getStateTree();
        const isParentState = allStates.find(s => s.key === result.selectedStateKey && !leafStates.find(l => l.key === s.key));
        
        if (isParentState) {
          console.error(`ERROR: LLM selected parent state '${result.selectedStateKey}' instead of a leaf state. This is not allowed.`);
          console.error('Available leaf states are:', leafStates.map(s => `${s.key} (${s.path.join(' > ')})`));
          
          // Try to find a suitable child state
          const childStates = leafStates.filter(s => s.path.includes(result.selectedStateKey));
          if (childStates.length > 0) {
            console.log(`Auto-correcting to first child state: ${childStates[0].key}`);
            return {
              selectedStateKey: childStates[0].key,
              confidence: Math.max(10, result.confidence - 20),
              reasoning: `Auto-corrected from parent state '${result.selectedStateKey}' to child state '${childStates[0].key}'. Original reasoning: ${result.reasoning}`,
            };
          }
        }
        
        throw new Error(`Selected state '${result.selectedStateKey}' does not exist`);
      }

      return {
        selectedStateKey: result.selectedStateKey,
        confidence: result.confidence,
        reasoning: result.reasoning,
      };
    } catch (error) {
      // Fallback: return the first available state with low confidence
      console.error("Intent analysis failed:", error);
      
      if (leafStates.length > 0) {
        console.log('Falling back to first available leaf state:', leafStates[0].key);
        return {
          selectedStateKey: leafStates[0].key,
          confidence: 10,
          reasoning: "Fallback selection due to analysis error",
        };
      }
      
      throw new Error("No states available and intent analysis failed");
    }
  }
} 