"""Data models"""


class User:
    """User model"""
    
    def __init__(self, id: int, name: str):
        self.id = id
        self.name = name
    
    def to_dict(self):
        """Convert to dictionary"""
        return {"id": self.id, "name": self.name}
