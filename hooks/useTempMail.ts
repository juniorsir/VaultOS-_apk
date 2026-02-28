
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE = (import.meta as any).env.VITE_MAIL_API_BASE || 'https://raindrops-0co5.onrender.com/api';
const API_KEY = (import.meta as any).env.VITE_MAIL_API_KEY || 'PleaseGiveCreditIfYouUse';

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  preview?: string;
  attachments?: any[];
  date: string;
  timestamp?: number;
}

export interface UseTempMailReturn {
  email: string | null;
  sessionId: string | null;
  messages: EmailMessage[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastCreatedTime: number | null;
  createSession: () => Promise<void>;
  refreshInbox: () => Promise<void>;
  restoreSession: (id: string, savedEmail?: string) => Promise<void>;
  fetchMessage: (id: string) => Promise<EmailMessage | null>;
}

export const useTempMail = (): UseTempMailReturn => {
  const [email, setEmail] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCreatedTime, setLastCreatedTime] = useState<number | null>(null);
  
  const isMounted = useRef(true);
  const pollInterval = useRef<number | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Helper to normalize message data from API
  const normalizeMessage = (msg: any): EmailMessage => {
      let from = 'Unknown Sender';
      
      // Handle 'from' field
      if (msg.from) {
          if (typeof msg.from === 'string') {
              from = msg.from;
          } else if (typeof msg.from === 'object') {
              const { name, address } = msg.from;
              if (name && address) {
                  from = `${name} <${address}>`;
              } else if (name) {
                  from = name;
              } else if (address) {
                  from = address;
              }
          }
      }

      // Handle HTML array from new API
      let htmlContent = msg.html;
      if (Array.isArray(msg.html)) {
          htmlContent = msg.html.join('');
      }

      return {
          id: msg.id || Math.random().toString(36),
          from: from,
          subject: msg.subject || '(No Subject)',
          text: msg.text || msg.preview || '', // Use preview as fallback text
          html: htmlContent,
          preview: msg.preview,
          attachments: msg.attachments,
          date: msg.date || new Date().toISOString(),
          timestamp: msg.timestamp
      };
  };

  // ... (createSession)

  // ... (restoreSession)

  // ... (refreshInbox)

  const fetchMessage = useCallback(async (id: string) => {
      if (!sessionId) return null;
      
      try {
          const response = await axios.get(`${API_BASE}/message?sessionId=${sessionId}&id=${id}&t=${Date.now()}`, {
              headers: { 'x-api-key': API_KEY },
              timeout: 10000
          });

          if (isMounted.current && response.data) {
              const fullMessage = normalizeMessage(response.data);
              
              // Update the message in the list with full details
              setMessages(prev => prev.map(msg => 
                  msg.id === id ? { ...msg, ...fullMessage } : msg
              ));
              
              return fullMessage;
          }
      } catch (err) {
          console.error("Failed to fetch message details", err);
      }
      return null;
  }, [sessionId]);



