"""MongoDB database operations"""
import time
from typing import Dict, List, Optional
from pymongo import MongoClient
from pymongo.errors import AutoReconnect, ConnectionFailure
from bson import ObjectId
from app.core.config import settings


class DatabaseManager:
    """Manages MongoDB database operations"""
    
    def __init__(self):
        self.client: Optional[MongoClient] = None
        self.db = None
        self.collection = None
    
    def connect(self, max_retries: int = 5, retry_delay: int = 3) -> None:
        """Establish MongoDB connection with retry logic"""
        settings.validate()
        for attempt in range(1, max_retries + 1):
            try:
                self.client = MongoClient(
                    settings.MONGODB_URI,
                    serverSelectionTimeoutMS=30000,
                    connectTimeoutMS=30000,
                    socketTimeoutMS=60000,
                    retryReads=True,
                    retryWrites=True,
                )
                self.db = self.client[settings.MONGODB_DATABASE]
                self.collection = self.db[settings.MONGODB_COLLECTION]
                # Force a connection test
                self.client.admin.command('ping')
                print(f"✅ Connected to MongoDB (attempt {attempt})")
                return
            except (AutoReconnect, ConnectionFailure, ConnectionResetError) as e:
                if attempt < max_retries:
                    print(f"⚠️  MongoDB connection attempt {attempt} failed: {e}")
                    print(f"   Retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    raise
    
    def disconnect(self) -> None:
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
    
    def get_all_materials(self, max_retries: int = 3, retry_delay: int = 3) -> List[Dict]:
        """Retrieve all materials from database (excluding special index documents)"""
        if self.collection is None:
            raise RuntimeError("Database not connected")
        
        for attempt in range(1, max_retries + 1):
            try:
                materials = []
                # Exclude the special BM25 index document
                for doc in self.collection.find({"_id": {"$ne": "bm25_index"}}):
                    doc['_id'] = str(doc['_id'])
                    materials.append(doc)
                return materials
            except (AutoReconnect, ConnectionFailure, ConnectionResetError) as e:
                if attempt < max_retries:
                    print(f"⚠️  get_all_materials attempt {attempt} failed: {e}")
                    print(f"   Retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    raise
    
    def update_embedding(self, material_id: str, embedding: List[float]) -> None:
        """Update material embedding in database"""
        if self.collection is None:
            raise RuntimeError("Database not connected")
        
        self.collection.update_one(
            {"_id": ObjectId(material_id)},
            {"$set": {"embedding": embedding}}
        )
    
    def find_by_id(self, material_id: str) -> Optional[Dict]:
        """Find material by ID"""
        if self.collection is None:
            raise RuntimeError("Database not connected")
        
        doc = self.collection.find_one({"_id": ObjectId(material_id)})
        if doc:
            doc['_id'] = str(doc['_id'])
        return doc
