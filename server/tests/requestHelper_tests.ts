import 'mocha'
import { expect } from 'chai'
import { getProperitiesFromImg, getProperitiesFromPdf, isValidUrl, transformHeaders,
         DEFAULT_CROP, DEFAULT_X, DEFAULT_Y, DEFAULT_VIEWPORT } from '../src/requestHelper'

describe('requestHelper', () => {
  describe('transformHeaders', () => {
    it('should transform headers', () => {
      const headers = ['key', 'value', 'key2', 'value2']
      const transformedHeaders = transformHeaders(headers)
      expect(transformedHeaders.key).to.equal('value')
      expect(transformedHeaders.key2).to.equal('value2')
      expect(Object.keys(transformedHeaders)).to.have.lengthOf(2)
    })
  })

  describe('getPropertiesFromPdf', () => {
    it('should transform margin', () => {
      const marginStr = 'top:40;right:70px;bottom:30%;left:50'
      const [ _, { margin }, __ ] = getProperitiesFromPdf({ margin: marginStr })
      expect(Object.keys(margin)).to.have.lengthOf(4)
      console.log(margin)
      expect(margin.top).to.equal('40')
      expect(margin.right).to.equal('70px')
      expect(margin.bottom).to.equal('30%')
      expect(margin.left).to.equal('50')
    })

    it('should ignore undefined values from margin', () => {
      const marginStr = 'top:40;right:70px;bottom:30%;'
      const [ _, { margin }, __ ] = getProperitiesFromPdf({ margin: marginStr })
      expect(Object.keys(margin)).to.have.lengthOf(3)
      expect(margin.top).to.equal('40')
      expect(margin.right).to.equal('70px')
      expect(margin.bottom).to.equal('30%')
    })

    it('should parse format `legal`', () => {
      const formatBefore = 'legal'
      const [ _, { format }, __ ] = getProperitiesFromPdf({ format: formatBefore})
      expect(format.toLowerCase()).to.equal(formatBefore)
    })

    it('should parse format `legal`', () => {
      const formatBefore = 'legal'
      const [ _, { format }, __ ] = getProperitiesFromPdf({ format: formatBefore})
      expect(format.toLowerCase()).to.equal(formatBefore)
    })

    it('should parse format `a1`', () => {
      const formatBefore = 'a1'
      const [ _, { format }, __ ] = getProperitiesFromPdf({ format: formatBefore})
      expect(format.toLowerCase()).to.equal(formatBefore)
    })

    it('should parse format `a2`', () => {
      const formatBefore = 'a2'
      const [ _, { format }, __ ] = getProperitiesFromPdf({ format: formatBefore})
      expect(format.toLowerCase()).to.equal(formatBefore)
    })

    it('should parse format `a4`', () => {
      const formatBefore = 'a4'
      const [ _, { format }, __ ] = getProperitiesFromPdf({ format: formatBefore})
      expect(format.toLowerCase()).to.equal(formatBefore)
    })

    it('should not parse format if not valid', () => {
      const formatBefore = 'a9'
      const [ _, { format }, __ ] = getProperitiesFromPdf({ format: formatBefore })
      expect(format).to.be.undefined
    })

    it('should parse waituntil `networkidle0`', () => {
      const waitUntilBefore = 'networkidle0'
      const [ _, __ , waitUntil ] = getProperitiesFromPdf({ waitUntil: waitUntilBefore})
      expect(waitUntil).to.equal(waitUntilBefore)
    })

    it('should not parse waituntil', () => {
      const waitUntilBefore = 'networkidle1'
      const [ _, __ , waitUntil ] = getProperitiesFromPdf({ waitUntil: waitUntilBefore})
      expect(waitUntil).to.be.undefined
    })

    it('should parse viewport', () => {
      const window = '500x500'
      const [ viewport , _, __ ] = getProperitiesFromPdf({ window })

      expect(Object.keys(viewport)).to.have.lengthOf(2)
      expect(viewport.width).to.equal(500)
      expect(viewport.height).to.equal(500)
    })

    it('should set viewport to 800x600 if can\'t parse it', () => {
      const window = "500x"
      const [ viewport, _, __ ] = getProperitiesFromPdf({ window })
      expect(viewport.width).to.equal(800)
      expect(viewport.height).to.equal(600)
    })

    it('should parse scale', () => {
      const scaleStr = '0.58'
      const [ _, { scale }, __ ] = getProperitiesFromPdf({ scale: scaleStr })
      expect(scale).to.equal(0.58)
    })

    it('should not parse scale if not a number', () => {
      const scaleStr = '0.5d8dg'
      const [ _, { scale }, __ ] = getProperitiesFromPdf({ scale: scaleStr })
      expect(scale).to.be.undefined
    })

    it('should parse printBackground', () => {
      const printBackgroundStr = 'true'
      const [ _, { printBackground }, __ ] = getProperitiesFromPdf({ printBackground: printBackgroundStr })
      expect(printBackground).to.equal(true)
    })

    it('should be false if can\'t parse printBackground', () => {
      const printBackgroundStr = 'tue'
      const [ _, { printBackground }, __ ] = getProperitiesFromPdf({ printBackground: printBackgroundStr })
      expect(printBackground).to.equal(false)
    })

    it('should parse displayHeaderFooter', () => {
      const displayHeaderFooterStr = 'true'
      const [ _, { displayHeaderFooter }, __ ] = getProperitiesFromPdf({ displayHeaderFooter: displayHeaderFooterStr })
      expect(displayHeaderFooter).to.equal(true)
    })

    it('should be false if can\'t parse displayHeaderFooter', () => {
      const displayHeaderFooterStr = 'tue'
      const [ _, { displayHeaderFooter }, __ ] = getProperitiesFromPdf({ displayHeaderFooter: displayHeaderFooterStr })
      expect(displayHeaderFooter).to.equal(false)
    })

    it('should parse landscape', () => {
      const landscapeStr = 'true'
      const [ _, { landscape }, __ ] = getProperitiesFromPdf({ landscape: landscapeStr })
      expect(landscape).to.equal(true)
    })

    it('should be false if can\'t parse displayHeaderFooter', () => {
      const landscapeStr = 'tue'
      const [ _, { landscape }, __ ] = getProperitiesFromPdf({ landscape: landscapeStr })
      expect(landscape).to.equal(false)
    })
    
    it('should pass through pageRanges without doing anything to it - valid', () => {
      const pageRangesStr = '2,355-34'
      const [ _, { pageRanges }, __ ] = getProperitiesFromPdf({ pageRanges: pageRangesStr })
      expect(pageRanges).to.equal(pageRangesStr)
    })

    it('should pass through pageRanges without doing anything to it - invalid', () => {
      const pageRangesStr = '2,355-sdfasdfasdfsdvkjnv1oi34'
      const [ _, { pageRanges }, __ ] = getProperitiesFromPdf({ pageRanges: pageRangesStr })
      expect(pageRanges).to.equal(pageRangesStr)
    })
  })

  describe('getPropertiesFromImg', () => {
    it('should parse viewport', () => {
      const window = '500x500'
      const [ viewport , _, __ ] = getProperitiesFromImg({ window })

      expect(Object.keys(viewport)).to.have.lengthOf(2)
      expect(viewport.width).to.equal(500)
      expect(viewport.height).to.equal(500)
    })

    it('should set viewport to 800x600 if can\'t parse it', () => {
      const window = '500x'
      const [ viewport, _, __ ] = getProperitiesFromImg({ window })
      expect(viewport.width).to.equal(800)
      expect(viewport.height).to.equal(600)
    })

    it('should set crop if x, y, width, and heigth exist and valid ints', () => {
      const crop = '888x8'
      const [x, y] = ['50', '888']
      const [ _, { clip }, __ ] = getProperitiesFromImg({ crop, x, y})
      expect(Object.keys(clip)).to.have.lengthOf(4)
      expect(clip.x).to.equal(parseInt(x, 10))
      expect(clip.y).to.equal(parseInt(y, 10))
      expect(clip.width).to.equal(888)
      expect(clip.height).to.equal(8)
    })

    it('should set x to default if x doesn\'t exist or invalid', () => {
      const crop = '888x8'
      const [x, y] = ['', '888']
      const [ _, { clip }, __ ] = getProperitiesFromImg({ crop, x, y })
      expect(clip.x).to.equal(DEFAULT_X)
    })

    it('should set y to default if y doesn\'t exist or invalid', () => {
      const crop = '888x8'
      const [x, y] = ['50', '']
      const [ _, { clip }, __ ] = getProperitiesFromImg({ crop, x, y })
      expect(clip.y).to.equal(DEFAULT_Y)
    })

    it('should set crop to default if crop doesn\'t exist or invalid', () => {
      const crop = '888'
      const [x, y] = ['gsdf', '']
      const [ _, { clip }, __ ] = getProperitiesFromImg({ crop, x, y })
      expect(clip.width).to.equal(DEFAULT_CROP[0])
      expect(clip.height).to.equal(DEFAULT_CROP[1])      
    })

    it('should parse waituntil `networkidle0`', () => {
      const waitUntilBefore = 'networkidle0'
      const [ _, __ , waitUntil ] = getProperitiesFromImg({ waitUntil: waitUntilBefore})
      expect(waitUntil).to.equal(waitUntilBefore)
    })

    it('should not parse waituntil', () => {
      const waitUntilBefore = 'networkidle1'
      const [ _, __ , waitUntil ] = getProperitiesFromImg({ waitUntil: waitUntilBefore})
      expect(waitUntil).to.be.undefined
    })

    it('should parse jpegQuality', () => {
      const jpegQuality = '30'
      const [ _, { quality }, __ ] = getProperitiesFromImg({ jpegQuality })
      expect(quality).to.equal(30)
    })

    it('should not parse jpegQuality', () => {
      const jpegQuality = '30xcv'
      const [ _, { quality }, __ ] = getProperitiesFromImg({ jpegQuality })
      expect(quality).to.be.NaN
    })
  })
})