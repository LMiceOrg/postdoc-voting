// Modules to control application life and create native browser window

const { app, BrowserWindow, dialog, Tray } = require('electron')
const ipc = require('electron').ipcMain
const async = require('async')

const path = require('path')
var subprocess = require('child_process').spawn;

const WebSocket = require("ws");


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let ctlvoting
let webvoting
// 0= init 1= success 2= display only
let g_status = 0
let ws
let ws_status = 0
let ev_sender = {}

let ws_port = 15679
let web_port = 15678

let app_check = 0


process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

function createWindow() {
  //name = path.join(__dirname, "assert", "img", "pku.png")
  //const appIcon = new Tray(name)
  // Create the browser window.
  mainWindow = new BrowserWindow(
    {
      //icon:appIcon,
      width: 1280,
      height: 1024,
      webPreferences: {
        javascript: true,
        plugins: true,
        webSecurity: true,
        nodeIntegration: true,
        contextIsolation:false
      }
    }
  )

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // 设置进度条
  //mainWindow.setProgressBar(0.5);

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  if (ctlvoting == null) {
    let script = path.join(__dirname, 'dist', 'ctlvoting', 'ctlvoting');
    ctlvoting = subprocess(script, [ws_port, __dirname], {
      stdio: ['ipc'],
      windowsHide: true,
      shell: false
    });
    console.log('spawn', script)

    ctlvoting.on('exit', (code) => {
      if (g_status == 0) {
        g_status = 2;
      }
      console.log("ctlvoting exit.");
    });

    ctlvoting.stdout.on('data', (data) => {
      console.log('ctlvoting out:', data.toString());
    })

    ctlvoting.stderr.on('data', (data) => {
      console.log('ctlvoting err:', data.toString());
    })
  }


  if (webvoting == null) {
    let script = path.join(__dirname, 'dist', 'webvoting', 'webvoting');
    webvoting = subprocess(script, [web_port, __dirname], {
      stdio: ['ipc'],
      windowsHide: true,
      shell: false
    });
    console.log(script)

    webvoting.on('exit', (code) => {
      console.log("webvoting exit.");
    });

    webvoting.stdout.on('data', (data) => {
      console.log('webserver out:', data.toString());
    });

    webvoting.stderr.on('data', (data) => {
      console.log('webserver err:', data.toString());
    })
  }

  //dialog.showErrorBox("process", "${py.killed()}");



}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  //if (process.platform !== 'darwin') {
  g_status = 1;
  if (ctlvoting != null)
    ctlvoting.kill('SIGKILL');

  if (webvoting != null)
    webvoting.kill('SIGKILL');

  //dialog.showErrorBox("process", "${py.killed()}");
  app.quit()

  //}
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }

})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// app 启动时 检测是否退出
ipc.on("app-quit", (ev, arg) => {
  if (arg == 'confirm') {
    mainWindow.destroy();
  } else if (arg == 'check') {

    if (app_check != 0) {
      return;
    }

    app_check = 1;

    if (g_status != 0) {
      let options = {};
      options.message = "process already exists, quit now?";
      //Array of texts for buttons.
      options.buttons = ["&Y确定", "&N取消"];
      //Can be "none", "info", "error", "question" or "warning".
      options.type = "info";
      //Index of the button in the buttons array which will be selected by default when the message box opens.
      options.defaultId = 0;
      //Title of the message box
      options.title = "quit app"
      //More information of the message
      options.detail = "Press Yes button to quit"
      //options.icon = "/path/image.png"
      //Shows a checkbox
      //options.checkboxLabel = "Checkbox only works with callback"
      //Initial checked state
      //options.checkboxChecked = true
      //The index of the button to be used to cancel the dialog, via the Esc key
      options.cancelId = 2
      //Prevent Electron on Windows to figure out which one of the buttons are common buttons (like "Cancel" or "Yes")
      options.noLink = true
      //Normalize the keyboard access keys
      options.normalizeAccessKeys = true

      ev.preventDefault()

      dialog.showMessageBox(
        mainWindow,
        options
      ).then((res) => {
        //console.log('app-quit:', res);
        if (res.response == 0) {
          ev.sender.send('app-quit', 'yes');
        } else {
          let name = mainWindow.getTitle();
          name += " [副本 - 仅用于浏览]"
          //console.log(name);
          mainWindow.setTitle(name);
        }
      });
    }


  } else {
    ev.sender.send('app-quit', 'no');
  }


})

