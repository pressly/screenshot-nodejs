FROM alekzonder/puppeteer

WORKDIR /app

ADD . /app

RUN npm install

EXPOSE 80

CMD ["node", "server.js"]
