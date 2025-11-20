from radon.visitors import ComplexityVisitor

def calculate_complexity(code):
    visitor = ComplexityVisitor.from_code(code)
    return visitor.total_complexity
