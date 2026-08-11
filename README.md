# [Название проекта]

> Основано на [FSD шаблоне](https://gitlab.corp.mail.ru/uchiru/product/content-1-4/templates/frontend-fsd-template).

## 🧱 Описание

Шаблон фронтенд-приложения, структурированного по FSD-архитектуре.

---

## 🚀 Быстрый старт

### 🧭 TODO

Перед использованием обязательно:

- [ ] Задать `VITE_BASE_PATH` и `VITE_PROXY_URL` в `.env` \*
- [ ] Задать `name`, `desc`, `targets`, `path` и `prefix` в `.shaman/*.yml` \*
- [ ] Задать `BASE_PATH` в `.gitlab-ci.yml` \*
- [ ] Настроить alias'ы в `tsconfig.json`, `tsconfig.eslint.json`, `tsconfig.node.json`  и `vite.config.ts`, если требуется. По умолчанию `src`.
- [ ] Указать пути для proxy в `.env.development`**, если используете API
- [ ] Указать свою команду `.gitlab/CODEOWNERS`
- [ ] Заполнить README

\* Для удобства используй поиск по проекту [TODO]

\** Для ещё большего удобства можно использовать `pnpm init-template`

\*** Для добавления прокси нужно завести в ***.env.development*** переменные начинающиеся с ***VITE_PROXY_PATH***, например ***VITE_PROXY_PATH_BACKEND=/math_race/api/v1***, тогда они автоматически будут подставлены в конфиге ***server.proxy***. Пример использования можно посмотреть в [test-project](https://gitlab.corp.mail.ru/uchiru/product/content-1-4/core/content-0-4-configs) .

### Установка

```bash
pnpm install
```

### Запуск скрипта инициализации шаблона

```bash
pnpm init-template
```

### Запуск в dev-режиме

```bash
pnpm dev
```

### Сборка

```bash
pnpm build
```

---

## 📁 Структура проекта

```bash
src/
├── app/           # Точка входа, глобальные стили и конфигурации
├── entities/      # Бизнес-сущности (например, Character, User)
├── features/      # Переиспользуемые фичи (например, Shop)
├── pages/         # Страницы приложения (например, BattlePage)
├── shared/        # Общие утилиты, API, контексты, модели
├── widgets/       # Самодостаточные крупные блоки UI
```

---

## 🛠 Стек технологий

- **React 19**
- **Zustand** — клиентское состояние (UI/доменные сторы)
- **@tanstack/react-query** — серверное состояние (запросы к API, кеш)
- **Tailwind CSS v4** — утилитарные стили (CSS-first конфигурация)
- **TypeScript**
- **Vite**
- **React Router v7**
- **CSS Modules**

PS. Зависимости устанавливаем с точной версией. В `.npmrc` задано `save-exact=true`, поэтому достаточно `pnpm add <pkg>`, например **`pnpm add zustand`**

---

## 🧩 Управление состоянием

Разделение по природе состояния:

- **Серверное состояние** (данные с API) — **TanStack Query**. Запросы абстрагируются в кастомные хуки (например, `useUserQuery` в `shared/api`). Не дублируйте данные запроса в локальные сторы — используйте результат хука напрямую.
- **Клиентское состояние** (UI/доменное) — **Zustand**. Сторы создаются фабриками `create*Store()` с middleware `subscribeWithSelector`, состояние и действия разделены. В компонентах используем точечные селекторы: `useStore(store, (s) => s.field)`.

Глобальные провайдеры живут в `src/shared/context` (`QueryProvider`).

---

## 🎨 Стили

- **Tailwind v4** подключён через плагин `@tailwindcss/vite` в `vite.config.ts`; импорт и дизайн-токены — в `src/app/styles/app.css` (`@import 'tailwindcss'`, блок `@theme`).
- **CSS Modules** по-прежнему доступны для локальных стилей компонентов (`.module.css`).

---

## ⚙️ Конфигурация

### .env

Заполните файлы `.env.development` и `.env.production`:

```env
VITE_BASE_PATH=[TODO]
VITE_PROXY_URL=[TODO]
```

---

## 🧪 Скрипты

| Скрипт           | Описание                           |
|------------------|------------------------------------|
| `pnpm dev`       | Локальный запуск Vite              |
| `pnpm build`     | Сборка проекта                     |
| `pnpm preview`   | Предпросмотр билда                 |
| `pnpm lint`      | Проверка eslint'ом                 |

---

## 🔧 GitLab CI

CI/CD на основе шаблона:

- `.gitlab-ci.yml` подключает шаблон `uchiru/ci/shared`
- Сборка в Dockerfile идёт через **pnpm** (ставится `npm install -g pnpm`); lock-файл `pnpm-lock.yaml` должен быть закоммичен
- Внутренние конфиг-пакеты `@uchi/content-0-4-*` вендорены в `vendor/` (pnpm-workspace), поэтому `NPM_TOKEN` для сборки не нужен. Убедитесь, что настроена переменная `BASE_PATH`

## 🧠 Дополнительно

Проект следует принципам Feature-Sliced Design. Подробности — [feature-sliced.design](https://feature-sliced.github.io/documentation/ru/)
