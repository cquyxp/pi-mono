import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// 生成唯一 ID
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// 估算 token 数（更准确的估算）
export const estimateTokens = (text: string): number => {
  if (!text) return 0

  // 统计中文字符、日文、韩文等（CJK 字符）
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length
  // 统计其他字符
  const otherChars = text.length - cjkChars

  // CJK: 约 1.3 字符 = 1 token
  // 英文/其他: 约 4 字符 = 1 token
  const cjkTokens = Math.ceil(cjkChars / 1.3)
  const otherTokens = Math.ceil(otherChars / 4)

  return cjkTokens + otherTokens
}

// 模型 context window 配置
export const MODEL_CONTEXT_WINDOW = 128000
export const CONTEXT_WARNING_THRESHOLD = 0.75 // 75% 时显示警告
export const CONTEXT_DANGER_THRESHOLD = 0.9 // 90% 时显示危险

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
  estimatedTokens?: number
}

export interface Session {
  id: string
  name: string
  modified: number
  hasMessages: boolean
}

export interface MemoryEntry {
  id: string
  timestamp: string
  content: string
  sourceSessionId?: string
  sourceSessionName?: string
}

interface ChatState {
  // 当前会话
  messages: Message[]
  isLoading: boolean
  ws: WebSocket | null
  sessionId: string
  connected: boolean

  // Token 统计
  totalInputTokens: number
  totalOutputTokens: number
  systemPromptTokens: number

  // 会话列表
  sessions: Session[]
  showSidebar: boolean

  // 长期记忆
  memoryContent: string
  memoryEntries: MemoryEntry[]
  showMemoryModal: boolean
  includeMemoryInContext: boolean

  // 智能记忆
  intelligentMemoryEntries: MemoryEntry[]
  showIntelligentMemoryModal: boolean
  memorySearchQuery: string
  isMemoryLoading: boolean

  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp' | 'estimatedTokens'>) => string
  updateMessage: (id: string, content: string, isStreaming?: boolean) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
  setWs: (ws: WebSocket | null) => void
  setConnected: (connected: boolean) => void
  setSessionId: (sessionId: string) => void

  // 会话列表 Actions
  setSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  removeSession: (sessionId: string) => void
  updateSession: (sessionId: string, updates: Partial<Session>) => void
  switchSession: (sessionId: string) => void
  createNewSession: () => Promise<void>
  toggleSidebar: () => void
  renameSession: (sessionId: string, name: string) => Promise<boolean>

  // 长期记忆 Actions
  loadMemory: () => Promise<void>
  appendMemory: (content: string) => Promise<boolean>
  setShowMemoryModal: (show: boolean) => void
  setIncludeMemoryInContext: (include: boolean) => void

  // 智能记忆 Actions
  setShowIntelligentMemoryModal: (show: boolean) => void
  setMemorySearchQuery: (query: string) => void
  loadIntelligentMemories: (limit?: number) => Promise<void>
  searchIntelligentMemories: (query: string) => Promise<void>
  appendIntelligentMemory: (content: string, sourceSessionId?: string, sourceSessionName?: string) => Promise<boolean>

  // Token 统计 Actions
  addMessagesFromHistory: (messages: Array<{ role: string; content: string }>) => void
  setSystemPromptTokens: (tokens: number) => void
}

// localStorage keys
const LAST_SESSION_KEY = 'pi-agent-last-session'

// 从 localStorage 获取最后会话
const getLastSessionId = () => {
  try {
    return localStorage.getItem(LAST_SESSION_KEY) || undefined
  } catch {
    return undefined
  }
}

// 保存最后会话到 localStorage
const saveLastSessionId = (sessionId: string) => {
  try {
    localStorage.setItem(LAST_SESSION_KEY, sessionId)
  } catch {
    // ignore
  }
}

