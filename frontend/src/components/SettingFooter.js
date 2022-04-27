import React,{useState} from 'react';
import '../style/SettingFooter.css'

function SettingFooter({height}) {
    const [flagShowFooter,setFlagShowFooter]= useState(true);
    const thisOnbulr=()=>{
      setFlagShowFooter(false);
    };
  return (
    <div className="fotter-container" onBlur={()=>{thisOnbulr()}} style={flagShowFooter?null:{opacity:0}}>SettingFooter</div>
  )
}

export default SettingFooter