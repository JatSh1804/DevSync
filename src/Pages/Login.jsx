import React, { useState } from "react";
import axios from "axios";


function LoginPage() {
    const [Email, setEmail] = useState('');
    const [Password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        console.log(Email);
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
            })
            .catch(err => console.error(err.response?.data.message));
    }
    return <>
        <form>
            <input type="text" placeholder="Email" value={Email} onChange={e => setEmail(e.target.value)}></input>
            <input type="password" placeholder="Password" value={Password} onChange={e => setPassword(e.target.value)}></input>
            <input type="submit" value='Submit' onClick={handleLogin}></input>
        </form>
    </>

}
export default LoginPage;