// 生成专家列表
ipc.on('genpro', (ev, arg) => {

  ev_sender['genpro'] = ev.sender;
  let method = 'genpro';

  if (ws == null || ws.readyState != 1) {
    ev.sender.send("status", "closed");
  }

  if (arg == 'pro_excel') {


    let options = {
      defaultPath: '/Users/hehao/work/bj_rtlib/voting/doc',
      title: '请选择专家列表Excel',
      message: '专家Excel文件',
      filters: [{
        name: 'Excel',
        extensions: ['xls', 'xlsx']
      }],
      properties: ['openFile']
    }
    dialog.showOpenDialog(mainWindow, options
    ).then((res) => {
      if (res.canceled) return;
      const name = res.filePaths[0]
      console.log('pro file:', name);

      let req = {}
      req.method = method;
      req.pro_file = name;

      ws.send(JSON.stringify(req));

    });
  } else if (arg == 'phd_excel') {
    ev_sender['genpro'] = ev.sender;

    let options = {
      defaultPath: '/Users/hehao/work/bj_rtlib/voting/doc',
      title: '请选择博士后列表Excel',
      message: '博士后Excel文件',
      filters: [{
        name: 'Excel',
        extensions: ['xls', 'xlsx']
      }],
      properties: ['openFile']
    };
    dialog.showOpenDialog(mainWindow, options
    ).then((res) => {
      if (res.canceled) return;
      const name = res.filePaths[0]
      console.log('phd file:', name);

      let req = {}
      req.method = 'genpro';
      req.phd_file = name;

      ws.send(JSON.stringify(req));

    });
  } else if (arg == 'dump_excel') {
    let options = {
      defaultPath: '/Users/hehao/work/bj_rtlib/voting/doc',
      title: '请导出专家列表Excel',
      message: '专家列表Excel文件',
      filters: [{
        name: 'Excel',
        extensions: ['xls', 'xlsx']
      }],
      properties: ['createDirectory']
    };
    dialog.showSaveDialog(mainWindow, options
    ).then((res) => {
      if (res.canceled) return;
      const name = res.filePath;
      console.log('dump file:', name);

      let req = {}
      req.method = 'genpro';
      req.dump_file = name;

      ws.send(JSON.stringify(req));


    });

  } else if (arg.substr(0, 6) == 'filter') {

    let req = {}
    req.method = 'genpro';
    req.filter = arg[6];

    ws.send(JSON.stringify(req));

  } else if (arg == "status") {

    let req = {}
    req.method = method;

    ws.send(JSON.stringify(req));

  }

})


