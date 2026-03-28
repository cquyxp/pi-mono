import React, { useEffect, useState } from 'react'
import { Modal, Button, Input, TextArea, Spin, Toast, Empty, Tag, Card, Typography, Slider, Switch } from '@douyinfe/semi-ui'
import { IconSearch, IconPlay, IconRefresh } from '@douyinfe/semi-icons'

const { Title, Text } = Typography

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

interface DiscoveryModalProps {
  visible: boolean
  onCancel: () => void
}

const DiscoveryModal: React.FC<DiscoveryModalProps> = ({ visible, onCancel }) => {
  const [tasks, setTasks] = useState<DiscoveryTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [goal, setGoal] = useState('')
  const [maxCycles, setMaxCycles] = useState(3)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // 加载任务列表
  const loadTasks = async () => {
    try {
      const response = await fetch('/api/discovery/tasks')
      const data = await response.json()
      if (data.success && data.tasks) {
        setTasks(data.tasks)
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  // 获取任务详情
  const loadTaskDetails = async (taskId: string) => {
    try {
      const response = await fetch(`/api/discovery/status/${taskId}`)
      const data = await response.json()
      if (data.success) {
        setTasks(prev => prev.map(t => t.task_id === taskId ? data : t))
      }
    } catch (error) {
      console.error('Failed to load task details:', error)
    }
  }

  // 启动新任务
  const startTask = async () => {
    if (!goal.trim()) {
      Toast.warning('请输入任务目标')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/discovery/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          max_cycles: maxCycles,
        }),
      })
      const data = await response.json()
      if (data.success) {
        Toast.success('任务已启动')
        setGoal('')
        await loadTasks()
        setSelectedTaskId(data.task_id)
      } else {
        Toast.error(data.error || '启动任务失败')
      }
    } catch (error) {
      Toast.error('启动任务失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 轮询任务状态
  useEffect(() => {
    if (!visible) return

    loadTasks()

    // 定期刷新任务列表
    const interval = setInterval(() => {
      loadTasks()
      // 如果有选中的任务，也刷新它的详情
      if (selectedTaskId) {
        const task = tasks.find(t => t.task_id === selectedTaskId)
        if (task && (task.status === 'pending' || task.status === 'running')) {
          loadTaskDetails(selectedTaskId)
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [visible, selectedTaskId, tasks])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange'
      case 'running': return 'blue'
      case 'completed': return 'green'
      case 'failed': return 'red'
      default: return 'grey'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '等待中'
      case 'running': return '运行中'
      case 'completed': return '已完成'
      case 'failed': return '失败'
      default: return status
    }
  }

  const selectedTask = selectedTaskId ? tasks.find(t => t.task_id === selectedTaskId) : null

  return (
    <Modal
      title="发现式智能"
      visible={visible}
      onCancel={onCancel}
      width={900}
      style={{ maxHeight: '85vh' }}
      bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>关闭</Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 启动新任务 */}
        <Card title="启动新任务">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <TextArea
              placeholder="输入任务目标，例如：分析当前目录下最大的三个文件，并尝试压缩它们..."
              value={goal}
              onChange={setGoal}
              autosize
              maxCount={2000}
              rows={3}
              showClear
            />
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text>循环次数: {maxCycles}</Text>
                <Slider
                  value={maxCycles}
                  onChange={setMaxCycles}
                  min={1}
                  max={10}
                  style={{ width: 150 }}
                />
              </div>
              <Button
                icon={<IconPlay />}
                theme="solid"
                type="primary"
                onClick={startTask}
                loading={isLoading}
                disabled={!goal.trim()}
              >
                启动任务
              </Button>
            </div>
          </div>
        </Card>

        {/* 任务列表 */}
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>任务列表 ({tasks.length})</span>
              <Button
                icon={<IconRefresh />}
                theme="borderless"
                size="small"
                onClick={loadTasks}
              />
            </div>
          }
        >
          {tasks.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              title="暂无任务"
              description="启动一个新任务开始探索吧！"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tasks.map((task) => (
                <Card
                  key={task.task_id}
                  style={{
                    cursor: 'pointer',
                    border: selectedTaskId === task.task_id ? '2px solid var(--semi-color-primary)' : '1px solid var(--semi-color-border)',
                  }}
                  onClick={() => setSelectedTaskId(task.task_id)}
                  size="small"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Tag color={getStatusColor(task.status)} size="small">
                          {getStatusText(task.status)}
                        </Tag>
                        <Text size="small" type="secondary">
                          {task.current_cycle}/{task.max_cycles} 轮
                        </Text>
                        {task.is_converged && (
                          <Tag color="green" size="small">已收敛</Tag>
                        )}
                      </div>
                      <Text ellipsis={{ showTooltip: true, pos: 'middle' }}>
                        {task.goal}
                      </Text>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* 选中任务详情 */}
        {selectedTask && (
          <Card title="任务详情">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <Text strong>目标：</Text>
                <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedTask.goal}</Text>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <Text>状态：<Tag color={getStatusColor(selectedTask.status)}>{getStatusText(selectedTask.status)}</Tag></Text>
                <Text>进度：{selectedTask.current_cycle}/{selectedTask.max_cycles}</Text>
                <Text>收敛：{selectedTask.is_converged ? '是' : '否'}</Text>
              </div>
              {selectedTask.error && (
                <div>
                  <Text strong type="danger">错误：</Text>
                  <Text type="danger" style={{ whiteSpace: 'pre-wrap' }}>{selectedTask.error}</Text>
                </div>
              )}
              {selectedTask.cycle_states && Object.keys(selectedTask.cycle_states).length > 0 && (
                <div>
                  <Text strong>各轮状态：</Text>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {Object.keys(selectedTask.cycle_states).sort((a, b) => parseInt(a) - parseInt(b)).map((cycle) => (
                      <Tag key={cycle} color="blue">第 {cycle} 轮</Tag>
                    ))}
                  </div>
                </div>
              )}
              {selectedTask.final_state && (
                <div>
                  <Text strong>最终状态：</Text>
                  <div style={{ marginTop: '8px', padding: '12px', backgroundColor: 'var(--semi-color-fill-0)', borderRadius: '4px' }}>
                    <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
                      {JSON.stringify(selectedTask.final_state, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </Modal>
  )
}

export default DiscoveryModal
