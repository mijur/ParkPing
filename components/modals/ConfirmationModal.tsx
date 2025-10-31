import React from 'react';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmButtonText?: string;
  confirmButtonVariant?: 'primary' | 'destructive';
}

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(25, 22, 61, 0.6)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
    backgroundColor: '#23213D',
    padding: '24px',
    borderRadius: '16px',
    width: '350px',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.1)',
};

const buttonBaseStyle: React.CSSProperties = {
  padding: '10px 16px',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 500,
  fontFamily: "'Poppins', 'Source Serif Pro', sans-serif",
  fontSize: '14px',
};

const secondaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    border: '1px solid white',
    backgroundColor: 'transparent',
    color: 'white',
    marginRight: '10px'
};

const destructiveButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: '#FFB8B8',
    color: '#5A1D1D',
    fontWeight: 700
};

const primaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: 'white',
    color: '#5A48E5',
};


const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    title, 
    message, 
    onConfirm, 
    onClose,
    confirmButtonText = 'Confirm',
    confirmButtonVariant = 'primary'
}) => {

  const confirmStyle = confirmButtonVariant === 'destructive' ? destructiveButtonStyle : primaryButtonStyle;

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
        <h2 style={{marginTop: 0, fontWeight: 700}}>{title}</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6, margin: '16px 0 0 0' }}>{message}</p>
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
          <button onClick={onConfirm} style={confirmStyle}>{confirmButtonText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
