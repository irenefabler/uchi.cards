#!/usr/bin/env node
/* global process */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import inquirer from 'inquirer';

const runPrompt = async () => {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Имя проекта:',
        default: 'my-app',
        required: true
      },
      {
        type: 'input',
        name: 'basePath',
        message: 'BASE_PATH:',
        default: (answers) => `/${answers.projectName}`,
        required: true
      },
      {
        type: 'input',
        name: 'displayName',
        message: 'Человекопонятное название:',
        required: true
      },
      {
        type: 'input',
        name: 'repoUrl',
        message: 'Путь до репозитория:',
        default: 'https://gitlab.corp.mail.ru/uchiru/product/content-1-4/templates/frontend-fsd-template',
        required: true
      },
      {
        type: 'input',
        name: 'authPolicy',
        message: 'Полиси авторизации (например: math_race):',
        required: true
      },
      {
        type: 'input',
        name: 'devStage',
        message: 'Стейдж для разработки:',
        default: 'https://uchi.ru'
      },
      {
        type: 'input',
        name: 'codeOwners',
        message: 'CODEOWNERS:',
        default: '@uchiru/content-1-4'
      }
    ]);

    return answers;
  } catch (err) {
    if (err && err.name === 'ExitPromptError') {
      console.log('\n⏹️ Прервано пользователем');
      process.exit(0);
    }
    throw err;
  }
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const patchPlaceholder = (data) => {
  const placeholder = data.placeholder || '[TODO]';

  if (!existsSync(data.path)) {
    console.warn(`⚠️ Файл не найден: ${data.path}`);
    return;
  }

  if (!data.values) {
    console.warn(`⚠️ Для text типа нужна values - массив замен`);
    return;
  }

  let raw = readFileSync(data.path, 'utf8');
  let idx = 0;

  const pattern = new RegExp(escapeRegExp(placeholder), 'g');

  raw = raw.replace(pattern, () => {
    if (idx >= data.values.length) {
      console.warn(`⚠️ Больше ${placeholder}, чем значений для замены в ${data.path}`);
      return placeholder;
    }
    return data.values[idx++];
  });

  writeFileSync(data.path, raw);
  console.log(`✅ Обновлен файл: ${data.path}`);
};

const fillREADME = (path, displayName, checkedSteps) => {
  if (!existsSync(path)) {
    console.warn(`⚠️ Файл README не найден: ${path}`);
    return;
  }

  let raw = readFileSync(path, 'utf8');
  raw = raw.replace('[Название проекта]', displayName);

  let stepIndex = 0;
  raw = raw
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('- [ ]')) {
        stepIndex += 1;
        if (checkedSteps.includes(stepIndex)) {
          return line.replace('- [ ]', '- [x]');
        }
      }
      return line;
    })
    .join('\n');

  writeFileSync(path, raw, 'utf8');
  console.log(`✅ Обновлён README: ${path}`);
};

const sendSuccessMessages = (projectName) => {
  console.log(`✅ Проект ${projectName} успешно инициализирован!`);
  console.log('✨ Сияй: pnpm dev');
};

const run = async () => {
  console.log('🚀 Инициализация проекта...');
  const currentDir = process.cwd();

  const { projectName, basePath, displayName, repoUrl, authPolicy, devStage, codeOwners } = await runPrompt();

  patchPlaceholder({ path: `${currentDir}/package.json`, placeholder: 'frontend-fsd-template', values: [projectName] });
  patchPlaceholder({
    path: `${currentDir}/.shaman/app.yml`,
    values: [projectName, displayName, repoUrl, displayName, repoUrl]
  });
  patchPlaceholder({
    path: `${currentDir}/.shaman/defaults.yml`,
    values: [projectName, projectName, projectName, projectName]
  });
  patchPlaceholder({ path: `${currentDir}/.shaman/routing.yml`, values: [basePath, authPolicy, basePath] });
  patchPlaceholder({ path: `${currentDir}/.env.development`, values: [basePath, devStage] });
  patchPlaceholder({ path: `${currentDir}/.env.production`, values: [basePath] });
  patchPlaceholder({ path: `${currentDir}/.gitlab-ci.yml`, values: ['[TODO]', basePath] });
  patchPlaceholder({ path: `${currentDir}/index.html`, values: [displayName] });
  patchPlaceholder({
    path: `${currentDir}/.gitlab/CODEOWNERS`,
    values: [codeOwners],
    placeholder: '@uchiru/content-1-4'
  });
  fillREADME(`${currentDir}/README.md`, displayName, [1, 2, 3, 4, 5, 6, 7]);
  sendSuccessMessages(projectName);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
