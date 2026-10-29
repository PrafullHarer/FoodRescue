import { createContext, useContext, useState, useCallback } from 'react';
import ReputationModal from '../components/reviews/ReputationModal';

const ReputationContext = createContext(null);

export function ReputationProvider({ children }) {
  const [activeUserId, setActiveUserId] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const openReputation = useCallback((userId) => {
    if (!userId) return;
    setActiveUserId(userId);
    setIsOpen(true);
  }, []);

  const closeReputation = useCallback(() => {
    setIsOpen(false);
    setActiveUserId(null);
  }, []);

  return (
    <ReputationContext.Provider value={{ openReputation, closeReputation, activeUserId, isOpen }}>
      {children}
      {isOpen && activeUserId && (
        <ReputationModal
          userId={activeUserId}
          isOpen={isOpen}
          onClose={closeReputation}
        />
      )}
    </ReputationContext.Provider>
  );
}

export function useReputation() {
  const context = useContext(ReputationContext);
  if (!context) {
    throw new Error('useReputation must be used within a ReputationProvider');
  }
  return context;
}
