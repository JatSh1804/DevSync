import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css"
import "codemirror/theme/dracula.css"
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/clike/clike"
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/display/autorefresh"
import "./EditorPage.css";
import { io } from "socket.io-client";
import { socketinit } from "../socket";
import Toast, { Toaster } from "react-hot-toast";


export default function Editorpage() {
    const location = useLocation();
    // console.log(location.state)

    const navigate = useNavigate();
    const editorref = useRef();
    const codeRef = useRef('');
    const socket = useRef();

    const [message, setMessage] = useState('');
    const [msgArray, setmsgArray] = useState([]);
    // console.log(msgArray);
    const { RoomId } = useParams()
    const { queryRoom } = useSearchParams();
    const [lastEdit, setlastEdit] = useState();

    const [Client, setClients] = useState([])
    const [mode, setmode] = useState('js')


    // const socket = io('http://localhost:3002', () => {});
    useEffect(() => { console.log(msgArray) }, [msgArray])
    useEffect(() => {
        const connect = async () => {
            socket.current = await socketinit();
            socket.current.on('connect_error', (err) => Toast.error("Not Able to connect right now!"));
            socket.current.on('connect_failed', (err) => Toast.error("Not Able to connect right now!"));

            let changeTimer;

            editorref.current.on('change', (instance, changes) => {
                codeRef.current = instance.getValue();

                // Clear the existing timer
                clearTimeout(changeTimer);

                // Set a new timer to emit "Code Change" after 2 seconds of inactivity
                changeTimer = setTimeout(() => {
                    if (changes.origin != 'setValue') {
                        socket.current.emit("Code Change", { RoomId, username, code: instance.getValue() });
                    }
                }, 2000); // 2 seconds delay
            });

            socket.current.on("connect", () => {
                console.log("Connected to the Server!")
                socket.current.emit('UserJoin', { RoomId: RoomId, username: username })
                // console.log(socket.id)

                socket.current.on("Joined", ({ client, socketId, username }) => {
                    console.log(socket.current.id)
                    setClients(client);
                    (location.state?.username == username) ?
                        Toast.success("You joined a Room!") :
                        Toast.success(`${username} Joined the Room!`);
                    if (codeRef.current) {
                        // socket.current.emit("Code Change", { RoomId, code: codeRef.current })
                        console.log(codeRef.current);
                    }
                });

                socket.current.on("Userleave", ({ User, socketId }) => {
                    console.log(`${User.username} left...`)
                    setClients(prev => prev.filter(item => { return item.socketId !== socketId }))
                    console.log(Client)
                    Toast.error(`${User.username} left the room!`)
                })

                socket.current.on("Code Sync", (code) => {
                    console.log("Got some changes...")
                    console.log(code);
                    setlastEdit(code.username);
                    editorref.current.setValue(code.code);
                    // editorref.current.focus();
                    editorref.current.setCursor({ line: 1, ch: 5 })
                })
                socket.current.on("Result", ({ result }) => {
                    console.log(result);
                })
                socket.current.on("message receive", ({ message, sender, username }) => {
                    console.log("client received", message)
                    // console.log(msgArray);
                    setmsgArray(prev => { return [...prev, { sender, message, username }] });
                    console.log(msgArray);
                })
            })
            socket.current.on("connection_failed", () => { Toast.error("No Connection established!") })

        };
        connect();

        if (location.state == null) {
            console.log("emtpy");
            navigate('/', { state: { RoomId: queryRoom } });
            return;
        }

        const { RoomId, username } = location.state
        async function init() {
            editorref.current = Codemirror.fromTextArea(document.getElementById("codeeditor"), {
                mode: {
                    name: `${mode == 'js' ? 'javascript' : 'text/x-' + 'javascript'}`
                    , json: true
                },
                theme: 'dracula',
                autoCloseBrackets: true,
                autoclosetags: true,
                lineNumbers: true,
                autoRefresh: true,
                dragDrop: true,
                autofocus: true
            })
        };
        init();
        return () => { socket.current.disconnect(); socket.current.off("Joined") }
    }, []);

    const sendMsg = (e) => {
        e.preventDefault();
        if (message == '') { Toast.error('Message field cannot be empty!'); return; }
        socket.current.emit("chat message", { RoomId: RoomId, message: message, sender: socket.current.id, username: location.state.username });
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
        await navigator.clipboard.writeText(RoomId)
    }
    const compile = async (e) => {
        e.preventDefault();
        socket.current.emit("Compile", { code: codeRef.current, RoomId, language: mode, input: "" })
    }

    // console.log(location.state)
    // console.log(mode)

    return <><Toaster position="top-right" />
        <div className="wrapdiv">
            <div className="sidebar">
                <select value={mode} onChange={e => { setmode([e.target.name, e.target.value]) }}>
                    <option defaultChecked={true} value='javascript' name='js'>javascript</option>
                    <option value='clike' name='java'>Java</option>
                    <option value='clike' name='cpp'>C++</option>
                </select>
                {lastEdit && <p>Last edit by {lastEdit}</p>}

                {Client.map(item => { return item.username; })}

                <ul>
                    {msgArray.map((item) => { return <li className={item.type}>{item.username}:{item.message}</li> })}
                </ul>
                <form className="chat">
                    <input type="text" onChange={e => { setMessage(e.target.value) }} placeholder="Type Message..." value={message}></input>
                    <input type="submit" onClick={sendMsg} value={"send"}></input>
                </form>
                <div style={{ display: 'grid', gap: '10px', marginBottom: 10 }}>
                    <input type="button" className="success" onClick={compile} value="Run" />
                    <input style={{}} type="button" className="success" onClick={copyclipboard} value={'Copy Room Id'}></input>
                    <input style={{}} type="button" className="error" onClick={leaveroom} value={'Leave Room'}></input>
                </div>
            </div>
            <div className="realtimeeditor">
                <textarea id="codeeditor"></textarea>
            </div>
        </div>

    </>
}