// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const ipc = require('electron').ipcRenderer


let evclicktime = 0;


//专家名单
let pro_excel = document.querySelector("#pro_excel");
if(pro_excel != null) {
    pro_excel.onclick = function(e) {
        let now  = new Date();
        if(now - evclicktime < 1000) {
            return;
        }
        evclicktime = now;
        console.log(now);

        ipc.send("genpro", "pro_excel");
    }
}

//更新专家列表
ipc.on('genpro', (ev, args) => {
    console.log('ipc.on genpro');
    console.log(args);
    //console.log(args.return);
    if(args.return) {
        console.log(args.return);
        var obj = args.return;
        var table = $('#t1').data('table');
        if(table) {
            table.deleteItem(1, (val)=>{return true;});
            table.data=obj;
            table._createItemsFromJSON(table.data);
            table.currentPage=1;
            table.resetView();
            console.log("table load data");
        }
    }
    if(args.filter) {
        let filter = args.filter
        let genpro_chk_out = document.querySelector("#genpro_chk_out");
        let genpro_chk_in = document.querySelector("#genpro_chk_in");
        console.log("filter", filter)
        if(filter == 0) {
            genpro_chk_in.checked = false;
            genpro_chk_out.checked = false;
        } else if(filter == 1) {
            genpro_chk_in.checked = true;
            genpro_chk_out.checked = false;
        } else if(filter == 2) {
            genpro_chk_in.checked = false;
            genpro_chk_out.checked = true;
        } else {
            genpro_chk_in.checked = true;
            genpro_chk_out.checked = true;
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

        ipc.send('genpro', 'phd_excel');
    }
}

//剔除博士导师
let genpro_chk_out = document.querySelector("#genpro_chk_out");
let genpro_chk_in = document.querySelector("#genpro_chk_in");
if(genpro_chk_in && genpro_chk_out) {
    genpro_chk_out.onchange=
    genpro_chk_in.onchange = function() {
        var arg = 0;
        if(genpro_chk_in.checked && genpro_chk_out.checked) {
            arg= 3;
        } else if(genpro_chk_in.checked && !genpro_chk_out.checked) {
            arg = 1;
        } else if(!genpro_chk_in.checked && genpro_chk_out.checked) {
            arg = 2;
        }
        console.log('genpro chk:', arg);
        ipc.send('genpro', 'filter'+arg);
    }

}

//导出专家列表
let dump_excel = document.querySelector("#dump_excel");
if(dump_excel) {
    dump_excel.onclick=function(e) {
        let now  = new Date();
        if(now - evclicktime < 1000) {
            return;
        }
        evclicktime = now;

        ipc.send("genpro", "dump_excel");

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
setTimeout(() => {
    ipc.send("genpro", "status");
}, 100);
