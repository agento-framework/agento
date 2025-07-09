import type {
  StateConfig,
  ResolvedState,
  Context,
  Tool,
  LLMConfig,
  GuardFunction,
  EnhancedGuardFunction,
} from "../types.js";

export class StateMachine {
  private rootStates: StateConfig[];
  private contexts: Map<string, Context>;
  private tools: Map<string, Tool>;
  private defaultLLMConfig: LLMConfig;

  constructor(
    rootStates: StateConfig[],
    contexts: Context[],
    tools: Tool[],
    defaultLLMConfig: LLMConfig
  ) {
    this.rootStates = rootStates;
    this.contexts = new Map(contexts.map((c) => [c.key, c]));
    this.tools = new Map(tools.map((t) => [t.function.name, t]));
    this.defaultLLMConfig = defaultLLMConfig;
  }

  /**
   * Get all leaf states (states without children)
   */
  getLeafStates(): ResolvedState[] {
    const leafStates: ResolvedState[] = [];

    const traverse = (states: StateConfig[], parentPath: string[] = []) => {
      for (const state of states) {
        const currentPath = [...parentPath, state.key];

        if (!state.children || state.children.length === 0) {
          // This is a leaf state
          leafStates.push(this.resolveState(state, currentPath));
        } else {
          // Traverse children
          traverse(state.children, currentPath);
        }
      }
    };

    traverse(this.rootStates);
    return leafStates;
  }

  /**
   * Get a specific state by its path
   */
  getStateByPath(path: string[]): ResolvedState | null {
    let currentStates = this.rootStates;
    let currentPath: string[] = [];

    for (const key of path) {
      const state = currentStates.find((s) => s.key === key);
      if (!state) {
        return null;
      }

      currentPath.push(key);

      if (currentPath.length === path.length) {
        return this.resolveState(state, currentPath);
      }

      currentStates = state.children || [];
    }

    return null;
  }

  /**
   * Get a specific state by its key (searches all leaf states)
   */
  getStateByKey(key: string): ResolvedState | null {
    const leafStates = this.getLeafStates();
    return leafStates.find((state) => state.key === key) || null;
  }

  /**
   * Resolve a state configuration into a complete resolved state
   * with inherited properties from parent states
   */
  private resolveState(
    stateConfig: StateConfig,
    path: string[]
  ): ResolvedState {
    // Build inheritance chain from root to current state
    const inheritanceChain: StateConfig[] = [];
    let currentStates = this.rootStates;

    for (const key of path) {
      const state = currentStates.find((s) => s.key === key);
      if (state) {
        inheritanceChain.push(state);
        currentStates = state.children || [];
      }
    }

    // Merge properties from inheritance chain
    const mergedPrompts: string[] = [];
    const mergedContextKeys = new Set<string>();
    const mergedToolKeys = new Set<string>();
    let mergedLLMConfig = { ...this.defaultLLMConfig };
    let mergedMetadata: Record<string, any> = {};
    let currentOnEnter: GuardFunction | EnhancedGuardFunction | undefined;
    let currentOnLeave: GuardFunction | EnhancedGuardFunction | undefined;

    // Apply inheritance from root to leaf
    for (const state of inheritanceChain) {
      // Merge prompts (concatenate)
      if (state.prompt) {
        mergedPrompts.push(state.prompt);
      }

      // Merge contexts (additive)
      if (state.contexts) {
        state.contexts.forEach((ctx) => mergedContextKeys.add(ctx));
      }

      // Merge tools (additive)
      if (state.tools) {
        state.tools.forEach((tool) => mergedToolKeys.add(tool));
      }

      // Merge LLM config (override)
      if (state.llmConfig) {
        mergedLLMConfig = { ...mergedLLMConfig, ...state.llmConfig };
      }

      // Merge metadata (override)
      if (state.metadata) {
        mergedMetadata = { ...mergedMetadata, ...state.metadata };
      }

      // Guards from the final state take precedence
      if (state.onEnter) {
        currentOnEnter = state.onEnter;
      }
      if (state.onLeave) {
        currentOnLeave = state.onLeave;
      }
    }

    // Resolve context and tool references
    const resolvedContexts: Context[] = [];
    for (const contextKey of mergedContextKeys) {
      const context = this.contexts.get(contextKey);
      if (context) {
        resolvedContexts.push(context);
      }
    }

    const resolvedTools: Tool[] = [];
    for (const toolKey of mergedToolKeys) {
      const tool = this.tools.get(toolKey);
      if (tool) {
        resolvedTools.push(tool);
      }
    }

    // Sort contexts by priority (higher priority first)
    resolvedContexts.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return {
      key: stateConfig.key,
      description: stateConfig.description,
      fullPrompt: mergedPrompts.join("\n\n"),
      llmConfig: mergedLLMConfig,
      contexts: resolvedContexts,
      tools: resolvedTools,
      onEnter: currentOnEnter,
      onLeave: currentOnLeave,
      metadata: mergedMetadata,
      isLeaf: !stateConfig.children || stateConfig.children.length === 0,
      path,
    };
  }

  /**
   * Get all contexts available in the state machine
   */
  getAllContexts(): Context[] {
    return Array.from(this.contexts.values());
  }

  /**
   * Get all tools available in the state machine
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get complete state tree (all states, not just leaf states)
   */
  getStateTree(): Array<{
    key: string;
    description: string;
    path: string[];
    isLeaf: boolean;
  }> {
    const allStates: Array<{
      key: string;
      description: string;
      path: string[];
      isLeaf: boolean;
    }> = [];

    const traverseStates = (states: StateConfig[], parentPath: string[] = []) => {
      for (const state of states) {
        const currentPath = [...parentPath, state.key];
        const isLeaf = !state.children || state.children.length === 0;
        
        allStates.push({
          key: state.key,
          description: state.description,
          path: currentPath,
          isLeaf
        });

        if (state.children) {
          traverseStates(state.children, currentPath);
        }
      }
    };

    traverseStates(this.rootStates);
    return allStates;
  }

  /**
   * Get leaf state tree structure for intent analysis
   */
  getLeafStateTree(): Array<{ key: string; description: string; path: string[] }> {
    const allStates = this.getStateTree();
    return allStates
      .filter(state => state.isLeaf)
      .map(state => ({
        key: state.key,
        description: state.description,
        path: state.path
      }));
  }
} 