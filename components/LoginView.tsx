import React, { useState } from 'react';

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  onSignUp: (email: string, password: string, name: string) => Promise<{ success: boolean; message: string }>;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '40px 20px',
};

const formWrapperStyle: React.CSSProperties = {
  backgroundColor: 'rgba(0, 0, 0, 0.15)',
  padding: '40px',
  borderRadius: '24px',
  width: '100%',
  maxWidth: '400px',
  color: 'white',
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
  fontWeight: 500,
  textAlign: 'left',
};

const inputStyle: React.CSSProperties = {
  padding: '12px',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  color: 'white',
  border: '1px solid rgba(255, 255, 255, 0.5)',
  borderRadius: '8px',
  fontFamily: "'Poppins', 'Source Serif Pro', sans-serif",
  fontSize: '16px',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  backgroundColor: 'white',
  color: '#5A48E5',
  fontWeight: 700,
  fontFamily: "'Poppins', 'Source Serif Pro', sans-serif",
  fontSize: '16px',
  width: '100%',
};

const toggleTextStyle: React.CSSProperties = {
  marginTop: '20px',
  textAlign: 'center',
  fontSize: '14px',
  color: 'rgba(255, 255, 255, 0.8)',
};

const toggleLinkStyle: React.CSSProperties = {
  color: 'white',
  fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'underline',
};

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onSignUp }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let result;
    if (isSignUp) {
      result = await onSignUp(email, password, name);
    } else {
      result = await onLogin(email, password);
    }

    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={formWrapperStyle}>
        <h2 style={{ textAlign: 'center', marginTop: 0, fontWeight: 700, fontSize: '28px' }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div style={inputGroupStyle}>
              <label htmlFor="name" style={labelStyle}>Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          )}
          <div style={inputGroupStyle}>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <div style={inputGroupStyle}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {error && <p style={{ color: '#FFB8B8', margin: '0 0 20px 0', textAlign: 'center' }}>{error}</p>}

          <button type="submit" style={primaryButtonStyle}>
            {isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>
        <p style={toggleTextStyle}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <span style={toggleLinkStyle} onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
            {isSignUp ? 'Login' : 'Sign Up'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoginView;
