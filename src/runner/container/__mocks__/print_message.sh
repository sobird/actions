#!/bin/bash
    
# 定义要输出的内容
message="Hello, World!"
    
# 循环五次
for i in {1..5}
  do
   echo $message $i
   # 每次输出后休眠一秒
   sleep 0.5
done