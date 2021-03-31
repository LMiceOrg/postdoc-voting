#coding: utf-8
import sys
import os

import asyncio
import websockets
import json
import socket
import xlrd

#global vars
phd_data = None
pro_data = None

def get_host_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('1.255.255.255', 65535))
        ip = s.getsockname()[0]
    finally:
        s.close()
    return ip

def read_xls(name):
    try:
        book = xlrd.open_workbook(name)
    except:
        print("Open Excel(%s) failed!" % name)

    for i in range(book.nsheets):
        s = book.sheet_by_index(i)
        sname = s.name
        svalue = list()
        for r in range(s.nrows):
            svalue.append( s.row_values(r) )
        ctx[i] = (sname, svalue)
    return ctx



#生成json
def gen_pro():
    ret = {
  "header": [
    {
      "name": "id",
      "title": "ID",
      "size": 50,
      "sortable": True,
      "sortDir": "asc",
      "format": "number"
    },
    {
      "name": "name",
      "title": "Name",
      "sortable": True
    },
    {
      "name": "start",
      "title": "Start",
      "sortable": True,
      "size": 150,
      "format": "date",
      "formatMask": "dd-mm-yyyy"
    },
    {
      "name": "age",
      "title": "Age",
      "sortable": True,
      "size": 80
    },
    {
      "name": "salary",
      "title": "Salary",
      "sortable": True,
      "size": 150,
      "format": "money",
      "show": True
    }
  ],
  "data":[]
    }
    return ret

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

        phd_file = msg.get('phd_file')
        if phd_file:
            phd_data = read_xls(phd_file)

        pro_file = msg.get('pro_file')
        if pro_file:
            pro_data = read_xls(pro_file)

        data = gen_pro()
        ret = {
            "method":method,
            "type":'success',
            'return':data
        }
        await ws.send(json.dumps(ret))

    else:
        ret = {'type':'unknown'}
        await ws.send(json.dumps(ret))

async def recv_msg(websocket):
    while True:
        recv_text = await websocket.recv()
        try:
            msg = json.loads(recv_text)
            await proc_msg(websocket, msg)
        except:
            ret = {'type':'error'}
            await ws.send(json.dumps(ret))

async def main_logic(websocket, path):
    await recv_msg(websocket)

port = 5678
if len(sys.argv) >=2:
    port = sys.argv[1]
ws_server = websockets.serve(main_logic, '0.0.0.0', port)

asyncio.get_event_loop().run_until_complete(ws_server)
asyncio.get_event_loop().run_forever()
