const loaderUtils = require('loader-utils');

function loader(source) {
  const options = loaderUtils.getOptions(this);
  const defaults = options ? options.defaults || {} : {};

  this.cacheable(false);

  const match = source
    .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '')
    .match(/process\.env\.([a-z0-9_]*)/gi);

  const updated = (match || [])
    .filter(item => item !== 'process.env.NODE_ENV')
    .map(item => {
      const name = item.replace('process.env.', '');
      const value = process.env[name] || defaults[name];

      if (value === undefined) {
        throw Error(`Environment variable "${name}" is missing!`);
      }
      if (typeof value !== 'string') return { item, value };
      if (value.toLowerCase() === 'null') return { item, value: null };
      if (isNaN(value) || value === '') return { item, value: `"${value}"` };
      return { item, value };
    })
    .reduce((source, { item, value }) => source.replace(item, value), source);

  return updated;
}

module.exports = loader;
