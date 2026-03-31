/**
 * 长程任务测试 - 看能执行多少步
 */

import { getAutoresearchManager } from "./src/server/autoresearch/manager.js";

const arManager = getAutoresearchManager();

// 监听事件
arManager.on("taskCreated", (task) => {
  console.log(`✅ Task created: ${task.task_id}`);
  console.log(`   Goal: ${task.goal}`);
});

arManager.on("taskUpdated", (task) => {
  console.log(`🔄 Task updated: ${task.task_id}`);
  console.log(`   Status: ${task.status}`);
  console.log(`   Cycle: ${task.current_cycle}/${task.max_cycles}`);
});

arManager.on("log", (log) => {
  console.log(`[${log.type}] ${log.message}`);
});

arManager.on("taskCompleted", (task) => {
  console.log("🎉 任务完成！");
  console.log(`总共执行了 ${task.current_cycle} 步`);
  console.log(`最终状态:`, task.final_state);
  process.exit(0);
});

arManager.on("taskFailed", (task) => {
  console.log("❌ 任务失败！");
  console.log(`执行了 ${task.current_cycle} 步后失败`);
  console.log(`错误: ${task.error}`);
  process.exit(1);
});

// 启动长程任务
console.log("🚀 启动长程任务测试...");
console.log("目标: 分析当前项目的代码结构，找出可以优化的地方，并生成一个完整的重构方案");
console.log("最大步数: 20");
console.log("=".repeat(60));

arManager.startTask(
  "分析当前项目的代码结构，找出可以优化的地方，并生成一个完整的重构方案",
  20, // 最多20步
  true // 先用mock模式快速测试
);
