import io from 'socket.io-client';
import { useState ,useEffect,useRef} from 'react';
import { useSelector } from 'react-redux';
import DressInput from '@mui/material/TextField';
import AvatarIcon from '../components/AvatorIcon';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Checkbox from '@mui/material/Checkbox';
import Avatar from '@mui/material/Avatar';
import store from '../store/store.js';
import '../style/ChatRoom.css'
function ChatRoom() {
    const [messageList,setMessageList] = useState([]);
    const [message, setMessage] = useState('');
    const [flagShowChat, setFlagShowChat] = useState(false);
    const socketref = useRef();
    function thisfocus(){
        setFlagShowChat(true);
    };
    function thisblur(){
        setFlagShowChat(false);
    };
    //送信イベント
    function submitEvent(e){
        e.preventDefault();
      if (socketref !== undefined){
        //ソケットを通してset_nameイベントを発火する
        const avator = store.getState().loginInfoReducer.avatorType;
        const name = store.getState().loginInfoReducer.name;
        socketref.current.emit('message',{avatorType:avator,name:name,message:message});
        document.getElementById('message').value='';
        setMessage('');
      }
    };
    useEffect(()=>{
        socketref.current=io();
        socketref.current.on('receive',(msg)=>{
            console.log('receive');
            const {message,name,avatorType} = msg;
                setMessageList(list=>[...list, {
                    name:name,
                    message:message,
                    avatorType:avatorType
                }]);
        });
        return ()=>{socketref.current.disconnect()};
    },[]);
 
  return (
    <div className="ChatRoom" onBlur={()=>{thisblur()}} onFocus={()=>{thisfocus()}} style={flagShowChat?{opacity:'1.0'}:{opacity:'0.25'}}>
      <header className="ChatRoom-header" id="Chat-DispArea">
       <List dense sx={{ width: '100%', bgcolor:'rgba(255, 255, 255, 0.1)' }}>
      {messageList.slice(messageList.length-13<0?0:messageList.length-13).map((value,id) => {
        const labelId = `checkbox-list-secondary-label-${value}`;
        return (
          <ListItem
            key={id}>
            <ListItemAvatar>
             <AvatarIcon avatorType={value.avatorType} height="36px" />
            </ListItemAvatar>
            <ListItemText id={labelId} primary={`${value.name} > ${value.message}`}  />
          </ListItem>
        );
      })}
    </List>
    </header>
    <form onSubmit={(e)=>{submitEvent(e);}} autoComplete="off">
        <DressInput label="" variant="standard" className="input--" autoComplete="off" id="message" type="text" onChange={e => setMessage(e.target.value)} />
        <Button variant="outlined" type="submit">送信
        </Button>
    </form>
    </div>
  );
}

export default ChatRoom;
