// Service de stockage optimisé utilisant uniquement la base de données
import { alternativeStorage, FileData } from './alternativeStorage';
import { maliceScanner } from './maliceScanner';

export interface HybridFileResult {
  success: boolean;
  data?: {
    id?: string;
    fileData?: FileData;
  };
  error?: string;
  method: 'database' | 'failed';
}

export const hybridStorage = {
  // Upload optimisé en base de données uniquement
  async uploadFile(
    bucket: string, 
    file: File, 
    path: string, 
    relatedId: string,
    category: 'ticket' | 'message'
  ): Promise<HybridFileResult> {
    console.log('💾 === UPLOAD BASE DE DONNÉES ===');
    console.log(`📁 Fichier: ${file.name} (${this.formatFileSize(file.size)})`);
    console.log(`📦 Catégorie: ${category}`);
    console.log(`🔗 ID lié: ${relatedId}`);

    try {
      // Vérifier si le stockage en base est disponible
      const isAvailable = await alternativeStorage.isAvailable();
      if (!isAvailable) {
        throw new Error('Stockage en base de données non disponible');
      }

      // Vérification de sécurité basique du fichier
      const safetyCheck = maliceScanner.isFileSafe(file);
      if (!safetyCheck.safe) {
        throw new Error(`Fichier non sécurisé: ${safetyCheck.reason}`);
      }

      // Scanner le fichier pour détecter les malwares
      console.log('🔍 Analyse antivirus en cours...');
      const scanResult = await maliceScanner.scanFile(file);
      
      if (!scanResult.success) {
        throw new Error(`Échec de l'analyse antivirus: ${scanResult.error}`);
      }
      
      if (!scanResult.clean) {
        throw new Error(`Fichier potentiellement malveillant détecté: ${scanResult.threats.join(', ')}`);
      }
      
      console.log('✅ Analyse antivirus terminée: Fichier sécurisé');

      // Sauvegarder directement en base
      const fileData = await alternativeStorage.saveFile(file, category, relatedId);
      
      console.log('✅ Succès stockage en base !');
      return {
        success: true,
        data: {
          id: fileData.id,
          fileData: fileData
        },
        method: 'database'
      };
    } catch (error) {
      console.error('❌ Échec stockage en base:', error);
      return {
        success: false,
        error: error.message || 'Impossible de sauvegarder le fichier',
        method: 'failed'
      };
    }
  },

  // Télécharger un fichier depuis la base
  async downloadFile(fileInfo: any): Promise<boolean> {
    try {
      console.log('📥 Téléchargement depuis la base:', fileInfo);

      // Si c'est un fichier en base (a un ID)
      if (fileInfo.id || fileInfo.fileData) {
        console.log('📥 Téléchargement depuis la base...');
        let fileData = fileInfo.fileData;
        
        if (!fileData && fileInfo.id) {
          fileData = await alternativeStorage.getFile(fileInfo.id);
        }
        
        if (fileData) {
          await alternativeStorage.downloadFile(fileData);
          return true;
        }
      }

      throw new Error('Fichier non trouvé en base de données');
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
      return false;
    }
  },

  // Récupérer tous les fichiers d'un ticket/message
  async getFiles(relatedId: string, category: 'ticket' | 'message'): Promise<any[]> {
    try {
      console.log(`📁 Récupération fichiers base pour ${category}:`, relatedId);
      
      const dbFiles = await alternativeStorage.getFilesByRelatedId(relatedId, category);
      const formattedDbFiles = dbFiles.map(file => ({
        id: file.id,
        name: file.name,
        originalName: file.originalName,
        size: file.size,
        type: file.type,
        fileData: file,
        method: 'database'
      }));
      
      console.log(`✅ Trouvé ${formattedDbFiles.length} fichiers en base`);
      return formattedDbFiles;
    } catch (error) {
      console.log('❌ Erreur récupération base:', error);
      return [];
    }
  },

  // Diagnostic simplifié du système de stockage
  async diagnoseStorage(): Promise<{
    supabaseAvailable: boolean;
    databaseAvailable: boolean;
    recommendation: string;
  }> {
    console.log('🔍 === DIAGNOSTIC STOCKAGE BASE DE DONNÉES ===');

    // Test stockage en base uniquement
    let databaseAvailable = false;
    try {
      databaseAvailable = await alternativeStorage.isAvailable();
      console.log(`💾 Stockage base: ${databaseAvailable ? '✅ OK' : '❌ KO'}`);
    } catch (error) {
      console.log('💾 Stockage base: ❌ Exception');
    }

    // Recommandation
    let recommendation = '';
    if (databaseAvailable) {
      recommendation = 'Stockage en base de données prêt - Fichiers jusqu\'à 5MB supportés';
    } else {
      recommendation = 'Stockage en base de données non disponible - Contactez l\'administrateur';
    }

    console.log(`💡 Recommandation: ${recommendation}`);

    return {
      supabaseAvailable: false, // On n'utilise plus Supabase Storage
      databaseAvailable,
      recommendation
    };
  },

  // Utilitaire pour formater la taille des fichiers
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};