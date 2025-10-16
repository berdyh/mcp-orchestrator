/**
 * Setup Instruction Parser
 * 
 * This module provides comprehensive parsing capabilities for extracting structured
 * setup instructions from various documentation sources including GitHub READMEs,
 * NPM documentation, official docs, and code examples.
 */

import { createLogger } from '../../utils/logger';
import type { ScrapedContent } from './web-scraper';

const logger = createLogger('setup-instruction-parser');

/**
 * Structured setup instruction data
 */
export interface StructuredSetupInstructions {
  installation: {
    commands: string[];
    requirements: string[];
    packageManager?: string;
    version?: string;
  };
  configuration: {
    template?: string;
    requiredFields: string[];
    optionalFields: string[];
    examples: string[];
    schema?: object;
  };
  credentials: Array<{
    key: string;
    description: string;
    optional: boolean;
    envVar?: string;
    obtainUrl?: string;
    validationPattern?: string;
  }>;
  examples: Array<{
    language: string;
    code: string;
    description?: string;
  }>;
  verification: {
    steps: string[];
    testCommands: string[];
    expectedOutputs: string[];
  };
  troubleshooting: {
    commonIssues: Array<{
      issue: string;
      solution: string;
    }>;
    faq: Array<{
      question: string;
      answer: string;
    }>;
  };
  metadata: {
    source: string;
    parsedAt: string;
    confidence: number;
    contentTypes: string[];
  };
}

/**
 * Parser configuration
 */
export interface ParserConfig {
  minConfidenceScore?: number;
  enablePatternMatching?: boolean;
  enableCodeExtraction?: boolean;
  enableCredentialDetection?: boolean;
  strictMode?: boolean;
}

/**
 * Content type specific parsing strategies
 */
export interface ParsingStrategy {
  name: string;
  patterns: RegExp[];
  extractors: Array<(content: string) => string[]>;
  priority: number;
}

/**
 * Setup instruction parser with multiple parsing strategies
 */
export class SetupInstructionParser {
  private config: ParserConfig;
  private strategies: Map<string, ParsingStrategy>;

  constructor(config: ParserConfig = {}) {
    this.config = {
      minConfidenceScore: 0.3,
      enablePatternMatching: true,
      enableCodeExtraction: true,
      enableCredentialDetection: true,
      strictMode: false,
      ...config
    };

    this.strategies = new Map();
    this.initializeStrategies();

    logger.info('Setup instruction parser initialized', { config: this.config });
  }

