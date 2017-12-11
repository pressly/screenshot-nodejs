# Screenshot as a service
Node.js server with REST API built on top of [GoogleChrome/puppeteer](https://github.com/GoogleChrome/puppeteer).

# Running screenshot in Docker
```
cd screenshot/
sudo docker build -t screenshot .
sudo docker run -p 8787:3000 screenshot
```
Set the number of browsers running in `Dockerfile` as an argument to server.js

# REST API
**/PNG** \
Query Params
- url: valid url (including https://) - required
- window: string composed of "{Int}x{Int}" - defaults to 800x600
  - the size of the browser window
- x: Int - defaults to 1 
- y: Int - defaults to 1
- crop: string composed of "{Int}x{Int}" - defaults to 800x600
- waitUntil: one of the following strings 
  - "load" - page loads
  - "domcontentloaded" - dom loaded 
  - "networkidle0" - network is idle with 0 requests for 500ms 
  - "networkidle2" - network is idle with 2 requests for 500ms
crop is picked from moving the x, y from top left of the window and the crop size defines the rectangle [(x, y), (x + cropx, y), (x + cropx, y + cropy), (x, y + cropy)]
**Example** 
```
GET localhost:{port}/png?url=https://www.google.com&window=500x500&crop=75x80&x=350&y=190
```
![alt text](https://i.imgur.com/i1SSbLM.png)

**/PDF** \
Query Params
- url: valid url (including https://) - required
- window: string composed of "{Int}x{Int}" - defaults to 800x600
- waitUntil: one of the following strings 
  - "load" - page loads
  - "domcontentloaded" - dom loaded 
  - "networkidle0" - network is idle with 0 requests for 500ms 
  - "networkidle2" - network is idle with 2 requests for 500ms
- format: one of the following strings
  - Letter: 8.5in x 11in
  - Legal: 8.5in x 14in
  - Tabloid: 11in x 17in
  - Ledger: 17in x 11in
  - A0: 33.1in x 46.8in
  - A1: 23.4in x 33.1in
  - A2: 16.5in x 23.4in
  - A3: 11.7in x 16.5in
  - A4: 8.27in x 11.7in
  - A5: 5.83in x 8.27in
  
**Example**
```
GET localhost:{port}/pdf?url=https://www.google.com&format=Letter
```
result: https://www.docdroid.net/223cLO0/pdf.pdf

# NOTES

There is a rate limiter set to limit the number of requests in a 3 second window to number of browsers open (set in Dockerfile) so if 10 browsers are open and 11 requests get made within 3 seconds the 11th will fail, it will be up to the client to retry.

# LICENSE

Screenshot is licensed under the [MIT license](./LICENSE).
GoogleChrome/puppeteer is licensed under the Apache License 2.0.
