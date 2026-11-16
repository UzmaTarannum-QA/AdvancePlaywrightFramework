# AdvancePlaywrightFramework

A Playwright and TypeScript test automation project using page objects and reusable test utilities.

## Prerequisites

- Node.js and npm

## Setup

Install the project dependencies and the Chromium browser:

```bash
npm install
npx playwright install chromium
```

## Running tests

Run the tests in the configured `tests` directory with Chromium:

```bash
npx playwright test --project=chromium
```

The login test is currently in `src/tests`, outside the configured `testDir`. Run it by specifying that directory:

```bash
npx playwright test --test-dir=src/tests login.spec.ts --project=chromium
```

Playwright HTML reports are written to `playwright-report/`.

## Project structure

```text
.
├── .github/              # GitHub Actions workflow
├── docs/                 # Project documentation
├── rules/                # Project rules
├── src/
│   ├── api/              # API clients
│   ├── config/           # Environment configuration
│   ├── fixtures/         # Custom Playwright fixtures
│   ├── pages/            # Page Object Model classes
│   ├── testdata/         # Test data
│   ├── tests/            # Additional test cases
│   └── utils/            # Reusable helpers and readers
├── tests/                # Tests in Playwright's configured test directory
├── package.json
├── playwright.config.ts
└── tsconfig.json
```

## Environment variables

Keep local environment settings and credentials in `.env`. That file is ignored by Git; do not commit secrets.