export const useChatStore = create<ChatState>()(
  immer((set, get) => ({
    // 当前会话
    messages: [],
    isLoading: false,
    ws: null,
    sessionId: getLastSessionId() || `session_${Date.now()}`,
    connected: false,

    // Token 统计
    totalInputTokens: 0,
    totalOutputTokens: 0,
    systemPromptTokens: 0,

    // 会话列表
    sessions: [],
    showSidebar: true,

    // 长期记忆
    memoryContent: '',
    memoryEntries: [],
    showMemoryModal: false,
    includeMemoryInContext: false,

    // 智能记忆
    intelligentMemoryEntries: [],
    showIntelligentMemoryModal: false,
    memorySearchQuery: '',
    isMemoryLoading: false,

    // Actions
    addMessage: (message) => {
      const id = generateId()
      const estimatedTokens = estimateTokens(message.content)
      set((state) => {
        state.messages.push({
          ...message,
          id,
          timestamp: Date.now(),
          estimatedTokens,
        })
        if (message.role === 'user') {
          state.totalInputTokens += estimatedTokens
        } else {
          state.totalOutputTokens += estimatedTokens
        }
      })
      return id
    },

    // 从历史记录添加多条消息（用于初始化会话时）
    addMessagesFromHistory: (historyMessages) => {
      set((state) => {
        // 清除现有消息和 token 统计（但保留 systemPromptTokens）
        state.messages = []
        state.totalInputTokens = 0
        state.totalOutputTokens = 0

        // 添加历史消息并计算 token
        historyMessages.forEach((msg) => {
          const estimatedTokens = estimateTokens(msg.content)
          state.messages.push({
            id: generateId(),
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: Date.now(),
            estimatedTokens,
          })
          if (msg.role === 'user') {
            state.totalInputTokens += estimatedTokens
          } else if (msg.role === 'assistant') {
            state.totalOutputTokens += estimatedTokens
          }
        })
      })
    },

    // 设置 system prompt 的 token 数
    setSystemPromptTokens: (tokens: number) => {
      set((state) => {
        state.systemPromptTokens = tokens
      })
    },

    updateMessage: (id: string, content: string, isStreaming = false) =>
      set((state) => {
        const msg = state.messages.find((m) => m.id === id)
        if (msg) {
          const oldTokens = msg.estimatedTokens || 0
          const newTokens = estimateTokens(content)
          msg.content = content
          msg.isStreaming = isStreaming
          msg.estimatedTokens = newTokens

          // 更新总 token 数
          if (msg.role === 'assistant') {
            state.totalOutputTokens = state.totalOutputTokens - oldTokens + newTokens
          }
        }
      }),

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading
      }),

    clearMessages: () =>
      set((state) => {
        state.messages = []
        state.totalInputTokens = 0
        state.totalOutputTokens = 0
        // 注意：不清空 systemPromptTokens，因为它是会话级别的
      }),

    setWs: (ws) =>
      set((state) => {
        state.ws = ws
      }),

    setConnected: (connected) =>
      set((state) => {
        state.connected = connected
      }),

    setSessionId: (sessionId) => {
      saveLastSessionId(sessionId)
      set((state) => {
        state.sessionId = sessionId
      })
    },

    // 会话列表 Actions
    setSessions: (sessions) =>
      set((state) => {
        state.sessions = sessions
      }),

    addSession: (session) =>
      set((state) => {
        state.sessions.unshift(session)
      }),

    removeSession: (sessionId) =>
      set((state) => {
        state.sessions = state.sessions.filter((s) => s.id !== sessionId)
      }),

    updateSession: (sessionId, updates) =>
      set((state) => {
        const session = state.sessions.find((s) => s.id === sessionId)
        if (session) {
          Object.assign(session, updates)
        }
      }),

    switchSession: async (sessionId) => {
      const { ws, clearMessages, setSessionId } = get()

      // 清除当前消息和 token 统计
      clearMessages()

      // 设置新会话 ID
      setSessionId(sessionId)

      // 如果 WebSocket 已连接，订阅新会话并获取历史记录
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            data: { sessionId },
          })
        )
        ws.send(
          JSON.stringify({
            type: 'get_history',
            data: { sessionId },
            id: generateId(),
          })
        )
      }
    },

    createNewSession: async () => {
      const { setSessionId, clearMessages, ws, addSession, setSessions } = get()
      const newSessionId = `session_${Date.now()}`

      clearMessages()
      setSessionId(newSessionId)

      // 调用 API 创建新会话
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: newSessionId }),
        })
        const data = await response.json()
        if (data.success) {
          // 添加新会话到列表开头
          addSession({
            id: newSessionId,
            name: data.name || newSessionId,
            modified: Date.now(),
            hasMessages: false,
          })
        }
      } catch (error) {
        console.error('Failed to create session:', error)
      }

      // 如果 WebSocket 已连接，订阅新会话
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            data: { sessionId: newSessionId },
          })
        )
      }
    },

    toggleSidebar: () =>
      set((state) => {
        state.showSidebar = !state.showSidebar
      }),

    renameSession: async (sessionId: string, name: string) => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/name`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const data = await response.json()
        if (data.success) {
          get().updateSession(sessionId, { name })
          return true
        }
        return false
      } catch (error) {
        console.error('Failed to rename session:', error)
        return false
      }
    },

    // 记忆相关 Actions
    loadMemory: async () => {
      try {
        const response = await fetch('/api/memory')
        const data = await response.json()
        if (data.success) {
          set((state) => {
            state.memoryContent = data.content || ''
            state.memoryEntries = data.recent || []
          })
        }
      } catch (error) {
        console.error('Failed to load memory:', error)
      }
    },

    appendMemory: async (content: string) => {
      try {
        const response = await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        const data = await response.json()
        if (data.success) {
          get().loadMemory()
          return true
        }
        return false
      } catch (error) {
        console.error('Failed to append memory:', error)
        return false
      }
    },

    setShowMemoryModal: (show: boolean) =>
      set((state) => {
        state.showMemoryModal = show
      }),

    setIncludeMemoryInContext: (include: boolean) =>
      set((state) => {
        state.includeMemoryInContext = include
      }),

    // 智能记忆 Actions
    setShowIntelligentMemoryModal: (show: boolean) =>
      set((state) => {
        state.showIntelligentMemoryModal = show
      }),

    setMemorySearchQuery: (query: string) =>
      set((state) => {
        state.memorySearchQuery = query
      }),

    loadIntelligentMemories: async (limit = 20) => {
      set((state) => { state.isMemoryLoading = true })
      try {
        const response = await fetch(`/api/intelligent-memory/recent?limit=${limit}`)
        const data = await response.json()
        if (data.success) {
          set((state) => {
            state.intelligentMemoryEntries = data.results || []
          })
        }
      } catch (error) {
        console.error('Failed to load intelligent memories:', error)
      } finally {
        set((state) => { state.isMemoryLoading = false })
      }
    },

    searchIntelligentMemories: async (query: string) => {
      if (!query.trim()) {
        get().loadIntelligentMemories()
        return
      }
      set((state) => {
        state.isMemoryLoading = true
        state.memorySearchQuery = query
      })
      try {
        const response = await fetch(`/api/intelligent-memory/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        if (data.success) {
          set((state) => {
            state.intelligentMemoryEntries = data.results || []
          })
        }
      } catch (error) {
        console.error('Failed to search intelligent memories:', error)
      } finally {
        set((state) => { state.isMemoryLoading = false })
      }
    },

    appendIntelligentMemory: async (content: string, sourceSessionId?: string, sourceSessionName?: string) => {
      try {
        const response = await fetch('/api/intelligent-memory/append', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, sourceSessionId, sourceSessionName }),
        })
        const data = await response.json()
        if (data.success) {
          get().loadIntelligentMemories()
          return true
        }
        return false
      } catch (error) {
        console.error('Failed to append intelligent memory:', error)
        return false
      }
    },
  }))
)
