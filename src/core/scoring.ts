import { ClassifiedChange, ScoredChange, SemanticChangeType } from '../types/index.js';

/**
 * Sistema de pontuação para priorização de alterações
 * Avalia o impacto e a relevância das mudanças
 */
export class ScoringSystem {
  // Pesos para diferentes fatores
  private weights = {
    breakingChange: 10,
    publicAPI: 8,
    featureAddition: 6,
    bugFix: 5,
    fileSize: 0.01,
    semanticImpact: 7,
    fileType: {
      script: 1,
      test: 0.5,
      config: 0.7,
      doc: 0.3
    },
    changeType: {
      added: 0.8,
      modified: 1,
      deleted: 1.2,
      renamed: 0.5
    }
  };

  constructor(customWeights?: Partial<typeof ScoringSystem.prototype.weights>) {
    // Permitir personalização dos pesos
    if (customWeights) {
      this.weights = { ...this.weights, ...customWeights };
    }
  }

  /**
   * Pontua as mudanças com base em vários fatores
   */
  scoreChanges(changes: ClassifiedChange[]): ScoredChange[] {
    console.log('Pontuando mudanças por relevância...');
    
    return changes.map(change => this.scoreChange(change));
  }
  
  /**
   * Pontua uma mudança individual
   */
  private scoreChange(change: ClassifiedChange): ScoredChange {
    const scoreFactors: { name: string; value: number; weight: number }[] = [];
    let totalScore = 0;
    
    // Fator: Breaking change
    if (change.breaking) {
      const value = 10;
      totalScore += value * this.weights.breakingChange;
      scoreFactors.push({
        name: 'breakingChange',
        value,
        weight: this.weights.breakingChange
      });
    }
    
    // Fator: Escopo da API
    if (change.scope === 'public') {
      const value = 8;
      totalScore += value * this.weights.publicAPI;
      scoreFactors.push({
        name: 'publicAPI',
        value,
        weight: this.weights.publicAPI
      });
    }
    
    // Fator: Adição de funcionalidade
    if (change.commitType === 'feat') {
      const value = 6;
      totalScore += value * this.weights.featureAddition;
      scoreFactors.push({
        name: 'featureAddition',
        value,
        weight: this.weights.featureAddition
      });
    }
    
    // Fator: Correção de bug
    if (change.commitType === 'fix') {
      const value = 5;
      totalScore += value * this.weights.bugFix;
      scoreFactors.push({
        name: 'bugFix',
        value,
        weight: this.weights.bugFix
      });
    }
    
    // Fator: Tamanho do arquivo (usando linhas adicionadas + removidas como proxy)
    const fileSize = change.metadata.linesAdded + change.metadata.linesRemoved;
    if (fileSize > 0) {
      const value = Math.min(fileSize, 1000); // Limitar para não distorcer a pontuação
      totalScore += value * this.weights.fileSize;
      scoreFactors.push({
        name: 'fileSize',
        value,
        weight: this.weights.fileSize
      });
    }
    
    // Fator: Impacto semântico (baseado no número e severidade das mudanças semânticas)
    const semanticImpact = this.calculateSemanticImpact(change);
    if (semanticImpact > 0) {
      totalScore += semanticImpact * this.weights.semanticImpact;
      scoreFactors.push({
        name: 'semanticImpact',
        value: semanticImpact,
        weight: this.weights.semanticImpact
      });
    }
    
    // Fator: Tipo de arquivo
    const fileTypeWeight = this.getFileTypeWeight(change);
    totalScore *= fileTypeWeight;
    scoreFactors.push({
      name: 'fileType',
      value: 1, // Multiplicador
      weight: fileTypeWeight
    });
    
    // Fator: Tipo de mudança
    const changeTypeWeight = this.weights.changeType[change.type] || 1;
    totalScore *= changeTypeWeight;
    scoreFactors.push({
      name: 'changeType',
      value: 1, // Multiplicador
      weight: changeTypeWeight
    });
    
    // Normalizar a pontuação entre 0-10
    const normalizedScore = Math.min(Math.max(totalScore / 10, 0), 10);
    
    return {
      ...change,
      score: normalizedScore,
      scoreFactors
    };
  }
  
  /**
   * Calcula o impacto semântico das alterações
   */
  private calculateSemanticImpact(change: ClassifiedChange): number {
    let impact = 0;
    
    // Somar pontos com base nos tipos de mudanças semânticas
    for (const delta of change.semanticChanges) {
      switch (delta.type) {
        case SemanticChangeType.METHOD_REMOVED:
        case SemanticChangeType.PARAMETER_REMOVED:
        case SemanticChangeType.RETURN_TYPE_CHANGED:
          impact += 10; // Alto impacto
          break;
          
        case SemanticChangeType.INTERFACE_CHANGED:
        case SemanticChangeType.ACCESS_MODIFIER_CHANGED:
          impact += 7; // Impacto médio-alto
          break;
          
        case SemanticChangeType.METHOD_ADDED:
        case SemanticChangeType.PARAMETER_ADDED:
          impact += 5; // Impacto médio
          break;
          
        case SemanticChangeType.TYPE_CHANGED:
        case SemanticChangeType.DEPENDENCY_ADDED:
        case SemanticChangeType.DEPENDENCY_REMOVED:
          impact += 4; // Impacto médio-baixo
          break;
          
        case SemanticChangeType.IMPLEMENTATION_CHANGED:
          impact += 2; // Impacto baixo
          break;
      }
    }
    
    // Considerar a severidade da mudança
    const highSeverityCount = change.semanticChanges.filter(delta => 
      delta.severity === 'breaking' || delta.severity === 'high'
    ).length;
    
    impact += highSeverityCount * 3;
    
    // Limitar impacto máximo
    return Math.min(impact, 20);
  }
  
  /**
   * Obtém o peso para o tipo de arquivo
   */
  private getFileTypeWeight(change: ClassifiedChange): number {
    const fileType = change.metadata.fileType;
    
    if (!fileType) {
      return 1;
    }
    
    switch (fileType) {
      case 'script':
        return this.weights.fileType.script;
      case 'test':
        return this.weights.fileType.test;
      case 'config':
        return this.weights.fileType.config;
      case 'doc':
        return this.weights.fileType.doc;
      default:
        return 1;
    }
  }
}
