/**
 * Template Engine
 * 
 * This module provides template rendering capabilities for MCP configurations,
 * supporting different MCP types and environments with customizable templates.
 */

import { createLogger } from '../../utils/logger';
import type { 
  MCPConfigTemplate,
  TemplateContext,
  TemplateMetadata,
  MCPType
} from './types';

const logger = createLogger('template-engine');

/**
 * Template engine class
 */
export class TemplateEngine {
  private templates: Map<string, TemplateMetadata> = new Map();
  private customFilters: Map<string, Function> = new Map();
  private customHelpers: Map<string, Function> = new Map();

  constructor() {
    this.initializeBuiltinTemplates();
    this.initializeBuiltinFilters();
    this.initializeBuiltinHelpers();
  }

  /**
   * Initialize built-in templates
   */
  private initializeBuiltinTemplates(): void {
    const templates: TemplateMetadata[] = [
      {
        name: 'filesystem-basic',
        version: '1.0.0',
        description: 'Basic filesystem MCP template',
        mcpTypes: ['filesystem'],
        environments: ['claude-desktop', 'cursor', 'custom'],
        requiredVariables: ['mcpId', 'mcpMetadata'],
        optionalVariables: ['rootPath', 'allowWrite'],
        examples: ['Basic file operations', 'Read-only file access']
      },
      {
        name: 'database-postgres',
        version: '1.0.0',
        description: 'PostgreSQL database MCP template',
        mcpTypes: ['database'],
        environments: ['claude-desktop', 'cursor', 'custom'],
        requiredVariables: ['mcpId', 'connectionString'],
        optionalVariables: ['maxConnections', 'ssl'],
        examples: ['Database queries', 'Data analysis']
      },
      {
        name: 'api-rest',
        version: '1.0.0',
        description: 'REST API MCP template',
        mcpTypes: ['api'],
        environments: ['claude-desktop', 'cursor', 'custom'],
        requiredVariables: ['mcpId', 'baseUrl'],
        optionalVariables: ['timeout', 'retries', 'rateLimit'],
        examples: ['API integration', 'Data fetching']
      },
      {
        name: 'web-scraper-basic',
        version: '1.0.0',
        description: 'Basic web scraper MCP template',
        mcpTypes: ['web-scraper'],
        environments: ['claude-desktop', 'cursor', 'custom'],
        requiredVariables: ['mcpId'],
        optionalVariables: ['userAgent', 'timeout', 'maxDepth'],
        examples: ['Web scraping', 'Content extraction']
      },
      {
        name: 'code-analyzer-typescript',
        version: '1.0.0',
        description: 'TypeScript code analyzer MCP template',
        mcpTypes: ['code-analyzer'],
        environments: ['claude-desktop', 'cursor', 'custom'],
        requiredVariables: ['mcpId'],
        optionalVariables: ['languages', 'strictMode'],
        examples: ['Code analysis', 'Linting']
      },
      {
        name: 'package-manager-npm',
        version: '1.0.0',
        description: 'NPM package manager MCP template',
        mcpTypes: ['package-manager'],
        environments: ['claude-desktop', 'cursor', 'custom'],
        requiredVariables: ['mcpId'],
        optionalVariables: ['registry', 'scope'],
        examples: ['Package management', 'Dependency analysis']
      },
      {
        name: 'cloud-service-aws',
        version: '1.0.0',
        description: 'AWS cloud service MCP template',
        mcpTypes: ['cloud-service'],
        environments: ['claude-desktop', 'cursor', 'custom'],
        requiredVariables: ['mcpId', 'region'],
        optionalVariables: ['timeout', 'retries'],
        examples: ['Cloud operations', 'AWS integration']
      },
      {
        name: 'development-tool-generic',
        version: '1.0.0',
        description: 'Generic development tool MCP template',
        mcpTypes: ['development-tool'],
        environments: ['claude-desktop', 'cursor', 'custom'],
        requiredVariables: ['mcpId'],
        optionalVariables: ['workspace', 'verbose'],
        examples: ['Development tools', 'Build systems']
      },
      {
        name: 'custom-generic',
        version: '1.0.0',
        description: 'Generic custom MCP template',
        mcpTypes: ['custom'],
        environments: ['claude-desktop', 'cursor', 'custom'],
        requiredVariables: ['mcpId'],
        optionalVariables: ['timeout', 'retries'],
        examples: ['Custom integrations', 'Specialized tools']
      }
    ];

    for (const template of templates) {
      this.templates.set(template.name, template);
    }

    logger.debug('Built-in templates initialized', { count: templates.length });
  }

