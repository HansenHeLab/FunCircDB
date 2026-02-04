# FunCirc Technical Documentation & Deployment Guide

## 1. Technology Stack

This application is built using a modern **TypeScript** full-stack architecture.

### Frontend (Client)
- **Framework:** [React v18](https://react.dev/)
- **Language:** TypeScript
- **Build Tool:** [Vite](https://vitejs.dev/) (Extremely fast build tool)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching:** [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **Visualization:** [Recharts](https://recharts.org/) (Charts) & [D3.js](https://d3js.org/) (Complex SVG visualizations)
- **Styling:** CSS Modules / Vanilla CSS variables

### Backend (Server)
- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** [Express](https://expressjs.com/)
- **Language:** TypeScript
- **Data Handling:** In-memory JSON data processing (simulating a read-only database from flat files)

### Data Architecture
- **Source:** JSON files converted from R RDS files.
- **Storage:** Local filesystem (served from `server/data` or similar directories).
- **Access:** Data is loaded into memory on startup/request for fast access. High RAM efficiency is important.

---

## 2. Deployment Requirements

Since the application processes large JSON datasets in memory, **System Memory (RAM)** is the most critical requirement.

- **CPU:** Standard general-purpose vCPU (1-2 vCPU is usually sufficient).
- **Memory (RAM):**
  - Minimum: **2 GB** (depending on total size of JSON data).
  - Recommended: **4 GB+** if datasets grow or for better caching performance.
- **Disk:** Sufficient space to hold the Docker image and uncompressed JSON data files.

---

## 3. GCP Deployment Guide (Google Cloud Run)

We recommend using **Google Cloud Run** for deployment. It is serverless, handles SSL automatically, scales to zero when unused (saving costs), and is easy to update.

### Prerequisites for Developer
1.  **GCP Project:** Created with billing enabled.
2.  **Google Cloud SDK (`gcloud`):** Installed and authenticated.
3.  **Docker:** Installed locally.

### Step 1: Containerization (Docker)

Create a `Dockerfile` in the root of the project to build both client and server into a single deployable image.

**Example `Dockerfile`:**

```dockerfile
# --- Stage 1: Build Client ---
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
# Build React app to /app/client/dist
RUN npm run build 

# --- Stage 2: Build Server ---
FROM node:18-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
# Build Express app to /app/server/dist
RUN npm run build

# --- Stage 3: Production Runtime ---
FROM node:18-alpine
WORKDIR /app

# Copy server built files
COPY --from=server-build /app/server/dist ./dist
COPY --from=server-build /app/server/package*.json ./
# Install ONLY production dependencies
RUN npm ci --only=production

# Copy built client static files to server public folder
# Ensure your express app is configured to serve static files from this path
COPY --from=client-build /app/client/dist ./public

# Copy Data Files (CRITICAL: Ensure these exist)
# Assuming data is in server/data or similar
COPY server/data ./data
# COPY server/search_index ./search_index (if applicable)

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
```

*Note: You may need to adjust `server/src/index.ts` to serve the static client files if not already configured:*
```typescript
// In server/index.ts
app.use(express.static(path.join(__dirname, '../public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
```

### Step 2: Build & Push to Google Artifact Registry

```bash
# 1. Enable Artifact Registry API
gcloud services enable artifactregistry.googleapis.com

# 2. Create a repository (if not exists)
gcloud artifacts repositories create funcirc-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="FunCirc Docker Repository"

# 3. Configure Docker to authenticate with GCP
gcloud auth configure-docker us-central1-docker.pkg.dev

# 4. Build and Tag the image
# REPLACE [PROJECT-ID] with your actual GCP project ID
docker build -t us-central1-docker.pkg.dev/[PROJECT-ID]/funcirc-repo/funcirc-app:v1 .

# 5. Push the image
docker push us-central1-docker.pkg.dev/[PROJECT-ID]/funcirc-repo/funcirc-app:v1
```

### Step 3: Deploy to Cloud Run

```bash
gcloud run deploy funcirc-service \
    --image us-central1-docker.pkg.dev/[PROJECT-ID]/funcirc-repo/funcirc-app:v1 \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 4Gi \
    --cpu 2
```

**Key Flags:**
- `--memory 4Gi`: allocates 4GB RAM (Adjust based on dataset size).
- `--allow-unauthenticated`: Makes the website public.

### Step 4: Access
GCP will output a URL (e.g., `https://funcirc-service-xyz-uc.a.run.app`). Your app is now live!
