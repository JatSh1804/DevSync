import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { apiRoute } from "../../../environment"
import axios from "axios"

export function Signup() {
  const location = useLocation();
  const [Username, setUsername] = React.useState('');
  const [Password, setPassword] = React.useState('');
  const [ConfirmPass, setConfirmPass] = React.useState('');
  const [Email, setEmail] = React.useState('');
  const [disabled, setDisabled] = React.useState<boolean | null>(false)
  const [loading, setLoading] = React.useState<boolean | null>(false)
  const [error, setError] = React.useState<String | boolean | null>("")

  const navigate = useNavigate();

  // React.useEffect(() => {
  //   if (Password !== ConfirmPass) {
  //     // setError("Passwords should match!");
  //     setDisabled(true);
  //     return;
  //   }
  //   setDisabled(false)
  // }, [ConfirmPass]);


  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      if (!Username || !Email || !Password) {
        setError("All fields are required");
        return;
      }
      if (Password !== ConfirmPass) {
        setError("Passwords should match!");
        return;
      }
      setError("");
      setLoading(true);
      let config = {
        method: 'post',
        url: `${apiRoute}/Signup`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: { Email, Username, Password: ConfirmPass }
      };
      const res = await axios(config)
      if (res.status == 200 || res.data.message == 'Profile Created Successfully!') {
        setLoading(false);
        navigate("/")
      }

    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Sign Up</CardTitle>
        <CardDescription>Enter your details below to create a new account</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="John Doe" value={Username} onChange={(e) => { setUsername(e.target.value) }} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={Email} onChange={(e) => { setEmail(e.target.value) }} placeholder="m@example.com" required />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input id="password" type="text" value={Password} onChange={(e) => { setPassword(e.target.value) }} required />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="confirm-password" >Confirm Password</Label>
            </div>
            <Input id="confirm-password" type="password" value={ConfirmPass} onChange={(e) => { setConfirmPass(e.target.value) }} required />
          </div>
          <Button type="submit" className="w-full" disabled={disabled || loading} onClick={handleSignUp}>
            {loading ? (
              <div className="flex items-center justify-center">
                <LoaderIcon className="w-5 h-5 animate-spin" />
                <span className="ml-2">Signing Up...</span>
              </div>
            ) : (
              "Sign Up"
            )}
          </Button>
        </div>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link to="/login" className="underline" >
            Login
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function LoaderIcon(props) {
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
  )
}
