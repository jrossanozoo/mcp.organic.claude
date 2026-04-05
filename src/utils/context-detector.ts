import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { BusinessLine, ProjectContext, DetectionRule } from '../types';

/**
 * Detector de contexto para identificar automáticamente la línea de negocio
 * basándose en la estructura del proyecto, archivos y contenido.
 */
export class ContextDetector {
  private knowledgeBasePath: string;
  
  constructor(knowledgeBasePath: string = './src/knowledge') {
    this.knowledgeBasePath = knowledgeBasePath;
  }
  private detectionRules: DetectionRule[] = [
    // ==================================================================
    // REGLAS DE DETECCIÓN PARA FOXPRO Y VISUAL FOXPRO
    // Personalizable: Añadir más extensiones o patrones específicos
    // ==================================================================
    {
      name: 'FoxPro Organic Detection',
      businessLine: 'organic',
      patterns: {
        // Extensiones principales de FoxPro
        files: ['*.prg', '*.vcx', '*.scx', '*.dbf', '*.frx', '*.lbx', '*.mnx'],
        // Directorios específicos del proyecto FoxPro
        directories: ['Nucleo', 'Felino', 'Dibujante', 'Generadores', 'ColorYTalle'],
        // Contenido típico de archivos FoxPro ORGANIC
        content: [
          'organic', 'eco', 'sostenible', 'eficiente', 'natural',
          'Define Class', 'EndDefine', 'FxuTestCase', 'goParametros.Organic',
          'This.', 'EndFunc', 'Function', 'Local ', 'Set ', 'Select '
        ]
      },
      weight: 120 // Mayor peso para detección específica de FoxPro
    },
    {
      name: 'FoxPro Lince Detection', 
      businessLine: 'lince',
      patterns: {
        // Extensiones principales de FoxPro
        files: ['*.prg', '*.vcx', '*.scx', '*.dbf', '*.frx', '*.lbx', '*.mnx'],
        // Directorios específicos del proyecto FoxPro
        directories: ['Nucleo', 'Felino', 'Dibujante', 'Generadores', 'ColorYTalle'],
        // Contenido típico de archivos FoxPro LINCE
        content: [
          'lince', 'performance', 'velocidad', 'rapido', 'optimizado',
          'Define Class', 'EndDefine', 'FxuTestCase', 'goParametros.Lince',
          'This.', 'EndFunc', 'Function', 'Local ', 'Set ', 'Select '
        ]
      },
      weight: 120 // Mayor peso para detección específica de FoxPro
    },
    // ==================================================================
    // REGLAS ESPECÍFICAS POR DIRECTORIO FOXPRO
    // Personalizable: Añadir lógica específica para cada directorio
    // ==================================================================
    {
      name: 'Nucleo Directory Detection',
      businessLine: 'organic', // Default, puede cambiar según contenido
      patterns: {
        directories: ['Nucleo', 'nucleo', 'NUCLEO'],
        files: ['Nucleo/*.prg', 'nucleo/*.prg'],
        content: ['nucleo', 'core', 'base', 'fundamental']
      },
      weight: 90
    },
    {
      name: 'Felino Directory Detection', 
      businessLine: 'lince', // Felino sugiere LINCE por asociación
      patterns: {
        directories: ['Felino', 'felino', 'FELINO'],
        files: ['Felino/*.prg', 'felino/*.prg'],
        content: ['felino', 'cat', 'feline', 'agil', 'rapido']
      },
      weight: 90
    },
    {
      name: 'Dibujante Directory Detection',
      businessLine: 'organic', // Default para UI/Graphics
      patterns: {
        directories: ['Dibujante', 'dibujante', 'DIBUJANTE'],
        files: ['Dibujante/*.scx', 'Dibujante/*.vcx', 'dibujante/*.frx'],
        content: ['dibujante', 'draw', 'graphic', 'form', 'report']
      },
      weight: 85
    },
    {
      name: 'Generadores Directory Detection',
      businessLine: 'organic', // Default para generación de código
      patterns: {
        directories: ['Generadores', 'generadores', 'GENERADORES'],
        files: ['Generadores/*.prg', 'generadores/*.prg'],
        content: ['generador', 'generate', 'create', 'build', 'template']
      },
      weight: 85
    },
    {
      name: 'ColorYTalle Directory Detection',
      businessLine: 'organic', // Default para configuración de UI
      patterns: {
        directories: ['ColorYTalle', 'colorytalle', 'COLORYTALLE'],
        files: ['ColorYTalle/*.prg', 'ColorYTalle/*.vcx'],
        content: ['color', 'talle', 'size', 'theme', 'style', 'appearance']
      },
      weight: 85
    },
    // ==================================================================
    // REGLAS GENERALES DE DETECCIÓN (Existentes)
    // Personalizable: Modificar según necesidades del proyecto
    // ==================================================================
    {
      name: 'Organic Package Detection',
      businessLine: 'organic',
      patterns: {
        packageNames: ['@organic/', 'organic-'],
        directories: ['organic', 'org', 'organic-*'],
        files: ['organic.config.js', 'organic.json', '.organic'],
        content: ['organic', 'bio', 'natural', 'eco']
      },
      weight: 100
    },
    {
      name: 'Lince Package Detection',
      businessLine: 'lince',
      patterns: {
        packageNames: ['@lince/', 'lince-'],
        directories: ['lince', 'lynx', 'lince-*'],
        files: ['lince.config.js', 'lince.json', '.lince'],
        content: ['lince', 'lynx', 'predator', 'hunt']
      },
      weight: 100
    },
    {
      name: 'Organic Framework Detection',
      businessLine: 'organic',
      patterns: {
        files: ['package.json'],
        content: ['"@organic', 'organic-framework', 'organic-api']
      },
      weight: 80
    },
    {
      name: 'Lince Framework Detection',
      businessLine: 'lince',
      patterns: {
        files: ['package.json'],
        content: ['"@lince', 'lince-framework', 'lince-api']
      },
      weight: 80
    },
    // ==================================================================
    // REGLAS DE DETECCIÓN PARA DRAGON 2028
    // Framework Organic modular con dovfp y git como VCS
    // ==================================================================
    {
      name: 'Dragon2028 Solution File Detection',
      businessLine: 'dragon2028',
      patterns: {
        files: ['*.vfpsln'],
        directories: [],
        content: []
      },
      weight: 200 // Señal más fuerte: solo Dragon2028 tiene archivos .vfpsln
    },
    {
      name: 'Dragon2028 Project File Detection',
      businessLine: 'dragon2028',
      patterns: {
        files: ['*.vfpproj'],
        directories: [],
        content: []
      },
      weight: 150
    },
    {
      name: 'Dragon2028 CENTRALSS Structure Detection',
      businessLine: 'dragon2028',
      patterns: {
        files: [],
        directories: ['Organic.BusinessLogic', 'Organic.BusinessLogic/CENTRALSS', 'Organic.Generated', 'Organic.Tests'],
        content: []
      },
      weight: 120
    },
    {
      name: 'Dragon2028 PromptOps Detection',
      businessLine: 'dragon2028',
      patterns: {
        files: ['.github/agents/*.agent.md', '.github/copilot-instructions.md'],
        directories: ['.github/agents', '.github/instructions', '.github/prompts'],
        content: []
      },
      weight: 100
    },
    {
      name: 'Dragon2028 DOVFP CLI Detection',
      businessLine: 'dragon2028',
      patterns: {
        files: ['Nuget.config', 'azure-pipelines.yml'],
        directories: [],
        content: ['dovfp', 'dovfp build', 'dovfp test', 'dovfp restore', 'CENTRALSS', 'Organic.Core', 'Organic.Dragonfish']
      },
      weight: 130
    },
    {
      name: 'Dragon2028 Modular Projects Detection',
      businessLine: 'dragon2028',
      patterns: {
        files: [],
        directories: ['Organic.Assets', 'Organic.Mocks', 'Organic.Hooks', 'Organic.Generated/Generados', 'Organic.Tests/Tests.Legacy'],
        content: []
      },
      weight: 110
    }
  ];

