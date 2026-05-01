/**
 * Commitlint — conventional commits + rejects tooling-default subjects (e.g. "Changes").
 */

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [
    (message) =>
      /^Merge\b/m.test(message) ||
      /^Merged\b/m.test(message) ||
      /^Revert\b/m.test(message) ||
      /^Merge pull request\b/m.test(message) ||
      /^Merged in\b/m.test(message) ||
      /^(fixup|squash)!/m.test(message),
    (message) =>
      /^chore\b/i.test(message) && /\brelease\b/i.test(message),
  ],
  plugins: [
    {
      rules: {
        /**
         * @param {{ subject?: string | null }} parsed
         * @returns {import('@commitlint/types').CommitlintRuleOutcome}
         */
        'forbidden-generic-subjects': (parsed) => {
          const subject = (parsed.subject ?? '').trim();
          if (
            /^changes$/i.test(subject) ||
            /^wip$/i.test(subject) ||
            /^save plan\b/i.test(subject) ||
            /^\.{3,}$/.test(subject) ||
            /^update$/i.test(subject)
          ) {
            return [
              false,
              'disallowed generic subject — use conventional type(scope): with a descriptive summary.',
            ];
          }
          return [true];
        },
      },
    },
  ],
  rules: {
    'forbidden-generic-subjects': [2, 'always'],
  },
};
