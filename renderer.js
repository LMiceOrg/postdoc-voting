// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const path=require('path')
var subprocess = require('child_process').spawn;
var ctx = document.getElementById("context");
let script = path.join(__dirname, 'dist', 'hello', 'hello')
py=subprocess(script);

setTimeout(function(){
    py.stdin.write( ' 2 hello 何思远 \n 你好 何思齐 \n');
    py.stdin.end();
    }, 2000);


py.stdout.on("data", function(chunk) {
    var text = chunk.toString("utf-8");
    console.log(text)

    ctx.innerHTML= '<h3>'+text+"</h3>";
});
py.on('exit', (code) => {
    console.log("Process quit with code : " + code);
    ctx.innerHTML =ctx.innerHTML+ "<br>return " + code +"";
});
