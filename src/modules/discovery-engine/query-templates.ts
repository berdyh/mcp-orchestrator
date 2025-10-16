/**
 * Search Query Templates
 * 
 * This module provides predefined query templates for different MCP discovery patterns,
 * ensuring consistent and effective searches across various use cases.
 */

/**
 * Query template configuration
 */
export interface QueryTemplate {
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: string;
  priority: number;
}

/**
 * Query template categories
 */
export type QueryCategory = 
  | 'general'
  | 'technology'
  | 'tool-type'
  | 'integration'
  | 'category-specific'
  | 'advanced';

/**
 * Query template registry
 */
export class QueryTemplateRegistry {
  private templates: Map<string, QueryTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Gets a query template by name
   */
  getTemplate(name: string): QueryTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Gets all templates for a category
   */
  getTemplatesByCategory(category: QueryCategory): QueryTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.category === category)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Gets all available templates
   */
  getAllTemplates(): QueryTemplate[] {
    return Array.from(this.templates.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generates a query from a template with variables
   */
  generateQuery(templateName: string, variables: Record<string, string>): string {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    let query = template.template;
    
    // Replace variables in the template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      query = query.replace(new RegExp(placeholder, 'g'), value);
    }

    // Check if all required variables are provided
    const missingVariables = template.variables.filter(
      variable => !variables.hasOwnProperty(variable)
    );

    if (missingVariables.length > 0) {
      throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
    }

    return query;
  }

  /**
   * Suggests templates based on search context
   */
  suggestTemplates(context: {
    technology?: string;
    toolType?: string;
    category?: string;
    integration?: string;
  }): QueryTemplate[] {
    const suggestions: QueryTemplate[] = [];

    // Add general templates
    suggestions.push(...this.getTemplatesByCategory('general'));

    // Add technology-specific templates
    if (context.technology) {
      const techTemplates = this.getTemplatesByCategory('technology')
        .filter(t => t.template.toLowerCase().includes(context.technology!.toLowerCase()));
      suggestions.push(...techTemplates);
    }

    // Add tool-type specific templates
    if (context.toolType) {
      const toolTemplates = this.getTemplatesByCategory('tool-type')
        .filter(t => t.template.toLowerCase().includes(context.toolType!.toLowerCase()));
      suggestions.push(...toolTemplates);
    }

    // Add category-specific templates
    if (context.category) {
      const categoryTemplates = this.getTemplatesByCategory('category-specific')
        .filter(t => t.template.toLowerCase().includes(context.category!.toLowerCase()));
      suggestions.push(...categoryTemplates);
    }

    // Add integration-specific templates
    if (context.integration) {
      const integrationTemplates = this.getTemplatesByCategory('integration')
        .filter(t => t.template.toLowerCase().includes(context.integration!.toLowerCase()));
      suggestions.push(...integrationTemplates);
    }

    // Remove duplicates and sort by priority
    const uniqueSuggestions = suggestions.filter((template, index, self) => 
      index === self.findIndex(t => t.name === template.name)
    );

    return uniqueSuggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Initializes all query templates
   */
  private initializeTemplates(): void {
    // General discovery templates
    this.addTemplate({
      name: 'general-mcp-search',
      description: 'General MCP server discovery',
      template: 'Find Model Context Protocol (MCP) servers for {domain}',
      variables: ['domain'],
      category: 'general',
      priority: 100
    });

    this.addTemplate({
      name: 'mcp-tools-search',
      description: 'Search for MCP tools by functionality',
      template: 'MCP server tools for {functionality} Model Context Protocol',
      variables: ['functionality'],
      category: 'general',
      priority: 95
    });

    // Technology-specific templates
    this.addTemplate({
      name: 'nodejs-mcp',
      description: 'Node.js MCP servers',
      template: 'Node.js MCP server {technology} Model Context Protocol npm package',
      variables: ['technology'],
      category: 'technology',
      priority: 90
    });

    this.addTemplate({
      name: 'python-mcp',
      description: 'Python MCP servers',
      template: 'Python MCP server {technology} Model Context Protocol pip package',
      variables: ['technology'],
      category: 'technology',
      priority: 90
    });

    this.addTemplate({
      name: 'docker-mcp',
      description: 'Docker-based MCP servers',
      template: 'Docker MCP server {technology} Model Context Protocol container',
      variables: ['technology'],
      category: 'technology',
      priority: 85
    });

    // Tool-type specific templates
    this.addTemplate({
      name: 'filesystem-mcp',
      description: 'File system MCP servers',
      template: 'MCP server file system operations Model Context Protocol',
      variables: [],
      category: 'tool-type',
      priority: 80
    });

    this.addTemplate({
      name: 'database-mcp',
      description: 'Database MCP servers',
      template: 'MCP server {database} database Model Context Protocol',
      variables: ['database'],
      category: 'tool-type',
      priority: 80
    });

    this.addTemplate({
      name: 'git-mcp',
      description: 'Git MCP servers',
      template: 'MCP server git version control Model Context Protocol',
      variables: [],
      category: 'tool-type',
      priority: 80
    });

    this.addTemplate({
      name: 'api-mcp',
      description: 'API integration MCP servers',
      template: 'MCP server {api} API integration Model Context Protocol',
      variables: ['api'],
      category: 'tool-type',
      priority: 75
    });

    this.addTemplate({
      name: 'web-scraping-mcp',
      description: 'Web scraping MCP servers',
      template: 'MCP server web scraping {target} Model Context Protocol',
      variables: ['target'],
      category: 'tool-type',
      priority: 70
    });

    // Integration-specific templates
    this.addTemplate({
      name: 'slack-mcp',
      description: 'Slack integration MCP servers',
      template: 'MCP server Slack integration Model Context Protocol',
      variables: [],
      category: 'integration',
      priority: 75
    });

    this.addTemplate({
      name: 'github-mcp',
      description: 'GitHub integration MCP servers',
      template: 'MCP server GitHub integration Model Context Protocol',
      variables: [],
      category: 'integration',
      priority: 75
    });

    this.addTemplate({
      name: 'aws-mcp',
      description: 'AWS integration MCP servers',
      template: 'MCP server AWS {service} integration Model Context Protocol',
      variables: ['service'],
      category: 'integration',
      priority: 70
    });

    this.addTemplate({
      name: 'google-mcp',
      description: 'Google services MCP servers',
      template: 'MCP server Google {service} integration Model Context Protocol',
      variables: ['service'],
      category: 'integration',
      priority: 70
    });

    // Category-specific templates
    this.addTemplate({
      name: 'development-mcp',
      description: 'Development tools MCP servers',
      template: 'MCP server development tools {category} Model Context Protocol',
      variables: ['category'],
      category: 'category-specific',
      priority: 65
    });

    this.addTemplate({
      name: 'testing-mcp',
      description: 'Testing MCP servers',
      template: 'MCP server testing {framework} Model Context Protocol',
      variables: ['framework'],
      category: 'category-specific',
      priority: 65
    });

    this.addTemplate({
      name: 'deployment-mcp',
      description: 'Deployment MCP servers',
      template: 'MCP server deployment {platform} Model Context Protocol',
      variables: ['platform'],
      category: 'category-specific',
      priority: 60
    });

    this.addTemplate({
      name: 'monitoring-mcp',
      description: 'Monitoring MCP servers',
      template: 'MCP server monitoring {tool} Model Context Protocol',
      variables: ['tool'],
      category: 'category-specific',
      priority: 60
    });

    // Advanced templates
    this.addTemplate({
      name: 'multi-tool-mcp',
      description: 'Multi-tool MCP servers',
      template: 'MCP server multiple tools {tools} Model Context Protocol',
      variables: ['tools'],
      category: 'advanced',
      priority: 50
    });

    this.addTemplate({
      name: 'custom-mcp',
      description: 'Custom MCP server development',
      template: 'How to create custom MCP server {technology} Model Context Protocol',
      variables: ['technology'],
      category: 'advanced',
      priority: 45
    });

    this.addTemplate({
      name: 'mcp-comparison',
      description: 'Compare MCP servers',
      template: 'Compare MCP servers for {use-case} Model Context Protocol',
      variables: ['use-case'],
      category: 'advanced',
      priority: 40
    });
  }

  /**
   * Adds a template to the registry
   */
  private addTemplate(template: QueryTemplate): void {
    this.templates.set(template.name, template);
  }
}

/**
 * Default query template registry instance
 */
export const defaultQueryRegistry = new QueryTemplateRegistry();

/**
 * Utility functions for query generation
 */
export const queryUtils = {
  /**
   * Generates a query for a specific technology
   */
  generateTechnologyQuery(technology: string): string {
    return defaultQueryRegistry.generateQuery('nodejs-mcp', { technology });
  },

  /**
   * Generates a query for a specific tool type
   */
  generateToolTypeQuery(toolType: string): string {
    const templateMap: Record<string, string> = {
      'filesystem': 'filesystem-mcp',
      'database': 'database-mcp',
      'git': 'git-mcp',
      'api': 'api-mcp',
      'web-scraping': 'web-scraping-mcp'
    };

    const templateName = templateMap[toolType] || 'general-mcp-search';
    const variables = templateName === 'database-mcp' ? { database: toolType } :
                     templateName === 'api-mcp' ? { api: toolType } :
                     templateName === 'web-scraping-mcp' ? { target: toolType } :
                     { domain: toolType };

    return defaultQueryRegistry.generateQuery(templateName, variables);
  },

  /**
   * Generates a query for a specific integration
   */
  generateIntegrationQuery(integration: string): string {
    const templateMap: Record<string, string> = {
      'slack': 'slack-mcp',
      'github': 'github-mcp',
      'aws': 'aws-mcp',
      'google': 'google-mcp'
    };

    const templateName = templateMap[integration] || 'general-mcp-search';
    const variables = templateName === 'aws-mcp' ? { service: integration } :
                     templateName === 'google-mcp' ? { service: integration } :
                     { domain: integration };

    return defaultQueryRegistry.generateQuery(templateName, variables);
  },

  /**
   * Generates a query for a specific category
   */
  generateCategoryQuery(category: string): string {
    return defaultQueryRegistry.generateQuery('development-mcp', { category });
  },

  /**
   * Suggests queries based on context
   */
  suggestQueries(context: {
    technology?: string;
    toolType?: string;
    category?: string;
    integration?: string;
  }): string[] {
    const templates = defaultQueryRegistry.suggestTemplates(context);
    return templates.map(template => {
      // Generate example queries with placeholder values
      const exampleVariables: Record<string, string> = {};
      
      for (const variable of template.variables) {
        exampleVariables[variable] = context[variable as keyof typeof context] || 'example';
      }

      try {
        return defaultQueryRegistry.generateQuery(template.name, exampleVariables);
      } catch {
        return template.template;
      }
    });
  }
};
