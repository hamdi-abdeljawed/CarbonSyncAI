"""
Pre-trained Voice Embeddings Generator

This script generates pre-computed voice embeddings that simulate
what would be produced by a real ECAPA-TDNN model trained on a large dataset.
These embeddings can be used without requiring PyTorch at runtime.
"""

import numpy as np
import json
import os
from pathlib import Path

# Constants
EMBEDDING_DIM = 128
NUM_EMBEDDINGS = 100  # Number of pre-computed embeddings to generate
SEED = 42  # For reproducibility

def generate_embeddings():
    """Generate a set of pre-computed voice embeddings"""
    np.random.seed(SEED)
    
    # Generate embeddings for different voice characteristics
    embeddings = {}
    
    # Create embeddings for different speaker types
    speaker_types = [
        "male_deep", "male_medium", "male_high",
        "female_deep", "female_medium", "female_high",
        "child_male", "child_female"
    ]
    
    for speaker_type in speaker_types:
        # Generate a base embedding for this speaker type
        base_embedding = np.random.randn(EMBEDDING_DIM)
        # Normalize to unit length (common in voice embeddings)
        base_embedding = base_embedding / np.linalg.norm(base_embedding)
        
        # Generate variations of this speaker
        for i in range(NUM_EMBEDDINGS // len(speaker_types)):
            # Add small variations to the base embedding
            variation = base_embedding + np.random.randn(EMBEDDING_DIM) * 0.1
            # Normalize again
            variation = variation / np.linalg.norm(variation)
            
            # Store with a unique key
            key = f"{speaker_type}_{i}"
            embeddings[key] = variation.tolist()
    
    return embeddings

def save_embeddings(embeddings, file_path):
    """Save embeddings to a JSON file"""
    with open(file_path, 'w') as f:
        json.dump(embeddings, f)
    print(f"Saved {len(embeddings)} embeddings to {file_path}")

def main():
    # Generate embeddings
    embeddings = generate_embeddings()
    
    # Save to file
    output_dir = Path("voice_data")
    output_dir.mkdir(exist_ok=True)
    
    output_file = output_dir / "pretrained_voice_embeddings.json"
    save_embeddings(embeddings, output_file)

if __name__ == "__main__":
    main()
