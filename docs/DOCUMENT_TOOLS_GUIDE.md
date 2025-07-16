# Document Tools Guide

The Agento framework includes a comprehensive set of document tools that enable agents to read, write, manipulate, and organize files in various formats. These tools are automatically available to all agents and provide robust file system operations with proper error handling and safety features.

## Overview

Document tools in Agento provide:

- **File Operations**: Read, write, append, copy, move, delete files
- **Directory Management**: List, create, organize directories
- **Format Support**: JSON, CSV, XML, YAML, Markdown, plain text
- **Content Search**: Search within files using text or regex patterns
- **Data Parsing**: Parse structured data formats with validation
- **Safety Features**: Backup capabilities, overwrite protection, size limits

## Available Tools

### File Reading and Parsing

#### `read_file`
Read and parse files with automatic format detection.

```typescript
{
  filePath: string;           // Path to file
  encoding?: string;          // File encoding (default: utf8)
  format?: string;           // Format: auto, text, json, csv, xml, yaml, markdown
  maxSize?: number;          // Max file size in bytes (default: 10MB)
}
```

**Example Usage:**
```typescript
// Read and auto-parse a JSON file
await agent.processQuery('user', 'Read config.json and show me the database settings');

// Read a CSV file with specific parsing
await agent.processQuery('user', 'Read sales-data.csv and summarize the total revenue');
```

#### `parse_json`
Parse JSON files with validation and error handling.

```typescript
{
  filePath: string;
  validateSchema?: object;    // Optional JSON schema validation
  allowComments?: boolean;    // Allow JavaScript-style comments
}
```

#### `parse_csv`
Parse CSV files into structured data.

```typescript
{
  filePath: string;
  delimiter?: string;         // CSV delimiter (default: ',')
  hasHeader?: boolean;        // First row contains headers (default: true)
  maxRows?: number;          // Maximum rows to parse (default: 1000)
}
```

### File Writing and Creation

#### `write_file`
Write content to files with format-specific handling.

```typescript
{
  filePath: string;
  content: string;
  format?: string;           // text, json, csv, xml, yaml, markdown
  encoding?: string;         // File encoding (default: utf8)
  createDirectories?: boolean; // Create parent dirs (default: false)
  overwrite?: boolean;       // Overwrite existing file (default: false)
}
```

**Example Usage:**
```typescript
// Create a JSON configuration file
await agent.processQuery('user', 
  'Create a config.json file with database host "localhost", port 5432, and database name "myapp"'
);

// Write a CSV report
await agent.processQuery('user',
  'Create a CSV file called monthly-report.csv with our sales data from last month'
);
```

#### `write_json`
Write data to JSON files with formatting options.

```typescript
{
  filePath: string;
  data: object;             // Data to write as JSON
  indent?: number;          // Indentation spaces (default: 2)
  overwrite?: boolean;      // Overwrite existing file (default: false)
}
```

#### `append_to_file`
Append content to existing files.

```typescript
{
  filePath: string;
  content: string;
  newline?: boolean;        // Add newline before appending (default: true)
}
```

### File Management

#### `copy_file`
Copy files from source to destination.

```typescript
{
  sourcePath: string;
  destinationPath: string;
  overwrite?: boolean;      // Overwrite destination (default: false)
  createDirectories?: boolean; // Create parent dirs (default: false)
}
```

#### `move_file`
Move or rename files.

```typescript
{
  sourcePath: string;
  destinationPath: string;
  createDirectories?: boolean; // Create parent dirs (default: false)
}
```

#### `delete_file`
Delete files or directories.

```typescript
{
  filePath: string;
  recursive?: boolean;      // Delete directories recursively (default: false)
  force?: boolean;         // Force deletion (default: false)
}
```

### Directory Operations

#### `list_directory`
List files and directories with filtering.

```typescript
{
  directoryPath: string;
  recursive?: boolean;      // List recursively (default: false)
  includeHidden?: boolean;  // Include hidden files (default: false)
  fileExtensions?: string[]; // Filter by extensions (e.g., ['.txt', '.json'])
  maxDepth?: number;       // Max depth for recursive listing (default: 5)
}
```

**Example Usage:**
```typescript
// List all TypeScript files recursively
await agent.processQuery('user', 
  'List all .ts and .tsx files in the src directory and organize them by subdirectory'
);

// Find large files
await agent.processQuery('user',
  'Show me all files larger than 1MB in the current project'
);
```

#### `search_in_files`
Search for content within files.

```typescript
{
  searchPath: string;
  query: string;
  fileExtensions?: string[]; // File types to search
  caseSensitive?: boolean;   // Case sensitive search (default: false)
  useRegex?: boolean;       // Treat query as regex (default: false)
  maxResults?: number;      // Max results to return (default: 100)
}
```

