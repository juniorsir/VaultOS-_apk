
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// Using 1secmail API which is free and generally reliable
const API_BASE = 'https://www.1secmail.com/api/v1/';

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

  const getLoginAndDomain = (emailAddr: string) => {
      const parts = emailAddr.split('@');
      if (parts.length !== 2) return { login: '', domain: '' };
      return { login: parts[0], domain: parts[1] };
  };

  // Helper to normalize message data from 1secmail
  const normalizeMessage = (msg: any): EmailMessage => {
      return {
          id: msg.id.toString(),
          from: msg.from,
          subject: msg.subject || '(No Subject)',
          text: msg.textBody || '', 
          html: msg.htmlBody || '',
          preview: msg.textBody ? msg.textBody.substring(0, 100) : '',
          attachments: msg.attachments,
          date: msg.date,
          timestamp: new Date(msg.date).getTime()
      };
  };

  const fetchMessage = useCallback(async (id: string) => {
      if (!email) return null;
      const { login, domain } = getLoginAndDomain(email);
      if (!login || !domain) return null;
      
      try {
          const response = await axios.get(`${API_BASE}?action=readMessage&login=${login}&domain=${domain}&id=${id}`);

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
  }, [email]);

  const createSession = useCallback(async () => {
    if (loading) return;

    // Check cooldown (10 seconds for 1secmail is enough to prevent spamming)
    if (lastCreatedTime) {
        const now = Date.now();
        const elapsed = now - lastCreatedTime;
        const cooldown = 10 * 1000; 

        if (elapsed < cooldown) {
            const remaining = Math.ceil((cooldown - elapsed) / 1000);
            setError(`Please wait ${remaining} seconds before generating a new address.`);
            return;
        }
    }

    setLoading(true);
    setError(null);
    
    try {
        // Generate random mailbox
        const response = await axios.get(`${API_BASE}?action=genRandomMailbox&count=1`);
        
        if (isMounted.current && Array.isArray(response.data) && response.data.length > 0) {
            const newEmail = response.data[0];
            setEmail(newEmail);
            setSessionId(newEmail); // For 1secmail, session ID is just the email
            setMessages([]);
            setLastCreatedTime(Date.now());
        } else {
            throw new Error('Failed to generate email address');
        }
    } catch (err: any) {
        console.error("TempMail Creation Error:", err);
        if (isMounted.current) {
            setError('Failed to connect to mail server. Please try again.');
        }
    } finally {
        if (isMounted.current) setLoading(false);
    }
  }, [loading, lastCreatedTime]);

  const restoreSession = useCallback(async (id: string, savedEmail?: string) => {
    // For 1secmail, the ID is the email. 
    // If we have a savedEmail, use it. If not, try to use ID as email if it looks like one.
    const emailToRestore = savedEmail || (id.includes('@') ? id : null);
    
    if (emailToRestore) {
        setSessionId(emailToRestore);
        setEmail(emailToRestore);
        // Trigger immediate refresh
        setTimeout(() => refreshInbox(), 100);
    }
  }, []);

  const refreshInbox = useCallback(async () => {
    if (!email) return;
    
    const { login, domain } = getLoginAndDomain(email);
    if (!login || !domain) return;

    setRefreshing(true);
    
    try {
      const response = await axios.get(`${API_BASE}?action=getMessages&login=${login}&domain=${domain}`);
      
      if (isMounted.current && Array.isArray(response.data)) {
          // 1secmail getMessages returns partial info. We map it.
          const newMessages: EmailMessage[] = response.data.map((msg: any) => ({
              id: msg.id.toString(),
              from: msg.from,
              subject: msg.subject,
              date: msg.date,
              text: '', // Full content requires fetchMessage
              html: '',
              preview: 'Click to load content...'
          }));
          
          // Merge with existing messages to keep full content if we already have it
          setMessages(prev => {
              const prevMap = new Map<string, EmailMessage>(prev.map(m => [m.id, m]));
              return newMessages.map(newMsg => {
                  const existing = prevMap.get(newMsg.id);
                  return existing && (existing.text || existing.html) ? existing : newMsg;
              });
          });
      }
    } catch (err: any) {
      console.error("Inbox poll failed", err);
    } finally {
      if (isMounted.current) setRefreshing(false);
    }
  }, [email]);

  // Polling Logic
  useEffect(() => {
    if (email) {
      // Poll every 5 seconds
      pollInterval.current = window.setInterval(refreshInbox, 5000);
      
      // Initial fetch
      refreshInbox();
    }
    
    return () => {
      if (pollInterval.current) window.clearInterval(pollInterval.current);
    };
  }, [email, refreshInbox]);

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
