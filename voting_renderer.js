// This file is required by the voting.html
const ipc = require('electron').ipcRenderer


let evclicktime = 0;
let method="votingman";


//专家名单
let pro_excel = document.querySelector("#pro_excel");
if(pro_excel != null) {
    pro_excel.onclick = function(e) {
        let now  = new Date();
        if(now - evclicktime < 1000) {
            return;
        }
        evclicktime = now;
        //console.log(now);

        ipc.send(method, "pro_excel");
    }
}

//更新专家列表
ipc.on(method, (ev, args) => {
    //console.log(args);
    //console.log(args.return);
    if(args.type == 'error') {
        var notify = Metro.notify;
        var msg = args.error;
        if(!msg) msg = "未知错误";
        notify.create(msg, "发生错误", {
            cls:'alert',
            animation: 'easeInSine',
            duration:500,
            keepOpen: true
        });
    }
    if(args.result) {
        //console.log(args.result);
        var obj = args.result;
        var table = $('#t1').data('table');
        if(table) {
            table.deleteItem(1, (val)=>{return true;});
            table.data=obj;
            table._createItemsFromJSON(table.data);
            table.currentPage=1;
            table.reload();
            //console.log("table load data");
        }
    }

    if(args.pro_file) {
        let name = args.pro_file
        let obj = document.querySelector("#pro_file");
        obj.innerHTML = name;
    }

    if(args.phd_file) {
        let name = args.phd_file
        let obj = document.querySelector("#phd_file");
        obj.innerHTML = name;
    }
});


//博士后名单
let phd_excel = document.querySelector("#phd_excel");
if(phd_excel) {
    phd_excel.onclick=function(e) {
        let now = new Date();
        if(now -evclicktime < 1000) {
            return;
        }
        evclicktime = now;

        ipc.send(method, 'phd_excel');
    }
}

// 开始投票
let voting_start = document.querySelector("#voting_start");
if(voting_start) {
    voting_start.onclick=function(e) {
        let now = new Date();
        if(now -evclicktime < 1000) {
            return;
        }
        evclicktime = now;

        ipc.send(method, 'voting1');
    }
}

// 停止投票
let voting_stop = document.querySelector("#voting_stop");
if(voting_stop) {
    voting_stop.onclick=function(e) {
        let now = new Date();
        if(now -evclicktime < 1000) {
            return;
        }
        evclicktime = now;

        ipc.send(method, 'voting2');
    }
}


//生成投票结果
let voting_result = document.querySelector("#voting_result");
if(voting_result) {
    voting_result.onclick=function(e) {
        let now  = new Date();
        if(now - evclicktime < 1000) {
            return;
        }
        evclicktime = now;

        ipc.send(method, "result");

    }
}

//向专家发送消息
let pro_msg_button = document.querySelector("#pro_msg_button");
if(pro_msg_button) {
    pro_msg_button.onclick = function(e) {
        let now  = new Date();
        if(now - evclicktime < 1000) {
            return;
        }
        evclicktime = now;

        let msg = $('input[name="pro_msg"]')[0].value;

        $('#msgdlg').data('infobox').close();
    }
}


// 刷新状态
let voting_logo = document.querySelector("#voting_logo");
if(voting_logo) {
    voting_logo.onclick=function(e) {
        let now = new Date();
        if(now - evclicktime < 1000) {
            return;
        }
        evclicktime = now;
        ipc.send('status', 'renew');
    }
}

ipc.on("status", (ev, arg)=>{
    if(arg == "closed") {
        ipc.send('status', 'renew');
    }
})

function update_voting() {
    ipc.send(method, "status");
    setTimeout(update_voting, 5000);
}

setTimeout(() => {
    update_voting();
}, 100);