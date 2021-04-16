// This file is required by the voting.html
const ipc = require('electron').ipcRenderer


let g_evclicktime = 0;
let g_method = "dashboard";

let g_pro_chart
let g_pro_chart_data

let g_phd_chart
let g_phd_chart_data

let g_phd_table_data
let g_pro_table_data

let g_pro_voting_detail_data


function update_dashboard() {

    ipc.send(g_method, "dashboard");
    setTimeout(() => {
        update_dashboard();
    }, 5000);
}

setTimeout(() => {
    update_dashboard();
}, 100);


ipc.on('dashboard', (ev, ret) => {
    if (ret.type == 'error') {
        var notify = Metro.notify;
        var msg = ret.error;
        if (!msg) msg = "未知错误";
        notify.create(msg, "发生错误", {
            cls: 'alert',
            animation: 'easeInSine',
            duration: 500,
            keepOpen: true
        });
        return;
    } else if (ret.method == 'dashboard') {

        const vs = [['fg-red', '停止投票'], ['fg-green', '开始投票'], ['fg-red', '停止投票']]
        $('#voting_status')
            .removeClass('fg-red')
            .removeClass('fg-green')
            .addClass(vs[ret.voting_status][0])
            .text(vs[ret.voting_status][1]);

        $('#pro_count').text(ret.pro_list.length);
        $('#phd_count').text(ret.phd_list.length);

        var total_voting = ret.pro_list.length * ret.max_pro_num;
        var remain = total_voting;
        var vote_yes = 0
        var vote_no = 0
        if (ret.voting_data) {
            ret.voting_data.forEach((pro, i, ar) => {
                if (pro.result) {
                    pro.result.forEach((phd, j, ar) => {
                        //phd.vote
                        //console.log(phd)

                        if (phd.vote == 1) {
                            vote_yes += 1
                            remain -= 1
                        } else if (phd.vote == 2) {
                            vote_no += 1
                        }
                    })
                }
            });
        }
        var vote_count = vote_yes + vote_no;

        $('#total_voting').text(total_voting);
        $('#remain_voting').text(remain);
        $('#vote_yes').text(vote_yes);
        $('#vote_yes_rate').text(vote_count == 0 ? Number(0).toFixed(2) + '%' : Number(vote_yes / vote_count * 100).toFixed(2) + '%');
        $('#vote_no').text(vote_no);
        $('#vote_no_rate').text(vote_count == 0 ? Number(0).toFixed(2) + '%' : Number(vote_no / vote_count * 100).toFixed(2) + '%');

        // 投票进度报告
        var obj = $('#pro_dashboard');
        if (obj.length == 1) {
            const colors = ['rgba(255, 99, 132, 0.2)',
                'rgba(255, 159, 64, 0.2)',
                'rgba(255, 205, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(201, 203, 207, 0.2)'];

            var data = {};
            data.labels = [];
            data.datasets = [];

            var dataset = {};
            dataset.label = "专家投票数";
            dataset.data = [];
            dataset.backgroundColor = [];
            dataset.borderWidth = 1;
            dataset.borderColor = []


            //pro 投票数
            var pro_vote_count = {};
            ret.voting_data.forEach((pro_voting) => {
                var pro_name = pro_voting.pro_name;
                var count = 0;
                if (pro_voting.result) {
                    count = pro_voting.result.length;
                }
                pro_vote_count[pro_name] = count;

            })

            //labels and data
            ret.pro_list.forEach((pro, idx, ar) => {
                const fake_pro_name = '专家' +(idx+1);
                // data.labels.push(pro[1])
                data.labels.push(fake_pro_name)


                dataset.data.push(pro_vote_count[pro[1]] | 0);

                var back_color = colors[idx % colors.length];
                var border_color = back_color.replace('0.2', '1');

                dataset.backgroundColor.push(back_color);

                dataset.borderColor.push(border_color);

            });
            data.datasets.push(dataset)

            //console.log(g_pro_chart)
            if (!g_pro_chart) {
                g_pro_chart_data = JSON.stringify(data);
                g_pro_chart = new Chart(obj[0].getContext('2d'), {
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
                if (g_pro_chart_data != json_2) {
                    g_pro_chart_data = json_2;

                    g_pro_chart.data = data;
                    g_pro_chart.update();
                    //console.log('update pro chart')
                }
            }
        }

        //博士后得票情况
        obj = $('#phd_dashboard');
        if(obj.length == 1) {
            const colors=['rgb(255, 99, 132)', 'rgb(54, 162, 235)'];

            var data={};
            data.labels=[];
            data.datasets=[{}, {}];

            data.datasets[0].label="赞成票得票数";
            data.datasets[0].backgroundColor= colors[0],
            data.datasets[0].borderColor= colors[0],
            data.datasets[0].data= [],
            data.datasets[0].fill= false,
            data.datasets[0].pointRadius= 5,
            data.datasets[0].pointHoverRadius= 10,
            data.datasets[0].showLine= true // no line shown

            data.datasets[1].label="反对票得票数";
            data.datasets[1].backgroundColor= colors[1],
            data.datasets[1].borderColor= colors[1],
            data.datasets[1].data= [],
            data.datasets[1].fill= false,
            data.datasets[1].pointRadius= 5,
            data.datasets[1].pointHoverRadius= 10,
            data.datasets[1].showLine= true // no line shown

            //更新博士后得票数据
            var phd_labels=[];
            var phd_vote_yes=[];
            var phd_vote_no=[];
            ret.phd_list.forEach((phd)=>{
                phd_labels.push(phd[2]);
                phd_vote_yes.push(0);
                phd_vote_no.push(0);
            });

            ret.voting_data.forEach((pro_voting)=>{
                if('result' in pro_voting) {
                    pro_voting.result.forEach((phd_voting)=>{
                        var vote_yes = phd_voting.vote == 1? 1:0;
                        var vote_no = vote_yes == 1?0:1;
                        // TODO: refine for performance :try-catch thew
                        phd_labels.forEach((phd_name,idx) =>{
                            if (phd_name == phd_voting.phd_name) {
                                phd_vote_yes[idx] += vote_yes;
                                phd_vote_no[idx] += vote_no;
                            }
                        });
                    });
                }
            });
            data.labels = phd_labels;
            data.datasets[0].data = phd_vote_yes;
            data.datasets[1].data = phd_vote_no;

            if(!g_phd_chart) {
                g_phd_chart_data = JSON.stringify(data);
                g_phd_chart = new Chart(obj[0].getContext('2d'), {
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
                    if(g_phd_chart_data != json_2) {
                        g_phd_chart_data = json_2;

                        g_phd_chart.data = data;
                        g_phd_chart.update();
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

         obj = $('#pro_voting_detail');
         if(obj.length == 1) {
             var table = obj.data('table');
             if(!table)
                return;
            var data={};

            // 生成头
            data.header=[];
            data.header.push({name:'id',title:'序号',size:100, sortable:true, sortDir:'asc', format:"number", cls:'bg-gray text-center', clsColumn:'bg-gray text-center'});
            data.header.push({name:'phd', title:'候选人',size:150, sortable:true, sortDir:'asc', cls:'bg-cyan fg-white text-center', clsColumn:'bg-cyan fg-white text-center'});
            data.header.push({name:'cls', title:'院系',size:150, sortable:true, sortDir:'asc', cls:'bg-cyan fg-white text-center', clsColumn:'bg-cyan fg-white text-center'});

            var real_pro_list={}
            //console.log(ret.voting_data);
            ret.voting_data.forEach((pro_voting, idx)=>{
                const fake_pro_name = '专家' + (idx+1);
                data.header.push({name:'pro'+idx, title:fake_pro_name,size:150, sortable:true, sortDir:'asc'});
            });

            // ret.pro_list.forEach( (pro, idx) =>{
            //     const fake_pro_name = '专家' + (idx+1);
            //     real_pro_list[pro[1]] = idx + 3;
            //     data.header.push({name:'pro'+idx, title:fake_pro_name,size:150, sortable:true, sortDir:'asc'});
            // });

            // 生成数据
            data.data =[];
            ret.phd_list.forEach( (phd,idx)=>{
                const id = idx+1;
                item = [];
                item.push(id);
                item.push(phd[2]);
                item.push(phd[12]);
                for(var i=0; i<Object.keys(real_pro_list).length; ++i){
                    item.push( '<div class="bg-orange w-100 m-0 p-0 text-center">未投票</div>');
                }
                data.data.push(item);
            });

            //遍历投票结果
            ret.voting_data.forEach((pro_voting, pro_idx)=>{
                const col = pro_idx +3;
                //console.log(col);
                pro_voting.result.forEach((phd_voting, phd_idx)=>{
                    const row = phd_idx;
                    //phd_voting.vote == 1? 1:0;
                    var vote='<div class="bg-green w-100 m-0 p-0 text-center">同意</div>';
                    if(phd_voting.vote != 1) {
                        vote = '<div class="bg-red w-100 m-0 p-0 text-center">不同意</div>';
                    }
                    data.data[row][col] = vote; //更新数据
                });
            });

            var json_2 = JSON.stringify(data);
            if(g_pro_voting_detail_data != json_2) {
                g_pro_voting_detail_data = json_2;
                //console.log('reload pro_table')
                //console.log(table)

                table.deleteItem(1, (val)=>{
                    //console.log('del item', val)
                    return true;});
                table.header={};
                table.data = data;
                table._createItemsFromJSON(table.data);
                table.currentPage=1;
                table.resetView();
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
                    const fake_pro_name = '专家' + (idx+1);
                    dt = []
                    dt.push(idx + 1)
                    //dt.push( pro[1] )
                    dt.push( fake_pro_name )
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
                if(g_pro_table_data != json_2) {
                    g_pro_table_data = json_2
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
                if(g_phd_table_data != json_2) {
                    g_phd_table_data = json_2
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


    }

})