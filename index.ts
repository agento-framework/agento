import { runCustomerServiceExample } from "./examples/customer-service-agent.js";

console.log("🚀 Agento Framework v2 - AI Agent State Machine Framework");
console.log("===================================================");

// Run the customer service example
runCustomerServiceExample().catch((error) => {
  console.error("❌ Error running example:", error);
  process.exit(1);
});