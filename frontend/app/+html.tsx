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
`

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: autofillCss }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
