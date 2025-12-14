import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ChevronLeft, ChevronRight, RefreshCw, Send, 
  MessageSquare, Trash2, PlusCircle, History, User, 
  Link as LinkIcon, ExternalLink, Settings, LogOut, X,
  BookOpen, ChevronDown, ChevronUp
} from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Constants
const GMAIL_CLIENT_ID = "654999043656-m1nk36prvumftarm2vmuvnqfh685r9kj.apps.googleusercontent.com";
const GMAIL_REDIRECT_URI = "http://localhost:3001/oauth-callback.html";

// Sub-component for individual chat messages
const ChatMessage = ({ msg, theme }) => {
  const [showSources, setShowSources] = useState(false);
  const content = msg.content || '';

  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-lg shadow-sm flex flex-col
        ${msg.role === 'user' 
          ? `bg-${theme.accent}-600 text-white rounded-br-none` 
          : `${theme.cardBg} border ${theme.border} rounded-bl-none ${theme.text}`
        }
      `}>
         <div className={`px-4 py-2 text-sm prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''} prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ node, ...props }) => <p {...props} className="leading-relaxed" />,
                ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 space-y-1" />,
                ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 space-y-1" />,
                li: ({ node, ...props }) => <li {...props} className="leading-relaxed" />
              }}
            >
              {content}
            </ReactMarkdown>
         </div>
         
         {msg.sources && msg.sources.length > 0 && (
           <div className={`border-t ${msg.role === 'user' ? 'border-white/20' : theme.border}`}>
             <button 
               onClick={() => setShowSources(!showSources)}
               className={`w-full flex items-center justify-between px-4 py-2 text-xs font-medium hover:bg-black/5 transition-colors ${msg.role === 'user' ? 'text-white' : theme.textSecondary}`}
             >
               <span className="flex items-center gap-1">
                 <BookOpen className="w-3 h-3" />
                 {msg.sources.length} Sources
               </span>
               {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
             </button>
             
             {showSources && (
               <div className={`px-4 py-2 space-y-2 text-xs ${msg.role === 'user' ? 'text-white/90' : theme.textSecondary}`}>
                 {msg.sources.map((src, i) => (
                   <div key={i} className={`p-2 rounded ${msg.role === 'user' ? 'bg-black/20' : theme.bg} border ${msg.role === 'user' ? 'border-transparent' : theme.border}`}>
                     <div className="font-semibold truncate">{src.subject || '(No subject)'}</div>
                     <div className="text-[10px] opacity-75 mb-1">
                       <span className="truncate">{src.sender}</span>
                     </div>
                     <div className="line-clamp-2 opacity-80 italic">"{src.snippet}"</div>
                   </div>
                 ))}
               </div>
             )}
           </div>
         )}
      </div>
    </div>
  );
};

