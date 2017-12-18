// browser.ts
import 'mocha'
import * as chai from 'chai'
import { expect } from 'chai'
import * as puppeteer from 'puppeteer'
import * as sinon from 'sinon'
import Browser from '../src/browser'
import { Viewport, LoadEvent } from 'puppeteer';

describe('Browser', () => {
  describe('#constructor', () => {
    it('should create browsers', () => {
      const numBrowsers = 5
      const browsers = [...Array(numBrowsers)].map(_ => Promise.resolve<puppeteer.Browser>({} as puppeteer.Browser))
      const browser = new Browser(browsers)
      expect(browser._browsers).to.have.lengthOf(numBrowsers)
    })
  })

  describe('#newPage', () => {
    it('should open new page on browser if it has 1 or less pages open', async () => {
      // hacky fix to properly do multiple test cases in an aysnc way
      await Promise.all([[], [{}]].map(async pages => {
        const browser = new Browser([])
        sinon.stub(browser, '_getFreestBrowser').returns({
          browser: {
            newPage: () => ({})
          }, pages
        })
        const newPageSpy = sinon.spy(browser, 'newPage')

        const newPage = await browser.newPage()

        expect(newPageSpy.calledOnce).to.be.true
      }))
    })

    it('should retry opening new page if browser has more than one page open', async () => {
      const browser = new Browser([])
      
      let numTimesCalled = 0

      sinon.stub(browser, '_getFreestBrowser')
        .callsFake(() => numTimesCalled++ === 0 
        ? { browser: { newPage: () => ({}) }, pages: [{}, {}] }
        : { browser: { newPage: () => ({}) }, pages: [{}] })
      const newPageSpy = sinon.spy(browser, 'newPage')
      const newPage = await browser.newPage()
      expect(newPageSpy.calledTwice).to.be.true
    })
  })

  describe('#goto', () => {
    let page: puppeteer.Page
    const url = 'http://localhost:3000'
    const viewport = Object.freeze({ width: 50, height: 60 })
    const headers = Object.freeze({ headerKey: 'headerValue' })
    const waitUntil = 'load'

    beforeEach(() => {
      page = {
        goto: (url, props) => Promise.resolve(undefined),
        setViewport: viewport => Promise.resolve(undefined),
        setExtraHTTPHeaders: headers => Promise.resolve(undefined)
      } as puppeteer.Page
    })

    it('should pass through url and waitUntil', async () => {
      const browser = new Browser([])
      const gotoSpy = sinon.spy(page, 'goto')

      await browser.goto(page, url, viewport, headers, waitUntil)

      expect(gotoSpy.calledWith(url, { waitUntil })).to.be.true
      expect(gotoSpy.calledOnce).to.be.true
      
    })

    it('should pass through viewport', async () => {
      const browser = new Browser([])
      
      const setViewportSpy = sinon.spy(page, 'setViewport')
      
      await browser.goto(page, url, viewport, headers, waitUntil)

      expect(setViewportSpy.calledWith(viewport)).to.be.true
      expect(setViewportSpy.calledOnce).to.be.true
    })

    it('should pass through http headers', async () => {
      const browser = new Browser([])
      
      const setExtraHTTPHeadersSpy = sinon.spy(page, 'setExtraHTTPHeaders')
      
      await browser.goto(page, url, viewport, headers, waitUntil)

      expect(setExtraHTTPHeadersSpy.calledWith(headers)).to.be.true
      expect(setExtraHTTPHeadersSpy.calledOnce).to.be.true
    })

    it('should fail if page is falsy', async () => {
      const browser = new Browser([])
      try {
        await browser.goto(undefined, url, viewport, headers, waitUntil)
      } catch (e) {
        expect(e).to.not.be.undefined
      }
    })
  })

  describe('#_getFreestBrowser', async () => {
    it('should return the browser with the least pages open', async () => {
      const leastPages = 0

      const browsers: Promise<puppeteer.Browser>[] = [
        {
          pages: async () => ({
            length: 3
          }),
        } as puppeteer.Browser,
        {
          pages: async () => ({
            length: 1
          })
        } as puppeteer.Browser,
        {
          pages: async () => ({
            length: leastPages
          })
        } as puppeteer.Browser
      ].map(browser => Promise.resolve(browser))

      const browser = new Browser(browsers)
      const freest = await browser._getFreestBrowser()
      expect(freest.pages).to.have.lengthOf(leastPages)
      const pages = await freest.browser.pages()
      expect(pages).to.have.lengthOf(leastPages)
    })
  })

  describe('#screenshot', () => {
    let page: puppeteer.Page, viewport: Viewport, url: string,
      headers: Record<string, string>, waitUntil: LoadEvent, 
      options: puppeteer.ScreenshotOptions

    beforeEach(() => {
      page = {
        screenshot: async options => undefined,
        close: async () => undefined
      } as puppeteer.Page
      url = 'http://localhost:3000'
      viewport = Object.freeze({ width: 50, height: 60 })
      headers = Object.freeze({ headerKey: 'headerValue' })
      waitUntil = 'load'
      options = {
        path: 'path',
        clip: { width: 1, height: 2, x: 3, y: 4 },
        fullPage: false,
        omitBackground: false,
        quality: 94,
        type: 'jpeg'
      } 
    })

    it('should goto the url with the given options', async () => {
      const browser = new Browser([])
      
      sinon.stub(browser, 'newPage')
        .returns(Promise.resolve(page))
      const gotoSpy = sinon.mock(browser)
        .expects('goto')
        .once()
        .withArgs(page, url, viewport, headers, waitUntil)

      const screenshot = await browser.screenshot(headers, url, options, viewport, waitUntil)

      gotoSpy.verify()
      expect(gotoSpy.calledOnce).to.be.true       
    })

    it('should take a screenshot', async () => {
      const browser = new Browser([])
      sinon.stub(browser, 'newPage')
        .returns(Promise.resolve(page))

      sinon.stub(browser, 'goto')
        .returns(Promise.resolve(undefined))

      const screenshotSpy = sinon.spy(page, 'screenshot')

      const screenshot = await browser.screenshot(headers, url, options, viewport, waitUntil)

      expect(screenshotSpy.calledWith(options)).to.be.true
      expect(screenshotSpy.calledOnce).to.be.true
    })

    it('should take a fullpage screenshot', async () => {
      const browser = new Browser([])
      sinon.stub(browser, 'newPage')
        .returns(Promise.resolve(page))

      sinon.stub(browser, 'goto')
        .returns(Promise.resolve(undefined))

      const screenshotSpy = sinon.spy(page, 'screenshot')        
      
      options = {...options,
        clip: undefined
      }

      const screenshot = await browser.screenshot(headers, url, options, viewport, waitUntil)

      expect(screenshotSpy.calledWith({ fullPage: true })).to.be.true
    })

    it('should close the page', async () => {
      const browser = new Browser([])
      sinon.stub(browser, 'newPage')
        .returns(Promise.resolve(page))

      sinon.stub(browser, 'goto')
        .returns(Promise.resolve(undefined))

      const closeSpy = sinon.spy(page, 'close')

      const screenshot = await browser.screenshot(headers, url, options, viewport, waitUntil)
      
      expect(closeSpy.calledOnce).to.be.true
    })

    it('should close the page even if an error occurs', async () => {
      const browser = new Browser([])
      sinon.stub(browser, 'newPage')
        .returns(Promise.resolve(page))

      sinon.stub(browser, 'goto').callsFake(() => { throw new Error() })

      const closeSpy = sinon.spy(page, 'close')

      try {
        const screenshot = await browser.screenshot(headers, url, options, viewport, waitUntil)
      } catch {} // ignore

      expect(closeSpy.called).to.be.true
    })

    it('should retry if an error occurs', async () => {
      const browser = new Browser([])
      const newPageSpy = sinon.stub(browser, 'newPage')
        .returns(Promise.resolve(page))

      let numTimesCalled = 0

      sinon.stub(browser, 'goto').callsFake(() => { 
        if (numTimesCalled++ === 0) {
          throw new Error()
        }
      })

      const screenshot = await browser.screenshot(headers, url, options, viewport, waitUntil)

      expect(newPageSpy.calledTwice).to.be.true
    })
  })

  describe('#pdf', () => {
    let page: puppeteer.Page, viewport: Viewport, url: string,
      headers: Record<string, string>, waitUntil: LoadEvent, 
      options: puppeteer.PDFOptions

    beforeEach(() => {
      page = {
        pdf: async options => undefined,
        close: async () => undefined
      } as puppeteer.Page
      url = 'http://localhost:3000'
      viewport = Object.freeze({ width: 50, height: 60 })
      headers = Object.freeze({ headerKey: 'headerValue' })
      waitUntil = 'load'
      options = {
        path: 'path',
        printBackground: true,
        displayHeaderFooter: false,
        format: 'A1',
        height: '305',
        width: '342',
        scale: 1,
        margin: {
          bottom: '0', right: '1px', left: '2', top: '3%'
        },
        landscape: false,
        pageRanges: '2-5'
      } 
    })

    it('should goto the url with the given options', async () => {
      const browser = new Browser([])
      
      sinon.stub(browser, 'newPage')
        .returns(Promise.resolve(page))
      const gotoSpy = sinon.mock(browser)
        .expects('goto')
        .once()
        .withArgs(page, url, viewport, headers, waitUntil)

      const pdf = await browser.pdf(headers, url, viewport, options, waitUntil)

      gotoSpy.verify()
      expect(gotoSpy.calledOnce).to.be.true       
    })

    it('should take a pdf', async () => {
      const browser = new Browser([])
      sinon.stub(browser, 'newPage')
        .returns(Promise.resolve(page))

      sinon.stub(browser, 'goto')
        .returns(Promise.resolve(undefined))

      const pdfSpy = sinon.spy(page, 'pdf')

      const pdf = await browser.pdf(headers, url, viewport, options, waitUntil)

      expect(pdfSpy.calledWith(options)).to.be.true
      expect(pdfSpy.calledOnce).to.be.true
    })

    it('should close the page', async () => {
      const browser = new Browser([])
      sinon.stub(browser, 'newPage')
        .returns(Promise.resolve(page))

      sinon.stub(browser, 'goto')
        .returns(Promise.resolve(undefined))

      const closeSpy = sinon.spy(page, 'close')

      const pdf = await browser.pdf(headers, url, viewport, options, waitUntil)
      
      expect(closeSpy.calledOnce).to.be.true
    })

    it('should close the page even if an error occurs', async () => {
      const browser = new Browser([])
      sinon.stub(browser, 'newPage')
        .returns(Promise.resolve(page))

      sinon.stub(browser, 'goto').callsFake(() => { throw new Error() })

      const closeSpy = sinon.spy(page, 'close')

      try {
        const pdf = await browser.pdf(headers, url, viewport, options, waitUntil)
      } catch {} // ignore

      expect(closeSpy.called).to.be.true
    })

    it('should retry if an error occurs', async () => {
      const browser = new Browser([])
      const newPageSpy = sinon.stub(browser, 'newPage')
        .returns(Promise.resolve(page))

      let numTimesCalled = 0

      sinon.stub(browser, 'goto').callsFake(() => { 
        if (numTimesCalled++ === 0) {
          throw new Error()
        }
      })

      const pdf = await browser.pdf(headers, url, viewport, options, waitUntil)

      expect(newPageSpy.calledTwice).to.be.true
    })
  })
})