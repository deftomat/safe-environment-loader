const loaderUtils = require('loader-utils');
const minimist = require('minimist');
const findUp = require('find-up');
const path = require('path');

const args = minimist(process.argv.slice(2));
const commentedCode = /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm;
const envVariable = /process\.env\.([a-z0-9_]*)/gi;

async function loader(source) {
  this.cacheable(true);
  const callback = this.async();
  const context = this.rootContext;
  const addDependency = this.addDependency;

  const options = loaderUtils.getOptions(this) || {};

  try {
    const loadedEnv = await tryLoadEnv(options.envResolver, context, addDependency);
    const result = substituteEnv(source, loadedEnv, options);
    callback(null, result);
  } catch (error) {
    callback(Error(`[SAFE-ENVIRONMENT-LOADER] ${error.message || error}`), null);
  }
}

async function tryLoadEnv(resolverFilename, context, addDependency) {
  if (resolverFilename == null) return {};

  const path = await findUp(resolverFilename, { cwd: context });
  if (path == null) return {};

  addDependency(path);
  const env = await resolveEnv(context, path);
  await resolvePromises(env);
  return env;
}

function resolveEnv(context, resolverPath) {
  delete require.cache[resolverPath];
  const resolver = require(resolverPath);

  if (typeof resolver === 'function') {
    return resolver({ args });
  } else if (typeof resolver === 'object') {
    return resolver;
  } else {
    throw Error(
      `Failed to resolve the custom environment resolver!\n\n` +
        `Resolver must exports a plain object or a function.\n` +
        `Loader tries to resolve the export of "${path.relative(context, resolverPath)}" file.\n` +
        `To resolve this issue, you can do one of the following:\n` +
        `  - Export a plain object or a function which returns it\n` +
        `  - Update your Webpack config to ignore this file when it is not intended to be an environment resolver\n` +
        `  - Change the name of the file to something different\n`
    );
  }
}

function resolvePromises(obj) {
  const promises = [];

  Object.keys(obj).forEach(key => {
    const value = obj[key];

    if (value == null) return;

    if (typeof value === 'object' && value.then != null) {
      promises.push(value.then(v => (obj[key] = v)));
    }

    if (typeof value === 'object' && value.then == null) {
      promises.push(resolvePromises(value));
    }
  });

  return Promise.all(promises);
}

function substituteEnv(source, loadedEnv, { defaults = {}, filter = () => true }) {
  const match = source.replace(commentedCode, '').match(envVariable) || [];

  return match
    .filter(item => item !== 'process.env.NODE_ENV')
    .map(item => {
      const name = item.replace('process.env.', '');
      const value = extractValue(name, loadedEnv, defaults);

      // Skip substitution when filter function returns false.
      if (filter(name, value) === false) return { item, value: item };

      if (typeof value !== 'string') return { item, value };
      if (value.toLowerCase() === 'null') return { item, value: null };
      if (value.toLowerCase() === 'undefined') return { item, value: undefined };
      if (isNaN(value)) return { item, value: `"${value}"` };

      return { item, value: Number(value) };
    })
    .reduce((source, { item, value }) => source.replace(item, value), source);
}

function extractValue(name, loadedEnv, defaults) {
  if (process.env.hasOwnProperty(name)) return process.env[name];
  if (loadedEnv.hasOwnProperty(name)) return loadedEnv[name];
  if (defaults.hasOwnProperty(name)) return defaults[name];

  throw Error(
    `Environment variable "${name}" is missing!\n\n` +
      `Loader tries to replace "process.env.${name}" with the real value. Unfortunatelly, no value was provided.\n` +
      `To resolve this issue, you can do one of the following:\n` +
      `  - Provide the value manually in your terminal: "${name}=<value> <your_command>"\n` +
      `  - Create custom environment resolver (https://bit.ly/2WeCMZg)\n` +
      `  - Remove "process.env.${name}" if it is not strictly necessary\n`
  );
}

module.exports = loader;
