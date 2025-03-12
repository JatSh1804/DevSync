// require('dotenv').config()
let apiRoute = '';

console.log('Environment:', import.meta.env.VITE_NODE_ENV);

if (import.meta.env.VITE_NODE_ENV === 'development') {
    apiRoute = 'http://localhost:3002';
    console.log('Using development API route:', apiRoute);
} else if (import.meta.env.VITE_NODE_ENV === 'production') {
    apiRoute = import.meta.env.VITE_API_ROUTE; // Fallback to production as default
    console.log('Using production API route:', apiRoute);
} 

export { apiRoute };
// Use `apiRoute` in your API calls