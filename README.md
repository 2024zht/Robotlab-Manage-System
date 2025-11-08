# Robotlab-Manage-System

## 如何部署？

### 必需软件

| 软件 | 版本要求 | 说明 |
|------|---------|------|
| **Node.js** | >= 16.0.0 | 推荐使用 18.x LTS |
| **npm** | >= 8.0.0 | 或使用 pnpm |
| **SQLite** | >= 3.x | 数据库 |
| **Git** | 最新版 | 代码管理 |

### 可选软件（生产环境推荐）

| 软件 | 用途 |
|------|------|
| **PM2** | 进程管理 |
| **Nginx** | 反向代理 |



### 系统要求

- **操作系统**: Linux (Ubuntu/CentOS), macOS, Windows
- **内存**: 最低 512MB，推荐 2GB+
- **磁盘**: 至少 1GB 可用空间
- **端口**: 
  - 后端默认: `3000`
  - 前端开发: `5173`
  - 生产环境建议: `80` (HTTP) / `443` (HTTPS)



## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/2024zht/Robotlab-Manage-System.git
cd Robotlab-Manage-System
```

### 2. 一键部署脚本（推荐）

创建并运行部署脚本：

```bash
# 创建部署脚本
cat > deploy.sh << 'EOF'
#!/bin/bash

echo "=========================================="
echo "🚀 实验室管理系统 - 自动部署脚本"
echo "=========================================="

# 1. 检查 Node.js
echo ""
echo "📦 [1/7] 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js >= 16"
    exit 1
fi
echo "✅ Node.js 版本: $(node -v)"
echo "✅ npm 版本: $(npm -v)"

# 2. 安装依赖
echo ""
echo "📦 [2/7] 安装依赖..."
echo "安装后端依赖..."
cd backend && npm install
echo "安装前端依赖..."
cd ../frontend && npm install
cd ..
echo "✅ 依赖安装完成"

# 3. 环境配置
echo ""
echo "⚙️  [3/7] 配置环境变量..."
if [ ! -f backend/.env ]; then
    echo "创建后端 .env 文件..."
    cat > backend/.env << 'ENVEOF'
# 端口
PORT=3000
JWT_SECRET=

DATABASE_PATH=./database.sqlite

# Backblaze B2配置 - 电子书存储
B2_BUCKET_NAME=

# Cloudflare Worker配置 - 电子书下载代理
CF_WORKER_URL=

# 前端地址
FRONTEND_URL=

# 邮箱配置
EMAIL_USER=
EMAIL_PASS=

NODE_ENV=production
ENVEOF
    echo "✅ 后端 .env 文件已创建（请根据实际情况修改）"
else
    echo "ℹ️  后端 .env 文件已存在"
fi

# 4. 初始化数据库
echo ""
echo "🗄️  [4/7] 初始化数据库..."
cd backend
npm run init-db
echo "✅ 数据库初始化完成"

# 5. 编译项目
echo ""
echo "🔨 [5/7] 编译项目..."
echo "编译后端..."
npm run build
echo "编译前端..."
cd ../frontend
npm run build
cd ..
echo "✅ 编译完成"

# 6. 测试运行
echo ""
echo "🧪 [6/7] 测试运行..."
echo "启动后端服务（测试5秒）..."
cd backend
timeout 5 npm start &
sleep 6
echo "✅ 后端服务正常"

