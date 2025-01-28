import * as React from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiRoute } from "../../../environment"
import axios from "axios"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "../ui/alert-dialog"

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const [queryRoom, setqueryRoom] = useSearchParams('');

  const [RoomId, setRoomID] = React.useState(queryRoom.get('room') || location?.state?.RoomId || '');


  const [username, setUsername] = React.useState(location?.state?.username || '');
  const [disabled, setDisabled] = React.useState<boolean>(false);
  const [joinError, setJoinError] = React.useState<string>('');
  const [createError, setCreateError] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);

  const [joinDialog, openJoinDialog] = React.useState<boolean>(false);
  const [createDialog, openCreateDialog] = React.useState<boolean>(false);
  const [alertDialog, setAlertDialog] = React.useState<boolean>(false);

  React.useEffect(() => {
    const room = queryRoom.get('room');
    console.log('query=>', room)
    if (room) {
      openJoinDialog(prev => !prev);
      setRoomID(room);
    }
  }, [queryRoom]);

  const closeDialogUtil = () => {
    setUsername('');
    setRoomID('');
    setJoinError('');
    setCreateError('');
  }

  // React.useEffect(() => {
  //   if (!joinDialog) {
  //     closeDialogUtil();
  //   }
  // }, [joinDialog]);
  const createOpenUtil = (roomId, username) => {


  }


  const handleCreate = async e => {
    e.preventDefault();
    if (!username) {
      setCreateError(`Enter User Name`);
      return;
    }
    if (!RoomId) {
      setCreateError('Enter Room Id');
      return;
    }

    console.log(RoomId);
    setDisabled(true)
    // console.log(username);
    let config = {
      method: 'POST',
      url: `${apiRoute}/Room`,
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
          setCreateError(res.data.message)
        } else {
          console.log("Room Created")
          console.log('response1=>', res)
          navigate(`/room/${RoomId}`, { state: { RoomId, username, email: res.data.Email, role: 'owner' } })
        }
      })
      .catch(err => {
        // console.error('err=>', JSON.stringify(err?.response))
        if (err?.response?.data == "Not logged in") {
          setTimeout(() => {
            navigate('/login', { state: { path: '/', RoomId } })
          }, 900)
        }

        err?.response?.data && setCreateError(err?.response.data)
      }).finally(() => {
        setTimeout(() => { setDisabled(false) }, 1500)
      });
  }

  const handleJoin = async e => {
    e.preventDefault();
    setJoinError('')
    if (!RoomId) {
      setJoinError('Enter Room Id');
      return;
    }
    if (!username) {
      setJoinError('Enter User Name');
      return;
    };
    setDisabled(true)
    console.log(RoomId);
    console.log(username);
    var config = {
      method: 'POST',
      url: `${apiRoute}/Room`,
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
          setJoinError(res.data.message);
          if (!res.data.Exists) {
            setTimeout(() => {
              setAlertDialog(prev => !prev)
            }, 600)
          }
        }
      })
      .catch(error => {
        console.log(error)
        const res = error.response?.data?.message || error.response?.data || error.message
        if (res == 'Not logged in') {
          setJoinError('You need to Log in First!');
          setTimeout(() => {
            navigate("/Login", { state: { path: '/', RoomId, username } })
          }, 900)
        }
        else {
          setJoinError(`${res}`)
        }
      }).finally(() => {
        setTimeout(() => { setDisabled(false) }, 1500)
      })
  }
  React.useEffect(() => {
    console.log(joinDialog)

  }, [joinDialog])

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <header className="fixed w-full px-4 lg:px-6 h-14 flex items-center backdrop-blur">
        <Link to="#" className="flex items-center justify-center" >
          <MountainIcon className="h-6 w-6" />
          <span className="sr-only">Acme Collaboration</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link to="#" className="text-sm font-medium hover:underline underline-offset-4" >
            Explore
          </Link>
          <Link to="#" className="text-sm font-medium hover:underline underline-offset-4" >
            About
          </Link>
          <Link to="#" className="text-sm font-medium hover:underline underline-offset-4" >
            Contact
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Collaborate with your whole team, seamlessly.
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Create or join virtual rooms to code, chat, and execute projects together in real-time.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">

                  <Dialog open={joinDialog} onOpenChange={openJoinDialog} >
                    <AlertDialog open={alertDialog} onOpenChange={setAlertDialog}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>`You want to create a new room '{RoomId}' ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Room {RoomId} doesn't exists, want to create one?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={(e) => { handleCreate(e); }}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <DialogTrigger>
                      <Button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 hover:text-primary-foreground/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" variant="outline">Join</Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Join Room</DialogTitle>
                        <DialogDescription>
                          Enter Room Name and Username to join room!
                        </DialogDescription>
                      </DialogHeader>
                      {joinError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{joinError}</div>}
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            Room
                          </Label>
                          <Input
                            id="name"
                            onChange={(e) => { setRoomID(e.target.value) }}
                            value={RoomId}
                            placeholder="Reactjs"
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="username" className="text-right">
                            Username
                          </Label>
                          <Input
                            id="username"
                            onChange={(e) => { setUsername(e.target.value) }}
                            placeholder="@pedro"
                            className="col-span-3"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" onClick={handleJoin} className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-primary px-8 text-sm font-medium shadow-sm text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" disabled={loading}>
                          {loading ? (
                            <div className="flex items-center justify-center">
                              <LoaderIcon className="w-5 h-5 animate-spin" />
                              <span className="ml-2">Creating...</span>
                            </div>
                          ) : (
                            "Join"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Dialog box for Create ROOM */}
                  <Dialog open={createDialog} onOpenChange={openCreateDialog}>
                    <DialogTrigger asChild>
                      <Button className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" variant="outline">Create</Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Create Room</DialogTitle>
                        <DialogDescription>
                          Enter Name and Username to create room!
                        </DialogDescription>
                      </DialogHeader>
                      {createError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{createError}</div>}
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            Room
                          </Label>
                          <Input
                            id="name"
                            value={RoomId}
                            onChange={(e) => { setRoomID(e.target.value) }}
                            placeholder="Reactjs"
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="username" className="text-right">
                            Username
                          </Label>
                          <Input
                            id="username"
                            onChange={(e) => { setUsername(e.target.value) }}
                            placeholder="@pedro"
                            className="col-span-3"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" onClick={handleCreate} className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-primary px-8 text-sm font-medium shadow-sm text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">Create!</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <img
                src="https://www.curiosityquench.com/_next/image?url=https%3A%2F%2Flh3.googleusercontent.com%2Fpw%2FAP1GczNTV486nBxfzYRbsNETqPVqAFhfH9zBypOZpu775N6bvwA8Bq1dJk2ZcW3STY8vCkp0DoCMHmYdtr_GQOtjUJZfVGIqAOb6Q5UybQLXuXkzD21f-LYVtkkXDGENxH9rlj4fnyYfG_AT-V34HmkT5TOt%3Dw945-h968-s-no-gm%3Fauthuser%3D0&w=640&q=75"
                width="550"
                height="550"
                alt="Hero"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-bottom sm:w-full lg:order-last lg:aspect-square"
              />
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 md:flex justify-center  lg:py-32 ">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg text-muted-foreground px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter text-primary-foreground sm:text-5xl">Collaborate with ease</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform provides the tools you need to work together seamlessly, from real-time coding to live
                  chat and code execution.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="grid gap-1">
                <CodeIcon className="w-8 h-8 text-primary-foreground " />
                <h3 className="text-xl font-bold text-primary-foreground">Real-time Coding</h3>
                <p className="text-muted-foreground">
                  Collaborate on code in real-time, with instant updates and version control.
                </p>
              </div>
              <div className="grid gap-1">
                <MessageCircleIcon className="w-8 h-8 text-primary-foreground" />
                <h3 className="text-xl font-bold text-primary-foreground">Live Chat</h3>
                <p className="text-muted-foreground">
                  Communicate with your team through our built-in chat functionality.
                </p>
              </div>
              <div className="grid gap-1">
                <TerminalIcon className="w-8 h-8 text-primary-foreground" />
                <h3 className="text-xl font-bold text-primary-foreground">Code Execution</h3>
                <p className="text-muted-foreground">Run and test your code directly within the platform.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 md:flex justify-center lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Explore</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Join public rooms</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Browse and join public rooms to collaborate with developers around the world.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card className="border-0 rounded-none shadow-none">
                <CardHeader className="flex flex-row items-center p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Avatar className="w-8 h-8 border">
                      <AvatarImage src="/placeholder-user.jpg" alt="@shadcn" />
                      <AvatarFallback>AC</AvatarFallback>
                    </Avatar>
                    React Developers
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Badge variant="secondary">Public</Badge>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full">
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Collaborate on React projects and share best practices.</p>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UsersIcon className="w-4 h-4" />
                    <span>24 members</span>
                  </div>
                  <Link
                    to="#"
                    className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"

                  >
                    Join
                  </Link>
                </CardFooter>
              </Card>
              <Card className="border-0 rounded-none shadow-none">
                <CardHeader className="flex flex-row items-center p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Avatar className="w-8 h-8 border">
                      <AvatarImage src="/placeholder-user.jpg" alt="@shadcn" />
                      <AvatarFallback>AC</AvatarFallback>
                    </Avatar>
                    Python Enthusiasts
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Badge variant="secondary">Public</Badge>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full">
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Discuss Python best practices and work on projects together.</p>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UsersIcon className="w-4 h-4" />
                    <span>18 members</span>
                  </div>
                  <Link
                    to="#"
                    className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    Join
                  </Link>
                </CardFooter>
              </Card>
              <Card className="border-0 rounded-none shadow-none">
                <CardHeader className="flex flex-row items-center p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Avatar className="w-8 h-8 border">
                      <AvatarImage src="/placeholder-user.jpg" alt="@shadcn" />
                      <AvatarFallback>AC</AvatarFallback>
                    </Avatar>
                    JavaScript Coders
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Badge variant="secondary">Public</Badge>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full">
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Discuss the latest JavaScript trends and build projects together.
                  </p>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UsersIcon className="w-4 h-4" />
                    <span>32 members</span>
                  </div>
                  <Link
                    to="#"
                    className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"

                  >
                    Join
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Acme Collaboration. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link to="#" className="text-xs hover:underline underline-offset-4" >
            Terms of Service
          </Link>
          <Link to="#" className="text-xs hover:underline underline-offset-4" >
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}

function CodeIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}


function MessageCircleIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  )
}


function MountainIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  )
}


function PlusIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}


function TerminalIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  )
}


function UsersIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function LoaderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
      <path d="M18 12h4" />
      <path d="m16.2 16.2 2.9 2.9" />
      <path d="M12 18v4" />
      <path d="m4.9 19.1 2.9-2.9" />
      <path d="M2 12h4" />
      <path d="m4.9 4.9 2.9 2.9" />
    </svg>
  );
}
