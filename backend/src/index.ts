import * as express from 'express';
import * as cors from 'cors';
import * as http from 'http';
import {GetBotMessage,GetBotInfo} from './service/chatbot'
import { Server, Socket } from "socket.io";
import {MessageInterface} from './interface/messageinterfaces'
import * as path from 'path';
const aikotoba = 'seastory'
const port = process.env.PORT || 8000;
const app = express();
app.use(cors());
const server = http.createServer(app);
app.use(express.static(path.join(__dirname, '../../frontend/build')));
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});
let users = [];
io.on('connection',async function (socket : Socket) {
    //接続時
    socket.on('entry',(name:string,avatorType:string)=>{
        users.push({
            id : socket.id,
            name: name,
            avatorType:avatorType
        });
        console.log(`entry:${name}`)
        io.emit('users list',users);
    });
    //時報
    // const date = new Date()
    // const now = date.getTime();
    // const nextHours = date.getHours() + 1;
    // const next = date.setHours(nextHours, 0, 0,0);
    // const diff = next - now;
    // setTimeout(() => {
    //     setInterval(()=>{
    //         const timeBot = GetBotInfo(2);
    //         var hour =date.getHours();
    //         var messageAdviceInTimeMessage = hour>14?'あとちょっとだ！がんばれ！':'ｷﾗﾝ!' 
    //         const timeMessage:MessageInterface={
    //             name:timeBot.name,
    //             avatorType:timeBot.avatorType,
    //             message:`ほら、${now.To}時だぞ！${messageAdviceInTimeMessage}`
    //         };
    //         io.emit('receive',timeMessage);
    //     }, 1000 * 60*60)
    // }, diff);
    //メッセージ受信時
    socket.on('message',async function (payload:MessageInterface) {
        console.log('name:['+payload.name+']icon:['+payload.avatorType+']message:[' + payload.message)+']';
        io.emit('receive',payload);
        //ボっとの返信
        if(payload.message.includes('--')){
            //メッセージ取得
            const bot =GetBotInfo(1); 
            console.log(bot);
            const botMessage =await GetBotMessage(payload.message,bot);
            const returnMessage :MessageInterface= {
                name:bot.name,
                message:botMessage,
                avatorType:bot.avatorType
            };
            io.emit('receive',returnMessage);
        }
    });
    console.log('connected!');
    socket.on('disconnect',()=>{
        users=users.filter(x=>x.id!=socket.id);
        console.log(users);
    });
});
app.use(express.json());
app.post('/easyauth',(req :express.Request,res:express.Response)=>{
    console.log(req.body);
    if(req.body.aikotoba===aikotoba){
        res.json({message: true});
    }
    else{
        res.json({message: false});
    }
});
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname,'../../frontend/build/index.html'));
});
app.get('/', (_, res :express.Response) => res.send(`Server is up`));



server.listen(port,()=>{
    console.log(`ポート:${port}`);
});
