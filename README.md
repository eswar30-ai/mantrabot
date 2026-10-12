# PatchMantra AI Assistant (Mantra Bot)

A production-grade, multi-lingual conversational AI assistant for **PatchMantra** transdermal patch therapy. Powered by **Flask**, **Groq LLaMA-3.3-70B**, **MySQL 8.0** with connection pooling, and a responsive web interface.

---

## Table of Contents
1. [Key Features](#key-features)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Repository Structure](#repository-structure)
4. [Prerequisites](#prerequisites)
5. [Environment Variables (.env)](#environment-variables-env)
6. [Local Development Setup](#local-development-setup)
7. [Production Server Deployment (Linux / Ubuntu / AWS / DigitalOcean)](#production-server-deployment-linux--ubuntu--aws--digitalocean)
   - [Step 1: System Packages Installation](#step-1-system-packages-installation)
   - [Step 2: MySQL Database Setup](#step-2-mysql-database-setup)
   - [Step 3: Application Code & Virtual Environment](#step-3-application-code--virtual-environment)
   - [Step 4: Configure Production Environment](#step-4-configure-production-environment)
   - [Step 5: Configure Systemd Service (Process Management)](#step-5-configure-systemd-service-process-management)
   - [Step 6: Configure Nginx as Reverse Proxy](#step-6-configure-nginx-as-reverse-proxy)
   - [Step 7: SSL Certificate (HTTPS) via Let's Encrypt Certbot](#step-7-ssl-certificate-https-via-lets-encrypt-certbot)
   - [Step 8: Firewall Configuration (UFW)](#step-8-firewall-configuration-ufw)
8. [Production Server Deployment (Windows Server)](#production-server-deployment-windows-server)
9. [Database Schema & Resilience](#database-schema--resilience)
10. [API Reference & Health Checks](#api-reference--health-checks)
11. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Key Features

- **Medical AI Assistant**: Answers user questions about transdermal patches based on curated Q&A knowledge bases.
- **Multilingual Support**: Supports English, Hindi, and Telugu with dynamic translations.
- **Persistent AI Disclaimer**: Static medical disclaimer line (*"Mantra Bot can make mistakes. Verify important medical information with a doctor."*) rendered cleanly at the bottom of the chat interface, automatically updated across supported languages.
- **Enterprise Database Architecture**:
  - Primary storage in **MySQL 8.0** using connection pooling (`MySQLConnectionPool`).
  - Automatic database and schema creation on boot.
  - Automatic migration of historical data from CSV files.
  - Dual-write / graceful fallback to local CSV files if MySQL is temporarily unreachable.
- **Session Tracking**: Tracks user profiles, therapy selections, and query/response conversation histories.

---

## Architecture & Tech Stack

- **Backend**: Python 3.10+, Flask 3.1, Flask-CORS
- **AI Engine**: Groq SDK (`llama-3.3-70b-versatile`, `qwen/qwen3.8-27B`)
- **Database**: MySQL 8.0 (`mysql-connector-python`) with connection pooling
- **Production WSGI Servers**: Gunicorn (Linux), Waitress (Windows/Cross-platform)
- **Web Reverse Proxy**: Nginx with SSL (Let's Encrypt)
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (no framework overhead)

---

## Repository Structure

```
├── app.py                  # Core Flask backend with API routes
├── database.py             # MySQL connection pooling, schema init, CRUD & migration
├── index.html              # Main responsive Chatbot application interface
├── chatbot.html            # Modal launcher wrapper for embedding in external sites
├── app.js                  # Frontend state management, multi-language & API integration
├── styles.css              # Custom styling, responsive breakpoints & micro-animations
├── quick_chips.json        # Curated therapies, categories, and Q&A dataset
├── requirements.txt        # Python dependency manifest
├── .env                    # Environment variables (API keys, DB config)
├── user_data.csv           # Backup CSV for user profiles
├── therapy_activity.csv    # Backup CSV for therapy logs
└── README.md               # Production deployment & operations guide
```

---

## Prerequisites

- **Python**: Version 3.10 or higher
- **MySQL Server**: Version 8.0 or higher
- **Git**: Installed on server
- **Groq API Key**: Active key from [console.groq.com](https://console.groq.com)
- **Domain & DNS**: Pointing to server IP (e.g. `mantrabot.patchmantra.com`)

---

## Environment Variables (.env)

Create or update `.env` in the root directory:

```ini
# Groq AI Credentials
GROQ_API_KEY=your_groq_api_key_here

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Base URL (Leave empty for relative paths or specify production domain)
API_BASE_URL=https://mantrabot.patchmantra.com

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mantra
DB_USER=mantra_user
DB_PASSWORD=your_strong_password_here
```

---

## Local Development Setup

### 1. Clone repository
```bash
git clone <repository_url>
cd eswar30-ai
```

### 2. Create and activate virtual environment
**Windows (PowerShell):**
```powershell
py -3.10 -m venv venv
.\venv\Scripts\activate
```

**Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Verify Database
Make sure MySQL service is running. If credentials in `.env` match your local MySQL server, database tables and migrations will execute automatically upon start.

### 5. Start development server
```bash
python app.py
```
Open [http://localhost:8000](http://localhost:8000) or [http://localhost:8000/chatbot.html](http://localhost:8000/chatbot.html) in your browser.

---

## Production Server Deployment (Linux / Ubuntu / AWS / DigitalOcean)

Follow these exact commands to deploy on a clean Ubuntu 22.04 / 24.04 LTS production server.

### Step 1: System Packages Installation

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv mysql-server nginx git ufw curl
```

### Step 2: MySQL Database Setup

1. Secure MySQL and open root shell:
```bash
sudo mysql_secure_installation
sudo mysql -u root -p
```

2. Inside MySQL prompt, create the database and dedicated application user:
```sql
CREATE DATABASE IF NOT EXISTS mantra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'mantra_user'@'localhost' IDENTIFIED BY 'YourStrongProductionPassword123!';
GRANT ALL PRIVILEGES ON mantra.* TO 'mantra_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Application Code & Virtual Environment

1. Create application directory under `/var/www/`:
```bash
sudo mkdir -p /var/www/patchmantra
sudo chown -R $USER:$USER /var/www/patchmantra
cd /var/www/patchmantra
```

2. Clone or copy code into `/var/www/patchmantra`:
```bash
git clone <repository_url> .
```

3. Create virtual environment and install production requirements:
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Configure Production Environment

Create `.env` inside `/var/www/patchmantra/.env`:
```bash
nano .env
```
Paste your production settings:
```ini
GROQ_API_KEY=your_actual_groq_api_key
HOST=127.0.0.1
PORT=8000
API_BASE_URL=https://mantrabot.patchmantra.com
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mantra
DB_USER=mantra_user
DB_PASSWORD=YourStrongProductionPassword123!
```
Set strict permissions for `.env`:
```bash
chmod 600 .env
```

### Step 5: Configure Systemd Service (Process Management)

Systemd ensures your chatbot runs as a background daemon, starts automatically on server reboot, and restarts if it ever crashes.

1. Create the systemd unit file:
```bash
sudo nano /etc/systemd/system/patchmantra.service
```

2. Paste the following configuration (adjust user and paths if different):
```ini
[Unit]
Description=PatchMantra AI Assistant Flask Application
After=network.target mysql.service
Wants=mysql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/patchmantra
Environment="PATH=/var/www/patchmantra/venv/bin"
ExecStart=/var/www/patchmantra/venv/bin/gunicorn --workers 4 --threads 2 --worker-class gthread --bind 127.0.0.1:8000 --timeout 120 --access-logfile /var/log/patchmantra_access.log --error-logfile /var/log/patchmantra_error.log app:app

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

3. Ensure correct file ownership and permissions:
```bash
sudo chown -R www-data:www-data /var/www/patchmantra
sudo touch /var/log/patchmantra_access.log /var/log/patchmantra_error.log
sudo chown www-data:www-data /var/log/patchmantra*.log
```

4. Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable patchmantra
sudo systemctl start patchmantra
sudo systemctl status patchmantra
```

### Step 6: Configure Nginx as Reverse Proxy

1. Create an Nginx site configuration file:
```bash
sudo nano /etc/nginx/sites-available/patchmantra
```

2. Add the following server configuration block:
```nginx
server {
    listen 80;
    server_name mantrabot.patchmantra.com;

    # Client body limit for file uploads/prompts
    client_max_body_size 16M;

    # Gzip compression for fast loading
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
        proxy_connect_timeout 60s;
    }

    # Cache static assets
    location /static/ {
        alias /var/www/patchmantra/static/;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }
}
```

3. Enable the site and restart Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/patchmantra /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: SSL Certificate (HTTPS) via Let's Encrypt Certbot

Secure your domain with an automatic, free SSL certificate:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mantrabot.patchmantra.com
```

Select option **2** (Redirect HTTP traffic to HTTPS). Certbot will automatically configure the SSL ciphers and renewal timer.

Test auto-renewal:
```bash
sudo certbot renew --dry-run
```

### Step 8: Firewall Configuration (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Production Server Deployment (Windows Server)

If hosting on Windows Server:

### 1. Running with Waitress (Production WSGI)
```powershell
.\venv\Scripts\waitress-serve --listen=0.0.0.0:8000 app:app
```

### 2. Running as a Persistent Windows Service using NSSM
1. Download **NSSM** (Non-Sucking Service Manager) from [nssm.cc](https://nssm.cc).
2. Install service:
```powershell
nssm.exe install PatchMantraService "D:\Git_Work\eswar30-ai\venv\Scripts\waitress-serve.exe" "--listen=0.0.0.0:8000 app:app"
nssm.exe set PatchMantraService AppDirectory "D:\Git_Work\eswar30-ai"
nssm.exe start PatchMantraService
```

---

## Database Schema & Resilience

The application connects to MySQL using a connection pool (`MySQLConnectionPool`) and auto-generates tables on startup:

### 1. `users` Table
Stores visitor profiles collected during the onboarding flow:
```sql
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL UNIQUE,
    name VARCHAR(150),
    mobile VARCHAR(50),
    role VARCHAR(50),
    specialization VARCHAR(150),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. `therapy_logs` Table
Tracks user selections of therapies:
```sql
CREATE TABLE IF NOT EXISTS therapy_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL,
    name VARCHAR(150),
    mobile VARCHAR(50),
    role VARCHAR(50),
    therapy_key VARCHAR(100),
    therapy_title VARCHAR(150),
    language VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_therapy (therapy_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. `chat_logs` Table
Stores full user questions and AI-generated answers:
```sql
CREATE TABLE IF NOT EXISTS chat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(128),
    role VARCHAR(50),
    therapy VARCHAR(100),
    language VARCHAR(50),
    user_query TEXT,
    bot_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Graceful Fallback (Dual Storage)
If MySQL is temporarily offline, the server logs the incident and writes directly to `user_data.csv` and `therapy_activity.csv`. The chatbot will **not crash or throw 500 errors** to users. Once MySQL is restored, previous CSV records can be migrated automatically.

---

## API Reference & Health Checks

| Endpoint | Method | Description |
|---|---|---|
| `/api/db-health` | `GET` | Health check returning MySQL connection status and table row counts |
| `/config` | `GET` | Provides configured `API_BASE_URL` to frontend |
| `/api/save-user` | `POST` | Saves/updates user profile (`session_id`, `name`, `mobile`, `role`, `specialization`) |
| `/api/log-therapy` | `POST` | Logs user therapy click event |
| `/api/chat-nitof` | `POST` | Processes free-form user question via Groq and logs to `chat_logs` |
| `/api/get-therapies` | `POST` | Fetches available therapies filtered by role |
| `/api/get-main-headings` | `POST` | Fetches topics for a specific therapy |
| `/api/get-all-heading-questions` | `POST` | Fetches questions for a topic heading |
| `/api/get-rephrased-answer` | `POST` | Fetches and rephrases an answer for a specific question ID |

### Quick Health Check Command
```bash
curl http://localhost:8000/api/db-health
```
Example Response:
```json
{
  "status": "healthy",
  "database": "mantra",
  "host": "localhost",
  "port": 3306,
  "counts": {
    "users": 13,
    "therapy_logs": 9,
    "chat_logs": 24
  }
}
```

---

## Monitoring & Maintenance

### View Live Logs
```bash
# Application logs (Gunicorn / Systemd)
sudo journalctl -u patchmantra -f

# Gunicorn file logs
tail -f /var/log/patchmantra_error.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Restart Service
```bash
sudo systemctl restart patchmantra
sudo systemctl restart nginx
```

### Database Backup (Daily Cron Job)
Backup MySQL database daily:
```bash
mysqldump -u mantra_user -p mantra > /var/backups/mantra_backup_$(date +\%F).sql
```

To automate daily at 2:00 AM, add to crontab (`sudo crontab -e`):
```cron
0 2 * * * mysqldump -u mantra_user -p'YourPassword' mantra > /var/backups/mantra_$(date +\%F).sql
```
