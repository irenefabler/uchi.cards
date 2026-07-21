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

ENV NPM_REGISTRY //verdaccio-uchi.runit.cc/

RUN echo "@front:registry=https:$NPM_REGISTRY" >> ~/.npmrc
RUN echo "@uchi-schema:registry=https:$NPM_REGISTRY" >> ~/.npmrc
RUN echo "@uchi:registry=https:$NPM_REGISTRY" >> ~/.npmrc
RUN --mount=type=secret,id=npm_token \
  echo "$NPM_REGISTRY:_authToken=$(cat /kaniko/npm_token)" >> .npmrc

COPY package.json pnpm-lock.yaml /app/
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN rm -f .npmrc
COPY . /app

RUN NODE_ENV=production pnpm build

# Основа образа для запуска приложения
FROM ${BASE_IMAGE}
# Устанавливаем переменную окружения
ENV BASE_PATH=${BASE_PATH}
# Копируем результат сборки в образ для запуска
COPY --from=build /app/dist /var/www
