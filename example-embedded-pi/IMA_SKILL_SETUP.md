# IMA Skill 配置和使用指南

## ✅ 安装状态

IMA skill 已成功安装到：`workspace/skills/ima-skill/`

## 📋 下一步：获取 API 凭证

### 1. 获取 Client ID 和 API Key

访问：https://ima.qq.com/agent-interface

登录后获取：
- **Client ID**
- **API Key**

### 2. 配置凭证（二选一）

#### 方式 A：配置文件（推荐）

```bash
# Windows (Git Bash)
mkdir -p ~/.config/ima
echo "your_client_id" > ~/.config/ima/client_id
echo "your_api_key" > ~/.config/ima/api_key

# 或者直接在项目目录创建
mkdir -p workspace/.config/ima
echo "your_client_id" > workspace/.config/ima/client_id
echo "your_api_key" > workspace/.config/ima/api_key
```

#### 方式 B：环境变量

```bash
export IMA_OPENAPI_CLIENTID="your_client_id"
export IMA_OPENAPI_APIKEY="your_api_key"
```

## 🎯 Skill 功能

这个 skill 支持：

### 📚 知识库管理
- 上传文件到知识库（PDF、Word、PPT、Excel、图片等）
- 添加网页/微信文章到知识库
- 搜索知识库内容
- 浏览知识库列表
- 获取知识库详情

### 📝 笔记管理
- 创建笔记
- 追加内容到笔记
- 搜索笔记
- 浏览笔记本

## 🔧 API 信息

- **Base URL**: `https://ima.qq.com`
- **认证方式**: HTTP Headers
  - `ima-openapi-clientid`: Client ID
  - `ima-openapi-apikey`: API Key
  - `Content-Type`: `application/json`

## 📂 Skill 结构

```
workspace/skills/ima-skill/
├── SKILL.md                    # 主 skill 文档
├── knowledge-base/
│   ├── SKILL.md               # 知识库模块文档
│   ├── references/
│   │   └── api.md             # 完整 API 参考
│   └── scripts/
│       ├── preflight-check.cjs  # 文件类型检测
│       └── cos-upload.cjs     # COS 文件上传
└── notes/
    ├── SKILL.md               # 笔记模块文档
    └── references/
        └── api.md             # 笔记 API 参考
```

## 🚀 使用示例

### 上传文件到知识库

```
请帮我把这个文件上传到知识库：@/path/to/report.pdf
```

### 添加网页到知识库

```
请把这个网页添加到知识库：https://example.com/article
```

### 搜索知识库

```
在知识库中搜索一下关于"产品需求"的内容
```

### 创建笔记

```
帮我创建一篇笔记，记录一下今天的会议内容
```

## ⚠️ 重要注意事项

### UTF-8 编码（笔记模块）
- 所有写入笔记的内容必须是 UTF-8 编码
- 从文件读取内容时，先检测编码并转为 UTF-8
- PowerShell 5.1 环境需要特别注意

### 文件类型支持
- ✅ PDF、Word、PPT、Excel、Markdown、TXT
- ✅ 图片（PNG、JPG、WEBP）
- ✅ 音频（MP3、M4A、WAV、AAC）
- ✅ Xmind
- ❌ 视频文件
- ❌ Bilibili/YouTube 链接
- ❌ 本地 HTML 文件

### 文件大小限制
- Excel、TXT、Xmind、Markdown：10 MB
- 图片：30 MB
- PDF、Word、PPT、音频等：200 MB
- 音频文件额外限制：最长 2 小时

## 📖 详细文档

完整的使用说明和 API 参考请查看：
- `workspace/skills/ima-skill/SKILL.md` - 主文档
- `workspace/skills/ima-skill/knowledge-base/SKILL.md` - 知识库模块
- `workspace/skills/ima-skill/knowledge-base/references/api.md` - API 参考
- `workspace/skills/ima-skill/notes/SKILL.md` - 笔记模块

## 🆘 故障排除

### 问题：凭证无效
- 确认 Client ID 和 API Key 正确
- 检查文件权限（如果使用配置文件）
- 尝试使用环境变量方式

### 问题：文件上传失败
- 检查文件类型是否支持
- 检查文件大小是否超限
- 查看错误消息中的 errmsg

### 问题：中文乱码
- 确保内容是 UTF-8 编码
- PowerShell 5.1 环境需要特别处理
- 参考 SKILL.md 中的编码处理章节

---

## 下一步

1. 访问 https://ima.qq.com/agent-interface 获取凭证
2. 按上述方式配置凭证
3. 开始使用 IMA skill！
