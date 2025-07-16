import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from 'fs/promises';
import * as path from 'path';
import { documentToolImplementations } from '../../src/core/document-tools';

describe('Document Tools', () => {
  const testDir = path.join(__dirname, 'test-files');
  const testFile = path.join(testDir, 'test.txt');
  const testJsonFile = path.join(testDir, 'test.json');
  const testCsvFile = path.join(testDir, 'test.csv');

  beforeEach(async () => {
    // Create test directory
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('read_file', () => {
    it('should read a text file successfully', async () => {
      const content = 'Hello, World!';
      await fs.writeFile(testFile, content, 'utf8');

      const result = await documentToolImplementations.read_file({
        filePath: testFile,
        encoding: 'utf8',
        format: 'text'
      });

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe(content);
      expect(result.data?.format).toBe('text');
      expect(result.data?.encoding).toBe('utf8');
    });

    it('should parse JSON file automatically', async () => {
      const jsonData = { name: 'test', value: 42 };
      await fs.writeFile(testJsonFile, JSON.stringify(jsonData), 'utf8');

      const result = await documentToolImplementations.read_file({
        filePath: testJsonFile,
        format: 'auto'
      });

      expect(result.success).toBe(true);
      expect(result.data.content).toEqual(jsonData);
      expect(result.data.format).toBe('json');
    });

    it('should parse CSV file', async () => {
      const csvContent = 'name,age,city\nJohn,25,New York\nJane,30,Los Angeles';
      await fs.writeFile(testCsvFile, csvContent, 'utf8');

      const result = await documentToolImplementations.read_file({
        filePath: testCsvFile,
        format: 'csv'
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.content)).toBe(true);
      expect(result.data.content[0]).toEqual({
        name: 'John',
        age: '25',
        city: 'New York'
      });
    });

    it('should fail for non-existent file', async () => {
      const result = await documentToolImplementations.read_file({
        filePath: 'non-existent-file.txt'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read file');
    });

    it('should respect file size limit', async () => {
      const largeContent = 'x'.repeat(1000);
      await fs.writeFile(testFile, largeContent, 'utf8');

      const result = await documentToolImplementations.read_file({
        filePath: testFile,
        maxSize: 500
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });
  });

  describe('write_file', () => {
    it('should write a text file successfully', async () => {
      const content = 'Test content';
      
      const result = await documentToolImplementations.write_file({
        filePath: testFile,
        content,
        format: 'text',
        overwrite: true
      });

      expect(result.success).toBe(true);
      expect(result.data.filePath).toBe(testFile);

      // Verify file was written
      const writtenContent = await fs.readFile(testFile, 'utf8');
      expect(writtenContent).toBe(content);
    });

    it('should write JSON file with formatting', async () => {
      const data = { name: 'test', value: 42 };
      
      const result = await documentToolImplementations.write_file({
        filePath: testJsonFile,
        content: data,
        format: 'json',
        overwrite: true
      });

      expect(result.success).toBe(true);

      // Verify JSON was formatted
      const writtenContent = await fs.readFile(testJsonFile, 'utf8');
      const parsedContent = JSON.parse(writtenContent);
      expect(parsedContent).toEqual(data);
    });

    it('should create directories when requested', async () => {
      const nestedFile = path.join(testDir, 'nested', 'dir', 'file.txt');
      
      const result = await documentToolImplementations.write_file({
        filePath: nestedFile,
        content: 'nested content',
        createDirectories: true,
        overwrite: true
      });

      expect(result.success).toBe(true);

      // Verify file exists
      const stats = await fs.stat(nestedFile);
      expect(stats.isFile()).toBe(true);
    });

    it('should fail when file exists and overwrite is false', async () => {
      await fs.writeFile(testFile, 'existing content', 'utf8');
      
      const result = await documentToolImplementations.write_file({
        filePath: testFile,
        content: 'new content',
        overwrite: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('append_to_file', () => {
    it('should append content to existing file', async () => {
      const initialContent = 'Initial content';
      const appendContent = 'Appended content';
      
      await fs.writeFile(testFile, initialContent, 'utf8');
      
      const result = await documentToolImplementations.append_to_file({
        filePath: testFile,
        content: appendContent,
        newline: true
      });

      expect(result.success).toBe(true);

      // Verify content was appended
      const finalContent = await fs.readFile(testFile, 'utf8');
      expect(finalContent).toBe(initialContent + '\n' + appendContent);
    });

    it('should append without newline when requested', async () => {
      const initialContent = 'Initial';
      const appendContent = 'Appended';
      
      await fs.writeFile(testFile, initialContent, 'utf8');
      
      const result = await documentToolImplementations.append_to_file({
        filePath: testFile,
        content: appendContent,
        newline: false
      });

      expect(result.success).toBe(true);

      // Verify content was appended without newline
      const finalContent = await fs.readFile(testFile, 'utf8');
      expect(finalContent).toBe(initialContent + appendContent);
    });
  });

  describe('list_directory', () => {
    it('should list files in directory', async () => {
      // Create test files
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1', 'utf8');
      await fs.writeFile(path.join(testDir, 'file2.json'), '{}', 'utf8');
      await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true });

      const result = await documentToolImplementations.list_directory({
        directoryPath: testDir,
        recursive: false
      });

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(3);
      expect(result.data.items.some((item: any) => item.name === 'file1.txt')).toBe(true);
      expect(result.data.items.some((item: any) => item.name === 'file2.json')).toBe(true);
      expect(result.data.items.some((item: any) => item.name === 'subdir')).toBe(true);
    });

    it('should filter by file extensions', async () => {
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1', 'utf8');
      await fs.writeFile(path.join(testDir, 'file2.json'), '{}', 'utf8');
      await fs.writeFile(path.join(testDir, 'file3.csv'), 'a,b', 'utf8');

      const result = await documentToolImplementations.list_directory({
        directoryPath: testDir,
        fileExtensions: ['.txt', '.json']
      });

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(2);
      expect(result.data.items.every((item: any) => 
        item.name.endsWith('.txt') || item.name.endsWith('.json')
      )).toBe(true);
    });

    it('should list recursively', async () => {
      const subDir = path.join(testDir, 'subdir');
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1', 'utf8');
      await fs.writeFile(path.join(subDir, 'file2.txt'), 'content2', 'utf8');

      const result = await documentToolImplementations.list_directory({
        directoryPath: testDir,
        recursive: true
      });

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(3); // file1.txt, subdir, file2.txt
      expect(result.data.items.some((item: any) => item.path.includes('subdir'))).toBe(true);
    });
  });

  describe('search_in_files', () => {
    it('should find text in files', async () => {
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'Hello world!', 'utf8');
      await fs.writeFile(path.join(testDir, 'file2.txt'), 'Goodbye world!', 'utf8');
      await fs.writeFile(path.join(testDir, 'file3.txt'), 'No match here', 'utf8');

      const result = await documentToolImplementations.search_in_files({
        searchPath: testDir,
        query: 'world',
        caseSensitive: false
      });

      expect(result.success).toBe(true);
      expect(result.data.totalFiles).toBe(2);
      expect(result.data.totalMatches).toBe(2);
    });

    it('should support regex search', async () => {
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'Email: test@example.com', 'utf8');
      await fs.writeFile(path.join(testDir, 'file2.txt'), 'Email: user@test.org', 'utf8');

      const result = await documentToolImplementations.search_in_files({
        searchPath: testDir,
        query: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
        useRegex: true
      });

      expect(result.success).toBe(true);
      expect(result.data.totalFiles).toBe(2);
    });

    it('should filter by file extensions', async () => {
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'search term', 'utf8');
      await fs.writeFile(path.join(testDir, 'file2.json'), '"search term"', 'utf8');

      const result = await documentToolImplementations.search_in_files({
        searchPath: testDir,
        query: 'search term',
        fileExtensions: ['.txt']
      });

      expect(result.success).toBe(true);
      expect(result.data.totalFiles).toBe(1);
      expect(result.data.results[0].file.endsWith('.txt')).toBe(true);
    });
  });

  describe('get_file_info', () => {
    it('should get file information', async () => {
      const content = 'Test content';
      await fs.writeFile(testFile, content, 'utf8');

      const result = await documentToolImplementations.get_file_info({
        filePath: testFile,
        includeMetadata: true
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('test.txt');
      expect(result.data.extension).toBe('.txt');
      expect(result.data.type).toBe('file');
      expect(result.data.size).toBe(content.length);
      expect(result.data.mimeType).toBe('text/plain');
      expect(result.data.isText).toBe(true);
    });

    it('should get directory information', async () => {
      const result = await documentToolImplementations.get_file_info({
        filePath: testDir
      });

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('directory');
    });
  });

  describe('copy_file', () => {
    it('should copy file successfully', async () => {
      const content = 'Original content';
      const destFile = path.join(testDir, 'copy.txt');
      
      await fs.writeFile(testFile, content, 'utf8');

      const result = await documentToolImplementations.copy_file({
        sourcePath: testFile,
        destinationPath: destFile,
        overwrite: true
      });

      expect(result.success).toBe(true);

      // Verify copy exists and has same content
      const copiedContent = await fs.readFile(destFile, 'utf8');
      expect(copiedContent).toBe(content);
    });

    it('should fail when destination exists and overwrite is false', async () => {
      const destFile = path.join(testDir, 'copy.txt');
      
      await fs.writeFile(testFile, 'content', 'utf8');
      await fs.writeFile(destFile, 'existing', 'utf8');

      const result = await documentToolImplementations.copy_file({
        sourcePath: testFile,
        destinationPath: destFile,
        overwrite: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('move_file', () => {
    it('should move file successfully', async () => {
      const content = 'Content to move';
      const destFile = path.join(testDir, 'moved.txt');
      
      await fs.writeFile(testFile, content, 'utf8');

      const result = await documentToolImplementations.move_file({
        sourcePath: testFile,
        destinationPath: destFile
      });

      expect(result.success).toBe(true);

      // Verify original doesn't exist and destination does
      try {
        await fs.access(testFile);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        // Expected - original file should not exist
      }

      const movedContent = await fs.readFile(destFile, 'utf8');
      expect(movedContent).toBe(content);
    });
  });

  describe('delete_file', () => {
    it('should delete file successfully', async () => {
      await fs.writeFile(testFile, 'content', 'utf8');

      const result = await documentToolImplementations.delete_file({
        filePath: testFile
      });

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('file');

      // Verify file is deleted
      try {
        await fs.access(testFile);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        // Expected - file should not exist
      }
    });

    it('should delete directory recursively', async () => {
      const subDir = path.join(testDir, 'subdir');
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(subDir, 'file.txt'), 'content', 'utf8');

      const result = await documentToolImplementations.delete_file({
        filePath: subDir,
        recursive: true
      });

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('directory');

      // Verify directory is deleted
      try {
        await fs.access(subDir);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        // Expected - directory should not exist
      }
    });
  });

  describe('parse_csv', () => {
    it('should parse CSV with headers', async () => {
      const csvContent = 'name,age,city\nJohn,25,New York\nJane,30,Los Angeles';
      await fs.writeFile(testCsvFile, csvContent, 'utf8');

      const result = await documentToolImplementations.parse_csv({
        filePath: testCsvFile,
        hasHeader: true
      });

      expect(result.success).toBe(true);
      expect(result.data.rows).toHaveLength(2);
      expect(result.data.rows[0]).toEqual({
        name: 'John',
        age: '25',
        city: 'New York'
      });
      expect(result.data.columns).toEqual(['name', 'age', 'city']);
    });

    it('should parse CSV without headers', async () => {
      const csvContent = 'John,25,New York\nJane,30,Los Angeles';
      await fs.writeFile(testCsvFile, csvContent, 'utf8');

      const result = await documentToolImplementations.parse_csv({
        filePath: testCsvFile,
        hasHeader: false
      });

      expect(result.success).toBe(true);
      expect(result.data.rows).toHaveLength(2);
      expect(result.data.rows[0]).toEqual(['John', '25', 'New York']);
    });

    it('should respect maxRows limit', async () => {
      const csvContent = 'name,age\nJohn,25\nJane,30\nBob,35';
      await fs.writeFile(testCsvFile, csvContent, 'utf8');

      const result = await documentToolImplementations.parse_csv({
        filePath: testCsvFile,
        hasHeader: true,
        maxRows: 1
      });

      expect(result.success).toBe(true);
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.totalRows).toBe(3); // Original data had 3 rows after header
    });
  });

  describe('parse_json', () => {
    it('should parse valid JSON', async () => {
      const jsonData = { name: 'test', value: 42, items: [1, 2, 3] };
      await fs.writeFile(testJsonFile, JSON.stringify(jsonData), 'utf8');

      const result = await documentToolImplementations.parse_json({
        filePath: testJsonFile
      });

      expect(result.success).toBe(true);
      expect(result.data.content).toEqual(jsonData);
      expect(result.data.type).toBe('object');
    });

    it('should handle JSON arrays', async () => {
      const jsonData = [1, 2, 3];
      await fs.writeFile(testJsonFile, JSON.stringify(jsonData), 'utf8');

      const result = await documentToolImplementations.parse_json({
        filePath: testJsonFile
      });

      expect(result.success).toBe(true);
      expect(result.data.content).toEqual(jsonData);
      expect(result.data.type).toBe('array');
    });

    it('should fail on invalid JSON', async () => {
      await fs.writeFile(testJsonFile, '{ invalid json', 'utf8');

      const result = await documentToolImplementations.parse_json({
        filePath: testJsonFile
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse JSON');
    });
  });

  describe('write_json', () => {
    it('should write JSON with formatting', async () => {
      const data = { name: 'test', value: 42 };

      const result = await documentToolImplementations.write_json({
        filePath: testJsonFile,
        data,
        indent: 2,
        overwrite: true
      });

      expect(result.success).toBe(true);

      // Verify formatting
      const content = await fs.readFile(testJsonFile, 'utf8');
      expect(content).toContain('  "name": "test"');
      
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(data);
    });

    it('should fail when file exists and overwrite is false', async () => {
      await fs.writeFile(testJsonFile, '{}', 'utf8');

      const result = await documentToolImplementations.write_json({
        filePath: testJsonFile,
        data: { test: true },
        overwrite: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });
}); 