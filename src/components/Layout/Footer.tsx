import React from 'react';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className={`bg-white border-t border-gray-200 py-3 flex-shrink-0 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="footer-content flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          {/* Logo et copyright */}
          <div className="flex items-center space-x-4">
            <div className="text-xs text-gray-600">
              © {currentYear} <strong>Geneva Institute of Technology</strong>
            </div>
          </div>          {/* Liens légaux */}
          <div className="footer-links flex items-center space-x-4 text-xs">
            <a 
              href="/privacy-policy.html" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-600 transition-colors whitespace-nowrap"
            >
              Politique de Confidentialité
            </a>
            <a 
              href="/terms-of-service.html" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-600 transition-colors whitespace-nowrap"
            >
              Conditions d'Utilisation
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
