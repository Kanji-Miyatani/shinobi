"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var cors = require("cors");
var http = require("http");
var chatbot_1 = require("./service/chatbot");
var socket_io_1 = require("socket.io");
var path = require("path");
var aikotoba = 'seastory';
var port = process.env.PORT || 8000;
var app = express();
app.use(cors());
var server = http.createServer(app);
app.use(express.static(path.join(__dirname, '../../frontend/build')));
var io = new socket_io_1.Server(server, {
    cors: {
        origin: '*'
    }
});
var users = [];
io.on('connection', function (socket) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            //接続時
            socket.on('entry', function (user) {
                users.push({
                    id: socket.id,
                    name: user.name,
                    avatorType: user.avatorType
                });
                console.log('userso');
                console.log(users);
                io.emit('users list', users);
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
            socket.on('message', function (payload) {
                return __awaiter(this, void 0, void 0, function () {
                    var bot, botMessage, returnMessage;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                console.log('name:[' + payload.name + ']icon:[' + payload.avatorType + ']message:[' + payload.message) + ']';
                                io.emit('receive', payload);
                                if (!payload.message.includes('--')) return [3 /*break*/, 2];
                                bot = (0, chatbot_1.GetBotInfo)(1);
                                console.log(bot);
                                return [4 /*yield*/, (0, chatbot_1.GetBotMessage)(payload.message, bot)];
                            case 1:
                                botMessage = _a.sent();
                                returnMessage = {
                                    name: bot.name,
                                    message: botMessage,
                                    avatorType: bot.avatorType
                                };
                                io.emit('receive', returnMessage);
                                _a.label = 2;
                            case 2: return [2 /*return*/];
                        }
                    });
                });
            });
            console.log('connected!');
            socket.on('disconnect', function () {
                users = users.filter(function (x) { return x.id != socket.id; });
                io.emit('users list', users);
            });
            return [2 /*return*/];
        });
    });
});
app.use(express.json());
app.post('/easyauth', function (req, res) {
    console.log(req.body);
    if (req.body.aikotoba === aikotoba) {
        res.json({ message: true });
    }
    else {
        res.json({ message: false });
    }
});
app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
});
app.get('/', function (_, res) { return res.send("Server is up"); });
server.listen(port, function () {
    console.log("\u30DD\u30FC\u30C8:".concat(port));
});
//# sourceMappingURL=index.js.map