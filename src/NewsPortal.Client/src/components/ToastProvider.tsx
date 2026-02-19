import { Toaster } from 'react-hot-toast';

const ToastProvider = () => {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                duration: 3000,
                style: {
                    background: 'rgba(17, 24, 39, 0.95)',
                    color: '#fff',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                    fontSize: '14px',
                    padding: '12px 16px',
                },
                success: {
                    iconTheme: {
                        primary: '#10b981',
                        secondary: '#fff',
                    },
                    style: {
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                    },
                    style: {
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                    },
                },
                loading: {
                    iconTheme: {
                        primary: '#8b5cf6',
                        secondary: '#fff',
                    },
                },
            }}
        />
    );
};

export default ToastProvider;
