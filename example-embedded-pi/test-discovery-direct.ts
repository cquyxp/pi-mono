import { DiscoveryLoopEngine, SimulatedLLMClient } from "./src/server/discovery/engine.js";
import { RealToolExecutor } from "./src/server/discovery/tools-adapter.js";
import { createDiscoveryState } from "./src/server/discovery/models.js";

async function testDiscovery() {
    console.log("=== 测试发现式智能引擎 ===");

    const llmClient = new SimulatedLLMClient();
    const toolExecutor = new RealToolExecutor(30);

    const engine = new DiscoveryLoopEngine({
        llmClient,
        toolExecutor,
        maxCycles: 3,
        onCycleUpdate: (state, cycle) => {
            console.log(`\n--- 第 ${cycle} 轮更新 ---`);
            console.log(`verification_actions: ${state.verification_actions.length}`);
            console.log(`observations: ${state.observations.length}`);
        },
    });

    const initialState = createDiscoveryState("分析这个项目的架构", 3);
    const finalState = await engine.run("分析这个项目的架构", initialState);

    console.log("\n=== 最终状态 ===");
    console.log(`cycle_count: ${finalState.cycle_count}`);
    console.log(`is_converged: ${finalState.is_converged}`);
    console.log(`final_synthesis 存在: ${finalState.final_synthesis ? "是" : "否"}`);
    if (finalState.final_synthesis) {
        console.log("\n=== 最终合成报告 ===");
        console.log(finalState.final_synthesis);
    }
}

testDiscovery().catch(console.error);