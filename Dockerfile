# Основа образа для сборки приложения
FROM node:24.18.0-alpine as build

# Тут описываем шаги сборки, pnpm install, pnpm build и так далее
# Как лучше и почему читать тут - https://docs.docker.com/develop/develop-images/dockerfile_best-practices/

ARG BASE_IMAGE
ARG BASE_PATH
ARG https_proxy
ARG no_proxy

WORKDIR /app

# Ставим pnpm глобально через npm. Corepack не используем: в CI нет прямого доступа
# к registry.npmjs.org, а corepack не умеет ходить через https_proxy. npm — умеет.
RUN npm install -g pnpm@11.15.1

# Внутренние конфиг-пакеты @uchi/content-0-4-* вендорены в vendor/ (pnpm-workspace),
# поэтому для установки зависимостей больше не нужна авторизация во внутреннем Verdaccio.
# Публичные пакеты приходят из registry.npmjs.org через https_proxy.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
COPY vendor/ /app/vendor/
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . /app

RUN NODE_ENV=production pnpm build

# Основа образа для запуска приложения
FROM ${BASE_IMAGE}
# Устанавливаем переменную окружения
ENV BASE_PATH=${BASE_PATH}
# Копируем результат сборки в образ для запуска
COPY --from=build /app/dist /var/www
