import * as React from "react";
import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Link, useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import '../../index.css'
import { apiRoute } from '../../../environment'


export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const [Email, setEmail] = useState<string>("");
  const [Password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");


  const handleLogin = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    let config = {
      method: 'post',
      url: `${apiRoute}/Login`,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: { Email, Password }
    };

    try {
      const res = await axios(config);
      if (res.status == 200 && res.data.message == 'Authentication successful') {
        setTimeout(() => {
          navigate(`${location.state?.RoomId ? `/home?room=${location.state.RoomId}` : '/home'}`, { state: location.state })
        }, 200)
      }
      console.log(res);
      // Toast.success(res.data.message)
      console.log("Login successful!");
    } catch (err: any) {
      console.error(err?.response?.data?.message);
      setError(err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="m-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Log In</CardTitle>
        <CardDescription>Enter your details below to Login</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Username</Label>
            <Input id="Username" type="text" onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value) }} placeholder="m@example.com" required />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input id="password" type="password" onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value) }} required />
          </div>
          <Button type="button" className="w-full" disabled={loading} onClick={handleLogin}>
            {loading ? (
              <div className="flex items-center justify-center">
                <LoaderIcon className="w-5 h-5 animate-spin" />
                <span className="ml-2">Logging In...</span>
              </div>
            ) : (
              "Login"
            )}
          </Button>

        </div>
        <div className="mt-4 text-center text-sm">
          Don't have an account?{" "}
          <Link to={'/Signup'} className="underline">Signup</Link>

        </div>
      </CardContent>
    </Card>
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