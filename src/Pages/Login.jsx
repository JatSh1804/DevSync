import React, { useState } from "react";
import axios from "axios";


function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        var config = {
            method: 'POST',
            url: 'http://localhost:3002/Login',
            // withCredentials: true,
            headers: {
                'Content-Type': 'application/json'
            },
            data: { username, password }
        };
        await axios(config)
            .then(res => console.log(JSON.stringify(res.data)))
            .catch(err => console.log(err.response?.data.message));
    }
    return <>
        <form action="https://localhost:3002/Login" method="POST">
            <input type="text" placeholder="User Id" value={username} onChange={e => setUsername(e.target.value)}></input>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}></input>
            <input type="submit" value='Submit' onClick={handleLogin}></input>
        </form>
    </>

}
export default LoginPage;