import React from 'react';
import './ui.scss';

interface DrawerProps {
  open: boolean;
  title?: React.ReactNode;
  onClose: () => void;
  placement?: 'left' | 'right';
  width?: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ open, title, onClose, placement = 'left', width = 'min(520px, 100%)', children }) => {
  if (!open) return null;

  return (
    <div className="ui-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className={`ui-drawer ${placement}`}
        style={{ width }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ui-drawer-header">
          <div className="ui-drawer-title">{title}</div>
          <button type="button" className="ui-drawer-close" onClick={onClose} aria-label="Close drawer">
            ×
          </button>
        </div>
        <div className="ui-drawer-body">{children}</div>
      </div>
    </div>
  );
};
