import { 
  IMessage, 
  IChatSession, 
  ICategory, 
  IPreset, 
  IModelConfig, 
  IUser, 
  IUserPreferences,
  ISessionListItem
} from '../types';

const API_BASE = '/api';

// Helper to get auth headers
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Helper for JSON auth headers
function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token 
    ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } 
    : { 'Content-Type': 'application/json' };
}

// This function now handles a streaming response (Requires Auth)
export async function sendChatMessage(
  model: string, 
  messages: IMessage[], 
  sessionId: string | null, 
  files: File[] = [], 
  onData: (data: any) => void
): Promise<void> {
  try {
    const formData = new FormData();
    formData.append('model', model);
    formData.append('messages', JSON.stringify(messages));
    if (sessionId) {
      formData.append('sessionId', sessionId);
    }

    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });

    // Handle auth errors
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required. Please log in.');
    }

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
      buffer = lines.pop() || ''; 
      
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
export async function fetchChatHistory(sessionId: string): Promise<IMessage[]> {
  try {
    const response = await fetch(`${API_BASE}/history/${sessionId}`);
    if (!response.ok) throw new Error("Failed to load history");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Load all sessions (Requires Auth)
export async function fetchSessions(): Promise<ISessionListItem[]> {
  try {
    const response = await fetch(`${API_BASE}/sessions`, {
      headers: authHeaders()
    });
    if (response.status === 401) return []; // Not logged in
    if (!response.ok) throw new Error("Failed to load sessions");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Update a session title (Requires Auth)
export async function updateSessionTitle(sessionId: string, title: string): Promise<IChatSession> {
  try {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error("Failed to update session title");
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Delete a session (Requires Auth)
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!response.ok) throw new Error("Failed to delete session");
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function fetchCategories(): Promise<ICategory[]> {
  try {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) throw new Error("Failed to load categories");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function fetchPresets(categoryId: string | null = null): Promise<IPreset[]> {
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

// --- AUTH ---

export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

export async function login(username: string, password: string): Promise<{ token: string; user: IUser }> {
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

export async function createPreset(presetData: Partial<IPreset>): Promise<IPreset> {
  const response = await fetch(`${API_BASE}/presets`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(presetData)
  });
  if (!response.ok) throw new Error("Failed to create preset");
  return response.json();
}

export async function updatePreset(id: string, presetData: Partial<IPreset>): Promise<IPreset> {
  const response = await fetch(`${API_BASE}/presets/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(presetData)
  });
  if (!response.ok) throw new Error("Failed to update preset");
  return response.json();
}

export async function deletePreset(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/presets/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!response.ok) throw new Error("Failed to delete preset");
}

export async function createCategory(categoryData: Partial<ICategory>): Promise<ICategory> {
  const response = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(categoryData)
  });
  if (!response.ok) throw new Error("Failed to create category");
  return response.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!response.ok) throw new Error("Failed to delete category");
}

// --- ADMIN DASHBOARD ---

export async function fetchAdminStats(): Promise<any> {
  const response = await fetch(`${API_BASE}/admin/stats`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Failed to load stats");
  return response.json();
}

export async function fetchUsers(): Promise<IUser[]> {
  const response = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Failed to load users");
  return response.json();
}

export async function toggleUserBlock(userId: string, isBlocked: boolean): Promise<IUser> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/block`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ isBlocked })
  });
  if (!response.ok) throw new Error("Failed to update user status");
  return response.json();
}

export async function sendUserEmail(userId: string, message: string): Promise<any> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/email`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message })
  });
  if (!response.ok) throw new Error("Failed to send email");
  return response.json();
}

export async function generateSupportToken(userId: string): Promise<{ token: string }> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/token`, {
    method: 'POST',
    headers: authHeaders()
  });
  if (!response.ok) throw new Error("Failed to generate token");
  return response.json();
}

// --- MODEL CONFIG ---

export async function fetchModels(): Promise<IModelConfig[]> {
  const response = await fetch(`${API_BASE}/models`); // Public
  if (!response.ok) throw new Error("Failed to load models");
  return response.json();
}

export async function fetchAdminModels(): Promise<IModelConfig[]> {
  const response = await fetch(`${API_BASE}/admin/models`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Failed to load models");
  return response.json();
}

export async function createModel(data: Partial<IModelConfig>): Promise<IModelConfig> {
  const response = await fetch(`${API_BASE}/admin/models`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error("Failed to create model");
  return response.json();
}

export async function updateModel(id: string, data: Partial<IModelConfig>): Promise<IModelConfig> {
  const response = await fetch(`${API_BASE}/admin/models/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error("Failed to update model");
  return response.json();
}

export async function deleteModel(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/models/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!response.ok) throw new Error("Failed to delete model");
}

// --- MCP SERVERS ---

export async function fetchMCPServers(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/admin/mcp`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Failed to load MCP servers");
  return response.json();
}

export async function createMCPServer(data: any): Promise<any> {
  const response = await fetch(`${API_BASE}/admin/mcp`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error("Failed to create server");
  return response.json();
}

export async function updateMCPServer(id: string, data: any): Promise<any> {
  const response = await fetch(`${API_BASE}/admin/mcp/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error("Failed to update server");
  return response.json();
}

export async function deleteMCPServer(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/mcp/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!response.ok) throw new Error("Failed to delete server");
}

// --- REGISTRATION ---

export async function registerInit(username: string, email: string, password: string): Promise<any> {
  const response = await fetch(`${API_BASE}/auth/register/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Registration failed");
  }
  return response.json();
}

export async function registerVerify(username: string, email: string, password: string, otp: string): Promise<{ token: string; user: IUser }> {
  const response = await fetch(`${API_BASE}/auth/register/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, otp })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Verification failed");
  }
  const data = await response.json();
  setAuthToken(data.token);
  return data;
}

export async function resendOTP(email: string, type: string): Promise<any> {
  const response = await fetch(`${API_BASE}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, type })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to resend code");
  }
  return response.json();
}

// --- PASSWORD ---

export async function changePassword(currentPassword: string, newPassword: string): Promise<any> {
  const response = await fetch(`${API_BASE}/auth/password`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to change password");
  }
  return response.json();
}

// --- USER PREFERENCES ---

export async function fetchUserPreferences(): Promise<Partial<IUserPreferences>> {
  const response = await fetch(`${API_BASE}/user/preferences`, {
    headers: authHeaders()
  });
  if (!response.ok) {
    if (response.status === 401) return {}; // Not logged in
    throw new Error("Failed to load preferences");
  }
  return response.json();
}

export async function updateUserPreferences(preferences: Partial<IUserPreferences>): Promise<IUserPreferences> {
  const response = await fetch(`${API_BASE}/user/preferences`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(preferences)
  });
  if (!response.ok) throw new Error("Failed to update preferences");
  return response.json();
}

// --- CURRENT USER ---

export async function fetchCurrentUser(): Promise<IUser | null> {
  const response = await fetch(`${API_BASE}/user/me`, {
    headers: authHeaders()
  });
  if (!response.ok) {
    if (response.status === 401) return null;
    throw new Error("Failed to fetch user");
  }
  return response.json();
}
