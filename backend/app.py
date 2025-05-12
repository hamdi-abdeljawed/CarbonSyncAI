from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from flask_bcrypt import Bcrypt
import pandas as pd
import numpy as np
import os
import json
import re
from datetime import datetime, timedelta
import io
from sklearn.linear_model import LinearRegression
from users import verify_user, create_user, get_user_by_id, update_user_profile, change_password

# Use our pre-trained voice authentication system
try:
    from pretrained_voice_auth import pretrained_voice_authenticator as voice_authenticator
    print("Using pre-trained voice authentication system")
except ImportError:
    try:
        from real_voice_auth import real_voice_authenticator as voice_authenticator
        print("Using real deep learning voice authentication system")
    except ImportError:
        from voice_auth import voice_authenticator
        print("Using simulated voice authentication system")

# Try to import Prophet, but provide fallback if not available
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    print("WARNING: Prophet not available. Using fallback forecasting method.")
    PROPHET_AVAILABLE = False

app = Flask(__name__)
CORS(app)

# Configure JWT
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'yap-t-carbonsync-ai-super-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

# Authentication endpoints
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400
        
        success, result = verify_user(username, password)
        
        if not success:
            return jsonify({"error": result}), 401
        
        # Create tokens
        access_token = create_access_token(identity=result["id"])
        refresh_token = create_refresh_token(identity=result["id"])
        
        return jsonify({
            "message": "Login successful",
            "user": result,
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        print("Registration endpoint called")
        data = request.json
        print(f"Registration data received: {data}")
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        profile = data.get('profile', {})
        
        print(f"Processing registration for: {username}, {email}")
        
        if not username or not email or not password:
            error_msg = "Username, email, and password are required"
            print(f"Registration error: {error_msg}")
            return jsonify({"error": error_msg}), 400
        
        # Create the user
        success, result = create_user(username, email, password, profile=profile)
        
        if not success:
            print(f"User creation failed: {result}")
            return jsonify({"error": result}), 400
        
        print(f"User created successfully: {username}")
        
        # Create tokens
        access_token = create_access_token(identity=result["id"])
        refresh_token = create_refresh_token(identity=result["id"])
        
        response_data = {
            "message": "User registered successfully",
            "user": result,
            "access_token": access_token,
            "refresh_token": refresh_token
        }
        
        print(f"Registration successful for: {username}")
        return jsonify(response_data), 201
    except Exception as e:
        error_msg = f"Registration error: {str(e)}"
        print(error_msg)
        import traceback
        traceback.print_exc()
        return jsonify({"error": error_msg}), 500

@app.route('/api/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        current_user_id = get_jwt_identity()
        user = get_user_by_id(current_user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Create new access token
        access_token = create_access_token(identity=current_user_id)
        
        return jsonify({
            "access_token": access_token
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user_id = get_jwt_identity()
        user = get_user_by_id(current_user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Remove password from user object
        user_copy = user.copy()
        user_copy.pop("password", None)
        
        return jsonify({
            "user": user_copy
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        current_user_id = get_jwt_identity()
        data = request.json
        
        success, result = update_user_profile(current_user_id, data)
        
        if not success:
            return jsonify({"error": result}), 404
        
        return jsonify({
            "message": "Profile updated successfully",
            "user": result
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/change-password', methods=['POST'])
@jwt_required()
def update_password():
    try:
        current_user_id = get_jwt_identity()
        data = request.json
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({"error": "Current password and new password are required"}), 400
        
        success, result = change_password(current_user_id, current_password, new_password)
        
        if not success:
            return jsonify({"error": result}), 400
        
        return jsonify({
            "message": result
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Carbon Predictor AI backend is running"}), 200

# Voice authentication endpoints
@app.route('/api/auth/voice/phrase', methods=['GET'])
def get_voice_phrase():
    """Get the verification phrase for voice authentication"""
    try:
        phrase = voice_authenticator.get_verification_phrase()
        return jsonify({
            "phrase": phrase
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/voice/enroll', methods=['POST'])
@jwt_required()
def enroll_voice():
    """Enroll a user's voice profile"""
    try:
        current_user_id = get_jwt_identity()
        data = request.json
        audio_data = data.get('audio_data')
        
        if not audio_data:
            return jsonify({"error": "Audio data is required"}), 400
            
        success, message = voice_authenticator.enroll_user(current_user_id, audio_data)
        
        if not success:
            return jsonify({"error": message}), 400
            
        return jsonify({
            "message": message
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/voice/verify', methods=['POST'])
def verify_voice():
    """Verify a user's voice for authentication"""
    try:
        data = request.json
        user_id = data.get('user_id')
        audio_data = data.get('audio_data')
        
        if not user_id or not audio_data:
            return jsonify({"error": "User ID and audio data are required"}), 400
            
        success, message, confidence = voice_authenticator.verify_user(user_id, audio_data)
        
        if not success:
            return jsonify({
                "success": False,
                "message": message,
                "confidence": confidence
            }), 401
        
        # If voice verification is successful, create tokens
        user = get_user_by_id(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        access_token = create_access_token(identity=user_id)
        refresh_token = create_refresh_token(identity=user_id)
        
        return jsonify({
            "success": True,
            "message": message,
            "confidence": confidence,
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/voice/compare', methods=['POST'])
def compare_voices():
    """Compare two voice recordings directly for authentication"""
    try:
        data = request.json
        user_id = data.get('user_id')
        reference_audio = data.get('reference_audio')
        verification_audio = data.get('verification_audio')
        
        if not reference_audio or not verification_audio:
            return jsonify({'error': 'Missing audio data'}), 400
            
        success, message, confidence, model_info = voice_authenticator.compare_voices(reference_audio, verification_audio)
        
        # Mock user data for demonstration purposes
        if success:
            user = get_user_by_id(user_id) if user_id else None
            if not user:
                # Create a mock user for demonstration
                user = {
                    'id': user_id or 'demo-user-123',
                    'username': 'demo_user',
                    'email': 'demo@example.com',
                    'role': 'user'
                }
            
            # Generate a token
            access_token = create_access_token(identity=user['id'])
            refresh_token = create_refresh_token(identity=user['id'])
            
            return jsonify({
                'success': True,
                'message': message,
                'confidence': confidence,
                'model_info': model_info,
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user
            })
        else:
            return jsonify({
                'success': False,
                'message': message,
                'confidence': confidence,
                'model_info': model_info
            }), 401
        
        if not success:
            return jsonify({"error": message}), 404
            
        return jsonify({
            "message": message
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            # Check if JSON data was sent instead
            if request.json:
                data = request.json
                df = pd.DataFrame(data)
            else:
                return jsonify({"error": "No file or data provided"}), 400
        else:
            file = request.files['file']
            if file.filename == '':
                return jsonify({"error": "No file selected"}), 400
            
            # Determine file type and read accordingly
            if file.filename.endswith('.csv'):
                df = pd.read_csv(file)
            elif file.filename.endswith(('.xls', '.xlsx')):
                # Print debug information
                print(f"Processing Excel file: {file.filename}")
                # Try to read with explicit engine
                try:
                    df = pd.read_excel(file, engine='openpyxl')
                    print(f"Excel file read successfully with openpyxl. Columns: {df.columns.tolist()}")
                except Exception as excel_err:
                    print(f"Error reading Excel with openpyxl: {str(excel_err)}")
                    # Fallback to default engine
                    df = pd.read_excel(file)
                    print(f"Excel file read with default engine. Columns: {df.columns.tolist()}")
            else:
                return jsonify({"error": "Unsupported file format. Please upload CSV or Excel file."}), 400
        
        # Validate and standardize column names
        expected_columns = [
            'date', 'energy_use (kWh)', 'transport (km)', 'waste (tons)', 
            'water (liters)', 'fuel (liters)', 'emissions (tons CO2e)', 
            'production (units)', 'grid_intensity (kg CO2e/kWh)'
        ]
        
        # Print column names and first few rows for debugging
        print(f"Columns in uploaded file: {df.columns.tolist()}")
        print(f"First 3 rows of data:\n{df.head(3)}")
        
        # Check if we have at least some of the expected columns
        found_columns = [col for col in expected_columns if col in df.columns]
        
        # If exact column names aren't found, try to match using more flexible mapping
        if not found_columns:
            # Extended mapping with various possible column name formats
            flexible_mapping = {
                # Date columns
                'ds': 'date',
                'date': 'date',
                'datetime': 'date',
                'time': 'date',
                'period': 'date',
                'month': 'date',
                'year': 'date',
                
                # Energy columns
                'energy_kwh': 'energy_use (kWh)',
                'energy_use': 'energy_use (kWh)',
                'energy': 'energy_use (kWh)',
                'electricity': 'energy_use (kWh)',
                'power': 'energy_use (kWh)',
                'kwh': 'energy_use (kWh)',
                'energy (kwh)': 'energy_use (kWh)',
                'energy_use_kwh': 'energy_use (kWh)',
                'energy_use(kwh)': 'energy_use (kWh)',
                
                # Transport columns
                'transport_km': 'transport (km)',
                'transport': 'transport (km)',
                'travel': 'transport (km)',
                'distance': 'transport (km)',
                'km': 'transport (km)',
                'miles': 'transport (km)',
                'transportation': 'transport (km)',
                'transport (km)': 'transport (km)',
                'transport(km)': 'transport (km)',
                
                # Waste columns
                'waste_kg': 'waste (tons)',
                'waste': 'waste (tons)',
                'garbage': 'waste (tons)',
                'trash': 'waste (tons)',
                'waste (kg)': 'waste (tons)',
                'waste (tons)': 'waste (tons)',
                'waste(tons)': 'waste (tons)',
                
                # Water columns
                'water_m3': 'water (liters)',
                'water': 'water (liters)',
                'h2o': 'water (liters)',
                'water_usage': 'water (liters)',
                'water_consumption': 'water (liters)',
                'water (liters)': 'water (liters)',
                'water (m3)': 'water (liters)',
                'water(liters)': 'water (liters)',
                
                # Fuel columns
                'fuel_l': 'fuel (liters)',
                'fuel': 'fuel (liters)',
                'gas': 'fuel (liters)',
                'gasoline': 'fuel (liters)',
                'diesel': 'fuel (liters)',
                'petrol': 'fuel (liters)',
                'fuel (liters)': 'fuel (liters)',
                'fuel (l)': 'fuel (liters)',
                'fuel(liters)': 'fuel (liters)',
                
                # Emissions columns
                'y': 'emissions (tons CO2e)',
                'emissions': 'emissions (tons CO2e)',
                'co2': 'emissions (tons CO2e)',
                'co2e': 'emissions (tons CO2e)',
                'carbon': 'emissions (tons CO2e)',
                'ghg': 'emissions (tons CO2e)',
                'greenhouse_gas': 'emissions (tons CO2e)',
                'emissions (tons)': 'emissions (tons CO2e)',
                'emissions (tons co2e)': 'emissions (tons CO2e)',
                'emissions(tons co2e)': 'emissions (tons CO2e)',
                'carbon_emissions': 'emissions (tons CO2e)',
                
                # Production columns
                'production_units': 'production (units)',
                'production': 'production (units)',
                'units': 'production (units)',
                'output': 'production (units)',
                'products': 'production (units)',
                'production (units)': 'production (units)',
                'production(units)': 'production (units)',
                
                # Grid intensity columns
                'grid_intensity': 'grid_intensity (kg CO2e/kWh)',
                'grid': 'grid_intensity (kg CO2e/kWh)',
                'intensity': 'grid_intensity (kg CO2e/kWh)',
                'carbon_intensity': 'grid_intensity (kg CO2e/kWh)',
                'grid_carbon': 'grid_intensity (kg CO2e/kWh)',
                'grid_intensity (kg co2e/kwh)': 'grid_intensity (kg CO2e/kWh)',
                'grid_intensity(kg co2e/kwh)': 'grid_intensity (kg CO2e/kWh)'
            }
            
            # Case-insensitive column matching with improved flexibility
            rename_dict = {}
            for col in df.columns:
                if pd.isna(col):  # Skip NaN column names
                    continue
                    
                col_str = str(col).lower().strip()
                
                # Try exact match first
                for old_col, new_col in flexible_mapping.items():
                    if old_col.lower() == col_str:
                        rename_dict[col] = new_col
                        break
                
                # If no exact match, try partial match
                if col not in rename_dict:
                    for old_col, new_col in flexible_mapping.items():
                        if old_col.lower() in col_str or col_str in old_col.lower():
                            rename_dict[col] = new_col
                            break
            
            print(f"Column mapping: {rename_dict}")
            
            if rename_dict:
                df = df.rename(columns=rename_dict)
                
                # Convert units if needed
                if 'waste (tons)' in df.columns and 'waste_kg' in df.columns:
                    df['waste (tons)'] = df['waste_kg'] / 1000  # Convert kg to tons
                
                if 'water (liters)' in df.columns and 'water_m3' in df.columns:
                    df['water (liters)'] = df['water_m3'] * 1000  # Convert m3 to liters
            else:
                # If no columns were mapped, try more aggressive matching based on column content and position
                print("No columns mapped with standard mapping. Trying aggressive mapping...")
                
                # Check for date column - look for columns with date-like values
                date_cols = []
                for col in df.columns:
                    if pd.isna(col):
                        continue
                    try:
                        # Try to convert first non-null value to date
                        first_val = df[col].dropna().iloc[0] if not df[col].dropna().empty else None
                        if first_val and pd.to_datetime(first_val, errors='coerce') is not pd.NaT:
                            date_cols.append(col)
                    except (ValueError, TypeError, IndexError):
                        pass
                
                # If we found date columns, map the first one
                if date_cols:
                    rename_dict[date_cols[0]] = 'date'
                    print(f"Mapped column '{date_cols[0]}' to 'date' based on content")
                
                # Try to map numeric columns to the expected metrics based on position
                numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
                expected_numeric = [
                    'energy_use (kWh)', 'transport (km)', 'waste (tons)', 'water (liters)', 
                    'fuel (liters)', 'emissions (tons CO2e)', 'production (units)', 'grid_intensity (kg CO2e/kWh)'
                ]
                
                # Map remaining numeric columns based on position
                remaining_numeric = [col for col in numeric_cols if col not in rename_dict.keys()]
                for i, col in enumerate(remaining_numeric):
                    if i < len(expected_numeric):
                        rename_dict[col] = expected_numeric[i]
                        print(f"Mapped column '{col}' to '{expected_numeric[i]}' based on position")
                
                # If still no date column, try to use the first column as date
                if 'date' not in rename_dict.values() and len(df.columns) > 0:
                    first_col = df.columns[0]
                    rename_dict[first_col] = 'date'
                    print(f"Using first column '{first_col}' as date column")
                    # Try to convert to datetime
                    try:
                        df[first_col] = pd.to_datetime(df[first_col], errors='coerce')
                    except:
                        pass
                
                if not rename_dict:
                    return jsonify({
                        "error": "Could not identify columns in your file. Please ensure your file contains at least: date, energy_use (kWh), transport (km), emissions (tons CO2e)",
                        "columns_found": df.columns.tolist()
                    }), 400
        
        # Ensure date column is present and in datetime format
        if 'date' not in df.columns:
            return jsonify({"error": "Missing required 'date' column"}), 400
        
        # Try to convert date column to datetime format, with improved handling
        try:
            # First, make a copy of the original date column to preserve it
            df['original_date'] = df['date'].copy()
            
            # Try to parse dates with a more flexible approach
            df['date'] = pd.to_datetime(df['date'], errors='coerce', infer_datetime_format=True)
            
            # Check if we have valid dates
            if df['date'].isna().any():
                print("Some dates failed to parse. Trying specific formats...")
                # Try common date formats one by one
                date_formats = [
                    '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d', '%d-%m-%Y', '%m-%d-%Y',
                    '%d.%m.%Y', '%m.%d.%Y', '%Y.%m.%d',
                    '%d-%b-%Y', '%b-%d-%Y', '%Y-%b-%d',
                    '%d %B %Y', '%B %d %Y', '%Y %B %d'
                ]
                
                for fmt in date_formats:
                    try:
                        temp_dates = pd.to_datetime(df['original_date'], format=fmt, errors='coerce')
                        # Update only the NaN values in the date column
                        mask = df['date'].isna()
                        df.loc[mask, 'date'] = temp_dates.loc[mask]
                        
                        if not df['date'].isna().any():
                            print(f"Successfully parsed all dates with format: {fmt}")
                            break
                    except Exception as fmt_err:
                        print(f"Error with format {fmt}: {str(fmt_err)}")
                        continue
            
            # If we still have NaN dates, try to extract date components
            if df['date'].isna().any():
                print("Still have NaN dates. Trying to extract date components...")
                mask = df['date'].isna()
                try:
                    # Try to extract year, month, day from string representations
                    date_strings = df.loc[mask, 'original_date'].astype(str)
                    
                    # Look for patterns like YYYY-MM-DD or DD-MM-YYYY in the strings
                    for i, date_str in enumerate(date_strings):
                        parts = [p for p in re.split(r'[-/., ]', date_str) if p.isdigit()]
                        if len(parts) >= 3:
                            # If first part is 4 digits, assume YYYY-MM-DD
                            if len(parts[0]) == 4:
                                year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
                            # Otherwise assume DD-MM-YYYY
                            elif len(parts[2]) == 4:
                                day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                            else:
                                continue
                                
                            try:
                                df.loc[mask.iloc[i], 'date'] = pd.Timestamp(year=year, month=month, day=day)
                            except:
                                pass
                except Exception as e:
                    print(f"Error extracting date components: {str(e)}")
        except Exception as e:
            print(f"Error converting dates: {str(e)}")
        
        # If all else fails, create a date sequence for any remaining NaN dates
        if df['date'].isna().any():
            print("Creating date sequence as fallback for remaining NaN dates")
            start_date = pd.Timestamp('2023-01-01')
            nan_indices = df['date'].isna()
            df.loc[nan_indices, 'date'] = [start_date + pd.Timedelta(days=i) for i in range(sum(nan_indices))]
        
        # Drop the temporary column
        df = df.drop('original_date', axis=1, errors='ignore')
        
        # Add ds column for Prophet compatibility
        df['ds'] = df['date']
        
        # Convert units and standardize column names for backend processing
        column_mapping = {
            'energy_use (kWh)': 'energy_kwh',
            'transport (km)': 'transport_km',
            'waste (tons)': 'waste_kg',
            'water (liters)': 'water_m3',
            'fuel (liters)': 'fuel_l',
            'emissions (tons CO2e)': 'y',
            'production (units)': 'production_units',
            'grid_intensity (kg CO2e/kWh)': 'grid_intensity'
        }
        
        # Print the dataframe after column mapping for debugging
        print("DataFrame after column mapping:")
        print(df.head())
        
        # Create backend columns with appropriate unit conversions
        for display_col, backend_col in column_mapping.items():
            # First try exact column name
            if display_col in df.columns:
                if display_col == 'waste (tons)':
                    df[backend_col] = df[display_col] * 1000  # Convert tons to kg
                elif display_col == 'water (liters)':
                    df[backend_col] = df[display_col] / 1000  # Convert liters to m3
                else:
                    df[backend_col] = df[display_col]
            else:
                # Try to find columns with similar names (without spaces or with different casing)
                found = False
                for col in df.columns:
                    # Skip if column is NaN
                    if pd.isna(col):
                        continue
                        
                    # Normalize column names for comparison (remove spaces, parentheses, and lowercase)
                    col_clean = str(col).lower().replace(' ', '').replace('(', '').replace(')', '')
                    display_col_clean = display_col.lower().replace(' ', '').replace('(', '').replace(')', '')
                    
                    # Check if the cleaned column names match or are very similar
                    if col_clean == display_col_clean or col_clean in display_col_clean or display_col_clean in col_clean:
                        print(f"Matched column '{col}' to '{display_col}' -> '{backend_col}'")
                        found = True
                        
                        # Apply appropriate conversions
                        if display_col == 'waste (tons)':
                            df[backend_col] = pd.to_numeric(df[col], errors='coerce') * 1000  # Convert tons to kg
                        elif display_col == 'water (liters)':
                            df[backend_col] = pd.to_numeric(df[col], errors='coerce') / 1000  # Convert liters to m3
                        else:
                            df[backend_col] = pd.to_numeric(df[col], errors='coerce')
                        break
                
                # If we didn't find a match, try to infer from column position for numeric columns
                if not found and backend_col not in df.columns:
                    # Map common patterns like 'energy_use(kwh)' to 'energy_kwh'
                    for col in df.columns:
                        if pd.isna(col):
                            continue
                            
                        col_str = str(col).lower()
                        if 'energy' in col_str and backend_col == 'energy_kwh':
                            df[backend_col] = pd.to_numeric(df[col], errors='coerce')
                            print(f"Mapped '{col}' to '{backend_col}' based on keyword match")
                            break
                        elif 'transport' in col_str and backend_col == 'transport_km':
                            df[backend_col] = pd.to_numeric(df[col], errors='coerce')
                            print(f"Mapped '{col}' to '{backend_col}' based on keyword match")
                            break
                        elif 'waste' in col_str and backend_col == 'waste_kg':
                            df[backend_col] = pd.to_numeric(df[col], errors='coerce') * 1000  # Convert tons to kg
                            print(f"Mapped '{col}' to '{backend_col}' based on keyword match")
                            break
                        elif 'water' in col_str and backend_col == 'water_m3':
                            df[backend_col] = pd.to_numeric(df[col], errors='coerce') / 1000  # Convert liters to m3
                            print(f"Mapped '{col}' to '{backend_col}' based on keyword match")
                            break
                        elif 'fuel' in col_str and backend_col == 'fuel_l':
                            df[backend_col] = pd.to_numeric(df[col], errors='coerce')
                            print(f"Mapped '{col}' to '{backend_col}' based on keyword match")
                            break
                        elif ('emission' in col_str or 'co2' in col_str) and backend_col == 'y':
                            df[backend_col] = pd.to_numeric(df[col], errors='coerce')
                            print(f"Mapped '{col}' to '{backend_col}' based on keyword match")
                            break
                        elif 'production' in col_str and backend_col == 'production_units':
                            df[backend_col] = pd.to_numeric(df[col], errors='coerce')
                            print(f"Mapped '{col}' to '{backend_col}' based on keyword match")
                            break
                        elif ('grid' in col_str or 'intensity' in col_str) and backend_col == 'grid_intensity':
                            df[backend_col] = pd.to_numeric(df[col], errors='coerce')
                            print(f"Mapped '{col}' to '{backend_col}' based on keyword match")
                            break
        
        # Handle missing values (fill with means)
        numeric_cols = ['energy_kwh', 'production_units', 'transport_km', 'y', 
                        'waste_kg', 'water_m3', 'fuel_l', 'grid_intensity']
        
        for col in numeric_cols:
            if col in df.columns and df[col].isnull().any():
                df[col] = df[col].fillna(df[col].mean())
        
        # Calculate summary statistics
        summary = {
            'mean': {},
            'min': {},
            'max': {},
            'std': {},
            'total_rows': len(df)
        }
        
        # Calculate statistics for display columns
        for display_col, backend_col in column_mapping.items():
            if backend_col in df.columns:
                summary['mean'][display_col.split(' ')[0]] = float(df[backend_col].mean())
                summary['min'][display_col.split(' ')[0]] = float(df[backend_col].min())
                summary['max'][display_col.split(' ')[0]] = float(df[backend_col].max())
                summary['std'][display_col.split(' ')[0]] = float(df[backend_col].std())
        
        # Ensure date is properly formatted for JSON serialization
        df['date'] = df['date'].dt.strftime('%Y-%m-%d')
        
        # Convert to JSON-serializable format
        df_json = df.to_dict(orient='records')
        
        return jsonify({
            "data": df_json,
            "summary": summary,
            "message": "Data processed successfully"
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        # Get data from request
        data = request.json.get('data', [])
        forecast_periods = request.json.get('forecast_periods', 12)
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        # Ensure date column is in datetime format
        df['ds'] = pd.to_datetime(df['ds'])
        
        # Ensure all required columns exist
        required_columns = ['ds', 'y']
        for col in required_columns:
            if col not in df.columns:
                return jsonify({"error": f"Missing required column: {col}"}), 400
        
        # Fill missing values with 0 for numeric columns
        numeric_columns = ['energy_kwh', 'transport_km', 'waste_kg', 'water_m3', 
                          'fuel_l', 'production_units', 'grid_intensity']
        
        for col in numeric_columns:
            if col in df.columns:
                df[col] = df[col].fillna(0).astype(float)
            else:
                df[col] = 0
        
        # Ensure y column is numeric
        df['y'] = df['y'].astype(float)
        
        # Sort by date to ensure chronological order
        df = df.sort_values('ds')
        
        # Check for duplicate dates
        if df['ds'].duplicated().any():
            return jsonify({"error": "Duplicate dates found. Each date must be unique."}), 400
        
        # Check if we have enough data points
        if len(df) < 3:
            return jsonify({"error": "Need at least 3 data points for forecasting"}), 400
        
        # Check if Prophet is available, otherwise use fallback forecasting
        if PROPHET_AVAILABLE:
            try:
                # Create Prophet model
                model = Prophet(
                    yearly_seasonality=True,
                    weekly_seasonality=False,
                    daily_seasonality=False,
                    seasonality_mode='multiplicative'
                )
                
                # Add regressors if available
                for regressor in numeric_columns:
                    if regressor in df.columns and regressor != 'y':
                        model.add_regressor(regressor)
                
                # Fit model
                model.fit(df)
                
                # Create future dataframe
                future = model.make_future_dataframe(periods=forecast_periods, freq='MS')
                
                # Add regressor values for historical data
                for regressor in numeric_columns:
                    if regressor in df.columns:
                        future[regressor] = future['ds'].map(df.set_index('ds')[regressor])
                
                # Fill NaN values in future regressors with the mean of historical data
                for regressor in numeric_columns:
                    if regressor in future.columns:
                        mean_value = df[regressor].mean()
                        future[regressor] = future[regressor].fillna(mean_value)
                
                # Make prediction
                forecast = model.predict(future)
                
                # Prophet is working correctly
                using_fallback = False
            except Exception as prophet_error:
                print(f"Prophet error: {str(prophet_error)}. Using fallback method.")
                using_fallback = True
        else:
            print("Prophet not available. Using fallback forecasting method.")
            using_fallback = True
            
        # Fallback forecasting method using linear regression if Prophet fails
        if using_fallback:
            # Create a simple time-based feature
            df['time_idx'] = range(len(df))
            
            # Train a linear regression model on the time index
            X_train = df[['time_idx']]
            y_train = df['y']
            lr_model = LinearRegression().fit(X_train, y_train)
            
            # Create future dates
            last_date = df['ds'].max()
            future_dates = [last_date + pd.DateOffset(months=i+1) for i in range(forecast_periods)]
            
            # Create future dataframe with time index continuing from training data
            future = pd.DataFrame({
                'ds': pd.Series(future_dates),
                'time_idx': range(len(df), len(df) + forecast_periods)
            })
            
            # Combine historical and future data
            combined = pd.concat([df[['ds', 'time_idx']], future], ignore_index=True)
            
            # Make predictions
            combined['yhat'] = lr_model.predict(combined[['time_idx']])
            
            # Add prediction intervals (simple approach)
            y_pred = lr_model.predict(X_train)
            mse = np.mean((y_train - y_pred) ** 2)
            std_dev = np.sqrt(mse)
            
            combined['yhat_lower'] = combined['yhat'] - 1.96 * std_dev
            combined['yhat_upper'] = combined['yhat'] + 1.96 * std_dev
            
            # Extract just the forecast part
            forecast = combined.iloc[len(df):]
        
        # Calculate feature importance using a simple linear regression
        X = df[numeric_columns].fillna(0)
        y = df['y']
        
        # Only calculate impacts if we have enough data points
        impacts = {}
        if len(df) >= 5 and len(numeric_columns) > 0:
            try:
                reg = LinearRegression().fit(X, y)
                
                # Calculate impact scores
                for i, col in enumerate(numeric_columns):
                    if col in df.columns:
                        coefficient = reg.coef_[i]
                        mean_value = df[col].mean()
                        impact_score = coefficient * mean_value
                        impacts[col] = {
                            "coefficient": float(coefficient),
                            "mean_value": float(mean_value),
                            "impact_score": float(impact_score)
                        }
            except Exception as e:
                print(f"Error calculating impacts: {e}")
                # Continue without impacts if there's an error
                pass
        
        # Generate suggestions based on impacts
        suggestions = []
        if impacts:
            # Sort impacts by absolute value of impact score
            sorted_impacts = sorted(impacts.items(), key=lambda x: abs(x[1]['impact_score']), reverse=True)
            
            for col, impact in sorted_impacts[:3]:  # Top 3 impacts
                if impact['coefficient'] > 0:
                    if col == 'grid_intensity':
                        suggestions.append("Consider switching to renewable energy sources to reduce grid carbon intensity")
                    elif col == 'energy_kwh':
                        suggestions.append("Implement energy efficiency measures to reduce electricity consumption")
                    elif col == 'transport_km':
                        suggestions.append("Optimize transportation routes or switch to electric vehicles")
                    elif col == 'waste_kg':
                        suggestions.append("Implement waste reduction and recycling programs")
                    elif col == 'water_m3':
                        suggestions.append("Install water-saving fixtures and implement water conservation measures")
                    elif col == 'fuel_l':
                        suggestions.append("Optimize fuel consumption or switch to more efficient vehicles")
        
        # Format forecast results
        forecast_result = []
        for i, row in forecast.iterrows():
            forecast_result.append({
                "ds": row['ds'].strftime('%Y-%m-%d'),
                "predicted_emissions": float(row['yhat']),
                "lower_bound": float(row['yhat_lower']),
                "upper_bound": float(row['yhat_upper'])
            })
        
        return jsonify({
            "forecast": forecast_result,
            "impacts": impacts,
            "suggestions": suggestions
        }), 200
        
    except Exception as e:
        print(f"Error in prediction: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/optimize', methods=['POST'])
def optimize():
    try:
        data = request.json
        df = pd.DataFrame(data['data'])
        suggestions = data.get('suggestions', [])
        forecast_periods = int(data.get('forecast_periods', 12))
        
        # Convert date to datetime
        df['ds'] = pd.to_datetime(df['ds'])
        df['date'] = df['ds']  # Add date column for compatibility
        
        # Sort by date
        df = df.sort_values('ds')
        
        # Create features for linear regression
        df['time_idx'] = range(len(df))
        
        # Determine available regressors
        available_regressors = ['energy_kwh', 'production_units', 'transport_km', 'time_idx']
        optional_regressors = ['waste_kg', 'water_m3', 'fuel_l', 'grid_intensity']
        for col in optional_regressors:
            if col in df.columns:
                available_regressors.append(col)
        
        # Prepare data for linear regression
        X = df[available_regressors].values
        y = df['y'].values
        
        # Initialize and fit linear regression model
        model = LinearRegression()
        model.fit(X, y)
        
        # Create future dataframe
        last_date = df['ds'].max()
        future_dates = [last_date + timedelta(days=30*i) for i in range(1, forecast_periods+1)]
        
        # Create future features with optimizations applied
        future_data = []
        for i, date in enumerate(future_dates):
            row = {
                'ds': date,
                'date': date,
                'time_idx': len(df) + i
            }
            
            # Use mean values for other features
            for col in available_regressors:
                if col != 'time_idx':
                    mean_value = df[col].mean()
                    
                    # Apply optimization if this regressor is in suggestions
                    for suggestion in suggestions:
                        if suggestion['regressor'] == col:
                            reduction = suggestion['reduction_pct'] / 100
                            mean_value = mean_value * (1 - reduction)
                    
                    row[col] = mean_value
            
            future_data.append(row)
        
        future_df = pd.DataFrame(future_data)
        
        # Make prediction
        future_X = future_df[available_regressors].values
        future_y = model.predict(future_X)
        
        # Add predictions to future dataframe
        future_df['predicted_emissions'] = future_y
        
        # Add confidence intervals (simple approach)
        std_dev = np.std(y - model.predict(X))
        future_df['lower_bound'] = future_df['predicted_emissions'] - 1.96 * std_dev
        future_df['upper_bound'] = future_df['predicted_emissions'] + 1.96 * std_dev
        
        # Calculate savings
        # Create baseline forecast for comparison
        baseline_future = []
        for i, date in enumerate(future_dates):
            row = {
                'ds': date,
                'date': date,
                'time_idx': len(df) + i
            }
            
            # Use mean values without optimization
            for col in available_regressors:
                if col != 'time_idx':
                    row[col] = df[col].mean()
            
            baseline_future.append(row)
        
        baseline_df = pd.DataFrame(baseline_future)
        baseline_X = baseline_df[available_regressors].values
        baseline_y = model.predict(baseline_X)
        
        # Calculate total emissions reduction
        total_baseline = sum(baseline_y)
        total_optimized = sum(future_y)
        total_reduction = total_baseline - total_optimized
        avg_reduction_pct = (total_reduction / total_baseline) * 100 if total_baseline > 0 else 0
        
        # Prepare response
        response = {
            'optimized_forecast': future_df[['date', 'predicted_emissions', 'lower_bound', 'upper_bound']].to_dict(orient='records'),
            'savings': {
                'total': float(total_reduction),
                'percentage': float(avg_reduction_pct)
            }
        }
        
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/export', methods=['POST'])
def export_forecast():
    try:
        data = request.json
        forecast_data = data.get('forecast', [])
        
        if not forecast_data:
            return jsonify({"error": "No forecast data provided"}), 400
        
        # Convert to DataFrame
        df = pd.DataFrame(forecast_data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Forecast', index=False)
            
            # Get workbook and worksheet objects
            workbook = writer.book
            worksheet = writer.sheets['Forecast']
            
            # Add formats
            header_format = workbook.add_format({
                'bold': True,
                'text_wrap': True,
                'valign': 'top',
                'fg_color': '#D7E4BC',
                'border': 1
            })
            
            # Write headers with format
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
                
            # Set column widths
            worksheet.set_column('A:A', 12)  # Date column
            worksheet.set_column('B:D', 15)  # Numeric columns
        
        output.seek(0)
        
        # Ensure proper content type and attachment handling
        response = send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='carbon_forecast.xlsx'
        )
        
        # Add additional headers to ensure proper download
        response.headers["Content-Disposition"] = "attachment; filename=carbon_forecast.xlsx"
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
        
        return response
    
    except Exception as e:
        print(f"Export error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/sample', methods=['GET'])
def generate_sample():
    try:
        # Generate sample dates (monthly for 2 years)
        start_date = datetime(2023, 1, 1)
        dates = [start_date + timedelta(days=30*i) for i in range(24)]
        
        # Create sample data
        data = []
        
        for i, date in enumerate(dates):
            # Base values
            energy_kwh = 5000 + 500 * np.sin(i/4)
            transport_km = 20000 + 2000 * np.sin(i/3 + 1)
            waste_kg = 1500 + 300 * np.sin(i/5 + 2)
            water_m3 = 200 + 50 * np.sin(i/4 + 1.5)
            fuel_l = 1000 + 200 * np.sin(i/3 + 0.5)
            production_units = 10000 + 1000 * np.sin(i/4 + 1)
            grid_intensity = 0.5 + 0.1 * np.sin(i/6)
            
            # Add some randomness
            energy_kwh += np.random.normal(0, 200)
            transport_km += np.random.normal(0, 500)
            waste_kg += np.random.normal(0, 100)
            water_m3 += np.random.normal(0, 20)
            fuel_l += np.random.normal(0, 50)
            production_units += np.random.normal(0, 300)
            grid_intensity += np.random.normal(0, 0.05)
            
            # Ensure non-negative values
            energy_kwh = max(0, energy_kwh)
            transport_km = max(0, transport_km)
            waste_kg = max(0, waste_kg)
            water_m3 = max(0, water_m3)
            fuel_l = max(0, fuel_l)
            production_units = max(0, production_units)
            grid_intensity = max(0, grid_intensity)
            
            # Calculate emissions (simplified model)
            emissions = (
                0.0005 * energy_kwh + 
                0.0002 * transport_km + 
                0.001 * waste_kg + 
                0.0001 * water_m3 + 
                0.002 * fuel_l
            ) * grid_intensity
            
            # Add seasonal component
            emissions *= 1 + 0.2 * np.sin(i/6)
            
            # Add to data
            data.append({
                'id': i + 1,
                'date': date.strftime('%Y-%m-%d'),
                'ds': date.strftime('%Y-%m-%d'),
                'energy_use (kWh)': round(energy_kwh, 2),
                'energy_kwh': round(energy_kwh, 2),
                'transport (km)': round(transport_km, 2),
                'transport_km': round(transport_km, 2),
                'waste (tons)': round(waste_kg / 1000, 2),  # Convert kg to tons for display
                'waste_kg': round(waste_kg, 2),
                'water (liters)': round(water_m3 * 1000, 2),  # Convert m3 to liters for display
                'water_m3': round(water_m3, 2),
                'fuel (liters)': round(fuel_l, 2),
                'fuel_l': round(fuel_l, 2),
                'emissions (tons CO2e)': round(emissions, 2),
                'y': round(emissions, 2),
                'production (units)': round(production_units, 2),
                'production_units': round(production_units, 2),
                'grid_intensity (kg CO2e/kWh)': round(grid_intensity, 2),
                'grid_intensity': round(grid_intensity, 2)
            })
        
        # Calculate summary statistics
        df = pd.DataFrame(data)
        
        summary = {
            'mean': {},
            'min': {},
            'max': {},
            'std': {},
            'total_rows': len(df)
        }
        
        display_columns = [
            'energy_use', 'transport', 'waste', 'water', 
            'fuel', 'emissions', 'production', 'grid_intensity'
        ]
        
        backend_columns = [
            'energy_kwh', 'transport_km', 'waste_kg', 'water_m3', 
            'fuel_l', 'y', 'production_units', 'grid_intensity'
        ]
        
        for display_col, backend_col in zip(display_columns, backend_columns):
            summary['mean'][display_col] = float(df[backend_col].mean())
            summary['min'][display_col] = float(df[backend_col].min())
            summary['max'][display_col] = float(df[backend_col].max())
            summary['std'][display_col] = float(df[backend_col].std())
        
        return jsonify({
            "data": data,
            "summary": summary,
            "message": "Sample data generated successfully"
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Generate sample data on startup
    with app.app_context():
        generate_sample()
    
    app.run(debug=True, host='0.0.0.0', port=5000)
