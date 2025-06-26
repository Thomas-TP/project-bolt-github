const GEMINI_API_KEY = 'AIzaSyCSluXNA1jSYrPk2bWVnUngECuUUFbzru4';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

export const geminiService = {
  generateResponse: async (prompt: string): Promise<string> => {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Tu es un assistant IA spécialisé dans le support technique. Réponds en français de manière professionnelle et utile. Question: ${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || 'Désolé, je n\'ai pas pu générer une réponse.';
    } catch (error) {
      console.error('Erreur Gemini API:', error);
      return 'Désolé, le service d\'IA est temporairement indisponible.';
    }
  },

  analyzeConversation: async (conversation: string): Promise<any> => {
    try {
      const prompt = `
      Tu es un expert en analyse de conversations de support technique. Analyse cette conversation entre un utilisateur et un agent de support:
      
      ${conversation}
      
      Extrais les informations suivantes au format JSON:
      {
        "title": "Titre concis du problème (max 100 caractères)",
        "description": "Description détaillée du problème",
        "category": "Catégorie appropriée (Technique, Réseau, Logiciel, Matériel, Accès, Formation, ou Autre)",
        "priority": "Priorité (faible, normale, elevee, urgente)",
        "tags": ["tag1", "tag2", "tag3"],
        "suggestedSolutions": ["Solution potentielle 1", "Solution potentielle 2"]
      }
      
      Assure-toi que:
      - Le titre est clair et concis
      - La description est complète et inclut tous les détails importants
      - La catégorie est appropriée au problème
      - La priorité reflète l'urgence et l'impact du problème
      - Les tags sont pertinents pour faciliter la recherche
      - Les solutions suggérées sont basées sur les informations disponibles
      
      Réponds UNIQUEMENT avec le JSON, sans texte supplémentaire.`;

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      const jsonResponse = data.candidates[0]?.content?.parts[0]?.text || '{}';
      
      // Extract JSON from response (in case there's any text before or after)
      const jsonMatch = jsonResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : '{}';
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Erreur lors de l\'analyse de la conversation:', error);
      throw error;
    }
  }
};