#!/usr/bin/env python
# -*- coding: utf-8 -*-
# Author: He Hao<hehaoslj@sina.com>
# Date: 2021-3-20

import json

import xlutils
from xlutils.filter import process,BaseFilter
from xlutils.filter import XLWTWriter
from xlutils.filter import XLRDReader
import xlrd
import xlwt

#json 模版
pro_json = {
    "header": [
        {
        "name": "id",
        "title": "序号",
        "size": 100,
        "sortable": True,
        "sortDir": "asc",
        "format": "number"
        },
        {
        "name": "name",
        "title": "姓名",
        "size":200,
        "sortable": True
        },
        {
        "name": "start",
        "title": "简介",
        "sortable": True
        },
        {
        "name": "age",
        "title": "工作单位",
        "sortable": True,
        "size": 300
        },
        {
        "name": "salary",
        "title": "工作证号",
        "sortable": True,
        "size": 150,
        "show": True
        }
        ],
        "data":[[
        1,
        "没有数据",
        "请选择专家Excel",
        0,
        ""
        ]]
}

# 生成excel
class PhdFilter(BaseFilter):
    def __init__(self, pro_rows):
        self.wrow = 0
        self.pro_rows = pro_rows
    def row(self, rdrowx, wtrowx):
        if rdrowx in self.pro_rows:
            #print(rdrowx)
            self.wrow += 1
            self.next.row(rdrowx,self.wrow-1)


    def cell(self,rdrowx,rdcolx,wtrowx,wtcolx):
        if rdrowx in self.pro_rows :
            self.next.cell(rdrowx,rdcolx,self.wrow-1,wtcolx)

class ProGenerator(object):
    def __init__(self):
        self.pro_data = None
        self.phd_data = None
        self.pro_excel = None
        self.phd_excel = None
        self.filter = 3
        self.pro_rows=list()

    def proc_msg(self, msg):
        dump_file= msg.get('dump_file')
        if dump_file:
            print('genpro :dump file')
            self.gen_pro_excel(dump_file)
            return {}

        phd_file = msg.get('phd_file')
        if phd_file:
            self.phd_excel = phd_file
            self.phd_data = self.read_xls(phd_file)

        pro_file = msg.get('pro_file')
        if pro_file:
            self.pro_excel = pro_file
            self.pro_data = self.read_xls(pro_file)

        filter = msg.get('filter')
        if filter:
            self.filter = int(filter)

        data = self.gen_pro_json()
        ret = {
            "method":'genpro',
            "type":'success',
            "phd_file":self.phd_excel,
            "pro_file":self.pro_excel,
            "filter":self.filter,
            'return':data
        }
        print(ret)
        return ret
        #ws.send(json.dumps(ret))

    def gen_pro_excel(self, name):
        if self.pro_excel and self.pro_data:
            book = xlrd.open_workbook(self.pro_excel, formatting_info=False)
            wt = XLWTWriter()
            process(XLRDReader(book, "test.xlsx"), PhdFilter(self.pro_rows), wt)
            print(wt.output[0][1])
            print(name)
            wt.output[0][1].save(name)

    def gen_pro_json(self):
        global pro_json
        ret = pro_json

        pro_list = None
        pro_count = 0

        if self.pro_data == None:
            return ret

        if 0 in self.pro_data.keys():
            pro_list = self.pro_data[0][1][2:]
            pro_count = len(pro_list)
            if pro_count == 0:
                return ret
            if len(pro_list[0]) < 13:
                ret['data'][0][1]='专家Excel 文件格式不正确'
                return ret

        phd_list = None
        phd_count = 0
        if self.phd_data != None:
            if 0 in self.phd_data.keys():
                phd_list = self.phd_data[0][1][2:]
                phd_count = len(phd_list)
                if phd_count == 0:
                    ret['data'][0][2]='请选择博士后Excel'
                    return ret
                if len(phd_list[0]) < 11:
                    ret['data'][0][1]='博士后Excel 文件格式不正确'
                    return ret

        ret['data'].clear()

        self.pro_rows.clear()
        self.pro_rows.append(0)
        self.pro_rows.append(1)

        id = 0
        for i in range(pro_count):
            pro = pro_list[i]
            item = list()
            item.append(i+1)
            item.append(pro[1])
            item.append(','.join((str(pro[2]), str(pro[6]), str(pro[7]), str(pro[11]), str(pro[10]))) )
            item.append(pro[0])
            item.append(pro[12])

            remove = False
            name = pro[1]
            if self.filter & 1:
                # 剔除博士后导师
                for j in range(phd_count):
                    phd = phd_list[j]
                    if phd[6] == name:
                        remove = True
                        break
            if self.filter & 2:
                # 剔除博士后校外导师
                for j in range(phd_count):
                    phd = phd_list[j]
                    if phd[7] == name:
                        remove = True
                        break
            if not remove:
                id = id +1
                item[0] = id
                ret['data'].append(item)
                self.pro_rows.append(i+2)
        return ret
    def read_xls(self, name):
        book = None
        try:
            #print("opening ", name)
            book = xlrd.open_workbook(name)
        except Exception as e:
            print("Open Excel(%s) failed as (%s)!" % (name, str(e)) )
        #print('opened ', book)
        if not book:
            return {}

        ctx=dict()
        for i in range(book.nsheets):
            s = book.sheet_by_index(i)
            sname = s.name
            svalue = list()
            for r in range(s.nrows):
                svalue.append( s.row_values(r) )
            ctx[i] = (sname, svalue)
        return ctx


