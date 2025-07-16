import { describe, it, expect, beforeEach } from "bun:test";
import { StateMachine } from '../../src/core/state-machine.js';
import type { StateConfig, Context, Tool, LLMConfig } from '../../src/types.js';
import { 
  mockLLMConfig, 
  mockContexts, 
  mockTools, 
  mockStates,
  createTestStateConfig,
  isValidStateConfig 
} from '../utils/test-helpers.js';

describe('StateMachine', () => {
  let stateMachine: StateMachine;

  beforeEach(() => {
    stateMachine = new StateMachine(
      mockStates,
      mockContexts,
      mockTools,
      mockLLMConfig
    );
  });

  describe('constructor', () => {
    it('should create a StateMachine instance', () => {
      expect(stateMachine).toBeInstanceOf(StateMachine);
    });

    it('should accept valid configuration', () => {
      const customStates: StateConfig[] = [
        createTestStateConfig({
          key: 'custom_state',
          description: 'Custom test state',
        }),
      ];

      const customStateMachine = new StateMachine(
        customStates,
        mockContexts,
        mockTools,
        mockLLMConfig
      );

      expect(customStateMachine).toBeInstanceOf(StateMachine);
    });
  });

  describe('getLeafStates', () => {
    it('should return all leaf states (states without children)', () => {
      const leafStates = stateMachine.getLeafStates();
      
      expect(leafStates).toBeDefined();
      expect(Array.isArray(leafStates)).toBe(true);
      expect(leafStates.length).toBeGreaterThan(0);

      // Check that all returned states are leaf states
      leafStates.forEach(state => {
        expect(state.isLeaf).toBe(true);
        expect(state.key).toBeDefined();
        expect(state.description).toBeDefined();
        expect(state.fullPrompt).toBeDefined();
        expect(state.llmConfig).toBeDefined();
        expect(Array.isArray(state.contexts)).toBe(true);
        expect(Array.isArray(state.tools)).toBe(true);
        expect(Array.isArray(state.path)).toBe(true);
      });
    });

    it('should include states from nested children', () => {
      const leafStates = stateMachine.getLeafStates();
      const stateKeys = leafStates.map(state => state.key);
      
      // Should include leaf states from nested structure
      expect(stateKeys).toContain('math_helper');
      expect(stateKeys).toContain('specific_helper');
    });

    it('should not include parent states that have children', () => {
      const leafStates = stateMachine.getLeafStates();
      const stateKeys = leafStates.map(state => state.key);
      
      // Should not include parent states
      expect(stateKeys).not.toContain('root');
      expect(stateKeys).not.toContain('general_assistant');
    });
  });

  describe('getLeafStateTree', () => {
    it('should return a simplified tree structure for intent analysis', () => {
      const tree = stateMachine.getLeafStateTree();
      
      expect(Array.isArray(tree)).toBe(true);
      expect(tree.length).toBeGreaterThan(0);

      tree.forEach(item => {
        expect(item).toHaveProperty('key');
        expect(item).toHaveProperty('description');
        expect(typeof item.key).toBe('string');
        expect(typeof item.description).toBe('string');
      });
    });

    it('should only include leaf states in the tree', () => {
      const tree = stateMachine.getLeafStateTree();
      const leafStates = stateMachine.getLeafStates();
      
      expect(tree.length).toBe(leafStates.length);
      
      const treeKeys = tree.map(item => item.key);
      const leafKeys = leafStates.map(state => state.key);
      
      expect(treeKeys.sort()).toEqual(leafKeys.sort());
    });
  });

  describe('resolveState', () => {
    it('should properly resolve state inheritance', () => {
      const states: StateConfig[] = [
        {
          key: 'parent',
          description: 'Parent state',
          prompt: 'Parent prompt.',
          contexts: ['test_context'],
          children: [
            {
              key: 'child',
              description: 'Child state',
              prompt: 'Child prompt.',
              tools: ['test_tool'],
              contexts: ['dynamic_context'],
            },
          ],
        },
      ];

      const testStateMachine = new StateMachine(
        states,
        mockContexts,
        mockTools,
        mockLLMConfig
      );

      const leafStates = testStateMachine.getLeafStates();
      const childState = leafStates.find(state => state.key === 'child');

      expect(childState).toBeDefined();
      if (childState) {
        // Should inherit prompt from parent and append child prompt
        expect(childState.fullPrompt).toContain('Parent prompt.');
        expect(childState.fullPrompt).toContain('Child prompt.');
        
        // Should have contexts from both parent and child
        const contextKeys = childState.contexts.map(ctx => ctx.key);
        expect(contextKeys).toContain('test_context');
        expect(contextKeys).toContain('dynamic_context');
        
        // Should have tools from child
        const toolNames = childState.tools.map(tool => tool.function.name);
        expect(toolNames).toContain('test_tool');
      }
    });

    it('should handle empty state configurations', () => {
      const minimalState: StateConfig = {
        key: 'minimal',
        description: 'Minimal state',
      };

      const testStateMachine = new StateMachine(
        [minimalState],
        [],
        [],
        mockLLMConfig
      );

      const leafStates = testStateMachine.getLeafStates();
      expect(leafStates).toHaveLength(1);
      
      const resolvedState = leafStates[0];
      expect(resolvedState.key).toBe('minimal');
      expect(resolvedState.description).toBe('Minimal state');
      expect(resolvedState.fullPrompt).toBe('');
      expect(resolvedState.contexts).toEqual([]);
      expect(resolvedState.tools).toEqual([]);
      expect(resolvedState.llmConfig).toEqual(mockLLMConfig);
    });

    it('should handle LLM config inheritance correctly', () => {
      const states: StateConfig[] = [
        {
          key: 'parent',
          description: 'Parent state',
          llmConfig: { temperature: 0.5 },
          children: [
            {
              key: 'child',
              description: 'Child state',
              llmConfig: { maxTokens: 2048 },
            },
          ],
        },
      ];

      const testStateMachine = new StateMachine(
        states,
        [],
        [],
        mockLLMConfig
      );

      const leafStates = testStateMachine.getLeafStates();
      const childState = leafStates.find(state => state.key === 'child');

      expect(childState).toBeDefined();
      if (childState) {
        // Should merge parent config, default config, and child config
        expect(childState.llmConfig.temperature).toBe(0.5); // From parent
        expect(childState.llmConfig.maxTokens).toBe(2048); // From child
        expect(childState.llmConfig.provider).toBe(mockLLMConfig.provider); // From default
        expect(childState.llmConfig.model).toBe(mockLLMConfig.model); // From default
      }
    });
  });

  describe('getAllContexts', () => {
    it('should return all available contexts', () => {
      const contexts = stateMachine.getAllContexts();
      
      expect(Array.isArray(contexts)).toBe(true);
      expect(contexts.length).toBeGreaterThanOrEqual(mockContexts.length);
      
      // Should include our mock contexts
      const contextKeys = contexts.map(ctx => ctx.key);
      expect(contextKeys).toContain('test_context');
      expect(contextKeys).toContain('dynamic_context');
    });
  });

  describe('getAllTools', () => {
    it('should return all available tools', () => {
      const tools = stateMachine.getAllTools();
      
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThanOrEqual(mockTools.length);
      
      // Should include our mock tools
      const toolNames = tools.map(tool => tool.function.name);
      expect(toolNames).toContain('test_tool');
      expect(toolNames).toContain('math_tool');
    });
  });

  describe('getStateByKey', () => {
    it('should return a resolved state by key', () => {
      const state = stateMachine.getStateByKey('math_helper');
      
      expect(state).toBeDefined();
      if (state) {
        expect(state.key).toBe('math_helper');
        expect(state.description).toBe('Help with math operations');
        expect(state.isLeaf).toBe(true);
      }
    });

    it('should return null for non-existent state', () => {
      const state = stateMachine.getStateByKey('non_existent');
      expect(state).toBeNull();
    });

    it('should return null for parent states (non-leaf)', () => {
      const state = stateMachine.getStateByKey('root');
      expect(state).toBeNull();
    });
  });

  describe('guard functions', () => {
    it('should handle states with guard functions', () => {
      const statesWithGuards: StateConfig[] = [
        {
          key: 'guarded_state',
          description: 'State with guards',
          onEnter: ({ metadata }) => metadata?.authorized === true,
          onLeave: () => true,
        },
      ];

      const testStateMachine = new StateMachine(
        statesWithGuards,
        [],
        [],
        mockLLMConfig
      );

      const leafStates = testStateMachine.getLeafStates();
      const guardedState = leafStates.find(state => state.key === 'guarded_state');

      expect(guardedState).toBeDefined();
      if (guardedState) {
        expect(guardedState.onEnter).toBeDefined();
        expect(guardedState.onLeave).toBeDefined();
        expect(typeof guardedState.onEnter).toBe('function');
        expect(typeof guardedState.onLeave).toBe('function');
      }
    });
  });

  describe('error handling', () => {
    it('should handle invalid context references gracefully', () => {
      const statesWithInvalidContext: StateConfig[] = [
        {
          key: 'invalid_context_state',
          description: 'State with invalid context',
          contexts: ['non_existent_context'],
        },
      ];

      expect(() => {
        new StateMachine(
          statesWithInvalidContext,
          mockContexts,
          mockTools,
          mockLLMConfig
        );
      }).not.toThrow();
    });

    it('should handle invalid tool references gracefully', () => {
      const statesWithInvalidTool: StateConfig[] = [
        {
          key: 'invalid_tool_state',
          description: 'State with invalid tool',
          tools: ['non_existent_tool'],
        },
      ];

      expect(() => {
        new StateMachine(
          statesWithInvalidTool,
          mockContexts,
          mockTools,
          mockLLMConfig
        );
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty state array', () => {
      expect(() => {
        new StateMachine([], [], [], mockLLMConfig);
      }).not.toThrow();
    });

    it('should handle deeply nested state hierarchies', () => {
      const deepStates: StateConfig[] = [
        {
          key: 'level1',
          description: 'Level 1',
          children: [
            {
              key: 'level2',
              description: 'Level 2',
              children: [
                {
                  key: 'level3',
                  description: 'Level 3',
                  children: [
                    {
                      key: 'level4',
                      description: 'Level 4',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const testStateMachine = new StateMachine(
        deepStates,
        mockContexts,
        mockTools,
        mockLLMConfig
      );

      const leafStates = testStateMachine.getLeafStates();
      expect(leafStates).toHaveLength(1);
      
      const deepState = leafStates[0];
      expect(deepState.key).toBe('level4');
      expect(deepState.path).toEqual(['level1', 'level2', 'level3', 'level4']);
    });

    it('should handle states with duplicate keys in different branches', () => {
      const statesWithDuplicates: StateConfig[] = [
        {
          key: 'branch1',
          description: 'Branch 1',
          children: [
            {
              key: 'duplicate',
              description: 'Duplicate in branch 1',
            },
          ],
        },
        {
          key: 'branch2',
          description: 'Branch 2',
          children: [
            {
              key: 'duplicate',
              description: 'Duplicate in branch 2',
            },
          ],
        },
      ];

      const testStateMachine = new StateMachine(
        statesWithDuplicates,
        [],
        [],
        mockLLMConfig
      );

      const leafStates = testStateMachine.getLeafStates();
      expect(leafStates).toHaveLength(2);
      
      const duplicateStates = leafStates.filter(state => state.key === 'duplicate');
      expect(duplicateStates).toHaveLength(2);
      
      // Should have different paths
      expect(duplicateStates[0].path).not.toEqual(duplicateStates[1].path);
    });
  });
}); 