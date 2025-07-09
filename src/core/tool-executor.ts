import type { Tool, ToolResult } from "../types.js";

export type ToolFunction = (args: any) => any | Promise<any>;

export class ToolExecutor {
  private toolFunctions: Map<string, ToolFunction>;

  constructor() {
    this.toolFunctions = new Map();
  }

  /**
   * Register a tool function implementation
   */
  registerTool(toolName: string, implementation: ToolFunction): void {
    this.toolFunctions.set(toolName, implementation);
  }

  /**
   * Register multiple tool function implementations
   */
  registerTools(tools: Record<string, ToolFunction>): void {
    for (const [name, implementation] of Object.entries(tools)) {
      this.registerTool(name, implementation);
    }
  }

  /**
   * Execute a tool call and return the result
   */
  async executeTool(
    toolName: string,
    args: any
  ): Promise<ToolResult> {
    const implementation = this.toolFunctions.get(toolName);

    if (!implementation) {
      return {
        toolName,
        success: false,
        result: null,
        error: `Tool '${toolName}' is not registered`,
      };
    }

    try {
      // Parse arguments if they're a string
      let parsedArgs = args;
      if (typeof args === "string") {
        try {
          parsedArgs = JSON.parse(args);
        } catch (parseError) {
          return {
            toolName,
            success: false,
            result: null,
            error: `Failed to parse tool arguments: ${parseError}`,
          };
        }
      }

      // Execute the tool function
      const result = await implementation(parsedArgs);

      return {
        toolName,
        success: true,
        result,
      };
    } catch (error) {
      return {
        toolName,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute multiple tool calls in parallel
   */
  async executeTools(
    toolCalls: Array<{ name: string; args: any }>
  ): Promise<ToolResult[]> {
    const promises = toolCalls.map((call) =>
      this.executeTool(call.name, call.args)
    );

    return Promise.all(promises);
  }

  /**
   * Execute multiple tool calls sequentially
   */
  async executeToolsSequentially(
    toolCalls: Array<{ name: string; args: any }>
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      const result = await this.executeTool(call.name, call.args);
      results.push(result);
    }

    return results;
  }

  /**
   * Get list of registered tool names
   */
  getRegisteredTools(): string[] {
    return Array.from(this.toolFunctions.keys());
  }

  /**
   * Check if a tool is registered
   */
  isToolRegistered(toolName: string): boolean {
    return this.toolFunctions.has(toolName);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolName: string): boolean {
    return this.toolFunctions.delete(toolName);
  }

  /**
   * Clear all registered tools
   */
  clearTools(): void {
    this.toolFunctions.clear();
  }

  /**
   * Format tool results for LLM consumption
   */
  formatToolResultsForLLM(results: ToolResult[]): string {
    return results
      .map((result) => {
        if (result.success) {
          return `Tool: ${result.toolName}
Result: ${typeof result.result === "object" 
  ? JSON.stringify(result.result, null, 2) 
  : result.result}`;
        } else {
          return `Tool: ${result.toolName}
Error: ${result.error}`;
        }
      })
      .join("\n\n");
  }

  /**
   * Create tool result messages for conversation history
   */
  createToolResultMessages(
    results: ToolResult[]
  ): Array<{ role: "tool"; content: string; toolName: string }> {
    return results.map((result) => ({
      role: "tool" as const,
      content: result.success
        ? typeof result.result === "object"
          ? JSON.stringify(result.result, null, 2)
          : String(result.result)
        : `Error: ${result.error}`,
      toolName: result.toolName,
    }));
  }
} 