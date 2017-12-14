package screenshot

import (
	"errors"
	"io"
	"net/http"
	"time"
)

type Client struct {
	Conn    *http.Client
	BaseURL string
}

/* PdfOptions
 * see the following for more details
 * https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagepdfoptions
 */
type PdfOptions struct {
	Path                string
	Scale               *float32 // so it can be nil
	DisplayHeaderFooter bool
	PrintBackground     bool
	Landscape           bool
	PageRanges          string // example'1-5, 8, 11-13'
	Format              string
	Margin              Margin
	Window              *[2]int
	WaitUntil           string
	Headers             map[string]string
}

type ScreenshotOptions struct {
	Headers   map[string]string
	Window    *[2]int // [x, y]
	Crop      *[2]int // [x, y] not applicable for Pdf
	WaitUntil string
	X         *int // so it can be nil
	Y         *int // ^
}

type Margin struct {
	Top    string
	Right  string
	Bottom string
	Left   string
}

func New(BaseURL string) *Client {
	client := &Client{
		Conn: &http.Client{
			Timeout: time.Second * 10,
		},
		BaseURL: BaseURL,
	}

	return client
}

func (c *Client) Do(req *http.Request) (*http.Response, error) {
	resp, err := c.Conn.Do(req)
	if err != nil {
		return resp, err
	}

	return resp, nil
}

func (c *Client) PNG(websiteURL string, opts ScreenshotOptions) (io.Reader, error) {
	req, err := makePngRequest(c.BaseURL, websiteURL, opts)

	if err != nil {
		return nil, err
	}

	if opts.Headers != nil {
		for key, value := range opts.Headers {
			req.Header.Add(key, value)
		}
	}

	resp, err := c.Do(req)

	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, errors.New("Got non-200 response")
	}

	return resp.Body, nil
}

func (c *Client) JPEG(websiteURL string, opts ScreenshotOptions, quality int) (io.Reader, error) {
	req, err := makeJpegRequest(c.BaseURL, websiteURL, opts, quality)

	if err != nil {
		return nil, err
	}

	if opts.Headers != nil {
		for key, value := range opts.Headers {
			req.Header.Add(key, value)
		}
	}

	resp, err := c.Do(req)

	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, errors.New("Got non-200 response")
	}

	return resp.Body, nil
}

func (c *Client) PDF(websiteURL string, opts PdfOptions) (io.Reader, error) {
	req, err := makePdfRequest(c.BaseURL, websiteURL, opts)

	if err != nil {
		return nil, err
	}

	if opts.Headers != nil {
		for key, value := range opts.Headers {
			req.Header.Add(key, value)
		}
	}

	resp, err := c.Do(req)

	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, errors.New("Got non-200 response")
	}

	return resp.Body, nil
}
