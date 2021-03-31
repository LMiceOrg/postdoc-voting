#coding: utf-8
import sys
import os
import web
import traceback
#import datetime
#import __builtin__

import asyncio
import websockets
import json
import threading

#print(globals())


cur_path = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) >2:
    cur_path= os.path.abspath(sys.argv[2])

sys.path.append( os.path.dirname( os.path.abspath(__file__) ) )

up_path = os.path.dirname(os.path.dirname(cur_path))
print ('cur_path:', cur_path)
print('argv', sys.argv)

from base_config import Config

#os.chdir(up_path)

urls=(
    '/favicon[.]ico', 'fav_ico',
    '(.*)/assert/(.*)', 'static_assert',
    '(.*)/data/(.*)', "voting_data",
    '/login[^/]*',  'login',
    '/logout[^/]*', 'logout',
    '/voting[^/]*', 'voting',
    '/dashboard[^/]*', 'home',
    '.*', 'home'

)

ctx=dict()

dt = globals()
try:
    dt.pop('webvoting')
except:
    pass

def validate_header():
    print("set to text/html")
    web.header("Content-type","text/html; charset=utf-8")
app = web.application(urls, dt, autoreload=False)
#app.add_processor(web.loadhook(validate_header) )

render = web.template.render(cur_path +"/" #Template folder
    , base='base' #Template base
    , globals=dt
    , builtins=__builtins__ )

webss_uri = "ws://127.0.0.1:15679"
webss = dict() # =  asyncio.new_event_loop()
loops = dict()

def trace_error(fn, *args, **kw):
    def wrapped(*args, **kw):
        try:
            print(threading.current_thread().name, threading.current_thread().ident)
            s = fn(*args, **kw)
            s = str(s).replace('href="/', 'href="/').replace('src="/', 'src="/')
            return s
        except:
            return traceback.format_exc()
    return wrapped

def check_auth(fn, *args, **kw):
    def wrapped(*args, **kw):
        cookie = web.webapi.cookies()
        user_id = cookie.get('user_id')
        user_name = cookie.get('user_name')
        challenge = cookie.get('challenge')
        if user_id == None or user_name == None or challenge == None :
            print('not auth')
            return web.seeother("/login")
        else:
            req = Config()
            req.method='votingman'
            req.challenge=challenge
            req.user_id = user_id
            req.user_name = user_name
            req.ip_addr = web.ctx.ip

            ret = asyncio.get_event_loop().run_until_complete( proc_msg(req.dumps()) )

            obj = Config()
            obj.loads(ret)
            if obj.type != 'success':
                web.webapi.setcookie('user_id', '', expires= -1)
                web.webapi.setcookie('user_name', '', expires= -1)
                web.webapi.setcookie('challenge', '', expires= -1)
                return web.seeother("/login")


            print('yes auth:', cookie.get('user_id'))
            return fn(*args, **kw)
    return wrapped

def asyncio_enable(fn, *args, **kw):
    def wrapped(*args, **kw):
        thread_id = threading.current_thread().ident

        if not thread_id in loops.keys():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loops[thread_id] = loop
            print("new ", thread_id, loop)
        return fn(*args, **kw)

    return wrapped

async def get_websocket():
    global webss

    thread_id = threading.current_thread().ident
    if thread_id in webss.keys():
        if webss[thread_id].open:
            return webss[thread_id]

    try:
        global webss_uri
        ws = await websockets.connect(webss_uri)
        return ws
    except:
        raise BaseException("websocket conn failed " + webss_uri)

async def proc_msg(req):
    global webss
    ws = await get_websocket()
    await ws.send(req)
    ret = await ws.recv()
    if ret :
        return ret
    else:
        return '{"type":"error", "error":"无返回结果"}'



class fav_ico:
    def GET(self):
        name = os.path.join(cur_path, 'assert', "img", "pku.png")
        f = open(name, 'rb')
        blob= f.read()
        f.close()
        return blob

class static_assert:
    def GET(self, pre, text):
        name = os.path.join(cur_path, 'assert', text)
        f=open(name, 'rb')
        blob = f.read()
        f.close()
        print(name, pre, text)
        if name[-4:] == '.css':
            #pass
            print('set to text/css')
            web.header('Content-Type', 'text/css')
        elif name[-4:].lower() in ('.jpg', '.png', '.bmp','.gif'):
            tp = 'image/' + name[-3:].lower()
            web.header('Content-Type', tp)
        elif name[-5:].lower() == '.json':
            #pass
            web.header('Content-Type', 'application/json')
        elif name[-4:].lower() == '.map'or name[-3:].lower() == '.js':
            web.header('Content-Type', 'application/x-javascript')
        #print(web.webapi.header)
        return blob

class logout:
    @asyncio_enable
    @trace_error
    def GET(self):
        cookie = web.webapi.cookies()
        user_id = cookie.get('user_id')
        user_name = cookie.get('user_name')
        challenge = cookie.get('challenge')
        if user_id != None and user_name != None and challenge != None:
            req = Config()
            req.method="votingman"
            req.logout=1
            req.user_name = cookie.get('user_name')
            req.user_id = cookie.get('user_id')
            req.ip_addr = web.ctx.ip
            print(req.dumps())
            asyncio.get_event_loop().run_until_complete( proc_msg(req.dumps()) )
        web.webapi.setcookie('user_id', '', expires= -1)
        web.webapi.setcookie('user_name', '', expires= -1)
        web.webapi.setcookie('challenge', '', expires= -1)
        return web.seeother('/login')

class login:
    @trace_error
    def GET(self):
        if 'error' in ctx.keys():
            ctx.pop('error')
        return render.weblogin()


    @asyncio_enable
    @trace_error
    def POST(self):
        data = web.webapi.input()
        if data.get('user_id') == None or data.get('user_name') == None:
            ctx['error'] = '错误的工作证号或姓名，请重新输入'
            return render.weblogin()
        else:
            if 'error' in ctx.keys():
                ctx.pop('error')

            req = Config()
            req.method="votingman"
            req.login=1
            req.user_name = data.get('user_name')
            req.user_id = data.get('user_id')
            req.ip_addr = web.ctx.ip
            print(req.dumps())
            msg = asyncio.get_event_loop().run_until_complete( proc_msg(req.dumps()) )
            ret = Config()
            ret.loads(msg)
            if ret.type != 'success':
                ctx['error'] = '错误的工作证号或姓名，请重新输入'
                return render.weblogin()

            web.webapi.setcookie('user_id', data.get('user_id'))
            web.webapi.setcookie('user_name', data.get('user_name'))
            web.webapi.setcookie('challenge', ret.challenge)
            return web.seeother('/voting')

class voting_data:

    @asyncio_enable
    @trace_error
    def GET(self, pre, arg):
        req=Config()
        if arg == 'host_ip':
            req.method='host_ip'
        elif arg == 'votingman':
            req.method = 'votingman'
        elif arg == 'votingman/table.json':
            req.method = 'votingman'
            ret = asyncio.get_event_loop().run_until_complete( proc_msg(req.dumps()) )
            obj = Config()
            obj.loads(ret)
            return obj.result.dumps()
        elif arg == 'phd_list':
            pass
        ret = asyncio.get_event_loop().run_until_complete( proc_msg(req.dumps()) )
        return ret


class home:
    @asyncio_enable
    @check_auth
    @trace_error
    def GET(self):
        return render.webdashboard()

class voting:
    @asyncio_enable
    @check_auth
    @trace_error
    def GET(self):
        return render.webvoting()

if __name__ == "__main__":
    app.run()