  /**
   * Initialize built-in filters
   */
  private initializeBuiltinFilters(): void {
    this.customFilters.set('upper', (str: string) => str.toUpperCase());
    this.customFilters.set('lower', (str: string) => str.toLowerCase());
    this.customFilters.set('camel', (str: string) => 
      str.replace(/-([a-z])/g, (g) => g[1]?.toUpperCase() || '')
    );
    this.customFilters.set('kebab', (str: string) => 
      str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
    );
    this.customFilters.set('snake', (str: string) => 
      str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
    );
    this.customFilters.set('default', (value: any, defaultValue: any) => 
      value || defaultValue
    );
    this.customFilters.set('json', (obj: any) => JSON.stringify(obj, null, 2));
    this.customFilters.set('env', (key: string) => process.env[key] || '');
  }

  /**
   * Initialize built-in helpers
   */
  private initializeBuiltinHelpers(): void {
    this.customHelpers.set('if', (condition: any, trueValue: any, falseValue: any) => 
      condition ? trueValue : falseValue
    );
    this.customHelpers.set('unless', (condition: any, trueValue: any, falseValue: any) => 
      !condition ? trueValue : falseValue
    );
    this.customHelpers.set('eq', (a: any, b: any) => a === b);
    this.customHelpers.set('ne', (a: any, b: any) => a !== b);
    this.customHelpers.set('gt', (a: any, b: any) => a > b);
    this.customHelpers.set('lt', (a: any, b: any) => a < b);
    this.customHelpers.set('and', (...args: any[]) => args.every(Boolean));
    this.customHelpers.set('or', (...args: any[]) => args.some(Boolean));
    this.customHelpers.set('not', (value: any) => !value);
  }

