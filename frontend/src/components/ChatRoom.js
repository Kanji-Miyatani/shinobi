import io from 'socket.io-client';
import { useState ,useEffect,useRef} from 'react';
import { useSelector } from 'react-redux';
import DressInput from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import AvatarIcon from '../components/AvatorIcon';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Checkbox from '@mui/material/Checkbox';
import Avatar from '@mui/material/Avatar';
import store from '../store/store.js';
import AvatorIcon from './AvatorIcon';
import '../style/ChatRoom.css'
function ChatRoom() {
    const [messageList,setMessageList] = useState([]);
    const [message, setMessage] = useState('');
    const [users, setUsers] = useState([]);
    const [transparent, setTransparent] = useState(0.9);
    const [flagShowChat, setFlagShowChat] = useState(false);
    const socketref = useRef();
    const handleChange = (event, newValue) => {
      if(newValue<10)newValue=10; 
      setTransparent(newValue*0.01);
    };
    function thisfocus(){
        document.getElementById('message').focus();
        setFlagShowChat(true);
    };
    console.log('users');
    console.log(users);
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
        socketref.current.emit('entry', {
          name:store.getState().loginInfoReducer.name,
          avatorType:store.getState().loginInfoReducer.avatorType,
        });
        //ユーザー取得
        socketref.current.on('users list',(users)=>{
            setUsers(users);
        })
        //メッセージ取得
        socketref.current.on('receive',(msg)=>{
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
    <div className="ChatRoom" 
    onBlur={()=>{thisblur()}}
    onFocus={()=>{thisfocus()}} 
    onClick={()=>{if(!flagShowChat){
      thisfocus()
    }}} style={flagShowChat?{opacity:transparent}:{opacity:'0.18'}}>
       <div className="avators-row">
        {
            users.map((user,id)=>{
              console.log('user rendering...');
              return(
              <div>
                {user.name}
              </div>)
            })
          }
      </div>
      <header className="ChatRoom-header" id="Chat-DispArea">
       <List dense sx={{ width: '100%', bgcolor:'rgba(255, 255, 255, 0.15)' }}>
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
         
         <FormControl sx={{ m: 1, width: '70%' }}  variant="standard">
           <DressInput label="" variant="standard" className="input--" autoComplete="off" id="message" type="text" onChange={e => setMessage(e.target.value)} /> 
         </FormControl>
         <FormControl sx={{ m: 1, width: '15%' }}  variant="standard">
          <Button variant="outlined" type="submit">送信
          </Button>
         </FormControl>
         <FormControl sx={{ m: 1, width: '55%' }}  variant="standard">
          <Slider
            size="small"
            defaultValue={70}
            aria-label="Small"
            valueLabelDisplay="auto"
            onChange={handleChange}
            />
            </FormControl>
    </form>
    </div>
  );
}

export default ChatRoom;
