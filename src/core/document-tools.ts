import type { Tool } from "../types";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Document Tools for Agents
 * Provides comprehensive document manipulation capabilities for various file formats
 */

export const documentTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file with support for various formats (text, JSON, CSV, etc.)",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Path to the file to read"
          },
          encoding: {
            type: "string",
            enum: ["utf8", "ascii", "base64", "binary", "hex"],
            description: "File encoding (default: utf8)"
          },
          format: {
            type: "string",
            enum: ["auto", "text", "json", "csv", "xml", "yaml", "markdown"],
            description: "Expected file format for parsing (default: auto)"
          },
          maxSize: {
            type: "number",
            description: "Maximum file size in bytes to read (default: 10MB)"
          }
        },
        required: ["filePath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file with format-specific handling",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Path where the file will be written"
          },
          content: {
            type: "string",
            description: "Content to write to the file"
          },
          format: {
            type: "string",
            enum: ["text", "json", "csv", "xml", "yaml", "markdown"],
            description: "Format to write the content in"
          },
          encoding: {
            type: "string",
            enum: ["utf8", "ascii", "base64", "binary"],
            description: "File encoding (default: utf8)"
          },
          createDirectories: {
            type: "boolean",
            description: "Create parent directories if they don't exist (default: false)"
          },
          overwrite: {
            type: "boolean",
            description: "Whether to overwrite existing file (default: false)"
          }
        },
        required: ["filePath", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "append_to_file",
      description: "Append content to an existing file",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Path to the file to append to"
          },
          content: {
            type: "string",
            description: "Content to append"
          },
          newline: {
            type: "boolean",
            description: "Add a newline before appending (default: true)"
          }
        },
        required: ["filePath", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description: "List files and directories in a given path with filtering options",
      parameters: {
        type: "object",
        properties: {
          directoryPath: {
            type: "string",
            description: "Path to the directory to list"
          },
          recursive: {
            type: "boolean",
            description: "Whether to list files recursively (default: false)"
          },
          includeHidden: {
            type: "boolean",
            description: "Include hidden files and directories (default: false)"
          },
          fileExtensions: {
            type: "array",
            items: { type: "string" },
            description: "Filter by file extensions (e.g., ['.txt', '.json'])"
          },
          maxDepth: {
            type: "number",
            description: "Maximum depth for recursive listing (default: 5)"
          }
        },
        required: ["directoryPath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_in_files",
      description: "Search for text content within files in a directory",
      parameters: {
        type: "object",
        properties: {
          searchPath: {
            type: "string",
            description: "Directory path to search in"
          },
          query: {
            type: "string",
            description: "Text to search for"
          },
          fileExtensions: {
            type: "array",
            items: { type: "string" },
            description: "File extensions to include in search"
          },
          caseSensitive: {
            type: "boolean",
            description: "Whether search should be case sensitive (default: false)"
          },
          useRegex: {
            type: "boolean",
            description: "Whether to treat query as regex pattern (default: false)"
          },
          maxResults: {
            type: "number",
            description: "Maximum number of results to return (default: 100)"
          }
        },
        required: ["searchPath", "query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_file_info",
      description: "Get detailed information about a file or directory",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Path to the file or directory"
          },
          includeMetadata: {
            type: "boolean",
            description: "Include extended metadata like file type detection (default: true)"
          }
        },
        required: ["filePath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "copy_file",
      description: "Copy a file from source to destination",
      parameters: {
        type: "object",
        properties: {
          sourcePath: {
            type: "string",
            description: "Source file path"
          },
          destinationPath: {
            type: "string",
            description: "Destination file path"
          },
          overwrite: {
            type: "boolean",
            description: "Whether to overwrite existing destination file (default: false)"
          },
          createDirectories: {
            type: "boolean",
            description: "Create parent directories if they don't exist (default: false)"
          }
        },
        required: ["sourcePath", "destinationPath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "move_file",
      description: "Move or rename a file",
      parameters: {
        type: "object",
        properties: {
          sourcePath: {
            type: "string",
            description: "Current file path"
          },
          destinationPath: {
            type: "string",
            description: "New file path"
          },
          createDirectories: {
            type: "boolean",
            description: "Create parent directories if they don't exist (default: false)"
          }
        },
        required: ["sourcePath", "destinationPath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Delete a file or directory",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Path to the file or directory to delete"
          },
          recursive: {
            type: "boolean",
            description: "Delete directories recursively (default: false)"
          },
          force: {
            type: "boolean",
            description: "Force deletion without confirmation (default: false)"
          }
        },
        required: ["filePath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "parse_csv",
      description: "Parse CSV file content into structured data",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Path to the CSV file"
          },
          delimiter: {
            type: "string",
            description: "CSV delimiter character (default: ',')"
          },
          hasHeader: {
            type: "boolean",
            description: "Whether the first row contains headers (default: true)"
          },
          maxRows: {
            type: "number",
            description: "Maximum number of rows to parse (default: 1000)"
          }
        },
        required: ["filePath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "parse_json",
      description: "Parse JSON file with error handling and validation",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Path to the JSON file"
          },
          validateSchema: {
            type: "object",
            description: "Optional JSON schema to validate against"
          },
          allowComments: {
            type: "boolean",
            description: "Allow JavaScript-style comments in JSON (default: false)"
          }
        },
        required: ["filePath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_json",
      description: "Write data to a JSON file with formatting options",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Path where the JSON file will be written"
          },
          data: {
            type: "object",
            description: "Data to write as JSON"
          },
          indent: {
            type: "number",
            description: "Number of spaces for indentation (default: 2)"
          },
          overwrite: {
            type: "boolean",
            description: "Whether to overwrite existing file (default: false)"
          }
        },
        required: ["filePath", "data"]
      }
    }
  }
];

