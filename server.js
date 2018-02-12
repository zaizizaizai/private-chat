const 
    fs   = require('fs'),
    url  = require('url'),
    path = require('path'),
    http = require('http'),

    hostname = '127.0.0.1',
    port = 3000;

//暂存聊天页面
var defaultPage = ['index.html','default.html','index.htm','default.htm'];

/**
 * .argv [2] 得到IP，argv[3]得到端口
 * path.join组合路径
 * path.resolve相当于cd
 */
// 从命令行参数获取root目录，默认是当前目录:
var fsRoot = path.join(path.resolve(process.argv[2] || '.'),'/www');

const server = http.createServer((req,res) => {
    //获取URL的path
    var pathName = url.parse(req.url).pathname;

    //获取对应本地文件路径
    var filePath = path.join(fsRoot, pathName);

    //默认首页index.html
    if(pathName == '/') {
        for(var i = 0; i < defaultPage.length; i++) {
            //聊天页面路径
            tempFilePath = path.join(filePath, '/' + defaultPage[i]);
            //统计文本信息
            var stats = fs.statSync(tempFilePath);
            //tempFilePath不为空
            if(stats.isFile()) {
                filePath = tempFilePath;
                console.log('default page: ' + filePath);
                break;
            }
        }
    }

    fs.stat(filePath, (err,stats) => {
        if(!err && stats.isFile()) {
            //file存在
            console.log(req.method + ' 200 ' + req.url);
            res.statusCode = 200;
            //pip将消息拼接到res中
            fs.createReadStream(filePath).pipe(res);
        } else {
            console.log(req.method + ' 404 ' + req.url);
            res.statusCode = 404;
            res.setHeader('Content-type', 'text/plain');
            res.end('404 Not Found');
        }
    });
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

const io = require('socket.io')(server);

//JSON.stringify();
var uSocket = {},
    user = [];  //保存在线用户

io.on('connection', (socket) => {
    //成员对象数组    
    socket.on('new user', (username) => {
        //当新接入用户(用户名不在uSocket里)
        if(!(username in uSocket)) {
			socket.username = username;
			uSocket[username] = socket;
			user.push(username);
			socket.emit('login',user);
			socket.broadcast.emit('user joined',username,(user.length-1));
			console.log(user);
		}
	});

    socket.on('send private message', function(res){
        //发消息
        console.log(res);
        if(res.recipient in uSocket) {
            uSocket[res.recipient].emit('receive private message', res);
        }
    });

    socket.on('disconnect', function(){
        //断开连接
        if(socket.username in uSocket) {
            delete(uSocket[socket.username]);
            user.splice(user.indexOf(socket.username), 1);
        }
        console.log(user);
        socket.broadcast.emit('user left',socket.username);
    });
});