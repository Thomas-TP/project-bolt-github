import React from 'react';
import FaqDynamic from '../components/Knowledge/FaqDynamic';

const FaqPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-10 px-4">
        <FaqDynamic />
      </div>
    </div>
  );
};

export default FaqPage;
