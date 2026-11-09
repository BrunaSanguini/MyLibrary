// Pre-commit checks of the front-end files (the hook lives in /.husky).
// Tools run through `node` with the absolute path of their script: lint-staged runs from the
// repository root, where the front-end binaries are not on the PATH, and this works the same
// on Windows (paths with spaces included).
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

function tool(packageName, binName = packageName) {
  const manifestPath = require.resolve(`${packageName}/package.json`);
  const { bin } = require(manifestPath);
  const script = typeof bin === 'string' ? bin : bin[binName];
  return `node "${path.join(path.dirname(manifestPath), script)}"`;
}

const files = (paths) => paths.map((file) => `"${file}"`).join(' ');

const eslint = tool('eslint');
const prettier = tool('prettier');
const stylelint = tool('stylelint');

export default {
  '*.{ts,mjs,html}': (paths) => [
    `${eslint} --fix ${files(paths)}`,
    `${prettier} --write ${files(paths)}`,
  ],
  '*.css': (paths) => [`${stylelint} --fix ${files(paths)}`, `${prettier} --write ${files(paths)}`],
  '*.{json,md}': (paths) => `${prettier} --write --ignore-unknown ${files(paths)}`,
};
