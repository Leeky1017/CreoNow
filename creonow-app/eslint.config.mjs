import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettierConfig from 'eslint-config-prettier'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'storybook-static/**',
  ]),
  {
    rules: {
      // P5-禁令 #1: 禁止 any 类型
      '@typescript-eslint/no-explicit-any': 'error',

      // 禁止在 style 属性中硬编码颜色值——应使用 Design Token
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name="style"] Literal[value=/(?:#[0-9a-fA-F]{3,8}|\\brgba?\\s*\\(|\\bhsla?\\s*\\()/]',
          message: '禁止在 style 属性中硬编码颜色值，请使用 CSS 变量 / Design Token。',
        },
        {
          selector:
            'JSXAttribute[name.name="style"] TemplateLiteral[quasis.0.value.raw=/(?:#[0-9a-fA-F]{3,8}|\\brgba?\\s*\\(|\\bhsla?\\s*\\()/]',
          message: '禁止在 style 属性中硬编码颜色值，请使用 CSS 变量 / Design Token。',
        },
        {
          selector:
            'JSXAttribute[name.name="className"] Literal[value=/(?:#[0-9a-fA-F]{3,8}|\\brgba?\\s*\\(|\\bhsla?\\s*\\()/]',
          message: '禁止在 className 中硬编码颜色值，请使用 Design Token（如 bg-cn-bg-selected）。',
        },
        {
          selector:
            'JSXAttribute[name.name="className"] TemplateLiteral[quasis.0.value.raw=/(?:#[0-9a-fA-F]{3,8}|\\brgba?\\s*\\(|\\bhsla?\\s*\\()/]',
          message: '禁止在 className 中硬编码颜色值，请使用 Design Token（如 bg-cn-bg-selected）。',
        },
      ],
    },
  },
  // eslint-config-prettier must be last to disable conflicting formatting rules
  prettierConfig,
])

export default eslintConfig
