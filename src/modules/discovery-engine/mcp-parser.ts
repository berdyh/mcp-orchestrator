/**
 * MCP Response Parser
 * 
 * This module parses Perplexity API responses to extract MCP server metadata,
 * including repository URLs, npm packages, setup instructions, and required credentials.
 */

import { createLogger } from '../../utils/logger.js';
import type { MCPDiscoveryResult } from '../../types/mcp.js';

const logger = createLogger('mcp-parser');

/**
 * Parsed MCP server data
 */
export interface ParsedMCPServer {
  mcp_name: string;
  repository_url?: string;
  npm_package?: string | undefined;
  documentation_url?: string | undefined;
  setup_instructions: string;
  required_credentials: string[];
  confidence_score: number;
  source_text: string;
}

/**
 * Parser configuration
 */
export interface ParserConfig {
  minConfidenceScore?: number;
  requireRepositoryUrl?: boolean;
  requireNpmPackage?: boolean;
  strictMode?: boolean;
}

/**
 * URL patterns for different platforms
 */
const URL_PATTERNS = {
  github: /https?:\/\/github\.com\/[^\s\)]+/gi,
  gitlab: /https?:\/\/gitlab\.com\/[^\s\)]+/gi,
  npm: /https?:\/\/www\.npmjs\.com\/package\/[^\s\)]+/gi,
  npmPackage: /@?[a-zA-Z0-9][a-zA-Z0-9\-_]*\/?[a-zA-Z0-9][a-zA-Z0-9\-_]*/g,
  documentation: /https?:\/\/[^\s\)]*(?:docs?|readme|documentation)[^\s\)]*/gi,
  general: /https?:\/\/[^\s\)]+/gi
};

/**
 * Credential patterns
 */
const CREDENTIAL_PATTERNS = {
  apiKey: /(?:api[_\s]?key|apikey)/gi,
  token: /(?:token|access[_\s]?token|bearer[_\s]?token)/gi,
  secret: /(?:secret|client[_\s]?secret)/gi,
  password: /(?:password|passwd|pwd)/gi,
  username: /(?:username|user[_\s]?name|login)/gi,
  email: /(?:email|e[_\s]?mail)/gi,
  url: /(?:url|endpoint|base[_\s]?url)/gi
};

/**
 * MCP server name patterns
 */
const MCP_NAME_PATTERNS = [
  /mcp[_\s-]?server[_\s-]?([a-zA-Z0-9\-_]+)/gi,
  /([a-zA-Z0-9\-_]+)[_\s-]?mcp[_\s-]?server/gi,
  /@modelcontextprotocol\/server-([a-zA-Z0-9\-_]+)/gi,
  /mcp-([a-zA-Z0-9\-_]+)/gi,
  /([a-zA-Z0-9\-_]+)-mcp/gi
];

/**
 * Installation command patterns
 */
const INSTALLATION_PATTERNS = [
  /npm[_\s]install[_\s]([^\s\n]+)/gi,
  /pip[_\s]install[_\s]([^\s\n]+)/gi,
  /yarn[_\s]add[_\s]([^\s\n]+)/gi,
  /pnpm[_\s]add[_\s]([^\s\n]+)/gi,
  /docker[_\s]pull[_\s]([^\s\n]+)/gi,
  /go[_\s]get[_\s]([^\s\n]+)/gi
];

/**
 * MCP response parser
 */
export class MCPParser {
  private config: ParserConfig;

  constructor(config: ParserConfig = {}) {
    this.config = {
      minConfidenceScore: 0.3,
      requireRepositoryUrl: false,
      requireNpmPackage: false,
      strictMode: false,
      ...config
    };

    logger.info('MCP parser initialized', { config: this.config });
  }

