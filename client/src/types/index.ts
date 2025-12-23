export interface IUser {
  id: string;
  _id?: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  isBlocked?: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
  preferences?: {
    theme: 'light' | 'dark' | 'system';
    accentColor: string;
    defaultModel: string | null;
    customSystemPrompt: string | null;
  };
}

export interface IUserPreferences {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  defaultModel: string | null;
  customSystemPrompt: string | null;
}

export interface IAuthContext {
  user: IUser | null;
  isLoading: boolean;
  login: (data: { token: string }) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export interface IThemeContext {
  preferences: IUserPreferences;
  updatePreferences: (updates: Partial<IUserPreferences>) => Promise<void>;
  isLoadingPrefs: boolean;
  effectiveMode: 'light' | 'dark';
}

export interface IAttachment {
  filename: string;
  path?: string; // backend only usually
  mimetype: string;
}

export interface IMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  attachments?: IAttachment[];
  images?: string[];
  tool_calls?: any[];
  tool_call_id?: string;
  timestamp?: string;
}

export interface IChatSession {
  sessionId: string;
  userId?: string;
  title: string;
  model: string;
  messages: IMessage[];
  createdAt: string;
}

export interface ICategory {
  _id: string;
  name: string;
  description?: string;
}

export interface IPreset {
  _id: string;
  name: string;
  description?: string;
  prompt: string;
  category: ICategory | string; // populated or id
  subCategory?: string;
}

export interface IModelConfig {
  _id: string;
  name: string;
  value: string;
  provider: 'ollama' | 'openai' | 'anthropic' | 'custom';
  baseUrl: string;
  apiKey?: string;
  contextWindow: number;
  isActive: boolean;
}

export interface ISessionListItem {
    sessionId: string;
    createdAt: string;
    title: string;
}
