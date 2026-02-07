"""MongoDB database operations"""
from typing import Dict, List, Optional
from pymongo import MongoClient
from bson import ObjectId
from app.core.config import settings


class DatabaseManager:
    """Manages MongoDB database operations"""
    
    def __init__(self):
        self.client: Optional[MongoClient] = None
        self.db = None
        self.collection = None
    
    def connect(self) -> None:
        """Establish MongoDB connection"""
        settings.validate()
        self.client = MongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
            socketTimeoutMS=60000,
        )
        self.db = self.client[settings.MONGODB_DATABASE]
        self.collection = self.db[settings.MONGODB_COLLECTION]
    
    def disconnect(self) -> None:
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
    
    def get_all_materials(self) -> List[Dict]:
        """Retrieve all materials from database (excluding special index documents)"""
        if self.collection is None:
            raise RuntimeError("Database not connected")
        
        materials = []
        # Exclude the special BM25 index document
        for doc in self.collection.find({"_id": {"$ne": "bm25_index"}}):
            doc['_id'] = str(doc['_id'])
            materials.append(doc)
        return materials
    
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
