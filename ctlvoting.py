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
import traceback



from genpro import ProGenerator

from votingman import VotingManager

#global vars
#生成专家列表
proc_genpro = ProGenerator()

#发起投票
proc_votingman = VotingManager()

# websocket port
ws_port = 15678
ws_ip = '0.0.0.0'

if len(sys.argv) >=2:
    ws_port = sys.argv[1]
    #print('port', port)

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
        global proc_genpro
        ret = proc_genpro.proc_msg(msg)
        await ws.send(json.dumps(ret))
    elif method=="votingman":
        global proc_votingman
        #print('votingman', votingman.pro_json)
        ret = proc_votingman.proc_msg(msg)
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
        except Exception as e:
            #print(e)
            traceback.print_exc()
            ret = {'type':'error'}
            await ws.send(json.dumps(ret))
        sys.stdout.flush()
        sys.stderr.flush()

async def main_logic(websocket, path):
    try:
        await recv_msg(websocket)
    except:
        pass
        #print("recv_msg failed")
        #traceback.print_exc()

ws_server = websockets.serve(main_logic, ws_ip, ws_port)

asyncio.get_event_loop().run_until_complete(ws_server)
asyncio.get_event_loop().run_forever()
