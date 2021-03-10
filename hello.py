#coding: utf-8
import sys
import os

#print "OS name is ", os.name
if __name__ == "__main__":
    inp = sys.stdin.readlines()
    #inp = "hello"
    print('<div style="color:#ff3300">' + '<br>'.join(inp)  + "</div>")
    sys.stdout.flush()