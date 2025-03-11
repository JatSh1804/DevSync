import * as React from "react";
import { useEffect, useRef, useState } from "react";
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
import { io, Socket } from "socket.io-client";
import { Device } from "mediasoup-client";
import Toast, { Toaster } from "react-hot-toast";

import { WebcamCapture } from "../components/webcam";

import { AiOutlinePlus, AiOutlineSend } from "react-icons/ai";
import { HiPause, HiPlay } from "react-icons/hi2";
import { FaRegCopy } from "react-icons/fa6";
import { RxExit } from "react-icons/rx";

import { Manualtippy } from "../components/ui/ManualTippy";
import createDevice from "../components/DeviceConfig";
import { Button } from "@/components/ui/button";
import { MoveVerticalIcon, PlusIcon, SearchIcon, TrashIcon, ZapIcon } from "@/lib/icons-utils";
import { CustomModal } from "@/components/ui/customModal";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import MembersSheet from "@/components/ui/member-sheet";
import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, CircleCheckBig, RefreshCcw } from "lucide-react";
import { FloatingVideo } from '../components/FloatingVideo';
import { useMediasoup } from '../hooks/useMediasoup';
import { StreamDebugger } from '../components/StreamDebugger';

interface ModalValue {
    active: boolean;
    Header: string;
    Message: string;
    error: string;
    success?: boolean | string | null;
    successFunction?: () => void;
    errorFunction?: () => void;
    timeout?: number;
}
type Member = {
    role: 'member' | 'owner' | 'cohost',
    email?: string;
    username: string;
    socketId: string;
}
export default function Editorpage() {
    const location = useLocation();
    // console.log(location.state)

    const navigate = useNavigate();

    const editorref = useRef<any>();
    const codeRef = useRef('');
    const socket = useRef<Socket | null>();

    const [message, setMessage] = useState('');
    const [msgArray, setmsgArray] = useState([]);
    const { RoomId } = useParams();
    const [searchParams] = useSearchParams();
    const queryRoom = searchParams.get('queryRoom');
    const [lastEdit, setlastEdit] = useState();

    const [Client, setClients] = useState([]);
    const [ClientEmails, setEmails] = useState({});
    const [mode, setmode] = useState(['js', 'javascript']);
    const [role, setRole] = useState();
    const [access, setAccess] = useState<boolean>(false);
    const modeRef = useRef<any>();
    //Handling the Drawer opening for Members.
    const btnRef = React.useRef();
    const msgBox = useRef<any>();

    const [currentUser, setCurrentUser] = useState<Member>({
        socketId: 'string',
        role: 'member',
        username: '',
        email: '',
    })

    const [ModalValue, setModalValue] = useState<ModalValue>({
        active: false,
        Header: '',
        Message: '',
        success: null,
        error: null,
        timeout: 0,
    })
    const [disabled, setDisabled] = useState(false);

    const camRef = useRef<HTMLVideoElement>(null);
    const [rtpCapability, setRtpCapability] = useState();
    // const [device, setDevice] = useState();

    const device = useRef<Device | null>(null);

    const transport = useRef(null);
    const producer = useRef(null);

    const [syncing, setSyncing] = useState<Boolean>(true);

    const handleRoleAccess = (role) => {
        if (role == 'owner' || role == 'cohost') {
            setAccess(true);
            if (editorref.current) {
                editorref.current.setOption('readOnly', false);
            }
            console.log('editor=>', editorref.current);
        } else {
            if (editorref.current) {
                editorref.current.setOption('readOnly', 'nocursor');
            }
        }
    };

    useEffect(() => {
        if (location?.state == null) {
            console.log("emtpy");
            navigate('/', { state: { RoomId: queryRoom } });
            return;
        }
        const { username, email, role } = location.state;
        const RoomId = location?.state?.RoomId || queryRoom;
        async function init() {
            editorref.current = Codemirror.fromTextArea(document.getElementById("codeeditor"), {
                mode: {
                    name: `${mode[0] == 'js' ? 'javascript' : 'text/x-' + 'javascript'}`,
                    json: true
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
            });
        };

        const connect = async () => {
            await init();
            socket.current = await socketinit({ RoomId });
            socket.current.on('connect_error', (err) => Toast.error(`Hello ${err.message}`));
            socket.current.on('connect_failed', (err) => Toast.error("Not Able to connect right now!"));
            console.log("Socket current=>", socket.current);
            let changeTimer;

            if (editorref.current) {
                editorref.current.on('change', (instance, changes) => {
                    codeRef.current = instance.getValue();
                    clearTimeout(changeTimer);
                    setSyncing(false);
                    changeTimer = setTimeout(() => {
                        if (changes.origin != 'setValue') {
                            setSyncing(true);
                            console.log("emitting code");
                            socket.current.emit("Code Change", { RoomId, language: mode, username, code: instance.getValue() }, () => {
                                setSyncing(false)
                            });
                        }
                    }, 800);
                    setSyncing(false);
                });
            }

            socket.current.on("connect", () => {
                console.log("Connected to the Server!");
                socket.current.emit('UserJoin', { RoomId, username, email, role }, (rtpCapability) => {
                    setRtpCapability(rtpCapability);
                    device.current = createDevice(rtpCapability, device);
                    console.log(device.current);
                });

                socket.current.on("Joined", ({ client, socketId, username, role, email }) => {
                    console.log(client);
                    setClients(client);
                    setEmails(prevEmails => ({
                        ...prevEmails,
                        ...client.reduce((acc, { socketId, email }) => {
                            acc[socketId] = email;
                            return acc;
                        }, {}),
                        [socketId]: email
                    }));

                    if (socket.current?.id == socketId) {
                        Toast.success("You joined a Room!");
                        handleRoleAccess(role);
                        setRole(role);
                    } else {
                        Toast.success(`${username} Joined the Room!`);
                    }
                    if (codeRef.current) {
                        console.log(codeRef.current);
                    }
                });

                socket.current.on("ROLE", ({ role, access }) => {
                    setSyncing(true);
                    handleRoleAccess(role);
                    setRole(role);
                    setSyncing(false);
                });

                socket.current.on("Userleave", ({ User, socketId }) => {
                    console.log(`${User.username} left...`);
                    setClients(prev => prev.filter(item => item.socketId !== socketId));
                    console.log(Client);
                    Toast.error(`${User.username} left the room!`);
                });

                socket.current.on("Code Sync", (code) => {
                    console.log("Got some changes...");
                    console.log(code);
                    setlastEdit(code.username);
                    if (editorref.current) {
                        editorref.current.setValue(code.code);
                        editorref.current.setCursor(editorref.current.lineCount(), 0);
                    }
                });

                socket.current.on("Result", ({ result }) => {
                    console.log(result);
                    Toast(result.output || result.error);
                });

                socket.current.on("message receive", ({ message, sender, username }) => {
                    console.log("client received", message);
                    const time = new Date();
                    setmsgArray(prev => {
                        if (prev.length > 0 && prev[prev.length - 1].sender === sender) {
                            const lastMessage = prev[prev.length - 1];
                            const updatedMessage = {
                                ...lastMessage,
                                message: `${lastMessage.message}\n${message}`,
                                time: [time.getHours(), time.getMinutes()]
                            };
                            return [...prev.slice(0, -1), updatedMessage];
                        } else {
                            return [...prev, { sender, message, username, time: [time.getHours(), time.getMinutes()] }];
                        }
                    });
                    console.log(msgArray);
                });

                socket.current.on("PROMOTED", ({ role }) => {
                    console.log('PROMOTED');
                    handleRoleAccess(role);
                    setRole(role);
                    if (role == 'cohost') {
                        Toast.success(`Promoted to Co-Host!`);
                    }
                });

                socket.current.on("Kicked", ({ email, socketId }) => {
                    if (socket.current?.id == socketId) {
                        Toast.error('You have been Kicked Out!');
                        socket.current?.disconnect();
                        setModalValue({
                            Header: 'You have been kicked out from the Room',
                            Message: 'You can Join the Room after 1 Hour.',
                            error: 'Leave Room!',
                            success: null,
                            timeout: 15000,
                            active: true
                        });
                    }
                });
            });

            socket.current.on("connection_failed", () => { Toast.error("No Connection established!") });
        };
        connect();

        console.log('role=>', role);

        return () => {
            socket.current.disconnect();
            socket.current.close();
            socket.current.off("Joined")
        };
    }, []);

    useEffect(() => {
        console.log("ModeChange", mode[0]);
        switch (mode[0]) {
            case 'js':
                editorref?.current.setValue("let text = `Hello World!`; \n console.log(text)");
                break;
            case 'java':
                editorref?.current.setValue("/* HelloWorld.java\n */\n\npublic class HelloWorld\n{\n…rgs) {\n\t\tSystem.out.println('Hello World!');\n\t}\n}");
            default:
                break;
        }
    }, [mode]);
    useEffect(() => {
        console.log("working....");
        msgBox.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgArray]);


    const sendMsg = (e) => {
        e.preventDefault();
        if (message == '') { Toast.error('Message field cannot be empty!'); return; }
        socket.current.emit("chat message", { RoomId, message, sender: socket.current.id, username: location.state.username });
        console.log('emitting...');
        setMessage('');
    };

    const leaveroom = () => {
        navigate('/Home');
        Toast.dismiss();
        return;
    };
    const copyclipboard = async () => {
        Toast.success("Room ID copied!");
        await navigator.clipboard.writeText(RoomId);
    };
    const compile = async (e) => {
        e.preventDefault();
        setDisabled(true);
        console.log(codeRef.current);
        socket.current.emit("Compile", { code: codeRef.current, RoomId, language: mode[0], input: "" });
        setTimeout(() => { setDisabled(false); }, 5000);
    };

    const handlePromote = (e) => {
        const socketId = e.target.closest('[data-target-user]')?.getAttribute('data-target-user');
        console.log('Debug:-->Trying to promote')
        if (!socketId) return;
        else if (role == 'owner' && access) {
            socket.current.emit('PROMOTE', { RoomId, socketId, role });
        }
    };
    const handleKick = (e) => {
        let socketId = e.target.closest('[data-target-user]')?.getAttribute('data-target-user');
        let username = e.target.closest('[data-target-name]')?.getAttribute('data-target-name');
        console.log(username);
        console.log(socketId);
        if (ClientEmails && ClientEmails[socketId]) {
            console.log("rece");
            setModalValue({
                Header: `You want to kick ${username} from the room?`,
                Message: `${username} will not be able to join again for 1 hour.`,
                error: 'Cancel',
                success: 'Kick',
                active: true,
                successFunction: () => socket.current.emit('Kick', { RoomId, socketId, role, email: ClientEmails[socketId] }),
                errorFunction: () => { }
            });
        }
    };
    const handleRTPCapabilities = () => {
        socket.current.emit("getRtpCapabilities", { RoomId }, (data) => {
            console.log(`Router RTPCapabilities=>${JSON.stringify(data)}`);
            setRtpCapability(data);
            createDevice(data, device);
            let sender = true;
            createSendTransport(sender);
        });
    };
    const createSendTransport = async (sender) => {
        // see server's socket.on('createWebRtcTransport', sender?, ...)
        // this is a call from Producer, so sender = true
        socket.current.emit('createWebRtcTransport', { sender }, async ({ params }) => {
            // The server sends back params needed 
            // to create Send Transport on the client side
            console.log(params);
            if (params?.error) {
                console.log(params.error);
                return;
            }

            console.log('params=>', params);

            // creates a new WebRTC Transport to send media
            // based on the server's producer transport params
            // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
            console.log(device.current);
            if (device.current) {

                transport.current = await device.current.createSendTransport({
                    ...params, iceServers: [
                        // { urls: 'stun:stun.l.google.com:19302' },
                        // { urls: 'stun:stun1.l.google.com:19302' },
                        // { urls: 'stun:stun2.l.google.com:19302' },
                        // { urls: 'stun:stun3.l.google.com:19302' },
                        // { urls: 'turns:freeturn.tel:5349', username: 'free', credential: 'free' }
                    ]
                });
            }

            // https://mediasoup.org/documentation/v3/communication-between-client-and-server/#producing-media
            // this event is raised when a first call to transport.produce() is made
            // see connectSendTransport() below
            console.log(producer.current);
            if (transport?.current) {

                transport.current.on('connect', ({ dtlsParameters }, callback, errback) => {
                    console.log(dtlsParameters);
                    socket.current.emit('transport-connect', {
                        transportId: transport.current.id,
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
                    console.log(`dtlsStateChange to :${dtlsState}`);
                    if (dtlsState === 'closed') {
                        transport.current.close();
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
                    console.log(parameters);

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
                            callback({ id });
                        });
                    } catch (error) {
                        errback(error);
                    }
                });
                if (camRef.current) {

                    const stream = camRef.current?.srcObject;
                    console.log(camRef);
                    const videoTrack = (stream as MediaStream).getVideoTracks()[0];
                    console.log(videoTrack);

                    console.log('--------producing-----------');
                    producer.current = await transport.current.produce({ track: videoTrack });
                    console.log(producer.current.id);
                }
            }
        });
    };

    const handleFileShare = (e) => {
        const filename = 'profile.jpg';
        console.log(e.target.value);
        // const readStream = fs.createReadStream();

        // Send chunks of data to the client as they become available
        const file = e.target.files[0];
        const readStream = new FileReader();
        const chunk = readStream.result;
        // readStream.onload = (event) => {
        //     const chunk = event.target.result;
        //     socket.current.emit('fileChunk', chunk);
        // };
        readStream.readAsArrayBuffer(file);
        socket.current.emit('fileChunk', chunk);

        // Notify the client when the file streaming is complete
        readStream.addEventListener('loadend', () => {
            socket.current.emit('fileEnd');
            console.log('File streaming complete');
        });
    };
    React.useEffect(() => { console.log(`Last edit by ${lastEdit}`) }, [lastEdit])

    const {
        localStream,
        remoteStreams,
        remoteStates,  // Add this
        isAudioEnabled,
        isVideoEnabled,
        toggleAudio,
        toggleVideo,
        startStreaming
    } = useMediasoup({ socket, roomId: RoomId, username: location.state.username });

    useEffect(() => {
        console.log('debug- localStreams:', localStream)
        console.log('debug- remoteStreams:', remoteStreams)
    }, [remoteStreams,localStream])
    // Add this near your other buttons
    const startCall = async () => {
        try {
            await startStreaming();
            Toast.success('Video call started');
        } catch (error) {
            Toast.error('Failed to start video call');
        }
    };

    return (
        <>
            <Toaster position="top-right" />
            <div className="col-span-2 fixed top-0 left-0 right-0 backdrop-blur-sm border-bottom bg-background backdrop-blur flex items-center justify-between border-t bg-background px-4 ">
                <div className="flex items-center gap-2">
                    <MembersSheet access={access} currentUser={currentUser} role={role} members={Client} handleKick={handleKick} handlePromote={handlePromote} />
                    {syncing ? <RefreshCcw color="#d8e335" className="animate-spin" absoluteStrokeWidth /> : <CircleCheckBig color="#33cc1e" absoluteStrokeWidth />}
                    {/* <Sheet>
                        <SheetTrigger>
                            <Button variant="ghost" size="icon" className="gap-2">
                                {Client.length}<UsersIcon className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>

                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Are you absolutely sure?</SheetTitle>
                                <SheetDescription>
                                    This action cannot be undone. This will permanently delete your account
                                    and remove your data from our servers.
                                </SheetDescription>
                            </SheetHeader>
                            <Input placeholder='Search People...' />
                            {<ul>
                                {Client.map(item => <div className="userinfo" name={item.socketId}>{item.username}
                                </div>)}
                            </ul>}
                        </SheetContent>
                    </Sheet> */}

                    {/* <div className="text-sm font-medium">3 users in the room</div> */}
                    <div className="text-sm font-medium">
                        {lastEdit && <p>Last edit by {lastEdit}</p>}
                    </div>

                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                        <TrashIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                        <ZapIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                        <MoveVerticalIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div >
            <div className="min-h-screen w-full bg-background pt-10">
                <ResizablePanelGroup direction="horizontal" style={{ height: '100%' }}>
                    <ResizablePanel maxSize={30} defaultSize={20} minSize={17}>
                        <div className="flex flex-col border-r bg-background p-4">
                            <div className="selectDiv">
                                <Manualtippy content={`${!access ? "You Don't have Access!" : "Choose Language!"}`} placement="top">
                                    <Select disabled={!access} defaultValue="javascript" onValueChange={value => { setmode([modeRef.current?.options[modeRef.current.selectedIndex].getAttribute('data-name'), value]) }} ref={modeRef}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Theme" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="javascript" data-name="js">javascript</SelectItem>
                                            <SelectItem value="java" data-name="java">Java</SelectItem>
                                            <SelectItem value="clike" data-name="cpp">C++</SelectItem>
                                            <SelectItem value="python" data-name="py">Python</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Manualtippy>
                            </div>

                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-medium">Chat</h2>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon">
                                        <SearchIcon className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <PlusIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>


                            <div className="flex-1 overflow-auto">

                                {/* <div className="msgBox" ref={msgBox}> */}
                                <div className="Chatbox">
                                    <ScrollArea className="msgBox h-60 overflow-x-hidden flex flex-col w-full gap-2 py-3" ref={msgBox}>
                                        {/* <div className="msgBox" ref={msgBox}> */}
                                        <Messages messages={msgArray} socket={socket} />
                                        {/* </div> */}
                                    </ScrollArea>

                                    <form className="chat">
                                        <div className="textbox flex">
                                            <Input type="text" className="message w-full round bg-none" onChange={e => { setMessage(e.target.value) }} placeholder="Type Message..." value={message}></Input>
                                            {/* <input type="text" className="message" onChange={e => { setMessage(e.target.value) }} placeholder="Type Message..." value={message}></input> */}
                                            <Manualtippy placement="top" content="Message Send" >
                                                <label htmlFor="send" className="active:bg-muted/9 hover:bg-muted sendicon"><AiOutlineSend size={'30px'} /></label>
                                            </Manualtippy>
                                            <input type="submit" id="send" className="send" onClick={sendMsg} value={"send"}></input>

                                            <Manualtippy placement='top' content='Share File'>
                                                <label htmlFor="file" className="sendicon" onClick={handleRTPCapabilities}><AiOutlinePlus size={'30px'} fontSize={'100'} /></label>
                                            </Manualtippy>
                                            <input type="button" className="file send" id="file" ></input>
                                        </div>
                                    </form>
                                </div>
                            </div>
                            <CustomModal value={ModalValue} />


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
                            <Button onClick={startCall}>Start Video Call</Button>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel>
                        <textarea disabled={access} id="codeeditor"></textarea>
                    </ResizablePanel>
                </ResizablePanelGroup>

            </div>
            <FloatingVideo
                localStream={localStream}
                remoteStreams={remoteStreams}
                remoteStates={remoteStates}  // Add this
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                username={location.state.username}
            />
            <StreamDebugger
                localStream={localStream}
                remoteStreams={remoteStreams}
            />
        </>
    )
}
const Messages = ({ messages, socket }: {
    messages: Array<any>;
    socket: React.MutableRefObject<Socket | null>;
}) => {
    let regex = new RegExp(/([\w+]+\:\/\/)?([\w\d-]+\.)*[\w-]+[\.\:]\w+([\/\?\=\&\#\.]?[\w-]+)*\/?/gm);

    const lastMessage = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        scrollToBottom()

    }, [messages])
    const scrollToBottom = () => {
        lastMessage.current?.scrollIntoView({ behavior: 'smooth' });
    }
    return (
        <>
            <div className="flex-1 space-y-4">
                <AnimatePresence>
                    {messages.map((item, index) => {
                        let yourMsg = item.sender == socket.current.id;
                        return <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            transition={{ type: "spring", stiffness: 500, damping: 50 }}
                            className={`flex ${yourMsg ? 'justify-end' : 'justify-start'} gap-2`}
                        >
                            <div className={`msgDiv bg-muted ${yourMsg && 'yourMsgDiv'}`} key={index} name={item.sender}>
                                <div className={`flex sender ${yourMsg && 'otherText'}`}>
                                    <span className={`${yourMsg ? 'you' : item.username}`}>
                                        {yourMsg ? 'You' : item.username}
                                    </span>
                                    <span className="texttime">{`${item.time[0]}:${item.time[1]}`}</span>
                                </div>
                                {item.message.match(regex) ?
                                    <a href={item.message.startsWith('http://') || item.message.startsWith('https://') ? item.message : `http://${item.message}`} target='_blank' className={`msgText ${yourMsg && 'otherText'} linkmsg`}>{item.message}</a>
                                    : <div
                                        className={`msgText ${yourMsg && 'otherText'}`}
                                        // This converts the \n into <br /> for new line rendering
                                        dangerouslySetInnerHTML={{
                                            __html: item.message.replace(/\n/g, '<br />'),
                                        }}
                                    ></div>
                                }
                            </div>
                        </motion.div>
                    })}
                    <div className="last-message" ref={lastMessage}></div>
                </AnimatePresence>
            </div>
        </>
    );
};