// 发起投票
ipc.on("votingman", (ev, arg) => {
  ev_sender['votingman'] = ev.sender;
  let method = 'votingman';

  //console.log('ws_status:', ws_status)
  if (ws_status != 1) {
    renew();
    let ret = {}
    ret.type = "error";
    ret.error = "websocket未连接";
    ev.sender.send(method, ret);

  }

  if (arg == 'pro_excel') {

    let options = {
      defaultPath: '/Users/hehao/work/bj_rtlib/voting/doc',
      title: '请选择专家列表Excel',
      message: '专家Excel文件',
      filters: [{
        name: 'Excel',
        extensions: ['xls', 'xlsx']
      }],
      properties: ['openFile']
    }
    dialog.showOpenDialog(mainWindow, options
    ).then((res) => {
      if (res.canceled) return;
      const name = res.filePaths[0]
      console.log('pro file:', name);

      let req = {}
      req.method = method;
      req.pro_file = name;

      ws.send(JSON.stringify(req));

    });
  } else if (arg == 'phd_excel') {
    //ev_sender['genpro'] = ev.sender;

    let options = {
      defaultPath: '/Users/hehao/work/bj_rtlib/voting/doc',
      title: '请选择博士后列表Excel',
      message: '博士后Excel文件',
      filters: [{
        name: 'Excel',
        extensions: ['xls', 'xlsx']
      }],
      properties: ['openFile']
    };
    dialog.showOpenDialog(mainWindow, options
    ).then((res) => {
      if (res.canceled) return;
      const name = res.filePaths[0]
      console.log('phd file:', name);

      let req = {}
      req.method = method;
      req.phd_file = name;

      ws.send(JSON.stringify(req));

    });
  } else if (arg == "status") {

    let req = {}
    req.method = method;
    req.gen_json = 1;

    ws.send(JSON.stringify(req));

  } else if (arg.substr(0, 6) == 'voting') {

    let req = {}
    req.method = method;
    req.status = arg[6];
    if(req.status == 1) {
      req.max_pro_num = arg.substr(8)
    }

    ws.send(JSON.stringify(req));
  } else if (arg.substr(0,6) == 'result') {
    //console.log(arg.substr(7))
    const prop = JSON.parse(arg.substr(7) );
    let options = {
      defaultPath: '/Users/hehao/work/bj_rtlib/voting/doc',
      title: '导出投票结果',
      message: '投票结果Word文件',
      defaultPath:`北京大学博雅博士后项目第${prop.pici}次(总第${prop.zongpici}次)投票结果`,
      filters: [{
        name: 'Word',
        extensions: ['doc', 'docx']
      }],
      properties: ['createDirectory']
    };
    dialog.showSaveDialog(mainWindow, options
    ).then((res) => {
      if (res.canceled) return;
      const name = res.filePath;
      //console.log('dump file:', name);

      let req = {}
      req.method = method;
      req.word_file = name;
      for(k in prop) {
        req[k] = prop[k];
      }


      ws.send(JSON.stringify(req));


    });

  }


})

//更新状态
ipc.on('status', (ev, arg) => {
  if (arg == 'renew') {
    renew();
  }

})



function renew() {

  const ws_url = "ws://127.0.0.1:" + ws_port;

  if (ws != null) {
    if (ws.readyState == 1) {
      return;
    }
  }

  ws = new WebSocket(ws_url);

  ws.on('open', () => {
    console.log("websocket connected to: ", ws_url);
    ws_status = ws.readyState;
  });

  ws.on('error', (e) => {
    console.log('websocket connect error:', e);
    ws_status = ws.readyState;
  });

  ws.on('close', (e) => {
    console.log('websocket connect cloed:', e);
    ws_status = 0;
  });

  ws.on('message', (data) => {
    //console.log('message', data)
    if (data == null) {
      return;
    }
    obj = JSON.parse(data)
    if (obj.method == 'genpro') {
      //console.log(obj)
      ev_sender['genpro'].send("genpro", obj);
    } else if (obj.method == 'votingman') {
      ev_sender['votingman'].send('votingman', obj);
    } else if (obj.method == 'dashboard') {
      ev_sender['dashboard'].send('dashboard', obj);
    } else if (obj.method == 'host_ip') {
      //console.log(obj);
      ev_sender['host_ip'].send('host_ip', obj);
    }
  });
}

//dashboard: refresh
ipc.on('dashboard', (ev, arg) => {
  let req = {};
  req.method = 'votingman';
  req.dashboard = 1;

  ev_sender['dashboard'] = ev.sender;

  ws.send(JSON.stringify(req));
})

// index :初始页
ipc.on('host_ip', (ev, arg) => {
  let req = {};
  req.method = 'host_ip';

  ev_sender['host_ip'] = ev.sender;

  //console.log(req)

  ws.send(JSON.stringify(req));
})