  const createSession = useCallback(async () => {
    if (loading) return;

    // Check cooldown (5 minutes)
    if (lastCreatedTime) {
        const now = Date.now();
        const elapsed = now - lastCreatedTime;
        const cooldown = 5 * 60 * 1000; // 5 minutes

        if (elapsed < cooldown) {
            const remaining = Math.ceil((cooldown - elapsed) / 60000);
            setError(`Please wait ${remaining} minute${remaining !== 1 ? 's' : ''} before generating a new address.`);
            return;
        }
    }

    setLoading(true);
    setError(null);
    
    let attempts = 0;
    const maxAttempts = 3;

    // Retry loop
    while (attempts < maxAttempts) {
        try {
            console.log(`Generating Temp Mail Session (Attempt ${attempts + 1})...`);
            
            // Add timestamp to prevent caching
            const response = await axios.get(`${API_BASE}/create?t=${Date.now()}`, {
                headers: { 'x-api-key': API_KEY },
                timeout: 25000 // 25s timeout
            });
            
            console.log("TempMail Response:", response.data);

            if (isMounted.current) {
                const data = response.data;
                if (data && data.sessionId) {
                    setSessionId(data.sessionId);
                    
                    // Handle different API response structures for address safely
                    let generatedEmail = 'pending...';
                    
                    // Check address property
                    if (data.address) {
                        if (typeof data.address === 'string') {
                            generatedEmail = data.address;
                        } else if (typeof data.address === 'object' && data.address !== null) {
                            // Handle object wrapper { address: "...", name: "..." }
                            generatedEmail = data.address.address || 'unknown';
                        }
                    } else if (data.email) {
                        // Fallback to email property
                         if (typeof data.email === 'string') {
                            generatedEmail = data.email;
                        } else if (typeof data.email === 'object' && data.email !== null) {
                            generatedEmail = data.email.address || 'unknown';
                        }
                    }

                    setEmail(generatedEmail);
                    setMessages([]);
                    setLoading(false);
                    setLastCreatedTime(Date.now());
                    return; // Success, exit function
                } else {
                    throw new Error('Invalid response format from mail server.');
                }
            }
            return; // Component unmounted

        } catch (err: any) {
            console.error(`TempMail Creation Attempt ${attempts + 1} Error:`, err);
            
            attempts++;
            
            // Determine if we should retry (Network errors or 5xx server errors)
            const isRetryable = 
                !err.response || 
                (err.response.status >= 500 && err.response.status < 600) ||
                err.code === 'ERR_NETWORK' || 
                err.message === 'Network Error' ||
                err.code === 'ECONNABORTED';

            if (attempts >= maxAttempts || !isRetryable) {
                if (isMounted.current) {
                    let msg = err.message || 'Failed to create temp mail session';
                    
                    if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
                         msg = 'Network Error: Unable to connect to the secure mail server. Check your connection or try disabling ad blockers.';
                    } else if (err.code === 'ECONNABORTED') {
                         msg = 'Connection timed out. The server might be sleeping. Please try again.';
                    }
                    
                    setError(msg);
                    setLoading(false);
                }
                return;
            }
            
            // Wait before next attempt (Exponential backoff: 1s, 2s)
            if (isMounted.current) {
                await new Promise(resolve => setTimeout(resolve, attempts * 1500));
            } else {
                return;
            }
        }
    }
  }, [loading]);

  const restoreSession = useCallback(async (id: string, savedEmail?: string) => {
    setSessionId(id);
    if (savedEmail) setEmail(savedEmail);
    setRefreshing(true);
    
    try {
        const response = await axios.get(`${API_BASE}/inbox?sessionId=${id}&t=${Date.now()}`, {
            headers: { 'x-api-key': API_KEY },
            timeout: 10000
        });
        if (isMounted.current) {
            let newMessages: EmailMessage[] = [];
            if (Array.isArray(response.data)) {
                 newMessages = response.data.map(normalizeMessage);
            } else if (response.data && Array.isArray(response.data.messages)) {
                 newMessages = response.data.messages.map(normalizeMessage);
            }
            
            setMessages(newMessages);

            // We cannot recover the email address from just the session ID if not provided.
            if (!savedEmail && !email) setEmail('Restored Session');
        }
    } catch (err) {
        console.error("Failed to restore session inbox", err);
    } finally {
        if(isMounted.current) setRefreshing(false);
    }
  }, [email]);

  const refreshInbox = useCallback(async () => {
    if (!sessionId) return;
    
    setRefreshing(true);
    try {
      const response = await axios.get(`${API_BASE}/inbox?sessionId=${sessionId}&t=${Date.now()}`, {
        headers: { 'x-api-key': API_KEY },
        timeout: 10000
      });
      
      if (isMounted.current) {
          let newMessages: EmailMessage[] = [];
          if (Array.isArray(response.data)) {
              newMessages = response.data;
          } else if (response.data && typeof response.data === 'object') {
              if (Array.isArray(response.data.messages)) {
                  newMessages = response.data.messages;
              }
          }
          
          setMessages(newMessages.map(normalizeMessage));
      }
    } catch (err: any) {
      console.error("Inbox poll failed", err);
      if (err.response && err.response.status === 401) {
          if (isMounted.current) {
              setSessionId(null);
              setEmail(null);
              setMessages([]);
              setError("Session expired. Please generate a new address.");
          }
      }
    } finally {
      if (isMounted.current) setRefreshing(false);
    }
  }, [sessionId]);

  // Polling Logic
  useEffect(() => {
    if (sessionId) {
      // Poll every 5 seconds
      pollInterval.current = window.setInterval(refreshInbox, 5000);
      
      // Initial fetch
      refreshInbox();
    }
    
    return () => {
      if (pollInterval.current) window.clearInterval(pollInterval.current);
    };
  }, [sessionId, refreshInbox]);

  return {
    email,
    sessionId,
    messages,
    loading,
    refreshing,
    error,
    lastCreatedTime,
    createSession,
    refreshInbox,
    restoreSession,
    fetchMessage
  };
};
