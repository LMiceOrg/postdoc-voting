let ws

let pro_chart
let pro_chart_data

let phd_chart
let phd_chart_data

let pro_table_data
let phd_table_data

let phd_voting_data

let my_name

function refresh_data() {
    var req={}
    req.method='votingman'

    var uri = window.location.href;
    if( uri.indexOf('voting') >= 0) {
        req.voting = 1;
    } else if(uri.indexOf('dashboard') >= 0) {
        req.dashboard = 1;
    }
    //console.log(uri);

    my_name = get_pro_name();

    ws.send(JSON.stringify(req))

    setTimeout(() => {
        refresh_data();
    }, 5000);
}

$(()=>{
    var url = "ws://" + window.location.hostname + ":15679";
    ws = new WebSocket(url);
    ws.onopen =function(ev){
        refresh_data();
    };
    ws.onmessage = (ev)=>{
        //console.log(ev.data)
        ret = JSON.parse(ev.data)
        if(ret.type == 'error') {
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
        } else if(ret.method == 'dashboard') {
            //console.log(ret.result.data.length)
            var pro_count = ret.pro_list.length;
            var phd_count = ret.phd_list.length;

            var obj = document.querySelector("#voting_status");
            if(obj) {
                if(ret.voting_status == 1) {
                    obj.innerText = '开始投票';
                    obj.classList.remove('fg-red');
                    obj.classList.add('fg-green');
                } else {
                    obj.innerText = '停止投票';
                    obj.classList.remove('fg-geen');
                    obj.classList.add('fg-red');
                }
            }

            obj = document.querySelector('#pro_count');
            if(obj) {
                if(obj.innerText != pro_count) {
                    console.log('change pro_count:', obj.innerText, pro_count)
                    obj.innerText = pro_count;
                }
            }

            obj = document.querySelector('#phd_count');
            if(obj) {
                if(obj.innerText != phd_count) {
                    obj.innerText = phd_count;
                }
            }

            var total_voting = ret.pro_list.length * ret.phd_list.length;
            var remain = total_voting;
            var vote_yes = 0
            var vote_no = 0
            if(ret.voting_data) {
                ret.voting_data.forEach((pro, i, ar) => {
                    if(pro.result) {
                        pro.result.forEach( (phd, j, ar) => {
                            //phd.vote
                            //console.log(phd)
                            remain -= 1
                            if(phd.vote == 1)
                                vote_yes += 1
                            else if(phd.vote == 2)
                                vote_no += 1
                        })
                    }
                });
            }

            var vote_count = vote_yes + vote_no;

            obj=document.querySelector("#total_voting");
            if(obj) {
                if(obj.innerText != total_voting){
                    obj.innerText = total_voting;
                }
            }

            obj = document.querySelector("#remain_voting");
            if(obj) {
                if(obj.innerText != remain) {
                    obj.innerText = remain;
                }
            }

            obj = document.querySelector("#vote_yes");
            if(obj) {
                if(obj.innerText != vote_yes) {
                    obj.innerText = vote_yes;
                }
            }

            obj = document.querySelector("#vote_yes_rate");
            if(obj) {
                var rate = 0.0;
                if(vote_count > 0) {
                    rate = vote_yes / vote_count*100;
                }
                var val = Number(rate).toFixed(2) + '%';
                if(obj.innerText != val) {
                    obj.innerText = val;
                }
            }

            obj = document.querySelector("#vote_no");
            if(obj) {
                if(obj.innerText != vote_no) {
                    obj.innerText = vote_no;
                }
            }

            obj = document.querySelector("#vote_no_rate");
            if(obj) {
                var rate = 0.0;
                if(vote_count > 0) {
                    rate = vote_no / vote_count*100;
                }
                var val = Number(rate).toFixed(2) + '%';
                if(obj.innerText != val) {
                    obj.innerText = val;
                }
            }

            //投票进度报告
            obj = document.querySelector("#pro_dashboard");
            if(obj) {
                var data={};
                data.labels=[];
                data.datasets=[];
                var dataset={};
                dataset.label="专家投票数";
                dataset.data=[];
                dataset.backgroundColor=[];
                dataset.borderWidth=1;
                dataset.borderColor=[]
                colors = [];
                colors.push('rgba(255, 99, 132, 0.2)');
                colors.push('rgba(255, 159, 64, 0.2)');
                colors.push('rgba(255, 205, 86, 0.2)');
                colors.push('rgba(75, 192, 192, 0.2)');
                colors.push('rgba(54, 162, 235, 0.2)');
                colors.push('rgba(153, 102, 255, 0.2)');
                colors.push('rgba(201, 203, 207, 0.2)');

                //pro 投票数
                var pro_vote_count={};
                ret.voting_data.forEach((pro_voting)=>{
                    var pro_name = pro_voting.pro_name;
                    var count = 0;
                    if(pro_voting.result) {
                        count = pro_voting.result.length;
                    }
                    pro_vote_count[pro_name]=count;

                })

                //labels and data
                ret.pro_list.forEach( (pro, idx, ar) => {

                    data.labels.push( pro[1] )


                    dataset.data.push( pro_vote_count[ pro[1] ] | 0 );

                    color_idx = idx % colors.length;
                    var back_color = colors[color_idx];
                    var border_color = back_color.replace('0.2', '1');
                    //console.log(back_color, border_color);

                    dataset.backgroundColor.push( back_color );

                    dataset.borderColor.push( border_color );
                    //pro.result.forEach((phd, idx2, ar2)=> {

                    //})
                })
                data.datasets.push(dataset)

                if (!pro_chart) {
                    pro_chart_data = JSON.stringify(data);
                    pro_chart = new Chart(obj.getContext('2d'), {
                        type: 'bar',
                        data: data,
                        options: {
                            scales: {
                                yAxes: [{
                                    ticks: {
                                        beginAtZero: true
                                    }
                                }]
                            }
                        }
                    });
                } else {

                    var json_2 = JSON.stringify(data);
                    if( pro_chart_data != json_2) {
                        console.log(pro_chart_data)
                        pro_chart_data = json_2;
                        pro_chart.data = data;
                        pro_chart.update();
                    }
                }


            }

            // 博士后得票情况
            obj = document.querySelector("#phd_dashboard");
            if(obj) {
                var data={};
                data.labels=[];
                data.datasets=[{}, {}];
                var dataset1=data.datasets[0]
                dataset1.label="赞成票得票数";
                dataset1.backgroundColor= 'rgb(255, 99, 132)',
                dataset1.borderColor= 'rgb(255, 99, 132)',
                dataset1.data= [10, 23, 5, 99, 67, 43, 0],
                dataset1.fill= false,
                dataset1.pointRadius= 5,
                dataset1.pointHoverRadius= 10,
                dataset1.showLine= true // no line shown

                var dataset2=data.datasets[1]
                dataset2.label="反对票得票数";
                dataset2.backgroundColor= 'rgb(54, 162, 235)',
                dataset2.borderColor= 'rgb(54, 162, 235)',
                dataset2.data= [10, 73, 15, 33, 0, 13, 0],
                dataset2.fill= false,
                dataset2.pointRadius= 5,
                dataset2.pointHoverRadius= 10,
                dataset2.showLine= true // no line shown

                var phd_labels=[];
                var phd_vote_yes=[];
                var phd_vote_no=[];
                ret.phd_list.forEach((phd)=>{
                    phd_labels.push(phd[2]);
                    phd_vote_yes.push(0);
                    phd_vote_no.push(0);
                });

                ret.voting_data.forEach((pro_voting)=>{
                    var pro_name = pro_voting.pro_name;
                    var count = 0;
                    if(pro_voting.result) {
                        count = pro_voting.result.length;
                        pro_voting.result.forEach((phd_voting)=>{
                            var vote_yes = phd_voting.vote == 1? 1:0;
                            var vote_no = vote_yes == 1?0:1;
                            phd_labels.forEach((phd_name,idx) =>{
                                if (phd_name == phd_voting.phd_name) {
                                    phd_vote_yes[idx] += vote_yes;
                                    phd_vote_no[idx] += vote_no;
                                }
                            });
                        })
                    }
                })
                data.labels = phd_labels
                dataset1.data = phd_vote_yes
                dataset2.data = phd_vote_no

                if(!phd_chart) {
                    phd_chart_data = JSON.stringify(data);
                    phd_chart = new Chart(obj.getContext('2d'), {
                        type: 'line',
                        data:data,
                        options: {
                            responsive: true,

                            legend: {
                                display: true
                            },
                            elements: {
                                point: {
                                    pointStyle: 'rectRot'
                                }
                            },
                            scales: {
                                yAxes: [{
                                    ticks: {
                                        beginAtZero: true,
                                        min:0
                                    }
                                }]
                            }
                        }
                    });
                } else {
                    var json_2 = JSON.stringify(data);
                    if(phd_chart_data != json_2) {
                        phd_chart_data = json_2;
                        phd_chart.data = data;
                        phd_chart.update();
                    }
                }

            }

            // 更新时间
            obj=document.querySelector("#time_start");
            if(obj) {
                var tm = ret.time_start*1000;
                var d = new Date();
                //console.log('time', ret.time_start);
                d.setTime(tm);
                obj.innerText = d.format('%Y-%m-%d %H:%M:%S');
            }
            obj=document.querySelector("#time_now");
            if(obj) {
                var d = new Date();
                obj.innerText = d.format('%Y-%m-%d %H:%M:%S');
            }
            obj=document.querySelector("#time_duration");
            if(obj) {
                var tstart = ret.time_start;
                var tstop = ret.time_stop;
                var dur = parseInt(tstop - tstart);
                var days = parseInt(dur / 86400);
                var hours = parseInt( (dur % 86400) / 3600 );
                var mins = parseInt( (dur % 3600 ) / 60 );
                var secs = parseInt( (dur % 60));
                obj.innerText = days + " " + hours + ":" + mins + ":" + secs
            }
            obj=document.querySelector("#time_remain");
            if(obj) {

                var tstop = ret.time_stop;
                var tnow = new Date().getTime()/1000;
                var dur = parseInt(tstop - tnow);
                if (dur < 0) {
                    obj.innerText = '0'
                } else {
                    var days = parseInt(dur / 86400);
                    var hours = parseInt( (dur % 86400) / 3600 );
                    var mins = parseInt( (dur % 3600 ) / 60 );
                    var secs = parseInt( (dur % 60));
                    obj.innerText = days + " " + hours + ":" + mins + ":" + secs
                }

            }

            //更新列表
            obj = document.querySelector("#pro_table");
            if(obj) {
                var table = $("#pro_table").data("table");
                if(table) {
                    var data={}
                    data.header=[]
                    data.data=[]

                    var col1={}
                    col1.name="id"
                    col1.title = '序号'
                    col1.size=100
                    col1.sortable=true
                    col1.sortDir='asc'
                    col1.format='number'
                    data.header.push(col1)

                    var col2={}
                    col2.name = 'name'
                    col2.title='姓名'
                    col2.size=200
                    col2.sortable=true
                    data.header.push(col2)

                    var col3={}
                    col3.name = 'org'
                    col3.title='工作单位'
                    col3.size=400
                    col3.sortable=true
                    data.header.push(col3)

                    var col4={}
                    col4.name="status"
                    col4.title='投票状态'
                    col4.size=200
                    col4.sortable=true
                    data.header.push(col4)

                    ret.pro_list.forEach( (pro, idx) =>{
                        dt = []
                        dt.push(idx + 1)
                        dt.push( pro[1] )
                        dt.push( pro[0] )
                        var dt_voting_done = false
                        ret.voting_data.forEach( (pro_voting)=>{
                            if(pro[1] == pro_voting.pro_name) {
                                if(pro_voting.voting_status == 1) {
                                    dt.push('正在投票')
                                } else if(pro_voting.voting_status ==2) {
                                    dt.push('完成投票')
                                } else {
                                    dt.push('未开始投票')
                                }
                                dt_voting_done = true;
                            }
                        })
                        if(!dt_voting_done) {
                            dt.push('未开始投票')
                        }

                        data.data.push(dt)
                    });

                    var json_2 = JSON.stringify(data)
                    if(pro_table_data != json_2) {
                        pro_table_data = json_2
                        //console.log('reload pro_table')
                        //console.log(table)

                        table.deleteItem(1, (val)=>{
                            console.log('del item', val)
                            return true;});
                            table.header={}
                        table.data = data
                        table._createItemsFromJSON(table.data);
                        table.currentPage=1;
                        table.resetView();
                    }
                }
            }

            //博士后列表
            obj = document.querySelector("#phd_table");
            if(obj) {
                var table = $("#phd_table").data('table');
                if(table) {
                    var data={}
                    data.header=[]
                    data.data=[]

                    var col1={}
                    col1.name="id"
                    col1.title = '序号'
                    col1.size=100
                    col1.sortable=true
                    col1.sortDir='asc'
                    col1.format='number'
                    data.header.push(col1)

                    var col2={}
                    col2.name = 'name'
                    col2.title='姓名'
                    col2.size=200
                    col2.sortable=true
                    data.header.push(col2)

                    var col3={}
                    col3.name = 'org'
                    col3.title='毕业院校'
                    col3.size=400
                    col3.sortable=true
                    data.header.push(col3)

                    ret.phd_list.forEach( (phd, idx) =>{
                        dt = []
                        dt.push(idx + 1)
                        dt.push( phd[2] )
                        dt.push( phd[8] )

                        data.data.push(dt)
                    });

                    var json_2 = JSON.stringify(data)
                    if(phd_table_data != json_2) {
                        phd_table_data = json_2
                        //console.log('reload pro_table')
                        //console.log(table)

                        table.deleteItem(1, (val)=>{
                            //console.log('del item', val)
                            return true;});
                            table.header=[]
                        table.data = data
                        table._createItemsFromJSON(table.data);
                        table.currentPage=1;
                        table.resetView();
                    }
                }
            }



        } // dashboard
        else if (ret.method == 'voting') {
            //console.log('voting');
            var obj_list = document.querySelector('#voting_phd_list');
            var obj_detail = document.querySelector('#voting_phd_detail');
            if(obj_list && obj_detail) {
                var my_vote=[]
                var data =[]

                if( ret.voting_data ) {
                    ret.voting_data.forEach((item)=>{
                        if (item.pro_name == my_name) {
                            my_vote = item.result;
                        }
                    })
                }

                ret.phd_list.forEach((phd) =>{
                    var name = phd[2];
                    data.push(name);

                })

                var json_2 = JSON.stringify(data);

                if(json_2 != phd_voting_data) {
                    phd_voting_data = json_2;

                    // 清除现有数据
                    navview = $('div[data-role="navview"]');
                    //console.log(navview);
                    pane = navview.children('.navview-pane');
                    content = navview.children('.navview-content');
                    menu_container = pane.children(".navview-menu-container");
                    menu = menu_container.children('.navview-menu');
                    //console.log(menu);
                    if(menu.length) {
                        menu.clear();
                    }



                    //title = $("<li>").addClass("item-header").text("博士后列表");
                    //title.appendTo(menu);

                    calcMenuHeight=(menu)=>{
                        var elements_height = 0;

                        $.each(menu.prevAll(), function(){
                            elements_height += $(this).outerHeight(true);
                        });
                        $.each(menu.nextAll(), function(){
                            elements_height += $(this).outerHeight(true);
                        });
                        menu_container.css({
                            height: "calc(100% - "+(elements_height)+"px)"
                        });
                    }



                    // while (obj_list.firstChild) {
                    //     obj_list.removeChild(obj_list.firstChild);
                    // }
                    while(obj_detail.firstChild) {
                        obj_detail.removeChild(obj_detail.firstChild);
                    }

                    // badge cross tablet
                    var phd_ctx_temp = '\
                         <div class="grid border bd-cyan"> \
                         <div class="row"> \
                         <div class="cell-1 bg-lightGray">姓名</div>   \
                         <div class="cell-1">phd_name</div> \
                         <div class="cell-1 bg-lightGray">出生年月</div> \
                         <div class="cell-2">phd_birth</div> \
                         <div class="cell-2 bg-lightGray">博士毕业时间</div> \
                         <div class="cell-2">phd_date</div> \
                         <div class="cell bg-lightGray">当前身份</div> \
                         <div class="cell-2">phd_credit</div> \
                         </div> \
                         <div class="row"> \
                         <div class="cell-1 bg-gray">推荐顺序</div> \
                         <div class="cell-1">phd_order</div> \
                         <div class="cell-1 bg-gray">院系顺序</div> \
                         <div class="cell-2">phd_order_college</div> \
                         <div class="cell-2 bg-gray">博士导师</div> \
                         <div class="cell-2">phd_teacher</div> \
                         <div class="cell-1 bg-gray">合作导师</div> \
                         <div class="cell-2">phd_teacher2</div> \
                         </div> \
                         <div class="row"> \
                         <div class="cell-1 bg-lightGray">学位授予机构</div> \
                         <div class="cell-1">phd_org</div> \
                         <div class="cell-1 bg-lightGray">目前所属单位</div> \
                         <div class="cell-2">phd_org2</div> \
                         <div class="cell-2 bg-lightGray">所属一级学科</div> \
                         <div class="cell-1">phd_class</div> \
                         </div> \
                         <div class="row"> \
                         <div class="cell-1 bg-gray">详细信息</div> \
                         <div class="cell">phd_detail</div> \
                         </div> \
                         </div> \
                    ';

                    var phd_detail_temp =' \
                    <div data-role="panel" \
                    data-cls-panel=“no-border-left” \
                    data-title-caption="详细资料" \
                    data-collapsible="true" \
                    data-cls-title="bg-lightCyan fg-white" \
                    data-cls-title-icon="bg-cyan" \
                    data-title-icon="<span class=\'mif-user\'></span>"> \
                    phd_detail \
                    </div> \
                    <div data-role="panel"  \
                    data-title-caption="博士后投票" \
                    data-collapsible="false" \
                    data-cls-title="bg-lightCyan fg-white" \
                    data-cls-title-icon="bg-cyan" \
                    data-title-icon="<span class=\'mif-rocket\'></span>" \
                    > \
                        <button class="command-button icon-right success m-1"> \
                            <span class="mif-checkmark icon"></span> \
                            <span class="caption"> \
                                同意，推荐此人成为博雅博士后 \
                                <small>单击此处更改推荐结果</small> \
                            </span> \
                        </button> \
                        <button class="command-button icon-right alert m-1 "> \
                            <span class="mif-cross icon"></span>   \
                            <span class="caption"> \
                                不同意，拒绝此人成为博雅博士后  \
                                <small>单击此处更改推荐结果</small> \
                            </span> \
                        </button> \
                    </div> \
                    ';


                    //console.log('run foreach');
                    ret.phd_list.forEach((phd,idx) =>{
                        var phd_name = phd[2];
                        var ctx = phd_ctx_temp.replace(/phd_name/g, phd[2])
                            .replace(/phd_birth/g, phd[3])
                            .replace(/phd_date/g, phd[4])
                            .replace(/phd_credit/g, phd[5])
                            .replace(/phd_order/, phd[0])
                            .replace(/phd_order_college/g, phd[1])
                            .replace(/phd_teacher/, phd[6])
                            .replace(/phd_teacher2/, phd[7])
                            .replace(/phd_org/, phd[8])
                            .replace(/phd_org2/, phd[9])
                            .replace(/phd_class/, phd[11])
                            .replace(/phd_detail/, phd[10])
                        var content2 = phd_detail_temp.replace(/phd_detail/g, ctx);
                        var node2 = document.createElement('div');
                        node2.id = phd[2];
                        node2.innerHTML = content2;
                        obj_detail.appendChild(node2);
                        if(idx > 0)
                            $('#' + phd[2]).hide();

                        console.log('run phd list');
                        // phd list
                        menu_phd = $("<li>").appendTo(menu);
                        //console.log(menu_phd);
                        anchor = $("<a>").attr('href', "#").attr('name', phd_name).appendTo(menu_phd);


                        icon = $("<span>").addClass("icon").appendTo(anchor);
                        caption = $("<span>").addClass('caption').appendText(phd_name).appendTo(anchor);

                        mif = $('<span>').appendTo(icon);
                        console.log(anchor);
                        $(document).on('click', 'a[name="'+ phd_name +'"', (e,v)=>{
                            // hide all
                            var anchor = $(e.srcElement)
                            //console.log(anchor, anchor.prop('tagName'));
                            while(anchor.prop('tagName') != 'A') {
                                anchor = anchor.parent();
                            }
                            var phd_name = anchor.attr('name');
                            //console.log(phd_name);
                            content = $('#' + phd_name );
                            ctxs = content.parent().children();
                            for(var i =0; i< ctxs.length; i++) {
                                $(ctxs[i]).hide();
                            }
                            content.show();

                        })



                        var vote_status = 0;
                        try {
                            my_vote.forEach((vote)=>{
                                if(vote.phd_name == phd_name) {
                                    vote_status = vote.vote;
                                    throw new Error('done');
                                }
                            })
                        } catch(e) {
                            if(e.message != 'done') throw e;
                        }

                        if(vote_status == 0) { //未投票
                            mif.addClass('fg-orange mif-tablet');
                            //caption.addClass('fg-orange');

                        } else if(vote_status == 1) { //赞成票
                            mif.addClass('fg-green mif-checkmark');
                        } else { //反对票
                            mif.addClass('fg-red mif-cross');
                        }

                        $("<li>").addClass('item-separator').appendTo(menu);
                    });

                    calcMenuHeight(menu);

                    // 绑定按钮事件
                    var obj = document.querySelectorAll('button.success.command-button');
                    if(obj) {
                        obj.forEach((button)=>{
                            button.onclick=(e)=>{
                                var phd_name = button.parentNode.parentNode.parentNode.id;
                                anchor = $('a[href="#"][name="'+phd_name+'"]');
                                //console.log(anchor)
                                if(anchor) {
                                    mif = anchor.children('span.icon').children('span');
                                    mif.removeClass('mif-tablet mif-cross mif-checkmark');
                                    mif.removeClass('fg-red fg-orange fg-green').addClass('fg-green mif-checkmark');

                                    req={}
                                    req.method="votingman";
                                    req.update_vote=1;
                                    req.pro_name = my_name;
                                    req.phd_name = phd_name;
                                    req.vote = 1;

                                    ws.send(JSON.stringify(req));
                                }
                                //console.log(button.parentNode.parentNode.parentNode.id, anchor)
                            }
                        });
                    }

                    obj = document.querySelectorAll('button.alert.command-button');
                    if(obj) {
                        obj.forEach((button)=>{
                            button.onclick=(e)=>{
                                var phd_name = button.parentNode.parentNode.parentNode.id;
                                console.log(phd_name)
                                anchor = $('a[href="#"][name="'+phd_name+'"]');
                                if(anchor) {
                                    mif = anchor.children('span.icon').children('span');
                                    mif.removeClass('mif-tablet mif-cross mif-checkmark');
                                    mif.removeClass('fg-red fg-orange fg-green').addClass('fg-red mif-cross');

                                    req={}
                                    req.method="votingman";
                                    req.update_vote=1;
                                    req.pro_name = my_name;
                                    req.phd_name = phd_name;
                                    req.vote = 2;

                                    ws.send(JSON.stringify(req));


                                }
                                //console.log(button.parentNode.parentNode.parentNode.id, anchor)
                            }
                        });

                    }


                }





            }
        }
    };
    ws.onclose= (ev)=>{

    };
    ws.onerror = (ev)=>{

    };
    var tile_voting_done = document.querySelector("#voting_done");
    if(tile_voting_done) {
        tile_voting_done.onclick = function(ev){
            //
            var vote_yes=$('ul.navview-menu li a span span.fg-green').length;
            var vote_no=$('ul.navview-menu li a span span.fg-red').length;
            var vote_remain =$('ul.navview-menu li a span span.fg-orange').length;


            Metro.dialog.create({
                title: '完成全部投票',
                content: '<div>请确认是否完成全部投票?</div><hr>' +
                     '<h4 class="fg-green">'+vote_yes +'票赞成</h4>' +
                    '<h4 class="fg-red">'+vote_no+ '票反对</h4>' +
                    '<h4 class="fg-orange">'+vote_remain + '票剩余</h4>',
                actions: [
                    {
                        caption: "提交结果",
                        cls: "js-dialog-close success",
                        onclick: function(){
                            req = {}
                            req.method='votingman';
                            req.finish_vote=1;
                            req.pro_name = my_name;

                            ws.send(JSON.stringify(req));
                        }
                    },
                    {
                        caption: "返回修改",
                        cls: "js-dialog-close",
                        onclick: function(){
                            //do nothing
                        }
                    }
                ],
                clsDialog: 'alert'
            });

        };
    }

    /* ---  Dashboard  --- */
    window.chartColors = {
        red: 'rgb(255, 99, 132)',
        orange: 'rgb(255, 159, 64)',
        yellow: 'rgb(255, 205, 86)',
        green: 'rgb(75, 192, 192)',
        blue: 'rgb(54, 162, 235)',
        purple: 'rgb(153, 102, 255)',
        grey: 'rgb(201, 203, 207)'
    };

    // var pro_board = document.querySelector("#pro_dashboard");
    // if (pro_board) {
    //     pro_chart = new Chart(pro_board.getContext('2d'), {
    //         type: 'bar',
    //         data: {
    //             labels: ["高鹏", "何浩", "张三", "王二", "王二", "王二"],
    //             datasets: [{
    //                 label: '专家投票数',
    //                 data: [12, 19, 3, 5, 2, 3],
    //                 backgroundColor: [
    //                     'rgba(255, 99, 132,0.2)',
    //                     'rgba(54, 162, 235, 0.2)',
    //                     'rgba(255, 206, 86, 0.2)',
    //                     'rgba(75, 192, 192, 0.2)',
    //                     'rgba(153, 102, 255, 0.2)',
    //                     'rgba(255, 159, 64, 0.2)'
    //                 ],
    //                 borderColor: [
    //                     'rgba(255,99,132,1)',
    //                     'rgba(54, 162, 235, 1)',
    //                     'rgba(255, 206, 86, 1)',
    //                     'rgba(75, 192, 192, 1)',
    //                     'rgba(153, 102, 255, 1)',
    //                     'rgba(255, 159, 64, 1)'
    //                 ],
    //                 borderWidth: 1
    //             }]
    //         },
    //         options: {
    //             scales: {
    //                 yAxes: [{
    //                     ticks: {
    //                         beginAtZero:true
    //                     }
    //                 }]
    //             }
    //         }
    //     });
    // }

    // var phd_dashboard = document.getElementById("phd_dashboard");
    // if (phd_dashboard) new Chart(phd_dashboard.getContext('2d'), {
    //     type: 'line',
    //     data: {
    //         labels: ['李四', '李四', '李四', '李四', '李四', '李四', '李四'],
    //         datasets: [{
    //             label: '赞成票得票数',
    //             backgroundColor: window.chartColors.red,
    //             borderColor: window.chartColors.red,
    //             data: [10, 23, 5, 99, 67, 43, 0],
    //             fill: false,
    //             pointRadius: 5,
    //             pointHoverRadius: 10,
    //             showLine: true // no line shown
    //         }, {
    //             label: '反对票得票数',
    //             backgroundColor: window.chartColors.blue,
    //             borderColor: window.chartColors.blue,
    //             data: [5, 0, 15, 1, 22, 32, 87],
    //             fill: false,
    //             pointRadius: 5,
    //             pointHoverRadius: 10,
    //             showLine: true // no line shown
    //         }]
    //     },
    //     options: {
    //         responsive: true,

    //         legend: {
    //             display: true
    //         },
    //         elements: {
    //             point: {
    //                 pointStyle: 'rectRot'
    //             }
    //         }
    //     }
    // });
})

var obj = document.querySelector("#voting_pro_name");
if(obj) {
    var cookie = document.cookie;
    var ca = cookie.split(';');
    var user_name = ''
    console.log(cookie);
    ca.forEach((it) =>{
        var item = it.trimLeft();
        if(item.indexOf('user_name=') == 0) {
            user_name = decodeURIComponent(item.substr(10));
        }
    });

    obj.innerText = user_name
}

function get_pro_name() {
    var cookie = document.cookie;
    var ca = cookie.split(';');
    var user_name = ''
    //console.log(cookie);
    ca.forEach((it) => {
        var item = it.trimLeft();
        if (item.indexOf('user_name=') == 0) {
            user_name = decodeURIComponent(item.substr(10));
        }
    });

    return user_name;
}