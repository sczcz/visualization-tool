import React from 'react';
import ActionButton from './ActionButton';
import toast from 'react-hot-toast';

interface HeaderProps {
  className?: string;
  activeMode: 'manual' | 'auto' | 'target';
  onModeChange: (mode: 'manual' | 'auto' | 'target') => void;
  onSave: () => void;
  
}

const Header: React.FC<HeaderProps> = ({
  className = '',
  activeMode,
  onModeChange,
  onSave,

  
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
            tooltip='Save current matching to file'
            tooltipId='save-tooltip'
          >
            Save
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
            tooltip='Manual mode: click to add points on the canvas'
            tooltipId='manual-mode-tooltip'
          >
            Manual
          </ActionButton>
          <ActionButton
            variant={activeMode === 'auto' ? 'primary' : 'ghost'}
            size="md"
            onClick={() => onModeChange('auto')}
            className="w-full"
            tooltip='Auto mode: generate matchings automatically based on number of points'
            tooltipId='auto-mode-tooltip'
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