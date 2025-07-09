import type { Tool } from "../types";

/**
 * External Integration Tools for Agents
 * Provides capabilities for integrating with external systems and APIs
 */

export const externalIntegrationTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "make_http_request",
      description: "Make HTTP requests to external APIs and services",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL to make the request to"
          },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            description: "HTTP method to use"
          },
          headers: {
            type: "object",
            description: "HTTP headers to include in the request"
          },
          body: {
            type: "string",
            description: "Request body (for POST, PUT, PATCH requests)"
          },
          timeout: {
            type: "number",
            description: "Request timeout in milliseconds"
          }
        },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send email notifications through configured email service",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Recipient email address"
          },
          subject: {
            type: "string",
            description: "Email subject line"
          },
          body: {
            type: "string",
            description: "Email body content"
          },
          isHtml: {
            type: "boolean",
            description: "Whether the body is HTML content"
          }
        },
        required: ["to", "subject", "body"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "log_event",
      description: "Log events to external monitoring or analytics systems",
      parameters: {
        type: "object",
        properties: {
          event: {
            type: "string",
            description: "Event name or type"
          },
          data: {
            type: "object",
            description: "Event data and metadata"
          },
          level: {
            type: "string",
            enum: ["debug", "info", "warn", "error"],
            description: "Log level"
          },
          timestamp: {
            type: "string",
            description: "Event timestamp (ISO format). If not provided, current time is used"
          }
        },
        required: ["event"]
      }
    }
  }
];

/**
 * Default implementations for external integration tools
 * These are basic implementations that can be overridden by users
 */
export const externalIntegrationToolImplementations = {
  make_http_request: async ({ url, method = "GET", headers = {}, body, timeout = 30000 }: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  }) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        signal: controller.signal
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        requestOptions.body = body;
      }

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseData = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: await response.text()
      };

      // Try to parse as JSON if possible
      try {
        responseData.body = JSON.parse(responseData.body);
      } catch {
        // Keep as text if not valid JSON
      }

      return {
        success: response.ok,
        data: responseData,
        error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  send_email: async ({ to, subject, body, isHtml = false }: {
    to: string;
    subject: string;
    body: string;
    isHtml?: boolean;
  }) => {
    // This is a placeholder implementation
    // In a real application, you would integrate with an email service like SendGrid, AWS SES, etc.
    console.log(`📧 Email would be sent:
To: ${to}
Subject: ${subject}
Body: ${body}
HTML: ${isHtml}`);

    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      message: "Email sent successfully (mock implementation)"
    };
  },

  log_event: async ({ event, data = {}, level = "info", timestamp }: {
    event: string;
    data?: Record<string, any>;
    level?: string;
    timestamp?: string;
  }) => {
    const eventTime = timestamp || new Date().toISOString();
    const logEntry = {
      timestamp: eventTime,
      level,
      event,
      data
    };

    // This is a placeholder implementation
    // In a real application, you would send to logging services like DataDog, LogRocket, etc.
    console.log(`📊 [${level.toUpperCase()}] ${eventTime} - ${event}:`, data);

    return {
      success: true,
      logId: `log_${Date.now()}`,
      message: "Event logged successfully"
    };
  }
}; 