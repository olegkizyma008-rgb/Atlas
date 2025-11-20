import os
from .analyzers import code_parser, metrics_calculator

def analyze_project(project_path):
    for root, _, files in os.walk(project_path):
        for file in files:
            filepath = os.path.join(root, file)

            if file.endswith('.py'):
                # Functions will be extracted here
                pass
            elif file.endswith('.js'):
                # Functions will be extracted here
                pass

if __name__ == "__main__":
    # The project path will be provided as an argument
    analyze_project('.')
