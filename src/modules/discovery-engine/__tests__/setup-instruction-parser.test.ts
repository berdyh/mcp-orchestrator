/**
 * Setup Instruction Parser Tests
 * 
 * This module contains comprehensive tests for the setup instruction parser,
 * covering various content types, parsing strategies, and edge cases.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SetupInstructionParser, type StructuredSetupInstructions } from '../setup-instruction-parser';
import type { ScrapedContent } from '../web-scraper';

describe('SetupInstructionParser', () => {
  let parser: SetupInstructionParser;
  let mockScrapedContent: ScrapedContent;

  beforeEach(() => {
    parser = new SetupInstructionParser({
      minConfidenceScore: 0.3,
      enablePatternMatching: true,
      enableCodeExtraction: true,
      enableCredentialDetection: true,
      strictMode: false
    });

    mockScrapedContent = {
      url: 'https://github.com/example/mcp-server',
      title: 'MCP Server Example',
      content: '',
      metadata: {
        contentType: 'github',
        lastModified: '2024-01-01',
        language: 'en',
        size: 1000
      },
      extractedData: {
        installationCommands: [],
        configurationExamples: [],
        setupInstructions: [],
        requiredCredentials: [],
        codeExamples: [],
        troubleshooting: []
      },
      success: true
    };
  });

  describe('parseSetupInstructions', () => {
    it('should parse basic installation commands', async () => {
      mockScrapedContent.content = `
        # Installation
        
        Install the package using npm:
        \`\`\`bash
        npm install @modelcontextprotocol/server-filesystem
        \`\`\`
        
        Or using yarn:
        \`\`\`bash
        yarn add @modelcontextprotocol/server-filesystem
        \`\`\`
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);

      expect(result.installation.commands).toContain('npm install @modelcontextprotocol/server-filesystem');
      expect(result.installation.commands).toContain('yarn add @modelcontextprotocol/server-filesystem');
      expect(result.installation.packageManager).toBe('npm');
      expect(result.metadata.confidence).toBeGreaterThan(0);
    });

    it('should parse configuration examples', async () => {
      mockScrapedContent.content = `
        # Configuration
        
        Create a configuration file:
        \`\`\`json
        {
          "mcpServers": {
            "filesystem": {
              "command": "npx",
              "args": ["@modelcontextprotocol/server-filesystem", "/path/to/directory"]
            }
          }
        }
        \`\`\`
        
        Required fields: command, args
        Optional fields: env, timeout
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);

      expect(result.configuration.examples).toHaveLength(1);
      expect(result.configuration.requiredFields).toContain('command');
      expect(result.configuration.requiredFields).toContain('args');
      expect(result.configuration.optionalFields).toContain('env');
      expect(result.configuration.optionalFields).toContain('timeout');
    });

    it('should parse credentials from content', async () => {
      mockScrapedContent.content = `
        # Setup
        
        You need to provide the following credentials:
        - API_KEY: Your API key for authentication
        - SECRET_TOKEN: Your secret token
        - BASE_URL: The base URL for the API
        
        Set these as environment variables:
        \`\`\`bash
        export API_KEY=your_api_key_here
        export SECRET_TOKEN=your_secret_token_here
        export BASE_URL=https://api.example.com
        \`\`\`
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);

      expect(result.credentials.length).toBeGreaterThanOrEqual(3);
      expect(result.credentials.some(c => c.key === 'API_KEY')).toBe(true);
      expect(result.credentials.some(c => c.key === 'SECRET_TOKEN')).toBe(true);
      expect(result.credentials.some(c => c.key === 'URL')).toBe(true);
      // Check if any credential has an envVar property
      expect(result.credentials.some(c => c.envVar)).toBe(true);
    });

    it('should parse code examples with language detection', async () => {
      mockScrapedContent.content = `
        # Usage Examples
        
        JavaScript example:
        \`\`\`javascript
        import { Client } from '@modelcontextprotocol/sdk';
        
        const client = new Client({
          name: 'my-app',
          version: '1.0.0'
        });
        \`\`\`
        
        Python example:
        \`\`\`python
        from mcp import Client
        
        client = Client(
            name="my-app",
            version="1.0.0"
        )
        \`\`\`
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);

      expect(result.examples).toHaveLength(2);
      expect(result.examples.some(e => e.language === 'javascript')).toBe(true);
      expect(result.examples.some(e => e.language === 'python')).toBe(true);
      expect(result.examples.some(e => e.code.includes('import { Client }'))).toBe(true);
    });

    it('should parse verification steps', async () => {
      mockScrapedContent.content = `
        # Verification
        
        To verify the installation:
        1. Run the test command: \`npm test\`
        2. Check the output: should show "All tests passed"
        3. Verify the server is running: \`curl http://localhost:3000/health\`
        
        Expected output: {"status": "ok", "version": "1.0.0"}
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);

      expect(result.verification.steps.length).toBeGreaterThanOrEqual(3);
      expect(result.verification.testCommands).toContain('npm test');
      expect(result.verification.expectedOutputs).toContain('{"status": "ok", "version": "1.0.0"}');
    });

    it('should parse troubleshooting information', async () => {
      mockScrapedContent.content = `
        # Troubleshooting
        
        ## Common Issues
        
        **Issue**: Server fails to start
        **Solution**: Check that all required environment variables are set
        
        **Issue**: Connection timeout
        **Solution**: Verify the API endpoint is accessible
        
        ## FAQ
        
        Q: How do I configure the server?
        A: Create a configuration file in your home directory.
        
        Q: What ports does the server use?
        A: The server uses port 3000 by default.
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);

      expect(result.troubleshooting.commonIssues).toHaveLength(2);
      expect(result.troubleshooting.faq).toHaveLength(2);
      expect(result.troubleshooting.commonIssues[0].issue).toContain('Server fails to start');
      expect(result.troubleshooting.faq[0].question).toContain('How do I configure');
    });

    it('should handle multiple content types', async () => {
      mockScrapedContent.metadata.contentType = 'npm';
      mockScrapedContent.content = `
        # @modelcontextprotocol/server-filesystem
        
        ## Installation
        \`\`\`bash
        npm install @modelcontextprotocol/server-filesystem
        \`\`\`
        
        ## Configuration
        \`\`\`json
        {
          "command": "npx",
          "args": ["@modelcontextprotocol/server-filesystem", "/path"]
        }
        \`\`\`
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);

      expect(result.metadata.contentTypes).toContain('npm');
      expect(result.installation.commands).toHaveLength(1);
      expect(result.configuration.examples).toHaveLength(1);
    });

    it('should handle empty content gracefully', async () => {
      mockScrapedContent.content = '';
      mockScrapedContent.extractedData = {
        installationCommands: [],
        configurationExamples: [],
        setupInstructions: [],
        requiredCredentials: [],
        codeExamples: [],
        troubleshooting: []
      };

      const result = await parser.parseSetupInstructions(mockScrapedContent);

      expect(result.installation.commands).toHaveLength(0);
      expect(result.configuration.examples).toHaveLength(0);
      expect(result.credentials).toHaveLength(0);
      expect(result.examples).toHaveLength(0);
      expect(result.metadata.confidence).toBe(0);
    });

    it('should handle malformed content', async () => {
      mockScrapedContent.content = 'This is not properly formatted content with no structure';
      mockScrapedContent.success = false;
      mockScrapedContent.error = 'Failed to scrape';

      const result = await parser.parseSetupInstructions(mockScrapedContent);

      expect(result.installation.commands).toHaveLength(0);
      expect(result.metadata.confidence).toBe(0);
    });

    it('should calculate confidence score correctly', async () => {
      mockScrapedContent.content = `
        # Complete Setup Guide
        
        ## Installation
        \`\`\`bash
        npm install @modelcontextprotocol/server-filesystem
        \`\`\`
        
        ## Configuration
        \`\`\`json
        {
          "command": "npx",
          "args": ["@modelcontextprotocol/server-filesystem", "/path"]
        }
        \`\`\`
        
        ## Credentials
        - API_KEY: Required for authentication
        
        ## Usage
        \`\`\`javascript
        import { Client } from '@modelcontextprotocol/sdk';
        \`\`\`
        
        ## Verification
        1. Run \`npm test\`
        2. Check output: "All tests passed"
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);

      expect(result.metadata.confidence).toBeGreaterThan(0.5);
      expect(result.installation.commands.length).toBeGreaterThan(0);
      expect(result.configuration.examples.length).toBeGreaterThan(0);
      expect(result.credentials.length).toBeGreaterThan(0);
      expect(result.examples.length).toBeGreaterThan(0);
      expect(result.verification.steps.length).toBeGreaterThan(0);
    });
  });

  describe('pattern matching', () => {
    it('should match installation patterns', async () => {
      const patterns = [
        'npm install package-name',
        'pip install package-name',
        'yarn add package-name',
        'pnpm add package-name',
        'go get package-name',
        'docker pull image-name',
        'cargo add package-name',
        'gem install package-name'
      ];

      for (const pattern of patterns) {
        mockScrapedContent.content = `Install using: ${pattern}`;
        const result = await parser.parseSetupInstructions(mockScrapedContent);
        expect(result.installation.commands).toContain(pattern);
      }
    });

    it('should match configuration patterns', async () => {
      mockScrapedContent.content = `
        Configuration examples:
        \`\`\`json
        {"key": "value"}
        \`\`\`
        
        \`\`\`yaml
        key: value
        \`\`\`
        
        \`\`\`toml
        key = "value"
        \`\`\`
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);
      expect(result.configuration.examples).toHaveLength(3);
    });

    it('should match credential patterns', async () => {
      mockScrapedContent.content = `
        Required credentials:
        - API_KEY: Your API key
        - SECRET_TOKEN: Your secret token
        - PASSWORD: Your password
        - USERNAME: Your username
        - EMAIL: Your email address
        - URL: The endpoint URL
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);
      expect(result.credentials.length).toBeGreaterThan(0);
      expect(result.credentials.some(c => c.key === 'API_KEY')).toBe(true);
    });
  });

  describe('language detection', () => {
    it('should detect JavaScript', async () => {
      mockScrapedContent.content = `
        \`\`\`javascript
        import { Client } from '@modelcontextprotocol/sdk';
        const client = new Client();
        \`\`\`
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);
      expect(result.examples.some(e => e.language === 'javascript')).toBe(true);
    });

    it('should detect Python', async () => {
      mockScrapedContent.content = `
        \`\`\`python
        from mcp import Client
        client = Client()
        \`\`\`
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);
      expect(result.examples.some(e => e.language === 'python')).toBe(true);
    });

    it('should detect Go', async () => {
      mockScrapedContent.content = `
        \`\`\`go
        package main
        import "fmt"
        func main() {
            fmt.Println("Hello, World!")
        }
        \`\`\`
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);
      expect(result.examples.some(e => e.language === 'go')).toBe(true);
    });

    it('should detect Rust', async () => {
      mockScrapedContent.content = `
        \`\`\`rust
        use std::collections::HashMap;
        fn main() {
            let mut map = HashMap::new();
        }
        \`\`\`
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);
      expect(result.examples.some(e => e.language === 'rust')).toBe(true);
    });

    it('should fallback to text for unknown languages', async () => {
      mockScrapedContent.content = `
        \`\`\`
        This is just plain text
        without any language markers
        \`\`\`
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);
      expect(result.examples.some(e => e.language === 'text')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle parsing errors gracefully', async () => {
      // Mock a scenario that might cause parsing errors
      const invalidContent = {
        ...mockScrapedContent,
        content: null as any,
        success: false,
        error: 'Invalid content'
      };

      const result = await parser.parseSetupInstructions(invalidContent);
      expect(result.metadata.confidence).toBe(0);
      expect(result.installation.commands).toHaveLength(0);
    });

    it('should handle malformed JSON gracefully', async () => {
      mockScrapedContent.content = `
        \`\`\`json
        {
          "invalid": json,
          "missing": quote
        }
        \`\`\`
      `;

      const result = await parser.parseSetupInstructions(mockScrapedContent);
      expect(result.configuration.examples).toHaveLength(1);
      expect(result.configuration.schema).toBeUndefined();
    });
  });

  describe('configuration options', () => {
    it('should respect minConfidenceScore', async () => {
      const strictParser = new SetupInstructionParser({
        minConfidenceScore: 0.9,
        strictMode: true
      });

      mockScrapedContent.content = 'Minimal content';
      const result = await strictParser.parseSetupInstructions(mockScrapedContent);
      
      expect(result.metadata.confidence).toBeLessThan(0.9);
    });

    it('should disable credential detection when configured', async () => {
      const parserWithoutCreds = new SetupInstructionParser({
        enableCredentialDetection: false
      });

      mockScrapedContent.content = `
        Required: API_KEY, SECRET_TOKEN
      `;

      const result = await parserWithoutCreds.parseSetupInstructions(mockScrapedContent);
      expect(result.credentials).toHaveLength(0);
    });

    it('should disable code extraction when configured', async () => {
      const parserWithoutCode = new SetupInstructionParser({
        enableCodeExtraction: false
      });

      mockScrapedContent.content = `
        \`\`\`javascript
        console.log('Hello World');
        \`\`\`
      `;

      const result = await parserWithoutCode.parseSetupInstructions(mockScrapedContent);
      expect(result.examples).toHaveLength(0);
    });
  });

  describe('integration with scraped data', () => {
    it('should use scraped data when available', async () => {
      mockScrapedContent.extractedData = {
        installationCommands: ['npm install test-package'],
        configurationExamples: ['{"test": "config"}'],
        setupInstructions: ['Step 1: Install', 'Step 2: Configure'],
        requiredCredentials: ['API_KEY', 'SECRET_TOKEN'],
        codeExamples: ['console.log("test");'],
        troubleshooting: ['Check your configuration']
      };

      const result = await parser.parseSetupInstructions(mockScrapedContent);

      expect(result.installation.commands).toContain('npm install test-package');
      expect(result.configuration.examples).toContain('{"test": "config"}');
      expect(result.verification.steps).toContain('Step 1: Install');
      expect(result.credentials.some(c => c.key === 'API_KEY')).toBe(true);
      expect(result.examples.some(e => e.code.includes('console.log'))).toBe(true);
      expect(result.troubleshooting.commonIssues.some(i => i.issue.includes('Check your configuration'))).toBe(true);
    });

    it('should combine scraped data with content parsing', async () => {
      mockScrapedContent.content = `
        Additional installation: pip install extra-package
      `;
      mockScrapedContent.extractedData = {
        installationCommands: ['npm install base-package'],
        configurationExamples: [],
        setupInstructions: [],
        requiredCredentials: [],
        codeExamples: [],
        troubleshooting: []
      };

      const result = await parser.parseSetupInstructions(mockScrapedContent);

      expect(result.installation.commands).toContain('npm install base-package');
      expect(result.installation.commands).toContain('pip install extra-package');
    });
  });
});
