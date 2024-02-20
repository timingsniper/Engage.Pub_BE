
FROM node:18-alpine
WORKDIR /usr/src/app
COPY . .
RUN yarn install
EXPOSE 5000
CMD [ "node", "app.js" ]