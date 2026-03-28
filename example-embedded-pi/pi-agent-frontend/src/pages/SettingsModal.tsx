import React, { useEffect, useState } from 'react'
import { Modal, Button, Select, Input, Toast } from '@douyinfe/semi-ui'
import { IconSave } from '@douyinfe/semi-icons'
import { useChatStore } from '@/store/useChatStore'

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'groq', label: 'Groq' },
  { value: 'volcengine', label: '火山引擎 (Doubao)' },
]

const DEFAULT_BASE_URLS: Record<string, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  volcengine: 'https://ark.cn-beijing.volces.com/api/coding/v3',
}

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4o',
  groq: 'llama-3-3-70b-versatile',
  volcengine: 'doubao-seed-2.0-code',
}

interface SettingsModalProps {
  visible: boolean
  onCancel: () => void
}

const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onCancel }) => {
  const { ws } = useChatStore()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('volcengine')
  const [defaultProvider, setDefaultProvider] = useState('volcengine')
  const [providerConfigs, setProviderConfigs] = useState<Record<string, {
    apiKey: string
    baseUrl: string
    model: string
  }>>({})
  const [hasApiKey, setHasApiKey] = useState<Record<string, boolean>>({})

  const handleSave = () => {
    Toast.success('设置已保存')
    onCancel()
  }

  const updateProviderConfig = (provider: string, field: string, value: string) => {
    setProviderConfigs(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value,
      },
    }))
  }

  return (
    <Modal
      title="设置"
      visible={visible}
      onCancel={onCancel}
      width={700}
      style={{ maxHeight: '80vh' }}
      bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button onClick={onCancel}>取消</Button>
          <Button
            icon={<IconSave />}
            theme="solid"
            type="primary"
            onClick={handleSave}
            loading={loading}
          >
            保存
          </Button>
        </div>
      }
    >
      <div style={{ padding: '8px 0' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>默认提供商</label>
          <Select
            value={defaultProvider}
            onChange={(value) => {
              setDefaultProvider(value as string)
              setActiveTab(value as string)
            }}
            style={{ width: '100%' }}
            placeholder="选择默认提供商"
          >
            {PROVIDERS.map(p => (
              <Select.Option key={p.value} value={p.value}>
                {p.label}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div style={{ borderBottom: '1px solid var(--semi-color-border)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {PROVIDERS.map(p => (
              <button
                key={p.value}
                onClick={() => setActiveTab(p.value)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: activeTab === p.value ? 'var(--semi-color-primary)' : 'transparent',
                  color: activeTab === p.value ? 'white' : 'var(--semi-color-text-0)',
                  cursor: 'pointer',
                  borderRadius: '4px 4px 0 0',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>API Key</label>
            <Input
              type="password"
              placeholder={`输入 ${PROVIDERS.find(p => p.value === activeTab)?.label} API Key (留空使用环境变量)`}
              value={providerConfigs[activeTab]?.apiKey || ''}
              onChange={(value) => updateProviderConfig(activeTab, 'apiKey', value)}
            />
            {hasApiKey[activeTab] && (
              <div style={{ fontSize: '12px', color: 'var(--semi-color-success)', marginTop: '4px' }}>
                ✓ 已保存 API Key
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Base URL</label>
            <Input
              placeholder={DEFAULT_BASE_URLS[activeTab]}
              value={providerConfigs[activeTab]?.baseUrl || DEFAULT_BASE_URLS[activeTab] || ''}
              onChange={(value) => updateProviderConfig(activeTab, 'baseUrl', value)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Model</label>
            <Input
              placeholder={DEFAULT_MODELS[activeTab]}
              value={providerConfigs[activeTab]?.model || DEFAULT_MODELS[activeTab] || ''}
              onChange={(value) => updateProviderConfig(activeTab, 'model', value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default SettingsModal
