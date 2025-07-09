# Use Cases and Real-World Examples

## 🏦 Banking & Financial Services

### Customer Service Agent

A sophisticated banking agent that handles account inquiries, transactions, and support with security controls.

```typescript
import { Agent, type StateConfig, type Context, type Tool } from 'agento-framework';

// Banking contexts
const bankingContexts: Context[] = [
  {
    key: "banking_policies",
    description: "Bank policies and procedures",
    content: `
      SecureBank Policies:
      - Account verification required for sensitive operations
      - Transactions over $10,000 require additional verification
      - Business hours: Monday-Friday 8 AM - 6 PM EST
      - Emergency support available 24/7 for fraud reports
    `,
    priority: 100
  },
  {
    key: "security_guidelines", 
    description: "Security and compliance guidelines",
    content: `
      Security Guidelines:
      - Never share full account numbers in responses
      - Always verify customer identity before account access
      - Log all financial transactions
      - Escalate suspicious activity immediately
    `,
    priority: 95
  }
];

// Banking tools
const bankingTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "getAccountBalance",
      description: "Get current account balance for verified customer",
      parameters: {
        type: "object",
        properties: {
          accountNumber: { type: "string", description: "Customer account number" }
        },
        required: ["accountNumber"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "transferFunds",
      description: "Transfer funds between accounts",
      parameters: {
        type: "object",
        properties: {
          fromAccount: { type: "string", description: "Source account number" },
          toAccount: { type: "string", description: "Destination account number" },
          amount: { type: "number", description: "Transfer amount" },
          description: { type: "string", description: "Transfer description" }
        },
        required: ["fromAccount", "toAccount", "amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "reportFraud",
      description: "Report fraudulent activity on account",
      parameters: {
        type: "object",
        properties: {
          accountNumber: { type: "string", description: "Affected account number" },
          description: { type: "string", description: "Description of fraudulent activity" },
          amount: { type: "number", description: "Amount involved (if applicable)" }
        },
        required: ["accountNumber", "description"]
      }
    }
  }
];

// Banking state machine
const bankingStates: StateConfig[] = [
  {
    key: "banking",
    description: "Main banking assistance",
    prompt: "You are SecureBank's AI customer service assistant. You are professional, helpful, and security-conscious.",
    contexts: ["banking_policies", "security_guidelines"],
    children: [
      {
        key: "account_services",
        description: "Account balance, statements, and account information", 
        prompt: "Focus on helping customers with account-related inquiries including balances, statements, and account details.",
        tools: ["getAccountBalance"],
        onEnter: async ({ metadata }) => {
          if (!metadata?.accountValidated) {
            return {
              allowed: false,
              reason: "Account verification required",
              customMessage: "For your security, I need to verify your account number before accessing account information."
            };
          }
          return { allowed: true };
        }
      },
      {
        key: "transfer_services",
        description: "Money transfers and payments",
        prompt: "Assist customers with fund transfers, bill payments, and transaction-related services.",
        tools: ["transferFunds"],
        onEnter: async ({ metadata }) => {
          if (!metadata?.accountValidated) {
            return {
              allowed: false,
              reason: "Account verification required for transfers"
            };
          }
          if (metadata?.accountType === "savings_only") {
            return {
              allowed: false,
              reason: "Transfer services not available for savings-only accounts",
              alternativeAction: "fallback_state",
              fallbackStateKey: "account_services"
            };
          }
          return { allowed: true };
        }
      },
      {
        key: "fraud_reporting",
        description: "Report fraud and suspicious activity",
        prompt: "Handle fraud reports with urgency and empathy. Gather necessary details and escalate appropriately.",
        tools: ["reportFraud"],
        contexts: ["security_guidelines"]
      }
    ]
  }
];

// Create banking agent
const bankingAgent = new Agent({
  states: bankingStates,
  contexts: bankingContexts,
  tools: bankingTools,
  defaultLLMConfig: {
    provider: "groq",
    model: "llama3-8b-8192",
    temperature: 0.3 // Low temperature for consistent, reliable responses
  }
});

// Register tool implementations
bankingAgent.registerTool("getAccountBalance", async ({ accountNumber }) => {
  // Mock database lookup
  const mockDatabase = {
    "1234567890": { balance: 2500.75, type: "checking", status: "active" },
    "0987654321": { balance: 15000.00, type: "savings", status: "active" }
  };
  
  const account = mockDatabase[accountNumber];
  if (!account) {
    throw new Error("Account not found");
  }
  
  return {
    accountNumber: `****${accountNumber.slice(-4)}`, // Masked for security
    balance: account.balance,
    accountType: account.type,
    status: account.status,
    asOfDate: new Date().toISOString()
  };
});

bankingAgent.registerTool("transferFunds", async ({ fromAccount, toAccount, amount, description }) => {
  // Validate transfer limits
  if (amount > 10000) {
    throw new Error("Transfers over $10,000 require additional verification");
  }
  
  // Mock transfer processing
  const transferId = `TXN${Date.now()}`;
  
  return {
    transferId,
    fromAccount: `****${fromAccount.slice(-4)}`,
    toAccount: `****${toAccount.slice(-4)}`,
    amount,
    description,
    status: "completed",
    processedAt: new Date().toISOString()
  };
});

// Usage example
async function handleBankingInquiry() {
  const result = await bankingAgent.processQuery(
    "customer123",
    "I'd like to check my account balance",
    "banking_session_456",
    [],
    { 
      accountValidated: true,
      accountNumber: "1234567890",
      customerName: "John Doe"
    }
  );
  
  console.log("Response:", result.response);
  console.log("State:", result.selectedState.key);
  console.log("Tools used:", result.toolResults.map(t => t.toolName));
}
```

