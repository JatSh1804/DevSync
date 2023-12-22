import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Navigate, useParams } from "react-router-dom";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css"
import "codemirror/theme/dracula.css"
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/clike/clike"
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/display/autorefresh"
import "./EditorPage.css";
import { Socket, io } from "socket.io-client";
import Toast, { Toaster } from "react-hot-toast";


export default function Editorpage() {
    const location = useLocation();
    // console.log(location.state)

    const navigate = useNavigate();
    const editorref = useRef();
    const codeRef = useRef('');

    const [message, setMessage] = useState('');
    const [msgArray, setmsgArray] = useState([]);
    // console.log(msgArray);
    const { RoomId } = useParams()

    const socket = io("localhost:3002", () => {
    });
    useEffect(() => { console.log(msgArray) }, [msgArray])
    useEffect(() => {
        if (location.state == null) {
            console.log("emtpy");
            navigate('/');
            return;
        }

        const { RoomId, username } = location.state
        async function init() {
            editorref.current = Codemirror.fromTextArea(document.getElementById("codeeditor"), {
                mode: { name: `${mode == 'javascript' ? mode : 'text/x-' + mode}`, json: true },
                theme: 'dracula',
                autoCloseBrackets: true,
                autoclosetags: true,
                lineNumbers: true,
                autoRefresh: true
            })
        };
        init();
        editorref.current.on('change', (instance, changes) => {
            codeRef.current = instance.getValue();
            if (changes.origin != 'setValue') {
                socket.emit("Code Change", { RoomId, code: instance.getValue() })
            }
        });



        socket.on("connect", () => {
            console.log("Connected to the Server!")
            socket.emit('UserJoin', { RoomId: RoomId, username: username })
            // console.log(socket.id)

            socket.on("Joined", ({ client, socketId, username }) => {
                console.log(socket.id)
                setClients(client);
                (location.state?.username == username) ?
                    Toast.success("You joined a Room!") :
                    Toast.success(`${username} Joined the Room!`);
                if (codeRef.current) {
                    socket.emit("Code Change", { RoomId, code: codeRef.current })
                    console.log(codeRef.current);
                }
            });

            socket.on("Userleave", ({ User, socketId }) => {
                console.log(`${User.username} left...`)
                setClients(prev => prev.filter(item => { return item.socketId !== socketId }))
                console.log(Client)
                Toast.error(`${User.username} left the room!`)
            })

            socket.on("Code Sync", (code) => {
                console.log("Got some changes...")
                console.log(code);
                editorref.current.setValue(code.code);
            })
            socket.on("message receive", ({ message, sender, username }) => {
                console.log("client received", message)
                // console.log(msgArray);
                setmsgArray(prev => { return [...prev, { sender, message, username }] });
                console.log(msgArray);
            })
        })
        return () => { socket.disconnect(); socket.off("Joined") }
    }, []);

    const sendMsg = (e) => {
        e.preventDefault();
        socket.emit("chat message", { RoomId: RoomId, message: message, sender: socket.id, username: location.state.username });
        console.log('emitting...')
        setMessage('');
    }

    const leaveroom = () => {
        navigate('/');
        Toast.dismiss()
        return;
    }
    const copyclipboard = async () => {
        Toast.success("Room ID copied!")
        await navigator.clipboard.writeText(location.state?.RoomId)
    }

    // console.log(location.state)
    const [Client, setClients] = useState([])
    const [mode, setmode] = useState('javascript')
    // console.log(mode)

    return <><Toaster position="top-right" />
        <div className="wrapdiv">
            <div className="sidebar">
                <select value={mode} onChange={e => { setmode(e.target.name) }}>
                    <option defaultChecked={true} name='java'>Java</option>
                    <option name='javascript'>Java Script</option>
                    <option name='c++src'>C++</option>
                </select>

                {Client.map(item => { return item.username; })}

                <input type="button" className="success" onClick={copyclipboard} value={'Copy Room Id'}></input>
                <input type="button" className="error" onClick={leaveroom} value={'Leave Room'}></input>
                <ul>
                    {msgArray.map((item) => { return <li className={item.type}>{item.username}:{item.message}</li> })}
                </ul>
                <form>
                    <input type="text" onChange={e => { setMessage(e.target.value) }} placeholder="Type Message..." value={message}></input>
                    <input type="submit" onClick={sendMsg} value={"send"}></input>
                </form>
            </div>
            <div className="realtimeeditor">
                <textarea id="codeeditor"></textarea>
            </div>
        </div >

    </>
}