  /**
   * Detecta el contexto del proyecto basándose en la ruta proporcionada
   */
  async detectContext(projectPath: string): Promise<ProjectContext> {
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    const scores: Record<BusinessLine, number> = {
      organic: 0,
      lince: 0,
      dragon2028: 0
    };

    const technologies: string[] = [];

    // Ejecutar reglas de detección
    for (const rule of this.detectionRules) {
      const ruleScore = await this.evaluateRule(rule, projectPath);
      scores[rule.businessLine] += ruleScore;
    }

    // Detectar tecnologías
    const detectedTechs = await this.detectTechnologies(projectPath);
    technologies.push(...detectedTechs);

    // Determinar línea de negocio ganadora
    const businessLine = (Object.entries(scores) as [BusinessLine, number][])
      .reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    const confidence = Math.max(...Object.values(scores)) / 100;

    return {
      businessLine,
      projectPath,
      technologies,
      confidence: Math.min(confidence, 1.0)
    };
  }

  /**
   * Evalúa una regla específica de detección
   */
  private async evaluateRule(rule: DetectionRule, projectPath: string): Promise<number> {
    let score = 0;

    // Verificar archivos específicos
    if (rule.patterns.files) {
      for (const filePattern of rule.patterns.files) {
        const files = await glob(filePattern, { cwd: projectPath });
        if (files.length > 0) {
          score += rule.weight * 0.3;
        }
      }
    }

    // Verificar directorios
    if (rule.patterns.directories) {
      for (const dirPattern of rule.patterns.directories) {
        const dirs = await glob(dirPattern, { cwd: projectPath });
        const filteredDirs = dirs.filter(async (path) => {
          const fs = await import('fs/promises');
          const stat = await fs.stat(`${projectPath}/${path}`);
          return stat.isDirectory();
        });
        if (filteredDirs.length > 0) {
          score += rule.weight * 0.2;
        }
      }
    }

    // Verificar contenido de archivos
    if (rule.patterns.content) {
      const contentScore = await this.checkFileContent(projectPath, rule.patterns.content);
      score += contentScore * rule.weight * 0.3;
    }

    // Verificar nombres de paquetes en package.json
    if (rule.patterns.packageNames) {
      const packageScore = await this.checkPackageNames(projectPath, rule.patterns.packageNames);
      score += packageScore * rule.weight * 0.2;
    }

    return score;
  }

