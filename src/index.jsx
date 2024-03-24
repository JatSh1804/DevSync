import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import createCache from "@emotion/cache"
import { CacheProvider } from '@emotion/react'
import { ChakraBaseProvider, extendTheme } from '@chakra-ui/react'

const emotionCache = createCache({
    key: 'emotion-css-cache',
    prepend: true, // ensures styles are prepended to the <head>, instead of appended
});
const theme = extendTheme({
    initialColorMode: 'dark',
    useSystemColorMode: false
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <CacheProvider value={emotionCache}>
        <ChakraBaseProvider resetCSS={true} theme={theme}>
            <App />
        </ChakraBaseProvider>
    </CacheProvider>
)
