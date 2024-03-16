import React, { useState } from "react";
import Toast, { Toaster } from "react-hot-toast";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { v4 as uuidV4 } from "uuid";
import { Link } from "react-router-dom"

export default function CreatePage() {
    const location = useLocation();
    const [queryRoom, setqueryRoom] = useSearchParams();
    const navigate = useNavigate();

    const [RoomId, setRoomID] = useState(queryRoom.get('room') || location?.state?.RoomId || '');
    const [username, setUsername] = useState('');

    const [disabled, setDisabled] = useState(false);



    const onSubmit = async e => {
        e.preventDefault();
        if (!username) {
            Toast.error(`Enter User Name`); return;
        };
        if (!RoomId) { Toast.error('Enter Room Id'); return; }
        console.log(RoomId);
        setDisabled(true)
        // console.log(username);
        var config = {
            method: 'POST',
            url: 'http://localhost:3002/Room',
            withCredentials: true,
            data: { RoomId },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
        };
        await axios(config)
            .then(res => {
                console.log(res)
                if (res.data.Exists) {
                    Toast.error(res.data.message)
                } else {
                    console.log("Room Created")
                    console.log('response1=>', res)
                    navigate(`/room/${RoomId}`, { state: { RoomId, username, email: res.data.Email, role: 'owner' } })
                }
            })
            .catch(err => {
                // console.error('err=>', JSON.stringify(err?.response))
                if (err?.response?.data == "Not logged in") { navigate('/login', { state: { path: '/' } }) }

                err?.response?.data && Toast.error(err?.response.data)
                // navigate(`/login`)
            }).finally(() => {
                setTimeout(() => { setDisabled(false) },1500)
            });

    };

    const RoomCreate = e => {
        e.preventDefault();
        const id = uuidV4();
        setRoomID(id)

        Toast.success("Created a New Room!", {
            position: "top-right",
            duration: 2000,
            id: "roomid",
            // style: { backgroundColor: "lightgreen" },
            // icon: '👏',
        })
    }
    return <><Toaster />
        <div className="Wrapper">
            <h1>Code Share</h1>
            <h5>Paste Invitation Info</h5>
            <form className="homeForm">
                <input value={RoomId} onChange={e => { setRoomID(e.target.value) }} placeholder='ROOM ID' size='md' />
                <input value={username} onChange={e => { setUsername(e.target.value) }} placeholder='USERNAME' size='md' />
                <input type="submit" disabled={disabled} className="success" onClick={onSubmit} variant='outline' background={'teal'} value="Join" />
            </form>

            <p>
                <Link onClick={RoomCreate} className="link underline" colorscheme='teal' variant='link'>Generate</Link>
            </p>

        </div>
    </>
}