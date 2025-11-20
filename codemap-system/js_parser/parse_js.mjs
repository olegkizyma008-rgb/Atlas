import { parse } from '@babel/parser';
import fs from 'fs';

const filePath = process.argv[2];

if (!filePath) {
  console.error('File path is required');
  process.exit(1);
}

fs.readFile(filePath, 'utf8', (err, content) => {
  if (err) {
    console.error(`Error reading file: ${err}`);
    process.exit(1);
  }

  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        ['decorators', { decoratorsBeforeExport: true }],
        'classProperties',
        'optionalChaining',
        'nullishCoalescingOperator',
      ],
    });
    console.log(JSON.stringify(ast, null, 2));
  } catch (parseError) {
    console.error(`Error parsing file: ${parseError}`);
    process.exit(1);
  }
});
