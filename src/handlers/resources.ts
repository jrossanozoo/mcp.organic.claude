import { ResourceInfo, BusinessLine } from '../types';
import { KnowledgeSearch } from '../utils/knowledge-search';

/**
 * Manejador de recursos MCP para exponer el repositorio de conocimiento
 */
export class ResourcesHandler {
  private knowledgeSearch: KnowledgeSearch;

  constructor(knowledgeSearch: KnowledgeSearch, _knowledgeBasePath: string) {
    this.knowledgeSearch = knowledgeSearch;
    // knowledgeBasePath stored for future file system access
  }

  /**
   * Lista todos los recursos disponibles
   */
  async listResources(): Promise<ResourceInfo[]> {
    const resources: ResourceInfo[] = [];

    // Recursos para cada línea de negocio
    const businessLines: BusinessLine[] = ['organic', 'lince', 'dragon2028'];
    
    for (const businessLine of businessLines) {
      // Agregar recursos de categorías
      const categories = ['architecture', 'patterns', 'standards', 'best-practices'];
      
      for (const category of categories) {
        resources.push({
          uri: `knowledge://${businessLine}/${category}`,
          name: `${businessLine.toUpperCase()} - ${category.replace('-', ' ')}`,
          description: `Repositorio de ${category.replace('-', ' ')} para la línea de negocio ${businessLine}`,
          mimeType: 'application/json'
        });
      }

      // Agregar recurso de estadísticas
      resources.push({
        uri: `knowledge://${businessLine}/statistics`,
        name: `${businessLine.toUpperCase()} - Statistics`,
        description: `Estadísticas del repositorio de conocimiento ${businessLine}`,
        mimeType: 'application/json'
      });

      // Agregar recurso de índice completo
      resources.push({
        uri: `knowledge://${businessLine}/index`,
        name: `${businessLine.toUpperCase()} - Full Index`,
        description: `Índice completo del repositorio de conocimiento ${businessLine}`,
        mimeType: 'application/json'
      });

      // Agregar recursos de plantillas
      resources.push({
        uri: `templates://${businessLine}/test-templates`,
        name: `${businessLine.toUpperCase()} - Test Templates`,
        description: `Plantillas de test optimizadas para la línea de negocio ${businessLine}`,
        mimeType: 'text/markdown'
      });

      resources.push({
        uri: `templates://${businessLine}/lambda-templates`,
        name: `${businessLine.toUpperCase()} - Lambda Templates`,
        description: `Plantillas de funciones Lambda optimizadas para la línea de negocio ${businessLine}`,
        mimeType: 'text/markdown'
      });
    }

    // Recursos globales
    resources.push({
      uri: 'knowledge://global/comparison',
      name: 'Business Lines Comparison',
      description: 'Comparación entre las líneas de negocio Organic y Lince',
      mimeType: 'application/json'
    });

    resources.push({
      uri: 'knowledge://global/detection-rules',
      name: 'Detection Rules',
      description: 'Reglas de detección automática de líneas de negocio',
      mimeType: 'application/json'
    });

    return resources;
  }

  /**
   * Obtiene el contenido de un recurso específico
   */
  async getResource(uri: string): Promise<{ content: string; mimeType: string }> {
    const parsedUri = this.parseResourceUri(uri);
    
    switch (parsedUri.type) {
      case 'category':
        return await this.getCategoryResource(parsedUri.businessLine!, parsedUri.category!);
      
      case 'statistics':
        return await this.getStatisticsResource(parsedUri.businessLine!);
      
      case 'index':
        return await this.getIndexResource(parsedUri.businessLine!);
      
      case 'comparison':
        return await this.getComparisonResource();
      
      case 'detection-rules':
        return await this.getDetectionRulesResource();
      
      case 'item':
        return await this.getKnowledgeItemResource(parsedUri.businessLine!, parsedUri.itemId!);
      
      case 'test-templates':
        return await this.getTestTemplatesResource(parsedUri.businessLine!);
      
      case 'lambda-templates':
        return await this.getLambdaTemplatesResource(parsedUri.businessLine!);
      
      default:
        throw new Error(`Unknown resource type: ${uri}`);
    }
  }

