import * as React from "react"
import { useState } from "react"
import "./homepage.css"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { v4 as uuidV4 } from "uuid"
import Toast, { Toaster } from "react-hot-toast"
import axios from "axios";



export default function Homepage() {
  const location = useLocation();
  const [queryRoom, setqueryRoom] = useSearchParams();
  const navigate = useNavigate();
  const date = new Date();

  const [RoomId, setRoomID] = useState(queryRoom.get('room') || location?.state?.RoomId || '');
  const [username, setUsername] = useState(location?.state?.username || '');

  const [disabled, setDisabled] = useState(false);
  React.useEffect(() => {
    navigate(location.pathname, { replace: true })
  }, [])
  const onSubmit = async e => {
    e.preventDefault();
    if (!username) { Toast.error(`Enter User Name`); return; };
    if (!RoomId) { Toast.error('Enter Room Id'); return; }
    setDisabled(true)
    console.log(RoomId);
    console.log(username);
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
        // console.log(res);
        if (res.data.Exists) {
          navigate(`/room/${RoomId}`, { state: { RoomId, username, role: 'member' } })
        } else {
          Toast.error(res.data.message)
        }
      })
      .catch(error => {
        console.log(error)
        const res = error.response?.data?.message || error.response?.data || error.message
        if (res == 'Not logged in') {
          Toast.error("You Need to Log In First!")
          setTimeout(() => {
            navigate("/Login", { state: { path: '/', RoomId, username } })
          }, 2500)
        }
        else {
          Toast.error(`${res}`)
        }
      }).finally(() => {
        setTimeout(() => { setDisabled(false) }, 1500)
      })
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
      icon: '👏',
    })
  }

  return <><Toaster />
    {/* <div className="Navbar flex">
      <Link to={'/'}>
        <img src="/bglogo-draft.png" className="logo"></img>
      </Link>
      <div className="flex grey">
        <div>
          {date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}
        </div>
        •
        <div>
          {`${date.toLocaleDateString('en-GB', { weekday: 'short' })}, `}
          {`${date.toLocaleDateString('en-GB', { month: 'short' })} `}
          {date.toLocaleDateString('en-GB', { day: 'numeric' })}
        </div>
      </div>
    </div> */}
    {/* <section className="bg-black text-white w-[90vw] ">
      <div className="px-4 py-32 lg:flex  lg:items-center">
        <div className="mx-auto max-w-3xl text-center">
          <h1
            className="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-7xl font-extrabold text-transparent sm:text-5xl"
          >
            Want to Build?
            <span className="sm:block">Collaborate. Interact. Develop. </span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl sm:text-xl/relaxed">
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Nesciunt illo tenetur fuga ducimus
            numquam ea!
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">

            <button className="p-[3px] relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
              <div className="px-10 py-px bg-black rounded-full  relative group transition duration-200 text-white hover:bg-transparent">
                Lit up borders
              </div>
            </button>



          </div>
          <span class="flex items-center block px-100">
            <span class="h-px flex-1 bg-stone-600"></span>
            <span class="shrink-0 px-6">OR</span>
            <span class="h-px flex-1 bg-stone-600"></span>
          </span>
        </div>
      </div>
    </section>
    <section class="bg-gray-900 text-white">
      <div class="mx-auto max-w-screen-xl px-4 py-32 lg:flex lg:h-screen lg:items-center">
        <div class="mx-auto max-w-3xl text-center">
          <h1
            class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-3xl font-extrabold text-transparent sm:text-5xl"
          >
            Understand User Flow.

            <span class="sm:block"> Increase Conversion. </span>
          </h1>

          <p class="mx-auto mt-4 max-w-xl sm:text-xl/relaxed">
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Nesciunt illo tenetur fuga ducimus
            numquam ea!
          </p>

          <div class="mt-8 flex flex-wrap justify-center gap-4">
            <button className="bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-xs font-semibold leading-6  text-white inline-block">
              <span className="absolute inset-0 overflow-hidden rounded-full">
                <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </span>
              <div className="relative flex space-x-2 items-center z-10 rounded-full bg-zinc-950 py-2 px-5 ring-1 ring-white/10 ">
                <span className="text-base">
                  Create Room
                </span>
                <svg
                  fill="none"
                  height="16"
                  viewBox="0 0 24 24"
                  width="16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10.75 8.75L14.25 12L10.75 15.25"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40" />
            </button>
          </div>
        </div>
      </div>
    </section> */}




    <div className="Wrapper bg-gray-900">
      <div>
        <h1 className="Hero">
          Want to Build?
          <span className="rainbow">Collaborate. Interact. Develop. </span>
        </h1>

        {/* <p>
          One Stop Solution for the next Gen Devs!
        </p> */}


        <div className="container">
          <p className="rainbow">Join a Room</p>
          <form className="homeForm">
            <input value={RoomId} onChange={e => { setRoomID(e.target.value) }} placeholder='Enter Room Code' size='md' />
            <input value={username} onChange={e => { setUsername(e.target.value) }} placeholder='USERNAME' size='md' />
            <input type="submit" disabled={disabled} className={`${disabled && 'disabled'} prevent success`} onClick={onSubmit} variant='outline' background={'teal'} value="Join" />
          </form>
        </div>
        <div className="buttonDiv">
          <span className="separator flex grey">
            <div></div>
            Or
            <div></div>
          </span>
        </div>
        <p className="grey">Don't have a Room? &nbsp;
          <Link to="/Create" className="underline link" colorscheme='teal' variant='link'>Create Room</Link>
        </p>
      </div>
    </div>
  </>
}

