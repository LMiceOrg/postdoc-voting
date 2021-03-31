# 北大博雅博士后投票系统

投票系统软件是一个含网络功能的界面程序，运行在win/*inux/osx系统之上，供用户进行发起投票计票等操作, 网络端可用浏览器进行访问。主要功能包括：

1. App端

> 专家（投票人）名单生成功能：

	 进入APP，切换到专家名单生成 

	 导入专家库文件Excel 

	 筛选可用专家名单
	
	 导出筛选后的专家列表文件Excel

> 博士后投票功能：

	 进入app，切换到博士后投票

	 加载专家列表文件Excel

	 加载博士后列表文件Excel

	 开始投票， 进入投票状态页面

> 投票状态控制功能：

	 进入app，切换到投票状态控制

	 显示投票状态

	 <在需要停止时>停止当前投票

> 投票结果生成功能：

	 进入app，切换到投票结果生成

	 导出投票结果到Word

2. Web端

> 专家（投票人）投票功能：

	 打开网页，进入登录页面

	 输入名称/工作证号登录，进入投票页面

	 对各个待选人员（博士后）投票 是/否

	 提交投票结果， 进入投票状态页面

> 投票状态查看功能：

	 打开网页，进入查看投票状态页面

	 刷新显示投票状态

## 系统实现

### 库 与 功能

** 1. Python **
 
系统后端逻辑实现采用Python 实现，通过websocet与app，网页实现通讯。

* 操作并生成Word文档

docx-mailmerge

* 操作并读取Excel文档

xlrd

* 操作并写入Excel 文档

xlwt

* excel过滤条件

xlutils

* 可执行文件发布打包功能

pyinstaller

* websocket 服务功能

websockets

asyncio

* web 服务功能

webpy

* web-app通讯协议功能

json

** 2. Electron **

app程序使用Electron实现。

* 启动webserver/websocket等子进程启动

subprocess

* 主进程与渲染进程通讯

ipcMain ipcRender

* app程序




** 3. 用户界面 **

app界面和web页面采用同样的用户界面元素和风格实现。


* Javascript界面库

Metro-ui 


### 流程

![](./genpro1.png) ![](./genpro2.png) ![](./genpro3.png) ![](./genpro4.png)
