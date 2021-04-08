#!/usr/bin/env python
# -*- coding: utf-8 -*-
# Author: He Hao<hehaoslj@sina.com>
# Date: 2021-3-20
import os
import sys
import json
from mailmerge import MailMerge

import xlutils
from xlutils.filter import process,BaseFilter
from xlutils.filter import XLWTWriter
from xlutils.filter import XLRDReader
import xlrd
import xlwt

from datetime import date
import time
import hashlib

from base_config import Config

cur_path = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) > 2:
    cur_path= os.path.abspath(sys.argv[2])


class VotingManager(object):
    def __init__(self):
        self.pro_data = None
        self.phd_data = None
        self.pro_excel = None
        self.phd_excel = None
        self.filter = 0
        self.challenge= hashlib.md5(time.ctime().encode('utf-8')).hexdigest()


        self.word_file  = None

        self.voting_data=[] #[{pro_name:'专家王二', result:[{phd_name:'博士张三', vote:1},{phd_name:博士李四, vote:0}] },{pro_name:'专家2', result:[{phd_name:'博士张三', vote:1},{phd_name:博士李四, vote:0}] }]
        self.voting_status = 0
        self.pro_json = {}


        self.login_pros=dict()

        self.voting_start_time = None
        self.voting_stop_time  = None
        self.max_pro_num = 0

        self.get_pro_json()

    def proc_msg(self, msg):

        ret = {
            "method":"votingman",
            "type":"success"
        }

        gen_json = False

        #dashboard
        dashboard = msg.get('dashboard')
        if dashboard:
            return self.gen_dashboard()

        #voting : webvoting
        voting = msg.get('voting')
        if voting:
            return self.gen_voting()

        #update_vote : webvoting
        update_vote = msg.get('update_vote');
        if(update_vote):
            return self.update_vote(msg)

        #finish_vote : webvoting 完成投票
        finish_vote = msg.get('finish_vote');
        if(finish_vote):
            return self.finish_vote(msg)

        #challenge : webvoting 安全验证
        challenge = msg.get('challenge')
        if challenge:
            #print('challenge', msg)
            user_name = msg.get('user_name')
            user_id = msg.get('user_id')
            ip_addr= msg.get('ip_addr')
            key = user_name + '-' + user_id + '-'+ip_addr
            if challenge == self.challenge and key in self.login_pros.keys():
                return {"method":"challenge", 'type':'success'}
            else:
                if key in self.login_pros.keys():
                    self.login_pros.pop(key)
                #print('type failed')
                return {"method":"challenge", 'type':'failed'}

        #login ：webvoting 登录页面
        login = msg.get('login')
        if login:
            user_name = msg.get('user_name')
            user_id = msg.get('user_id')
            ip_addr= msg.get('ip_addr')
            if self.check_pro(user_name, user_id):
                user_pos = -1
                if user_name[:2] == '专家':
                    user_pos = int(user_name[2:]) -1
                pro_name = self.pro_data[0][1][2:] [user_pos][1]
                item = Config()
                item.user_name = user_name
                item.user_id = user_id
                item.ip_addr = ip_addr
                key = user_name + '-' + user_id + '-'+ip_addr
                self.login_pros[key] = item
                return {'method':'login', 'type':'success', 'challenge':self.challenge, 'pro_name':pro_name}
            else:
                return {'method':'login', 'type':'failed'}

        #logout : webvoting 注销
        logout = msg.get('logout')
        if logout:
            user_name = msg.get('user_name')
            user_id = msg.get('user_id')
            ip_addr= msg.get('ip_addr')
            key = user_name + '-' + user_id + '-'+ip_addr
            if key in self.login_pros.keys():
                self.login_pros.pop(key)
            return {'method':'logout', 'type':'success'}


        word_file = msg.get("word_file")
        if word_file:
            prop = {}
            prop['pici'] = msg.get('pici')
            prop['zongpici'] = msg.get('zongpici')
            prop['anno_from'] = msg.get('anno_from')
            prop['anno_to'] = msg.get('anno_to')
            self.gen_word_file(word_file, prop)
            return ret

        #更新状态 :voting
        gen_json_msg = msg.get('gen_json')
        if gen_json_msg:
            gen_json=True

        status = msg.get("status")
        if status:
            gen_json = True
            self.voting_status = int(status)
            self.pro_json['voting_status'] = self.voting_status
            if self.voting_status == 1:
                self.voting_start_time = time.time()
                self.max_pro_num = int(msg.get("max_pro_num"))
                self.voting_stop_time = None
            elif self.voting_status == 2:
                self.voting_stop_time = time.time()
            # update pro's voting status
            for pro in self.voting_data:
                if 'voting_status' in pro.keys():
                    pro['voting_status'] = self.voting_status

        phd_file = msg.get('phd_file')
        if phd_file:
            gen_json = True
            self.phd_excel = phd_file
            self.pro_json['phd_file'] = phd_file
            #print('phd_file', phd_file)
            self.phd_data = self.read_xls(phd_file)
            #重置投票状态
            self.voting_data=[]
            self.voting_status= 0

        pro_file = msg.get('pro_file')
        if pro_file:
            gen_json = True
            self.pro_excel = pro_file
            self.pro_json['pro_file'] = pro_file
            self.pro_data = self.read_xls(pro_file)
            #重置投票状态
            self.voting_data=[]
            self.voting_status= 0

        if gen_json:
            self.pro_json = self.gen_pro_json()

        #print(gen_json, self.pro_json)
        return self.pro_json

    def gen_word_file(self, word_name, prop={}):
        print('gen_word_file', word_name, prop)
        ret = {}
        ret['now'] = '{:%Y年%m月%d日 星期%w}'.format(date.today())
        ret['today'] = '{:%Y年-%m月-%d日}'.format(date.today())

        pro_list = None
        pro_count = 0

        if self.pro_data != None:
            if 0 in self.pro_data.keys():
                pro_list = self.pro_data[0][1][2:]
                pro_count = len(pro_list)

        phd_list = None
        phd_count = 0
        if self.phd_data != None:
            if 0 in self.phd_data.keys():
                phd_list = self.phd_data[0][1][2:]
                phd_count = len(phd_list)

        ret['pro_count'] = str(pro_count)
        ret['phd_count'] = str(phd_count)

        ret['year'] = '{:%Y}'.format(date.today())
        for k in prop.keys():
            ret[k] = str(prop[k])

        phd_result=[]

        for i in range(phd_count):
            # yes, no
            phd_result.append([0,0, phd_list[i][2]])

        for pro_voting in self.voting_data:
            if 'result' not in pro_voting:
                continue
            for phd_vote in pro_voting['result']:
                name = phd_vote['phd_name']
                vote_no = 0
                vote_yes = 0
                if phd_vote['vote'] == 1 :
                    vote_yes = 1
                if phd_vote['vote'] == 2:
                    vote_no = 1

                for i in range(phd_count):
                    phd_name = phd_list[i][2]
                    if phd_name == name:
                        phd_result[i][0] += vote_yes
                        phd_result[i][1] += vote_no
                        break
        #结果排序
        print('phd_result', phd_result)
        sort_key = lambda e:e[0]
        phd_result.sort(key=sort_key, reverse=True)
        if self.max_pro_num < phd_count:
            phd_result = phd_result[0:self.max_pro_num]
            phd_count = self.max_pro_num
        print('phd_result', phd_result)
        ret['result_count'] = str(phd_count)

        voting_result = []
        for i in range(phd_count):
            phd=phd_list[i]
            item= dict()
            item['t1_id'] = str(i+1)
            item['t1_name'] = phd_result[i][2]
            item['t1_yes'] = str( phd_result[i][0] )
            item['t1_no'] = str( phd_result[i][1] )

            voting_result.append(item)

        t2=list()
        for i in range(pro_count):
            pro = pro_list[i]
            item = dict()
            item['t2_id'] = str(i+1)
            item['t2_name'] = pro[1]
            item['t2_contact'] = str(pro[10]) + str(pro[11])
            item['t2_ticket'] = str(0)
            for pro_voting in self.voting_data:
                if pro_voting['pro_name'] != pro[1]:
                    continue
                if 'result' in pro_voting.keys():
                    item['t2_ticket'] = str( len( pro_voting['result'] ) )
                    break

            t2.append(item)

        t3=list()
        for i in range(phd_count):
            phd=phd_list[i]
            item= dict()
            item['t3_id'] = str(i+1)
            item['t3_name'] = phd[2]
            item['t3_contact'] = str(phd[9]) + str(phd[6])
            item['t3_ticket'] = str( phd_result[i][0] )
            t3.append(item)

        name = word_name
        name = name.replace('.doc', '').replace('.docx', '')
        name1 =name+ ".doc"
        print('dump word ', name1)
        doc_temp = os.path.join(cur_path, 'voting_template.docx')
        with MailMerge(doc_temp) as document:
            #print(document.get_merge_fields())
            document.merge(**ret)
            document.merge_rows('t1_id', voting_result)
            document.merge_rows('t1_id', voting_result)
            document.merge_rows('t2_id', t2)
            document.merge_rows('t3_id', t3)
            document.write(name1)

        name2 = name+'-公示.doc'
        print('dump word ', name2)
        doc_temp = os.path.join(cur_path, 'anno_template.docx')
        with MailMerge(doc_temp) as document:
            #print(document.get_merge_fields())
            document.merge(**ret)
            document.write(name2)


    def read_xls(self, name):
        try:
            book = xlrd.open_workbook(name)
        except:
            print("Open Excel(%s) failed!" % name)
        ctx=dict()
        for i in range(book.nsheets):
            s = book.sheet_by_index(i)
            sname = s.name
            svalue = list()
            for r in range(s.nrows):
                svalue.append( s.row_values(r) )
            ctx[i] = (sname, svalue)
        return ctx

    def gen_pro_json(self):
        #print('gen_pro_json')
        ret = self.pro_json

        ret['max_pro_num'] = self.max_pro_num

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
                ret['result']['data'][0][1]='专家Excel 文件格式不正确'
                return ret
        #print("pro_count", pro_count)
        phd_list = None
        phd_count = 0
        if self.phd_data != None:
            if 0 in self.phd_data.keys():
                phd_list = self.phd_data[0][1][2:]
                phd_count = len(phd_list)
                if phd_count == 0:
                    ret['result']['data'][0][2]='请选择博士后Excel'
                    return ret
                if len(phd_list[0]) < 11:
                    ret['result']['data'][0][1]='博士后Excel 文件格式不正确'
                    return ret
        #print("voting status ", self.voting_status)
        voting_status="未开始"
        if self.voting_status == 1:
            voting_status = "正在投票"
        elif self.voting_status == 2:
            voting_status = "停止投票"

        #print(ret)
        ret['result']['data'].clear()

        for i in range(pro_count):
            #print("pro", i)
            pro = pro_list[i]
            vote_count = 0
            vote_yes = 0

            for pro_voting in self.voting_data:
                if pro_voting['pro_name'] != pro[1]:
                    continue
                if 'voting_status' in pro_voting.keys():
                    if pro_voting['voting_status'] == 1:
                        voting_status = "正在投票"
                    elif pro_voting['voting_status'] == 2:
                        voting_status = "完成投票"
                if 'result' in pro_voting.keys():
                    vote_count = len ( pro_voting['result'] )
                    for vote in pro_voting['result']:
                        if vote['vote'] == 1:
                            vote_yes += 1
                    break
            item = list()
            item.append(i+1)
            item.append(pro[1])
            item.append(vote_yes)
            item.append(self.max_pro_num - vote_yes)
            #item.append(vote_count )
            #item.append(phd_count - vote_count)
            item.append(voting_status)
            #print(pro[1], vote_count, phd_cont)

            ret['result']['data'].append(item)
        return ret
    def get_pro_json(self):
        name = os.path.join(cur_path, "assert", "data", "table.json")
        #print(name)
        obj = None
        if os.path.exists(name) :
            f = open(name, 'rb')
            obj = json.load(f)
            #print(obj)
        else:
            obj = {}
        self.pro_json = {
            "method":'votingman',
            "type":'success',
            "phd_file":self.phd_excel,
            "pro_file":self.pro_excel,
            "voting":self.voting_status,
            "challenge":self.challenge,
            'result':obj,
            'max_pro_num':self.max_pro_num
        }

    def gen_dashboard(self):
        ret = {}
        ret['method'] = 'dashboard'

        ret['phd_list'] = []
        phd_list = None
        phd_count = 0
        if self.phd_data != None:
            if 0 in self.phd_data.keys():
                phd_list = self.phd_data[0][1][2:]
                phd_count = len(phd_list)
        if phd_count > 0:
            ret['phd_list'] = phd_list

        ret['pro_list'] = []
        pro_list = None
        pro_count = 0
        if self.pro_data != None:
            if 0 in self.pro_data.keys():
                pro_list = self.pro_data[0][1][2:]
                pro_count = len(pro_list)
        if pro_count >0:
            ret['pro_list'] = pro_list

        #voting data
        ret["voting_status"] = self.voting_status
        ret['voting_data'] = self.voting_data

        ret['time_start'] = self.voting_start_time or time.time() + 3600
        ret['time_stop'] = self.voting_stop_time or time.time() + 3600
        ret['max_pro_num'] = self.max_pro_num

        return ret
    def get_phd_list(self):
        phd_list = None
        phd_count = 0
        if self.phd_data != None:
            if 0 in self.phd_data.keys():
                phd_list = self.phd_data[0][1][2:]
                phd_count = len(phd_list)
        if phd_count > 0:
            return phd_list
        else:
            return []

    def gen_voting(self):
        ret = {}
        ret['method'] = 'voting'

        ret['voting_status'] = self.voting_status
        ret['phd_list'] = self.get_phd_list()
        ret['voting_data'] = self.voting_data

        return ret

    def finish_vote(self, msg):
        pro_name = msg.get('pro_name')
        if self.voting_status != 1:
            return {'type':'error','error':'投票未开始'}

        find_pro = False
        for pro in self.voting_data:
            if pro['pro_name'] != pro_name:
                continue
            pro['voting_status'] = 2 #停止投票
            break
        return {
            "method":"votingman",
            "type":"success"
        }

    def update_vote(self, msg):
        pro_name = msg.get('pro_name')
        phd_name = msg.get('phd_name')
        vote = msg.get('vote')

        if self.voting_status != 1:
            return {'type':'error', 'error':'投票未开始'}

        find=False
        for pro in self.voting_data:
            if pro['pro_name'] != pro_name:
                continue
            find = True
            if 'voting_status' in pro.keys():
                if pro['voting_status'] == 2:
                    return {'type':'error', 'error':'投票已经完成'}
            pro['voting_status'] = 1 #正在投票
            if 'result' not in pro.keys():
                pro['result']=[]
            result=pro['result']
            find_result = False
            for item in result:
                if  item['phd_name'] != phd_name:
                    continue
                find_result = True
                item['vote'] = vote
                break
            if not find_result:
                item ={}
                item['phd_name'] = phd_name
                item['vote'] = vote
                result.append(item)
            break
        if not find:
            pro={}
            pro['pro_name'] = pro_name
            pro['voting_status'] = 1 #正在投票
            result=[]
            item ={}
            item['phd_name'] = phd_name
            item['vote'] = vote
            result.append(item)
            pro['result'] = result
            self.voting_data.append(pro)
        return {
            "method":"votingman",
            "type":"success"
        }

    def check_pro(self, user_name, user_id):
        if self.pro_data == None:
            return False
        pro_list = list()
        pro_count = 0
        if 0 in self.pro_data.keys():
            pro_list = self.pro_data[0][1][2:]
            pro_count = len(pro_list)
            if pro_count == 0:
                return False
            if len(pro_list[0]) < 13:
                return False
        user_pos = -1
        if user_name[:2] == '专家':
            user_pos = int(user_name[2:]) -1
        print('check_pro', user_name, user_pos, user_id)
        for i in range(pro_count):
            pro = pro_list[i]
            print(i, pro[1], pro[12])
            if user_pos == i and pro[12] == user_id:
                return True
            if pro[1] == user_name and pro[12] == user_id:
                #print('check pro success',user_name)
                return True
        return False