  /**
   * Parses setup instructions from scraped content
   */
  async parseSetupInstructions(scrapedContent: ScrapedContent): Promise<StructuredSetupInstructions> {
    try {
      logger.debug('Parsing setup instructions', { 
        url: scrapedContent.url,
        contentType: scrapedContent.metadata.contentType 
      });

      const result: StructuredSetupInstructions = {
        installation: {
          commands: [],
          requirements: [],
          packageManager: undefined,
          version: undefined
        },
        configuration: {
          requiredFields: [],
          optionalFields: [],
          examples: [],
          schema: undefined
        },
        credentials: [],
        examples: [],
        verification: {
          steps: [],
          testCommands: [],
          expectedOutputs: []
        },
        troubleshooting: {
          commonIssues: [],
          faq: []
        },
        metadata: {
          source: scrapedContent.url,
          parsedAt: new Date().toISOString(),
          confidence: 0,
          contentTypes: [scrapedContent.metadata.contentType]
        }
      };

      // Parse installation information
      result.installation = this.parseInstallationInfo(scrapedContent);
      
      // Parse configuration information
      result.configuration = this.parseConfigurationInfo(scrapedContent);
      
      // Parse credentials
      if (this.config.enableCredentialDetection) {
        result.credentials = this.parseCredentials(scrapedContent);
      }
      
      // Parse code examples
      if (this.config.enableCodeExtraction) {
        result.examples = this.parseCodeExamples(scrapedContent);
      }
      
      // Parse verification steps
      result.verification = this.parseVerificationSteps(scrapedContent);
      
      // Parse troubleshooting information
      result.troubleshooting = this.parseTroubleshooting(scrapedContent);
      
      // Calculate overall confidence
      result.metadata.confidence = this.calculateConfidence(result);

      logger.info('Successfully parsed setup instructions', {
        url: scrapedContent.url,
        confidence: result.metadata.confidence,
        installationCommands: result.installation.commands.length,
        credentials: result.credentials.length,
        examples: result.examples.length
      });

      return result;

    } catch (error) {
      logger.error('Failed to parse setup instructions', {
        url: scrapedContent.url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Return minimal structure on error
      return {
        installation: { commands: [], requirements: [] },
        configuration: { requiredFields: [], optionalFields: [], examples: [] },
        credentials: [],
        examples: [],
        verification: { steps: [], testCommands: [], expectedOutputs: [] },
        troubleshooting: { commonIssues: [], faq: [] },
        metadata: {
          source: scrapedContent.url,
          parsedAt: new Date().toISOString(),
          confidence: 0,
          contentTypes: [scrapedContent.metadata.contentType]
        }
      };
    }
  }

  /**
   * Parses installation information from content
   */
  private parseInstallationInfo(scrapedContent: ScrapedContent): StructuredSetupInstructions['installation'] {
    const installation: StructuredSetupInstructions['installation'] = {
      commands: [],
      requirements: [],
      packageManager: undefined,
      version: undefined
    };

    // Extract from scraped data
    if (scrapedContent.extractedData.installationCommands.length > 0) {
      installation.commands = scrapedContent.extractedData.installationCommands;
    }

    // Extract from raw content using patterns
    const content = scrapedContent.content;
    
    // Installation command patterns
    const installPatterns = [
      /npm\s+install[^\n]*/gi,
      /pip\s+install[^\n]*/gi,
      /yarn\s+add[^\n]*/gi,
      /pnpm\s+add[^\n]*/gi,
      /go\s+get[^\n]*/gi,
      /docker\s+pull[^\n]*/gi,
      /cargo\s+add[^\n]*/gi,
      /gem\s+install[^\n]*/gi
    ];

    for (const pattern of installPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        installation.commands.push(...matches);
      }
    }

    // Extract package manager
    if (installation.commands.some(cmd => cmd.includes('npm'))) {
      installation.packageManager = 'npm';
    } else if (installation.commands.some(cmd => cmd.includes('pip'))) {
      installation.packageManager = 'pip';
    } else if (installation.commands.some(cmd => cmd.includes('yarn'))) {
      installation.packageManager = 'yarn';
    } else if (installation.commands.some(cmd => cmd.includes('pnpm'))) {
      installation.packageManager = 'pnpm';
    }

    // Extract requirements
    const requirementPatterns = [
      /requires?\s+([^\n]+)/gi,
      /prerequisites?\s+([^\n]+)/gi,
      /dependencies?\s+([^\n]+)/gi,
      /node\s+version\s+([^\n]+)/gi,
      /python\s+version\s+([^\n]+)/gi
    ];

    for (const pattern of requirementPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        installation.requirements.push(...matches.map(m => m.trim()));
      }
    }

    // Extract version information
    const versionPattern = /version\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)/gi;
    const versionMatch = content.match(versionPattern);
    if (versionMatch) {
      installation.version = versionMatch[0];
    }

