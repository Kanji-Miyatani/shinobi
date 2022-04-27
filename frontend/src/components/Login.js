
import '../style/Login.css';
import logo from '../img/shinobi_logo.png';
import AvatorIcon from './AvatorIcon';
import { useState ,useEffect} from 'react'
import DressInput from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import {useNavigate} from 'react-router-dom';
import {useDispatch} from 'react-redux';
import avatorJson from '../settings/avator.json';
import axios from 'axios';
import Header from './Header';
import { padding } from '@mui/system';
import UpdateBlog from './UpdateBlog';

function Login() {
    const [name, setName] = useState('');
    const [avatorTypeKey , setAvatorTypeKey] = useState(1);
    const [backGroundImage , setBackGroundImage] = useState();
    const [avatorType , setAvatorType] = useState('shinobi');
    const [aikotoba , setAikotoba] = useState('');
    //モーダル関連
    const [open, setOpen] = useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const modalstyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        border: '2px solid #000',
        boxShadow: 24,
        p: 4,
      };

    const navigation = useNavigate();
    const dispatch = useDispatch();
      //ファイルの変更時
    function onFileChange(e){
        const files = e.target.files
        if(files.length > 0) {
            var file = files[0]
            var reader = new FileReader()
            reader.onload = (e) => {
                setBackGroundImage( e.target.result)
            };
            
            reader.readAsDataURL(file)
    
        } else {
            setBackGroundImage(null);
        }
    
    }
    //アバターの参照svgを変更
    const ChangeAvatorType = ()=>{
        const nextAvaorTypeKey =avatorTypeKey % avatorJson.avotors.length +1;
        const avater= avatorJson.avotors.find(x=>x.key==nextAvaorTypeKey);
        const avatorType= avater.type;
        setAvatorTypeKey(nextAvaorTypeKey);
        setAvatorType(avatorType);
    }
    console.log(avatorType);
    //入室
    const Entry = ()=>{
        if(!name || !avatorType){
            return;
        }
        //ストアに入室情報を送信
        dispatch({
            type:"SET_LOGININFO",
            payload:{
                name:name,
                avatarType:avatorType,
                backGroundImage:backGroundImage
            }
        })
        //モーダルを開く
        handleOpen();
    };
    //合言葉送信
    const SubmitAikotoba=()=>{
        const params = new URLSearchParams();
        params.append('aikotoba', aikotoba);
        console.log('submit');
        console.log('submit');
        axios.post('/easyauth', params)
            .then(function (res) {
                dispatch({
                    type:'SET_AUTHSTATE',
                    payload:{
                        auth:res.data.auth
                    }
                })
               navigation('/home');
            })
            .catch(function (error) {
                console.log("error", error);
            });
    };
  return (
    <div className="Login">
    <Header/>
    <div className="login-body">
      <header className="Login-header">
          <div className="main-logo-container">
            <h2> 30周年突破記念！！</h2>
            <h2> </h2>
          </div>
        <button type="button" className="avator-button" onClick={()=>{ChangeAvatorType()}} >
         <AvatorIcon avatorType={avatorType} height='20vmin' />
        </button>
        <DressInput id="outlined-basic" variant="filled" maxLength="9" label="忍名" className="input--" type="text" onChange={e => setName(e.target.value)} />
        <div className="file-input-container">
            <label for="file_upload">
                {
                    backGroundImage ? <span style={{color:'green',paddingRight:'5px'}}>✓</span>:null
                }
                背景選択
               <input type="file" id="file_upload" className="input--" onInput={(e)=>{onFileChange(e)}} />
            </label>
        </div>
        <Button variant="contained" color="success" type="button" onClick={()=>{Entry();}}>入室</Button>
      </header>
      {/* ▼modal */}
      <div>
        <Modal
          open={open}
          onClose={handleClose}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box style={modalstyle}>
            <Typography id="modal-modal-title" variant="h6" component="h2">
              合言葉を入力だ！馬鹿野郎！
            </Typography>
            <DressInput id="outlined-basic" variant="filled" label="合言葉" className="input--" type="text" onChange={e => setAikotoba(e.target.value)} />
            <Button variant="contained" color="success" type="button" onClick={()=>{SubmitAikotoba();}}>入室</Button>
          </Box>
        </Modal>
      </div>
       {/* ▲modal */}
       <UpdateBlog/>
       </div>
    </div>
  );
}

export default Login;
