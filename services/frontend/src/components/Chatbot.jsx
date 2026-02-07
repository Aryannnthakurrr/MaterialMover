import React, { useState, useEffect, useRef } from 'react';
import '../styles/chatbot.css';

const CHAT_API_BASE = '/chat';

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [showSettings, setShowSettings] = useState(false);
    const [connectionError, setConnectionError] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Start a new chat session
    const startSession = async () => {
        setLoading(true);
        setConnectionError(false);
        try {
            const res = await fetch(`${CHAT_API_BASE}/start`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setSessionId(data.session_id);
                setMessages([{ role: 'assistant', content: data.message }]);
                setProducts([]);
                setConnectionError(false);
            } else {
                console.error('Failed to start chat:', data);
                setConnectionError(true);
                setMessages([{ role: 'assistant', content: '⚠️ Could not connect to the advisor service. Please make sure the search service is running on port 8000.' }]);
            }
        } catch (err) {
            console.error('Error starting chat:', err);
            setConnectionError(true);
            setMessages([{ role: 'assistant', content: '⚠️ Could not connect to the advisor service. Please make sure the search service is running on port 8000.' }]);
        } finally {
            setLoading(false);
        }
    };

    // Open chat panel
    const handleOpen = () => {
        setIsOpen(true);
        if (!sessionId) {
            startSession();
        }
    };

    // Close chat panel
    const handleClose = () => {
        setIsOpen(false);
        setShowSettings(false);
    };

    // Send message
    const sendMessage = async () => {
        if (!input.trim() || !sessionId || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const res = await fetch(`${CHAT_API_BASE}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, message: userMessage }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
                if (data.products && data.products.length > 0) {
                    setProducts(data.products);
                }
            } else {
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
                ]);
            }
        } catch (err) {
            console.error('Error sending message:', err);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Connection error. Please try again.' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    // Handle Enter key
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Get chat history
    const getHistory = async () => {
        if (!sessionId) return;
        setLoading(true);
        setShowSettings(false);
        try {
            const res = await fetch(`${CHAT_API_BASE}/history/${sessionId}`);
            const data = await res.json();
            if (res.ok) {
                setMessages(data.messages || []);
                if (data.products) {
                    setProducts(data.products);
                }
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    };

    // Delete history (start fresh)
    const deleteHistory = async () => {
        if (!sessionId) return;
        setLoading(true);
        setShowSettings(false);
        try {
            await fetch(`${CHAT_API_BASE}/${sessionId}`, { method: 'DELETE' });
            setSessionId(null);
            setMessages([]);
            setProducts([]);
            // Start a new session
            await startSession();
        } catch (err) {
            console.error('Error deleting history:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <button className="chatbot-fab" onClick={handleOpen} aria-label="Open chat">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </button>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <div className="chatbot-container">
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-header-info">
                            <div className="chatbot-avatar">🤖</div>
                            <div>
                                <h4>Material Advisor</h4>
                                <span className="chatbot-status">Online</span>
                            </div>
                        </div>
                        <div className="chatbot-header-actions">
                            <button
                                className="chatbot-settings-btn"
                                onClick={() => setShowSettings(!showSettings)}
                                aria-label="Settings"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                            </button>
                            <button className="chatbot-close-btn" onClick={handleClose} aria-label="Close chat">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Settings Dropdown */}
                        {showSettings && (
                            <div className="chatbot-settings-dropdown">
                                <button onClick={getHistory} disabled={loading || !sessionId}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    History
                                </button>
                                <button onClick={deleteHistory} disabled={loading || !sessionId} className="delete-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    Delete History
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`chatbot-message ${msg.role}`}>
                                <div className="message-content">{msg.content}</div>
                            </div>
                        ))}
                        {loading && (
                            <div className="chatbot-message assistant">
                                <div className="message-content typing">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Product Recommendations */}
                    {products.length > 0 && (
                        <div className="chatbot-products">
                            <h5>Recommended Products</h5>
                            <div className="products-scroll">
                                {products.map((p) => (
                                    <div key={p._id || p.id} className="chatbot-product-card">
                                        {p.image && <img src={p.image} alt={p.title} />}
                                        <div className="product-info">
                                            <strong>{p.title}</strong>
                                            <span className="price">₹{p.price || 0}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="chatbot-input">
                        {connectionError ? (
                            <button className="retry-btn" onClick={startSession} disabled={loading}>
                                {loading ? 'Connecting...' : '🔄 Retry Connection'}
                            </button>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask about materials..."
                                    disabled={loading || !sessionId}
                                />
                                <button onClick={sendMessage} disabled={loading || !input.trim() || !sessionId}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
