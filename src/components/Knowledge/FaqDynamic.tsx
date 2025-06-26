
import React, { useEffect, useState } from 'react';
import { faqService } from '../../services/faqService';
import { userService } from '../../services/userService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// FAQ dynamique, pro, éditable
const FaqDynamic: React.FC = () => {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string|null>(null);
  const [editData, setEditData] = useState<{question: string, answer: string, images: string[]}>({question: '', answer: '', images: []});
  const [showAdd, setShowAdd] = useState(false);
  const [userRole, setUserRole] = useState<'client' | 'agent' | 'admin' | null>(null);

  useEffect(() => {
    loadFaqs();
    userService.getCurrentUserProfile().then(u => setUserRole(u?.role || 'client')).catch(() => setUserRole('client'));
  }, []);

  useEffect(() => {
    loadFaqs();
  }, []);

  async function loadFaqs() {
    setFaqs(await faqService.getAll());
  }

  function filterFaqs() {
    return faqs.filter(faq =>
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase())
    );
  }

  function extractImages(answer: string): string[] {
    // Détecte les URLs d'images dans la réponse
    const regex = /(https?:\/\/.+?\.(?:png|jpg|jpeg|gif|webp))/gi;
    return Array.from(answer.matchAll(regex), m => m[1]);
  }

  async function handleSave() {
    if (editing) {
      await faqService.update(editing, editData);
    } else {
      await faqService.add({ ...editData, images: extractImages(editData.answer) as any });
    }
    setShowAdd(false); setEditing(null); setEditData({question: '', answer: '', images: []});
    loadFaqs();
  }

  async function handleDelete(id: string) {
    await faqService.remove(id); loadFaqs();
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-1">Foire Aux Questions</h1>
          <p className="text-gray-500 text-lg">Retrouvez ici toutes les réponses aux questions fréquentes sur le support et la plateforme.</p>
        </div>
        <div className="flex gap-2 items-center">
          <input className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64" placeholder="Rechercher une question..." value={search} onChange={e => setSearch(e.target.value)} />
          {userRole !== 'client' && (
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow" onClick={() => { setShowAdd(true); setEditing(null); setEditData({question: '', answer: '', images: []}); }}>Ajouter</button>
          )}
        </div>
      </div>
      <div className="divide-y divide-gray-200 rounded-xl bg-white shadow-md">
        {filterFaqs().length === 0 && (
          <div className="p-8 text-center text-gray-400">Aucune question trouvée.</div>
        )}
        {filterFaqs().map(faq => (
          <details key={faq.id} className="group p-6 cursor-pointer transition hover:bg-gray-50">
            <summary className="flex justify-between items-center text-lg font-semibold text-gray-800 group-open:text-blue-700">
              {faq.question}
              <span className="ml-2 text-blue-600 group-open:rotate-90 transition-transform">›</span>
            </summary>
            <div className="mt-4 prose max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{faq.answer}</ReactMarkdown>
            </div>
            {faq.images && faq.images.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {faq.images.map((img: string, i: number) => (
                  <img key={i} src={img} alt="FAQ illustration" className="h-28 rounded border shadow" />
                ))}
              </div>
            )}
            {userRole !== 'client' && (
              <div className="flex gap-2 mt-4">
                <button className="text-blue-600 hover:underline" onClick={() => { setEditing(faq.id); setEditData(faq); setShowAdd(true); }}>Éditer</button>
                <button className="text-red-600 hover:underline" onClick={() => handleDelete(faq.id)}>Supprimer</button>
              </div>
            )}
          </details>
        ))}
      </div>
      {showAdd && userRole !== 'client' && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">{editing ? 'Éditer' : 'Ajouter'} une question</h2>
            <input className="border border-gray-300 rounded-lg px-3 py-2 w-full mb-3" placeholder="Question" value={editData.question} onChange={e => setEditData(d => ({...d, question: e.target.value}))} />
            <textarea className="border border-gray-300 rounded-lg px-3 py-2 w-full mb-3" placeholder="Réponse (Markdown supporté)" rows={5} value={editData.answer} onChange={e => setEditData(d => ({...d, answer: e.target.value}))} />
            <div className="flex gap-2 mb-3 flex-wrap">
              {extractImages(editData.answer).map((img, i) => (
                <img key={i} src={img} alt="Preview" className="h-16 rounded border" />
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 rounded bg-gray-200" onClick={() => { setShowAdd(false); setEditing(null); }}>Annuler</button>
              <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={handleSave}>{editing ? 'Enregistrer' : 'Ajouter'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaqDynamic;
