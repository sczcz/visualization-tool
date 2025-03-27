import React from 'react';
import ActionButton from './ActionButton';
import toast from 'react-hot-toast';

interface HeaderProps {
  className?: string;
  activeMode: 'manual' | 'auto' | 'target';
  onModeChange: (mode: 'manual' | 'auto' | 'target') => void;
  onClear: () => void;
  onUndo: () => void;
  onSave: () => void;
  onLoadCanonical: () => void;
  onGenerateAllMatchings: () => void;
  onEdit: () => void;
  canUndo: boolean;
}

const Header: React.FC<HeaderProps> = ({
  className = '',
  activeMode,
  onModeChange,
  onClear,
  onUndo,
  onSave,
  onLoadCanonical,
  onGenerateAllMatchings,
  onEdit,
  canUndo
  
}) => {
  // Combine classes manually
  const headerClasses = [" p-4 w-full", className].filter(Boolean).join(' ');

  return (
    <header className={headerClasses}>
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Matching Magic</h1>
        <div className="flex gap-2">
          <ActionButton 
            variant="outline" 
            size="sm"
            onClick={onSave}
          >
            Save
          </ActionButton>
          <ActionButton 
            variant="outline" 
            size="sm"
            onClick={onClear}
          >
            Clear
          </ActionButton>
          <ActionButton 
            variant="outline" 
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className={!canUndo ? "opacity-50" : ""}
          >
            Undo
          </ActionButton>
          <ActionButton 
            variant="outline" 
            size="sm"
            onClick={onLoadCanonical}
          >
            Canonical
          </ActionButton>
          <ActionButton 
            variant="outline" 
            size="sm"
            onClick={() => {
                toast(
                  "To ensure acceptable performance, the maximum number of matchings have been capped at 5000.",
                  {
                  duration: 5000,
                  position: "top-center",
                  style: {
                    backgroundColor: "yellow",
                  },
                  }
                );
              

              onGenerateAllMatchings();
            }}
          >
            Generate All Matchings
          </ActionButton>
          <ActionButton 
            variant="outline" 
            size="sm"
            onClick={onEdit}
          >
            Edit
          </ActionButton>
          
        </div>
      </div>
      
      <div className="flex bg-gray-100 rounded p-1">
        <div className="grid grid-cols-3 w-full gap-1">
          <ActionButton
            variant={activeMode === 'manual' ? 'primary' : 'ghost'}
            size="md"
            onClick={() => onModeChange('manual')}
            className="w-full"
          >
            Manual
          </ActionButton>
          <ActionButton
            variant={activeMode === 'auto' ? 'primary' : 'ghost'}
            size="md"
            onClick={() => onModeChange('auto')}
            className="w-full"
          >
            Auto
          </ActionButton>
          <ActionButton
            variant={activeMode === 'target' ? 'primary' : 'ghost'}
            size="md"
            onClick={() => onModeChange('target')}
            className="w-full"
          >
            Target [NOT IMPLEMENTED]
          </ActionButton>
        </div>
      </div>
    </header>
  );
};

export default Header;