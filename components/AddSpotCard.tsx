import React from 'react';

interface AddSpotCardProps {
  onAddSpot: () => void;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'rgba(0, 0, 0, 0.15)',
  borderRadius: '16px',
  padding: '20px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  minHeight: '200px',
  transition: 'background-color 0.3s',
};

const plusStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0,
    fontWeight: 700,
    fontSize: '72px',
    lineHeight: 1,
    userSelect: 'none',
};

const AddSpotCard: React.FC<AddSpotCardProps> = ({ onAddSpot }) => {
  const [hover, setHover] = React.useState(false);
  const hoverStyle = hover ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : {};

  return (
    <div 
      style={{ ...cardStyle, ...hoverStyle }} 
      onClick={onAddSpot}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <h2 style={plusStyle}>+</h2>
    </div>
  );
};

export default AddSpotCard;