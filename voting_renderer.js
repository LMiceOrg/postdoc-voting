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
        if(obj) {
            console.log(args)
            obj.data.forEach((item, idx)=>{
                item[1] = '专家' + (idx+1);
            })

            $("#voting_start .badge-top").text("本次会议指标数：" + args.max_pro_num);
        }
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

        Metro.dialog.create({
            title: "设置本次会议指标数",
            content: `<div class="mt-2">
            <input id="max_pro_num"
            data-role="materialinput"
            data-label="本次会议指标数"
            data-informer="每位专家最大推荐名额"  type="text" data-cls-input="text-bold bg-white fg-black"
            data-icon="<span class='mif-list'></span>"
            data-cls-line="bg-cyan"
       data-cls-label="fg-cyan"
       data-cls-informer="fg-lightCyan"
       data-cls-icon="fg-darkCyan"
       ></form>`,
            closeButton: true,
            actions: [
                {
                    caption: "同意",
                    cls: "js-dialog-close alert",
                    onclick: function(){
                        const max_pro_num = parseInt( $("#max_pro_num")[0].value )
                        if(isNaN(max_pro_num)) {
                            alert('本次会议指标数,请输入数字');
                        } else {
                            $("#voting_start .badge-top").text("本次会议指标数：" + max_pro_num);
                            ipc.send(method, 'voting1_' + max_pro_num);
                        }
                    }
                },
                {
                    caption: "取消",
                    cls: "js-dialog-close",
                    onclick: function(){
                        // do nothing
                    }
                }
            ]
        });

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

        // 用户填写信息
        Metro.dialog.create({
            title: "设置本次博士后项目评选信息",
            content: `<div class="mt-2 w-100">
            <div class="row d-flex w-100">
                <div class="cell-3">
                    <span class="caption">会议批次</span>
                </div>
                <div class="cell-9">
                    <input id="pici"
                    data-role="materialinput"
                    data-informer="本次博雅博士后项目的批次"  type="text" data-cls-input="text-bold bg-white fg-black"
                    data-icon="<span class='mif-done-all'></span>"
                    data-cls-line="bg-cyan"
                    data-cls-label="fg-cyan"
                    data-cls-informer="fg-lightCyan"
                    data-cls-icon="fg-darkCyan">
                </div>
            </div>
            <div class="row d-flex">
                <div class="cell-3">
                    <span class="caption">年内总批次</span>
                </div>
                <div class="cell-9">
                    <input id="zongpici"
                    data-role="materialinput"
                    data-informer="今年内博雅博士后项目投票的总批次"  type="text" data-cls-input="text-bold bg-white fg-black"
                    data-icon="<span class='mif-done-all'></span>"
                    data-cls-line="bg-cyan"
                    data-cls-label="fg-cyan"
                    data-cls-informer="fg-lightCyan"
                    data-cls-icon="fg-darkCyan">
                </div>
            </div>
            <div class="row d-flex">
                <div class="cell-6">
                    <span class="caption">公示起始日期</span><input id="anno_from" type="text" data-role="calendar-picker" data-use-now="true" data-null-value="false">
                </div>
                <div class="cell-6">
                <span class="caption">公示结束日期</span><input id="anno_to" type="text" data-role="calendar-picker" data-use-now="true" data-null-value="false">
                </div>
            </div>
  </div>`,
            closeButton: true,
            actions: [
                {
                    caption: "确定",
                    cls: "js-dialog-close primary",
                    onclick: function(){
                        //alert(METRO_LOCALE);
                        //const max_pro_num = parseInt( $("#max_pro_num")[0].value )
                        //if(isNaN(max_pro_num)) {
                            //alert('本次会议指标数,请输入数字');
                        //} else {
                            //$("#voting_start .badge-top").text("本次会议指标数：" + max_pro_num);
                            //ipc.send(method, 'voting1_' + max_pro_num);
                        //}
                        const pici = $('#pici')[0].value | 0;
                        const zongpici = $('#zongpici')[0].value | 0;
                        const anno_from = $('#anno_from')[0].value;
                        const anno_to = $('#anno_to')[0].value;
                        //console.log( $('#anno_to')[0].value )
                        ipc.send(method, `result:{"pici":${pici},
                            "zongpici":${zongpici},
                            "anno_from":"${anno_from}",
                            "anno_to":"${anno_to}"
                        }`);
                    }
                },
                {
                    caption: "取消",
                    cls: "js-dialog-close",
                    onclick: function(){
                        // do nothing
                    }
                }
            ]
        });



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