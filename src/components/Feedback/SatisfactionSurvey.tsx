import React, { useState, useEffect } from 'react';
import { Star, Send, CheckCircle, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface SatisfactionSurveyProps {
  ticketId: string;
  onClose: () => void;
  onSubmit?: () => void;
}

const SatisfactionSurvey: React.FC<SatisfactionSurveyProps> = ({ ticketId, onClose, onSubmit }) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketInfo, setTicketInfo] = useState<any>(null);

  useEffect(() => {
    fetchTicketInfo();
  }, [ticketId]);

  const fetchTicketInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('title, satisfaction_rating')
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      
      setTicketInfo(data);
      
      // Si une évaluation existe déjà, l'utiliser
      if (data.satisfaction_rating) {
        setRating(data.satisfaction_rating);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des informations du ticket:', err);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Veuillez sélectionner une note');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('tickets')
        .update({
          satisfaction_rating: rating,
          satisfaction_comment: comment.trim() || null
        })
        .eq('id', ticketId);

      if (error) throw error;

      setSuccess(true);
      
      // Créer une notification pour les agents
      try {
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: ticketInfo?.agent_id,
              title: 'Nouvelle évaluation de satisfaction',
              message: `Le ticket "${ticketInfo?.title}" a reçu une évaluation de ${rating}/5`,
              type: rating >= 4 ? 'success' : rating >= 3 ? 'info' : 'warning',
              action_url: `/tickets/${ticketId}`
            }
          ]);
      } catch (notifError) {
        console.error('Erreur lors de la création de la notification:', notifError);
      }

      if (onSubmit) {
        setTimeout(() => {
          onSubmit();
        }, 2000);
      }
    } catch (err) {
      console.error('Erreur lors de la soumission de l\'évaluation:', err);
      setError('Une erreur est survenue lors de la soumission de votre évaluation');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return Array(5).fill(0).map((_, index) => {
      const starValue = index + 1;
      return (
        <button
          key={index}
          type="button"
          onClick={() => setRating(starValue)}
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
          className="focus:outline-none"
          disabled={loading || success}
        >
          <Star
            className={`w-8 h-8 ${
              (hoveredRating ? starValue <= hoveredRating : starValue <= rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            } transition-colors`}
          />
        </button>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-xl font-bold text-gray-900">Évaluation de satisfaction</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Merci pour votre évaluation !</h3>
              <p className="text-gray-600 mb-6">
                Votre feedback est précieux et nous aide à améliorer notre service.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Comment évalueriez-vous notre service ?</h3>
                <p className="text-gray-600 mb-4">
                  Votre feedback nous aide à améliorer notre support technique.
                </p>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {renderStars()}
                </div>
                <div className="text-center text-sm text-gray-500">
                  {rating === 0 ? 'Sélectionnez une note' : 
                   rating === 1 ? 'Très insatisfait' :
                   rating === 2 ? 'Insatisfait' :
                   rating === 3 ? 'Neutre' :
                   rating === 4 ? 'Satisfait' :
                   'Très satisfait'}
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaires (optionnel)
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Partagez votre expérience ou vos suggestions..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || rating === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Envoyer</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SatisfactionSurvey;