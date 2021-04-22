#!/usr/bin/env python
# -*- coding: utf-8 -*-
# Author: He Hao<hehaoslj@sina.com>
# Date: 2021-3-20
import os
import sys
import enum
import json
import urllib

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

class XlReader(object):
    def __init__(self):
        self.ctx=dict()

    def clear(self):
        self.ctx=dict()

    def load_xls(self, name):
        print('xlreader load')
        try:
            book = xlrd.open_workbook(name)

            ctx=dict()
            for i in range(book.nsheets):
                s = book.sheet_by_index(i)
                sname = s.name
                svalue = list()
                for r in range(s.nrows):
                    svalue.append( s.row_values(r) )
                ctx[i] = (sname, svalue)

            self.ctx = ctx
        except:
            print("Open Excel(%s) failed!" % name)

class ProListManager(XlReader):
    xl_name_cols=dict(
        org=0,
        name=1,
        gender=2,
        title=6,
        first_class=7,
        plan=9,
        phone=10,
        email=11,
        id=12
    )
    def __init__(self):
        super().__init__()

        self.col_limit = max(self.xl_name_cols.values()) + 1
        self.cols = 0
        self.rows = 0
        self.key = []
        #print('pro list manager')
        #print(self.__dict__)

    def get_row(self, row):
        if row < self.rows:
            data = self.raw_data()
            return data[row]
        else:
            return []
    def get_name(self, row):
        if row < self.rows:
            data = self.raw_data()
            col_name = self.xl_name_cols['name']
            return data[row][col_name]
        else:
            return ''
    def raw_data(self):
        ctx = self.ctx
        if 0 in ctx.keys():
            #sheet index(0),  sheet value(1), rows start from(2)
            return ctx[0][1][2:]
        else:
            return list()

    def load(self, name):
        self.load_xls(name)

        data = self.raw_data()

        self.cols = 0
        self.key = []
        self.rows = len(data)

        if self.rows > 0:
            self.cols = len(data[0])

            col_name = self.xl_name_cols['name']
            for i in range(self.rows):
                key = data[i][col_name] + '__' + str(i)
                value = urllib.parse.quote(key)
                self.key.append(value)



    def __getattr__(self, name):
        data = self.raw_data()
        if name in self.xl_name_cols:
            col = self.xl_name_cols[name]
            values=list()
            for i in range(len(data)):
                values.append( data[i][col] )
            return values


class PhdListManager(XlReader):
    xl_name_cols=dict(
        order = 0,
        college_order = 1,
        name = 2,
        birthday = 3,
        phd_date = 4,
        title=5,
        teacher=6,
        teacher2=7,
        phd_org=8,
        org =9,
        reward = 10,
        first_class=11,
        college = 12)

    def raw_data(self):
        ctx = self.ctx
        if 0 in ctx.keys():
            #sheet index(0),  sheet value(1), rows start from(2)
            return ctx[0][1][2:]
        else:
            return list()

    def __init__(self):
        super().__init__()

        self.col_limit = max(self.xl_name_cols.values()) + 1
        self.cols = 0
        self.rows = 0
        self.key=[]

    def load(self, name):
        self.load_xls(name)

        data = self.raw_data()

        self.cols = 0
        self.key = []
        self.rows = len(data)

        if self.rows > 0:
            self.cols = len(data[0])

            col_name = self.xl_name_cols['name']
            for i in range(self.rows):
                key = data[i][col_name] + '__' + str(i)
                value = urllib.parse.quote(key)
                self.key.append(value)

    def __getattr__(self, name):
        data = self.raw_data()

        if name in self.xl_name_cols:
            col = self.xl_name_cols[name]
            values=list()
            for i in range(len(data)):
                values.append( data[i][col] )
                #print(data[i][col])
            return values


