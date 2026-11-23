import eslintConfig from '@repo/project-config/lint/eslint.config.mjs';

const FSD_PUBLIC_API_PATTERNS = [
  {
    group: ['@/shared/*/**', '@/entities/*/**', '@/features/*/**', '@/widgets/*/**', '@/views/*/**'],
    message: 'FSD 슬라이스/세그먼트 내부 경로 대신 Public API(index.ts)를 통해 import하세요. 같은 슬라이스 내부에서는 상대 경로를 사용합니다.'
  }
];

const buildLayerBoundaryRule = (forbiddenLayers) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        ...FSD_PUBLIC_API_PATTERNS,
        ...forbiddenLayers.map((layer) => ({
          group: [`@/${layer}`, `@/${layer}/**`],
          message: `FSD 단방향 계층 규칙 위반: 현재 계층에서 '${layer}' 계층을 import할 수 없습니다.`
        }))
      ]
    }
  ]
});

export default [
  ...eslintConfig,
  {
    settings: {
      react: {
        version: 'detect'
      },
      next: {
        rootDir: process.cwd()
      }
    }
  },
  {
    files: ['app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: FSD_PUBLIC_API_PATTERNS }]
    }
  },
  {
    files: ['views/**/*.{ts,tsx}'],
    rules: buildLayerBoundaryRule(['app'])
  },
  {
    files: ['widgets/**/*.{ts,tsx}'],
    rules: buildLayerBoundaryRule(['app', 'views'])
  },
  {
    files: ['features/**/*.{ts,tsx}'],
    rules: buildLayerBoundaryRule(['app', 'views', 'widgets'])
  },
  {
    files: ['entities/**/*.{ts,tsx}'],
    rules: buildLayerBoundaryRule(['app', 'views', 'widgets', 'features'])
  },
  {
    files: ['shared/**/*.{ts,tsx}'],
    rules: buildLayerBoundaryRule(['app', 'views', 'widgets', 'features', 'entities'])
  }
];