# 7. 完成
echo ""
echo "=========================================="
echo "✅ [7/7] 部署完成！"
echo "=========================================="
echo ""
echo "📝 后续步骤："
echo "  1. 修改 backend/.env 配置文件"
echo "  2. 开发环境运行："
echo "     cd backend && npm run dev"
echo "  3. 生产环境运行："
echo "     cd backend && npm start"
echo "  4. 或使用 PM2（推荐）："
echo "     pm2 start ecosystem.config.js"
echo ""
echo "🔑 默认管理员账号："
echo "   用户名: admin"
echo "   密码: admin123"
echo ""
echo "🌐 访问地址："
echo "   开发环境前端: http://localhost:5173"
echo "   生产环境前端: http://localhost:3000 (需配置静态文件服务)"
echo "   后端 API: http://localhost:3000/api"
echo ""
EOF
```

### 3.启动后端服务

```bash
pm2 start dist/server.js --name robotlab-backend --cwd ~/robotlabmangesystem/backend/
```

### 4. 启动前端服务

**1.创建站点**

![image-20251103165402760](https://raw.githubusercontent.com/2024zht/image/main/image-20251103165402760.png)

**2.将编译好的前端文件放在网站根目录**

**3. 修改配置文件**

```bash
server {
    listen 80;
    listen 443 ssl;

    client_max_body_size 600M;
    # 添加这些超时配置
    client_body_timeout 600s;
    client_header_timeout 600s;
    send_timeout 600s;
    http2 on;
    server_name sdnuroboticlab.top www.sdnuroboticlab.top rlms.sdnuroboticlab.top;
    root /www/wwwroot/sdnuroboticlab.top; # <--- 你的前端文件根目录，已根据你的信息填写

    # 日志文件路径
    access_log  /www/wwwlogs/sdnuroboticlab.top.log;
    error_log  /www/wwwlogs/sdnuroboticlab.top.error.log;

    #CERT-APPLY-CHECK--START (宝塔面板SSL申请验证文件，请保留)
    include /www/server/panel/vhost/nginx/well-known/sdnuroboticlab.top.conf;
    #CERT-APPLY-CHECK--END

    #SSL-START (如果你申请了SSL，宝塔会自动填充这里)
    #error_page 404/404.html;
    #HTTP_TO_HTTPS_START
    set $isRedcert 1;
    if ($server_port != 443) {
        set $isRedcert 2;
    }
    if ( $uri ~ /\.well-known/ ) {
        set $isRedcert 1;
    }
    if ($isRedcert != 1) {
        rewrite ^(/.*)$ https://$host$1 permanent;
    }
    #HTTP_TO_HTTPS_END
    ssl_certificate    /www/server/panel/vhost/cert/sdnuroboticlab.top/fullchain.pem;
    ssl_certificate_key    /www/server/panel/vhost/cert/sdnuroboticlab.top/privkey.pem;
    ssl_protocols TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_ciphers EECDH+CHACHA20:EECDH+CHACHA20-draft:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_tickets on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    add_header Strict-Transport-Security "max-age=31536000";
    error_page 497  https://$host$request_uri;

    #SSL-END
    

    # 关键配置 1: API 反向代理
    # 所有以 /api 开头的请求，都转发到在 3010 端口运行的后端服务
    location /api {
        # 代理转发到你的后端服务地址和端口
        # 注意：这里的结尾一定不要带斜杠 "/"
        # 这样 Nginx 才会将 /api/health 完整地转发为 http://127.0.0.1:3010/api/health
        proxy_pass http://127.0.0.1:3010;

        # 以下是反向代理的标准请求头配置，建议全部保留
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 支持大文件上传（最大 600MB）
        client_max_body_size 600M;
        
        # 增加超时时间（大文件上传需要更多时间）
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # 关键配置 2: 处理前端 SPA (单页面应用) 路由
    # 这个 location 块要放在 API 代理之后
    # 所有其他请求（非/api），都认为是前端资源或前端路由
    location / {
        # 尝试按顺序查找文件: $uri (请求的文件) -> $uri/ (请求的目录) -> /index.html (回退到主页)
        # 这是让 Vue Router / React Router 正常工作的核心
        try_files $uri $uri/ /index.html;
        index index.html index.htm;
    }

    # 错误页配置
    error_page 404 /404.html;
    error_page 502 /502.html;

    # 静态资源缓存配置 (来自宝塔默认，是好的实践)
    location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$ {
        expires      30d;
        error_log /dev/null;
        access_log /dev/null;
    }

    location ~ .*\.(js|css)?$ {
        expires      12h;
        error_log /dev/null;
        access_log /dev/null;
    }

    # 禁止访问敏感文件 (来自宝塔默认，是好的实践)
    location ~ ^/(\.user.ini|\.htaccess|\.git|\.env|\.svn|\.project|LICENSE|README.md) {
        return 404;
    }

    # 宝塔的SSL证书验证目录相关设置，保留
    location ~ \.well-known {
        allow all;
    }
    
    # 禁止在证书验证目录放入敏感文件
    if ( $uri ~ "^/\.well-known/.*\.(php|jsp|py|js|css|lua|ts|go|zip|tar\.gz|rar|7z|sql|bak)$" ) {
        return 403;
    }

    # PHP相关配置，对于你的项目是无用的，可以安全地删除或注释掉
    # include enable-php-82.conf;
    # include /www/server/panel/vhost/rewrite/sdnuroboticlab.top.conf;
}
```

**4. 申请SSL证书**

![image-20251103170255524](https://raw.githubusercontent.com/2024zht/image/main/image-20251103170255524.png)