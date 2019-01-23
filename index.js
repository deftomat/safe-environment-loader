const loaderUtils = require('loader-utils');
const minimist = require('minimist');
const findUp = require('find-up');

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
    callback(Error('SAFE-ENVIRONMENT-LOADER: ' + error), null);
  }
}

async function tryLoadEnv(resolverFilename, context, addDependency) {
  if (resolverFilename == null) return {};

  const path = await findUp(resolverFilename, { cwd: context });
  if (path == null) return {};

  addDependency(path);
  const env = await resolveEnv(path);
  await resolvePromises(env);
  return env;
}

function resolveEnv(resolverPath) {
  delete require.cache[resolverPath];
  const resolver = require(resolverPath);

  if (typeof resolver === 'function') {
    return resolver({ args });
  } else if (typeof resolver === 'object') {
    return resolver;
  } else {
    throw Error(
      `Failed to resolve a result from ${resolverPath}! File must exports a plain object or a function.`
    );
  }
}

function resolvePromises(obj) {
  const promises = [];

  Object.keys(obj).forEach(key => {
    const value = obj[key];

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
      const value = process.env[name] || loadedEnv[name] || defaults[name];

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
