const ipc = require('electron').ipcRenderer

ipc.on("app-quit", (event, arg) =>{
    if(arg != "yes") return;

    ipc.send("app-quit", 'confirm');
});

ipc.on('host_ip', (ev, arg) =>{
    var obj = $('#pro_url');
    //console.log(arg);
    if(obj.length == 1) {
        //console.log(obj, arg)
        obj[0].value ='http://' + arg.return+ ':15678';
        //obj.disabled();
    }
});



setTimeout( () => {
    ipc.send('app-quit','check');
    ipc.send('host_ip','host_ip');
    },
    1000
);
setTimeout(()=>{
    ipc.send('status', 'renew');

    let obj = document.querySelector('#get_host_ip')
    if(obj) {
        obj.onclick= function(){
            ipc.send('host_ip','host_ip');
        }
    }

}, 100);