    return installation;
  }

  /**
   * Parses configuration information from content
   */
  private parseConfigurationInfo(scrapedContent: ScrapedContent): StructuredSetupInstructions['configuration'] {
    const configuration: StructuredSetupInstructions['configuration'] = {
      requiredFields: [],
      optionalFields: [],
      examples: [],
      schema: undefined
    };

    // Extract from scraped data
    if (scrapedContent.extractedData.configurationExamples.length > 0) {
      configuration.examples = scrapedContent.extractedData.configurationExamples;
    }

    // Extract configuration patterns from content
    const content = scrapedContent.content;
    
    // JSON configuration patterns
    const jsonPatterns = [
      /```json[\s\S]*?```/gi,
      /```yaml[\s\S]*?```/gi,
      /```toml[\s\S]*?```/gi,
      /```ini[\s\S]*?```/gi
    ];

    for (const pattern of jsonPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        configuration.examples.push(...matches);
      }
    }

    // Extract required and optional fields
    const fieldPatterns = [
      /required[_\s]?fields?[:\s]+([^\n]+)/gi,
      /optional[_\s]?fields?[:\s]+([^\n]+)/gi,
      /configuration[_\s]?options?[:\s]+([^\n]+)/gi
    ];

    for (const pattern of fieldPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const fieldText = match.replace(/required[_\s]?fields?[:\s]+/gi, '').replace(/optional[_\s]?fields?[:\s]+/gi, '').trim();
          const fields = fieldText.split(/[,;]/).map(f => f.trim());
          if (pattern.source.includes('required')) {
            configuration.requiredFields.push(...fields);
          } else if (pattern.source.includes('optional')) {
            configuration.optionalFields.push(...fields);
          }
        }
      }
    }

    // Try to parse JSON schema from examples
    for (const example of configuration.examples) {
      try {
        const parsed = JSON.parse(example);
        if (typeof parsed === 'object' && parsed !== null) {
          configuration.schema = parsed;
          break;
        }
      } catch {
        // Not valid JSON, continue
      }
    }

    return configuration;
  }

  /**
   * Parses credentials from content
   */
  private parseCredentials(scrapedContent: ScrapedContent): StructuredSetupInstructions['credentials'] {
    const credentials: StructuredSetupInstructions['credentials'] = [];

    // Extract from scraped data
    const scrapedCredentials = scrapedContent.extractedData.requiredCredentials;
    
    for (const cred of scrapedCredentials) {
      credentials.push({
        key: cred,
        description: `Required ${cred.toLowerCase()}`,
        optional: false
      });
    }

    // Extract from content using patterns
    const content = scrapedContent.content;
    
    // Credential patterns
    const credentialPatterns = [
      /API[_\s]?[Kk]ey[:\s]+([^\n]+)/gi,
      /[Tt]oken[:\s]+([^\n]+)/gi,
      /[Ss]ecret[:\s]+([^\n]+)/gi,
      /[Pp]assword[:\s]+([^\n]+)/gi,
      /[Uu]sername[:\s]+([^\n]+)/gi,
      /[Ee]mail[:\s]+([^\n]+)/gi,
      /[Uu]rl[:\s]+([^\n]+)/gi,
      /[Ee]ndpoint[:\s]+([^\n]+)/gi
    ];

    for (const pattern of credentialPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const key = match.split(/[:\s]+/)[0].trim();
          const description = match.split(/[:\s]+/).slice(1).join(' ').trim();
          
          if (!credentials.some(c => c.key === key)) {
            credentials.push({
              key,
              description: description || `Required ${key.toLowerCase()}`,
              optional: false
            });
          }
        }
      }
    }

    // Environment variable patterns
    const envPattern = /[A-Z_][A-Z0-9_]*/g;
    const envMatches = content.match(envPattern);
    if (envMatches) {
      for (const match of envMatches) {
        if (match.length > 3 && 
            (match.includes('API') || match.includes('KEY') || match.includes('TOKEN') || match.includes('SECRET'))) {
          if (!credentials.some(c => c.key === match)) {
            credentials.push({
              key: match,
              description: `Environment variable: ${match}`,
              optional: false,
              envVar: match
            });
          }
        }
      }
    }

    return credentials;
  }

  /**
   * Parses code examples from content
   */
  private parseCodeExamples(scrapedContent: ScrapedContent): StructuredSetupInstructions['examples'] {
    const examples: StructuredSetupInstructions['examples'] = [];

    // Extract from scraped data
    const scrapedExamples = scrapedContent.extractedData.codeExamples;
    
    for (const example of scrapedExamples) {
      // Try to detect language
      const language = this.detectLanguage(example);
      examples.push({
        language,
        code: example,
        description: `Code example in ${language}`
      });
    }

    // Extract from content using patterns
    const content = scrapedContent.content;
    
    // Code block patterns
    const codeBlockPatterns = [
      /```(\w+)\n([\s\S]*?)```/gi,
      /```\n([\s\S]*?)```/gi,
      /<code[^>]*>([\s\S]*?)<\/code>/gi
    ];

    for (const pattern of codeBlockPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const codeMatch = match.match(/```(\w+)?\n([\s\S]*?)```/);
          if (codeMatch) {
            const language = codeMatch[1] || 'text';
            const code = codeMatch[2].trim();
            
            if (code.length > 20) { // Only include substantial code blocks
              examples.push({
                language,
                code,
                description: `Code example in ${language}`
              });
            }
          }
        }
      }
    }

    return examples;
  }

  /**
   * Parses verification steps from content
   */
  private parseVerificationSteps(scrapedContent: ScrapedContent): StructuredSetupInstructions['verification'] {
    const verification: StructuredSetupInstructions['verification'] = {
      steps: [],
      testCommands: [],
      expectedOutputs: []
    };

    // Extract from scraped data
    if (scrapedContent.extractedData.setupInstructions.length > 0) {
      verification.steps = scrapedContent.extractedData.setupInstructions;
    }

    // Extract verification patterns from content
    const content = scrapedContent.content;
    
    // Extract numbered steps
    const stepPattern = /\d+\.\s+([^\n]+)/g;
    const stepMatches = content.match(stepPattern);
    if (stepMatches) {
      verification.steps.push(...stepMatches.map(m => m.replace(/\d+\.\s+/, '').trim()));
    }
    
    // Test command patterns
    const testPatterns = [
      /test[_\s]?command[:\s]+([^\n]+)/gi,
      /verify[_\s]?command[:\s]+([^\n]+)/gi,
      /check[_\s]?command[:\s]+([^\n]+)/gi,
      /Run the test command: `([^`]+)`/gi,
      /Run: `([^`]+)`/gi
    ];

    for (const pattern of testPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const command = match.replace(/test[_\s]?command[:\s]+/gi, '')
                              .replace(/verify[_\s]?command[:\s]+/gi, '')
                              .replace(/check[_\s]?command[:\s]+/gi, '')
                              .replace(/Run the test command: `/gi, '')
                              .replace(/Run: `/gi, '')
                              .replace(/`/g, '')
                              .trim();
          if (command) {
            verification.testCommands.push(command);
          }
        }
      }
    }

    // Expected output patterns
    const outputPatterns = [
      /expected[_\s]?output[:\s]+([^\n]+)/gi,
      /should[_\s]?show[:\s]+([^\n]+)/gi,
      /result[:\s]+([^\n]+)/gi,
      /Expected output: ([^\n]+)/gi
    ];

    for (const pattern of outputPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const output = match.replace(/expected[_\s]?output[:\s]+/gi, '')
                             .replace(/should[_\s]?show[:\s]+/gi, '')
                             .replace(/result[:\s]+/gi, '')
                             .replace(/Expected output: /gi, '')
                             .trim();
          if (output) {
            verification.expectedOutputs.push(output);
          }
        }
      }
    }

    return verification;
  }

  /**
   * Parses troubleshooting information from content
   */
  private parseTroubleshooting(scrapedContent: ScrapedContent): StructuredSetupInstructions['troubleshooting'] {
    const troubleshooting: StructuredSetupInstructions['troubleshooting'] = {
      commonIssues: [],
      faq: []
    };

    // Extract from scraped data
    if (scrapedContent.extractedData.troubleshooting.length > 0) {
      for (const item of scrapedContent.extractedData.troubleshooting) {
        troubleshooting.commonIssues.push({
          issue: item,
          solution: 'See documentation for details'
        });
      }
    }

    // Extract troubleshooting patterns from content
    const content = scrapedContent.content;
    
    // Common issues patterns
    const issuePatterns = [
      /\*\*Issue\*\*:\s*([^\n]+)\s*\*\*Solution\*\*:\s*([^\n]+)/gi,
      /Issue:\s*([^\n]+)\s*Solution:\s*([^\n]+)/gi,
      /Problem:\s*([^\n]+)\s*Fix:\s*([^\n]+)/gi
    ];

    for (const pattern of issuePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const parts = match.split(/\*\*Solution\*\*:\s*|Solution:\s*|Fix:\s*/);
          if (parts.length >= 2) {
            const issue = parts[0].replace(/\*\*Issue\*\*:\s*|Issue:\s*|Problem:\s*/, '').trim();
            const solution = parts[1].trim();
            if (issue && solution) {
              troubleshooting.commonIssues.push({ issue, solution });
            }
          }
        }
      }
    }
    
    // FAQ patterns
    const faqPatterns = [
      /Q:\s*([^\n]+)\s*A:\s*([^\n]+)/gi,
      /Question:\s*([^\n]+)\s*Answer:\s*([^\n]+)/gi
    ];

    for (const pattern of faqPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const parts = match.split(/A:\s*|Answer:\s*/);
          if (parts.length >= 2) {
            const question = parts[0].replace(/Q:\s*|Question:\s*/, '').trim();
            const answer = parts[1].trim();
            if (question && answer) {
              troubleshooting.faq.push({ question, answer });
            }
          }
        }
      }
    }

    return troubleshooting;
  }

  /**
   * Calculates confidence score for parsed instructions
   */
  private calculateConfidence(result: StructuredSetupInstructions): number {
    let score = 0;
    let maxScore = 0;

    // Installation commands (30% weight)
    maxScore += 0.3;
    if (result.installation.commands.length > 0) {
      score += 0.3;
    }

    // Configuration examples (25% weight)
    maxScore += 0.25;
    if (result.configuration.examples.length > 0) {
      score += 0.25;
    }

    // Credentials (20% weight)
    maxScore += 0.2;
    if (result.credentials.length > 0) {
      score += 0.2;
    }

    // Code examples (15% weight)
    maxScore += 0.15;
    if (result.examples.length > 0) {
      score += 0.15;
    }

    // Verification steps (10% weight)
    maxScore += 0.1;
    if (result.verification.steps.length > 0) {
      score += 0.1;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Detects programming language from code
   */
  private detectLanguage(code: string): string {
    const languagePatterns = [
      { pattern: /import\s+.*from\s+['"]/, language: 'javascript' },
      { pattern: /const\s+\w+\s*=/, language: 'javascript' },
      { pattern: /def\s+\w+\(/, language: 'python' },
      { pattern: /import\s+\w+/, language: 'python' },
      { pattern: /package\s+\w+/, language: 'go' },
      { pattern: /func\s+\w+\(/, language: 'go' },
      { pattern: /use\s+\w+;/, language: 'rust' },
      { pattern: /fn\s+\w+\(/, language: 'rust' },
      { pattern: /#include\s+<.*>/, language: 'cpp' },
      { pattern: /int\s+main\(/, language: 'cpp' }
    ];

    for (const { pattern, language } of languagePatterns) {
      if (pattern.test(code)) {
        return language;
      }
    }

    return 'text';
  }

  /**
   * Initializes parsing strategies
   */
  private initializeStrategies(): void {
    // Markdown strategy
    this.strategies.set('markdown', {
      name: 'markdown',
      patterns: [
        /```[\s\S]*?```/g,
        /#{1,6}\s+[^\n]+/g,
        /\*\*[^*]+\*\*/g
      ],
      extractors: [
        (content) => this.extractCodeBlocks(content),
        (content) => this.extractHeadings(content),
        (content) => this.extractBoldText(content)
      ],
      priority: 1
    });

    // HTML strategy
    this.strategies.set('html', {
      name: 'html',
      patterns: [
        /<pre[^>]*>[\s\S]*?<\/pre>/g,
        /<code[^>]*>[\s\S]*?<\/code>/g,
        /<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/g
      ],
      extractors: [
        (content) => this.extractPreBlocks(content),
        (content) => this.extractCodeBlocks(content),
        (content) => this.extractHeadings(content)
      ],
      priority: 2
    });

    // Plain text strategy
    this.strategies.set('text', {
      name: 'text',
      patterns: [
        /[A-Z][^.!?]*[.!?]/g,
        /\d+\.\s+[^\n]+/g,
        /[a-zA-Z]+:\s+[^\n]+/g
      ],
      extractors: [
        (content) => this.extractSentences(content),
        (content) => this.extractNumberedLists(content),
        (content) => this.extractKeyValuePairs(content)
      ],
      priority: 3
    });
  }

  /**
   * Helper methods for content extraction
   */
  private extractCodeBlocks(content: string): string[] {
    const codeBlockPattern = /```[\s\S]*?```/g;
    const matches = content.match(codeBlockPattern);
    return matches ? matches.map(m => m.replace(/```/g, '').trim()) : [];
  }

  private extractHeadings(content: string): string[] {
    const headingPattern = /#{1,6}\s+[^\n]+/g;
    const matches = content.match(headingPattern);
    return matches ? matches.map(m => m.replace(/#+\s+/, '').trim()) : [];
  }

  private extractBoldText(content: string): string[] {
    const boldPattern = /\*\*[^*]+\*\*/g;
    const matches = content.match(boldPattern);
    return matches ? matches.map(m => m.replace(/\*\*/g, '').trim()) : [];
  }

  private extractPreBlocks(content: string): string[] {
    const prePattern = /<pre[^>]*>[\s\S]*?<\/pre>/g;
    const matches = content.match(prePattern);
    return matches ? matches.map(m => m.replace(/<[^>]*>/g, '').trim()) : [];
  }

  private extractSentences(content: string): string[] {
    const sentencePattern = /[A-Z][^.!?]*[.!?]/g;
    const matches = content.match(sentencePattern);
    return matches || [];
  }

  private extractNumberedLists(content: string): string[] {
    const listPattern = /\d+\.\s+[^\n]+/g;
    const matches = content.match(listPattern);
    return matches || [];
  }

  private extractKeyValuePairs(content: string): string[] {
    const kvPattern = /[a-zA-Z]+:\s+[^\n]+/g;
    const matches = content.match(kvPattern);
    return matches || [];
  }
}

/**
 * Default setup instruction parser instance
 */
export const defaultSetupInstructionParser = new SetupInstructionParser();
