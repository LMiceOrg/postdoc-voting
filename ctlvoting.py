#!/usr/bin/env python
# -*- coding: utf-8 -*-
# Author: He Hao<hehaoslj@sina.com>
# Date: 2021-3-20

"""
投票系统控制软件

"""

import sys
import os

import asyncio
import websockets
import json
import socket



from genpro import ProGenerator

from votingman import VotingManager

#global vars
#生成专家列表
genpro = ProGenerator()

#发起投票
votingman = VotingManager()

# websocket port
port = 5678
if len(sys.argv) >=2:
    port = sys.argv[1]

def get_host_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('1.255.255.255', 65535))
        ip = s.getsockname()[0]
    finally:
        s.close()
    return ip

async def proc_msg(ws, msg):
    method = msg.get('method')
    if method == 'host_ip':
        ip=get_host_ip()
        ret = {
            "method":method,
            "type":'success',
            'return':ip
        }
        await ws.send(json.dumps(ret))
    elif method=='genpro':
        #print('genpro')
        global genpro
        ret = genpro.proc_msg(msg)
        await ws.send(json.dumps(ret))
    elif method=="votingman":
        global votingman
        #print('votingman', votingman.pro_json)
        ret = votingman.proc_msg(msg)
        await ws.send(json.dumps(ret))
    else:
        ret = {
            'method':method,
            'type':'error',
            "message":"不支持此操作"
        }
        await ws.send(json.dumps(ret))

async def recv_msg(ws):
    while True:
        recv_text = await ws.recv()
        #print(recv_text)
        try:
            msg = json.loads(recv_text)
            #print(msg)
            await proc_msg(ws, msg)
        except:
            ret = {'type':'error'}
            await ws.send(json.dumps(ret))

async def main_logic(websocket, path):
    try:
        await recv_msg(websocket)
    except:
        print("recv_msg failed")

ws_ip = get_host_ip()
ws_ip = '0.0.0.0'
ws_server = websockets.serve(main_logic, ws_ip, port)

asyncio.get_event_loop().run_until_complete(ws_server)
asyncio.get_event_loop().run_forever()
