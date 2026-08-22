import { ScrollViewStyleReset } from 'expo-router/html'
import { type PropsWithChildren } from 'react'

const autofillCss = `
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px var(--autofill-bg, #FBFAF4) inset !important;
  -webkit-text-fill-color: var(--autofill-text, #1F241A) !important;
  caret-color: var(--autofill-text, #1F241A);
  transition: background-color 9999s ease-in-out 0s;
}

@supports (-webkit-touch-callout: none) {
  input, textarea, [contenteditable="true"] {
    font-size: 16px !important;
  }
}
`

const registerServiceWorker = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {})
  })
}
`

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F7F6EE" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1A1E15" media="(prefers-color-scheme: dark)" />

        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ResRank" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: autofillCss }} />
        <script dangerouslySetInnerHTML={{ __html: registerServiceWorker }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
