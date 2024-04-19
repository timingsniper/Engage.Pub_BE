
FROM node:18-alpine
WORKDIR /usr/src/app
COPY . .
RUN yarn install --ignore-engines
EXPOSE 5000
CMD [ "node", "app.js" ]