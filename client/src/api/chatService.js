const API_BASE = '/api';

// This function now handles a streaming response
export async function sendChatMessage(model, messages, sessionId, onData) {
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, messages, sessionId }),
    });

    if (!response.body) {
      throw new Error("No response body");
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      const lines = buffer.split('\n\n');
      // The last element is either empty (if ended with \n\n) or the incomplete chunk
      buffer = lines.pop(); 
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6); // Remove "data: " prefix
          try {
            const parsed = JSON.parse(jsonStr);
            onData(parsed);
          } catch (e) {
            console.error("Error parsing streaming chunk in client:", e);
          }
        } else if (line.startsWith('data:')) {
           // Handle case without space
           const jsonStr = line.substring(5);
           try {
            const parsed = JSON.parse(jsonStr);
            onData(parsed);
          } catch (e) {
            console.error("Error parsing streaming chunk in client:", e);
          }
        }
      }
    }

  } catch (error) {
    console.error('Chat service error:', error);
    throw error;
  }
}

// Add a function to load history on startup
export async function fetchChatHistory(sessionId) {
  try {
    const response = await fetch(`${API_BASE}/history/${sessionId}`);
    if (!response.ok) throw new Error("Failed to load history");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Add a function to load all sessions
export async function fetchSessions() {
  try {
    const response = await fetch(`${API_BASE}/sessions`);
    if (!response.ok) throw new Error("Failed to load sessions");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Add a function to update a session title
export async function updateSessionTitle(sessionId, title) {
  try {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error("Failed to update session title");
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error; // Re-throw to be handled by the hook
  }
}

export async function fetchCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) throw new Error("Failed to load categories");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function fetchPresets(categoryId = null) {
  try {
    const url = categoryId ? `${API_BASE}/presets?categoryId=${categoryId}` : `${API_BASE}/presets`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to load presets");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export const AVAILABLE_MODELS = [
  "llama3.2:3b",
  "qwen3:0.6b",
  "ministral-3:3b",
];

// --- AUTH ---

export function getAuthToken() {
  return localStorage.getItem('authToken');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

export async function login(username, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Login failed");
    }
    const data = await response.json();
    setAuthToken(data.token);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// --- ADMIN PRESETS ---

function authHeaders() {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function createPreset(presetData) {
  const response = await fetch(`${API_BASE}/presets`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(presetData)
  });
  if (!response.ok) throw new Error("Failed to create preset");
  return response.json();
}

export async function updatePreset(id, presetData) {
  const response = await fetch(`${API_BASE}/presets/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(presetData)
  });
  if (!response.ok) throw new Error("Failed to update preset");
  return response.json();
}

export async function deletePreset(id) {
  const response = await fetch(`${API_BASE}/presets/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!response.ok) throw new Error("Failed to delete preset");
}

export async function createCategory(categoryData) {
  const response = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(categoryData)
  });
  if (!response.ok) throw new Error("Failed to create category");
  return response.json();
}

export async function deleteCategory(id) {
  const response = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!response.ok) throw new Error("Failed to delete category");
}
