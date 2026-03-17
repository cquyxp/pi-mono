import fs from 'fs';

const html = fs.readFileSync('page.html', 'utf8');

console.log('='.repeat(80));
console.log('Pi 集成架构 - OpenClaw 文档');
console.log('='.repeat(80));
console.log();

// Extract the main content by looking for key sections
const sections = [
    'Pi 集成架构',
    '概述',
    '包依赖',
    '文件结构',
    '核心集成流程',
    '1. 运行嵌入式智能体',
    '2. 会话创建',
    '3. 事件订阅',
    '4. 提示',
    '工具架构',
    '工具管道',
    '工具定义适配器',
    '工具拆分策略',
    '系统提示构建',
    '会话管理',
    '会话文件',
    '会话缓存',
    '历史限制',
    '压缩',
    '认证与模型解析',
    '认证配置文件',
    '模型解析',
    '故障转移',
    'Pi 扩展',
    '压缩安全护栏',
    '上下文裁剪',
    '流式传输与块回复',
    '块分块',
    '思考/最终标签剥离',
    '回复指令',
    '错误处理',
    '错误分类',
    '思考级别回退',
    '沙箱集成',
    '提供商特定处理',
    'Anthropic',
    'Google/Gemini',
    'OpenAI',
    'TUI 集成',
    '与 Pi CLI 的主要区别',
    '未来考虑',
    '测试'
];

// Clean up the text
let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');

// Find and extract code blocks first
console.log('=== 代码块 ===\n');
const codeBlocks = html.match(/<pre[^>]*>[\s\S]*?<\/pre>/gi);
if (codeBlocks) {
    codeBlocks.forEach((block, i) => {
        const cleanBlock = block
            .replace(/<[^>]+>/g, '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"');
        console.log(`\n--- Code Block ${i + 1} ---`);
        console.log(cleanBlock.trim());
    });
}

console.log('\n\n' + '='.repeat(80));
console.log('=== 主要内容 ===');
console.log('='.repeat(80) + '\n');

// Extract content around section headers
const words = text.split(' ');
let output = '';
let inContent = false;

for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Check if we're at a section start
    for (const section of sections) {
        const sectionWords = section.split(' ');
        let match = true;
        for (let j = 0; j < sectionWords.length && i + j < words.length; j++) {
            if (words[i + j] !== sectionWords[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            if (!inContent && section === 'Pi 集成架构') {
                inContent = true;
            }
            if (inContent) {
                output += '\n\n## ' + section + '\n';
            }
            break;
        }
    }

    if (inContent) {
        output += word + ' ';
    }

    // Stop after "测试" section
    if (word === '测试' && inContent) {
        break;
    }
}

// Clean up and print
output = output
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .replace(/\s+\?/g, '?')
    .replace(/\s+!/g, '!')
    .replace(/\s+:/g, ':')
    .replace(/\s+;/g, ';')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\{/g, '\n{')
    .replace(/\}/g, '}\n')
    .trim();

console.log(output);

// Also save to a file
fs.writeFileSync('extracted-content.txt', output);
console.log('\n\n内容已保存到 extracted-content.txt');
