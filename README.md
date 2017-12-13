# Screenshot as a service
Node.js server with REST API built on top of [GoogleChrome/puppeteer](https://github.com/GoogleChrome/puppeteer).

# Running screenshot in Docker
```
cd screenshot/server
sudo docker build -t screenshot .
sudo docker run -p 8787:3000 screenshot
```
Set the number of browsers running in `Dockerfile` as an argument to server.js

# REST API
**Important**
`url` query param needs to be url_encoded for all endpoints

using https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent

definitions of encoding and decoding

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
**Example** 
```
GET localhost:{port}/png?url=https://www.google.com&window=500x500&crop=75x80&x=350&y=190
```
![alt text](https://i.imgur.com/i1SSbLM.png)

**/JPEG**
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
- jpegQuality: Int - 0 to 100 inclusive
**Example** 
```
GET localhost:{port}/jpeg?url=https://www.google.com&window=500x500&crop=75x80&x=350&y=190&jpegQuality=50
```

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
- scale: Float -  Scale of the webpage rendering. Defaults to 1.
- displayHeaderFooter: Boolean - Display header and footer. Defaults to false.
- printBackground: Boolean - Defaults to false
- landscape: Boolean - Paper orientation Defaults to false
- path: String - The file path to save the PDF to. If path is a relative path, then it is resolved relative to current working directory. If no path is provided, the PDF won't be saved to the disk. -- note this is only on the server
- pageRanges: String - Ranges to capture ex: '1-5,8,11-13' defaults to ''
- margin: in format 'top:{val};bottom:{val};left:{val};right{val}' - type of val is string ('50' or '50px' or '50%')

**Example**
```
GET localhost:{port}/pdf?url=https://www.google.com&format=Letter
```
result: https://www.docdroid.net/223cLO0/pdf.pdf

# NOTES

crop is picked from moving the x, y from top left of the window and the crop size defines the rectangle [(x, y), (x + cropx, y), (x + cropx, y + cropy), (x, y + cropy)].

There is a rate limiter set to limit the number of requests in a 3 second window to number of browsers open (set in Dockerfile) so if 10 browsers are open and 11 requests get made within 3 seconds the 11th will fail, it will be up to the client to retry.

# LICENSE

Screenshot is licensed under the [MIT license](./LICENSE).
GoogleChrome/puppeteer is licensed under the Apache License 2.0.