const AgentView = ({ theme }) => {
  // --- State Management ---
  const [emails, setEmails] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailDetailLoading, setEmailDetailLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatId, setChatId] = useState(() => localStorage.getItem('chatId') || `chat-${Date.now()}`);
  const [isThinking, setIsThinking] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showUserCenterModal, setShowUserCenterModal] = useState(false);
  
  const [mailboxes, setMailboxes] = useState([]);
  const [loadingMailboxes, setLoadingMailboxes] = useState(false);
  
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('info'); // 'info' | 'error'

  const [apiBase, setApiBase] = useState(() => localStorage.getItem('apiBase') || 'http://localhost:8005');
  const [userId, setUserId] = useState(() => localStorage.getItem('userId'));
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken'));

  const chatScrollRef = useRef(null);

  // --- Effects ---
  
  useEffect(() => {
    localStorage.setItem('apiBase', apiBase);
  }, [apiBase]);

  useEffect(() => {
    localStorage.setItem('chatId', chatId);
  }, [chatId]);

  useEffect(() => {
    if (authToken && userId) {
      fetchEmails();
      fetchMailboxes();
    }
  }, [page, authToken, userId]); // Reload when auth or page changes

  useEffect(() => {
    // Scroll chat to bottom when messages change
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    // Handle Gmail OAuth messages
    const handleMessage = (event) => {
      if (event.data?.source === 'gmail-oauth') {
        const { access_token, refresh_token, error } = event.data;
        if (error) {
          setStatus(`Gmail Auth Error: ${error}`, 'error');
        } else if (access_token) {
          handleGmailAccessToken(access_token, refresh_token);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // --- Helpers ---

  const setStatus = (msg, type = 'info', duration = 3000) => {
    setStatusMsg(msg);
    setStatusType(type);
    if (duration) {
      setTimeout(() => setStatusMsg(''), duration);
    }
  };

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${authToken}` }
  });

  const formatDate = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  };

  // --- API Actions ---

  const fetchEmails = async () => {
    if (!authToken) return;
    setLoadingEmails(true);
    try {
      const res = await axios.get(`${apiBase}/emails`, {
        params: { page, page_size: pageSize },
        ...getAuthHeaders()
      });
      setEmails(res.data.items || []);
      setTotal(res.data.total || 0);
      setStatus('Emails loaded');
    } catch (err) {
      console.error(err);
      setStatus(`Failed to load emails: ${err.message}`, 'error');
    } finally {
      setLoadingEmails(false);
    }
  };

  const fetchEmailDetail = async (emailId) => {
    setEmailDetailLoading(true);
    try {
      const res = await axios.get(`${apiBase}/emails/${emailId}`, getAuthHeaders());
      setSelectedEmail({ ...res.data, loading: false });
    } catch (err) {
      setStatus(`Failed to load email body: ${err.message}`, 'error');
    } finally {
      setEmailDetailLoading(false);
    }
  };

  const selectEmail = (email) => {
    setSelectedEmail({ ...email, loading: true });
    fetchEmailDetail(email.id);
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const question = chatInput.trim();
    const newMsg = { role: 'user', content: question };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setIsThinking(true);

    try {
      const res = await axios.post(`${apiBase}/ai/ask`, {
        question,
        current_thread_id: selectedEmail?.thread_id || null,
        chat_id: chatId
      }, getAuthHeaders());

      const answer = res.data.answer || '(No response)';
      // Capture sources from response
      const sources = res.data.sources || [];
      
      setChatMessages(prev => [...prev, { role: 'bot', content: answer, sources }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'bot', content: `Error: ${err.message}` }]);
    } finally {
      setIsThinking(false);
    }
  };

  const fetchChatSessions = async () => {
    try {
      const res = await axios.get(`${apiBase}/ai/chat-sessions?limit=50`, getAuthHeaders());
      setChatSessions(res.data.items || []);
    } catch (err) {
      setStatus('Failed to load history', 'error');
    }
  };

  const switchSession = async (newChatId) => {
    setChatId(newChatId);
    setShowHistoryModal(false);
    setStatus('Loading session...');
    try {
      const res = await axios.get(`${apiBase}/ai/chat-messages`, {
        params: { chat_id: newChatId, limit: 100 },
        ...getAuthHeaders()
      });
      const msgs = (res.data.items || []).map(m => ({
        role: m.role === 'assistant' ? 'bot' : 'user',
        content: m.content,
        sources: m.sources || []
      }));
      setChatMessages(msgs);
      setStatus(`Switched to session ${newChatId}`);
    } catch (err) {
      setStatus('Failed to load messages', 'error');
    }
  };

  const resetChat = () => {
    const newId = `chat-${Date.now()}`;
    setChatId(newId);
    setChatMessages([]);
    setStatus('New chat started');
  };

  // --- Gmail / User Center ---

  const fetchMailboxes = async () => {
    setLoadingMailboxes(true);
    try {
      const res = await axios.get(`${apiBase}/mailboxes`, getAuthHeaders());
      setMailboxes(res.data.items || []);
    } catch (err) {
      setStatus('Failed to load mailboxes', 'error');
    } finally {
      setLoadingMailboxes(false);
    }
  };

  const startGmailOAuth = (actionType = 'connect', email = null) => {
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GMAIL_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", GMAIL_REDIRECT_URI);
    authUrl.searchParams.set("response_type", "token");
    authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", `gmail-${Date.now()}`); // Simplified state
    
    // Store action intention in session/local storage if needed, 
    // but for now we'll just handle the token generically.
    window.open(authUrl.toString(), "gmail_oauth", "width=520,height=700");
  };

  const handleGmailAccessToken = async (accessToken, refreshToken) => {
    setStatus('Linking Gmail...', 'info');
    try {
      // 1. Get Profile
      const profileRes = await axios.get("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const email = profileRes.data.emailAddress;
      
      // 2. Connect to backend
      await axios.post(`${apiBase}/gmail/connect`, {
        email,
        access_token: accessToken,
        refresh_token: refreshToken,
        days_back: 90
      }, getAuthHeaders());
      
      setStatus(`Linked ${email} successfully`, 'info');
      fetchMailboxes();
      fetchEmails();
    } catch (err) {
      setStatus(`Gmail Link Failed: ${err.message}`, 'error');
    }
  };

  const syncMailbox = async (email) => {
    setStatus(`Syncing ${email}...`);
    try {
      const res = await axios.post(`${apiBase}/gmail/sync`, {
        email,
        fallback_days_back: 7
      }, getAuthHeaders());
      setStatus(`Sync complete: ${res.data.ingested} emails`, 'info');
      fetchEmails();
      fetchMailboxes(); // Update last sync time
    } catch (err) {
       setStatus(`Sync failed. Try re-linking.`, 'error');
    }
  };

  // --- Filtering ---
  
  const filteredEmails = emails.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (e.subject || '').toLowerCase().includes(q) || 
           (e.sender || '').toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // --- Render ---

  if (!authToken) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${theme.text}`}>
        <h2 className="text-xl mb-4">Agent Authentication Required</h2>
        <div className="flex flex-col gap-4 w-96">
          <div>
            <label className="block text-sm font-medium mb-1">API Base URL</label>
            <input 
              type="text" 
              value={apiBase} 
              onChange={e => setApiBase(e.target.value)}
              className={`w-full p-2 rounded border ${theme.border} ${theme.cardBg}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <input 
              type="text" 
              placeholder="e.g. user@example.com"
              value={userId || ''} 
              onChange={e => {
                setUserId(e.target.value);
                localStorage.setItem('userId', e.target.value);
              }}
              className={`w-full p-2 rounded border ${theme.border} ${theme.cardBg}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Auth Token</label>
            <input 
              type="password" 
              placeholder="Enter your token"
              value={authToken || ''} 
              onChange={e => {
                setAuthToken(e.target.value);
                localStorage.setItem('authToken', e.target.value);
              }}
              className={`w-full p-2 rounded border ${theme.border} ${theme.cardBg}`}
            />
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className={`bg-${theme.accent}-600 text-white p-2 rounded hover:bg-${theme.accent}-700`}
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[calc(100vh-2rem)] overflow-hidden ${theme.text}`}>
      {/* Status Bar */}
      {statusMsg && (
        <div className={`absolute top-4 right-8 z-50 px-4 py-2 rounded shadow-lg text-sm font-medium transition-all transform
          ${statusType === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}
        `}>
          {statusMsg}
        </div>
      )}

      {/* Toolbar */}
      <div className={`flex items-center justify-between p-4 border-b ${theme.border} ${theme.cardBg}`}>
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span role="img" aria-label="robot">🤖</span> Agent Workspace
          </h2>
          <div className="flex items-center gap-2">
            <div className={`relative`}>
               <Search className={`absolute left-2 top-2.5 w-4 h-4 ${theme.textSecondary}`} />
               <input 
                 type="text" 
                 placeholder="Search emails..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className={`pl-8 pr-3 py-1.5 text-sm rounded-md border ${theme.border} ${theme.bg} focus:ring-1 focus:ring-${theme.accent}-500 outline-none w-64`}
               />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => { setPage(1); fetchEmails(); }} className={`p-2 rounded hover:${theme.secondaryHover}`} title="Refresh">
             <RefreshCw className="w-4 h-4" />
           </button>
           <button onClick={() => { fetchChatSessions(); setShowHistoryModal(true); }} className={`p-2 rounded hover:${theme.secondaryHover}`} title="Chat History">
             <History className="w-4 h-4" />
           </button>
           <button onClick={() => { fetchMailboxes(); setShowUserCenterModal(true); }} className={`px-3 py-1.5 text-sm rounded border ${theme.border} hover:${theme.secondaryHover} flex items-center gap-2`}>
             <User className="w-4 h-4" />
             User Center
           </button>
        </div>
      </div>

      {/* Main Layout (3 Columns) */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Email List */}
        <div className={`w-1/4 border-r ${theme.border} flex flex-col bg-opacity-50 ${theme.bg}`}>
          <div className="flex-1 overflow-y-auto">
            {loadingEmails ? (
               <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
            ) : filteredEmails.length === 0 ? (
               <div className="p-4 text-center text-sm text-gray-500">No emails found</div>
            ) : (
              filteredEmails.map(email => (
                <div 
                  key={email.id}
                  onClick={() => selectEmail(email)}
                  className={`p-3 border-b ${theme.border} cursor-pointer hover:${theme.secondaryHover} transition-colors
                    ${selectedEmail?.id === email.id ? `bg-${theme.accent}-500/10 border-l-4 border-l-${theme.accent}-500` : 'border-l-4 border-l-transparent'}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`font-medium truncate flex-1 text-sm ${theme.text}`}>{email.sender}</span>
                    <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">{formatDate(email.ts).split(',')[0]}</span>
                  </div>
                  <div className={`text-sm font-medium truncate mb-1 ${theme.text}`}>{email.subject || '(No Subject)'}</div>
                  <div className={`text-xs ${theme.textSecondary} line-clamp-2`}>{email.body_snippet}</div>
                </div>
              ))
            )}
          </div>
          {/* Pagination */}
          <div className={`p-2 border-t ${theme.border} flex justify-between items-center text-xs ${theme.textSecondary}`}>
             <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
             <span>Page {page} / {totalPages}</span>
             <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Middle: Email Detail */}
        <div className={`w-2/5 border-r ${theme.border} flex flex-col overflow-y-auto ${theme.cardBg}`}>
          {selectedEmail ? (
            <div className="p-6">
              <h1 className="text-xl font-bold mb-4">{selectedEmail.subject || '(No Subject)'}</h1>
              
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-${theme.accent}-500`}>
                    {(selectedEmail.sender || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{selectedEmail.sender}</div>
                    <div className="text-xs text-gray-500">To: {(selectedEmail.recipients || []).join(', ')}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right">
                   <div>{formatDate(selectedEmail.ts)}</div>
                   <div>Score: {selectedEmail.importance_score?.toFixed(1)}</div>
                </div>
              </div>

              <div className="prose prose-sm max-w-none dark:prose-invert">
                {selectedEmail.loading ? (
                   <div className="animate-pulse space-y-2">
                     <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                     <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                     <div className="h-4 bg-gray-200 rounded w-full"></div>
                   </div>
                ) : (
                  <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {selectedEmail.body_text || selectedEmail.body_snippet}
                  </div>
                )}
              </div>
              
              <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
                 Thread ID: {selectedEmail.thread_id}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <MailboxIcon className="w-12 h-12 mb-2 opacity-20" />
               <p>Select an email to read</p>
            </div>
          )}
        </div>

        {/* Right: AI Chat */}
        <div className={`flex-1 flex flex-col ${theme.bg}`}>
          {/* Chat Header */}
          <div className={`p-3 border-b ${theme.border} flex justify-between items-center ${theme.cardBg}`}>
            <div>
              <div className="font-medium text-sm">AI Assistant</div>
              <div className="text-xs text-gray-500 truncate w-32">Session: {chatId.slice(-6)}</div>
            </div>
            <div className="flex gap-2">
               <button onClick={resetChat} className={`p-1.5 rounded hover:${theme.secondaryHover}`} title="New Chat">
                 <PlusCircle className="w-4 h-4" />
               </button>
               <button onClick={() => setChatMessages([])} className={`p-1.5 rounded hover:${theme.secondaryHover}`} title="Clear Messages">
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatScrollRef}>
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-10">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>Ask me anything about your emails.</p>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <ChatMessage key={idx} msg={msg} theme={theme} />
            ))}
            {isThinking && (
              <div className="flex justify-start">
                 <div className={`${theme.cardBg} border ${theme.border} rounded-lg px-4 py-2 text-sm text-gray-500`}>
                    Thinking...
                 </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className={`p-4 border-t ${theme.border} ${theme.cardBg}`}>
            <div className="relative">
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask a question..."
                className={`w-full p-3 pr-10 rounded-lg border ${theme.border} ${theme.bg} focus:ring-1 focus:ring-${theme.accent}-500 outline-none resize-none text-sm`}
                rows="3"
              />
              <button 
                onClick={sendMessage}
                disabled={!chatInput.trim() || isThinking}
                className={`absolute right-2 bottom-2 p-2 rounded-full 
                  ${chatInput.trim() ? `bg-${theme.accent}-600 text-white` : 'text-gray-400 bg-gray-100 dark:bg-gray-800'}
                  hover:opacity-90 transition-all
                `}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      
      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className={`${theme.cardBg} w-96 max-h-[80vh] rounded-xl shadow-xl flex flex-col`}>
             <div className={`p-4 border-b ${theme.border} flex justify-between items-center`}>
               <h3 className="font-bold">Chat History</h3>
               <button onClick={() => setShowHistoryModal(false)}><X className="w-5 h-5" /></button>
             </div>
             <div className="flex-1 overflow-y-auto p-2">
               {chatSessions.map(s => (
                 <div 
                   key={s.chat_id}
                   onClick={() => switchSession(s.chat_id)}
                   className={`p-3 rounded-lg hover:${theme.secondaryHover} cursor-pointer mb-1 border border-transparent ${s.chat_id === chatId ? `border-${theme.accent}-200 bg-${theme.accent}-50` : ''}`}
                 >
                   <div className="font-medium text-sm truncate">{s.title || '(Untitled)'}</div>
                   <div className="text-xs text-gray-500">{formatDate(s.created_at)}</div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}

      {/* User Center Modal */}
      {showUserCenterModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className={`${theme.cardBg} w-[600px] max-h-[80vh] rounded-xl shadow-xl flex flex-col`}>
             <div className={`p-6 border-b ${theme.border} flex justify-between items-center`}>
               <div>
                 <h3 className="font-bold text-lg">User Center</h3>
                 <p className="text-sm text-gray-500">Manage your connected mailboxes</p>
               </div>
               <button onClick={() => setShowUserCenterModal(false)}><X className="w-5 h-5" /></button>
             </div>
             
             <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {/* Link New */}
                <div className={`p-4 rounded-lg border border-dashed ${theme.border} flex items-center justify-between`}>
                   <div>
                     <div className="font-medium">Connect Gmail</div>
                     <div className="text-sm text-gray-500">Link a new Gmail account via OAuth</div>
                   </div>
                   <button 
                     onClick={() => startGmailOAuth('connect')}
                     className={`px-4 py-2 bg-${theme.accent}-600 text-white rounded-lg hover:bg-${theme.accent}-700 text-sm font-medium`}
                   >
                     Connect Gmail
                   </button>
                </div>

                {/* List */}
                <div>
                   <h4 className="font-medium mb-3 text-sm uppercase text-gray-500 tracking-wider">Linked Mailboxes</h4>
                   {loadingMailboxes ? (
                     <div className="text-center py-4">Loading...</div>
                   ) : mailboxes.length === 0 ? (
                     <div className="text-center py-8 text-gray-400">No mailboxes connected yet</div>
                   ) : (
                     <div className="space-y-3">
                       {mailboxes.map(m => (
                         <div key={m.id} className={`p-4 rounded-lg border ${theme.border} flex items-center justify-between`}>
                           <div>
                             <div className="font-medium">{m.provider}</div>
                             <div className="flex gap-2 text-xs mt-1">
                               <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">GMAIL</span>
                               <span className="text-gray-500">Synced: {m.last_synced_at ? formatDate(m.last_synced_at) : 'Never'}</span>
                             </div>
                           </div>
                           <button 
                             onClick={() => syncMailbox(m.provider)}
                             className={`p-2 rounded hover:${theme.secondaryHover} text-${theme.accent}-600`}
                             title="Sync Now"
                           >
                             <RefreshCw className="w-4 h-4" />
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Helper component for empty state
const MailboxIcon = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 5.5 5h13C20 5 22 7 22 9.5V17z"></path>
    <polyline points="3 9.5 9 16 15 9.5"></polyline>
    <path d="M12 16v6"></path>
  </svg>
);

export default AgentView;
