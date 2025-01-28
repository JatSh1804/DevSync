import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Homepage from './Pages/homepage';
import Editorpage from "./Pages/Editorpage"
import CreatePage from './Pages/CreatePage';
import Login from './components/component/Login';

import './index.css'
import { Signup } from './components/component/signup';
import AuthRoute from './lib/auth-route';
import Home from './components/component/home';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Navigate to={'/home'}></Navigate>}></Route>
        <Route path='/room/:RoomId' element={<Editorpage />} />
        <Route path='/Login' element={<AuthRoute><Login /></AuthRoute>}></Route>
        <Route path='/Signup' element={<AuthRoute><Signup /></AuthRoute>}></Route>
        <Route path='/Account'></Route>
        <Route path='/Create' element={<CreatePage />}></Route>
        <Route path='/Home' element={<Home />}></Route>
      </Routes>
    </BrowserRouter>
  )
}


