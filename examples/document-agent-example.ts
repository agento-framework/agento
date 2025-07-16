import { Agent } from '../src/core/agent';
import type { StateConfig, Context, Tool } from '../src/types';

/**
 * Document Agent Example
 * Demonstrates comprehensive document manipulation capabilities using the built-in document tools
 */

// Define contexts for document management
const documentContexts: Context[] = [
  {
    key: "document_expert",
    description: "Expert knowledge about document formats and file operations",
    content: `
You are a document management expert. You can help users with:
- Reading and writing files in various formats (text, JSON, CSV, XML, YAML, Markdown)
- File operations (copy, move, delete, rename)
- Directory operations (list, search, organize)
- Data parsing and conversion between formats
- Batch file operations and automation

Always prioritize data safety - warn users before destructive operations and suggest backups.
When working with structured data, validate formats and provide helpful error messages.
    `,
    priority: 100,
  },
  {
    key: "file_safety",
    description: "Safety guidelines for file operations", 
    content: `
IMPORTANT SAFETY GUIDELINES:
- Always backup important files before modification
- Verify file paths and permissions before operations
- Use overwrite flags carefully 
- Check file sizes before processing large files
- Validate data formats before parsing
- Be cautious with recursive delete operations
    `,
    priority: 90,
  }
];

// Define specialized states for different document tasks
const documentStates: StateConfig[] = [
  {
    key: "document_manager",
    description: "Main document management hub",
    prompt: "You are a helpful document management assistant. You can read, write, organize, and manipulate files in various formats safely and efficiently.",
    contexts: ["document_expert", "file_safety"],
    children: [
      {
        key: "file_reader",
        description: "Read and parse files in various formats",
        prompt: "Help users read and understand file contents. Parse structured data formats and provide clear summaries.",
        tools: ["read_file", "parse_json", "parse_csv", "get_file_info"],
      },
      {
        key: "file_writer", 
        description: "Create and write files with proper formatting",
        prompt: "Help users create and write files. Ensure proper formatting and handle errors gracefully.",
        tools: ["write_file", "write_json", "append_to_file"],
      },
      {
        key: "file_organizer",
        description: "Organize, copy, move and manage files and directories",
        prompt: "Help users organize their files and directories efficiently and safely.",
        tools: ["list_directory", "copy_file", "move_file", "delete_file"],
      },
      {
        key: "content_searcher",
        description: "Search through files and directories for specific content",
        prompt: "Help users find content within files using text search and pattern matching.",
        tools: ["search_in_files", "list_directory"],
      }
    ]
  }
];

// Additional custom tools for document workflows
const customTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "backup_file",
      description: "Create a backup copy of a file with timestamp",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Path to the file to backup"
          },
          backupDir: {
            type: "string", 
            description: "Directory to store backup (optional)"
          }
        },
        required: ["filePath"]
      }
    }
  }
];

// Create the document agent
export function createDocumentAgent() {
  const agent = new Agent({
    states: documentStates,
    contexts: documentContexts, 
    tools: customTools, // Document tools are automatically included
    defaultLLMConfig: {
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      apiKey: process.env.GROQ_API_KEY!,
      temperature: 0.3, // Lower temperature for precise file operations
    },
  });

  // Register custom tool implementations
  agent.registerTool('backup_file', async ({ filePath, backupDir = './backups' }: any) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = require('path').basename(filePath);
      const backupPath = require('path').join(backupDir, `${fileName}.backup.${timestamp}`);
      
      // Use built-in copy_file tool
      const result = await agent.processQuery(
        'system',
        `Copy file from ${filePath} to ${backupPath}`,
        undefined,
        [],
        { toolCall: 'copy_file', sourcePath: filePath, destinationPath: backupPath, createDirectories: true }
      );
      
      return {
        success: true,
        backupPath,
        originalPath: filePath,
        timestamp
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to backup file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  });

  return agent;
}

// Example usage scenarios
async function demonstrateDocumentAgent() {
  const agent = createDocumentAgent();

  console.log('🚀 Document Agent Example\n');

  try {
    // Example 1: Reading and parsing a JSON configuration file
    console.log('📖 Example 1: Reading a JSON file');
    const response1 = await agent.processQuery(
      'user-1',
      'Read the package.json file and tell me about the project dependencies'
    );
    console.log('Response:', response1.response);
    console.log('Selected State:', response1.selectedState.key);
    console.log('Tools Used:', response1.toolResults.map(r => r.toolName));

    console.log('\n' + '='.repeat(50) + '\n');

    // Example 2: Creating a CSV file with data
    console.log('📊 Example 2: Creating a CSV file with sample data');
    const response2 = await agent.processQuery(
      'user-1', 
      'Create a CSV file called "employees.csv" with sample employee data including name, department, and salary columns'
    );
    console.log('Response:', response2.response);
    console.log('Tools Used:', response2.toolResults.map(r => r.toolName));

    console.log('\n' + '='.repeat(50) + '\n');

    // Example 3: Searching for specific content in files
    console.log('🔍 Example 3: Searching for content across files');
    const response3 = await agent.processQuery(
      'user-1',
      'Search for any files in the src directory that contain the word "temporal" and show me the matches'
    );
    console.log('Response:', response3.response);
    console.log('Tools Used:', response3.toolResults.map(r => r.toolName));

    console.log('\n' + '='.repeat(50) + '\n');

    // Example 4: File organization and management
    console.log('📁 Example 4: File organization');
    const response4 = await agent.processQuery(
      'user-1',
      'List all TypeScript files in the src directory recursively and organize them by subdirectory'
    );
    console.log('Response:', response4.response);
    console.log('Tools Used:', response4.toolResults.map(r => r.toolName));

    console.log('\n' + '='.repeat(50) + '\n');

    // Example 5: Data format conversion
    console.log('🔄 Example 5: Data format conversion');
    const response5 = await agent.processQuery(
      'user-1',
      'Read the package.json file and create a YAML version of the same data in a new file called package.yaml'
    );
    console.log('Response:', response5.response);
    console.log('Tools Used:', response5.toolResults.map(r => r.toolName));

  } catch (error) {
    console.error('Error running document agent example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  demonstrateDocumentAgent();
}

export { demonstrateDocumentAgent }; 