## 🛒 E-commerce Assistant

### Product Recommendation Engine

An intelligent shopping assistant with product search, recommendations, and order management.

```typescript
// E-commerce contexts
const ecommerceContexts: Context[] = [
  {
    key: "product_catalog",
    description: "Current product catalog and inventory",
    content: async () => {
      // Dynamic content from inventory system
      const products = await getTopProducts();
      return `Current featured products: ${products.map(p => `${p.name} - $${p.price}`).join(', ')}`;
    },
    priority: 90
  },
  {
    key: "promotion_info",
    description: "Current promotions and deals",
    content: () => {
      const now = new Date();
      const isBlackFriday = now.getMonth() === 10 && now.getDate() >= 24 && now.getDate() <= 30;
      return isBlackFriday ? 
        "Black Friday Sale: 30% off sitewide with code BLACKFRIDAY30" :
        "Free shipping on orders over $50. Use code FREESHIP50";
    },
    priority: 85
  },
  {
    key: "user_preferences",
    description: "User shopping preferences and history",
    content: async () => {
      // Would integrate with user preference system
      return "Customer prefers eco-friendly products, size medium, and technology items";
    },
    priority: 80
  }
];

// E-commerce tools
const ecommerceTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description: "Search for products in the catalog",
      parameters: {
        type: "object", 
        properties: {
          query: { type: "string", description: "Search query" },
          category: { type: "string", description: "Product category filter" },
          priceRange: { 
            type: "object",
            properties: {
              min: { type: "number" },
              max: { type: "number" }
            }
          },
          sortBy: { 
            type: "string", 
            enum: ["price_low", "price_high", "rating", "popularity"],
            description: "Sort order"
          },
          limit: { type: "number", description: "Maximum number of results", default: 10 }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getProductRecommendations",
      description: "Get personalized product recommendations",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string", description: "User ID for personalization" },
          category: { type: "string", description: "Category to focus on" },
          based_on: { 
            type: "string",
            enum: ["purchase_history", "browsing_history", "similar_users", "trending"],
            description: "Recommendation basis"
          },
          limit: { type: "number", default: 5 }
        },
        required: ["userId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addToCart",
      description: "Add product to shopping cart",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Product ID" },
          quantity: { type: "number", description: "Quantity to add", default: 1 },
          options: { 
            type: "object", 
            description: "Product options (size, color, etc.)",
            properties: {
              size: { type: "string" },
              color: { type: "string" }
            }
          }
        },
        required: ["productId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "checkOrderStatus",
      description: "Check the status of an order",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "Order ID to check" }
        },
        required: ["orderId"]
      }
    }
  }
];

// E-commerce state machine
const ecommerceStates: StateConfig[] = [
  {
    key: "shopping_assistant",
    description: "Main shopping assistance",
    prompt: "You are a helpful shopping assistant for an online store. Help customers find products, make decisions, and complete purchases.",
    contexts: ["product_catalog", "promotion_info"],
    children: [
      {
        key: "product_discovery",
        description: "Help customers find and discover products",
        prompt: "Focus on helping customers discover products that match their needs. Ask clarifying questions and provide detailed product information.",
        tools: ["searchProducts", "getProductRecommendations"],
        contexts: ["user_preferences"]
      },
      {
        key: "purchase_assistance", 
        description: "Help with adding items to cart and purchasing",
        prompt: "Assist customers with adding items to their cart, checking out, and completing purchases.",
        tools: ["addToCart"],
        contexts: ["promotion_info"]
      },
      {
        key: "order_support",
        description: "Help with existing orders and tracking",
        prompt: "Provide support for existing orders, tracking information, and order-related inquiries.",
        tools: ["checkOrderStatus"]
      }
    ]
  }
];

// Create e-commerce agent with vector-powered product search
const embeddingProvider = VectorStorageFactory.createOpenAIEmbedding(process.env.OPENAI_API_KEY!);
const vectorStorage = VectorStorageFactory.createInMemory(embeddingProvider);
const productKnowledgeBase = new VectorKnowledgeBaseImpl(vectorStorage, embeddingProvider);

// Populate product knowledge base
await productKnowledgeBase.addContentBatch([
  {
    content: "iPhone 15 Pro - Latest Apple smartphone with titanium design, advanced camera system, and A17 Pro chip. Perfect for photography enthusiasts and tech lovers.",
    metadata: { 
      productId: "iphone15pro",
      category: "smartphones", 
      price: 999,
      brand: "Apple",
      features: ["camera", "titanium", "5G"]
    }
  },
  {
    content: "MacBook Air M2 - Ultra-thin laptop with M2 chip, all-day battery life, and stunning Retina display. Ideal for students and professionals.",
    metadata: {
      productId: "macbookair_m2",
      category: "laptops",
      price: 1199,
      brand: "Apple", 
      features: ["portable", "long_battery", "performance"]
    }
  }
  // ... more products
]);

const ecommerceAgent = new Agent({
  states: ecommerceStates,
  contexts: ecommerceContexts,
  tools: ecommerceTools,
  defaultLLMConfig: {
    provider: "openai",
    model: "gpt-4",
    temperature: 0.7
  },
  // Enable context orchestration for intelligent product matching
  contextOrchestratorConfig: {
    contextLLMConfig: {
      provider: "groq",
      model: "llama3-8b-8192",
      temperature: 0.3
    },
    maxContextTokens: 6000,
    relevanceThreshold: 0.6,
    enableConceptMapping: true
  },
  knowledgeBaseConnector: productKnowledgeBase
});

// Register tool implementations
ecommerceAgent.registerTool("searchProducts", async ({ query, category, priceRange, sortBy, limit }) => {
  // Use vector search for semantic product matching
  const searchResults = await productKnowledgeBase.vectorSearch(query, {
    limit,
    filter: category ? { category } : undefined
  });
  
  // Apply price filtering
  let filteredResults = searchResults;
  if (priceRange) {
    filteredResults = searchResults.filter(product => {
      const price = product.metadata.price;
      return (!priceRange.min || price >= priceRange.min) && 
             (!priceRange.max || price <= priceRange.max);
    });
  }
  
  // Sort results
  if (sortBy === "price_low") {
    filteredResults.sort((a, b) => a.metadata.price - b.metadata.price);
  } else if (sortBy === "price_high") {
    filteredResults.sort((a, b) => b.metadata.price - a.metadata.price);
  }
  
  return {
    products: filteredResults.map(product => ({
      id: product.metadata.productId,
      name: product.content.split(' - ')[0],
      description: product.content,
      price: product.metadata.price,
      category: product.metadata.category,
      brand: product.metadata.brand,
      relevanceScore: product.relevance
    })),
    totalResults: filteredResults.length,
    query,
    appliedFilters: { category, priceRange, sortBy }
  };
});

ecommerceAgent.registerTool("getProductRecommendations", async ({ userId, category, based_on, limit }) => {
  // Get user's preferences and history
  const userProfile = await getUserProfile(userId);
  
  // Generate recommendations based on different strategies
  let recommendations = [];
  
  switch (based_on) {
    case "purchase_history":
      recommendations = await getRecommendationsFromPurchases(userProfile.purchases);
      break;
    case "browsing_history":
      recommendations = await getRecommendationsFromBrowsing(userProfile.browsing);
      break;
    case "similar_users": 
      recommendations = await getRecommendationsFromSimilarUsers(userId);
      break;
    case "trending":
      recommendations = await getTrendingProducts(category);
      break;
    default:
      // Hybrid approach
      recommendations = await getHybridRecommendations(userId, category);
  }
  
  return {
    recommendations: recommendations.slice(0, limit),
    basis: based_on,
    userId,
    category: category || "all",
    personalizationScore: userProfile.purchases.length > 0 ? 0.8 : 0.3
  };
});

// Usage example
async function handleShoppingQuery() {
  const result = await ecommerceAgent.processQuery(
    "shopper456",
    "I'm looking for a laptop for college, something portable and good for programming",
    "shopping_session_789",
    [],
    {
      customerSegment: "student",
      budgetRange: { min: 800, max: 1500 },
      preferences: ["portable", "programming", "battery_life"]
    }
  );
  
  console.log("Recommendation:", result.response);
  console.log("Products suggested:", result.toolResults);
}
```

