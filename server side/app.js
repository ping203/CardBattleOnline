var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var sqlcmd = require('./model/sqlcmd');
var index = require('./routes/index');
var users = require('./routes/users');
var user = require('./model/user');
var room = require('./model/room');
var test = require('./routes/test');
var encrypt = require('./model/encrypt');
var app = express();
var config = require('./model/config');
// var clisent = require("redis")
// , redis = clisent.createClient(config.redis.port, config.redis.host, config.redis.opts);

// //连接错误处理
// redis.on("error", function (error) {
//     console.log(error);
// });


//   redis.set("node_redis_key", JSON.stringify({ "name": "wolfy", age: 28 }), function (error, res) {
//         if (error) {
//             console.log(error);
//         } else {
//             console.log(res);
//         };
//     });


// redis.get("node_redis_key",  function (error, res) {
//       if (error) {
//           console.log(error);
//       } else {
//           console.log(res);
//       };
//       //操作完成，关闭redis连接
//       redis.end(true);

//   });




var http = require('http').Server(app).listen(7777);
var io = require("socket.io")(http);
//var epwd = encrypt.enc('1111');

io.on('connection', function (socket) {
  //这是socket.io 即时通讯

  //登录
  socket.on('login', (msg) => {
    var str = new sqlcmd.Select('user', ['user_pwd']).Where({ user_name: msg.name }).query;
    sqlcmd.Doit(str, (a, b) => {
      console.log(a);
      console.log(b.length);
      if (a === null && b.length !== 0) {
        var pass = b[0].user_pwd;
        var p = encrypt.enc(msg.password);
        if (pass == p) {
          user.userinfo(msg.name, (info) => {
            io.emit('loginBack' + msg.name, { status: true, content: ' ', user: info });
          })

        } else {
          io.emit('loginBack' + msg.name, { status: false, content: '密码不正确', user: msg.name });
        }
      } else {
        io.emit('loginBack' + msg.name, { status: false, content: '请注册！', user: msg.name });
      }
    });
  });
  //注册
  socket.on('regist', (msg) => {
    var select = new sqlcmd.Select('user', ['user_name']).Where({ user_name: msg.name }).query;
    sqlcmd.Doit(select, (a, b) => {
      console.log(a);
      console.log(b);
      if (b[0] != null) {

        io.emit('fail' + msg.name, { status: false, content: '账户已存在.', user: msg.name });
      } else {
        var p = encrypt.enc(msg.pwd);//md5加密
        var insert = sqlcmd.Insert({ user_name: msg.name, user_pwd: p }, 'user');
        sqlcmd.Doit(insert, (a, b) => {
          console.log(a);
          console.log(b);

          if (a == null) {//插入成功
            //   socket.emit('update', { gengxin: 'ture' });
            io.emit('success' + msg.name, { status: true, content: '注册成功!.', user: msg.name });
          }
          else {
            io.emit('fail' + msg.name, { status: false, content: '注册失败!.', user: msg.name });
          }
        });
      }
    });
  });
  socket.on('startGame', (msg) => {
    var rrr = room.findWaitRoom();
    if (rrr.status) {
      console.log('joinroom');
      room.joinRoom(rrr.room.id, msg.user, (back) => {
        console.log(back);
      })
    } else {
      console.log('newroom');
      room.newRoom(msg.user, (back1) => {
        console.log(back1);
      })
    }
  });

});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/index', index);
app.use('/users', users);
app.use('/test', test);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;