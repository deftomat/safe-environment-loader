import { getOptions } from 'loader-utils';

const commentedCode = /\/\*[\s\S]*?\*\/|\/\/[^\n\r]+?(?:\*\)|[\n\r])/gm;
const envVariable = /process\.env\.([a-z0-9_]*)/gi;
const resourceDependencies = new Map<string, string[]>();

export default async function loader(this: LoaderContext, source: string) {
  this.cacheable(true);
  const callback = this.async();
  const { addDependency } = this;
  const { resourcePath } = this;
  const loaderOptions: LoaderOptions = getOptions(this);

  const { envResolver = defaultEnvResolver, filter = defaultFilter } = loaderOptions;

  try {
    const {
      values: resolvedEnv = {},
      error: resolvedError,
      files: dependencies = []
    } = await envResolver();

    resourceDependencies[resourcePath] = dependencies;
    if (resolvedError) throw resolvedError;

    dependencies.forEach(addDependency);

    const result = substituteEnv(source, resolvedEnv, filter);
    callback(null, result);
  } catch (error) {
    const lastDependencies = resourceDependencies[resourcePath] ?? [];
    lastDependencies.forEach(addDependency);
    callback(Error(`[SAFE-ENVIRONMENT-LOADER] ${error.message || error}`), null);
  }
}

function substituteEnv(source: string, resolvedEnv: EnvValues, filter: Filter): string {
  const match = source.replace(commentedCode, '').match(envVariable) || [];

  return match
    .filter(item => item !== 'process.env.NODE_ENV')
    .map(item => {
      const name = item.replace('process.env.', '');
      const value = extractValue(name, resolvedEnv);

      // Skip substitution if filter returns false.
      if (filter(name, value) === false) return { item, value: item };

      if (typeof value !== 'string') return { item, value };
      if (value.toLowerCase() === 'null') return { item, value: null };
      if (value.toLowerCase() === 'undefined') return { item, value: undefined };
      if (isNaN(Number(value))) return { item, value: `"${value.replace(/"/g, `\\"`)}"` };

      return { item, value: Number(value) };
    })
    .reduce((source, { item, value }) => source.replace(item, value), source);
}

function extractValue(name: string, resolvedEnv: EnvValues): any {
  if (process.env.hasOwnProperty(name)) return process.env[name];
  if (resolvedEnv.hasOwnProperty(name)) return resolvedEnv[name];

  throw Error(
    `Environment variable "${name}" is missing!\n\n` +
      `Loader tries to replace "process.env.${name}" with the real value. Unfortunately, no value was provided.\n` +
      `To resolve this issue, you can do one of the following:\n` +
      `  - provide the value manually in your terminal: "${name}=<value> <your_command>"\n` +
      `  - use custom environment resolver (https://bit.ly/2WeCMZg)\n` +
      `  - remove "process.env.${name}" if it is not strictly necessary\n`
  );
}

interface LoaderOptions {
  readonly envResolver?: EnvResolver;
  readonly filter?: Filter;
}

interface LoaderContext {
  readonly resourcePath: string;
  cacheable(cacheable: boolean): void;
  async(): (error: Error | null, result: string | null) => void;
  addDependency(path: string): void;
}

type EnvValues = Record<string, any>;
type EnvResolver = () => Promise<{ values?: EnvValues; error?: Error; files?: string[] }>;
type Filter = (name: string, value: any) => boolean;

const defaultEnvResolver: EnvResolver = () => Promise.resolve({});
const defaultFilter: Filter = () => true;
