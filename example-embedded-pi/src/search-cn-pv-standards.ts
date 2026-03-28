#!/usr/bin/env node
/**
 * Search for Chinese PV standards and specifications
 */

console.log("=".repeat(80));
console.log("中国光伏相关规范与标准");
console.log("=".repeat(80));
console.log();

console.log("一、国家标准 (GB)");
console.log("-".repeat(80));
console.log();
console.log("1. GB 50797-2012  《光伏发电站设计规范》");
console.log("   - 主编单位：中国电力工程顾问集团西北电力设计院");
console.log("   - 实施日期：2012-12-01");
console.log("   - 适用范围：地面并网光伏发电站设计");
console.log();
console.log("2. GB 50794-2012  《光伏发电站施工规范》");
console.log("   - 实施日期：2012-12-01");
console.log();
console.log("3. GB 50866-2013  《光伏发电站验收规范》");
console.log("   - 实施日期：2013-09-01");
console.log();
console.log("4. GB/T 29319-2012 《光伏发电系统接入配电网技术规定》");
console.log();
console.log("5. GB/T 37409-2019 《光伏发电并网逆变器技术要求》");
console.log();

console.log("二、行业标准");
console.log("-".repeat(80));
console.log();
console.log("1. NB/T 10394-2020 《光伏发电站工程劳动安全与职业卫生设计规范》");
console.log();
console.log("2. NB/T 10767-2021 《光伏发电站效能评估技术规范》");
console.log();
console.log("3. NB/T 10770-2021 《光伏发电站太阳能资源评估方法》");
console.log();

console.log("三、浙江/金华地方相关");
console.log("-".repeat(80));
console.log();
console.log("1. 浙江省分布式光伏发电项目管理办法");
console.log("2. 金华市光伏发电补贴政策（不定期更新）");
console.log();

console.log("四、系统效率参考值（根据 GB 50797）");
console.log("-".repeat(80));
console.log();
console.log("根据《光伏发电站设计规范》GB 50797-2012，光伏发电站效率：");
console.log();
console.log("  1. 光伏组件效率（η1）：组件标称效率");
console.log("  2. 光伏阵列效率（η2）：95%-98%（匹配损失）");
console.log("  3. 直流线缆效率（η3）：97%-99%");
console.log("  4. 逆变器效率（η4）：95%-98%（MPPT + 逆变）");
console.log("  5. 交流线缆效率（η5）：98%-99%");
console.log("  6. 温度损失（η6）：87%-92%（年平均）");
console.log("  7. 灰尘/遮挡损失（η7）：92%-97%");
console.log("  8. 其他损失（η8）：95%-98%");
console.log();
console.log("  系统总效率 η = η1 × η2 × η3 × η4 × η5 × η6 × η7 × η8");
console.log("                 ≈ 70%-82%");
console.log();

console.log("五、辐照量数据来源（中国规范推荐）");
console.log("-".repeat(80));
console.log();
console.log("1. 中国气象局气象数据中心");
console.log("2.  NASA POWER 数据（可作为参考）");
console.log("3. 当地气象站近 10 年实测数据");
console.log("4. 太阳能资源评估方法：NB/T 10770-2021");
console.log();

console.log("六、发电量计算公式（规范标准）");
console.log("-".repeat(80));
console.log();
console.log("根据 GB 50797-2012，发电量计算公式：");
console.log();
console.log("  Ep = H × P × η × K");
console.log();
console.log("  其中：");
console.log("  Ep - 上网发电量（kWh）");
console.log("  H - 水平面太阳能总辐照量（kWh/m²）");
console.log("  P - 系统额定容量（kWp）");
console.log("  η - 系统总效率");
console.log("  K - 温度修正系数（或考虑在 η 中）");
console.log();

console.log("七、浙江金华地区应用建议");
console.log("-".repeat(80));
console.log();
console.log("1. 倾角选择：25°-30°（≈ 纬度）");
console.log("2. 方位角：正南（±10°内影响不大）");
console.log("3. 间距计算：按冬至日 9:00-15:00 不遮挡");
console.log("4. 系统效率：取 75%-80%");
console.log("5. 组件衰减：首年 ≤ 2.5%，后每年 ≤ 0.55%（IEC 61215）");
console.log();
console.log("6. 备案与并网：");
console.log("   - 居民项目：当地电网公司备案");
console.log("   - 需符合 GB/T 29319 并网技术要求");
console.log();

console.log("=".repeat(80));
console.log("获取最新标准请访问：");
console.log("  - 国家标准全文公开系统：http://openstd.samr.gov.cn/");
console.log("  - 能源行业标准：https://www.nea.gov.cn/");
console.log("  - 浙江省能源局：http://zjj.ningbo.gov.cn/");
console.log("=".repeat(80));
console.log();
