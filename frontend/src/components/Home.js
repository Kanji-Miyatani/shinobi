import {useSelector} from 'react-redux';
import Header from '../components/Header'
import ChatRoom from '../components/ChatRoom'
import SettingFooter from '../components/SettingFooter'
function Home() {
  
  return (
    <div className="Home" style={{height:'100%'}}>
        <Header/>
        <ChatRoom/>
        {/* <SettingFooter/> */}
    </div>
  )
}

export default Home