import React, { useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";

function LoginPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [Email, setEmail] = useState('');
    const [Password, setPassword] = useState('');
    const [res, setRes] = useState();

    const handleLogin = async (e) => {
        e.preventDefault();
        console.log(Email);
        console.log(JSON.stringify(location))
        var config = {
            method: 'POST',
            url: '/Login',
            withCredentials: true,

            headers: {
                'Content-Type': 'application/json',
                'Accept': 'Application/json'
            },
            data: { Email, Password }
        };
        await axios(config)
            .then(res => {
                console.log(document.cookie);
                console.log(JSON.stringify(res.data))
                setRes(JSON.stringify(res))
                setTimeout(() => { navigate('/', { state: location.state }) }, 2000)
            })
            .catch(err => {
                console.error(err.response?.data.message)
                setRes(JSON.stringify(err))
            }
            );
    }
    return <>
        <form className="homeForm">
            <h1 className="Hero">Log In</h1>
            <input type="text" placeholder="Email" value={Email} onChange={e => setEmail(e.target.value)}></input>
            <input type="password" placeholder="Password" value={Password} onChange={e => setPassword(e.target.value)}></input>
            <input className="success" type="submit" value='Submit' onClick={handleLogin}></input>
        </form>
        <span className="separator flex grey">
            <div></div>
            Or
            <div></div>
        </span>
        <span className="flex">
            <Link to="/Signup" state={location.state} class="rainbow-button" alt="Sign Up"></Link>
        </span>
        <p className="error">{res}</p>
    </>

}
export default LoginPage;