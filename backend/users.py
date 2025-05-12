import os
import json
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash

# Path to the users database file
USERS_DB_FILE = os.path.join(os.path.dirname(__file__), 'users.json')

# Default admin user
DEFAULT_ADMIN = {
    "id": "admin-1",
    "username": "admin",
    "email": "admin@yaptzaki.com",
    "password": generate_password_hash("admin123"),
    "role": "admin",
    "created_at": datetime.now().isoformat(),
    "last_login": None,
    "profile": {
        "full_name": "Admin User",
        "department": "IT",
        "position": "System Administrator"
    }
}

# Initialize users database if it doesn't exist
def init_users_db():
    if not os.path.exists(USERS_DB_FILE):
        with open(USERS_DB_FILE, 'w') as f:
            json.dump({"users": [DEFAULT_ADMIN]}, f, indent=2)
        print("Users database initialized with default admin user")
    return True

# Get all users
def get_all_users():
    if not os.path.exists(USERS_DB_FILE):
        init_users_db()
    
    with open(USERS_DB_FILE, 'r') as f:
        data = json.load(f)
    
    return data.get("users", [])

# Get user by username
def get_user_by_username(username):
    users = get_all_users()
    for user in users:
        if user["username"] == username:
            return user
    return None

# Get user by email
def get_user_by_email(email):
    users = get_all_users()
    for user in users:
        if user["email"] == email:
            return user
    return None

# Get user by ID
def get_user_by_id(user_id):
    users = get_all_users()
    for user in users:
        if user["id"] == user_id:
            return user
    return None

# Create a new user
def create_user(username, email, password, role="user", profile=None):
    print(f"Attempting to create user: {username}, {email}")
    
    if get_user_by_username(username):
        print(f"Username already exists: {username}")
        return False, "Username already exists"
    
    if get_user_by_email(email):
        print(f"Email already exists: {email}")
        return False, "Email already exists"
    
    users = get_all_users()
    
    new_user = {
        "id": f"user-{len(users) + 1}",
        "username": username,
        "email": email,
        "password": generate_password_hash(password),
        "role": role,
        "created_at": datetime.now().isoformat(),
        "last_login": None,
        "profile": profile or {}
    }
    
    users.append(new_user)
    
    try:
        with open(USERS_DB_FILE, 'w') as f:
            json.dump({"users": users}, f, indent=2)
        print(f"User created successfully: {username}")
        
        # Verify the user was actually saved
        if get_user_by_username(username):
            print(f"User verified in database: {username}")
        else:
            print(f"WARNING: User not found in database after creation: {username}")
    except Exception as e:
        print(f"Error saving user to database: {str(e)}")
        return False, f"Error saving user: {str(e)}"
    
    # Return user without password
    user_copy = new_user.copy()
    user_copy.pop("password", None)
    return True, user_copy

# Update user's last login time
def update_last_login(user_id):
    users = get_all_users()
    for user in users:
        if user["id"] == user_id:
            user["last_login"] = datetime.now().isoformat()
            
            with open(USERS_DB_FILE, 'w') as f:
                json.dump({"users": users}, f, indent=2)
            return True
    
    return False

# Verify user credentials
def verify_user(username, password):
    user = get_user_by_username(username)
    
    if not user:
        return False, "User not found"
    
    if check_password_hash(user["password"], password):
        update_last_login(user["id"])
        # Return user without password
        user_copy = user.copy()
        user_copy.pop("password", None)
        return True, user_copy
    
    return False, "Invalid password"

# Update user profile
def update_user_profile(user_id, profile_data):
    users = get_all_users()
    for user in users:
        if user["id"] == user_id:
            user["profile"].update(profile_data)
            
            with open(USERS_DB_FILE, 'w') as f:
                json.dump({"users": users}, f, indent=2)
            
            # Return user without password
            user_copy = user.copy()
            user_copy.pop("password", None)
            return True, user_copy
    
    return False, "User not found"

# Change user password
def change_password(user_id, current_password, new_password):
    users = get_all_users()
    for user in users:
        if user["id"] == user_id:
            if check_password_hash(user["password"], current_password):
                user["password"] = generate_password_hash(new_password)
                
                with open(USERS_DB_FILE, 'w') as f:
                    json.dump({"users": users}, f, indent=2)
                
                return True, "Password updated successfully"
            else:
                return False, "Current password is incorrect"
    
    return False, "User not found"

# Initialize the users database when this module is imported
init_users_db()
