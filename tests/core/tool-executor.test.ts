import { describe, it, expect, beforeEach } from "bun:test";
import { ToolExecutor } from '../../src/core/tool-executor.js';
import { mockToolImplementations, isValidToolResult } from '../utils/test-helpers.js';

describe('ToolExecutor', () => {
  let toolExecutor: ToolExecutor;

  beforeEach(() => {
    toolExecutor = new ToolExecutor();
  });

  describe('constructor', () => {
    it('should create a ToolExecutor instance', () => {
      expect(toolExecutor).toBeInstanceOf(ToolExecutor);
    });
  });

  describe('registerTool', () => {
    it('should register a single tool implementation', () => {
      const testTool = async ({ input }: { input: string }) => {
        return { result: `Processed: ${input}` };
      };

      expect(() => {
        toolExecutor.registerTool('test_tool', testTool);
      }).not.toThrow();
    });

    it('should allow overriding existing tool implementations', () => {
      const firstImpl = async () => ({ result: 'first' });
      const secondImpl = async () => ({ result: 'second' });

      toolExecutor.registerTool('test_tool', firstImpl);
      toolExecutor.registerTool('test_tool', secondImpl);

      // Should not throw and should use the latest implementation
      expect(() => {
        toolExecutor.registerTool('test_tool', secondImpl);
      }).not.toThrow();
    });
  });

  describe('registerTools', () => {
    it('should register multiple tools at once', () => {
      expect(() => {
        toolExecutor.registerTools(mockToolImplementations);
      }).not.toThrow();
    });

    it('should register tools with different signatures', () => {
      const multipleTools = {
        simple_tool: async () => ({ result: 'simple' }),
        complex_tool: async ({ a, b, options }: { a: number; b: number; options?: any }) => ({
          result: a + b,
          options,
        }),
        async_tool: async ({ delay }: { delay: number }) => {
          await new Promise(resolve => setTimeout(resolve, delay));
          return { result: 'delayed' };
        },
      };

      expect(() => {
        toolExecutor.registerTools(multipleTools);
      }).not.toThrow();
    });
  });

  describe('executeTool', () => {
    beforeEach(() => {
      toolExecutor.registerTools(mockToolImplementations);
    });

    it('should execute a registered tool successfully', async () => {
      const result = await toolExecutor.executeTool('test_tool', { input: 'hello', count: 2 });

      expect(result).toBeDefined();
      expect(isValidToolResult(result)).toBe(true);
      expect(result.success).toBe(true);
      expect(result.toolName).toBe('test_tool');
      expect(result.result).toEqual({
        result: 'Test tool executed with input: hello, count: 2',
        success: true,
      });
    });

    it('should execute math tool with different operations', async () => {
      const addResult = await toolExecutor.executeTool('math_tool', {
        operation: 'add',
        a: 5,
        b: 3,
      });

      expect(addResult.success).toBe(true);
      expect(addResult.result).toEqual({
        result: 8,
        operation: 'add',
        a: 5,
        b: 3,
      });

      const multiplyResult = await toolExecutor.executeTool('math_tool', {
        operation: 'multiply',
        a: 4,
        b: 6,
      });

      expect(multiplyResult.success).toBe(true);
      expect(multiplyResult.result.result).toBe(24);
    });

    it('should handle tool execution errors gracefully', async () => {
      const result = await toolExecutor.executeTool('math_tool', {
        operation: 'invalid_operation',
        a: 1,
        b: 2,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown operation: invalid_operation');
    });

    it('should handle unregistered tools', async () => {
      const result = await toolExecutor.executeTool('nonexistent_tool', { input: 'test' });

      expect(result.success).toBe(false);
      expect(result.toolName).toBe('nonexistent_tool');
      expect(result.error).toContain("Tool 'nonexistent_tool' is not registered");
      expect(result.result).toBeNull();
    });

    it('should parse string arguments correctly', async () => {
      const result = await toolExecutor.executeTool('test_tool', '{"input": "string_arg"}');

      expect(result.success).toBe(true);
      expect(result.result.result).toContain('string_arg');
    });

    it('should handle invalid JSON string arguments', async () => {
      const result = await toolExecutor.executeTool('test_tool', 'invalid json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse tool arguments');
    });

    it('should handle tools that throw errors', async () => {
      const errorTool = async () => {
        throw new Error('Tool execution failed');
      };

      toolExecutor.registerTool('error_tool', errorTool);

      const result = await toolExecutor.executeTool('error_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool execution failed');
    });

    it('should handle tools that return promises', async () => {
      const asyncTool = async ({ delay }: { delay: number }) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return { result: 'async completed', delay };
      };

      toolExecutor.registerTool('async_tool', asyncTool);

      const result = await toolExecutor.executeTool('async_tool', { delay: 10 });

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        result: 'async completed',
        delay: 10,
      });
    });

    it('should handle tools with no arguments', async () => {
      const noArgTool = async () => {
        return { result: 'no args needed' };
      };

      toolExecutor.registerTool('no_arg_tool', noArgTool);

      const result = await toolExecutor.executeTool('no_arg_tool', {});

      expect(result.success).toBe(true);
      expect(result.result.result).toBe('no args needed');
    });

    it('should handle tools with optional parameters', async () => {
      const result = await toolExecutor.executeTool('test_tool', { input: 'test' });

      expect(result.success).toBe(true);
      expect(result.result.result).toContain('count: 1'); // Default value
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined arguments', async () => {
      const nullTool = async (args: any) => {
        return { args, type: typeof args };
      };

      toolExecutor.registerTool('null_tool', nullTool);

      const nullResult = await toolExecutor.executeTool('null_tool', null);
      expect(nullResult.success).toBe(true);

      const undefinedResult = await toolExecutor.executeTool('null_tool', undefined);
      expect(undefinedResult.success).toBe(true);
    });

    it('should handle circular references in arguments', async () => {
      const circularTool = async (args: any) => {
        return { received: typeof args };
      };

      toolExecutor.registerTool('circular_tool', circularTool);

      const circularObj: any = { prop: 'value' };
      circularObj.self = circularObj;

      const result = await toolExecutor.executeTool('circular_tool', circularObj);
      expect(result.success).toBe(true);
    });

    it('should handle very large argument objects', async () => {
      const largeTool = async (args: any) => {
        return { argCount: Object.keys(args).length };
      };

      toolExecutor.registerTool('large_tool', largeTool);

      const largeArgs = {};
      for (let i = 0; i < 1000; i++) {
        (largeArgs as any)[`key_${i}`] = `value_${i}`;
      }

      const result = await toolExecutor.executeTool('large_tool', largeArgs);
      expect(result.success).toBe(true);
      expect(result.result.argCount).toBe(1000);
    });

    it('should handle tools that return non-serializable objects', async () => {
      const nonSerializableTool = async () => {
        const result = {
          date: new Date(),
          func: () => 'function',
          symbol: Symbol('test'),
        };
        return result;
      };

      toolExecutor.registerTool('non_serializable_tool', nonSerializableTool);

      const result = await toolExecutor.executeTool('non_serializable_tool', {});
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should handle multiple concurrent tool executions', async () => {
      const concurrentTool = async ({ id, delay }: { id: number; delay: number }) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return { id, completed: true };
      };

      toolExecutor.registerTool('concurrent_tool', concurrentTool);

      const promises = Array.from({ length: 10 }, (_, i) =>
        toolExecutor.executeTool('concurrent_tool', { id: i, delay: Math.random() * 50 })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.result.id).toBe(index);
      });
    });

    it('should not leak memory with many tool registrations', () => {
      const initialToolCount = (toolExecutor as any).toolFunctions?.size || 0;

      // Register many tools
      for (let i = 0; i < 100; i++) {
        toolExecutor.registerTool(`tool_${i}`, async () => ({ result: i }));
      }

      const newToolCount = (toolExecutor as any).toolFunctions?.size || 0;
      expect(newToolCount).toBe(initialToolCount + 100);

      // Re-register the same tools (should not increase count)
      for (let i = 0; i < 100; i++) {
        toolExecutor.registerTool(`tool_${i}`, async () => ({ result: i + 1000 }));
      }

      const finalToolCount = (toolExecutor as any).toolFunctions?.size || 0;
      expect(finalToolCount).toBe(initialToolCount + 100);
    });
  });
}); 