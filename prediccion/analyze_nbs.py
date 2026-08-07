import json
import glob

notebooks = glob.glob('*.ipynb')
for nb_path in notebooks:
    with open(nb_path, 'r', encoding='utf-8') as f:
        nb = json.load(f)
    
    code_lines = 0
    markdown_lines = 0
    code_cells = 0
    markdown_cells = 0
    
    for cell in nb.get('cells', []):
        if cell.get('cell_type') == 'code':
            code_cells += 1
            code_lines += len(cell.get('source', []))
        elif cell.get('cell_type') == 'markdown':
            markdown_cells += 1
            markdown_lines += len(cell.get('source', []))
            
    print(f"File: {nb_path}")
    print(f"  Code cells: {code_cells}, Code lines: {code_lines}")
    print(f"  Markdown cells: {markdown_cells}, Markdown lines: {markdown_lines}")
    print("-" * 40)
