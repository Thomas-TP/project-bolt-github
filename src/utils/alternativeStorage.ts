// Solution alternative de stockage sans dépendre des buckets Supabase
// Utilise le stockage en base64 dans la base de données comme fallback

import { supabase } from './supabase';

export interface FileData {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  data: string; // Base64
  url?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export const alternativeStorage = {
  // Convertir un fichier en base64
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Enlever le préfixe data:type;base64,
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Créer une URL blob à partir du base64
  base64ToBlob(base64: string, type: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  },

  // Créer une URL temporaire pour téléchargement
  createDownloadUrl(base64: string, type: string): string {
    const blob = this.base64ToBlob(base64, type);
    return URL.createObjectURL(blob);
  },

  // Sauvegarder un fichier en base de données
  async saveFile(file: File, category: 'ticket' | 'message', relatedId: string): Promise<FileData> {
    try {
      console.log('💾 === SAUVEGARDE FICHIER ALTERNATIVE ===');
      console.log(`📁 Catégorie: ${category}`);
      console.log(`📄 Fichier: ${file.name} (${this.formatFileSize(file.size)})`);
      console.log(`🔗 ID lié: ${relatedId}`);

      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Vérifier la taille (max 5MB pour le stockage en base)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(`Fichier trop volumineux: ${this.formatFileSize(file.size)} (max 5MB)`);
      }

      // Convertir en base64
      console.log('🔄 Conversion en base64...');
      const base64Data = await this.fileToBase64(file);
      console.log(`✅ Conversion réussie: ${base64Data.length} caractères`);

      // Créer l'enregistrement avec les noms de colonnes corrects
      const fileRecord = {
        name: `${category}_${relatedId}_${Date.now()}_${file.name}`,
        originalName: file.name, // Utiliser le bon nom de colonne
        size: file.size,
        type: file.type,
        data: base64Data,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.id
      };

      console.log('💾 Tentative sauvegarde en base...');

      // Sauvegarder dans la table file_storage
      const { data, error } = await supabase
        .from('file_storage')
        .insert(fileRecord)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur sauvegarde:', error);
        throw new Error(`Erreur sauvegarde: ${error.message}`);
      }

      console.log('✅ Fichier sauvegardé avec succès:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Erreur sauvegarde fichier:', error);
      throw error;
    }
  },

  // Récupérer un fichier par ID
  async getFile(fileId: string): Promise<FileData | null> {
    try {
      const { data, error } = await supabase
        .from('file_storage')
        .select('*')
        .eq('id', fileId)
        .single();

      if (error) {
        console.error('❌ Erreur récupération fichier:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Erreur récupération fichier:', error);
      return null;
    }
  },

  // Récupérer tous les fichiers liés à un ticket/message
  async getFilesByRelatedId(relatedId: string, category?: 'ticket' | 'message'): Promise<FileData[]> {
    try {
      let query = supabase
        .from('file_storage')
        .select('*')
        .like('name', `%${relatedId}%`)
        .order('uploadedAt', { ascending: false });

      if (category) {
        query = query.like('name', `${category}_%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erreur récupération fichiers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération fichiers:', error);
      return [];
    }
  },

  // Télécharger un fichier
  async downloadFile(fileData: FileData): Promise<void> {
    try {
      console.log('📥 Téléchargement fichier:', fileData.originalName);
      
      const url = this.createDownloadUrl(fileData.data, fileData.type);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Nettoyer l'URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      console.log('✅ Téléchargement initié');
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
      throw error;
    }
  },

  // Supprimer un fichier
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('file_storage')
        .delete()
        .eq('id', fileId);

      if (error) {
        console.error('❌ Erreur suppression fichier:', error);
        return false;
      }

      console.log('✅ Fichier supprimé:', fileId);
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression fichier:', error);
      return false;
    }
  },

  // Formater la taille des fichiers
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Vérifier si le stockage alternatif est disponible
  async isAvailable(): Promise<boolean> {
    try {
      // Tester l'accès à la table file_storage
      const { error } = await supabase
        .from('file_storage')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('❌ Stockage alternatif non disponible:', error);
      return false;
    }
  }
};