class VotingManager(object):
    def __init__(self):
        self.phd_list = PhdListManager()
        self.pro_list = ProListManager()

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

    def reset_vote(self):
        self.max_pro_num = 0
        self.voting_data = []
        self.voting_status = 0

    def proc_msg(self, msg):

        ret = {
            "method":"votingman",
            "type":"success"
        }

        gen_json = False

        #done: webdone
        done = msg.get('done')
        if done:
            return self.gen_done(msg)

        #dashboard: webvoting
        dashboard = msg.get('dashboard')
        if dashboard:
            return self.gen_dashboard()

        #voting : webvoting
        voting = msg.get('voting')
        if voting:
            return self.gen_voting()

        #update_vote : webvoting
        update_vote = msg.get('update_vote')
        if(update_vote):
            return self.update_vote(msg)

        #finish_vote : webvoting 完成投票
        finish_vote = msg.get('finish_vote')
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
                return {"method":"challenge", 'type':'error', 'error':'challenge failed'}

        #login ：webvoting 登录页面
        login = msg.get('login')
        if login:
            user_name = msg.get('user_name')
            user_id = msg.get('user_id')
            ip_addr= msg.get('ip_addr')
            if self.check_pro(user_name, user_id):
                pro_name = user_name
                if user_name[:2] == '专家':
                    user_pos = int(user_name[2:]) -1
                    pro_name = self.pro_list.get_name(user_pos)
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
            print("voting status: ", status)
            self.voting_status = int(status)
            self.pro_json['voting_status'] = self.voting_status
            if self.voting_status == 1:
                print('status 1')
                self.voting_start_time = time.time()
                self.max_pro_num = int(msg.get("max_pro_num"))
                self.voting_stop_time = None
                # fix 20210416 init voting status = 2
                if self.phd_list.rows == 0 or self.pro_list.rows == 0:
                    return {'method':'votingman', 'type':'error', 'error':'无投票数据，无法开始投票'}

                phd_names = self.phd_list.name
                phd_keys = self.phd_list.key
                pro_names = self.pro_list.name
                pro_keys = self.pro_list.key

                self.voting_data=[]
                for pro_idx in range(self.pro_list.rows):
                    result=[]
                    for phd_idx in range(self.phd_list.rows):
                        phd = dict(phd_name = phd_names[phd_idx],
                            phd_key = phd_keys[phd_idx],
                            vote = 2) #默认反对票
                        result.append(phd)

                    pro = dict(pro_name = pro_names[pro_idx],
                        pro_key = pro_keys[pro_idx],
                        voting_status = 0, #未开始
                        result = result)

                    self.voting_data.append(pro)
            elif self.voting_status == 2:
                self.voting_stop_time = time.time()
            # update pro's voting status
            for pro in self.voting_data:
                pro['voting_status'] = self.voting_status
            print(self.voting_data)

        phd_file = msg.get('phd_file')
        if phd_file:
            gen_json = True
            self.phd_excel = phd_file
            self.pro_json['phd_file'] = os.path.split(phd_file)[1]

            #print('begin phd load')
            self.phd_list.load(phd_file)
            #print('load phd list ',self.phd_list.col_limit, ' cols:', self.phd_list.cols)
            if self.phd_list.cols < self.phd_list.col_limit or self.phd_list.rows < 1:
                self.phd_list.clear()

                ret['type'] = 'error'
                ret['error'] = '博士后Excel 文件格式不正确, 行{} 列{}'.format(self.phd_list.cols, self.phd_list.rows )
                return ret


            print(self.phd_list.key)


            #重置投票状态
            self.reset_vote()

        pro_file = msg.get('pro_file')
        if pro_file:
            gen_json = True
            self.pro_excel = pro_file
            self.pro_json['pro_file'] = os.path.split(pro_file)[1]
            self.pro_list.load(pro_file)
            print('load pro list')
            print(self.pro_list.key)
            if self.pro_list.cols < self.pro_list.col_limit or self.pro_list.rows < 1:
                self.pro_list.clear()

                ret['type'] = 'error'
                ret['error'] = '专家Excel 文件格式不正确, 行{} 列{}'.format(self.phd_list.cols, self.phd_list.rows )
                return ret

            #重置投票状态
            self.reset_vote()


        if gen_json:
            self.pro_json = self.gen_pro_json()

        #print(gen_json, self.pro_json)
        return self.pro_json

    def gen_word_file(self, word_name, prop={}):
        print('gen_word_file', word_name, prop)
        ret = {}
        ret['now'] = '{:%Y年%m月%d日 星期%w}'.format(date.today())
        ret['today'] = '{:%Y年-%m月-%d日}'.format(date.today())


        pro_count = self.pro_list.rows

        phd_count = self.phd_list.rows


        ret['pro_count'] = str(pro_count)
        ret['phd_count'] = str(phd_count)

        ret['year'] = '{:%Y}'.format(date.today())
        for k in prop.keys():
            ret[k] = str(prop[k])

        phd_result=[]

        phd_keys = self.phd_list.key
        phd_names = self.phd_list.name
        phd_college = self.phd_list.college

        for idx in range(phd_count):
            # yes, no, name, key
            name = phd_names[idx]
            key = phd_keys[idx]
            college = phd_college[idx]
            phd_result.append([0, 0, name, key, college])

        for pro_voting in self.voting_data:
            if 'result' not in pro_voting:
                continue
            for phd_vote in pro_voting['result']:
                name = phd_vote['phd_name']
                key = phd_vote['phd_key']
                #print('key', key)
                pos = key.rfind('__')
                idx = int(key[pos+2:])

                vote_idx = 1
                if phd_vote['vote'] == 1 :
                    vote_idx = 0

                phd_result[idx][vote_idx] += 1

        #结果排序
        print('phd_result', phd_result)
        sort_key = lambda e:e[0]
        phd_result.sort(key=sort_key, reverse=True)

        # 2021-04-22 修改
        vote_pass=[]
        vote_block=[]
        vote_pass_idx = 0
        vote_block_idx = 0
        for idx in range(phd_count):
            vote_yes_result = phd_result[idx][0]

            # 投票率是否过半
            if vote_yes_result*2 >= pro_count:
                # 插入 表1
                item=dict(t1_id= str(vote_pass_idx+1),
                    t1_name= str(phd_result[idx][2]),
                    t1_yes=str(phd_result[idx][0]),
                    t1_no= str(phd_result[idx][1]),
                    t1_org = str(phd_result[idx][4]))
                vote_pass.append(item)
                vote_pass_idx += 1
            else:
                # 插入 表2
                item=dict(t2_id= str(vote_block_idx+1),
                    t2_name= str(phd_result[idx][2]),
                    t2_yes=str(phd_result[idx][0]),
                    t2_no= str(phd_result[idx][1]),
                    t2_org = str(phd_result[idx][4]))
                vote_block.append(item)
                vote_block_idx += 1


        result_count = phd_count
        if self.max_pro_num < phd_count:
            result_count = self.max_pro_num
            #phd_result = phd_result[0:self.max_pro_num]
            #phd_count = self.max_pro_num
        #print('phd_result', phd_result)
        ret['result_count'] = str(result_count)

        voting_result = []
        for i in range(result_count):
            #phd=phd_list[i]
            item= dict()
            item['t1_id'] = str(i+1)
            item['t1_name'] = phd_result[i][2]
            item['t1_yes'] = str( phd_result[i][0] )
            item['t1_no'] = str( phd_result[i][1] )

            voting_result.append(item)

        voting_remain50=[]
        # item= dict()
        # item['t3_id'] = 'a010'
        # item['t3_name'] = 'phd test'
        # item['t3_yes'] = '12'
        # item['t3_no'] = '0'
        # voting_remain50.append(item)
        voting_remain=[]
        if self.max_pro_num < phd_count:
            for i in range(phd_count - self.max_pro_num):
                idx = i + self.max_pro_num
                #phd = phd_list[idx]
                item= dict()
                item['t2_id'] = str(i+1)
                item['t2_name'] = phd_result[idx][2]
                item['t2_yes'] = str( phd_result[idx][0] )
                item['t2_no'] = str( phd_result[idx][1] )

                voting_remain.append(item)

                if phd_result[idx][0] * 2 >= self.max_pro_num:
                    item= dict()
                    item['t3_id'] = str(i+1)
                    item['t3_name'] = phd_result[idx][2]
                    item['t3_yes'] = str( phd_result[idx][0] )
                    item['t3_no'] = str( phd_result[idx][1] )
                    voting_remain50.append(item)

        # t2=list()
        # for i in range(pro_count):
        #     pro = pro_list[i]
        #     item = dict()
        #     item['t2_id'] = str(i+1)
        #     item['t2_name'] = pro[1]
        #     item['t2_contact'] = str(pro[10]) + str(pro[11])
        #     item['t2_ticket'] = str(0)
        #     for pro_voting in self.voting_data:
        #         if pro_voting['pro_name'] != pro[1]:
        #             continue
        #         if 'result' in pro_voting.keys():
        #             item['t2_ticket'] = str( len( pro_voting['result'] ) )
        #             break

        #     t2.append(item)

        # t3=list()
        # for i in range(phd_count):
        #     phd=phd_list[i]
        #     item= dict()
        #     item['t3_id'] = str(i+1)
        #     item['t3_name'] = phd[2]
        #     item['t3_contact'] = str(phd[9]) + str(phd[6])
        #     item['t3_ticket'] = str( phd_result[i][0] )
        #     t3.append(item)

        name = word_name
        print('name', name)
        name = name.replace('.doc', '').replace('.docx', '')
        name1 =name+ ".doc"
        print('dump word ', name1)
        doc_temp = os.path.join(cur_path, 'voting_template.docx')
        with MailMerge(doc_temp) as document:
            #print(document.get_merge_fields())
            document.merge(**ret)
            document.merge_rows('t1_id', vote_pass)
            document.merge_rows('t2_id', vote_block)

            #document.merge_rows('t1_id', voting_result)
            #document.merge_rows('t2_id', voting_remain)
            #document.merge_rows('t3_id', voting_remain50)

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

    def gen_done(self, msg):
        user_name = msg.get('user_name')
        if user_name == None:
            return {'method':'votingman', 'type':'error', 'error':'用户状态错误，请重新登录'}
        if user_name[:2] == '专家':
            user_pos = int(user_name[2:]) -1
            print(user_pos)
            data = self.voting_data[user_pos]
            print(data)

            return dict(voting_status=self.voting_status,
                result=data['result'])
        else:
            return {'method':'votingman', 'type':'error', 'error':'用户状态错误，请重新登录'}
    def gen_pro_json(self):
        #print('gen_pro_json')
        ret = self.pro_json

        ret['max_pro_num'] = self.max_pro_num


        #print("voting status ", self.voting_status)
        voting_status="未开始"
        if self.voting_status == 1:
            voting_status = "正在投票"
        elif self.voting_status == 2:
            voting_status = "停止投票"

        #print(ret)
        ret['result']['data'].clear()
        pro_names = self.pro_list.name

        for idx in range(self.pro_list.rows):
            #print("pro", i)
            #pro = pro_list[i]
            #vote_count = 0
            vote_yes = 0
            if len(self.voting_data) > idx:
                pro_voting = self.voting_data[idx]
                if pro_voting['voting_status'] == 1:
                    voting_status = "正在投票"
                elif pro_voting['voting_status'] == 2:
                    voting_status = "完成投票"
                for vote in pro_voting['result']:
                    if vote['vote'] == 1:
                        vote_yes += 1


            item = list()
            item.append(idx+1)
            item.append(pro_names[idx])
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

        ret['phd_list'] = self.phd_list.raw_data()


        ret['pro_list'] = self.pro_list.raw_data()

        #voting data
        ret["voting_status"] = self.voting_status
        ret['voting_data'] = self.voting_data

        ret['time_start'] = self.voting_start_time or time.time() + 3600
        ret['time_stop'] = self.voting_stop_time or time.time() + 3600
        ret['max_pro_num'] = self.max_pro_num

        return ret
    def get_phd_list(self):
        return self.phd_list.raw_data()

    def gen_voting(self):
        ret = {}
        ret['method'] = 'voting'

        ret['voting_status'] = self.voting_status
        ret['phd_list'] = self.get_phd_list()
        ret['voting_data'] = self.voting_data
        ret['max_pro_num'] = self.max_pro_num

        return ret

    def finish_vote(self, msg):
        pro_name = msg.get('pro_name')
        user_name = msg.get('user_name')
        if self.voting_status != 1:
            return {'method':'votingman', 'type':'error', 'error':'投票未开始'}

        try:
            if user_name[:2] == '专家':
                user_pos = int(user_name[2:]) -1
                self.voting_data[user_pos]['voting_status'] = 2  #停止投票
            else:
                for pro in self.voting_data:
                    if pro['pro_name'] == pro_name:
                        pro['voting_status'] = 2  #停止投票
            return {"method":"votingman", "type":"success"}
        except Exception as e:
            print(e)
            return {'method':'votingman', 'type':'error', 'error':str(e)}



    def update_vote(self, msg):
        pro_name = msg.get('pro_name')
        user_name = msg.get('user_name')
        phd_name = msg.get('phd_name')
        phd_id = msg.get('phd_id')
        vote = int(msg.get('vote'))

        # 判断项目投票状态
        if self.voting_status != 1:
            return {'method':'votingman', 'type':'error', 'error':'投票未开始'}

        # 判断输入
        phd_pos = phd_id.rfind('_index')
        if user_name[:2] != '专家' or phd_pos < 0:
            return {'method':'votingman', 'type':'error', 'error':'投票数据错误，请重新登录'}

        # 判断专家状态
        user_pos = int(user_name[2:]) -1
        pro = self.voting_data[user_pos]
        if pro['voting_status'] == 2:
            return {'method':'votingman', 'type':'error', 'error':'投票已经完成'}

        # 判读最大赞成票
        vote_yes_count = 0
        for item in pro['result']:
            if item['vote'] == 1:
                vote_yes_count += 1
        if vote_yes_count >= self.max_pro_num and vote == 1:
            return {'method':'votingman', 'type':'error', 'error':'你已经达到本次项目赞成票最大值，无法继续投赞成票'}

        # 正在投票
        pro['voting_status'] = 1

        # 更新投票结果
        phd_idx = int(phd_id[phd_pos+len('_index'):])
        pro['result'][phd_idx]['vote'] = vote

        return {'method':'votingman', 'type':'success'}

    def check_pro(self, user_name, user_id):
        pro_names = self.pro_list.name
        pro_ids = self.pro_list.id
        user_pos = -1
        if user_name[:2] == '专家':
            try:
                user_pos = int(user_name[2:]) -1
                print('check_pro', user_name, user_pos, user_id)
                if len(pro_ids) > user_pos:
                    if pro_ids[user_pos] == user_id:
                        return True
            except Exception as e:
                print(e)
        else:
            for idx in range(len(pro_names)):
                if pro_names[idx] == user_name and pro_ids[idx] == user_id:
                    #print('check pro success',user_name)
                    return True
        return False