  /**
   * Parses a Perplexity API response to extract MCP server information
   */
  async parseResponse(responseText: string): Promise<MCPDiscoveryResult[]> {
    try {
      logger.debug('Parsing Perplexity response', { responseLength: responseText.length });

      // Split response into sections
      const sections = this.splitIntoSections(responseText);
      
      const results: MCPDiscoveryResult[] = [];

      for (const section of sections) {
        const parsed = this.parseSection(section);
        if (parsed && this.isValidResult(parsed)) {
          results.push(this.convertToDiscoveryResult(parsed));
        }
      }

      // Remove duplicates and sort by confidence
      const uniqueResults = this.removeDuplicates(results);
      const sortedResults = uniqueResults.sort((a, b) => b.confidence_score - a.confidence_score);

      logger.info('Parsing completed', { 
        sectionsFound: sections.length,
        validResults: sortedResults.length 
      });

      return sortedResults;

    } catch (error) {
      logger.error('Failed to parse response', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return [];
    }
  }

  /**
   * Splits response text into logical sections
   */
  private splitIntoSections(text: string): string[] {
    // Split by common section delimiters
    const sectionDelimiters = [
      /\n\s*\d+\.\s+/g,  // Numbered lists
      /\n\s*[-*]\s+/g,   // Bullet points
      /\n\s*##\s+/g,     // Markdown headers
      /\n\s*###\s+/g,    // Markdown subheaders
      /\n\s*[A-Z][^.]*:/g, // Colon-separated sections
    ];

    let sections = [text];

    for (const delimiter of sectionDelimiters) {
      const newSections: string[] = [];
      for (const section of sections) {
        const parts = section.split(delimiter);
        newSections.push(...parts.filter(part => part.trim().length > 0));
      }
      sections = newSections;
    }

    // Filter out very short sections
    return sections.filter(section => section.trim().length > 50);
  }

  /**
   * Parses a single section to extract MCP server information
   */
  private parseSection(section: string): ParsedMCPServer | null {
    try {
      const mcpName = this.extractMCPName(section);
      if (!mcpName) {
        return null;
      }

      const repositoryUrl = this.extractRepositoryUrl(section);
      const npmPackage = this.extractNpmPackage(section);
      const documentationUrl = this.extractDocumentationUrl(section);
      const setupInstructions = this.extractSetupInstructions(section);
      const requiredCredentials = this.extractRequiredCredentials(section);
      const confidenceScore = this.calculateConfidenceScore(section, {
        hasRepositoryUrl: !!repositoryUrl,
        hasNpmPackage: !!npmPackage,
        hasDocumentationUrl: !!documentationUrl,
        hasSetupInstructions: setupInstructions.length > 0,
        hasCredentials: requiredCredentials.length > 0
      });

      return {
        mcp_name: mcpName,
        repository_url: repositoryUrl || '',
        npm_package: npmPackage || undefined,
        documentation_url: documentationUrl,
        setup_instructions: setupInstructions,
        required_credentials: requiredCredentials,
        confidence_score: confidenceScore,
        source_text: section
      };

    } catch (error) {
      logger.debug('Failed to parse section', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        section: section.substring(0, 100) + '...'
      });
      return null;
    }
  }

