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
    const [mode, setmode] = useState(['js', 'javascript'])
    const [role, setRole] = useState();
    const [access, setAccess] = useState();
    const modeRef = useRef();

    const handleRoleAccess = (role) => {
        if (role == 'owner' || role == 'cohost') {
            setAccess(true);
            editorref.current.setOption('readOnly', false)
            console.log('editor=>', editorref.current)
        } else {
            editorref.current.setOption('readOnly', 'nocursor')
        }
    }

    // const socket = io('http://localhost:3002', () => {});

    useEffect(() => { console.log(Client) }, [Client])

    useEffect(() => {
        if (location.state == null) {
            console.log("emtpy");
            navigate('/', { state: { RoomId: queryRoom } });
            return;
        }
        async function init() {
            editorref.current = Codemirror.fromTextArea(document.getElementById("codeeditor"), {
                mode: {
                    name: `${mode[0] == 'js' ? 'javascript' : 'text/x-' + 'javascript'}`
                    , json: true
                },
                theme: 'dracula',
                autoCloseBrackets: true,
                autoclosetags: true,
                lineNumbers: true,
                autoRefresh: true,
                dragDrop: true,
                autofocus: true,
                extraKeys: {
                    "Ctrl-Space": "autocomplete",
                },
            })
        };

        const connect = async () => {
            init();
            socket.current = await socketinit();
            socket.current.on('connect_error', (err) => Toast.error(err.message));
            socket.current.on('connect_failed', (err) => Toast.error("Not Able to connect right now!"));

            let changeTimer;

            // if (access) {
            editorref.current?.on('change', (instance, changes) => {
                codeRef.current = instance.getValue();
                // Clear the existing timer
                clearTimeout(changeTimer);
                // Set a new timer to emit "Code Change" after 2 seconds of inactivity
                changeTimer = setTimeout(() => {
                    if (changes.origin != 'setValue') {
                        console.log("emitting code")
                        socket.current.emit("Code Change", { RoomId, language: modeRef.current.options[modeRef.current.selectedIndex].getAttribute('name'), username, code: instance.getValue() });
                    }
                }, 2000); // 2 seconds delay
            });

            socket.current.on("connect", () => {
                console.log("Connected to the Server!")
                socket.current.emit('UserJoin', { RoomId, username, email, role })
                // console.log(socket.id)

                socket.current.on("Joined", ({ client, socketId, username, role }) => {
                    console.log(role)
                    setClients(client);
                    // console.log(Client);
                    (socket.current?.id == socketId) ? (() => {
                        Toast.success("You joined a Room!");

                        handleRoleAccess(role);
                        setRole(role);
                        // setAccess((role == 'owner' || role == 'cohost'))
                    })() :
                        Toast.success(`${username} Joined the Room!`);
                    if (codeRef.current) {
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
                    console.log(result)
                    Toast(result.output || result.error);
                })
                socket.current.on("message receive", ({ message, sender, username }) => {
                    console.log("client received", message)
                    // console.log(msgArray);
                    setmsgArray(prev => { return [...prev, { sender, message, username }] });
                    console.log(msgArray);
                })
                socket.current.on("PROMOTED", ({ role }) => {
                    console.log('PROMOTED')
                    Toast.success(`Promoted to ${role}!`)
                    handleRoleAccess(role)
                    setRole(role)
                })
            })
            socket.current.on("connection_failed", () => { Toast.error("No Connection established!") })

        };

        connect();

        const { RoomId, username, email, role } = location.state
        console.log('role=>', role)

        return () => { socket.current.disconnect(); socket.current.off("Joined") }
    }, []);


    useEffect(() => {
        // handleRoleAccess(role)
    }, [role])

    const sendMsg = (e) => {
        e.preventDefault();
        if (message == '') { Toast.error('Message field cannot be empty!'); return; }
        socket.current.emit("chat message", { RoomId, message, sender: socket.current.id, username: location.state.username });
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
        await navigator.clipboard.writeText(RoomId, socket.socket.current.id)
    }
    const compile = async (e) => {
        e.preventDefault();
        socket.current.emit("Compile", { code: codeRef.current, RoomId, language: mode[0], input: "" })
    }
    const handlePromote = (e) => {
        console.log(e.target)
        if (role == 'owner' && access) {
            socket.current.emit('PROMOTE', { RoomId, socketId: e.target.getAttribute('name'), role: 'cohost' })
        }
    }
    // console.log(location.state)
    // console.log(mode)

    return <><Toaster position="top-right" />
        <div className="wrapdiv">
            <div className="sidebar">
                <select disabled={!access} ref={modeRef} onChange={e => { setmode([e.target.options[e.target.selectedIndex].getAttribute('name'), e.target.value]) }}>
                    <option value='javascript' name='js'>javascript</option>
                    <option value='clike' name='java'>Java</option>
                    <option value='clike' name='cpp'>C++</option>
                    <option value='python' name='py'>Python</option>
                </select>
                {lastEdit && <p>Last edit by {lastEdit}</p>}

                {<ul onClick={(role == 'owner' && access) && handlePromote}>
                    {Client.map(item => <p name={item.socketId} >{item.username}</p>)}
                </ul>}

                <ul>
                    {msgArray.map((item, index) => { return <li key={index} className={item.type}>{item.username}:{item.message}</li> })}
                </ul>
                <form className="chat">
                    <input type="text" onChange={e => { setMessage(e.target.value) }} placeholder="Type Message..." value={message}></input>
                    <input type="submit" onClick={sendMsg} value={"send"}></input>
                </form>
                <div style={{ display: 'grid', gap: '10px', marginBottom: 10 }}>
                    <input type="button" className="success" onClick={compile} disabled={!access} value="Run" />
                    <input style={{}} type="button" className="success" onClick={copyclipboard} value={'Copy Room Id'}></input>
                    <input style={{}} type="button" className="error" onClick={leaveroom} value={'Leave Room'}></input>
                </div>
            </div>
            <div className="realtimeeditor">
                <textarea disabled={access} id="codeeditor"></textarea>
            </div>
        </div >

    </>
}