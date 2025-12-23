import { useState, useEffect, useCallback } from 'react';
import { 
  sendChatMessage, 
  fetchChatHistory, 
  fetchSessions, 
  updateSessionTitle,
  deleteSession,
  fetchCategories,
  fetchPresets,
  fetchModels, // Import this
} from '../api/chatService';

export function useChat(initialModel = '', customSystemPrompt = null) {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [currentModel, setCurrentModel] = useState(initialModel);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  // Presets state
  const [categories, setCategories] = useState([]);
  const [presets, setPresets] = useState([]);
  const [activePreset, setActivePreset] = useState(null);

  const startNewSession = useCallback((preset = null) => {
    setSessionId(null);
    setMessages([]);
    setActivePreset(preset);
  }, []);

  // --- DATA LOADING ---

  const loadSessions = useCallback(async () => {
    try {
      const sessionList = await fetchSessions();
      setSessions(sessionList);
      return sessionList;
    } catch (err) {
      console.error("Failed to load sessions:", err);
      return [];
    }
  }, []);

  useEffect(() => {
    // Initial load
    const init = async () => {
      const sessionList = await loadSessions();
      if (sessionList.length > 0 && !sessionId) {
        setSessionId(sessionList[0].sessionId);
      }
      
      // Load presets and categories
      setCategories(await fetchCategories());
      setPresets(await fetchPresets());

      // Load Models
      try {
          const models = await fetchModels();
          setAvailableModels(models);
          if (models.length > 0 && !currentModel) {
              setCurrentModel(models[0].value);
          }
      } catch (e) {
          console.error("Failed to load models:", e);
      }
    };
    init();
  }, []); // Run only once on mount

  useEffect(() => {
    async function loadHistory() {
      if (!sessionId) return;
      setIsLoading(true);
      try {
        const history = await fetchChatHistory(sessionId);
        setMessages(history || []);
        // Reset active preset when switching to an existing session
        setActivePreset(null); 
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, [sessionId]);

  // --- ACTIONS ---

  const sendMessage = useCallback(async (content, files = []) => {
    if (!content.trim() && files.length === 0) return;

    // Create user message object. 
    // Note: We don't display the full file content in the UI immediately, 
    // but we could show "Attached: filename" if we wanted.
    const userMessage = { 
        role: 'user', 
        content, 
        timestamp: new Date().toISOString(),
        // Add minimal file info for optimistic UI if needed
        attachments: files.map(f => ({ filename: f.name, mimetype: f.type })) 
    };
    
    let messagesToSend = [...messages, userMessage];

    // If it's the first message, inject system prompt (preset takes priority over custom)
    if (messages.length === 0) {
      if (activePreset) {
        const systemMessage = { role: 'system', content: activePreset.prompt };
        messagesToSend.unshift(systemMessage);
      } else if (customSystemPrompt) {
        const systemMessage = { role: 'system', content: customSystemPrompt };
        messagesToSend.unshift(systemMessage);
      }
    }

    setMessages(prev => [...prev, userMessage]); // Optimistic UI update for user message
    setIsLoading(true);
    setError(null);

    const assistantPlaceholder = { role: 'assistant', content: '', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, assistantPlaceholder]);
    
    try {
      await sendChatMessage(currentModel, messagesToSend, sessionId, files, (chunk) => {
        if (chunk.sessionId && !sessionId) {
          setSessionId(chunk.sessionId);
        }
        if (chunk.message?.content) {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0) {
                const lastMessage = newMessages[lastIndex];
                newMessages[lastIndex] = {
                    ...lastMessage,
                    content: lastMessage.content + chunk.message.content
                };
            }
            return newMessages;
          });
        }
        if (chunk.done) {
          setIsLoading(false);
          const isNewSession = !sessions.some(s => s.sessionId === sessionId);
          if (isNewSession) {
            loadSessions();
          }
        }
      });
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      setMessages(prev => prev.slice(0, -1)); // Remove placeholder on error
    }
  }, [messages, activePreset, customSystemPrompt, currentModel, sessionId, sessions, loadSessions]);

  const updateTitle = useCallback(async (sessionIdToUpdate, newTitle) => {
    try {
      await updateSessionTitle(sessionIdToUpdate, newTitle);
      await loadSessions();
    } catch (err) {
      console.error("Failed to update title:", err);
    }
  }, [loadSessions]);

  const deleteChatSession = useCallback(async (sessionIdToDelete) => {
    try {
      await deleteSession(sessionIdToDelete);
      
      setSessions(prev => prev.filter(s => s.sessionId !== sessionIdToDelete));

      if (sessionId === sessionIdToDelete) {
        setSessionId(null);
        setMessages([]);
        setActivePreset(null);
        // Optionally load the most recent session or start new
        const remainingSessions = sessions.filter(s => s.sessionId !== sessionIdToDelete);
        if (remainingSessions.length > 0) {
            setSessionId(remainingSessions[0].sessionId);
        } else {
            startNewSession();
        }
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  }, [sessionId, sessions, startNewSession]);

  return {
    messages,
    sessions,
    currentModel,
    isLoading,
    error,
    sessionId,
    setSessionId,
    startNewSession,
    sendMessage,
    setCurrentModel,
    updateTitle,
    deleteChatSession,
    // Preset related state and functions
    categories,
    presets,
    activePreset,
    availableModels, // Export this
  };
}