  /**
   * Parsea la URI del recurso
   */
  private parseResourceUri(uri: string): {
    type: 'category' | 'statistics' | 'index' | 'comparison' | 'detection-rules' | 'item' | 'test-templates' | 'lambda-templates';
    businessLine?: BusinessLine;
    category?: string;
    itemId?: string;
  } {
    // Handle templates URIs
    const templatesMatch = uri.match(/^templates:\/\/([^\/]+)\/([^\/]+)$/);
    if (templatesMatch) {
      const [, businessLine, templateType] = templatesMatch;
      if (templateType === 'test-templates') {
        return { type: 'test-templates', businessLine: businessLine as BusinessLine };
      } else if (templateType === 'lambda-templates') {
        return { type: 'lambda-templates', businessLine: businessLine as BusinessLine };
      }
    }
    
    // Handle knowledge URIs
    const match = uri.match(/^knowledge:\/\/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?$/);
    
    if (!match) {
      throw new Error(`Invalid resource URI: ${uri}`);
    }

    const [, namespace, resource, subResource] = match;

    if (namespace === 'global') {
      if (resource === 'comparison') {
        return { type: 'comparison' };
      } else if (resource === 'detection-rules') {
        return { type: 'detection-rules' };
      }
    }

    const businessLine = namespace as BusinessLine;
    
    if (resource === 'statistics') {
      return { type: 'statistics', businessLine };
    } else if (resource === 'index') {
      return { type: 'index', businessLine };
    } else if (subResource) {
      return { type: 'item', businessLine, itemId: subResource };
    } else {
      return { type: 'category', businessLine, category: resource };
    }

    throw new Error(`Could not parse resource URI: ${uri}`);
  }

