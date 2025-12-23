import { useState, useCallback, useEffect } from 'react';
import { 
  sendChatMessage, 
  fetchChatHistory, 
  fetchSessions, 
  updateSessionTitle,
  fetchCategories,
  fetchPresets,
} from '../api/chatService';

export function useChat(initialModel = 'ministral-3:3b') {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentModel, setCurrentModel] = useState(initialModel);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  // New state for presets
  const [categories, setCategories] = useState([]);
  const [presets, setPresets] = useState([]);
  const [activePreset, setActivePreset] = useState(null);

  // --- DATA LOADING ---

  const loadSessions = useCallback(async () => {
    try {
      const sessionList = await fetchSessions();
      setSessions(sessionList);
      if (!sessionId && sessionList.length > 0) {
        setSessionId(sessionList[0].sessionId);
      } else if (!sessionId && sessionList.length === 0) {
        startNewSession();
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSessions();
    // Load presets and categories on initial mount
    const loadPresetData = async () => {
      setCategories(await fetchCategories());
      setPresets(await fetchPresets());
    };
    loadPresetData();
  }, []); // Runs once

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

  const sendMessage = useCallback(async (content) => {
    if (!content.trim()) return;

    const userMessage = { role: 'user', content, timestamp: new Date().toISOString() };
    
    let messagesToSend = [...messages, userMessage];
    
    // If it's the first message and a preset is active, inject the system prompt
    if (messages.length === 0 && activePreset) {
      const systemMessage = { role: 'system', content: activePreset.prompt };
      messagesToSend.unshift(systemMessage);
    }

    setMessages(prev => [...prev, userMessage]); // Optimistic UI update for user message
    setIsLoading(true);
    setError(null);

    const assistantPlaceholder = { role: 'assistant', content: '', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, assistantPlaceholder]);
    
    try {
      await sendChatMessage(currentModel, messagesToSend, sessionId, (chunk) => {
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
  }, [messages, activePreset, currentModel, sessionId, sessions, loadSessions]);

  const startNewSession = useCallback((preset = null) => {
    const newId = `session-${Date.now()}`;
    setSessionId(newId);
    setMessages([]);
    setActivePreset(preset); // Set the active preset for this new session
  }, []);

  const updateTitle = useCallback(async (sessionIdToUpdate, newTitle) => {
    try {
      await updateSessionTitle(sessionIdToUpdate, newTitle);
      await loadSessions();
    } catch (err) {
      console.error("Failed to update title:", err);
    }
  }, [loadSessions]);

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
    // Preset related state and functions
    categories,
    presets,
    activePreset,
  };
}