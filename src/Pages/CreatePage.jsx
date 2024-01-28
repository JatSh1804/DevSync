import React, { useState } from "react";
import Toast, { Toaster } from "react-hot-toast";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { v4 as uuidV4 } from "uuid";

export default function CreatePage() {
    const location = useLocation();
    const [queryRoom, setqueryRoom] = useSearchParams();
    const navigate = useNavigate();

    const [RoomId, setRoomID] = useState(queryRoom.get('room') || location?.state?.RoomId || '');
    const [username, setUsername] = useState('');


    const onSubmit = async e => {
        e.preventDefault();
        if (!username) {
            Toast.error(`Enter User Name`); return;
        };
        if (!RoomId) { Toast.error('Enter Room Id'); return; }
        console.log(RoomId);
        // console.log(username);
        var config = {
            method: 'POST',
            url: 'http://localhost:3002/create',
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
                    navigate(`/room/${RoomId}`, { state: { RoomId: RoomId, username: username, email: res.data.Email, role: 'owner' } })
                }
            })
            .catch(err => {
                console.error('err=>', err?.response.data)
                err?.response.data && Toast.error(err?.response.data)
                // navigate(`/login`)
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
            <form >
                <input value={RoomId} onChange={e => { setRoomID(e.target.value) }} placeholder='ROOM ID' size='md' />
                <input value={username} onChange={e => { setUsername(e.target.value) }} placeholder='USERNAME' size='md' />
                <input type="submit" className="success" onClick={onSubmit} variant='outline' background={'teal'} value="Join" />
            </form>

            <p>Don't have a Room Id? &nbsp;
                <button onClick={RoomCreate} className="link" colorscheme='teal' variant='link'> Create Room</button>
            </p>

        </div>
    </>
}