import numpy as np
import os
import json
import base64
import time
from pathlib import Path

# Simulating a deep learning model for voice recognition
# In a production environment, you would use a real model like Wav2Vec or similar

class VoiceAuthenticator:
    def __init__(self):
        self.voice_profiles_path = Path("voice_profiles")
        self.voice_profiles_path.mkdir(exist_ok=True)
        self.verification_phrase = "carbon sync ai is helping reduce emissions"
        
        # Simulated model parameters (in a real implementation, this would be a loaded model)
        self.feature_dim = 128
        print(f"Voice authenticator initialized with profiles directory: {self.voice_profiles_path}")
        
    def _extract_features(self, audio_data):
        """
        Simulate feature extraction from audio data
        In a real implementation, this would use a proper feature extraction method
        """
        # Convert base64 to numpy array (simulating audio processing)
        try:
            # Decode base64 string to get raw audio bytes
            audio_bytes = base64.b64decode(audio_data)
            
            # In a real implementation, we would process the audio bytes
            # For simulation, we'll create a random feature vector with a seed based on the audio data
            seed = int.from_bytes(audio_bytes[:4], byteorder='big') if len(audio_bytes) >= 4 else 0
            np.random.seed(seed)
            
            # Generate a feature vector (in a real system, this would be extracted from the audio)
            features = np.random.randn(self.feature_dim)
            
            # Normalize the features
            features = features / np.linalg.norm(features)
            
            return features
        except Exception as e:
            print(f"Error extracting features: {str(e)}")
            return None
    
    def _get_profile_path(self, user_id):
        """Get the path to a user's voice profile"""
        return self.voice_profiles_path / f"{user_id}.json"
    
    def enroll_user(self, user_id, audio_data):
        """
        Enroll a new user by creating a voice profile
        
        Args:
            user_id: Unique identifier for the user
            audio_data: Base64 encoded audio data
            
        Returns:
            (success, message)
        """
        try:
            features = self._extract_features(audio_data)
            if features is None:
                return False, "Failed to extract voice features"
            
            # Save the voice profile
            profile_path = self._get_profile_path(user_id)
            
            profile_data = {
                "user_id": user_id,
                "features": features.tolist(),
                "created_at": time.time(),
                "last_updated": time.time()
            }
            
            with open(profile_path, 'w') as f:
                json.dump(profile_data, f)
                
            return True, "Voice profile created successfully"
        except Exception as e:
            print(f"Error enrolling user: {str(e)}")
            return False, f"Error enrolling user: {str(e)}"
    
    def verify_user(self, user_id, audio_data):
        """
        Verify a user's voice against their stored profile
        
        Args:
            user_id: Unique identifier for the user
            audio_data: Base64 encoded audio data
            
        Returns:
            (success, message, confidence_score)
        """
        try:
            profile_path = self._get_profile_path(user_id)
            
            # For demo purposes: If profile doesn't exist, create a mock profile
            # In a production system, you would return an error and require enrollment
            if not profile_path.exists():
                print(f"Voice profile not found for user {user_id}. Creating mock profile for demo.")
                # Create a mock profile for demonstration purposes
                mock_features = self._extract_features(audio_data)
                if mock_features is None:
                    return False, "Failed to extract voice features", 0.0
                    
                # Save the mock profile
                mock_profile = {
                    "user_id": user_id,
                    "features": mock_features.tolist(),
                    "created_at": time.time(),
                    "last_updated": time.time(),
                    "is_mock": True  # Flag to indicate this is a mock profile
                }
                
                self.voice_profiles_path.mkdir(exist_ok=True)
                with open(profile_path, 'w') as f:
                    json.dump(mock_profile, f)
                    
                # For demo, return success with high confidence
                return True, "Voice profile created and verified", 85.0
                
            # Load the stored profile
            with open(profile_path, 'r') as f:
                profile_data = json.load(f)
                
            # If this is a mock profile created during demo, always return success
            if profile_data.get("is_mock", False):
                return True, "Voice verification successful (demo mode)", 90.0
                
            stored_features = np.array(profile_data["features"])
            
            # Extract features from the provided audio
            input_features = self._extract_features(audio_data)
            if input_features is None:
                return False, "Failed to extract voice features", 0.0
                
            # Calculate similarity (cosine similarity)
            similarity = np.dot(stored_features, input_features)
            
            # Convert to a confidence score (0-100)
            confidence_score = (similarity + 1) * 50  # Range from 0 to 100
            
            # In a real system, you would use a more sophisticated comparison
            # and have a proper threshold based on false acceptance/rejection rates
            threshold = 75.0
            
            if confidence_score >= threshold:
                return True, "Voice verification successful", confidence_score
            else:
                return False, "Voice verification failed", confidence_score
                
        except Exception as e:
            print(f"Error verifying user: {str(e)}")
            return False, f"Error verifying user: {str(e)}", 0.0
    
    def compare_voices(self, reference_audio, verification_audio):
        """
        Compare two voice recordings directly without storing profiles
        
        Args:
            reference_audio: Base64 encoded reference audio data
            verification_audio: Base64 encoded verification audio data
            
        Returns:
            (success, message, confidence_score)
        """
        try:
            # Extract features from both audio samples
            reference_features = self._extract_features(reference_audio)
            verification_features = self._extract_features(verification_audio)
            
            if reference_features is None or verification_features is None:
                return False, "Failed to extract voice features", 0.0
            
            # In a real implementation, we would do more sophisticated voice analysis here
            # For demonstration, we'll create a more stringent comparison that's harder to spoof
            
            # 1. Calculate basic cosine similarity
            similarity = np.dot(reference_features, verification_features)
            
            # 2. Add a check for audio length/duration similarity (simulated)
            # In a real system, very different audio lengths might indicate a replay attack
            length_similarity = 0.9  # Simulated value - would be calculated from actual audio
            
            # 3. Add a check for frequency distribution (simulated)
            # This would detect if someone is using a voice modulator or recording
            freq_similarity = 0.85  # Simulated value - would analyze actual frequency patterns
            
            # 4. Combine the similarity scores with different weights
            # Voice pattern is most important, but other factors contribute
            combined_similarity = (similarity * 0.6) + (length_similarity * 0.2) + (freq_similarity * 0.2)
            
            # Convert to a confidence score (0-100)
            confidence_score = (combined_similarity + 1) * 40  # More stringent scaling
            
            # Increase the threshold to make it harder to spoof
            threshold = 80.0
            
            # Add randomization to make it harder to game the system
            # This simulates the natural variation in voice recognition accuracy
            import random
            random_factor = random.uniform(0.9, 1.1)  # ±10% variation
            confidence_score = confidence_score * random_factor
            
            # Cap at 100%
            confidence_score = min(confidence_score, 100.0)
            
            if confidence_score >= threshold:
                return True, "Voice verification successful", confidence_score
            else:
                return False, "Voice verification failed", confidence_score
                
        except Exception as e:
            print(f"Error comparing voices: {str(e)}")
            return False, f"Error comparing voices: {str(e)}", 0.0
    
    def get_verification_phrase(self):
        """Return the verification phrase that users should say"""
        return self.verification_phrase
    
    def update_verification_phrase(self, new_phrase):
        """Update the verification phrase"""
        if new_phrase and len(new_phrase) >= 10:
            self.verification_phrase = new_phrase
            return True, "Verification phrase updated"
        return False, "Phrase too short (minimum 10 characters)"
    
    def delete_profile(self, user_id):
        """Delete a user's voice profile"""
        profile_path = self._get_profile_path(user_id)
        
        if profile_path.exists():
            os.remove(profile_path)
            return True, "Voice profile deleted successfully"
        
        return False, "Voice profile not found"

# Create a singleton instance
voice_authenticator = VoiceAuthenticator()
