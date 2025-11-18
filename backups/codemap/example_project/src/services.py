"""Business logic services"""

from .models import User


class DataService:
    """Service for data operations"""
    
    def get_user(self, user_id: int) -> User:
        """Get user by ID"""
        return User(id=user_id, name="John Doe")
    
    def save_user(self, user: User):
        """Save user to database"""
        print(f"Saving user: {user.name}")
    
    def delete_user(self, user_id: int):
        """Delete user - never called"""
        print(f"Deleting user {user_id}")
