import {
  Agent,
  type AgentConfig,
  type StateConfig,
  type Context,
  type Tool,
  type LLMConfig,
  type ToolFunction,
} from "../src/index.js";

// Example: Customer Service Agent Configuration

// Define LLM Configuration
const defaultLLMConfig: LLMConfig = {
  provider: "groq",
  model: "llama3-8b-8192",
  temperature: 0.6,
  maxTokens: 500,
};

// Define Contexts
const contexts: Context[] = [
  {
    key: "company_info",
    description: "Basic company information",
    content: `
Company: TechCorp Solutions
Founded: 2020
Business: Software development and consulting
Support Hours: Mon-Fri 9AM-6PM EST
Contact: support@techcorp.com
    `,
    priority: 100,
  },
  {
    key: "policy_info",
    description: "Company policies",
    content: `
Return Policy: 30-day money-back guarantee
Shipping: Free shipping on orders over $50
Warranty: 1-year manufacturer warranty on all products
Refund Processing: 3-5 business days
    `,
    priority: 90,
  },
  {
    key: "current_time",
    description: "Current timestamp",
    content: () => new Date().toISOString(),
    priority: 50,
  },
];

// Define Tools
const tools: Tool[] = [
  {
    type: "function",
    function: {
      name: "check_order_status",
      description: "Check the status of a customer order",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The order ID to check",
          },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_support_ticket",
      description: "Create a support ticket for customer issues",
      parameters: {
        type: "object",
        properties: {
          issue: {
            type: "string",
            description: "Description of the customer issue",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Priority level of the issue",
          },
          customerEmail: {
            type: "string",
            description: "Customer email address",
          },
        },
        required: ["issue", "priority", "customerEmail"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_product_info",
      description: "Get detailed information about a product",
      parameters: {
        type: "object",
        properties: {
          productId: {
            type: "string",
            description: "Product ID or name to look up",
          },
        },
        required: ["productId"],
      },
    },
  },
];

// Define State Machine
const states: StateConfig[] = [
  {
    key: "customer_support",
    description: "Main customer support state",
    prompt: "You are a helpful customer support agent for TechCorp Solutions.",
    contexts: ["company_info", "current_time"],
    children: [
      {
        key: "order_inquiry",
        description: "Handle order-related questions and issues",
        prompt: "Focus on helping customers with their orders, shipping, and delivery questions.",
        tools: ["check_order_status"],
        contexts: ["policy_info"],
      },
      {
        key: "product_support",
        description: "Provide product information and technical support",
        prompt: "Help customers understand our products and resolve technical issues.",
        tools: ["lookup_product_info", "create_support_ticket"],
      },
      {
        key: "general_inquiry",
        description: "Handle general questions about the company and policies",
        prompt: "Answer general questions about company policies, procedures, and services.",
        contexts: ["policy_info"],
      },
      {
        key: "complaint_resolution",
        description: "Handle customer complaints and escalation requests",
        prompt: "Handle customer complaints with empathy and professionalism. Always create a support ticket for complaints.",
        tools: ["create_support_ticket"],
        contexts: ["policy_info"],
        onEnter: async ({ userQuery }) => {
          // Only enter complaint resolution if keywords suggest complaint
          const complaintKeywords = ["complaint", "unhappy", "terrible", "awful", "angry", "frustrated"];
          return complaintKeywords.some(keyword => 
            userQuery.toLowerCase().includes(keyword)
          );
        },
      },
    ],
  },
];

// Create Agent Configuration
const agentConfig: AgentConfig = {
  states,
  contexts,
  tools,
  defaultLLMConfig,
  maxToolIterations: 3,
};

// Tool Implementations
const toolImplementations: Record<string, ToolFunction> = {
  check_order_status: async ({ orderId }: { orderId: string }) => {
    // Simulate order lookup
    const orderStatuses = ["processing", "shipped", "delivered", "cancelled"];
    const randomStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    
    return {
      orderId,
      status: randomStatus,
      estimatedDelivery: randomStatus === "shipped" ? "2024-01-15" : null,
      trackingNumber: randomStatus === "shipped" ? "TK123456789" : null,
    };
  },

  create_support_ticket: async ({ 
    issue, 
    priority, 
    customerEmail 
  }: { 
    issue: string; 
    priority: string; 
    customerEmail: string; 
  }) => {
    // Simulate ticket creation
    const ticketId = `TICKET-${Date.now()}`;
    
    return {
      ticketId,
      issue,
      priority,
      customerEmail,
      status: "open",
      createdAt: new Date().toISOString(),
      expectedResolution: "2-3 business days",
    };
  },

  lookup_product_info: async ({ productId }: { productId: string }) => {
    // Simulate product lookup
    const products = {
      "dev-toolkit": {
        name: "Developer Toolkit Pro",
        price: "$299",
        description: "Complete development environment with IDE, debugger, and testing tools",
        features: ["Multi-language support", "Advanced debugging", "Version control integration"],
        inStock: true,
      },
      "cloud-suite": {
        name: "Cloud Management Suite",
        price: "$199/month",
        description: "Comprehensive cloud infrastructure management platform",
        features: ["Auto-scaling", "Cost optimization", "Security monitoring"],
        inStock: true,
      },
    };

    return products[productId as keyof typeof products] || {
      error: "Product not found",
      suggestion: "Please check the product ID or browse our catalog",
    };
  },
};

// Example Usage Function
export async function runCustomerServiceExample() {
  // Create agent
  const agent = new Agent(agentConfig);
  
  // Register tool implementations
  agent.registerTools(toolImplementations);

  // Example conversations
  const examples = [
    {
      query: "Hi, can you check the status of my order ABC123?",
      description: "Order inquiry example",
    },
    {
      query: "I'm having trouble with the Developer Toolkit Pro. Can you help?",
      description: "Product support example",
    },
    {
      query: "What's your return policy?",
      description: "General inquiry example",
    },
    {
      query: "I'm really frustrated with my recent purchase. This is terrible!",
      description: "Complaint handling example",
    },
  ];

  console.log("🤖 Customer Service Agent Demo\n");

  for (const example of examples) {
    console.log(`\n--- ${example.description} ---`);
    console.log(`User: ${example.query}`);
    
    try {
      const result = await agent.processQuery(example.query);
      
      console.log(`Agent (${result.selectedState.key}): ${result.response}`);
      console.log(`Confidence: ${result.confidence}%`);
      console.log(`Reasoning: ${result.reasoning}`);
      
      if (result.toolResults.length > 0) {
        console.log("Tool Results:");
        result.toolResults.forEach((toolResult) => {
          console.log(`  - ${toolResult.toolName}: ${JSON.stringify(toolResult.result, null, 2)}`);
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCustomerServiceExample().catch(console.error);
} 