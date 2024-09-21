import React, { useEffect, useRef, useState } from "react";
// import fs from 'fs'
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

import { WebcamCapture } from "../components/webcam";
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
} from '@chakra-ui/react'
import { Select } from '@chakra-ui/react'
// import  from "@tippyjs/react";
// import 'tippy.js/dist/tippy.css';
import { AiOutlineArrowDown, AiOutlineArrowUp, AiOutlineEllipsis, AiOutlineInfoCircle, AiOutlinePlus, AiOutlineSend } from "react-icons/ai";
import { HiMiniUserGroup, HiPause, HiPlay } from "react-icons/hi2";
import { FaRegCopy } from "react-icons/fa6";
import { RxExit } from "react-icons/rx";
import { ManualClose } from "../components/ui/ManualModal";
import { Manualtippy } from "../components/ui/ManualTippy";
import createDevice from "../components/DeviceConfig";

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
    const [ClientEmails, setEmails] = useState({});
    const [mode, setmode] = useState(['js', 'javascript'])
    const [role, setRole] = useState();
    const [access, setAccess] = useState();
    const modeRef = useRef();
    //Handling the Drawer opening for Members.
    const { isOpen, onOpen, onClose } = useDisclosure();
    const btnRef = React.useRef()
    const msgBox = useRef();

    const [ModalValue, setModalValue] = useState({ active: false });
    const [disabled, setDisabled] = useState(false);

    const camRef = useRef();
    const [rtpCapability, setRtpCapability] = useState();
    // const [device, setDevice] = useState();
    const device = useRef();

    const transport = useRef(null);
    const producer = useRef(null);


    const handleRoleAccess = (role) => {
        if (role == 'owner' || role == 'cohost') {
            setAccess(true);
            editorref.current.setOption('readOnly', false)
            console.log('editor=>', editorref.current)
        } else {
            editorref.current.setOption('readOnly', 'nocursor')
        }
    }
    // const socket = io('http://', () => {});
    useEffect(() => {
        if (location?.state == null) {
            console.log("emtpy");
            navigate('/', { state: { RoomId: queryRoom } });
            return;
        }
        const { username, email, role } = location.state
        const RoomId = location?.state?.RoomId || queryRoom
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
            socket.current = await socketinit({ RoomId });
            socket.current.on('connect_error', (err) => Toast.error(`Hello ${err.message}`));
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
                socket.current.emit('UserJoin', { RoomId, username, email, role }, (rtpCapability) => {
                    // console.log('rtpCapability=>',JSON.stringify(rtpCapability))
                    setRtpCapability(rtpCapability);
                    device.current = createDevice(rtpCapability, device);
                    console.log(device.current)
                })
                // console.log(socket.id)

                socket.current.on("Joined", ({ client, socketId, username, role, email }) => {
                    console.log(client)
                    setClients(client);
                    setEmails(prevEmails => ({
                        ...prevEmails,
                        ...client.reduce((acc, { socketId, email }) => {
                            acc[socketId] = email;
                            return acc;
                        }, {}),
                        [socketId]: email
                    }));

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
                socket.current.on("Kicked", ({ email, socketId }) => {
                    if (socket.current?.id == socketId) {
                        Toast.error('You have been Kicked Out!')
                        socket.current?.disconnect();
                        setModalValue({
                            Header: 'You have been kicked out from the Room',
                            Message: 'You can Join the Room after 1 Hour. ',
                            error: 'Leave Room!',
                            timeout: 15000,
                            active: true
                        })
                    }
                })
            })
            socket.current.on("connection_failed", () => { Toast.error("No Connection established!") })

        };

        connect();


        console.log('role=>', role)

        return () => { socket.current.disconnect(); socket.current.off("Joined") }
    }, []);


    useEffect(() => {
        console.log("ModeChange", mode[0])
        switch (mode[0]) {
            case 'js':
                editorref?.current.setValue("let text = `Hello World!`; \n console.log(text)")
                break;
            case 'java':
                editorref?.current.setValue("/* HelloWorld.java\n */\n\npublic class HelloWorld\n{\n…rgs) {\n\t\tSystem.out.println('Hello World!');\n\t}\n}")
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
        await navigator.clipboard.writeText(RoomId)
    }
    const compile = async (e) => {
        e.preventDefault();
        setDisabled(true);
        console.log(codeRef.current);
        socket.current.emit("Compile", { code: codeRef.current, RoomId, language: mode[0], input: "" })
        setTimeout(() => { setDisabled(false); }, 5000)
    }
    const handlePromote = (e) => {
        console.log(e.target)
        if (role == 'owner' && access) {
            socket.current.emit('PROMOTE', { RoomId, socketId: e.target.getAttribute('name'), role })
        }
    }
    const handleKick = (e) => {
        let socketId = e.target.getAttribute('name');
        let username = e.target.value;
        console.log(username)
        console.log(socketId)
        if (ClientEmails && ClientEmails[socketId]) {
            console.log("rece")
            setModalValue({
                Header: `You want to kick ${username} from the room?`,
                Message: `${username} will not be able to join again for 1 hour.`,
                error: 'Cancel',
                success: 'Kick',
                active: true,
                successFunction: () => socket.current.emit('Kick', { RoomId, socketId, role, email: ClientEmails[socketId] }),
                errorFunction: () => { }
            })
        }
    }
    const handleRTPCapabilities = () => {
        socket.current.emit("getRtpCapabilities", { RoomId }, (data) => {
            console.log(`Router RTPCapabilities=>${JSON.stringify(data)}`)
            setRtpCapability(data)
            createDevice(data, device);
            let sender = true;
            createSendTransport(sender)
        })
    }
    const createSendTransport = async (sender) => {
        // see server's socket.on('createWebRtcTransport', sender?, ...)
        // this is a call from Producer, so sender = true
        socket.current.emit('createWebRtcTransport', { sender }, async ({ params }) => {
            // The server sends back params needed 
            // to create Send Transport on the client side
            console.log(params)
            if (params?.error) {
                console.log(params.error)
                return
            }

            console.log('params=>', params)

            // creates a new WebRTC Transport to send media
            // based on the server's producer transport params
            // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
            console.log(device.current)
            transport.current = await device.current.createSendTransport({
                ...params, iceServers: [
                    // { urls: 'stun:stun.l.google.com:19302' },
                    // { urls: 'stun:stun1.l.google.com:19302' },
                    // { urls: 'stun:stun2.l.google.com:19302' },
                    // { urls: 'stun:stun3.l.google.com:19302' },
                    // { urls: 'turns:freeturn.tel:5349', username: 'free', credential: 'free' }
                ]
            });

            // https://mediasoup.org/documentation/v3/communication-between-client-and-server/#producing-media
            // this event is raised when a first call to transport.produce() is made
            // see connectSendTransport() below
            console.log(producer.current)
            if (transport?.current) {

                transport.current.on('connect', ({ dtlsParameters }, callback, errback) => {
                    console.log(dtlsParameters)
                    socket.current.emit('transport-connect', {
                        transportId: transport.id,
                        dtlsParameters
                    }, (response) => {
                        if (response.error) {
                            console.log("Got Some Transport Error=>", response.error);
                            errback(response.error);
                        } else {
                            console.log('Transport connected successfully');
                            callback();
                        }
                    });
                });
                transport.current.on('dtlsstatechange', (dtlsState) => {
                    console.log(`dtlsStateChange to :${dtlsState}`)
                    if (dtlsState === 'closed') {
                        transport.close();
                    }
                });
                transport.current.on('connectionstatechange', (state) => {
                    console.log(`Send transport connection state changed to ${state}`);
                    if (state === 'connected') {
                        console.log('Send transport is connected.');
                    } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                        console.error(`Send transport connection state changed to ${state}`);
                    }
                });

                transport?.current.on('produce', async (parameters, callback, errback) => {
                    console.log(parameters)

                    try {
                        // tell the server to create a Producer
                        // with the following parameters and produce
                        // and expect back a server side producer id
                        // see server's socket.on('transport-produce', ...)
                        await socket.current.emit('transport-produce', {
                            kind: parameters.kind,
                            rtpParameters: parameters.rtpParameters,
                            appData: parameters.appData,
                        }, ({ id }) => {
                            // Tell the transport that parameters were transmitted and provide it with the
                            // server side producer's id.
                            callback({ id })
                        })
                    } catch (error) {
                        errback(error)
                    }
                })
                if (camRef.current) {

                    const stream = camRef.current.video.srcObject;
                    console.log(camRef);
                    const videoTrack = stream.getVideoTracks()[0];
                    console.log(videoTrack)

                    console.log('--------producing-----------')
                    producer.current = await transport.current.produce({ track: videoTrack });
                    console.log(producer.current.id)
                }
            }
        })
    }

    const handleFileShare = (e) => {
        const filename = 'profile.jpg';
        console.log(e.target.value);
        // const readStream = fs.createReadStream();

        // Send chunks of data to the client as they become available
        readStream.on('data', (chunk) => {
            socket.emit('fileChunk', chunk);
        });

        // Notify the client when the file streaming is complete
        readStream.on('end', () => {
            socket.emit('fileEnd');
            console.log('File streaming complete');
        });
    }
    // console.log(location.state)
    // console.log(mode)

    return <><Toaster position="top-right" />
        <ManualClose value={ModalValue} />
        <div className="wrapdiv">
            <Box resize={'both'} minWidth='15vw' width='25vw' minHeight='100vh' overflow='auto' className="sidebar">
                <div className="controls">
                    <Manualtippy content="Meeting Details" placement="bottom" animation='text' theme='forest' delay={[500, 100]} >
                        <span>
                            <AiOutlineInfoCircle className="icons info" />
                        </span>
                    </Manualtippy>
                    <Manualtippy content="Members" placement="bottom">
                        <span>
                            <HiMiniUserGroup className="icons users" ref={btnRef} onClick={onOpen} />
                        </span>
                    </Manualtippy>
                </div>
                <div className="selectDiv">
                    <Manualtippy content={`${!access ? "You Don't have Access!" : "Choose Language!"}`} placement="top">
                        <Select disabled={!access} ref={modeRef} onChange={e => { setmode([e.target.options[e.target.selectedIndex].getAttribute('name'), e.target.value]) }}>
                            <option value="javascript" name="js">javascript</option>
                            <option value="clike" name="java">Java</option>
                            <option value="clike" name="cpp">C++</option>
                            <option value="python" name="py">Python</option>
                        </Select>
                    </Manualtippy>
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
                            <Manualtippy placement="top" content="Message Send" >
                                <label htmlFor="send" className="sendicon"><AiOutlineSend size={'30px'} fontSize={'1000'} /></label>
                            </Manualtippy>
                            <input type="submit" id="send" className="send" onClick={sendMsg} value={"send"}></input>

                            <Manualtippy placement='top' content='Share File'>
                                <label htmlFor="file" className="sendicon" onClick={handleRTPCapabilities}><AiOutlinePlus size={'30px'} fontSize={'100'} /></label>
                            </Manualtippy>
                            <input type="button" className="file send" id="file" ></input>
                        </div>
                    </form>
                </div>
                <div className="controls" style={{ gap: '10px', marginBottom: 10 }}>
                    <Manualtippy placement="top" content="Leave Room">
                        <label htmlFor="leave" className="error"><RxExit /></label>
                    </Manualtippy>
                    <Manualtippy placement="top" content="Copy Room Code">
                        <label htmlFor="copy" className="success"><FaRegCopy /></label>
                    </Manualtippy>
                    <Manualtippy placement="top" content={`${!access ? "You don't have Access to Run!" : disabled ? 'Compiling!' : 'Run!'}`}>
                        <label htmlFor="run" className={`success prevent ${(!access || disabled) && 'disabled'}`}>{disabled ? <HiPause fontWeight={700} /> : <HiPlay />}</label>
                    </Manualtippy>
                    <input id='run' type="button" className={`success prevent ${(!access || disabled) && 'disabled'}`} onClick={compile} disabled={!access || disabled} value={'RUN'} />
                    <input id='copy' type="button" className="success" onClick={copyclipboard} value={'Copy Room Id'}></input>
                    <input id='leave' type="button" className="error" onClick={leaveroom} value={'Leave Room'}></input>
                </div>
            </Box>
            <div className="realtimeeditor">
                <textarea disabled={access} id="codeeditor"></textarea>
                <WebcamCapture audio={true} camRef={camRef} mirrored={false} />
            </div>
        </div>
        <Drawer
            isOpen={isOpen}
            placement='right'
            onClose={onClose}
            finalFocusRef={btnRef}
        >
            <DrawerOverlay />
            <DrawerContent background='rgb(3 7 18)'>
                <DrawerCloseButton />
                <DrawerHeader>People in Room</DrawerHeader>
                <DrawerBody>
                    <Input placeholder='Search People...' marginBottom={'20px'} />
                    <Box height={'60%'} border={'1px solid grey'} borderRadius={'10px'}>
                        {<ul>
                            {Client.map(item => <div className="userinfo" name={item.socketId}>{item.username}
                                <Menu>
                                    <MenuButton
                                        aria-content='Options'
                                        variant='outline'
                                        p={0}
                                        fontSize={'30px'}
                                        fontWeight={400}
                                    ><AiOutlineEllipsis /></MenuButton>
                                    <MenuList background={''}>
                                        <MenuItem onClick={(role == 'owner' && access) && handlePromote} isDisabled={!(role == 'owner' && access)} background={'transparent'} name={item.socketId} color={'rgb(99,198,99)'} backdropBlur={'10px'} icon={<AiOutlineArrowUp />} command='⌘T'>
                                            Promote to Co-Host
                                        </MenuItem>
                                        <MenuItem onClick={(role == 'owner' && access) && handleKick} isDisabled={!(role == 'owner' && access)} background={'transparent'} value={item.username} name={item.socketId} backdropBlur={'10px'} icon={<AiOutlineArrowDown />} command='⌘T'>
                                            Kick Out from Room!
                                        </MenuItem>
                                        {/* <MenuItem background={'transparent'} backdropBlur={'10px'} icon={<AiOutlineArrowDown />} command='⌘T'>
                                            New Tab
                                        </MenuItem> */}
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
