import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

function ToastItem({ toast, onClose }) {
  const icon = toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ';

  return (
    <div className={`toast ${toast.type}`}>
      <span className="toast-icon">{icon}</span>
      <div className="toast-message">{toast.message}</div>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}

function ConfirmToast({ message, onConfirm, onCancel }) {
  return (
    <div className="toast confirm-toast">
      <div className="toast-message">{message}</div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button className="toast-btn yes" onClick={onConfirm}>Yes, Delete</button>
        <button className="toast-btn no" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const idRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, type = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  const success = useCallback((msg) => show(msg, 'success'), [show]);
  const error = useCallback((msg) => show(msg, 'error'), [show]);
  const info = useCallback((msg) => show(msg, 'info'), [show]);

  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirm({ message, resolve });
    });
  }, []);

  const handleConfirm = useCallback((result) => {
    if (confirm) {
      confirm.resolve(result);
      setConfirm(null);
    }
  }, [confirm]);

  return (
    <ToastContext.Provider value={{ show, success, error, info, showConfirm }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
        {confirm && (
          <ConfirmToast
            message={confirm.message}
            onConfirm={() => handleConfirm(true)}
            onCancel={() => handleConfirm(false)}
          />
        )}
      </div>
    </ToastContext.Provider>
  );
}
