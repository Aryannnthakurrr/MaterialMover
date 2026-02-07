"""Semantic search service for construction materials"""
from typing import List, Dict, Any
from datetime import datetime
import numpy as np
from sentence_transformers import SentenceTransformer
from bson.objectid import ObjectId

from app.core.config import settings
from app.core.database import DatabaseManager


class SemanticSearchEngine:
    """Semantic search engine using sentence transformers and cosine similarity"""
    
    def __init__(self):
        self.model_name = settings.MODEL_NAME
        self.model: SentenceTransformer = None
        self.db_manager = DatabaseManager()
        self.materials: List[Dict] = []
        self.embeddings: np.ndarray = np.array([])
    
    def initialize(self) -> None:
        """Initialize model, database connection, and load materials"""
        print(f"Loading model: {self.model_name}...")
        self.model = SentenceTransformer(self.model_name)
        
        print("Connecting to MongoDB...")
        self.db_manager.connect()
        
        self._load_materials_with_embeddings()
    
    def shutdown(self) -> None:
        """Clean up resources"""
        self.db_manager.disconnect()
    
    def _load_materials_with_embeddings(self) -> None:
        """Load materials from database and generate embeddings if needed"""
        print("Loading materials from database...")
        
        all_materials = self.db_manager.get_all_materials()
        total_count = len(all_materials)
        
        if total_count == 0:
            print("⚠️  No materials found in database")
            return
        
        materials_with_embeddings = []
        embeddings_list = []
        materials_without_embeddings = []
        
        # Separate materials with and without embeddings
        for material in all_materials:
            if 'embedding' in material and material['embedding']:
                materials_with_embeddings.append(material)
                embeddings_list.append(material['embedding'])
            else:
                materials_without_embeddings.append(material)
        
        print(f"✅ Loaded {len(materials_with_embeddings)} materials with embeddings")
        
        # Generate embeddings for materials that don't have them
        if materials_without_embeddings:
            print(f"🔄 Generating embeddings for {len(materials_without_embeddings)} materials...")
            self._generate_embeddings_batch(materials_without_embeddings, materials_with_embeddings, embeddings_list)
        
        self.materials = materials_with_embeddings
        self.embeddings = np.array(embeddings_list)
        
        print(f"✅ Ready! {len(self.materials)} materials indexed for semantic search")
    
    def _generate_embeddings_batch(
        self, 
        materials_to_process: List[Dict],
        existing_materials: List[Dict],
        existing_embeddings: List
    ) -> None:
        """Generate embeddings for a batch of materials"""
        for i, material in enumerate(materials_to_process):
            # Create searchable text
            text = f"{material.get('title', '')} {material.get('category', '')} {material.get('description', '')}"
            
            # Generate embedding
            embedding = self.model.encode(text, convert_to_numpy=True).tolist()
            
            # Save to database
            self.db_manager.update_embedding(material['_id'], embedding)
            
            # Update material object
            material['embedding'] = embedding
            material['embedding_generated_at'] = datetime.utcnow()
            material['embedding_model'] = self.model_name
            
            # Add to results
            existing_materials.append(material)
            existing_embeddings.append(embedding)
            
            # Progress indicator
            if (i + 1) % 10 == 0 or (i + 1) == len(materials_to_process):
                print(f"  Generated {i + 1}/{len(materials_to_process)} embeddings")
        
        print(f"✅ Generated and saved {len(materials_to_process)} embeddings")
    
    def search(
        self,
        query: str,
        top_k: int = 5,
        min_score: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search for materials
        
        Args:
            query: Search query text
            top_k: Number of top results to return
            min_score: Minimum similarity score threshold (0-1)
        
        Returns:
            List of materials with similarity scores
        """
        if len(self.materials) == 0:
            return []
        
        # Encode query
        query_embedding = self.model.encode(query, convert_to_numpy=True)
        
        # Calculate cosine similarity
        similarities = self._cosine_similarity(query_embedding)
        
        # Get top k indices
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        # Build results
        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            if score >= min_score:
                material = self.materials[idx].copy()
                material['score'] = round(score, 4)
                # Remove embedding from response
                material.pop('embedding', None)
                material.pop('embedding_generated_at', None)
                material.pop('embedding_model', None)
                results.append(material)
        
        return results
    
    def _cosine_similarity(self, query_embedding: np.ndarray) -> np.ndarray:
        """Calculate cosine similarity between query and all material embeddings"""
        return np.dot(self.embeddings, query_embedding) / (
            np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_embedding)
        )
    
    def add_material(self, product_id: str) -> bool:
        """
        Generate and store embedding for a newly added material
        ALSO adds it to in-memory cache for immediate searchability
        
        Args:
            product_id: MongoDB ObjectId as string
        
        Returns:
            Success status
        """
        try:
            material = self.db_manager.find_by_id(product_id)
            if not material:
                print(f"❌ Material {product_id} not found")
                return False
            
            # Check if embedding already exists in database
            if 'embedding' in material and material['embedding']:
                print(f"⚠️  Material {product_id} already has an embedding in database")
                # Still add to in-memory cache if not present
                if not any(m['_id'] == product_id for m in self.materials):
                    self.materials.append(material)
                    self.embeddings = np.vstack([self.embeddings, np.array(material['embedding'])])
                    print(f"✅ Added existing material to in-memory cache: {material.get('title', 'Unknown')}")
                return True
            
            # Generate embedding
            text = f"{material.get('title', '')} {material.get('category', '')} {material.get('description', '')}"
            embedding = self.model.encode(text, convert_to_numpy=True).tolist()
            
            # Save to database
            self.db_manager.update_embedding(product_id, embedding)
            
            # Add to in-memory cache
            material['embedding'] = embedding
            material['embedding_generated_at'] = datetime.utcnow()
            material['embedding_model'] = self.model_name
            
            self.materials.append(material)
            
            # Handle empty embeddings array
            if len(self.embeddings) == 0:
                self.embeddings = np.array([embedding])
            else:
                self.embeddings = np.vstack([self.embeddings, np.array(embedding)])
            
            print(f"✅ Added material to search index: {material.get('title', 'Unknown')}")
            return True
            
        except Exception as e:
            print(f"❌ Error adding material: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def update_material(self, product_id: str) -> bool:
        """
        Regenerate embedding for an updated material
        Updates both database and in-memory cache
        
        Args:
            product_id: MongoDB ObjectId as string
        
        Returns:
            Success status
        """
        try:
            # Fetch updated material from database
            material = self.db_manager.find_by_id(product_id)
            if not material:
                print(f"❌ Material {product_id} not found")
                return False
            
            # Generate new embedding with updated content
            text = f"{material.get('title', '')} {material.get('category', '')} {material.get('description', '')}"
            embedding = self.model.encode(text, convert_to_numpy=True).tolist()
            
            # Save to database
            self.db_manager.update_embedding(product_id, embedding)
            material['embedding'] = embedding
            material['embedding_generated_at'] = datetime.utcnow()
            material['embedding_model'] = self.model_name
            
            # Update in-memory cache
            # Find and remove old version
            material_index = None
            for idx, m in enumerate(self.materials):
                if m['_id'] == product_id:
                    material_index = idx
                    break
            
            if material_index is not None:
                # Replace in materials list
                self.materials[material_index] = material
                # Replace in embeddings array
                self.embeddings[material_index] = np.array(embedding)
                print(f"✅ Updated material in search index: {material.get('title', 'Unknown')}")
            else:
                # Material not in cache, add it
                self.materials.append(material)
                if len(self.embeddings) == 0:
                    self.embeddings = np.array([embedding])
                else:
                    self.embeddings = np.vstack([self.embeddings, np.array(embedding)])
                print(f"✅ Added updated material to search index: {material.get('title', 'Unknown')}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error updating material: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def rebuild_cache(self) -> bool:
        """
        Rebuild all embeddings from scratch
        
        Returns:
            Success status
        """
        try:
            print("🔄 Rebuilding all embeddings...")
            
            # Clear embeddings in database
            all_materials = self.db_manager.get_all_materials()
            for material in all_materials:
                self.db_manager.collection.update_one(
                    {'_id': ObjectId(material['_id'])},
                    {'$unset': {'embedding': '', 'embedding_generated_at': '', 'embedding_model': ''}}
                )
            
            # Reload and regenerate
            self._load_materials_with_embeddings()
            
            print("✅ Cache rebuilt successfully")
            return True
            
        except Exception as e:
            print(f"❌ Error rebuilding cache: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get search engine statistics"""
        return {
            "materials_loaded": len(self.materials),
            "model": self.model_name,
            "embedding_dimension": settings.EMBEDDING_DIMENSION
        }
