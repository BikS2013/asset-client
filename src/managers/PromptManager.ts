import { AssetClient } from '../core/AssetClient';
import { AssetClientConfig, CacheEntry } from '../types';

interface PromptChain {
  name: string;
  description?: string;
  steps: Array<{
    prompt: string;
    variables?: Record<string, string>;
    description?: string;
  }>;
}

export class PromptManager {
  private assetClient: AssetClient;
  private promptCache: Map<string, CacheEntry<string>> = new Map();
  private cacheTTL: number;
  private defaultRegistry: string;

  constructor(
    config: AssetClientConfig, 
    defaultRegistry: string = 'github.com/prompts',
    cacheTTL: number = 300000 // 5 minutes default
  ) {
    this.assetClient = new AssetClient(config);
    this.defaultRegistry = defaultRegistry;
    this.cacheTTL = cacheTTL;
  }

  /**
   * Get a prompt template and optionally replace variables
   */
  async getPrompt(
    promptName: string, 
    variables?: Record<string, string>,
    registry?: string
  ): Promise<string> {
    const cacheKey = `${registry ?? this.defaultRegistry}/${promptName}`;
    const cached = this.promptCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return this.replaceVariables(cached.data, variables);
    }

    const assetKey = promptName.includes('/') ? promptName : `templates/${promptName}.md`;
    const registryToUse = registry ?? this.defaultRegistry;
    
    const promptData = await this.assetClient.getAsset(registryToUse, assetKey);
    
    this.promptCache.set(cacheKey, { 
      data: promptData, 
      timestamp: Date.now() 
    });
    
    return this.replaceVariables(promptData, variables);
  }

  /**
   * Get a system prompt with context variables
   */
  async getSystemPrompt(
    promptName: string = 'system-prompt',
    context: Record<string, string> = {},
    registry?: string
  ): Promise<string> {
    const defaultContext = {
      date: new Date().toISOString(),
      timestamp: Date.now().toString(),
      ...context
    };
    
    return this.getPrompt(promptName, defaultContext, registry);
  }

  /**
   * Get a chain of prompts for multi-step operations
   */
  async getPromptChain(
    chainName: string,
    globalVariables?: Record<string, string>,
    registry?: string
  ): Promise<string[]> {
    const assetKey = `chains/${chainName}.json`;
    const registryToUse = registry ?? this.defaultRegistry;
    
    const chainData = await this.assetClient.getAsset(registryToUse, assetKey);
    const chain = JSON.parse(chainData) as PromptChain;
    
    const prompts: string[] = [];
    
    for (const step of chain.steps) {
      const variables = {
        ...globalVariables,
        ...step.variables
      };
      
      const prompt = await this.getPrompt(step.prompt, variables, registryToUse);
      prompts.push(prompt);
    }
    
    return prompts;
  }

  /**
   * Get multiple prompts in parallel
   */
  async getPrompts(
    promptNames: string[],
    variables?: Record<string, string>,
    registry?: string
  ): Promise<Map<string, string>> {
    const results = await Promise.all(
      promptNames.map(async name => ({
        name,
        prompt: await this.getPrompt(name, variables, registry)
      }))
    );
    
    return new Map(results.map(r => [r.name, r.prompt]));
  }

  /**
   * Clear prompt cache
   */
  clearCache(promptName?: string, registry?: string): void {
    if (promptName) {
      const cacheKey = `${registry ?? this.defaultRegistry}/${promptName}`;
      this.promptCache.delete(cacheKey);
    } else {
      this.promptCache.clear();
    }
  }

  /**
   * Set cache TTL
   */
  setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }

  /**
   * Parse and get structured prompt metadata
   */
  async getPromptMetadata(
    promptName: string,
    registry?: string
  ): Promise<{
    content: string;
    metadata: Record<string, string>;
  }> {
    const prompt = await this.getPrompt(promptName, undefined, registry);
    
    // Extract YAML frontmatter if present
    const frontmatterMatch = prompt.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (frontmatterMatch) {
      const [, frontmatter, content] = frontmatterMatch;
      const metadata: Record<string, string> = {};
      
      // Simple YAML parsing for metadata
      const lines = frontmatter.split('\n');
      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          metadata[match[1]] = match[2].trim();
        }
      }
      
      return { content: content.trim(), metadata };
    }
    
    return { content: prompt, metadata: {} };
  }

  /**
   * Close the underlying database connection
   */
  async close(): Promise<void> {
    await this.assetClient.close();
  }

  private replaceVariables(
    template: string, 
    variables?: Record<string, string>
  ): string {
    if (!variables) return template;
    
    let result = template;
    
    // Replace {{variable}} and {{ variable }} formats
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value);
    }
    
    // Also support ${variable} format
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }
}