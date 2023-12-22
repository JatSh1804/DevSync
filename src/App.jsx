import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './Pages/homepage';
import Editorpage from "./Pages/Editorpage.jsx"
import { Toaster } from 'react-hot-toast';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Homepage />}></Route>
        <Route path='/room/:RoomId' element={<Editorpage />} />
        <Route path='/Login'></Route>
        <Route path='/Account'></Route>
      </Routes>

    </BrowserRouter>
  )
}


