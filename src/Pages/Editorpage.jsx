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
import { socketinit } from "../socket";
import Toast, { Toaster } from "react-hot-toast";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    useDisclosure,
    Input,
    Box,
    Tooltip,
} from '@chakra-ui/react'
import { Select } from '@chakra-ui/react'

import { AiOutlineArrowDown, AiOutlineArrowUp, AiOutlineConsoleSql, AiOutlineEllipsis, AiOutlineInfoCircle, AiOutlineSend } from "react-icons/ai";
import { HiMiniUserGroup, HiPause, HiPlay } from "react-icons/hi2";
import { FaRegCopy } from "react-icons/fa6";
import { RxExit } from "react-icons/rx";

export default function Editorpage() {
    const location = useLocation();
    // console.log(location.state)

    const navigate = useNavigate();

    const editorref = useRef();
    const codeRef = useRef('');
    const socket = useRef();

    const [message, setMessage] = useState('');
    const [msgArray, setmsgArray] = useState([]);
    const { RoomId } = useParams()
    const { queryRoom } = useSearchParams();
    const [lastEdit, setlastEdit] = useState();

    const [Client, setClients] = useState([])
    const [mode, setmode] = useState(['js', 'javascript'])
    const [role, setRole] = useState();
    const [access, setAccess] = useState();
    const modeRef = useRef();
    //Handling the Drawer opening for Members.
    const { isOpen, onOpen, onClose } = useDisclosure()
    const btnRef = React.useRef()
    const msgBox = useRef();

    const [disabled, setDisabled] = useState(false);

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
    useEffect(() => {
        const { RoomId, username, email, role } = location.state
        if (location?.state == null) {
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
            console.log("Socket current=>", socket.current)
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
                socket.current.on("ROLE", ({ role, access }) => {
                    handleRoleAccess(role);
                    setRole(role);
                })

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
                    editorref.current.setCursor(editorref.current.lineCount(), 0)
                })
                socket.current.on("Result", ({ result }) => {
                    console.log(result)
                    Toast(result.output || result.error);
                })
                socket.current.on("message receive", ({ message, sender, username }) => {
                    console.log("client received", message)
                    // console.log(msgArray);
                    const time = new Date()
                    setmsgArray(prev => { return [...prev, { sender, message, username, time: [time.getHours(), time.getMinutes()] }] });
                    console.log(msgArray);
                })
                socket.current.on("PROMOTED", ({ role }) => {
                    console.log('PROMOTED')
                    handleRoleAccess(role)
                    setRole(role)
                        (role == 'cohost' && Toast.success(`Promoted to Co-Host!`));
                })
            })
            socket.current.on("connection_failed", () => { Toast.error("No Connection established!") })

        };

        connect();


        console.log('role=>', email)

        return () => { socket.current.disconnect(); socket.current.off("Joined") }
    }, []);


    useEffect(() => {
        console.log("ModeChange", mode[0])
        switch (mode[0]) {
            case 'js':
                editorref.current.setValue("let text = `Hello World!`; \n console.log(text)")
                break;
            case 'java':
                editorref.current.setValue("/* HelloWorld.java\n */\n\npublic class HelloWorld\n{\n…rgs) {\n\t\tSystem.out.println('Hello World!');\n\t}\n}")
            default:
                break;
        }
    }, [mode])
    useEffect(() => {
        console.log("working....")
        msgBox.current?.scrollIntoView({ behavior: 'smooth' })
    }, [msgArray])

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
        setDisabled(true);
        socket.current.emit("Compile", { code: codeRef.current, RoomId, language: mode[0], input: "" })
        setTimeout(() => { setDisabled(false); }, 5000)
    }
    const handlePromote = (e) => {
        console.log(e.target)
        if (role == 'owner' && access) {
            socket.current.emit('PROMOTE', { RoomId, socketId: e.target.getAttribute('name'), role })
        }
    }
    // console.log(location.state)
    // console.log(mode)

    return <><Toaster position="top-right" />
        <div className="wrapdiv">
            <Box resize={'both'} minWidth='15vw' width='25vw' minHeight='100vh' overflow='auto' className="sidebar">
                <div className="controls">
                    <Tooltip label="Meeting Details" placement="bottom">
                        <span>
                            <AiOutlineInfoCircle className="icons info" />
                        </span>
                    </Tooltip>
                    <Tooltip label="Members" placement="bottom">
                        <span>
                            <HiMiniUserGroup className="icons users" ref={btnRef} onClick={onOpen} />
                        </span>
                    </Tooltip>
                </div>
                <div className="selectDiv">
                    <Tooltip label={`${!access ? "You Don't have Access!" : "Choose Language!"}`} placement="top">
                        <Select disabled={!access} ref={modeRef} onChange={e => { setmode([e.target.options[e.target.selectedIndex].getAttribute('name'), e.target.value]) }}>
                            <option value="javascript" name="js">javascript</option>
                            <option value="clike" name="java">Java</option>
                            <option value="clike" name="cpp">C++</option>
                            <option value="python" name="py">Python</option>
                        </Select>
                    </Tooltip>
                </div>
                {lastEdit && <p>Last edit by {lastEdit}</p>}

                <div className="Chatbox">
                    <div className="msgBox" ref={msgBox}>
                        {msgArray.map((item, index) => {
                            let yourMsg = item.sender == socket.current.id;
                            let regex = new RegExp(/([\w+]+\:\/\/)?([\w\d-]+\.)*[\w-]+[\.\:]\w+([\/\?\=\&\#\.]?[\w-]+)*\/?/gm)
                            return <div className={`msgDiv ${yourMsg && 'yourMsgDiv'}`} key={index} name={item.sender}>
                                <div className="">
                                    <div className={`flex sender ${yourMsg && 'otherText'}`}>
                                        <span className={`${yourMsg ? 'you' : 'other'}`}>
                                            {yourMsg ? 'You' : item.username}
                                        </span>
                                        <span className="texttime">{`${item.time[0]}:${item.time[1]}`}</span>
                                    </div>
                                    {item.message.match(regex) ?
                                        <a href={item.message.startsWith('http://') || item.message.startsWith('https://') ? item.message : `http://${item.message}`} target='_blank' className={`msgText ${yourMsg && 'otherText'} linkmsg`}>{item.message}</a>
                                        : <div className={`msgText ${yourMsg && 'otherText'}`}> {item.message}</div>
                                    }                                </div>
                            </div>
                        })}
                    </div>

                    <form className="chat">
                        <div className="textbox flex">
                            <input type="text" className="message" onChange={e => { setMessage(e.target.value) }} placeholder="Type Message..." value={message}></input>
                            <Tooltip placement="top" label="Message Send" >
                                <label htmlFor="send" className="sendicon"><AiOutlineSend size={'30px'} fontSize={'1000'} /></label>
                            </Tooltip>
                            <input type="submit" id="send" className="send" onClick={sendMsg} value={"send"}></input>
                        </div>
                    </form>
                </div>
                <div className="controls" style={{ gap: '10px', marginBottom: 10 }}>
                    <Tooltip placement="top" label={`${!access ? "You don't have Access to Run!" : 'Run!'}`}>
                        <label htmlFor="run" className={`success prevent ${(!access || disabled) && 'disabled'}`}><HiPlay /></label>
                    </Tooltip>
                    <Tooltip placement="top" label="Copy Room Code">
                        <label htmlFor="copy" className="success"><FaRegCopy /></label>
                    </Tooltip>
                    <Tooltip placement="top" label="Leave Room">
                        <label htmlFor="leave" className="error"><RxExit /></label>
                    </Tooltip>
                    <input id='run' type="button" className={`success prevent ${(!access || disabled) && 'disabled'}`} onClick={compile} disabled={!access || disabled} value={'RUN'} />
                    <input id='copy' type="button" className="success" onClick={copyclipboard} value={'Copy Room Id'}></input>
                    <input id='leave' type="button" className="error" onClick={leaveroom} value={'Leave Room'}></input>
                </div>
            </Box>
            <div className="realtimeeditor">
                <textarea disabled={access} id="codeeditor"></textarea>
            </div>
        </div>
        <Drawer
            isOpen={isOpen}
            placement='right'
            onClose={onClose}
            finalFocusRef={btnRef}
        >
            <DrawerOverlay />
            <DrawerContent background={'rgb(3 7 18)'}>
                <DrawerCloseButton />
                <DrawerHeader>People in Room</DrawerHeader>

                <DrawerBody>
                    <Input placeholder='Search People...' marginBottom={'20px'} />
                    <Box height={'60%'} border={'1px solid grey'} borderRadius={'10px'}>
                        {<ul>
                            {Client.map(item => <div className="userinfo" name={item.socketId}>{item.username}
                                <Menu>
                                    <MenuButton
                                        aria-label='Options'
                                        variant='outline'
                                        p={0}
                                        fontSize={'30px'}
                                        fontWeight={400}
                                    ><AiOutlineEllipsis /></MenuButton>
                                    <MenuList background={''}>
                                        <MenuItem onClick={(role == 'owner' && access) && handlePromote} background={'transparent'} name={item.socketId} color={'rgb(99,198,99)'} backdropBlur={'10px'} icon={<AiOutlineArrowUp />} command='⌘T'>
                                            Promo to Co-Host
                                        </MenuItem>
                                        <MenuItem background={'transparent'} backdropBlur={'10px'} icon={<AiOutlineArrowDown />} command='⌘T'>
                                            New Tab
                                        </MenuItem>
                                        <MenuItem background={'transparent'} backdropBlur={'10px'} icon={<AiOutlineArrowDown />} command='⌘T'>
                                            New Tab
                                        </MenuItem>
                                    </MenuList>
                                </Menu>
                            </div>)}
                        </ul>}
                    </Box>
                </DrawerBody>
                <DrawerFooter>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>

    </>
}