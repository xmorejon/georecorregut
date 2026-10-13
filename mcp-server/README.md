# GeoRecorregut MCP Server (`search-locations-mcp`)

Model Context Protocol (MCP) server for Google Cloud Run using the **Streamable HTTP** transport.
Provides the `search_locations` tool for the Gemini Enterprise Agent Platform.

---

## Architecture Overview

- **Protocol:** Model Context Protocol (MCP) using Streamable HTTP (`/mcp` endpoint).
- **Transport:** Streamable HTTP (replaces deprecated SSE).
- **Security:** Google Cloud IAM (`--no-allow-unauthenticated`). No plain API keys are used; callers authenticate via Google-signed OIDC bearer tokens.
- **Auto-registration:** Registered in Google Cloud **Agent Registry** via `--functional-type=mcp-server`.
- **Database:** Reads from Firestore collections (`collection_group('locations')` and fallback `collection('locations')`), using the same data model and accent-insensitive normalization as the original Cloud Function.

---

## Directory Structure

```
mcp-server/
├── Dockerfile          # Container specification for Cloud Run (Python 3.12-slim)
├── .dockerignore       # Excludes local artifacts
├── main.py             # MCP server implementation with FastMCP
├── requirements.txt    # Python dependencies (mcp, firebase-admin, uvicorn, starlette)
└── README.md           # Deployment and testing instructions
```

---

## Deployment to Cloud Run

The `--functional-type=mcp-server` flag belongs to the **`gcloud beta`** component.

### 1. Install the beta component (if not already installed)
```bash
gcloud components install beta
```

### 2. Deploy with `gcloud beta`
```bash
cd mcp-server

gcloud beta run deploy search-locations-mcp \
    --project=georecorregut \
    --region=europe-west1 \
    --source=. \
    --functional-type=mcp-server \
    --no-allow-unauthenticated
```

*(Alternatively, without the beta component, you can deploy the standard Cloud Run service using `gcloud run deploy search-locations-mcp --project=georecorregut --region=europe-west1 --source=. --no-allow-unauthenticated`).*

---

## Verify Registration in Agent Registry

Once deployed, verify that the MCP server is registered in the Agent Registry catalog:

```bash
gcloud agent-registry mcp-servers list --project=georecorregut
```

You can also inspect it in the Google Cloud Console under:
**Vertex AI / Cloud Run > MCP Servers / Agent Registry**.

---

## Grant Invoker Permissions for Manual Testing

Before connecting to Gemini Enterprise, grant your GCP user account the `roles/run.invoker` role:

```bash
gcloud run services add-iam-policy-binding search-locations-mcp \
    --member="user:MI_EMAIL" \
    --role="roles/run.invoker" \
    --region=europe-west1 \
    --project=georecorregut
```
*(Replace `MI_EMAIL` with your Google Cloud account email).*

---

## Manual Testing via Cloud Run Proxy

Because the service requires IAM authentication (`--no-allow-unauthenticated`), the easiest way to test it locally without manually generating OIDC identity tokens is through `gcloud run services proxy`:

### 1. Start the Local Authenticated Proxy

```bash
gcloud run services proxy search-locations-mcp --region=europe-west1 --project=georecorregut
```
*(This starts a local proxy at `http://127.0.0.1:8080` that automatically injects your gcloud credentials into requests).*

### 2. Verify Health / Root Endpoint

```powershell
curl.exe http://127.0.0.1:8080/
```

### 3. Initialize MCP Session

```powershell
curl.exe -X POST "http://127.0.0.1:8080/mcp" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test-client\",\"version\":\"1.0.0\"}}}'
```
*(Copy the `mcp-session-id` header returned from this response, e.g. `SESSION_ID`).*

### 4. List Tools (`tools/list`)

```powershell
curl.exe -X POST "http://127.0.0.1:8080/mcp" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -H "mcp-session-id: SESSION_ID" `
  -d '{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\",\"params\":{}}'
```

### 5. Call Tool (`tools/call`)

```powershell
curl.exe -X POST "http://127.0.0.1:8080/mcp" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -H "mcp-session-id: SESSION_ID" `
  -d '{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"search_locations\",\"arguments\":{\"country\":\"Italy\"}}}'
```
