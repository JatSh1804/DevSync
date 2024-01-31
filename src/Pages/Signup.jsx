import { useState } from "react";
import axios from "axios";

function SignupPage() {
    const [Username, setUsername] = useState('');
    const [Password, setPassword] = useState('');
    const [Email, setEmail] = useState('');

    const handleSignUp = async (e) => {
        e.preventDefault();
        var config = {
            method: 'post',
            url: '/Signup',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: { Email, Username, Password }
        };
        await axios(config)
            .then(res => res)
            .catch(err => console.error(err?.response?.data?.message));

    }
    return <>
        <form>
            <input placeholder="Username" type="text" value={Username} onChange={e => setUsername(e.target.value)}></input>
            <input placeholder="Email" type="text" value={Email} onChange={e => setEmail(e.target.value)}></input>
            <input placeholder="Password" type="Password" value={Password} onChange={e => setPassword(e.target.value)}></input>
            <input type="submit" value='Submit' onClick={handleSignUp}></input>
        </form>
    </>
}
export default SignupPage;