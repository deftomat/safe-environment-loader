# 2.0.1

- fix: code comments match

# 2.0.0

- BREAKING: `envResolver` is now the plain function instead of a filename
- BREAKING: requires Node 12

# 1.2.2

- support `null`, `undefined`, `false` values

# 1.2.1

- improve error messages

# 1.2.0

- add `envResolver` option. Plugin will try to find a file specified in `envResolver` and tries to run an exported function to obtain the environment values.

# 1.1.0

- Add `filter` option. Plugin filters which ENV variables will be process and which will not based on the provided function.

# 1.0.0

- Initial release