/**
 * Helper functions for document operations
 */

// Detect file format from extension or content
function detectFileFormat(filePath: string, content?: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const formatMap: Record<string, string> = {
    '.json': 'json',
    '.csv': 'csv',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.txt': 'text',
    '.html': 'html',
    '.htm': 'html'
  };
  
  if (formatMap[ext]) {
    return formatMap[ext];
  }
  
  // Try to detect from content
  if (content) {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
    if (trimmed.startsWith('<')) {
      return 'xml';
    }
    if (trimmed.includes('---\n') || trimmed.startsWith('---')) {
      return 'yaml';
    }
  }
  
  return 'text';
}

// Parse CSV content
function parseCSVContent(content: string, delimiter = ',', hasHeader = true): any[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const rows = lines.map(line => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  });
  
  if (hasHeader && rows.length > 1) {
    const headers = rows[0];
    return rows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }
  
  return rows;
}

/**
 * Document Tool Implementations
 */
export const documentToolImplementations = {
  read_file: async ({ 
    filePath, 
    encoding = 'utf8', 
    format = 'auto', 
    maxSize = 10 * 1024 * 1024 
  }: any) => {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size > maxSize) {
        return {
          success: false,
          error: `File size (${stats.size} bytes) exceeds maximum allowed size (${maxSize} bytes)`
        };
      }
      
      const content = await fs.readFile(filePath, encoding as BufferEncoding);
      const contentString = content.toString();
      const detectedFormat = format === 'auto' ? detectFileFormat(filePath, contentString) : format;
      
      let parsedContent: any = contentString;
      
      // Parse content based on format
      switch (detectedFormat) {
        case 'json':
          try {
            parsedContent = JSON.parse(contentString);
          } catch (e) {
            return {
              success: false,
              error: `Failed to parse JSON: ${e instanceof Error ? e.message : 'Unknown error'}`
            };
          }
          break;
        case 'csv':
          try {
            parsedContent = parseCSVContent(contentString);
          } catch (e) {
            return {
              success: false,
              error: `Failed to parse CSV: ${e instanceof Error ? e.message : 'Unknown error'}`
            };
          }
          break;
      }
      
      return {
        success: true,
        data: {
          content: parsedContent,
          format: detectedFormat,
          size: stats.size,
          encoding,
          lastModified: stats.mtime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  write_file: async ({ 
    filePath, 
    content, 
    format = 'text', 
    encoding = 'utf8', 
    createDirectories = false, 
    overwrite = false 
  }: any) => {
    try {
      // Check if file exists
      try {
        await fs.access(filePath);
        if (!overwrite) {
          return {
            success: false,
            error: 'File already exists and overwrite is disabled'
          };
        }
      } catch {
        // File doesn't exist, which is fine
      }
      
      // Create directories if needed
      if (createDirectories) {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
      }
      
      let finalContent = content;
      
      // Format content based on type
      switch (format) {
        case 'json':
          finalContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
          break;
      }
      
      await fs.writeFile(filePath, finalContent, encoding);
      
      const stats = await fs.stat(filePath);
      
      return {
        success: true,
        data: {
          filePath,
          size: stats.size,
          format,
          encoding
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  append_to_file: async ({ filePath, content, newline = true }: any) => {
    try {
      const appendContent = newline ? '\n' + content : content;
      await fs.appendFile(filePath, appendContent, 'utf8');
      
      const stats = await fs.stat(filePath);
      
      return {
        success: true,
        data: {
          filePath,
          appended: content.length,
          newSize: stats.size
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to append to file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  list_directory: async ({ 
    directoryPath, 
    recursive = false, 
    includeHidden = false, 
    fileExtensions = [], 
    maxDepth = 5 
  }: any) => {
    try {
      const results: any[] = [];
      
      async function scanDirectory(dirPath: string, currentDepth = 0): Promise<void> {
        if (recursive && currentDepth >= maxDepth) return;
        
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          // Skip hidden files if not included
          if (!includeHidden && entry.name.startsWith('.')) continue;
          
          // Filter by extensions if specified
          if (fileExtensions.length > 0 && entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (!fileExtensions.includes(ext)) continue;
          }
          
          const stats = await fs.stat(fullPath);
          
          results.push({
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: entry.isFile() ? stats.size : undefined,
            modified: stats.mtime,
            created: stats.birthtime
          });
          
          // Recurse into subdirectories
          if (recursive && entry.isDirectory()) {
            await scanDirectory(fullPath, currentDepth + 1);
          }
        }
      }
      
      await scanDirectory(directoryPath);
      
      return {
        success: true,
        data: {
          directory: directoryPath,
          count: results.length,
          items: results
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  search_in_files: async ({ 
    searchPath, 
    query, 
    fileExtensions = [], 
    caseSensitive = false, 
    useRegex = false, 
    maxResults = 100 
  }: any) => {
    try {
      const results: any[] = [];
      let searchPattern: RegExp;
      
      if (useRegex) {
        searchPattern = new RegExp(query, caseSensitive ? 'g' : 'gi');
      } else {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        searchPattern = new RegExp(escapedQuery, caseSensitive ? 'g' : 'gi');
      }
      
      async function searchInDirectory(dirPath: string): Promise<void> {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (results.length >= maxResults) break;
          
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            await searchInDirectory(fullPath);
          } else if (entry.isFile()) {
            // Check file extension filter
            if (fileExtensions.length > 0) {
              const ext = path.extname(entry.name).toLowerCase();
              if (!fileExtensions.includes(ext)) continue;
            }
            
            try {
              const content = await fs.readFile(fullPath, 'utf8');
              const matches = content.match(searchPattern);
              
              if (matches) {
                const lines = content.split('\n');
                const matchedLines: any[] = [];
                
                lines.forEach((line, index) => {
                  if (searchPattern.test(line)) {
                    matchedLines.push({
                      lineNumber: index + 1,
                      content: line.trim(),
                      matchCount: (line.match(searchPattern) || []).length
                    });
                  }
                });
                
                results.push({
                  file: fullPath,
                  totalMatches: matches.length,
                  lines: matchedLines
                });
              }
            } catch (fileError) {
              // Skip files that can't be read
              continue;
            }
          }
        }
      }
      
      await searchInDirectory(searchPath);
      
      return {
        success: true,
        data: {
          query,
          searchPath,
          totalFiles: results.length,
          totalMatches: results.reduce((sum, result) => sum + result.totalMatches, 0),
          results
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search in files: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  get_file_info: async ({ filePath, includeMetadata = true }: any) => {
    try {
      const stats = await fs.stat(filePath);
      const info: any = {
        path: filePath,
        name: path.basename(filePath),
        extension: path.extname(filePath),
        size: stats.size,
        type: stats.isDirectory() ? 'directory' : 'file',
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime
      };
      
      if (includeMetadata && stats.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.txt': 'text/plain',
          '.json': 'application/json',
          '.csv': 'text/csv',
          '.xml': 'application/xml',
          '.html': 'text/html',
          '.md': 'text/markdown'
        };
        
        info.mimeType = mimeTypes[ext] || 'application/octet-stream';
        info.isText = info.mimeType.startsWith('text/') || info.mimeType.includes('json');
      }
      
      return {
        success: true,
        data: info
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  copy_file: async ({ sourcePath, destinationPath, overwrite = false, createDirectories = false }: any) => {
    try {
      // Check if destination exists
      try {
        await fs.access(destinationPath);
        if (!overwrite) {
          return {
            success: false,
            error: 'Destination file already exists and overwrite is disabled'
          };
        }
      } catch {
        // Destination doesn't exist, which is fine
      }
      
      // Create directories if needed
      if (createDirectories) {
        const dir = path.dirname(destinationPath);
        await fs.mkdir(dir, { recursive: true });
      }
      
      await fs.copyFile(sourcePath, destinationPath);
      
      const stats = await fs.stat(destinationPath);
      
      return {
        success: true,
        data: {
          source: sourcePath,
          destination: destinationPath,
          size: stats.size
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  move_file: async ({ sourcePath, destinationPath, createDirectories = false }: any) => {
    try {
      // Create directories if needed
      if (createDirectories) {
        const dir = path.dirname(destinationPath);
        await fs.mkdir(dir, { recursive: true });
      }
      
      await fs.rename(sourcePath, destinationPath);
      
      return {
        success: true,
        data: {
          source: sourcePath,
          destination: destinationPath
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  delete_file: async ({ filePath, recursive = false, force = false }: any) => {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        if (recursive) {
          await fs.rm(filePath, { recursive: true, force });
        } else {
          await fs.rmdir(filePath);
        }
      } else {
        await fs.unlink(filePath);
      }
      
      return {
        success: true,
        data: {
          deleted: filePath,
          type: stats.isDirectory() ? 'directory' : 'file'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  parse_csv: async ({ filePath, delimiter = ',', hasHeader = true, maxRows = 1000 }: any) => {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const allData = parseCSVContent(content, delimiter, hasHeader);
      
      const limitedData = maxRows ? allData.slice(0, maxRows) : allData;
      
      return {
        success: true,
        data: {
          rows: limitedData,
          totalRows: allData.length,
          hasHeader,
          delimiter,
          columns: hasHeader && allData.length > 0 ? Object.keys(allData[0]) : undefined
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  parse_json: async ({ filePath, validateSchema, allowComments = false }: any) => {
    try {
      let content = await fs.readFile(filePath, 'utf8');
      
      // Remove comments if allowed
      if (allowComments) {
        content = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      }
      
      const data = JSON.parse(content);
      
      return {
        success: true,
        data: {
          content: data,
          size: content.length,
          type: Array.isArray(data) ? 'array' : typeof data
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  write_json: async ({ filePath, data, indent = 2, overwrite = false }: any) => {
    try {
      // Check if file exists
      try {
        await fs.access(filePath);
        if (!overwrite) {
          return {
            success: false,
            error: 'File already exists and overwrite is disabled'
          };
        }
      } catch {
        // File doesn't exist, which is fine
      }
      
      const jsonContent = JSON.stringify(data, null, indent);
      await fs.writeFile(filePath, jsonContent, 'utf8');
      
      const stats = await fs.stat(filePath);
      
      return {
        success: true,
        data: {
          filePath,
          size: stats.size,
          indent
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}; 