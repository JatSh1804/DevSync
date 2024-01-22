import { useState } from "react";
import axios from "axios";

function SignupPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSignUp = async (e) => {
        e.preventDefault();
        var config = {
            method: 'post',
            url: 'http://localhost:3002/Signup',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: { username, password }
        };
        await axios(config)
            .then(res => res)
            .catch(err => console.log(err?.response?.data?.message));

    }
    return <>
        <form>
            <input placeholder="Name" type="text" ></input>
            <input placeholder="Username" type="text" value={username} onChange={e => setUsername(e.target.value)}></input>
            <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}></input>
            <input type="submit" value='Submit' onClick={handleSignUp}></input>
        </form>
    </>
}
export default SignupPage;