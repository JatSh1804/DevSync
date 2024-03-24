import React, { useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Toast, { Toaster } from "react-hot-toast";

function LoginPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [Email, setEmail] = useState('');
    const [Password, setPassword] = useState('');
    const [error, setError] = useState();
    const [response, setResponse] = useState();
    const [disabled, setDisabled] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!Email) { Toast.error(`Enter User Email!`); return; };
        if (!Password) { Toast.error('Enter Password!'); return; }

        setDisabled(true);
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
                console.log(JSON.stringify(res.data))
                setResponse(res)
                setTimeout(() => { navigate('/', { state: location.state }) }, 2000)
            })
            .catch(err => {
                console.error(err.response?.data.message)
                setError(err)
            }
            ).finally(() => { setTimeout(() => { setDisabled(false) }, 2500) })
    }
    return <><Toaster />
        <form className="homeForm">
            <h1 className="Hero">Log In</h1>
            <input type="text" placeholder="Email" value={Email} onChange={e => setEmail(e.target.value)}></input>
            <input type="password" placeholder="Password" value={Password} onChange={e => setPassword(e.target.value)}></input>
            <input className={`success prevent ${disabled && 'disabled'}`} disabled={disabled} type="submit" value='Submit' onClick={handleLogin}></input>
        </form>
        <span className="separator flex grey">
            <div></div>
            Or
            <div></div>
        </span>
        <span className="flex">
            <Link to="/Signup" state={location.state} class="rainbow-button" alt="Sign Up"></Link>
        </span>
        <p className="success" >{response?.data.message}</p>
        <p className="error">{JSON.stringify(error)}</p>
    </>

}
export default LoginPage;