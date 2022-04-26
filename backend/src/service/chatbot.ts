import axios from 'axios';
import { BotInterface } from '../interface/botInterface';
import { getRandomInt } from './randomCalc';
const getTenki =async  () : Promise<string> =>{
    try{
        const res=await axios.get('https://weather.tsukumijima.net/api/forecast/city/270000');
        const data:string= res.data.description.bodyText;
        return data;
    }catch{
        return '取得できませんでした(´・ω・`)'
    }
    
}
const marinMessages:string[] =['おはよ～','おはよ～','さみしいよ(>_<)','早くお店に来て♡','もう、、夏！？','今日は海モードが激熱！？',
                                '今日はハイビスカスモードが激熱！？','Super Lucky!!','サムに会いたいの！！！',
                                '貫司君？？','長澤君？？','海って楽しいね！！','海って楽しいね！！','海って楽しいね！！','海って楽しいね！！',
                                '海って楽しいね！！','海って楽しいね！！','海って楽しいね！！','海って楽しいね！！','海って楽しいね！！',
                                '海って楽しいね！！','海って楽しいね！！','海って楽しいね！！','海って楽しいね！！','海って楽しいね！！',
                                '海って楽しいね！！','海って楽しいね！！','海って楽しいね！！','海って楽しいね！！','海って楽しいね！！',
                                '海って楽しいね！！','海って楽しいね！！',
                                '海って楽しいね！！','海って楽しいね！！','海って楽しいね！！','ざんね～んww','ざんね～んww','ざんね～んww',
                                'ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww',
                                'ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww',
                                'ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww',
                                'ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww',
                                'ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww',
                                'ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','魚群！！！！！',
                                'ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww',
                                'ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww','ざんね～んww',
                                'ざんね～んww','ざんね～んww','ざんね～んww','やっほ～！','やっほ～！','やっほ～！','やっほ～！','やっほ～！'] ;


const getAnyMessage = (bot:BotInterface):string=>{
    if(bot.code==1){
        var seed = getRandomInt(marinMessages.length-1);
        console.log(marinMessages.length);
        console.log(seed);
        return marinMessages[seed];
    }
};
export const GetBotMessage =async(command:string,bot:BotInterface):Promise<string>=>{
    if(command.includes('天気')||command.includes('tenki')){
        return await getTenki();
    }
    return getAnyMessage(bot);
}

export const GetBotInfo = (code:Number):BotInterface=>{
    let bot:BotInterface = null;
    switch(code){
        case 1:
        bot = {
            code:code,
            name:'マリン',
            avatorType:'marin'
        };
        break;
        case 2:
            bot = {
                code:code,
                name:'時報を言うだけのサム',
                avatorType:'samu'
            };
        break;
    }
    return bot;
}

