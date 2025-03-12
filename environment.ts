// require('dotenv').config()
let apiRoute = 'production';
console.log(import.meta.env.VITE_NODE_ENV)
if (import.meta.env.VITE_NODE_ENV === 'development') {
    apiRoute = 'http://localhost:3002'; // replace with your server's address
} else if (import.meta.env.VITE_NODE_ENV === 'production') {
    apiRoute = ''; // replace with your production API's address
}

export { apiRoute };
// Use `apiRoute` in your API calls