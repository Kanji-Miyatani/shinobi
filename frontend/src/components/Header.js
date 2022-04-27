import React, { useEffect,useRef } from 'react'
import '../style/Header.css';
import logo from '../img/shinobi_logo.png';
import {useSelector} from 'react-redux';
function Header() {
const name = useSelector(state => state.loginInfoReducer.name)
  return (
    <div className="header-container">
        <img className="logo" src={logo}/>
        <div className='header-shinobina'><spna className="shinobina-icon">忍名</spna><span>{name}</span></div>
    </div>
  )
}

export default Header