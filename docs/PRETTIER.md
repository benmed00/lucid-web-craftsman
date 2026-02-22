# Prettier configuration

Project uses Prettier via `.prettierrc.json`. JSON does not support comments, so options are documented here.

## Options (`.prettierrc.json`)

| Option           | Value   | Description                                   |
| ---------------- | ------- | --------------------------------------------- |
| `semi`           | `true`  | Semicolons at end of statements               |
| `trailingComma`  | `"es5"` | Trailing commas where valid in ES5            |
| `singleQuote`    | `true`  | Single quotes for strings                     |
| `printWidth`     | `80`    | Wrap lines at 80 characters                   |
| `tabWidth`       | `2`     | 2 spaces per indent level                     |
| `useTabs`        | `false` | Use spaces, not tabs                          |

## Ignore list

See `.prettierignore` for excluded paths (lockfiles, build output, long-form docs).
