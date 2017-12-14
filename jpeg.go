package screenshot

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
)

func makeJpegRequest(baseURL string, websiteURL string, opts ScreenshotOptions, quality int) (*http.Request, error) {
	queryParams, err := makeJpegQueryParams(websiteURL, opts, quality)
	if err != nil {
		return nil, err
	}

	u := fmt.Sprintf("%s/jpeg?%s", baseURL, queryParams)

	return http.NewRequest("GET", u, nil)
}

func makeJpegQueryParams(websiteURL string, opts ScreenshotOptions, quality int) (string, error) {
	parsedURL, err := url.Parse(websiteURL)
	if err != nil {
		return "", errors.New("Need to provide a valid websiteURL")
	}

	// check if query is escaped - shouldn't error out since coming from legit url
	s, err := url.QueryUnescape(parsedURL.RawQuery)
	if err != nil {
		return "", err
	}
	if s == parsedURL.RawQuery {
		parsedURL.RawQuery = url.QueryEscape(parsedURL.RawQuery)
	}

	u := fmt.Sprintf("url=%s", parsedURL.String())

	if opts.Crop != nil {
		u += fmt.Sprintf("&crop=%dx%d&x=%d&y=%d", opts.Crop.Width, opts.Crop.Height, opts.Crop.X, opts.Crop.Y)
	}
	if opts.Window != nil {
		u += fmt.Sprintf("&window=%dx%d", opts.Window.Width, opts.Window.Height)
	}

	if opts.WaitUntil != "" {
		u += "&waituntil=" + opts.WaitUntil
	}
	return u, nil
}
