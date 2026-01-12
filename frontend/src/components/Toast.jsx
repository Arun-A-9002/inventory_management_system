import { useState, useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, type = 'success', isVisible, onClose }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, type === 'error' ? 5000 : 3000); // Show error messages longer
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, type]);

  if (!isVisible) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500',
          icon: '✓',
          border: 'border-green-600'
        };
      case 'error':
        return {
          bg: 'bg-red-500',
          icon: '✕',
          border: 'border-red-600'
        };
      case 'info':
        return {
          bg: 'bg-blue-500',
          icon: 'ℹ',
          border: 'border-blue-600'
        };
      default:
        return {
          bg: 'bg-gray-500',
          icon: '•',
          border: 'border-gray-600'
        };
    }
  };

  const styles = getToastStyles();
  
  // Ensure message is always a string
  const displayMessage = typeof message === 'string' ? message : JSON.stringify(message);

  return (
    <div className={`fixed top-4 right-4 ${styles.bg} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-slide-in border-l-4 ${styles.border} max-w-md`}>
      <span className="text-lg font-bold">{styles.icon}</span>
      <span className="flex-1 text-sm">{displayMessage}</span>
      <button 
        onClick={onClose} 
        className="ml-2 text-white hover:text-gray-200 font-bold text-lg leading-none"
        title="Close notification"
      >
        ✕
      </button>
    </div>
  );
}