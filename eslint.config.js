import antfu from '@antfu/eslint-config'

export default antfu({
  // javascript: {
  //   overrides: {
  //     'test/no-import-node-test': 'off',
  //   },
  // },
}, {
  rules: {
    'test/no-import-node-test': 'off',
    'no-control-regex': 'off',
    'node/prefer-global/process': 'off',
  },
})
