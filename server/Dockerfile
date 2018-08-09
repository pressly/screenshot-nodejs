# taken mostly from https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md

# https://github.com/GoogleChrome/puppeteer/issues/379 
# when ^ gets resolved we'll go to alpine based image (node:8-alpine)
# using node 8 instead of 9 because 8 is in LTS (https://github.com/nodejs/Release)
FROM node:10.6.0-slim

WORKDIR /app

ADD . /app

# Install latest chrome dev package.
# Note: this installs the necessary libs to make the bundled version of Chromium that Pupppeteer
# installs, work.
RUN apt-get update && apt-get install -y wget --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge --auto-remove -y curl \
    && rm -rf /src/*.deb

RUN npm install
RUN npm run-script build

# Add pptr user.
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app/node_modules

# Run user as non privileged.
USER pptruser

EXPOSE 9229
EXPOSE 3000

# start server with 20 browsers in the pool
CMD ["node", "dist/server.js", "20"]
