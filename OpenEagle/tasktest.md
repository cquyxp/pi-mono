🚀 指令：PiAgent 架构集成、连线与运行验证
背景：你已经生成了 models.py, prompts.py, engine.py, tools_adapter.py 等文件。
当前任务：现在不要生成新文件，而是审查、修正并连接现有代码，确保整个“发现式智能”闭环能真正跑通。请严格按照以下步骤执行：
1. 核心集成检查 (Integration Check)
请检查 engine.py 中的 DiscoveryLoopEngine 类，确保它正确地串联了所有模块：
状态初始化：确认 __init__ 或 run 方法正确实例化了 DiscoveryState。
循环驱动：确认 while 循环逻辑正确，且每次迭代都严格遵循 Hypothesis -> Plan -> Execute -> Reflect 的顺序。
数据传递：
确认 Hypothesis 步骤的输入包含了上一轮的 failed_attempts 和 memory_laws。
确认 Reflection 步骤的输出真的更新了 state 对象（特别是 memory_laws 的追加和 is_converged 的判断）。
关键修正：如果发现状态更新只是局部变量而未持久化到 self.state，请立即修复。
2. 工具执行层的“真实化” (Real Execution)
检查 tools_adapter.py 和 engine.py 的交互：
拒绝模拟：确保 execute_verification 方法真的调用了操作系统命令或网络搜索，而不是返回 mock 数据。
异常捕获：在工具执行层包裹 try-except 块。如果工具报错（如脚本超时、命令不存在），必须将错误信息转化为字符串，作为 observation 传给反思引擎，绝不能让程序崩溃退出。
超时保护：为所有 Shell/Code 执行添加 timeout 参数（例如 30 秒），防止死循环卡死主程序。
3. 提示词模板的动态组装 (Dynamic Prompt Assembly)
检查 prompts.py 的使用方式：
上下文注入：确认在调用 LLM 时，代码动态地将 state.verified_facts, state.memory_laws, state.failed_attempts 填充到了 Prompt 模板的占位符中。
结构化输出解析：确认代码能稳健地解析 LLM 返回的 JSON/Markdown。如果解析失败，应有重试机制或报错处理，而不是直接崩溃。
4. 创建“启动器”与“演示脚本” (Launcher & Demo)
为了验证架构，请创建一个名为 run_discovery_demo.py 的脚本：
功能：
实例化 DiscoveryLoopEngine。
定义一个具有挑战性且需要验证的任务（例如：“分析当前目录下最大的三个文件，并尝试压缩它们，如果压缩率低于 10% 则寻找其他优化方案”）。
启动引擎，并实时打印每一轮的关键日志：
[Cycle N] 🧠 假说: ...
[Cycle N] 🔧 执行: ... (耗时 Xs)
[Cycle N] 👁️ 观察: ...
[Cycle N] 💡 新法则: ...
循环结束后，打印最终合成的报告。
目的：让我能一眼看到“思考 - 行动 - 反思”的完整过程。
5. 可观测性增强 (Observability)
在 DiscoveryState 类中增加一个 to_dict() 或 save_to_json(filename) 方法。
在每一轮循环结束时，自动将当前状态保存为 state_cycle_N.json。这样我可以随时中断并复盘它的思考路径。
6. 最终自检清单 (Self-Correction)
在完成上述修改后，请在心里（或输出中）回答以下问题，如果有“否”，请继续修正代码：
如果第一轮验证失败了，第二轮的 Prompt 里是否明确包含了失败原因？
如果连续三轮都没有新发现，程序是否会强制停止或改变策略？
memory_laws 是否真的在后续轮次中被引用了？（检查 Prompt 构建逻辑）
行动指令：
请先审查现有代码，指出任何逻辑断点或数据流不通的地方，然后直接给出修复后的代码片段（特别是 engine.py 的主循环部分和 run_discovery_demo.py）。最后，告诉我如何运行这个 Demo。
