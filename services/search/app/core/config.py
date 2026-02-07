"""Application configuration"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from monorepo root (5 levels up: core → app → search → services → root)
env_path = Path(__file__).resolve().parent.parent.parent.parent.parent / ".env"
load_dotenv(env_path)


class Settings:
    """Application settings"""
    
    # MongoDB
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    MONGODB_DATABASE: str = os.getenv("MONGODB_DATABASE", "product")
    MONGODB_COLLECTION: str = os.getenv("MONGODB_COLLECTION", "products")
    
    # Gemini AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    
    # Model
    MODEL_NAME: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    
    # API
    API_TITLE: str = "Construction Materials Semantic Search"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "Semantic search microservice for construction materials catalog"
    
    # CORS - Updated for WiFi testing between devices (Line 25-26)
    # Added: http://192.168.0.* pattern for local WiFi testing
    # Your friend's React app (port 3000) can now connect to your API (port 8000)
    CORS_ORIGINS: list = [
        "http://localhost:3000",           # Friend's local dev server
        "http://127.0.0.1:3000",           # Alternative localhost
        "http://192.168.0.*",              # ANY device on 192.168.0.x WiFi network
        "*"                                # Allow all origins (remove in production)
    ]
    
    def validate(self) -> None:
        """Validate required settings"""
        if not self.MONGODB_URI:
            raise ValueError("MONGODB_URI is required in environment variables")


settings = Settings()
