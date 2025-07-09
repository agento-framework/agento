# Production Deployment Guide

## 🚀 Production Architecture

### Recommended Infrastructure

```mermaid
graph TB
    A[Load Balancer] --> B[Agent Service 1]
    A --> C[Agent Service 2] 
    A --> D[Agent Service N]
    
    B --> E[PostgreSQL Primary]
    C --> E
    D --> E
    
    E --> F[PostgreSQL Replica]
    
    B --> G[Redis Cache]
    C --> G
    D --> G
    
    B --> H[Vector DB]
    C --> H
    D --> H
    
    I[Monitoring] --> B
    I --> C
    I --> D
    
    J[Logging] --> B
    J --> C
    J --> D
```

### Core Components

- **Agent Services**: Stateless Node.js/TypeScript applications
- **PostgreSQL**: Primary database for conversations and metadata
- **Redis**: Caching layer for performance optimization
- **Vector Database**: Pinecone/Weaviate for semantic search
- **Load Balancer**: NGINX or cloud load balancer
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack or cloud logging

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY docs/ ./docs/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S agento -u 1001

# Copy built application
COPY --from=builder --chown=agento:nodejs /app/dist ./dist
COPY --from=builder --chown=agento:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=agento:nodejs /app/package*.json ./

# Switch to non-root user
USER agento

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  agento:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://agento:${DB_PASSWORD}@postgres:5432/agento
      - REDIS_URL=redis://redis:6379
      - GROQ_API_KEY=${GROQ_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: 0.5
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=agento
      - POSTGRES_USER=agento
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    command: >
      postgres
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c work_mem=4MB
      -c maintenance_work_mem=64MB

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: >
      redis-server
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - agento
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## ☸️ Kubernetes Deployment

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: agento
```

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: agento-config
  namespace: agento
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  MAX_CONCURRENT_REQUESTS: "100"
  CACHE_TTL: "300"
```

### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: agento-secrets
  namespace: agento
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  REDIS_URL: <base64-encoded-redis-url>
  GROQ_API_KEY: <base64-encoded-groq-key>
  OPENAI_API_KEY: <base64-encoded-openai-key>
  ANTHROPIC_API_KEY: <base64-encoded-anthropic-key>
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agento
  namespace: agento
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agento
  template:
    metadata:
      labels:
        app: agento
    spec:
      containers:
      - name: agento
        image: agento:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: agento-config
        - secretRef:
            name: agento-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: agento-service
  namespace: agento
spec:
  selector:
    app: agento
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: agento-ingress
  namespace: agento
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: agento-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: agento-service
            port:
              number: 80
```

## 🔧 Production Configuration

### Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
MAX_CONCURRENT_REQUESTS=100

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/agento
DATABASE_POOL_SIZE=20
DATABASE_IDLE_TIMEOUT=30000

# Cache
REDIS_URL=redis://localhost:6379
CACHE_TTL=300
CACHE_MAX_SIZE=1000

# LLM Providers
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Vector Database
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=agento-vectors

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-char-encryption-key
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
PROMETHEUS_PORT=9090

# Feature Flags
ENABLE_CONTEXT_ORCHESTRATION=true
ENABLE_VECTOR_SEARCH=true
ENABLE_CONVERSATION_PERSISTENCE=true
```

### Production Agent Configuration

```typescript
import { Agent } from 'agento-framework';
import { ProductionLogger } from './logging';
import { MetricsCollector } from './metrics';
import { HealthChecker } from './health';

const logger = new ProductionLogger();
const metrics = new MetricsCollector();
const healthChecker = new HealthChecker();

// Production optimized configuration
const productionAgent = new Agent({
  states: productionStates,
  contexts: productionContexts,
  tools: productionTools,
  defaultLLMConfig: {
    provider: "groq",
    model: "llama3-8b-8192",
    temperature: 0.3,
    maxTokens: 2048,
  },
  conversationConfig: {
    storage: new ProductionConversationStorage(),
    maxWorkingMemoryMessages: 30,
    enableSummarization: true,
    maxContextTokens: 6000,
    defaultRelevanceStrategy: "hybrid",
  },
  contextOrchestratorConfig: {
    contextLLMConfig: {
      provider: "groq",
      model: "llama3-8b-8192", 
      temperature: 0.2,
    },
    maxContextTokens: 6000,
    relevanceThreshold: 0.6,
    enableConceptMapping: true,
  },
  maxToolIterations: 5,
});

// Production middleware
export async function processQueryWithMiddleware(
  userId: string,
  query: string,
  sessionId?: string
) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  try {
    // Rate limiting
    await checkRateLimit(userId);
    
    // Input validation
    validateInput(query);
    
    // Process query
    logger.info('Processing query', { userId, sessionId, requestId });
    
    const result = await productionAgent.processQuery(userId, query, sessionId);
    
    // Collect metrics
    const duration = Date.now() - startTime;
    metrics.recordQuery(userId, query, result, duration);
    
    // Log success
    logger.info('Query processed successfully', {
      userId,
      sessionId,
      requestId,
      duration,
      confidence: result.confidence,
      selectedState: result.selectedState.key
    });
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Query processing failed', {
      userId,
      sessionId,
      requestId,
      duration,
      error: error.message,
      stack: error.stack
    });
    
    metrics.recordError(userId, error, duration);
    throw error;
  }
}
```

## 📊 Monitoring & Observability

### Health Check Endpoint

```typescript
import express from 'express';
import { Agent } from 'agento-framework';

const app = express();

app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    checks: {}
  };
  
  try {
    // Database check
    health.checks.database = await checkDatabase();
    
    // Redis check
    health.checks.cache = await checkRedis();
    
    // LLM provider check
    health.checks.llm = await checkLLMProviders();
    
    // Vector database check
    health.checks.vectorDB = await checkVectorDatabase();
    
    // Agent health check
    health.checks.agent = await checkAgentHealth();
    
    const failedChecks = Object.values(health.checks).filter(check => !check.healthy);
    
    if (failedChecks.length > 0) {
      health.status = failedChecks.length > 2 ? 'unhealthy' : 'degraded';
      res.status(503);
    } else {
      res.status(200);
    }
    
    res.json(health);
    
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    res.status(503).json(health);
  }
});

app.get('/metrics', async (req, res) => {
  const metrics = await collectMetrics();
  res.set('Content-Type', 'text/plain');
  res.send(formatPrometheusMetrics(metrics));
});
```

### Prometheus Metrics

```typescript
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Metrics
const queryCounter = new Counter({
  name: 'agento_queries_total',
  help: 'Total number of queries processed',
  labelNames: ['user_id', 'state', 'status']
});

const queryDuration = new Histogram({
  name: 'agento_query_duration_seconds',
  help: 'Query processing duration',
  labelNames: ['state'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const activeConnections = new Gauge({
  name: 'agento_active_connections',
  help: 'Number of active connections'
});

const toolExecutions = new Counter({
  name: 'agento_tool_executions_total',
  help: 'Total tool executions',
  labelNames: ['tool_name', 'status']
});

export class MetricsCollector {
  recordQuery(userId: string, query: string, result: any, duration: number) {
    queryCounter.inc({
      user_id: userId,
      state: result.selectedState.key,
      status: 'success'
    });
    
    queryDuration.observe(
      { state: result.selectedState.key },
      duration / 1000
    );
    
    result.toolResults.forEach(tool => {
      toolExecutions.inc({
        tool_name: tool.toolName,
        status: tool.success ? 'success' : 'error'
      });
    });
  }
  
  recordError(userId: string, error: Error, duration: number) {
    queryCounter.inc({
      user_id: userId,
      state: 'error',
      status: 'error'
    });
  }
}
```

## 🔒 Security Configuration

### NGINX Configuration

```nginx
upstream agento_backend {
    least_conn;
    server agento-1:3000 max_fails=3 fail_timeout=30s;
    server agento-2:3000 max_fails=3 fail_timeout=30s;
    server agento-3:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Request Size Limits
    client_max_body_size 1M;
    
    location / {
        proxy_pass http://agento_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Health Check
        proxy_next_upstream error timeout http_500 http_502 http_503;
    }
    
    location /health {
        proxy_pass http://agento_backend;
        access_log off;
    }
    
    location /metrics {
        proxy_pass http://agento_backend;
        allow 10.0.0.0/8;
        deny all;
    }
}
```

### Database Security

```sql
-- PostgreSQL security configuration
-- Create dedicated user
CREATE USER agento WITH PASSWORD 'secure_password';

-- Create database
CREATE DATABASE agento OWNER agento;

-- Grant minimal permissions
GRANT CONNECT ON DATABASE agento TO agento;
GRANT USAGE ON SCHEMA public TO agento;
GRANT CREATE ON SCHEMA public TO agento;

-- Enable row-level security
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY message_access_policy ON conversation_messages
  FOR ALL TO agento
  USING (session_id IN (
    SELECT id FROM conversation_sessions 
    WHERE user_id = current_setting('app.current_user_id')
  ));
```

## 🚀 Performance Optimization

### Connection Pooling

```typescript
import { Pool } from 'pg';
import Redis from 'ioredis';

// PostgreSQL connection pool
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  maxUses: 7500,
});

// Redis cluster configuration
const redis = new Redis.Cluster([
  { host: 'redis-1', port: 6379 },
  { host: 'redis-2', port: 6379 },
  { host: 'redis-3', port: 6379 },
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
  },
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
});
```

### Caching Strategy

```typescript
import { LRUCache } from 'lru-cache';

// Multi-level caching
class ProductionCache {
  private l1Cache: LRUCache<string, any>;
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
    this.l1Cache = new LRUCache({
      max: 1000,
      ttl: 300000, // 5 minutes
    });
  }
  
  async get(key: string): Promise<any> {
    // L1 cache (in-memory)
    let value = this.l1Cache.get(key);
    if (value) return value;
    
    // L2 cache (Redis)
    const redisValue = await this.redis.get(key);
    if (redisValue) {
      value = JSON.parse(redisValue);
      this.l1Cache.set(key, value);
      return value;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    // Set in both caches
    this.l1Cache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm test
    - run: npm run lint
    - run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - run: npm audit --audit-level high
    - name: Run Snyk
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build:
    needs: [test, security]
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Build Docker image
      run: |
        docker build -t agento:${{ github.sha }} .
        docker tag agento:${{ github.sha }} agento:latest
    - name: Push to registry
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker push agento:${{ github.sha }}
        docker push agento:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/agento agento=agento:${{ github.sha }}
        kubectl rollout status deployment/agento
```

## 📈 Scaling Guidelines

### Horizontal Scaling

- **Stateless Design**: Each agent instance is independent
- **Load Balancing**: Distribute requests across multiple instances
- **Database Scaling**: Use read replicas for query-heavy workloads
- **Cache Scaling**: Redis clustering for distributed caching

### Vertical Scaling

- **Memory**: 1-2GB per instance depending on conversation volume
- **CPU**: 2-4 cores for optimal LLM processing
- **Storage**: SSD storage for database and vector operations

### Auto-scaling Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: agento-hpa
  namespace: agento
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: agento
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

This deployment guide provides a comprehensive foundation for running Agento in production environments with security, scalability, and reliability best practices. 