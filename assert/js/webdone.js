let ws

// 专家名称 （real）
let my_name

// 专家登录名称
let my_login_name

function update_pro_name() {
    var cookie = document.cookie;
    var ca = cookie.split(';');
    //console.log(cookie);
    ca.forEach((it) => {
        var item = it.trimLeft();
        if (item.indexOf('pro_name=') == 0) {
            //console.log()
            my_name = decodeURIComponent(item.substr(9));
        } else if (item.indexOf('user_name=') == 0) {
            my_login_name = decodeURIComponent(item.substr(10));
        }
    });
}

function refresh_data() {
    var req={}


    //获取信息
    update_pro_name();

    req.method='votingman';
    req.done = 1;
    req.pro_name = my_name;
    req.user_name = my_login_name;
    //console.log(req)


    $('#voting_pro_name').text(my_login_name);


    ws.send(JSON.stringify(req))

    setTimeout(() => {
        refresh_data();
    }, 5000);
}

$( ()=>{
    // 启动 连接websocket
    var url = "ws://" + window.location.hostname + ":15679";
    ws = new WebSocket(url);
    ws.onopen =function(ev){
        refresh_data();
    };

    ws.onmessage = (ev)=>{
        //console.log(ev.data)
        ret = JSON.parse(ev.data)
        if(ret == null) {
            return;
        }

        if (ret.type !== undefined && ret.type == 'error') {
            // popup error message
            var notify = Metro.notify;
            var msg = ret.error;
            if(!msg) msg = "未知错误";
            notify.create(msg, "发生错误", {
                cls:'alert',
                animation: 'easeInSine',
                duration:500,
                keepOpen: true
            });
        } else {
            // 更新状态
            var vote_yes = 0;
            var vote_no = 0;
            var vote_remain = 0;
            ret.result.forEach((phd)=>{
                if (phd.vote == 1) {
                    vote_yes += 1;
                } else if (phd.vote == 2) {
                    vote_no += 1;
                } else {
                    vote_remain += 1;
                }
            });
            $('div.dialog-title').text(`${my_login_name} 完成投票`);
            var h4 = $('div.dialog-content h4.fg-green');
            h4.text(`${vote_yes} 票赞成`);
            h4 = $('div.dialog-content h4.fg-red');
            h4.text(`${vote_no} 票反对`);
            h4 = $('div.dialog-content h4.fg-orange');
            h4.text(`${vote_remain} 票剩余`);
            //obj.appendTo(content);
            //obj = $('h4');
            //obj.addClass('fg-red').text(`${vote_no} 票反对`);
            //obj.appendTo(content);
            //obj = $('h4');
            //obj.addClass('fg-orange').text(`${vote_remain} 票剩余`);
            //obj.appendTo(content);
        }

    };

} );
