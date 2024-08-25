import { useState } from "react";
import axios from "axios";
import { useLocation, Link } from "react-router-dom";
import Toast, { Toaster } from "react-hot-toast";
import { apiRoute } from "../../environment";
function SignupPage() {
    const location = useLocation();
    const [Username, setUsername] = useState('');
    const [Password, setPassword] = useState('');
    const [Email, setEmail] = useState('');

    const handleSignUp = async (e) => {
        e.preventDefault();
        var config = {
            method: 'post',
            url: `${apiRoute}/Signup`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: { Email, Username, Password }
        };
        await axios(config)
            .then(res => {
                console.log(res)
                Toast.success(res.data.message)
            })
            .catch(err => {
                Toast.error(err?.response?.data?.message)
                console.error(err?.response?.data?.message)
            });

    }
    return <><Toaster />
        <form className="homeForm">
            <input placeholder="Username" type="text" value={Username} onChange={e => setUsername(e.target.value)}></input>
            <input placeholder="Email" type="text" value={Email} onChange={e => setEmail(e.target.value)}></input>
            <input placeholder="Password" type="Password" value={Password} onChange={e => setPassword(e.target.value)}></input>
            <input className="success" type="submit" value='Submit' onClick={handleSignUp}></input>
        </form>
        <Link to="/login" state={location.state} alt="Login">Login</Link>
    </>
}
export default SignupPage;