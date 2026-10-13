import os
import unicodedata
from typing import Optional, Dict, Any, List
import firebase_admin
from firebase_admin import firestore
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from starlette.responses import JSONResponse

# Lazy initialization of Firestore client to avoid startup overhead
_db = None

def get_db():
    global _db
    if _db is None:
        if not firebase_admin._apps:
            # Uses Application Default Credentials (ADC) in Google Cloud / Cloud Run
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "georecorregut")
            firebase_admin.initialize_app(options={"projectId": project_id})
        _db = firestore.client()
    return _db

def normalize_text(text: str) -> str:
    """
    Normalizes text for case-insensitive and accent-insensitive comparisons.
    Converts 'Japón' -> 'japon', 'España' -> 'espana', 'Còrsega' -> 'corsega', etc.
    """
    if not text:
        return ""
    normalized = unicodedata.normalize("NFD", text)
    stripped = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return stripped.lower().strip()

# Cloud Run dynamic port configuration
port = int(os.environ.get("PORT", "8080"))

# Non-guessable MCP endpoint path to reduce noise from random internet scanners.
# This is not a security boundary — the service is public — but it avoids trivial
# discovery by automated bots scanning common paths like /mcp.
MCP_PATH = "/mcp/jf5UcuSgWQl5MWohyUibZA"

# Transport security configuration for Cloud Run
# Disables localhost-only DNS rebinding protection so incoming requests
# through Cloud Run domains are accepted (required when allow-unauthenticated).
transport_security = TransportSecuritySettings(enable_dns_rebinding_protection=False)

# Initialize FastMCP server using the official MCP Python SDK
mcp = FastMCP(
    name="search-locations-mcp",
    instructions="MCP server to search and retrieve travel locations and visited places in GeoRecorregut.",
    host="0.0.0.0",
    port=port,
    streamable_http_path=MCP_PATH,
    transport_security=transport_security,
)

# Root and health check endpoints for Cloud Run container monitoring
@mcp.custom_route("/", methods=["GET"])
@mcp.custom_route("/health", methods=["GET"])
async def health_check(request):
    return JSONResponse({
        "status": "healthy",
        "service": "search-locations-mcp",
        "mcp_endpoint": MCP_PATH,
    })

# Define the single search_locations MCP tool
@mcp.tool(
    name="search_locations",
    description=(
        "Search for cities or places that the user has visited and recorded. Allows optional "
        "filtering by continent, country, location name, and whether it is marked as favorite "
        "(heart). If no filters are provided, returns all recorded places."
    ),
)
def search_locations(
    continent: Optional[str] = None,
    country: Optional[str] = None,
    name: Optional[str] = None,
    isFavorite: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Queries visited travel locations stored in Firestore with optional filters.
    Reuses the exact same filtering logic, accent normalization, and data model
    as the original searchLocations Cloud Function.
    """
    db = get_db()

    # The application stores locations under user subcollections: 'users/{userId}/locations'.
    # We query collection_group('locations') with a fallback to the root 'locations' collection.
    docs = list(db.collection_group("locations").stream())
    if not docs:
        docs = list(db.collection("locations").stream())

    all_locations: List[Dict[str, Any]] = []
    for doc_snap in docs:
        data = doc_snap.to_dict() or {}
        all_locations.append({
            "name": str(data.get("name") or ""),
            "country": str(data.get("country") or ""),
            "continent": str(data.get("continent") or ""),
            "isFavorite": bool(data.get("isFavorite", False)),
            "lat": float(data.get("lat") or 0.0),
            "lng": float(data.get("lng") or 0.0),
        })

    # Normalize filter parameters
    target_continent = normalize_text(continent) if continent and continent.strip() else None
    target_country = normalize_text(country) if country and country.strip() else None
    target_name = normalize_text(name) if name and name.strip() else None

    # In-memory filtering combining all active filters with logical AND
    filtered: List[Dict[str, Any]] = []
    for item in all_locations:
        if target_continent and normalize_text(item["continent"]) != target_continent:
            continue
        if target_country and normalize_text(item["country"]) != target_country:
            continue
        if target_name and target_name not in normalize_text(item["name"]):
            continue
        if isFavorite is not None and item["isFavorite"] != isFavorite:
            continue
        filtered.append(item)

    return {
        "count": len(filtered),
        "results": filtered,
    }

if __name__ == "__main__":
    # Runs the MCP server with the modern Streamable HTTP transport at MCP_PATH
    mcp.run(transport="streamable-http")
