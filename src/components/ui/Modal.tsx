import React from 'react';
import './ui.scss';

interface ModalProps {
  open: boolean;
  title?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  width?: string;
  destroyOnClose?: boolean;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, title, onClose, footer, width = 'min(720px, 100%)', children }) => {
  if (!open) return null;

  return (
    <div className="ui-modal-overlay" role="dialog" aria-modal="true">
      <div className="ui-modal" style={{ width }}>
        <div className="ui-modal-header">
          <div className="ui-modal-title">{title}</div>
          <button type="button" className="ui-modal-close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
