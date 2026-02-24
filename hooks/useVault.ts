
import { useContext } from 'react';
import { VaultContext, VaultContextType } from '../context/VaultContext';

export const useVault = (): VaultContextType => {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
