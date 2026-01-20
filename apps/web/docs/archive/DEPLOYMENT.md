# Fresh Salon - Deployment Guide

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the recommended deployment platform for Next.js applications.

#### Prerequisites
- Vercel account
- Vercel CLI installed: `npm i -g vercel`

#### Steps

1. **Login to Vercel**
   ```bash
   vercel login
   ```

2. **Deploy**
   ```bash
   # From the project root
   cd apps/web
   vercel
   ```

3. **Configure Environment Variables**
   - Go to Vercel Dashboard > Project Settings > Environment Variables
   - Add all required variables (see below)

4. **Production Deploy**
   ```bash
   vercel --prod
   ```

#### Vercel Configuration

Create `vercel.json` in project root:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

---

### Option 2: Docker

#### Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=fresh
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=fresh_salon

volumes:
  postgres_data:
```

#### Build & Run

```bash
# Build the image
docker build -t fresh-salon .

# Run with Docker Compose
docker-compose up -d
```

---

### Option 3: Traditional VPS (Ubuntu)

#### Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

#### Application Setup

```bash
# Clone repository
git clone <repository-url> /var/www/fresh
cd /var/www/fresh/apps/web

# Install dependencies
npm ci --production

# Build
npm run build

# Start with PM2
pm2 start npm --name "fresh" -- start
pm2 save
pm2 startup
```

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/fresh
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Enable Site & SSL

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/fresh /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install SSL with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for JWT signing | `your-super-secret-key-min-32-chars` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `https://yourdomain.com` |

### Stripe (Required for Payments)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `NODE_ENV` | Environment | `production` |

---

## Database Setup

### PostgreSQL on Vercel

Use Vercel Postgres:
1. Go to Vercel Dashboard > Storage
2. Create a new Postgres database
3. Copy the connection string to `DATABASE_URL`

### PostgreSQL on Docker

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: fresh_salon
      POSTGRES_USER: fresh
      POSTGRES_PASSWORD: your-password
    volumes:
      - ./database/fresha.sql:/docker-entrypoint-initdb.d/init.sql
```

### Run Migrations

```bash
# Apply migrations
psql $DATABASE_URL -f database/migrations.sql
```

---

## CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: apps/web/package-lock.json
      
      - name: Install dependencies
        run: cd apps/web && npm ci
      
      - name: Run linting
        run: cd apps/web && npm run lint
      
      - name: Build
        run: cd apps/web && npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: apps/web
```

---

## Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database connected and migrated
- [ ] SSL certificate installed
- [ ] Stripe webhooks configured
- [ ] Email service configured
- [ ] Error monitoring setup (Sentry)
- [ ] Analytics configured
- [ ] CDN configured for static assets
- [ ] Backup strategy implemented
- [ ] Health check endpoint working

---

## Monitoring

### Recommended Tools

- **Vercel Analytics**: Built-in with Vercel
- **Sentry**: Error tracking
- **Uptime Robot**: Uptime monitoring
- **LogRocket**: Session replay

### Health Check Endpoint

Add `/api/health` route:

```javascript
// src/app/api/health/route.js
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
}
```

---

## Rollback Procedure

### Vercel

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback
```

### Docker

```bash
# List images
docker images

# Run previous version
docker run -d fresh-salon:previous-tag
```

### PM2

```bash
# Rollback with git
git checkout <previous-commit>
npm ci --production
npm run build
pm2 restart fresh
```
