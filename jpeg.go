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
	s, _ := url.QueryUnescape(parsedURL.RawQuery)
	if s == parsedURL.RawQuery {
		parsedURL.RawQuery = url.QueryEscape(parsedURL.RawQuery)
	}

	u := fmt.Sprintf("url=%s", parsedURL.String())

	if opts.CropWidth != 0 && opts.CropHeight != 0 {
		u += fmt.Sprintf("&crop=%dx%d", opts.CropWidth, opts.CropHeight)
	}
	if opts.WindowWidth != 0 && opts.WindowHeight != 0 {
		u += fmt.Sprintf("&window=%dx%d", opts.WindowWidth, opts.WindowWidth)
	}

	if opts.WaitUntil != "" {
		u += "&waituntil=" + opts.WaitUntil
	}

	if opts.X != nil && opts.Y != nil {
		u += fmt.Sprintf("&x=%d&y=%d", *opts.X, *opts.Y)
	}

	return u, nil
}
