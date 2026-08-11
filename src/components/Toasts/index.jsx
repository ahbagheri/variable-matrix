import { createContext, useCallback, useContext, useRef, useState } from 'react';
import MessageBar from '../ui/MessageBar.jsx';

const ToastContext = createContext(() => {});

// Success/info banners auto-clear; error/warning persist until dismissed.
const AUTO_DISMISS = { success: 4000, info: 4000 };

function toSeverity(type) {
  if (type === 'error') return 'error';
  if (type === 'warning') return 'warning';
  if (type === 'success') return 'success';
  return 'info';
}

export function ToastProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setMessages((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  // Keeps the toast(message, type, duration) API; renders Azure DevOps message bars.
  const toast = useCallback((message, type = 'info', duration) => {
    const severity = toSeverity(type);
    const id = Date.now() + Math.random();
    setMessages((current) => [...current, { id, message, severity }]);
    const auto = duration ?? AUTO_DISMISS[severity];
    if (auto) {
      const timer = setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== id));
        timers.current.delete(id);
      }, auto);
      timers.current.set(id, timer);
    }
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      <div className="vm-banner-area">
        {messages.map((item) => (
          <MessageBar key={item.id} severity={item.severity} onDismiss={() => dismiss(item.id)}>
            {item.message}
          </MessageBar>
        ))}
      </div>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