## 🏥 Healthcare Assistant

### Patient Support System

A HIPAA-compliant healthcare assistant for patient inquiries, appointment scheduling, and health information.

```typescript
// Healthcare contexts
const healthcareContexts: Context[] = [
  {
    key: "medical_policies",
    description: "Healthcare policies and procedures",
    content: `
      HealthCare Plus Policies:
      - Patient privacy is paramount (HIPAA compliance)
      - Medical advice requires licensed provider consultation
      - Emergency situations should be directed to 911
      - Prescription refills require doctor approval
      - Appointment cancellations must be made 24 hours in advance
    `,
    priority: 100
  },
  {
    key: "clinic_info",
    description: "Clinic information and services",
    content: `
      HealthCare Plus Services:
      - Primary Care: Dr. Smith, Dr. Johnson
      - Pediatrics: Dr. Williams
      - Cardiology: Dr. Brown (Tuesdays & Thursdays)
      - Mental Health: Dr. Davis (Mondays, Wednesdays, Fridays)
      - Hours: Monday-Friday 8 AM - 6 PM, Saturday 9 AM - 2 PM
      - Emergency Line: (555) 123-HELP
    `,
    priority: 90
  },
  {
    key: "health_education",
    description: "General health education information",
    content: async () => {
      // Could integrate with medical knowledge base
      return `
        General Health Tips:
        - Regular exercise (150 minutes/week moderate activity)
        - Balanced diet with fruits and vegetables
        - 7-9 hours of sleep per night
        - Regular preventive screenings
        - Stay hydrated (8 glasses of water daily)
      `;
    },
    priority: 70
  }
];

// Healthcare tools
const healthcareTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "scheduleAppointment",
      description: "Schedule a medical appointment",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "Patient ID" },
          appointmentType: { 
            type: "string",
            enum: ["routine_checkup", "sick_visit", "follow_up", "specialist", "mental_health"],
            description: "Type of appointment"
          },
          preferredDate: { type: "string", description: "Preferred date (YYYY-MM-DD)" },
          preferredTime: { type: "string", description: "Preferred time (HH:MM)" },
          provider: { type: "string", description: "Preferred provider name" },
          reason: { type: "string", description: "Reason for visit" }
        },
        required: ["patientId", "appointmentType", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "checkSymptoms",
      description: "Provide general symptom information (not medical advice)",
      parameters: {
        type: "object",
        properties: {
          symptoms: { 
            type: "array", 
            items: { type: "string" },
            description: "List of symptoms"
          },
          duration: { type: "string", description: "How long symptoms have persisted" },
          severity: { 
            type: "string",
            enum: ["mild", "moderate", "severe"],
            description: "Symptom severity"
          }
        },
        required: ["symptoms"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTestResults",
      description: "Retrieve patient test results",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "Patient ID" },
          testType: { type: "string", description: "Type of test" },
          dateRange: {
            type: "object",
            properties: {
              start: { type: "string", description: "Start date (YYYY-MM-DD)" },
              end: { type: "string", description: "End date (YYYY-MM-DD)" }
            }
          }
        },
        required: ["patientId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "requestPrescriptionRefill",
      description: "Request a prescription refill",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "Patient ID" },
          medicationName: { type: "string", description: "Name of medication" },
          prescriptionNumber: { type: "string", description: "Prescription number" },
          pharmacy: { type: "string", description: "Preferred pharmacy" }
        },
        required: ["patientId", "medicationName"]
      }
    }
  }
];

// Healthcare state machine with strict access controls
const healthcareStates: StateConfig[] = [
  {
    key: "healthcare_assistant",
    description: "Main healthcare assistance",
    prompt: "You are a healthcare assistant for HealthCare Plus clinic. You provide information and assistance while maintaining strict patient privacy and HIPAA compliance.",
    contexts: ["medical_policies", "clinic_info"],
    onEnter: async ({ metadata }) => {
      // HIPAA compliance check
      if (!metadata?.hipaaConsent) {
        return {
          allowed: false,
          reason: "HIPAA consent required",
          customMessage: "Before we can assist you, we need your consent to discuss your healthcare information. Do you consent to discussing your healthcare needs?"
        };
      }
      return { allowed: true };
    },
    children: [
      {
        key: "appointment_scheduling",
        description: "Schedule and manage medical appointments",
        prompt: "Help patients schedule appointments efficiently while gathering necessary information for proper care coordination.",
        tools: ["scheduleAppointment"],
        onEnter: async ({ metadata }) => {
          if (!metadata?.patientVerified) {
            return {
              allowed: false,
              reason: "Patient identity verification required",
              customMessage: "For your security, I need to verify your identity before scheduling appointments. Please provide your patient ID and date of birth."
            };
          }
          return { allowed: true };
        }
      },
      {
        key: "symptom_assessment",
        description: "Provide general symptom information and guidance",
        prompt: "Provide general information about symptoms and when to seek care. NEVER provide medical diagnosis or treatment advice.",
        tools: ["checkSymptoms"],
        contexts: ["health_education"],
        onEnter: async ({ userQuery }) => {
          // Check for emergency keywords
          const emergencyKeywords = ["chest pain", "difficulty breathing", "severe bleeding", "unconscious", "suicide"];
          const hasEmergency = emergencyKeywords.some(keyword => 
            userQuery.toLowerCase().includes(keyword)
          );
          
          if (hasEmergency) {
            return {
              allowed: false,
              reason: "Emergency situation detected",
              customMessage: "This sounds like a medical emergency. Please call 911 immediately or go to your nearest emergency room. Do not delay seeking immediate medical attention."
            };
          }
          return { allowed: true };
        }
      },
      {
        key: "test_results",
        description: "Provide access to test results and lab reports",
        prompt: "Help patients access their test results while explaining the importance of discussing results with their healthcare provider.",
        tools: ["getTestResults"],
        onEnter: async ({ metadata }) => {
          // Enhanced verification for sensitive medical data
          if (!metadata?.patientVerified || !metadata?.secureSession) {
            return {
              allowed: false,
              reason: "Enhanced verification required for medical records",
              customMessage: "Accessing test results requires enhanced security verification. Please log in through our secure patient portal."
            };
          }
          return { allowed: true };
        }
      },
      {
        key: "prescription_management",
        description: "Handle prescription refill requests and medication questions",
        prompt: "Assist with prescription refills and provide general medication information. Always emphasize the importance of following provider instructions.",
        tools: ["requestPrescriptionRefill"],
        onEnter: async ({ metadata }) => {
          if (!metadata?.patientVerified) {
            return {
              allowed: false,
              reason: "Patient verification required for prescription access"
            };
          }
          return { allowed: true };
        }
      }
    ]
  }
];

// Create healthcare agent with conversation persistence for continuity of care
const healthcareStorage = new SecureConversationStorage(
  process.env.ENCRYPTED_DATABASE_URL!,
  { enableEncryption: true, retentionPeriod: 2555 } // 7 years for medical records
);

const healthcareAgent = new Agent({
  states: healthcareStates,
  contexts: healthcareContexts,
  tools: healthcareTools,
  defaultLLMConfig: {
    provider: "anthropic",
    model: "claude-3-sonnet-20240229",
    temperature: 0.2 // Very low for medical accuracy
  },
  conversationConfig: {
    storage: healthcareStorage,
    enableSummarization: true,
    maxContextTokens: 4000,
    defaultRelevanceStrategy: "hybrid"
  }
});

// Register HIPAA-compliant tool implementations
healthcareAgent.registerTool("scheduleAppointment", async ({ patientId, appointmentType, preferredDate, preferredTime, provider, reason }) => {
  // Validate patient ID
  const patient = await verifyPatient(patientId);
  if (!patient) {
    throw new Error("Patient verification failed");
  }
  
  // Check provider availability
  const availability = await checkProviderAvailability(provider, preferredDate, preferredTime);
  
  if (!availability.available) {
    return {
      success: false,
      message: "Requested time slot not available",
      alternativeSlots: availability.nearbySlots,
      provider: availability.provider
    };
  }
  
  // Create appointment
  const appointment = await createAppointment({
    patientId,
    appointmentType,
    dateTime: `${preferredDate} ${preferredTime}`,
    provider: availability.provider.name,
    reason,
    status: "scheduled"
  });
  
  // Send confirmation
  await sendAppointmentConfirmation(patient.email, appointment);
  
  return {
    success: true,
    appointmentId: appointment.id,
    confirmationNumber: appointment.confirmationNumber,
    dateTime: appointment.dateTime,
    provider: appointment.provider,
    location: appointment.location,
    instructions: "Please arrive 15 minutes early and bring your insurance card and ID."
  };
});

healthcareAgent.registerTool("checkSymptoms", async ({ symptoms, duration, severity }) => {
  // This is for educational purposes only, not medical advice
  const symptomInfo = await getGeneralSymptomInformation(symptoms);
  
  // Determine urgency level
  let urgencyLevel = "routine";
  const urgentSymptoms = ["high fever", "severe pain", "difficulty breathing"];
  const emergencySymptoms = ["chest pain", "severe bleeding", "loss of consciousness"];
  
  if (symptoms.some(s => emergencySymptoms.some(es => s.toLowerCase().includes(es)))) {
    urgencyLevel = "emergency";
  } else if (symptoms.some(s => urgentSymptoms.some(us => s.toLowerCase().includes(us))) || severity === "severe") {
    urgencyLevel = "urgent";
  }
  
  return {
    symptoms,
    duration,
    severity,
    urgencyLevel,
    generalInformation: symptomInfo,
    recommendations: getSymptomRecommendations(urgencyLevel),
    disclaimer: "This information is for educational purposes only and does not constitute medical advice. Please consult with your healthcare provider for proper diagnosis and treatment."
  };
});

// Usage with enhanced security
async function handleHealthcareInquiry() {
  const result = await healthcareAgent.processQuery(
    "patient123",
    "I'd like to schedule a follow-up appointment for my diabetes check",
    "healthcare_session_456",
    [],
    {
      hipaaConsent: true,
      patientVerified: true,
      patientId: "P123456",
      secureSession: true
    }
  );
  
  console.log("Healthcare Response:", result.response);
  console.log("Compliance Level:", result.selectedState.metadata?.complianceLevel);
}
```

