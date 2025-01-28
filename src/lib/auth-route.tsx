import * as React from 'react'
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { apiRoute } from '../../environment';

const AuthRoute = ({ children, redirectPath = '/' }) => {
    const [isLoggedIn, setIsLoggedIn] = React.useState(null); // Initial state is null to represent "checking"

    React.useEffect(() => {
        // Make an API call to check if the user is logged in
        axios.get(`${apiRoute}/api/auth/verify`, { withCredentials: true }) // 'withCredentials' allows sending cookies
            .then(response => {
                if (response.data.loggedIn) {
                    setIsLoggedIn(true);
                } else {
                    setIsLoggedIn(false);
                }
            })
            .catch(() => setIsLoggedIn(false));
    }, []);

    // If still checking the login state, you can return a loading state
    if (isLoggedIn === null) {
        return <div>Loading...</div>;
    }

    // If the user is logged in, redirect them
    if (isLoggedIn) {
        return <Navigate to={redirectPath} />;
    }

    // Otherwise, allow the children (login or signup page) to render
    return children;
};

export default AuthRoute;