  /**
   * Extracts MCP server name from text
   */
  private extractMCPName(text: string): string | null {
    // Try different patterns to find MCP server names
    for (const pattern of MCP_NAME_PATTERNS) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Extract the actual name from the match
        const match = matches[0];
        const nameMatch = match.match(/[a-zA-Z0-9\-_]+/);
        if (nameMatch) {
          return nameMatch[0].toLowerCase();
        }
      }
    }

    // Fallback: look for common MCP server naming patterns
    const fallbackPatterns = [
      /(?:server|tool|mcp)[\s_-]+([a-zA-Z0-9\-_]+)/gi,
      /([a-zA-Z0-9\-_]+)[\s_-]+(?:server|tool|mcp)/gi
    ];

    for (const pattern of fallbackPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const match = matches[0];
        const nameMatch = match.match(/[a-zA-Z0-9\-_]+/);
        if (nameMatch) {
          return nameMatch[0].toLowerCase();
        }
      }
    }

    return null;
  }

  /**
   * Extracts repository URL from text
   */
  private extractRepositoryUrl(text: string): string | undefined {
    // Try GitHub first
    const githubMatch = text.match(URL_PATTERNS.github);
    if (githubMatch && githubMatch.length > 0) {
      return githubMatch[0];
    }

    // Try GitLab
    const gitlabMatch = text.match(URL_PATTERNS.gitlab);
    if (gitlabMatch && gitlabMatch.length > 0) {
      return gitlabMatch[0];
    }

    // Try general URLs that might be repositories
    const generalMatches = text.match(URL_PATTERNS.general);
    if (generalMatches) {
      for (const url of generalMatches) {
        if (url.includes('github.com') || url.includes('gitlab.com') || 
            url.includes('bitbucket.org') || url.includes('sourceforge.net')) {
          return url;
        }
      }
    }

    return undefined;
  }

  /**
   * Extracts npm package name from text
   */
  private extractNpmPackage(text: string): string | undefined {
    // Look for npm package patterns
    const npmMatches = text.match(URL_PATTERNS.npm);
    if (npmMatches && npmMatches.length > 0) {
      const url = npmMatches[0];
      const packageMatch = url.match(/package\/([^\/\s]+)/);
      if (packageMatch) {
        return packageMatch[1];
      }
    }

    // Look for package names in installation commands
    for (const pattern of INSTALLATION_PATTERNS) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          const packageMatch = match.match(/([a-zA-Z0-9\-_@\/]+)/);
          if (packageMatch && packageMatch[1] && this.isValidNpmPackage(packageMatch[1])) {
            return packageMatch[1];
          }
        }
      }
    }

    // Look for general package name patterns
    const packageMatches = text.match(URL_PATTERNS.npmPackage);
    if (packageMatches) {
      for (const match of packageMatches) {
        if (this.isValidNpmPackage(match)) {
          return match;
        }
      }
    }

    return undefined;
  }

  /**
   * Extracts documentation URL from text
   */
  private extractDocumentationUrl(text: string): string | undefined {
    const docMatches = text.match(URL_PATTERNS.documentation);
    if (docMatches && docMatches.length > 0) {
      return docMatches[0];
    }

    // Fallback to any URL that might be documentation
    const generalMatches = text.match(URL_PATTERNS.general);
    if (generalMatches) {
      for (const url of generalMatches) {
        if (url.includes('readme') || url.includes('docs') || 
            url.includes('documentation') || url.includes('guide')) {
          return url;
        }
      }
    }

    return undefined;
  }

  /**
   * Extracts setup instructions from text
   */
  private extractSetupInstructions(text: string): string {
    // Look for installation commands
    const instructions: string[] = [];

    for (const pattern of INSTALLATION_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        instructions.push(...matches);
      }
    }

    // Look for setup-related text
    const setupKeywords = ['install', 'setup', 'configure', 'initialize', 'start'];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (setupKeywords.some(keyword => lowerLine.includes(keyword))) {
        instructions.push(line.trim());
      }
    }

    return instructions.join('\n').trim();
  }

  /**
   * Extracts required credentials from text
   */
  private extractRequiredCredentials(text: string): string[] {
    const credentials: string[] = [];

    for (const [type, pattern] of Object.entries(CREDENTIAL_PATTERNS)) {
      const matches = text.match(pattern);
      if (matches) {
        credentials.push(type);
      }
    }

    // Look for environment variable patterns
    const envVarPattern = /(?:env|environment)[\s_-]*(?:var|variable)[\s_-]*[:\-]?\s*([A-Z_][A-Z0-9_]*)/gi;
    const envMatches = text.match(envVarPattern);
    if (envMatches) {
      for (const match of envMatches) {
        const varMatch = match.match(/([A-Z_][A-Z0-9_]*)/);
        if (varMatch && varMatch[1]) {
          credentials.push(varMatch[1]);
        }
      }
    }

    return [...new Set(credentials)]; // Remove duplicates
  }

  /**
   * Calculates confidence score for a parsed result
   */
  private calculateConfidenceScore(
    text: string, 
    indicators: {
      hasRepositoryUrl: boolean;
      hasNpmPackage: boolean;
      hasDocumentationUrl: boolean;
      hasSetupInstructions: boolean;
      hasCredentials: boolean;
    }
  ): number {
    let score = 0;

    // Base score for having MCP-related content
    if (text.toLowerCase().includes('mcp') || text.toLowerCase().includes('model context protocol')) {
      score += 0.3;
    }

    // Repository URL presence
    if (indicators.hasRepositoryUrl) {
      score += 0.2;
    }

    // NPM package presence
    if (indicators.hasNpmPackage) {
      score += 0.2;
    }

    // Documentation URL presence
    if (indicators.hasDocumentationUrl) {
      score += 0.1;
    }

    // Setup instructions presence
    if (indicators.hasSetupInstructions) {
      score += 0.15;
    }

    // Credentials information presence
    if (indicators.hasCredentials) {
      score += 0.05;
    }

    // Bonus for having multiple indicators
    const indicatorCount = Object.values(indicators).filter(Boolean).length;
    if (indicatorCount >= 3) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Validates if a parsed result meets minimum requirements
   */
  private isValidResult(parsed: ParsedMCPServer): boolean {
    if (parsed.confidence_score < this.config.minConfidenceScore!) {
      return false;
    }

    if (this.config.requireRepositoryUrl && !parsed.repository_url) {
      return false;
    }

    if (this.config.requireNpmPackage && !parsed.npm_package) {
      return false;
    }

    if (this.config.strictMode) {
      return !!(parsed.repository_url && parsed.setup_instructions);
    }

    return true;
  }

  /**
   * Converts parsed result to MCPDiscoveryResult format
   */
  private convertToDiscoveryResult(parsed: ParsedMCPServer): MCPDiscoveryResult {
    const result: MCPDiscoveryResult = {
      mcp_name: parsed.mcp_name,
      repository_url: parsed.repository_url || '',
      documentation_url: parsed.documentation_url || parsed.repository_url || '',
      setup_instructions: parsed.setup_instructions,
      required_credentials: parsed.required_credentials,
      confidence_score: parsed.confidence_score
    };
    
    if (parsed.npm_package) {
      result.npm_package = parsed.npm_package;
    }
    
    return result;
  }

  /**
   * Removes duplicate results based on name and repository URL
   */
  private removeDuplicates(results: MCPDiscoveryResult[]): MCPDiscoveryResult[] {
    const seen = new Set<string>();
    const unique: MCPDiscoveryResult[] = [];

    for (const result of results) {
      const key = `${result.mcp_name}:${result.repository_url}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    }

    return unique;
  }

  /**
   * Validates if a string looks like a valid npm package name
   */
  private isValidNpmPackage(name: string): boolean {
    // Basic npm package name validation
    const npmPackagePattern = /^(@[a-zA-Z0-9\-_]+\/)?[a-zA-Z0-9\-_]+$/;
    return npmPackagePattern.test(name) && name.length > 0;
  }
}
