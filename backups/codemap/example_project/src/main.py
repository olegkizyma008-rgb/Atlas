"""Example project for Codemap Analyzer"""

from .utils import helper_function
from .services import DataService
from .models import User


class Application:
    """Main application class"""
    
    def __init__(self):
        self.service = DataService()
    
    def run(self):
        """Run the application"""
        user = self.service.get_user(1)
        self.process_user(user)
    
    def process_user(self, user: User):
        """Process user data"""
        result = helper_function(user.name)
        print(f"Processing: {result}")
    
    def unused_method(self):
        """This method is never called - dead code"""
        return "I'm not used anywhere"


def main():
    """Entry point"""
    app = Application()
    app.run()


if __name__ == "__main__":
    main()
