import React, { useRef, useEffect, useCallback, useState } from 'react'
import { Layout, Button, TextArea, Spin, Avatar, Tooltip, Toast, Popconfirm, Switch, Typography, Tag, Slider, Card } from '@douyinfe/semi-ui'
import { IconSend, IconClear, IconMenu, IconPlus, IconDelete, IconEdit, IconSetting, IconBookmark, IconSearch } from '@douyinfe/semi-icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import classNames from 'classnames'
import { useChatStore, type Message, type Session, MODEL_CONTEXT_WINDOW, CONTEXT_WARNING_THRESHOLD, CONTEXT_DANGER_THRESHOLD } from '@/store/useChatStore'
import SettingsModal from './SettingsModal'
import IntelligentMemoryModal from './IntelligentMemoryModal'
import styles from './ChatPage.module.less'

const { Text } = Typography

interface DiscoveryTask {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  goal: string
  current_cycle: number
  max_cycles: number
  is_converged: boolean
  final_state?: any
  cycle_states?: Record<number, any>
  error?: string
}

const { Header, Content, Footer } = Layout

// 生成唯一 ID
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// 格式化日期
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 今天
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  // 昨天
  if (diff < 48 * 60 * 60 * 1000) {
    return '昨天'
  }
  // 本周
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return days[date.getDay()]
  }
  // 更早
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const ChatPage: React.FC = () => {
  const {
    messages,
    isLoading,
    ws,
    sessionId,
    connected,
    sessions,
    showSidebar,
    addMessage,
    updateMessage,
    setLoading,
    clearMessages,
    setWs,
    setConnected,
    setSessionId,
    setSessions,
    addSession,
    removeSession,
    switchSession,
    createNewSession,
    toggleSidebar,
    renameSession,
    updateSession,
    totalInputTokens,
    totalOutputTokens,
    systemPromptTokens,
    addMessagesFromHistory,
    setSystemPromptTokens,
    intelligentMemoryEntries,
    showIntelligentMemoryModal,
    setShowIntelligentMemoryModal,
    loadIntelligentMemories,
    searchIntelligentMemories,
    appendIntelligentMemory,
  } = useChatStore()

  const [inputValue, setInputValue] = React.useState('')
  const [renamingSessionId, setRenamingSessionId] = React.useState<string | null>(null)
  const [renamingName, setRenamingName] = React.useState('')
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false)
  const [showSettingsModal, setShowSettingsModal] = React.useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const currentAssistantMsgId = useRef<string | null>(null)
  const userScrolledUpRef = useRef(false)
  const promptTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastPromptIdRef = useRef<string | null>(null)

  // 发现式智能相关状态
  const [isDiscoveryMode, setIsDiscoveryMode] = React.useState(false)
  const [discoveryMaxCycles, setDiscoveryMaxCycles] = React.useState(3)
  const [discoveryUseRealLLM, setDiscoveryUseRealLLM] = React.useState(false)
  const [discoveryUseRealTools, setDiscoveryUseRealTools] = React.useState(true)
  const [currentDiscoveryTask, setCurrentDiscoveryTask] = React.useState<DiscoveryTask | null>(null)
  const [isStartingDiscovery, setIsStartingDiscovery] = React.useState(false)

  // 检查用户是否在底部附近
  const isUserNearBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return true
    const threshold = 150 // 距离底部 150px 内认为是在底部
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    return distanceFromBottom <= threshold
  }, [])

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      userScrolledUpRef.current = false
      setShowScrollToBottom(false)
    }
  }, [])

  // 监听用户滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const threshold = 150
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    userScrolledUpRef.current = distanceFromBottom > threshold
    setShowScrollToBottom(distanceFromBottom > 200)
  }, [])

  // 新消息时滚动（仅当用户在底部时）
  useEffect(() => {
    if (!userScrolledUpRef.current || !isLoading) {
      scrollToBottom()
    }
  }, [messages, scrollToBottom, isLoading])

  // 用户发送消息时强制滚动到底部
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'user') {
      userScrolledUpRef.current = false
      scrollToBottom()
    }
  }, [messages, scrollToBottom])

  // 当切换到新会话时，强制滚动到底部
  useEffect(() => {
    userScrolledUpRef.current = false
    scrollToBottom()
  }, [sessionId, scrollToBottom])

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/sessions/all')
      const data = await response.json()
      if (data.sessions) {
        setSessions(data.sessions)
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }, [setSessions])

  // 初始化：加载会话列表
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // 验证当前会话是否在列表中，如果不在则切换到第一个
  useEffect(() => {
    if (sessions.length > 0) {
      const sessionExists = sessions.some((s) => s.id === sessionId)
      if (!sessionExists) {
        // 如果不存在，使用第一个会话
        switchSession(sessions[0].id)
      }
    }
  }, [sessions, sessionId, switchSession])

  // 保存 sessionId 的 ref，避免 useEffect 频繁触发
  const sessionIdRef = useRef(sessionId)
  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  // 清除超时定时器
  const clearPromptTimeout = useCallback(() => {
    if (promptTimeoutRef.current) {
      clearTimeout(promptTimeoutRef.current)
      promptTimeoutRef.current = null
    }
  }, [])

  // 重置聊天状态（用于超时或错误恢复）
  const resetChatState = useCallback(() => {
    clearPromptTimeout()
    setLoading(false)
    currentAssistantMsgId.current = null
    lastPromptIdRef.current = null
  }, [clearPromptTimeout, setLoading])

  // 处理 WebSocket 消息
  const handleWebSocketMessage = useCallback((msg: any) => {
    console.log('[WebSocket] Received:', msg)

    // 如果是对当前 prompt 的响应，清除超时
    if (msg.id && msg.id === lastPromptIdRef.current) {
      clearPromptTimeout()
    }

    switch (msg.type) {
      case 'connected':
        // 连接状态已由头像绿点显示，不需要额外的 toast
        break

      case 'history':
        if (msg.data?.messages) {
          addMessagesFromHistory(msg.data.messages)
        }
        break

      case 'system_prompt':
        if (msg.data?.estimatedTokens !== undefined) {
          setSystemPromptTokens(msg.data.estimatedTokens)
        }
        break

      case 'partial_reply':
        if (currentAssistantMsgId.current && msg.data?.text !== undefined) {
          updateMessage(currentAssistantMsgId.current, msg.data.text, true)
        }
        break

      case 'block_reply':
        if (currentAssistantMsgId.current && msg.data?.text !== undefined) {
          updateMessage(currentAssistantMsgId.current, msg.data.text, false)
        }
        resetChatState()
        // 刷新会话列表
        loadSessions()
        break

      case 'reasoning_stream':
        // 可以在这里显示思考过程
        break

      case 'tool_result':
        // 可以在这里显示工具调用结果
        break

      case 'success':
        if (msg.data?.message) {
          console.log('[Success]', msg.data.message)
          // 检查是否是中断消息
          if (msg.data.message.includes('stopped') || msg.data.message.includes('interrupted')) {
            resetChatState()
          }
        }
        break

      case 'error':
        Toast.error(msg.data?.message || '发生错误')
        resetChatState()
        break

      case 'pong':
        break

      default:
        console.log('[WebSocket] Unknown message type:', msg.type)
    }
  }, [
    addMessagesFromHistory,
    clearPromptTimeout,
    loadSessions,
    resetChatState,
    setSystemPromptTokens,
    updateMessage,
  ])

  // 初始化 WebSocket 连接（只在组件挂载时创建一次）
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws`

    console.log('[WebSocket] Connecting to', wsUrl)
    const websocket = new WebSocket(wsUrl)

    let isSubscribed = false

    websocket.onopen = () => {
      console.log('[WebSocket] Connected')
      setConnected(true)
      // 订阅当前会话
      websocket.send(
        JSON.stringify({
          type: 'subscribe',
          data: { sessionId: sessionIdRef.current },
        })
      )
      isSubscribed = true
      // 获取历史记录
      websocket.send(
        JSON.stringify({
          type: 'get_history',
          data: { sessionId: sessionIdRef.current },
          id: generateId(),
        })
      )
    }

    websocket.onclose = () => {
      console.log('[WebSocket] Disconnected')
      setConnected(false)
      setWs(null)
    }

    websocket.onerror = (error) => {
      console.error('[WebSocket] Error:', error)
      Toast.error('WebSocket 连接失败')
    }

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleWebSocketMessage(message)
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error)
      }
    }

    setWs(websocket)

    return () => {
      console.log('[WebSocket] Cleaning up connection')
      websocket.onopen = null
      websocket.onclose = null
      websocket.onerror = null
      websocket.onmessage = null
      websocket.close()
    }
  }, [setConnected, setWs, handleWebSocketMessage]) // 移除 sessionId 依赖

  // 当 sessionId 变化时，通过现有连接订阅新会话
  useEffect(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Switching to session:', sessionId)
      clearMessages()
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
  }, [sessionId, ws, clearMessages])

  // 组件卸载时清理所有状态
  useEffect(() => {
    return () => {
      resetChatState()
    }
  }, [resetChatState])

  const handleSend = async () => {
    if (!inputValue.trim()) return

    // 如果是发现模式，启动发现任务
    if (isDiscoveryMode) {
      if (isStartingDiscovery || currentDiscoveryTask?.status === 'running') {
        Toast.warning('发现任务正在运行中，请稍候...')
        return
      }

      const userMessage = inputValue
      setInputValue('')
      addMessage({ role: 'user', content: userMessage })

      // 启动发现任务
      await startDiscoveryTask(userMessage)
      return
    }

    // 普通聊天模式
    if (isLoading || !ws || ws.readyState !== WebSocket.OPEN) {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        Toast.warning('正在连接服务器，请稍候...')
      }
      return
    }

    // 先清理之前的状态
    resetChatState()

    const userMessage = inputValue
    setInputValue('')
    addMessage({ role: 'user', content: userMessage })
    setLoading(true)

    // 如果是新会话的第一条消息，自动设置会话名称
    if (messages.length === 0) {
      const currentSession = sessions.find((s) => s.id === sessionId)
      if (currentSession && (!currentSession.name || currentSession.name === sessionId)) {
        const topic = extractTopicFromMessage(userMessage)
        renameSession(sessionId, topic)
      }
    }

    // 创建助手消息占位符
    currentAssistantMsgId.current = addMessage({
      role: 'assistant',
      content: '',
    })

    // 生成 prompt ID 并保存
    const promptId = generateId()
    lastPromptIdRef.current = promptId

    // 设置超时（5分钟）
    promptTimeoutRef.current = setTimeout(() => {
      console.warn('[Chat] Prompt timeout, resetting state')
      Toast.warning('请求超时，请重试')
      resetChatState()
    }, 5 * 60 * 1000)

    // 发送 prompt 消息
    ws.send(
      JSON.stringify({
        type: 'prompt',
        data: {
          sessionId,
          prompt: userMessage,
          provider: 'volcengine-coding',
          model: 'doubao-seed-2.0-code',
          thinkingLevel: 'medium',
        },
        id: promptId,
      })
    )
  }

  const handleStop = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'stop',
          data: { sessionId },
          id: generateId(),
        })
      )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearMessages = async () => {
    clearMessages()
    // 创建新会话
    await createNewSession()
    Toast.success('已创建新会话')
  }

  const handleDeleteSession = async (sessionIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/sessions/${sessionIdToDelete}`, {
        method: 'DELETE',
      })

      // 如果删除的是当前会话，先尝试切换到其他会话
      if (sessionIdToDelete === sessionId) {
        // 找到要删除会话的索引
        const currentIndex = sessions.findIndex(s => s.id === sessionIdToDelete)
        // 先从本地状态移除
        removeSession(sessionIdToDelete)

        // 计算目标会话索引
        const remainingSessions = sessions.filter(s => s.id !== sessionIdToDelete)
        if (remainingSessions.length > 0) {
          // 如果还有其他会话，切换到前一个或第一个
          const targetIndex = Math.min(currentIndex, remainingSessions.length - 1)
          switchSession(remainingSessions[Math.max(0, targetIndex)].id)
        } else {
          // 没有其他会话时才创建新会话
          createNewSession()
        }
      } else {
        // 删除的不是当前会话，直接移除
        removeSession(sessionIdToDelete)
      }
      Toast.success('会话已删除')
    } catch (error) {
      Toast.error('删除失败')
    }
  }

  const handleSwitchSession = (sessionIdToSwitch: string) => {
    if (sessionIdToSwitch === sessionId) return
    switchSession(sessionIdToSwitch)
  }

  // 开始重命名会话
  const handleStartRename = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation()
    setRenamingSessionId(session.id)
    setRenamingName(session.name && session.name !== session.id ? session.name : '')
  }

  // 保存重命名
  const handleSaveRename = async (sessionId: string) => {
    if (renamingName.trim()) {
      const success = await renameSession(sessionId, renamingName.trim())
      if (success) {
        Toast.success('会话名称已更新')
      } else {
        Toast.error('重命名失败')
      }
    }
    setRenamingSessionId(null)
    setRenamingName('')
  }

  // 取消重命名
  const handleCancelRename = () => {
    setRenamingSessionId(null)
    setRenamingName('')
  }

  // 重命名输入框键盘事件
  const handleRenameKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(sessionId)
    } else if (e.key === 'Escape') {
      handleCancelRename()
    }
  }

  // 从消息中提取主题（截取前20个字）
  const extractTopicFromMessage = (content: string) => {
    const trimmed = content.trim()
    if (trimmed.length <= 20) return trimmed
    return trimmed.substring(0, 20) + '...'
  }

  // 发现式智能相关函数
  const startDiscoveryTask = async (goal: string) => {
    if (!goal.trim()) {
      Toast.warning('请输入任务目标')
      return
    }

    setIsStartingDiscovery(true)
    try {
      const response = await fetch('/api/discovery/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          max_cycles: discoveryMaxCycles,
          use_real_llm: discoveryUseRealLLM,
          use_real_tools: discoveryUseRealTools,
        }),
      })
      const data = await response.json()
      if (data.success) {
        Toast.success('发现任务已启动')
        setCurrentDiscoveryTask(data)
        // 添加系统消息提示任务已启动
        addMessage({
          role: 'assistant',
          content: `🔍 **启动发现式智能任务**\n\n目标：${goal}\n\n最大循环次数：${discoveryMaxCycles}\n\n正在执行探索，请稍候...`,
        })
        // 开始轮询任务状态
        pollDiscoveryTask(data.task_id)
      } else {
        Toast.error(data.error || '启动任务失败')
      }
    } catch (error) {
      Toast.error('启动任务失败')
    } finally {
      setIsStartingDiscovery(false)
    }
  }

  const pollDiscoveryTask = async (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/discovery/status/${taskId}`)
        const data = await response.json()
        if (data.success) {
          setCurrentDiscoveryTask(data)

          // 如果任务完成或失败，停止轮询
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(interval)
            displayDiscoveryResult(data)
          }
        }
      } catch (error) {
        console.error('Failed to poll task status:', error)
      }
    }, 2000)
  }

  const displayDiscoveryResult = (task: DiscoveryTask) => {
    let resultContent = ''

    if (task.status === 'completed') {
      resultContent = `✅ **发现式智能任务完成**\n\n**目标：** ${task.goal}\n\n**循环次数：** ${task.current_cycle}/${task.max_cycles}\n\n**是否收敛：** ${task.is_converged ? '是' : '否'}\n\n`

      if (task.final_state) {
        const state = task.final_state

        // 如果有最终合成报告，优先显示
        if (state.final_synthesis) {
          resultContent += `## 📊 最终分析报告\n\n${state.final_synthesis}\n\n`
        }

        if (state.verified_facts && state.verified_facts.length > 0) {
          resultContent += `---\n\n## 📝 验证的事实\n\n${state.verified_facts.map((fact: string, i: number) => `${i + 1}. ${fact}`).join('\n')}\n\n`
        }
        if (state.memory_laws && state.memory_laws.length > 0) {
          resultContent += `---\n\n## 🧠 发现的法则\n\n${state.memory_laws.map((law: any, i: number) => `${i + 1}. ${law.content} (重要性: ${law.importance})`).join('\n')}\n\n`
        }
        if (state.hypotheses && state.hypotheses.length > 0) {
          resultContent += `---\n\n## 💡 假说结果\n\n${state.hypotheses.map((h: any, i: number) => `${i + 1}. ${h.content} [${h.status}, 置信度: ${h.confidence}]`).join('\n')}\n\n`
        }
      }
    } else {
      resultContent = `❌ **发现式智能任务失败**\n\n**目标：** ${task.goal}\n\n**错误：** ${task.error || '未知错误'}`
    }

    addMessage({
      role: 'assistant',
      content: resultContent,
    })
    setCurrentDiscoveryTask(null)
  }

  // 获取会话名称
  const getSessionName = (session: Session) => {
    if (session.name && session.name !== session.id) {
      return session.name
    }
    return `会话 ${formatDate(session.modified)}`
  }

  return (
    <Layout className={styles.layout}>
      <div className={styles.mainLayout}>
        {/* 侧边栏 */}
        <aside className={classNames(styles.sidebar, !showSidebar && styles.sidebarHidden)}>
          <div className={styles.sidebarHeader}>
            <Button
              icon={<IconPlus />}
              theme="solid"
              type="primary"
              onClick={async () => {
                await createNewSession();
              }}
              className={styles.newChatBtn}
            >
              新对话
            </Button>
          </div>
          <div className={styles.sidebarContent}>
            {sessions.map((session) => (
              <div
                key={session.id}
                className={classNames(
                  styles.sessionItem,
                  session.id === sessionId && styles.sessionItemActive
                )}
                onClick={() => !renamingSessionId && handleSwitchSession(session.id)}
              >
                <div className={styles.sessionIcon}>
                  💬
                </div>
                <div className={styles.sessionInfo}>
                  {renamingSessionId === session.id ? (
                    <input
                      type="text"
                      value={renamingName}
                      onChange={(e) => setRenamingName(e.target.value)}
                      onKeyDown={(e) => handleRenameKeyDown(e, session.id)}
                      onBlur={() => handleSaveRename(session.id)}
                      className={styles.renameInput}
                      placeholder="输入会话名称..."
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className={styles.sessionName}>
                      {getSessionName(session)}
                    </div>
                  )}
                  <div className={styles.sessionDate}>
                    {formatDate(session.modified)}
                  </div>
                </div>
                {renamingSessionId !== session.id && (
                  <>
                    <Tooltip content="重命名">
                      <Button
                        icon={<IconEdit />}
                        theme="borderless"
                        type="tertiary"
                        size="small"
                        onClick={(e) => handleStartRename(session, e)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="确定要删除这个会话吗？"
                      onConfirm={(e) => handleDeleteSession(session.id, e as React.MouseEvent)}
                    >
                      <Button
                        icon={<IconDelete />}
                        theme="borderless"
                        type="tertiary"
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* 聊天区域 */}
        <div className={styles.chatArea}>
          <Header className={styles.header}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className={styles.headerLeft}>
                  <Button
                    icon={<IconMenu />}
                    theme="borderless"
                    type="tertiary"
                    onClick={toggleSidebar}
                    className={styles.menuBtn}
                  />
                  <Avatar size="small" style={{
                    backgroundColor: connected ? '#10b981' : '#f59e0b',
                  }}>
                    {connected ? '●' : '○'}
                  </Avatar>
                  <span className={styles.title}>Pi Agent</span>
                  <span
                    className={classNames(styles.statusDot, {
                      [styles.statusOnline]: connected,
                    })}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {isLoading && (
                    <Button theme="borderless" type="tertiary" onClick={handleStop}>
                      停止
                    </Button>
                  )}
                  {/* 发现式智能模式切换 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', backgroundColor: isDiscoveryMode ? 'var(--semi-color-primary-light-default)' : 'var(--semi-color-fill-0)', borderRadius: '6px' }}>
                    <IconSearch style={{ color: isDiscoveryMode ? 'var(--semi-color-primary)' : 'var(--semi-color-text-2)' }} />
                    <Switch
                      size="small"
                      checked={isDiscoveryMode}
                      onChange={setIsDiscoveryMode}
                    />
                    <Text size="small" style={{ color: isDiscoveryMode ? 'var(--semi-color-primary)' : 'var(--semi-color-text-2)' }}>
                      发现模式
                    </Text>
                  </div>
                  <Tooltip content="记忆管理">
                    <Button
                      icon={<IconBookmark />}
                      theme="borderless"
                      type="tertiary"
                      onClick={() => setShowIntelligentMemoryModal(true)}
                    />
                  </Tooltip>
                  <Button
                    icon={<IconSetting />}
                    theme="borderless"
                    type="tertiary"
                    onClick={() => {
                      console.log('[Settings] Button clicked, current state:', showSettingsModal);
                      setShowSettingsModal(true);
                    }}
                  />
                  <Tooltip content="清空对话">
                    <Button
                      icon={<IconClear />}
                      theme="borderless"
                      type="tertiary"
                      onClick={handleClearMessages}
                    />
                  </Tooltip>
                </div>
              </div>
              <div className={styles.tokenStats}>
                <div className={styles.tokenItem}>
                  <span className={styles.tokenLabel}>系统:</span>
                  <span className={styles.tokenValue}>{systemPromptTokens.toLocaleString()}</span>
                </div>
                <div className={styles.tokenSeparator} />
                <div className={styles.tokenItem}>
                  <span className={styles.tokenLabel}>输入:</span>
                  <span className={styles.tokenValue}>{totalInputTokens.toLocaleString()}</span>
                </div>
                <div className={styles.tokenSeparator} />
                <div className={styles.tokenItem}>
                  <span className={styles.tokenLabel}>输出:</span>
                  <span className={styles.tokenValue}>{totalOutputTokens.toLocaleString()}</span>
                </div>
                <div className={styles.tokenSeparator} />
                <div className={styles.tokenItem}>
                  <span className={styles.tokenLabel}>总计:</span>
                  <span className={styles.tokenValue}>{(systemPromptTokens + totalInputTokens + totalOutputTokens).toLocaleString()}</span>
                </div>
                <div className={styles.tokenSeparator} />
                <div className={styles.tokenItem}>
                  <span className={styles.tokenLabel}>Context:</span>
                  <ContextUsageDisplay totalTokens={systemPromptTokens + totalInputTokens + totalOutputTokens} />
                </div>
              </div>
            </div>
          </Header>

          <Content className={styles.content}>
            <div
              className={styles.messagesContainer}
              ref={messagesContainerRef}
              onScroll={handleScroll}
            >
              {messages.length === 0 ? (
                <div className={styles.welcome}>
                  <div className={styles.welcomeIcon}>🤖</div>
                  <div className={styles.welcomeTitle}>你好！我是 Pi Agent</div>
                  <div className={styles.welcomeDesc}>有什么我可以帮助你的吗？</div>
                  {!connected && (
                    <div className={styles.connecting}>
                      <Spin size="small" />
                      <span>正在连接服务器...</span>
                    </div>
                  )}
                </div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
              )}
              {isLoading && !currentAssistantMsgId.current && (
                <div className={styles.loading}>
                  <Spin size="small" />
                  <span className={styles.loadingText}>正在思考...</span>
                </div>
              )}
              {showScrollToBottom && (
                <button
                  className={styles.scrollToBottomBtn}
                  onClick={scrollToBottom}
                  aria-label="滚动到底部"
                >
                  ↓
                </button>
              )}
            </div>
          </Content>

          {/* 发现模式配置面板 */}
          {isDiscoveryMode && (
            <div style={{
              padding: '12px 20px',
              backgroundColor: 'var(--semi-color-fill-0)',
              borderTop: '1px solid var(--semi-color-border)',
            }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text size="small">循环次数: {discoveryMaxCycles}</Text>
                  <Slider
                    value={discoveryMaxCycles}
                    onChange={setDiscoveryMaxCycles}
                    min={1}
                    max={10}
                    style={{ width: 120 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text size="small">真实 LLM</Text>
                  <Switch checked={discoveryUseRealLLM} onChange={setDiscoveryUseRealLLM} size="small" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text size="small">真实工具</Text>
                  <Switch checked={discoveryUseRealTools} onChange={setDiscoveryUseRealTools} size="small" />
                </div>
                {currentDiscoveryTask && (
                  <Tag color={currentDiscoveryTask.status === 'running' ? 'blue' : currentDiscoveryTask.status === 'completed' ? 'green' : 'red'}>
                    {currentDiscoveryTask.status === 'pending' ? '等待中' :
                     currentDiscoveryTask.status === 'running' ? `运行中 ${currentDiscoveryTask.current_cycle}/${currentDiscoveryTask.max_cycles}` :
                     currentDiscoveryTask.status === 'completed' ? '已完成' : '失败'}
                  </Tag>
                )}
              </div>
            </div>
          )}

          <Footer className={styles.footer}>
            <div className={styles.inputArea}>
              <TextArea
                value={inputValue}
                onChange={setInputValue}
                onKeyDown={handleKeyDown}
                placeholder={isDiscoveryMode ? "输入探索目标... (Enter 启动发现任务)" : "输入消息... (Enter 发送, Shift+Enter 换行)"}
                autosize
                maxCount={2000}
                showClear
                className={styles.textarea}
                disabled={!connected || (currentDiscoveryTask?.status === 'running')}
              />
              <Button
                icon={<IconSend />}
                theme="solid"
                type="primary"
                onClick={handleSend}
                loading={isLoading || isStartingDiscovery}
                disabled={!inputValue.trim() || !connected || (currentDiscoveryTask?.status === 'running')}
                className={styles.sendButton}
              />
            </div>
          </Footer>
        </div>
      </div>
      <SettingsModal
        visible={showSettingsModal}
        onCancel={() => setShowSettingsModal(false)}
      />
      <IntelligentMemoryModal
        visible={showIntelligentMemoryModal}
        onCancel={() => setShowIntelligentMemoryModal(false)}
        currentSessionId={sessionId}
        currentSessionName={sessions.find(s => s.id === sessionId)?.name}
      />
    </Layout>
  )
}

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user'

  return (
    <div className={classNames(styles.messageRow, isUser ? styles.userRow : styles.assistantRow)}>
      <div className={classNames(styles.avatar, isUser ? styles.userAvatar : styles.assistantAvatar)}>
        {isUser ? (
          <Avatar size="small" style={{ backgroundColor: '#111827' }}>
            你
          </Avatar>
        ) : (
          <Avatar size="small" style={{ backgroundColor: '#f3f4f6', color: '#111827' }}>
            Pi
          </Avatar>
        )}
      </div>
      <div className={classNames(styles.bubble, isUser ? styles.userBubble : styles.assistantBubble)}>
        {isUser ? (
          <div className={styles.messageContent}>{message.content}</div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} className={styles.markdown}>
            {message.content || (message.isStreaming ? '...' : '')}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}

const ContextUsageDisplay: React.FC<{ totalTokens: number }> = ({ totalTokens }) => {
  const usagePercent = Math.min((totalTokens / MODEL_CONTEXT_WINDOW) * 100, 100)
  const isWarning = usagePercent >= CONTEXT_WARNING_THRESHOLD * 100
  const isDanger = usagePercent >= CONTEXT_DANGER_THRESHOLD * 100

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span className={classNames(styles.tokenValue, {
        [styles.tokenWarningText]: isWarning,
        [styles.tokenDangerText]: isDanger,
      })}>
        {usagePercent.toFixed(1)}%
      </span>
      <div className={styles.contextBar}>
        <div
          className={classNames(styles.contextBarFill, {
            [styles.contextBarWarning]: isWarning,
            [styles.contextBarDanger]: isDanger,
          })}
          style={{ width: `${usagePercent}%` }}
        />
      </div>
      {(isWarning || isDanger) && (
        <span className={classNames(styles.contextWarningIcon, {
          [styles.contextDangerIcon]: isDanger,
        })}>
          ⚠️
        </span>
      )}
    </div>
  )
}

export default ChatPage
