import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { minimatch } from 'minimatch';
import { SemanticChange, ClassifiedChange, Rule, CommitType, SemanticChangeType } from '../types/index.js';

/**
 * Motor de regras para classificação das mudanças
 * Aplica regras configuráveis às mudanças para classificá-las
 */
export class RulesEngine {
  private rules: Rule[] = [];
  private configPath: string;

  constructor(customConfigPath?: string) {
    this.configPath = customConfigPath || path.join(process.cwd(), 'src/config/default-rules.yaml');
    this.loadRules();
  }

  /**
   * Carrega regras do arquivo de configuração
   */
  private loadRules(): void {
    try {
      // Tentar carregar as regras do arquivo de configuração
      const rulesContent = fs.readFileSync(this.configPath, 'utf-8');
      this.rules = yaml.parse(rulesContent) as Rule[];
      console.log(`Carregadas ${this.rules.length} regras de ${this.configPath}`);
    } catch (error) {
      console.error('Erro ao carregar regras:', error);
      // Definir regras padrão mínimas em caso de falha
      this.rules = [
        {
          id: 'default-test',
          match: '**/*.{spec,test}.{ts,js}',
          type: 'test',
          reason: 'Arquivo de teste'
        },
        {
          id: 'default-docs',
          match: '**/*.md',
          type: 'docs',
          reason: 'Arquivo de documentação'
        }
      ];
    }
  }

  /**
   * Aplica regras às mudanças para classificá-las
   */
  applyRules(changes: SemanticChange[]): ClassifiedChange[] {
    console.log(`Aplicando ${this.rules.length} regras a ${changes.length} mudanças...`);
    
    return changes.map(change => this.classifyChange(change));
  }
  
  /**
   * Classifica uma mudança de acordo com as regras
   */
  private classifyChange(change: SemanticChange): ClassifiedChange {
    // Inicializar a mudança classificada
    const classified: ClassifiedChange = {
      ...change,
      commitType: undefined, // Será definido com base nas regras
      commitScope: this.determineScope(change),
      breaking: this.isBreakingChange(change),
      appliedRules: [],
      description: this.generateDescription(change)
    };
    
    // Aplicar regras baseadas em padrão de arquivo
    for (const rule of this.rules) {
      if (this.ruleApplies(rule, change)) {
        // Se a regra se aplica, usar seu tipo de commit
        if (rule.type) {
          classified.commitType = rule.type;
        }
        
        // Adicionar o ID da regra à lista de regras aplicadas
        classified.appliedRules.push(rule.id);
      }
    }
    
    // Se nenhuma regra específica se aplicou, aplicar heurísticas gerais
    if (!classified.commitType) {
      classified.commitType = this.applyDefaultHeuristics(change);
    }
    
    return classified;
  }
  
  /**
   * Verifica se uma regra se aplica a uma mudança
   */
  private ruleApplies(rule: Rule, change: SemanticChange): boolean {
    // Verificar match baseado em padrão glob de arquivo
    if (rule.match && minimatch(change.filePath, rule.match)) {
      return true;
    }
    
    // Verificar match baseado em path específico
    if (rule.match_path && change.filePath.includes(rule.match_path)) {
      return true;
    }
    
    // Verificar match baseado em padrão AST
    // Isso exigiria uma análise mais profunda do AST
    // e seria implementado na versão completa
    if (rule.match_ast && change.semanticChanges.some(delta => 
      delta.description.includes(rule.match_ast!))) {
      return true;
    }
    
    // Verificar heurísticas
    if (rule.heuristics) {
      for (const heuristic of rule.heuristics) {
        // Implementação simples de heurística
        // Uma implementação real usaria uma sintaxe mais rica
        if (heuristic.if.includes('containsDtoPropertyRemoved') && 
            this.checkDtoPropertyRemoved(change)) {
          return true;
        }
        
        if (heuristic.if.includes('containsDtoAddedOptional') && 
            this.checkDtoAddedOptional(change)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Verifica se uma mudança representa uma propriedade removida de um DTO
   */
  private checkDtoPropertyRemoved(change: SemanticChange): boolean {
    return change.semanticChanges.some(delta => 
      delta.description.includes('removido da interface') || 
      delta.description.includes('removed from interface'));
  }
  
  /**
   * Verifica se uma mudança representa uma propriedade opcional adicionada a um DTO
   */
  private checkDtoAddedOptional(change: SemanticChange): boolean {
    return change.semanticChanges.some(delta => 
      delta.description.includes('(opcional)') || 
      delta.description.includes('(optional)'));
  }
  
  /**
   * Determina se uma mudança é uma breaking change
   */
  private isBreakingChange(change: SemanticChange): boolean {
    // Verificar se alguma das alterações semânticas é de severidade 'breaking'
    return change.semanticChanges.some(delta => delta.severity === 'breaking');
  }
  
  /**
   * Aplica heurísticas padrão para determinar o tipo de commit
   */
  private applyDefaultHeuristics(change: SemanticChange): CommitType {
    // Tipos de arquivos especiais
    if (change.filePath.includes('test') || change.filePath.includes('spec')) {
      return 'test';
    }
    
    if (change.filePath.endsWith('.md') || change.filePath.includes('/docs/')) {
      return 'docs';
    }
    
    // Baseado no tipo de alteração
    if (change.type === 'added') {
      return 'feat';
    }
    
    // Baseado em alterações semânticas
    const hasFeature = change.semanticChanges.some(delta => 
      delta.type === SemanticChangeType.METHOD_ADDED || 
      delta.type === SemanticChangeType.INTERFACE_CHANGED);
    
    const hasImplementationChange = change.semanticChanges.some(delta => 
      delta.type === SemanticChangeType.IMPLEMENTATION_CHANGED);
    
    if (hasFeature) {
      return 'feat';
    }
    
    if (hasImplementationChange) {
      return 'fix';
    }
    
    // Default
    return 'chore';
  }
  
  /**
   * Determina o escopo do commit com base na mudança
   */
  private determineScope(change: SemanticChange): string | undefined {
    // Tentar determinar o escopo com base no caminho do arquivo
    const filePath = change.filePath;
    const parts = filePath.split('/');
    
    // Se o arquivo estiver em uma pasta src/feature/
    if (parts.includes('src') && parts.length > parts.indexOf('src') + 1) {
      return parts[parts.indexOf('src') + 1];
    }
    
    // Se o arquivo estiver em uma pasta de teste
    if (parts.includes('tests') && parts.length > parts.indexOf('tests') + 1) {
      return parts[parts.indexOf('tests') + 1];
    }
    
    // Usar o scope da mudança se estiver definido
    return change.scope;
  }
  
  /**
   * Gera uma descrição para o commit com base na mudança
   */
  private generateDescription(change: SemanticChange): string {
    // Se houver apenas uma alteração significativa
    if (change.semanticChanges.length === 1) {
      return change.semanticChanges[0].description;
    }
    
    // Se for uma mudança em arquivo de teste
    if (change.filePath.includes('test') || change.filePath.includes('spec')) {
      return `Atualização de testes em ${path.basename(change.filePath)}`;
    }
    
    // Se for adição de um novo arquivo
    if (change.type === 'added') {
      return `Adiciona ${path.basename(change.filePath)}`;
    }
    
    // Se for remoção de um arquivo
    if (change.type === 'deleted') {
      return `Remove ${path.basename(change.filePath)}`;
    }
    
    // Caso geral
    return `Atualiza ${path.basename(change.filePath)}`;
  }
}