  /**
   * Verifica contenido de archivos clave
   */
  private async checkFileContent(projectPath: string, searchTerms: string[]): Promise<number> {
    const keyFiles = ['package.json', 'README.md', 'tsconfig.json', '.env'];
    let matchScore = 0;

    for (const fileName of keyFiles) {
      const filePath = path.join(projectPath, fileName);
      if (fs.existsSync(filePath)) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const lowerContent = content.toLowerCase();
          
          for (const term of searchTerms) {
            if (lowerContent.includes(term.toLowerCase())) {
              matchScore += 0.1;
            }
          }
        } catch (error) {
          // Ignorar errores de lectura de archivo
        }
      }
    }

    return Math.min(matchScore, 1.0);
  }

  /**
   * Verifica nombres de paquetes en package.json
   */
  private async checkPackageNames(projectPath: string, packagePatterns: string[]): Promise<number> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      return 0;
    }

    try {
      const packageJson = await fs.readJSON(packageJsonPath);
      const allDependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };

      let matchScore = 0;
      for (const pattern of packagePatterns) {
        for (const depName of Object.keys(allDependencies)) {
          if (depName.includes(pattern)) {
            matchScore += 0.2;
          }
        }
      }

      return Math.min(matchScore, 1.0);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Detecta tecnologías utilizadas en el proyecto
   */
  private async detectTechnologies(projectPath: string): Promise<string[]> {
    const technologies: string[] = [];
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = await fs.readJSON(packageJsonPath);
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        // Detectar frameworks y tecnologías comunes
        const techMap: Record<string, string> = {
          'react': 'React',
          'vue': 'Vue.js',
          'angular': 'Angular',
          'express': 'Express.js',
          'nestjs': 'NestJS',
          'next': 'Next.js',
          'nuxt': 'Nuxt.js',
          'typescript': 'TypeScript',
          'webpack': 'Webpack',
          'vite': 'Vite',
          'jest': 'Jest',
          'cypress': 'Cypress',
          'prisma': 'Prisma',
          'mongoose': 'Mongoose',
          'graphql': 'GraphQL'
        };

        for (const [key, tech] of Object.entries(techMap)) {
          if (Object.keys(allDeps).some(dep => dep.includes(key))) {
            technologies.push(tech);
          }
        }
      } catch (error) {
        // Ignorar errores de parsing
      }
    }

    // Detectar por archivos de configuración
    const configFiles: Record<string, string> = {
      'tsconfig.json': 'TypeScript',
      'webpack.config.js': 'Webpack',
      'vite.config.js': 'Vite',
      'jest.config.js': 'Jest',
      'cypress.json': 'Cypress',
      'docker-compose.yml': 'Docker',
      'Dockerfile': 'Docker'
    };

    for (const [file, tech] of Object.entries(configFiles)) {
      if (fs.existsSync(path.join(projectPath, file))) {
        if (!technologies.includes(tech)) {
          technologies.push(tech);
        }
      }
    }

    return technologies;
  }

  /**
   * Detecta el contexto basándose en variables de entorno o configuración manual
   */
  detectFromEnvironment(): BusinessLine | null {
    const envBusinessLine = process.env.BUSINESS_LINE;
    if (envBusinessLine === 'organic' || envBusinessLine === 'lince' || envBusinessLine === 'dragon2028') {
      return envBusinessLine;
    }
    return null;
  }

  /**
   * Carga el contexto específico para Copilot integration
   * NUEVO: Carga automática de archivos de contexto .md
   */
  async loadContextForCopilot(businessLine: BusinessLine): Promise<string> {
    const contextPath = path.join(
      this.knowledgeBasePath, 
      businessLine, 
      'context', 
      `${businessLine}-context.md`
    );
    
    try {
      if (fs.existsSync(contextPath)) {
        const contextContent = await fs.readFile(contextPath, 'utf-8');
        return contextContent;
      }
    } catch (error) {
      console.warn(`Could not load context for ${businessLine}: ${error}`);
    }
    
    return this.getDefaultContext(businessLine);
  }

  /**
   * Análisis de repositorio de código fuente para aprendizaje
   * NUEVO: Analiza el código fuente para extraer patrones
   */
  async analyzeSourceRepository(businessLine: BusinessLine): Promise<any> {
    const sourceRepoPath = path.join(
      this.knowledgeBasePath, 
      businessLine, 
      'source-repository'
    );
    
    if (!fs.existsSync(sourceRepoPath)) {
      return { patterns: [], styles: [], architectures: [] };
    }

    const analysis = {
      patterns: await this.extractCodePatterns(sourceRepoPath),
      styles: await this.extractCodingStyles(sourceRepoPath),
      architectures: await this.extractArchitectures(sourceRepoPath),
      sourceFiles: await this.inventorySourceFiles(sourceRepoPath)
    };

    return analysis;
  }

  /**
   * Extrae patrones de código de archivos .prg, .vcx, .scx
   * PERSONALIZABLE: Añadir más extensiones según necesidades
   */
  private async extractCodePatterns(sourceRepoPath: string): Promise<string[]> {
    const patterns: string[] = [];
    const foxproFiles = await glob('**/*.{prg,vcx,scx}', { cwd: sourceRepoPath });
    
    for (const file of foxproFiles) {
      const filePath = path.join(sourceRepoPath, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Extraer patrones específicos de FoxPro
        const foundPatterns = this.extractFoxProPatterns(content);
        patterns.push(...foundPatterns);
      } catch (error) {
        // Ignorar errores de lectura
      }
    }
    
    return [...new Set(patterns)]; // Eliminar duplicados
  }

  /**
   * Extrae patrones específicos de FoxPro
   * PERSONALIZABLE: Añadir más patrones según tu código
   */
  private extractFoxProPatterns(content: string): string[] {
    const patterns: string[] = [];
    const lowerContent = content.toLowerCase();
    
    // Patrones de definición de clase
    if (lowerContent.includes('define class')) {
      patterns.push('CLASS_DEFINITION');
    }
    
    // Patrones ORGANIC
    if (lowerContent.includes('* organic:')) {
      patterns.push('ORGANIC_COMMENT_PATTERN');
    }
    if (lowerContent.includes('goparametros.organic')) {
      patterns.push('ORGANIC_PARAMETER_USAGE');
    }
    if (lowerContent.includes('pool')) {
      patterns.push('OBJECT_POOL_PATTERN');
    }
    if (lowerContent.includes('reutiliz')) {
      patterns.push('REUSE_PATTERN');
    }
    
    // Patrones LINCE
    if (lowerContent.includes('* lince:') || lowerContent.includes('* speed:')) {
      patterns.push('LINCE_COMMENT_PATTERN');
    }
    if (lowerContent.includes('goparametros.lince')) {
      patterns.push('LINCE_PARAMETER_USAGE');
    }
    if (lowerContent.includes('benchmark') || lowerContent.includes('throughput')) {
      patterns.push('PERFORMANCE_MEASUREMENT_PATTERN');
    }
    if (lowerContent.includes('cache')) {
      patterns.push('AGGRESSIVE_CACHE_PATTERN');
    }
    
    // Patrones de estructura FoxPro
    if (lowerContent.includes('function ') && lowerContent.includes('endfunc')) {
      patterns.push('FUNCTION_DEFINITION');
    }
    if (lowerContent.includes('this.')) {
      patterns.push('OBJECT_REFERENCE_PATTERN');
    }
    if (lowerContent.includes('local ')) {
      patterns.push('LOCAL_VARIABLE_PATTERN');
    }
    
    return patterns;
  }

  /**
   * Extrae estilos de codificación
   */
  private async extractCodingStyles(sourceRepoPath: string): Promise<any> {
    const styles = {
      namingConventions: [],
      commentStyles: [],
      indentationStyle: 'unknown',
      functionStructure: 'unknown'
    };
    
    // Implementar análisis de estilo basado en archivos fuente
    // Por ahora retornar estructura básica
    // TODO: Analizar archivos en sourceRepoPath para extraer estilos
    console.log(`Analyzing coding styles in: ${sourceRepoPath}`);
    return styles;
  }

  /**
   * Extrae arquitecturas utilizadas
   */
  private async extractArchitectures(sourceRepoPath: string): Promise<string[]> {
    const architectures: string[] = [];
    
    // Detectar arquitecturas por estructura de directorios
    const subdirs = await this.getSubdirectories(sourceRepoPath);
    
    if (subdirs.includes('classes')) {
      architectures.push('CLASS_BASED_ARCHITECTURE');
    }
    if (subdirs.includes('forms')) {
      architectures.push('FORM_BASED_UI_ARCHITECTURE');
    }
    if (subdirs.includes('controls')) {
      architectures.push('COMPONENT_BASED_ARCHITECTURE');
    }
    if (subdirs.includes('patterns')) {
      architectures.push('PATTERN_BASED_ARCHITECTURE');
    }
    
    return architectures;
  }

  /**
   * Inventario de archivos fuente
   */
  private async inventorySourceFiles(sourceRepoPath: string): Promise<any> {
    const inventory = {
      totalFiles: 0,
      fileTypes: {} as Record<string, number>,
      directories: [] as string[],
      lastModified: new Date()
    };
    
    try {
      const allFiles = await glob('**/*', { cwd: sourceRepoPath });
      inventory.totalFiles = allFiles.length;
      
      // Contar por tipo de archivo
      for (const file of allFiles) {
        const ext = path.extname(file).toLowerCase();
        inventory.fileTypes[ext] = (inventory.fileTypes[ext] || 0) + 1;
      }
      
      inventory.directories = await this.getSubdirectories(sourceRepoPath);
    } catch (error) {
      // Error de inventario
      console.warn(`Error creating inventory: ${error}`);
    }
    
    return inventory;
  }

  /**
   * Obtiene subdirectorios
   */
  private async getSubdirectories(dirPath: string): Promise<string[]> {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      return items
        .filter(item => item.isDirectory())
        .map(item => item.name);
    } catch (error) {
      return [];
    }
  }

  /**
   * Contexto por defecto si no existe archivo específico
   */
  private getDefaultContext(businessLine: BusinessLine): string {
    if (businessLine === 'organic') {
      return `# Contexto ORGANIC por defecto
Enfoque en sostenibilidad, eficiencia de recursos y desarrollo responsable.
Usar pool de objetos, métricas de sostenibilidad y cleanup gradual.`;
    } else if (businessLine === 'dragon2028') {
      return `# Contexto DRAGON 2028 por defecto
Arquitectura modular con Visual FoxPro. CLI: dovfp. Soluciones con archivos .vfpsln/.vfpproj.
Cadena de dependencias: Core → Drawing → Generator → Feline → Dragonfish/ZL. Git como VCS.`;
    } else {
      return `# Contexto LINCE por defecto
Enfoque en máximo rendimiento, velocidad extrema y eficiencia computacional.
Usar cache agresivo, métricas de performance y optimización de velocidad.`;
    }
  }

  /**
   * Agrega una regla personalizada de detección
   */
  addDetectionRule(rule: DetectionRule): void {
    this.detectionRules.push(rule);
  }

  /**
   * Obtiene todas las reglas de detección configuradas
   */
  getDetectionRules(): DetectionRule[] {
    return [...this.detectionRules];
  }
}