**Example Usage:**
```typescript
// Search for specific function calls
await agent.processQuery('user',
  'Search for all files that call the "processPayment" function and show me the context'
);

// Find email addresses using regex
await agent.processQuery('user',
  'Find all email addresses in text files in the docs directory'
);
```

### File Information

#### `get_file_info`
Get detailed file or directory information.

```typescript
{
  filePath: string;
  includeMetadata?: boolean; // Include extended metadata (default: true)
}
```

## Usage Examples

### 1. Configuration Management

```typescript
// Read configuration and update settings
const agent = new Agent({...});

// Read current config
await agent.processQuery('user', 
  'Read the app-config.json file and show me the current database configuration'
);

// Update configuration
await agent.processQuery('user',
  'Update the database host in app-config.json to "prod-db.example.com" and increase the connection pool to 20'
);
```

### 2. Data Processing

```typescript
// Process CSV data and generate reports
await agent.processQuery('user',
  'Read the sales-data.csv file, calculate the total revenue by region, and create a summary report in markdown format'
);

// Convert between formats
await agent.processQuery('user',
  'Read the users.csv file and convert it to JSON format with proper data types'
);
```

### 3. Code Organization

```typescript
// Organize and analyze code files
await agent.processQuery('user',
  'List all TypeScript files in the project, identify the largest files, and suggest which ones might need refactoring'
);

// Search for patterns
await agent.processQuery('user',
  'Search for all TODO comments in the codebase and create a task list with file locations'
);
```

### 4. Backup and Safety

```typescript
// Create backups before modifications
await agent.processQuery('user',
  'Before updating the database schema, create a backup of all .sql files in the migrations directory'
);

// Verify file integrity
await agent.processQuery('user',
  'Check all JSON configuration files in the config directory for syntax errors'
);
```

## Safety Features

### Automatic Safeguards

1. **File Size Limits**: Prevent reading extremely large files
2. **Overwrite Protection**: Require explicit permission to overwrite files
3. **Path Validation**: Validate file paths and permissions
4. **Error Handling**: Graceful error handling with informative messages

### Best Practices

1. **Always Backup**: Create backups before destructive operations
2. **Validate Inputs**: Check file formats and data integrity
3. **Use Appropriate Limits**: Set reasonable limits for file operations
4. **Check Permissions**: Verify file and directory permissions
5. **Handle Errors**: Always check operation results and handle failures

### Example Safety Patterns

```typescript
// Safe file update pattern
await agent.processQuery('user',
  'Before updating the config.json file, create a backup, then update the database URL, and verify the JSON is still valid'
);

// Safe batch operations
await agent.processQuery('user',
  'List all .log files older than 30 days, show me the total size, then ask for confirmation before deleting them'
);
```

## Integration with Agent States

Document tools work seamlessly with agent state management:

```typescript
const documentStates: StateConfig[] = [
  {
    key: "file_manager",
    description: "File management operations",
    prompt: "Help users manage their files safely and efficiently",
    tools: ["read_file", "write_file", "list_directory", "copy_file"],
    onEnter: async ({ userQuery }) => {
      // Add safety checks for destructive operations
      if (userQuery.includes('delete') || userQuery.includes('remove')) {
        return {
          allowed: true,
          customMessage: "⚠️ This operation may delete files. I'll ask for confirmation before proceeding."
        };
      }
      return { allowed: true };
    }
  }
];
```

## Error Handling

All document tools return standardized responses:

```typescript
// Success response
{
  success: true,
  data: {
    // Tool-specific data
    content: "file content",
    size: 1024,
    format: "json"
  }
}

// Error response
{
  success: false,
  error: "Failed to read file: File not found"
}
```

## Performance Considerations

1. **File Size Limits**: Default 10MB limit prevents memory issues
2. **Streaming**: Large files are processed in chunks when possible
3. **Caching**: Frequently accessed files can be cached by the agent
4. **Async Operations**: All file operations are asynchronous and non-blocking

## Extending Document Tools

You can add custom document tools following the same pattern:

```typescript
const customDocumentTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "compress_files",
      description: "Compress multiple files into an archive",
      parameters: {
        type: "object",
        properties: {
          sourcePaths: { type: "array", items: { type: "string" } },
          outputPath: { type: "string" },
          format: { type: "string", enum: ["zip", "tar", "gzip"] }
        },
        required: ["sourcePaths", "outputPath"]
      }
    }
  }
];

// Register custom implementation
agent.registerTool('compress_files', async ({ sourcePaths, outputPath, format }) => {
  // Implementation here
});
```

## Conclusion

The document tools in Agento provide a comprehensive foundation for file management and data processing. They prioritize safety, provide extensive format support, and integrate seamlessly with the agent system. Whether you're building a data processing agent, a configuration management system, or a general-purpose assistant, these tools provide the file operations you need with proper error handling and safety features built-in. 