  /**
   * Obtiene el contenido de una categoría específica
   */
  private async getCategoryResource(businessLine: BusinessLine, category: string): Promise<{
    content: string;
    mimeType: string;
  }> {
    const items = await this.knowledgeSearch.getKnowledgeByCategory(businessLine, category);
    
    const categoryData = {
      businessLine,
      category,
      totalItems: items.length,
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        tags: item.tags,
        lastUpdated: item.lastUpdated,
        version: item.version,
        uri: `knowledge://${businessLine}/${category}/${item.id}`,
        examples: item.examples?.length || 0,
        relatedItems: item.relatedItems?.length || 0
      })),
      lastUpdated: new Date().toISOString()
    };

    return {
      content: JSON.stringify(categoryData, null, 2),
      mimeType: 'application/json'
    };
  }

  /**
   * Obtiene las estadísticas del repositorio
   */
  private async getStatisticsResource(businessLine: BusinessLine): Promise<{
    content: string;
    mimeType: string;
  }> {
    const stats = await this.knowledgeSearch.getStatistics(businessLine);
    
    const statsData = {
      businessLine,
      ...stats,
      generatedAt: new Date().toISOString()
    };

    return {
      content: JSON.stringify(statsData, null, 2),
      mimeType: 'application/json'
    };
  }

  /**
   * Obtiene el índice completo del repositorio
   */
  private async getIndexResource(businessLine: BusinessLine): Promise<{
    content: string;
    mimeType: string;
  }> {
    const categories = ['architecture', 'patterns', 'standards', 'best-practices'];
    const index: any = {
      businessLine,
      categories: {},
      totalItems: 0,
      generatedAt: new Date().toISOString()
    };

    for (const category of categories) {
      const items = await this.knowledgeSearch.getKnowledgeByCategory(businessLine, category);
      index.categories[category] = {
        count: items.length,
        items: items.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          tags: item.tags,
          uri: `knowledge://${businessLine}/${category}/${item.id}`
        }))
      };
      index.totalItems += items.length;
    }

    return {
      content: JSON.stringify(index, null, 2),
      mimeType: 'application/json'
    };
  }

  /**
   * Obtiene la comparación entre líneas de negocio
   */
  private async getComparisonResource(): Promise<{
    content: string;
    mimeType: string;
  }> {
    const organicStats = await this.knowledgeSearch.getStatistics('organic');
    const linceStats = await this.knowledgeSearch.getStatistics('lince');

    const comparison = {
      organic: {
        ...organicStats,
        characteristics: [
          'Enfoque en sostenibilidad',
          'Desarrollo eficiente de recursos',
          'Arquitectura modular y escalable',
          'Prioridad en calidad y mantenibilidad'
        ]
      },
      lince: {
        ...linceStats,
        characteristics: [
          'Enfoque en velocidad y agilidad',
          'Performance-first development',
          'Deployment continuo',
          'Respuesta rápida al mercado'
        ]
      },
      comparison: {
        totalItemsOrganic: organicStats.totalItems,
        totalItemsLince: linceStats.totalItems,
        commonCategories: ['architecture', 'patterns', 'standards', 'best-practices'],
        differences: [
          'Organic prioriza sostenibilidad, Lince prioriza velocidad',
          'Organic usa microservicios, Lince prefiere serverless',
          'Organic enfatiza calidad, Lince enfatiza time-to-market'
        ]
      },
      generatedAt: new Date().toISOString()
    };

    return {
      content: JSON.stringify(comparison, null, 2),
      mimeType: 'application/json'
    };
  }

  /**
   * Obtiene las reglas de detección
   */
  private async getDetectionRulesResource(): Promise<{
    content: string;
    mimeType: string;
  }> {
    // Aquí podrías obtener las reglas reales del ContextDetector
    const detectionRules = {
      rules: [
        {
          name: 'Organic Package Detection',
          businessLine: 'organic',
          patterns: {
            packageNames: ['@organic/', 'organic-'],
            directories: ['organic', 'org', 'organic-*'],
            files: ['organic.config.js', 'organic.json', '.organic']
          },
          weight: 100
        },
        {
          name: 'Lince Package Detection',
          businessLine: 'lince',
          patterns: {
            packageNames: ['@lince/', 'lince-'],
            directories: ['lince', 'lynx', 'lince-*'],
            files: ['lince.config.js', 'lince.json', '.lince']
          },
          weight: 100
        }
      ],
      description: 'Reglas utilizadas para detectar automáticamente la línea de negocio de un proyecto',
      usage: 'Estas reglas se aplican analizando la estructura de archivos, dependencias y contenido del proyecto',
      generatedAt: new Date().toISOString()
    };

    return {
      content: JSON.stringify(detectionRules, null, 2),
      mimeType: 'application/json'
    };
  }

  /**
   * Obtiene un elemento específico de conocimiento
   */
  private async getKnowledgeItemResource(businessLine: BusinessLine, itemId: string): Promise<{
    content: string;
    mimeType: string;
  }> {
    const item = await this.knowledgeSearch.getKnowledgeItem(businessLine, itemId);
    
    if (!item) {
      throw new Error(`Knowledge item not found: ${itemId}`);
    }

    // Obtener elementos relacionados
    const relatedItems = await this.knowledgeSearch.getRelatedItems(businessLine, itemId);

    const itemData = {
      ...item,
      relatedItemsDetails: relatedItems.map(related => ({
        id: related.id,
        title: related.title,
        description: related.description,
        category: related.category,
        uri: `knowledge://${businessLine}/${related.category}/${related.id}`
      })),
      resourceUri: `knowledge://${businessLine}/${item.category}/${item.id}`,
      accessedAt: new Date().toISOString()
    };

    return {
      content: JSON.stringify(itemData, null, 2),
      mimeType: 'application/json'
    };
  }

  /**
   * Busca recursos por query
   */
  async searchResources(query: string): Promise<ResourceInfo[]> {
    const allResources = await this.listResources();
    const lowerQuery = query.toLowerCase();

    return allResources.filter(resource => 
      resource.name.toLowerCase().includes(lowerQuery) ||
      resource.description?.toLowerCase().includes(lowerQuery) ||
      resource.uri.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Obtiene recursos por línea de negocio
   */
  async getResourcesByBusinessLine(businessLine: BusinessLine): Promise<ResourceInfo[]> {
    const allResources = await this.listResources();
    return allResources.filter(resource => 
      resource.uri.includes(`knowledge://${businessLine}/`)
    );
  }

  /**
   * Valida si una URI de recurso existe
   */
  async resourceExists(uri: string): Promise<boolean> {
    try {
      await this.getResource(uri);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene las plantillas de test para una línea de negocio
   */
  private async getTestTemplatesResource(businessLine: BusinessLine): Promise<{
    content: string;
    mimeType: string;
  }> {
    try {
      // Try to read from file system if available
      // const templatePath = `${this.knowledgeBasePath}/${businessLine}/templates/test-templates.md`;
      // For now, we'll use the default templates
      // In a real implementation, you would read from the file system
      const content = this.getDefaultTestTemplates(businessLine);
      
      return {
        content,
        mimeType: 'text/markdown'
      };
    } catch (error) {
      // Fallback to default templates
      const defaultContent = this.getDefaultTestTemplates(businessLine);
      return {
        content: defaultContent,
        mimeType: 'text/markdown'
      };
    }
  }

  /**
   * Obtiene las plantillas de lambda para una línea de negocio
   */
  private async getLambdaTemplatesResource(businessLine: BusinessLine): Promise<{
    content: string;
    mimeType: string;
  }> {
    try {
      // Try to read from file system if available
      // const templatePath = `${this.knowledgeBasePath}/${businessLine}/templates/lambda-templates.md`;
      // For now, we'll use the default templates
      // In a real implementation, you would read from the file system
      const content = this.getDefaultLambdaTemplates(businessLine);
      
      return {
        content,
        mimeType: 'text/markdown'
      };
    } catch (error) {
      // Fallback to default templates
      const defaultContent = this.getDefaultLambdaTemplates(businessLine);
      return {
        content: defaultContent,
        mimeType: 'text/markdown'
      };
    }
  }

  /**
   * Genera plantillas de test por defecto
   */
  private getDefaultTestTemplates(businessLine: BusinessLine): string {
    const principles = businessLine === 'organic' ? 
      'sustainable, environmental impact-conscious, and resource-optimized' : 
      'high-performance, agile, and speed-optimized';

    return `# ${businessLine.toUpperCase()} Test Templates

## Basic Unit Test Template

\`\`\`javascript
// ${businessLine.toUpperCase()} - {{TEST_NAME}} Unit Tests
// ${principles} testing approach

describe('{{TEST_NAME}}', () => {
  test('should handle basic functionality', () => {
    // Arrange
    const input = {};
    const expected = true;
    
    // Act
    const result = {{FUNCTION_NAME}}(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
\`\`\`

This template follows ${businessLine.toUpperCase()} principles for ${principles} development.
`;
  }

  /**
   * Genera plantillas de lambda por defecto
   */
  private getDefaultLambdaTemplates(businessLine: BusinessLine): string {
    const principles = businessLine === 'organic' ? 
      'sustainable and resource-efficient' : 
      'high-performance and low-latency';

    return `# ${businessLine.toUpperCase()} Lambda Templates

## Basic Lambda Function Template

\`\`\`javascript
// ${businessLine.toUpperCase()} Lambda: {{FUNCTION_NAME}}
// ${principles} serverless function

exports.handler = async (event) => {
    try {
        // Extract parameters
        {{PARAMETERS}}
        
        // Apply formula
        const result = {{FORMULA}};
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                data: result
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
\`\`\`

This template follows ${businessLine.toUpperCase()} principles for ${principles} serverless computing.
`;
  }
}
