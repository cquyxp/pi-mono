import React, { useEffect, useState } from 'react'
import { Modal, Button, Input, TextArea, Spin, Toast, Empty, Tag } from '@douyinfe/semi-ui'
import { IconSave, IconSearch } from '@douyinfe/semi-icons'
import { useChatStore, type MemoryEntry } from '@/store/useChatStore'

interface IntelligentMemoryModalProps {
  visible: boolean
  onCancel: () => void
  currentSessionId?: string
  currentSessionName?: string
}

const IntelligentMemoryModal: React.FC<IntelligentMemoryModalProps> = ({
  visible,
  onCancel,
  currentSessionId,
  currentSessionName,
}) => {
  const {
    intelligentMemoryEntries,
    memorySearchQuery,
    isMemoryLoading,
    loadIntelligentMemories,
    searchIntelligentMemories,
    appendIntelligentMemory,
    setMemorySearchQuery,
  } = useChatStore()

  const [newMemoryContent, setNewMemoryContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      loadIntelligentMemories()
    }
  }, [visible, loadIntelligentMemories])

  const handleSearch = (value: string) => {
    setMemorySearchQuery(value)
    if (value.trim()) {
      searchIntelligentMemories(value)
    } else {
      loadIntelligentMemories()
    }
  }

  const handleSaveMemory = async () => {
    if (!newMemoryContent.trim()) {
      Toast.warning('请输入记忆内容')
      return
    }

    setIsSaving(true)
    const success = await appendIntelligentMemory(
      newMemoryContent,
      currentSessionId,
      currentSessionName
    )
    setIsSaving(false)

    if (success) {
      Toast.success('记忆已保存')
      setNewMemoryContent('')
    } else {
      Toast.error('保存失败')
    }
  }

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp.replace(' ', 'T'))
      return date.toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return timestamp
    }
  }

  return (
    <Modal
      title="智能记忆管理"
      visible={visible}
      onCancel={onCancel}
      width={800}
      style={{ maxHeight: '85vh' }}
      bodyStyle={{ maxHeight: '65vh', overflowY: 'auto' }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>关闭</Button>
        </div>
      }
    >
      <div style={{ marginBottom: '20px' }}>
        <Input
          placeholder="搜索记忆..."
          prefix={<IconSearch />}
          value={memorySearchQuery}
          onChange={handleSearch}
          showClear
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <TextArea
          placeholder="保存新的记忆内容..."
          value={newMemoryContent}
          onChange={setNewMemoryContent}
          autosize
          maxCount={2000}
          rows={3}
          showClear
        />
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            icon={<IconSave />}
            theme="solid"
            type="primary"
            onClick={handleSaveMemory}
            loading={isSaving}
            disabled={!newMemoryContent.trim()}
          >
            保存记忆
          </Button>
        </div>
      </div>

      <div>
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>
            记忆列表 ({intelligentMemoryEntries.length})
          </span>
          {isMemoryLoading && <Spin size="small" />}
        </div>

        {intelligentMemoryEntries.length === 0 && !isMemoryLoading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            title="暂无记忆"
            description="保存一些重要信息吧！"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {intelligentMemoryEntries.map((entry: MemoryEntry) => (
              <div
                key={entry.id}
                style={{
                  padding: '12px',
                  border: '1px solid var(--semi-color-border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--semi-color-fill-0)',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--semi-color-text-1)',
                  }}>
                    {formatDate(entry.timestamp)}
                  </span>
                  {entry.sourceSessionName && (
                    <Tag size="small" color="cyan">
                      {entry.sourceSessionName.length > 15
                        ? entry.sourceSessionName.substring(0, 15) + '...'
                        : entry.sourceSessionName}
                    </Tag>
                  )}
                </div>
                <div style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: 'var(--semi-color-text-0)',
                }}>
                  {entry.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default IntelligentMemoryModal