  /**
   * Get template for MCP type and environment
   */
  async getTemplate(mcpType: MCPType, environment: string): Promise<MCPConfigTemplate> {
    const templateName = this.findBestTemplate(mcpType, environment);
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`No template found for MCP type: ${mcpType}, environment: ${environment}`);
    }

    return this.createTemplateFromMetadata(template, mcpType, environment);
  }

  /**
   * Find the best template for MCP type and environment
   */
  private findBestTemplate(mcpType: MCPType, environment: string): string {
    // Try to find exact match first
    const exactMatch = `${mcpType}-${environment}`;
    if (this.templates.has(exactMatch)) {
      return exactMatch;
    }

    // Try to find type-specific template
    for (const [name, template] of this.templates) {
      if (template.mcpTypes.includes(mcpType) && template.environments.includes(environment)) {
        return name;
      }
    }

    // Fall back to generic template
    return 'custom-generic';
  }

  /**
   * Create template from metadata
   */
  private createTemplateFromMetadata(
    metadata: TemplateMetadata, 
    mcpType: MCPType, 
    environment: string
  ): MCPConfigTemplate {
    return {
      mcpId: '{{mcpId}}',
      mcpName: '{{mcpMetadata.name}}',
      type: mcpType,
      configuration: this.getDefaultConfiguration(mcpType),
      credentials: {},
      environment,
      metadata: {
        template_version: metadata.version,
        generated_at: '{{timestamp}}',
        source: metadata.name
      }
    };
  }

  /**
   * Get default configuration for MCP type
   */
  private getDefaultConfiguration(mcpType: MCPType): Record<string, any> {
    const configs = {
      filesystem: {
        rootPath: '{{rootPath | default(process.cwd())}}',
        allowWrite: '{{allowWrite | default(true)}}',
        allowDelete: '{{allowDelete | default(false)}}',
        maxFileSize: '{{maxFileSize | default("10MB")}}',
        allowedExtensions: '{{allowedExtensions | default([".txt", ".md", ".json", ".js", ".ts", ".py"])}}'
      },
      database: {
        connectionString: '{{connectionString | env("DATABASE_URL")}}',
        maxConnections: '{{maxConnections | default(10)}}',
        timeout: '{{timeout | default(30000)}}',
        ssl: '{{ssl | default(true)}}'
      },
      api: {
        baseUrl: '{{baseUrl | env("API_BASE_URL")}}',
        timeout: '{{timeout | default(30000)}}',
        retries: '{{retries | default(3)}}',
        rateLimit: '{{rateLimit | default(100)}}'
      },
      'web-scraper': {
        userAgent: '{{userAgent | default("MCP-WebScraper/1.0")}}',
        timeout: '{{timeout | default(30000)}}',
        maxDepth: '{{maxDepth | default(3)}}',
        respectRobots: '{{respectRobots | default(true)}}',
        delay: '{{delay | default(1000)}}'
      },
      'code-analyzer': {
        languages: '{{languages | default(["javascript", "typescript", "python"])}}',
        maxFileSize: '{{maxFileSize | default("1MB")}}',
        includeTests: '{{includeTests | default(false)}}',
        strictMode: '{{strictMode | default(true)}}'
      },
      'package-manager': {
        registry: '{{registry | default("https://registry.npmjs.org/")}}',
        scope: '{{scope | default("")}}',
        timeout: '{{timeout | default(30000)}}',
        cache: '{{cache | default(true)}}'
      },
      'cloud-service': {
        region: '{{region | default("us-east-1")}}',
        timeout: '{{timeout | default(30000)}}',
        retries: '{{retries | default(3)}}'
      },
      'development-tool': {
        workspace: '{{workspace | default(process.cwd())}}',
        timeout: '{{timeout | default(30000)}}',
        verbose: '{{verbose | default(false)}}'
      },
      custom: {
        timeout: '{{timeout | default(30000)}}',
        retries: '{{retries | default(3)}}'
      }
    };

    return configs[mcpType] || configs.custom;
  }

  /**
   * Render template with context
   */
  async renderTemplate(template: MCPConfigTemplate, context: TemplateContext): Promise<MCPConfigTemplate> {
    try {
      const rendered = {
        ...template,
        mcpId: this.renderString(template.mcpId, context),
        mcpName: this.renderString(template.mcpName, context),
        configuration: this.renderObject(template.configuration, context),
        credentials: this.renderObject(template.credentials, context),
        metadata: {
          ...template.metadata,
          generated_at: new Date().toISOString()
        }
      };

      logger.debug('Template rendered successfully', { 
        mcpId: rendered.mcpId,
        template: template.metadata.source
      });

      return rendered;
    } catch (error) {
      logger.error('Failed to render template', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        template: template.metadata.source
      });
      throw error;
    }
  }

  /**
   * Render string with context
   */
  private renderString(template: string, context: TemplateContext): string {
    // Simple template rendering with {{variable}} syntax
    return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      return this.evaluateExpression(expression.trim(), context);
    });
  }

  /**
   * Render object with context
   */
  private renderObject(obj: any, context: TemplateContext): any {
    if (typeof obj === 'string') {
      return this.renderString(obj, context);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.renderObject(item, context));
    } else if (obj && typeof obj === 'object') {
      const rendered: any = {};
      for (const [key, value] of Object.entries(obj)) {
        rendered[key] = this.renderObject(value, context);
      }
      return rendered;
    }
    return obj;
  }

  /**
   * Evaluate expression with context
   */
  private evaluateExpression(expression: string, context: TemplateContext): any {
    // Handle filters (e.g., "variable | filter")
    const parts = expression.split('|').map(part => part.trim());
    let value = this.getVariableValue(parts[0] || '', context);

    // Apply filters
    for (let i = 1; i < parts.length; i++) {
      const filter = parts[i];
      if (!filter) continue;
      
      const filterParts = filter.split('(');
      const filterName = filterParts[0];
      const filterArgs = filterParts.length > 1 && filterParts[1] ? 
        filterParts[1].replace(/\)$/, '').split(',').map(arg => arg.trim()) : [];

      if (filterName && this.customFilters.has(filterName)) {
        const filterFn = this.customFilters.get(filterName);
        if (filterFn) {
          value = filterFn(value, ...filterArgs);
        }
      }
    }

    return value;
  }

  /**
   * Get variable value from context
   */
  private getVariableValue(variable: string, context: TemplateContext): any {
    // Handle nested properties (e.g., "mcpMetadata.name")
    const parts = variable.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * List available templates
   */
  async listAvailableTemplates(): Promise<string[]> {
    return Array.from(this.templates.keys());
  }

  /**
   * Get template metadata
   */
  getTemplateMetadata(templateName: string): TemplateMetadata | undefined {
    return this.templates.get(templateName);
  }

  /**
   * Add custom template
   */
  addCustomTemplate(metadata: TemplateMetadata): void {
    this.templates.set(metadata.name, metadata);
    logger.info('Custom template added', { name: metadata.name });
  }

  /**
   * Add custom filter
   */
  addCustomFilter(name: string, filter: Function): void {
    this.customFilters.set(name, filter);
    logger.debug('Custom filter added', { name });
  }

  /**
   * Add custom helper
   */
  addCustomHelper(name: string, helper: Function): void {
    this.customHelpers.set(name, helper);
    logger.debug('Custom helper added', { name });
  }

  /**
   * Validate template
   */
  validateTemplate(template: MCPConfigTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.mcpId) {
      errors.push('Missing mcpId');
    }

    if (!template.mcpName) {
      errors.push('Missing mcpName');
    }

    if (!template.type) {
      errors.push('Missing type');
    }

    if (!template.configuration || typeof template.configuration !== 'object') {
      errors.push('Missing or invalid configuration');
    }

    if (!template.environment) {
      errors.push('Missing environment');
    }

    if (!template.metadata) {
      errors.push('Missing metadata');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
