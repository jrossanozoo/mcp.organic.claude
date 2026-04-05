# Docker Deploy — Servidor MCP Organic/Dragon 2028

## Estado actual

**Fase 1**: El servidor MCP corre en modo STDIO (comunicación por stdin/stdout). Es el modo para uso local, integrado directamente con VS Code.

**Fase 2 (pendiente)**: Migrar a transporte HTTP/SSE para exponer el servidor en red y que múltiples puestos puedan accederlo simultáneamente.

---

## Fase 1: Build y uso local con Docker

### Build de la imagen

```bash
# Desde la raíz del proyecto (donde está el Dockerfile)
cd c:\Users\jrossano\Repositorios\server.mcp\organic.mcp.claude

# Build de la imagen
docker build -t mcp-organic:latest .

# Build con tag de versión específica
docker build -t mcp-organic:1.0.0 .
```

### Run en modo STDIO (Fase 1)

```bash
# Correr interactivo (modo STDIO estándar)
docker run -it --rm mcp-organic:latest

# Con variables de entorno personalizadas
docker run -it --rm \
  -e DEFAULT_BUSINESS_LINE=dragon2028 \
  -e LOG_LEVEL=debug \
  mcp-organic:latest
```

### Compilar primero (pre-requisito)

El Dockerfile copia desde `dist/`. Compilar antes de hacer build:

```bash
# Compilar TypeScript
npm run build

# Luego build Docker
docker build -t mcp-organic:latest .
```

### Script completo de actualización (Fase 1)

```powershell
# update-mcp.ps1 — Compilar y actualizar imagen Docker local
Set-Location "c:\Users\jrossano\Repositorios\server.mcp\organic.mcp.claude"

Write-Host "=== Compilando TypeScript ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Error en compilación"; exit 1 }

Write-Host "=== Construyendo imagen Docker ===" -ForegroundColor Cyan
docker build -t mcp-organic:latest .
if ($LASTEXITCODE -ne 0) { Write-Error "Error en Docker build"; exit 1 }

Write-Host "=== Imagen actualizada: mcp-organic:latest ===" -ForegroundColor Green
```

---

## Fase 2: Exposición en red (HTTP/SSE) — Pendiente de implementación

### Cambios necesarios en el código

El transporte actual es STDIO (`StdioServerTransport`). Para red se necesita `StreamableHTTPServerTransport`:

```typescript
// Cambio en src/server.ts
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// En lugar de:
const transport = new StdioServerTransport();

// Usar:
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // stateless
});

const app = express();
app.post('/mcp', (req, res) => transport.handleRequest(req, res, req.body));
app.get('/mcp', (req, res) => transport.handleRequest(req, res));
app.delete('/mcp', (req, res) => transport.handleRequest(req, res));
app.listen(3000);
```

### Dockerfile para Fase 2 (cuando se implemente)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY src/knowledge/ ./src/knowledge/

RUN mkdir -p logs

ENV NODE_ENV=production
ENV KNOWLEDGE_BASE_PATH=./src/knowledge
ENV DEFAULT_BUSINESS_LINE=organic
ENV LOG_LEVEL=info
ENV MCP_TRANSPORT=http
ENV MCP_PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

### docker-compose.yml para Fase 2

```yaml
version: '3.8'
services:
  mcp-organic:
    image: mcp-organic:latest
    container_name: zoo-mcp-server
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - KNOWLEDGE_BASE_PATH=./src/knowledge
      - DEFAULT_BUSINESS_LINE=organic
      - LOG_LEVEL=info
      - MCP_TRANSPORT=http
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

### Comandos Fase 2 (cuando se implemente)

```bash
# Levantar el servidor en red
docker compose up -d

# Ver logs
docker compose logs -f mcp-organic

# Detener
docker compose down

# Actualizar (rebuild + restart)
npm run build
docker build -t mcp-organic:latest .
docker compose up -d --force-recreate
```

### Configuración en clientes VS Code (Fase 2)

En el archivo `mcp.json` de cada puesto de trabajo:

```json
{
  "servers": {
    "zoo-mcp": {
      "type": "http",
      "url": "http://{IP_SERVIDOR}:3000/mcp",
      "headers": {}
    }
  }
}
```

> **Nota**: La URL debe incluir el esquema `http://` o `https://`. Las URLs sin esquema (solo `host:port`) pueden fallar con errores de conexión aunque el puerto sea accesible.

---

## Notas de mantenimiento

### Al agregar nuevo conocimiento

```powershell
# 1. Editar archivos en src/knowledge/
# 2. Compilar y rebuild
npm run build
docker build -t mcp-organic:latest .

# 3. Si el contenedor está corriendo (Fase 2):
docker compose up -d --force-recreate
```

### Al modificar código TypeScript (handlers, utils, etc.)

```powershell
# 1. Editar archivos en src/
# 2. Verificar compilación sin errores
npm run build

# 3. Rebuild imagen
docker build -t mcp-organic:latest .

# 4. Restart (Fase 2)
docker compose restart mcp-organic
```

### Versioning de la imagen

Se recomienda versionar con el formato `major.minor.patch` alineado al `package.json`:

```bash
# Tag con versión
docker build -t mcp-organic:1.1.0 -t mcp-organic:latest .

# Ver imágenes disponibles
docker images mcp-organic
```

---

## Variables de entorno disponibles

| Variable | Default | Descripción |
|---|---|---|
| `NODE_ENV` | `production` | Entorno de ejecución |
| `KNOWLEDGE_BASE_PATH` | `./src/knowledge` | Ruta a la base de conocimiento |
| `DEFAULT_BUSINESS_LINE` | `organic` | Línea de negocio por defecto |
| `LOG_LEVEL` | `info` | Nivel de logging (debug, info, warn, error) |
| `LOG_FILE` | (vacío) | Archivo de log (vacío = solo consola) |
| `BUSINESS_LINE` | (vacío) | Override forzado de línea de negocio |
