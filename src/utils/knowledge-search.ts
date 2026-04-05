import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import * as yaml from 'yaml';
import { BusinessLine, KnowledgeItem, SearchResult } from '../types';

/**
 * Sistema de búsqueda y gestión del repositorio de conocimiento
 */
export class KnowledgeSearch {
  private knowledgeBasePath: string;
  private indexCache: Map<string, KnowledgeItem[]> = new Map();
  private lastIndexUpdate: Map<string, number> = new Map();
  private cacheTimeout: number = 300000; // 5 minutos

  constructor(knowledgeBasePath: string) {
    this.knowledgeBasePath = knowledgeBasePath;
  }

  /**
   * Busca conocimiento específico para una línea de negocio
   */
  async search(
    businessLine: BusinessLine,
    query: string,
    category?: string,
    limit: number = 10
  ): Promise<SearchResult> {
    const items = await this.getKnowledgeItems(businessLine);
    const searchTerms = this.extractSearchTerms(query);
    
    let filteredItems = items;

    // Filtrar por categoría si se especifica
    if (category) {
      filteredItems = items.filter(item => item.category === category);
    }

    // Buscar por términos
    const scoredItems = filteredItems
      .map(item => ({
        item,
        score: this.calculateRelevanceScore(item, searchTerms)
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ item }) => item);

    return {
      items: scoredItems,
      totalCount: scoredItems.length,
      searchTerms,
      businessLine
    };
  }

  /**
   * Obtiene un elemento de conocimiento específico por ID
   */
  async getKnowledgeItem(businessLine: BusinessLine, id: string): Promise<KnowledgeItem | null> {
    const items = await this.getKnowledgeItems(businessLine);
    return items.find(item => item.id === id) || null;
  }

  /**
   * Obtiene todos los elementos de conocimiento por categoría
   */
  async getKnowledgeByCategory(
    businessLine: BusinessLine,
    category: string
  ): Promise<KnowledgeItem[]> {
    const items = await this.getKnowledgeItems(businessLine);
    return items.filter(item => item.category === category);
  }

  /**
   * Obtiene mejores prácticas específicas por tecnología
   */
  async getBestPractices(
    businessLine: BusinessLine,
    technology?: string
  ): Promise<KnowledgeItem[]> {
    const items = await this.getKnowledgeByCategory(businessLine, 'best-practices');
    
    if (!technology) {
      return items;
    }

    return items.filter(item => 
      item.tags.some(tag => tag.toLowerCase().includes(technology.toLowerCase())) ||
      item.content.toLowerCase().includes(technology.toLowerCase())
    );
  }

  /**
   * Obtiene elementos de conocimiento relacionados
   */
  async getRelatedItems(
    businessLine: BusinessLine,
    itemId: string
  ): Promise<KnowledgeItem[]> {
    const item = await this.getKnowledgeItem(businessLine, itemId);
    if (!item || !item.relatedItems) {
      return [];
    }

    const allItems = await this.getKnowledgeItems(businessLine);
    return allItems.filter(relatedItem => 
      item.relatedItems!.includes(relatedItem.id)
    );
  }

  /**
   * Carga todos los elementos de conocimiento para una línea de negocio
   */
  private async getKnowledgeItems(businessLine: BusinessLine): Promise<KnowledgeItem[]> {
    const cacheKey = businessLine;
    const now = Date.now();
    const lastUpdate = this.lastIndexUpdate.get(cacheKey) || 0;

    // Verificar si el cache es válido
    if (now - lastUpdate < this.cacheTimeout && this.indexCache.has(cacheKey)) {
      return this.indexCache.get(cacheKey)!;
    }

    // Reindexar conocimiento
    const items = await this.indexKnowledge(businessLine);
    this.indexCache.set(cacheKey, items);
    this.lastIndexUpdate.set(cacheKey, now);

    return items;
  }

  /**
   * Indexa todo el conocimiento de una línea de negocio
   */
  private async indexKnowledge(businessLine: BusinessLine): Promise<KnowledgeItem[]> {
    const businessLinePath = path.join(this.knowledgeBasePath, businessLine);
    
    if (!fs.existsSync(businessLinePath)) {
      return [];
    }

    const items: KnowledgeItem[] = [];
    const categories = ['architecture', 'patterns', 'standards', 'best-practices'];

    for (const category of categories) {
      const categoryPath = path.join(businessLinePath, category);
      if (fs.existsSync(categoryPath)) {
        const categoryItems = await this.indexCategory(businessLine, category, categoryPath);
        items.push(...categoryItems);
      }
    }

    return items;
  }

