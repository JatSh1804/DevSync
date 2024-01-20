import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './Pages/homepage';
import Editorpage from "./Pages/Editorpage.jsx"
import LoginPage from './Pages/Login.jsx';
import SignupPage from "./Pages/Signup.jsx";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Homepage />}></Route>
        <Route path='/room/:RoomId' element={<Editorpage />} />
        <Route path='/Login' element={<LoginPage />}></Route>
        <Route path='/Signup' element={<SignupPage />}></Route>
        <Route path='/Account'></Route>
      </Routes>
    </BrowserRouter>
  )
}