## 🎓 Educational Tutor

### Adaptive Learning Assistant

An intelligent tutoring system that adapts to student learning styles and progress.

```typescript
// Educational contexts
const educationalContexts: Context[] = [
  {
    key: "learning_theory",
    description: "Educational learning theories and pedagogical approaches",
    content: `
      Learning Approaches:
      - Visual learners: Use diagrams, charts, and visual aids
      - Auditory learners: Incorporate discussions and verbal explanations
      - Kinesthetic learners: Hands-on activities and practical examples
      - Reading/writing learners: Text-based materials and note-taking
      
      Pedagogical Principles:
      - Start with prior knowledge assessment
      - Provide clear learning objectives
      - Use scaffolding to build complexity gradually
      - Offer immediate feedback and reinforcement
      - Encourage active participation and reflection
    `,
    priority: 95
  },
  {
    key: "curriculum_standards",
    description: "Educational standards and learning objectives",
    content: async () => {
      // Could integrate with curriculum management system
      return `
        Current Focus Areas:
        - Mathematics: Algebra, Geometry, Statistics
        - Science: Biology, Chemistry, Physics
        - Language Arts: Reading Comprehension, Writing, Grammar
        - History: World History, American History, Civics
        - Computer Science: Programming, Data Structures, Algorithms
      `;
    },
    priority: 85
  },
  {
    key: "student_progress",
    description: "Individual student progress and performance data",
    content: async () => {
      // Personalized based on student data
      return "Student shows strong performance in visual learning tasks, needs additional support in abstract concepts";
    },
    priority: 90
  }
];

// Educational tools
const educationalTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "assessLearningStyle",
      description: "Assess student's preferred learning style",
      parameters: {
        type: "object",
        properties: {
          studentId: { type: "string", description: "Student identifier" },
          responses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                answer: { type: "string" }
              }
            },
            description: "Learning style assessment responses"
          }
        },
        required: ["studentId", "responses"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generatePracticeProblems",
      description: "Generate practice problems based on student level and topic",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Subject area" },
          topic: { type: "string", description: "Specific topic" },
          difficulty: { 
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
            description: "Difficulty level"
          },
          learningStyle: { 
            type: "string",
            enum: ["visual", "auditory", "kinesthetic", "reading_writing"],
            description: "Student's preferred learning style"
          },
          count: { type: "number", description: "Number of problems to generate", default: 5 }
        },
        required: ["subject", "topic", "difficulty"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "provideExplanation",
      description: "Provide detailed explanation of a concept",
      parameters: {
        type: "object",
        properties: {
          concept: { type: "string", description: "Concept to explain" },
          subject: { type: "string", description: "Subject area" },
          studentLevel: { type: "string", description: "Student's current level" },
          learningStyle: { type: "string", description: "Preferred learning style" },
          includeExamples: { type: "boolean", description: "Include practical examples", default: true },
          includeVisuals: { type: "boolean", description: "Include visual aids description", default: true }
        },
        required: ["concept", "subject", "studentLevel"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "trackProgress",
      description: "Record and analyze student progress",
      parameters: {
        type: "object",
        properties: {
          studentId: { type: "string", description: "Student identifier" },
          subject: { type: "string", description: "Subject area" },
          topic: { type: "string", description: "Specific topic" },
          performance: {
            type: "object",
            properties: {
              correct: { type: "number", description: "Number of correct answers" },
              total: { type: "number", description: "Total number of questions" },
              timeSpent: { type: "number", description: "Time spent in minutes" }
            },
            required: ["correct", "total"]
          },
          strugglingAreas: {
            type: "array",
            items: { type: "string" },
            description: "Areas where student struggled"
          }
        },
        required: ["studentId", "subject", "topic", "performance"]
      }
    }
  }
];

// Educational state machine with adaptive routing
const educationalStates: StateConfig[] = [
  {
    key: "tutor",
    description: "Main educational tutor",
    prompt: "You are an expert educational tutor. Your goal is to help students learn effectively by adapting to their individual learning styles and needs.",
    contexts: ["learning_theory", "curriculum_standards"],
    children: [
      {
        key: "concept_explanation",
        description: "Explain educational concepts and topics",
        prompt: "Provide clear, comprehensive explanations adapted to the student's learning style and level. Use analogies, examples, and visual descriptions as appropriate.",
        tools: ["provideExplanation"],
        contexts: ["student_progress"],
        onEnter: async ({ metadata }) => {
          // Adapt explanation approach based on student data
          if (metadata?.studentLevel === "struggling") {
            return {
              allowed: true,
              customMessage: "I notice you might benefit from a more foundational approach. Let me break this down into smaller, manageable steps."
            };
          }
          return { allowed: true };
        }
      },
      {
        key: "practice_session",
        description: "Generate and guide through practice problems",
        prompt: "Create engaging practice problems that match the student's level and learning style. Provide guidance and feedback to help them learn from mistakes.",
        tools: ["generatePracticeProblems", "trackProgress"],
        contexts: ["student_progress"]
      },
      {
        key: "learning_assessment",
        description: "Assess student learning style and progress",
        prompt: "Conduct learning style assessments and evaluate student progress to personalize the learning experience.",
        tools: ["assessLearningStyle", "trackProgress"],
        contexts: ["learning_theory"]
      },
      {
        key: "study_planning",
        description: "Help create personalized study plans",
        prompt: "Create personalized study plans based on student goals, available time, and learning preferences.",
        contexts: ["curriculum_standards", "student_progress"]
      }
    ]
  }
];

// Create educational agent with vector-powered knowledge base
const educationalKnowledgeBase = await createEducationalKnowledgeBase();

const educationalAgent = new Agent({
  states: educationalStates,
  contexts: educationalContexts,
  tools: educationalTools,
  defaultLLMConfig: {
    provider: "openai",
    model: "gpt-4",
    temperature: 0.6 // Balanced for creativity and accuracy
  },
  contextOrchestratorConfig: {
    contextLLMConfig: {
      provider: "groq",
      model: "llama3-8b-8192", 
      temperature: 0.3
    },
    maxContextTokens: 8000,
    relevanceThreshold: 0.5,
    enableConceptMapping: true
  },
  knowledgeBaseConnector: educationalKnowledgeBase,
  conversationConfig: {
    storage: new EducationalProgressStorage(),
    enableSummarization: true,
    maxContextTokens: 6000
  }
});

// Register adaptive educational tools
educationalAgent.registerTool("provideExplanation", async ({ concept, subject, studentLevel, learningStyle, includeExamples, includeVisuals }) => {
  // Get concept explanation from knowledge base
  const conceptInfo = await educationalKnowledgeBase.vectorSearch(concept, {
    filter: { subject, difficulty: studentLevel }
  });
  
  // Adapt explanation based on learning style
  let explanation = conceptInfo[0]?.content || "I'll help you understand this concept.";
  
  if (learningStyle === "visual" && includeVisuals) {
    explanation += "\n\nVisual Aid: " + await generateVisualDescription(concept);
  }
  
  if (learningStyle === "auditory") {
    explanation += "\n\nThink of it like this: " + await generateAnalogy(concept);
  }
  
  if (learningStyle === "kinesthetic") {
    explanation += "\n\nHands-on Activity: " + await generateHandsOnActivity(concept);
  }
  
  if (includeExamples) {
    const examples = await generateExamples(concept, studentLevel);
    explanation += "\n\nExamples:\n" + examples.join("\n");
  }
  
  return {
    concept,
    explanation,
    adaptedFor: learningStyle,
    difficulty: studentLevel,
    additionalResources: await getAdditionalResources(concept),
    nextSteps: await suggestNextSteps(concept, studentLevel)
  };
});

educationalAgent.registerTool("generatePracticeProblems", async ({ subject, topic, difficulty, learningStyle, count }) => {
  const problems = [];
  
  for (let i = 0; i < count; i++) {
    const problem = await generateAdaptiveProblem({
      subject,
      topic,
      difficulty,
      learningStyle,
      variation: i
    });
    
    problems.push({
      id: `problem_${i + 1}`,
      question: problem.question,
      options: problem.options,
      correctAnswer: problem.correctAnswer,
      explanation: problem.explanation,
      hints: problem.hints,
      visualAids: learningStyle === "visual" ? problem.visualAids : undefined
    });
  }
  
  return {
    subject,
    topic,
    difficulty,
    adaptedFor: learningStyle,
    problems,
    estimatedTime: count * 3, // 3 minutes per problem
    instructions: "Take your time and think through each problem. Use the hints if you get stuck!"
  };
});

// Usage example with adaptive learning
async function handleTutoringSession() {
  // Initial learning style assessment
  const assessmentResult = await educationalAgent.processQuery(
    "student789",
    "I'm having trouble understanding algebra. Can you help me?",
    "tutoring_session_123",
    [],
    {
      studentLevel: "high_school",
      subject: "mathematics",
      previousPerformance: { algebra: 65, geometry: 78 },
      learningPreferences: "visual"
    }
  );
  
  console.log("Tutor Response:", assessmentResult.response);
  
  // Follow up with practice problems
  const practiceResult = await educationalAgent.processQuery(
    "student789",
    "Can you give me some practice problems on linear equations?",
    "tutoring_session_123"
  );
  
  console.log("Practice Problems:", practiceResult.toolResults);
}
```

These comprehensive examples demonstrate how the Agento framework can be adapted for various industries and use cases, each with specific requirements for security, compliance, personalization, and integration with external systems. The framework's flexibility allows for sophisticated implementations while maintaining clean, maintainable code. 