  /**
   * Indexa una categoría específica de conocimiento
   */
  private async indexCategory(
    businessLine: BusinessLine,
    category: string,
    categoryPath: string
  ): Promise<KnowledgeItem[]> {
    const items: KnowledgeItem[] = [];
    
    // Buscar archivos markdown y yaml
    const files = await glob('**/*.{md,yml,yaml}', { 
      cwd: categoryPath,
      absolute: true 
    });

    for (const filePath of files) {
      try {
        const item = await this.parseKnowledgeFile(businessLine, category, filePath);
        if (item) {
          items.push(item);
        }
      } catch (error) {
        console.warn(`Error parsing knowledge file ${filePath}:`, error);
      }
    }

    return items;
  }

  /**
   * Parsea un archivo de conocimiento individual
   */
  private async parseKnowledgeFile(
    businessLine: BusinessLine,
    category: string,
    filePath: string
  ): Promise<KnowledgeItem | null> {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath, ext);

    let knowledgeData: any = {};
    let mainContent = content;

    if (ext === '.yml' || ext === '.yaml') {
      // Archivo YAML completo
      knowledgeData = yaml.parse(content);
      mainContent = knowledgeData.content || '';
    } else if (ext === '.md') {
      // Markdown con frontmatter opcional
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (frontmatterMatch) {
        knowledgeData = yaml.parse(frontmatterMatch[1]);
        mainContent = frontmatterMatch[2];
      }
    }

    const stats = await fs.stat(filePath);
    
    return {
      id: knowledgeData.id || `${businessLine}-${category}-${fileName}`,
      title: knowledgeData.title || fileName.replace(/-/g, ' '),
      description: knowledgeData.description || '',
      category: category as any,
      businessLine,
      tags: knowledgeData.tags || [],
      content: mainContent.trim(),
      examples: knowledgeData.examples || [],
      relatedItems: knowledgeData.relatedItems || [],
      lastUpdated: stats.mtime,
      version: knowledgeData.version || '1.0.0'
    };
  }

  /**
   * Extrae términos de búsqueda de una consulta
   */
  private extractSearchTerms(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2)
      .map(term => term.replace(/[^\w\-]/g, ''));
  }

  /**
   * Calcula el score de relevancia de un elemento para una búsqueda
   */
  private calculateRelevanceScore(item: KnowledgeItem, searchTerms: string[]): number {
    let score = 0;
    const lowerTitle = item.title.toLowerCase();
    const lowerDescription = item.description.toLowerCase();
    const lowerContent = item.content.toLowerCase();
    const lowerTags = item.tags.map(tag => tag.toLowerCase());

    for (const term of searchTerms) {
      // Título tiene mayor peso
      if (lowerTitle.includes(term)) {
        score += 10;
      }

      // Descripción tiene peso medio
      if (lowerDescription.includes(term)) {
        score += 5;
      }

      // Tags tienen peso alto
      if (lowerTags.some(tag => tag.includes(term))) {
        score += 8;
      }

      // Contenido tiene peso menor
      const contentMatches = (lowerContent.match(new RegExp(term, 'g')) || []).length;
      score += contentMatches * 2;
    }

    // Bonus por coincidencias múltiples
    const termMatches = searchTerms.filter(term => 
      lowerTitle.includes(term) || 
      lowerDescription.includes(term) || 
      lowerTags.some(tag => tag.includes(term))
    ).length;

    if (termMatches > 1) {
      score *= 1.5;
    }

    return score;
  }

  /**
   * Invalida el cache para forzar reindexación
   */
  invalidateCache(businessLine?: BusinessLine): void {
    if (businessLine) {
      this.indexCache.delete(businessLine);
      this.lastIndexUpdate.delete(businessLine);
    } else {
      this.indexCache.clear();
      this.lastIndexUpdate.clear();
    }
  }

  /**
   * Obtiene estadísticas del repositorio de conocimiento
   */
  async getStatistics(businessLine: BusinessLine): Promise<{
    totalItems: number;
    categoryCounts: Record<string, number>;
    lastUpdated: Date;
  }> {
    const items = await this.getKnowledgeItems(businessLine);
    const categoryCounts: Record<string, number> = {};

    for (const item of items) {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    }

    const lastUpdated = items.reduce((latest, item) => {
      return item.lastUpdated > latest ? item.lastUpdated : latest;
    }, new Date(0));

    return {
      totalItems: items.length,
      categoryCounts,
      lastUpdated
    };
  }
}
