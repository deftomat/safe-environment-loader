const loaderUtils = require('loader-utils');

const commentedCode = /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm;
const envVariable = /process\.env\.([a-z0-9_]*)/gi;

function loader(source) {
  this.cacheable(false);

  const options = loaderUtils.getOptions(this) || {};
  const { defaults = {}, filter = () => true } = options;

  const match = source.replace(commentedCode, '').match(envVariable) || [];

  return match
    .filter(item => item !== 'process.env.NODE_ENV')
    .map(item => {
      const name = item.replace('process.env.', '');
      const value = process.env[name] || defaults[name];

      // Skip substitution when filter function returns false.
      if (filter(name, value) === false) return { item, value: item };

      if (value === undefined) {
        throw Error(`Environment variable "${name}" is missing!`);
      }
      if (typeof value !== 'string') return { item, value };
      if (value.toLowerCase() === 'null') return { item, value: null };
      if (value.toLowerCase() === 'undefined') return { item, value: undefined };
      if (isNaN(value)) return { item, value: `"${value}"` };

      return { item, value: Number(value) };
    })
    .reduce((source, { item, value }) => source.replace(item, value), source);
}

module.exports = loader;
