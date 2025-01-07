---
title: 弄懂Redis数据结构和实战（下）
description: 系统总结Redis相关知识（第三弹）
pubDatetime: 2023-12-19
published: true
ogImage: ../../assets/18.png
language: cn
tags:
  - 后端技术
---

我们都知道 Redis 提供了丰富的数据类型，常见的有五种：**String（字符串），Hash（哈希），List（列表），Set（集合）、Zset（有序集合）**。<br />随着 Redis 版本的更新，后面又支持了四种数据类型：**BitMap（2.2 版新增）、HyperLogLog（2.8 版新增）、GEO（3.2 版新增）、Stream（5.0 版新增）**。

> 学习目标：能说出每种数据结构的大体底层实现，及其相关的应用场景！

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1700720278845-e002ddce-fda7-448a-aaac-99dc15ef3435.png#averageHue=%23efeedb&from=url&height=348&id=Q26Am&originHeight=348&originWidth=729&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=&width=729)

---

本文讲解的类型为BitMap、HyperLogLog、GEO、Stream。<br />一口吃不成胖子，慢工出细活，稳稳来！

# BitMap

Bitmap，即位图，是一串连续的二进制数组（0和1），可以通过偏移量（offset）定位元素。BitMap通过最小的单位bit来进行0|1的设置，表示某个元素的值或者状态，时间复杂度为O(1)。<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1702898643621-dc9fa849-4fd3-46ab-af1e-7bd7cc95910e.png#averageHue=%23efefef&clientId=ueaa68421-828d-4&from=paste&id=u24052adb&originHeight=104&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=uade2299d-acdb-4a32-9936-b219428d23b&title=)

### 实现细节

Bitmap 本身是用 String 类型作为底层数据结构实现的一种统计二值状态的数据类型。<br />String 类型是会保存为二进制的字节数组，所以，Redis 就把字节数组的每个 bit 位利用起来，用来表示一个元素的二值状态，你可以把 Bitmap 看作是一个 bit 数组。

## 常用命令

> 基本操作：

```c
# 设置值，其中value只能是 0 和 1
SETBIT key offset value

# 获取值
GETBIT key offset

# 获取指定范围内值为 1 的个数
# start 和 end 以字节为单位
BITCOUNT key start end
```

> 运算操作：

```c
# BitMap间的运算
# operations 位移操作符，枚举值
  AND 与运算 &
  OR 或运算 |
  XOR 异或 ^
  NOT 取反 ~
# result 计算的结果，会存储在该key中
# key1 … keyn 参与运算的key，可以有多个，空格分割，not运算只能一个key
# 当 BITOP 处理不同长度的字符串时，较短的那个字符串所缺少的部分会被看作 0。返回值是保存到 destkey 的字符串的长度（以字节byte为单位），和输入 key 中最长的字符串长度相等。
BITOP [operations] [result] [key1] [keyn…]

# 返回指定key中第一次出现指定value(0/1)的位置
BITPOS [key] [value]
```

## 应用场景

Bitmap 类型非常适合二值状态统计的场景，这里的二值状态就是指集合元素的取值就只有 0 和 1 两种，在记录海量数据时，Bitmap 能够有效地节省内存空间。

### 签到统计

记录某天签到

```c
SETBIT uid:sign:100:202206 2 1
```

检测是否签到

```c
GETBIT uid:sign:100:202206 2
```

统计某月签到次数

```c
BITCOUNT uid:sign:100:202206
```

记录首次签到情况

```c
BITPOS uid:sign:100:202206 1
```

注意的是，因为 offset 从 0 开始的，所以我们需要将返回的 value + 1 。

### 判断用户登陆状态

key = login_status 表示存储用户登陆状态集合数据， 将用户 ID 作为 offset，在线就设置为 1，下线设置 0。通过 GETBIT判断对应的用户是否在线。50000 万 用户只需要 6 MB 的空间。

```c
#登录
SETBIT login_status 10086 1
#检查
GETBIT login_status 10086
#登出
SETBIT login_status 10086 0
```

### 连续签到用户数

```c
# 与操作
BITOP AND destmap bitmap:01 bitmap:02 bitmap:03
# 统计 bit 位 =  1 的个数
BITCOUNT destmap
```

---

# HyperLogLog

**每个 HyperLogLog 键只需要花费 12 KB 内存，就可以计算接近 2^64 个不同元素的基数。**

> 注意：标准误算率是0.81%

## 常用命令

```c
# 添加指定元素到 HyperLogLog 中
PFADD key element [element ...]

# 返回给定 HyperLogLog 的基数估算值。
PFCOUNT key [key ...]

# 将多个 HyperLogLog 合并为一个 HyperLogLog
PFMERGE destkey sourcekey [sourcekey ...]
```

## 应用场景

### 百万级网页UV计数

Redis HyperLogLog 优势在于只需要花费 12 KB 内存，就可以计算接近 2^64 个元素的基数，和元素越多就越耗费内存的 Set 和 Hash 类型相比，HyperLogLog 就非常节省空间。<br />所以，非常适合统计百万级以上的网页 UV 的场景。

```c
PFADD page1:uv user1 user2 user3 user4 user5
PFCOUNT page1:uv
```

> 注意，是否合适，可以根据数据量来进行评定，你若是百万级别的数据统计，那么影响不大，但如果是精确统计，且范围不大，最好还是不要使用。

# GEO

（Location-Based Service）LBS 应用访问的数据是和人或物关联的一组经纬度信息，而且要能查询相邻的经纬度范围，GEO 就非常适合应用在 LBS 服务的场景中。

## 实现细节

GEO 本身并没有设计新的底层数据结构，而是直接使用了 Sorted Set 集合类型。<br />GEO 类型使用 GeoHash 编码方法实现了经纬度到 Sorted Set 中元素权重分数的转换，这其中的两个关键机制就是「对二维地图做区间划分」和「对区间进行编码」。一组经纬度落在某个区间后，就用区间的编码值来表示，并把编码值作为 Sorted Set 元素的权重分数。<br />这样一来，我们就可以把经纬度保存到 Sorted Set 中，利用 Sorted Set 提供的“按权重进行有序范围查找”的特性，实现 LBS 服务中频繁使用的“搜索附近”的需求。

## 常用命令

```c
# 存储指定的地理空间位置，可以将一个或多个经度(longitude)、纬度(latitude)、位置名称(member)添加到指定的 key 中。
GEOADD key longitude latitude member [longitude latitude member ...]

# 从给定的 key 里返回所有指定名称(member)的位置（经度和纬度），不存在的返回 nil。
GEOPOS key member [member ...]

# 返回两个给定位置之间的距离。
GEODIST key member1 member2 [m|km|ft|mi]

# 根据用户给定的经纬度坐标来获取指定范围内的地理位置集合。
GEORADIUS key longitude latitude radius m|km|ft|mi [WITHCOORD] [WITHDIST] [WITHHASH] [COUNT count] [ASC|DESC] [STORE key] [STOREDIST key]
```

## 应用场景

### 滴滴大车

存入

```c
GEOADD cars:locations 116.034579 39.030452 33
```

附近（查找以这个经纬度为中心的 5 公里内的车辆信息，并返回给 LBS 应用）

```c
GEORADIUS cars:locations 116.054579 39.030452 5 km ASC COUNT 10
```

# Stream

Redis Stream 是 Redis 5.0 版本新增加的数据类型，Redis 专门为消息队列设计的数据类型。解决了使用List来做消息队列的弊端。它不仅支持自动生成全局唯一 ID，而且支持以消费组形式消费数据。

## 常见命令

- XADD：插入消息，保证有序，可以自动生成全局唯一 ID；
- XREAD：用于读取消息，可以按 ID 读取数据；
- XREADGROUP：按消费组形式读取消息；
- XPENDING 和 XACK：
  - XPENDING 命令可以用来查询每个消费组内所有消费者已读取但尚未确认的消息，而 XACK 命令用于向消息队列确认消息处理已完成。

## 应用场景

### 消息队列

生产者通过XADD插入一条消息：（插入成功后会返回全局唯一的 ID）

```c
# * 表示让 Redis 为插入的数据自动生成一个全局唯一的 ID
# 往名称为 mymq 的消息队列中插入一条消息，消息的键是 name，值是 xiaolin
> XADD mymq * name xiaolin
"1654254953808-0"
```

消费者跳过XREAD读取消息：

```c
# 从 ID 号为 1654254953807-0 的消息开始，读取后续的所有消息（示例中一共 1 条）。
> XREAD Stream mymq 1654254953807-0
1) 1) "mymq"
   2) 1) 1) "1654254953808-0"
         2) 1) "name"
            2) "xiaolin"
```

它也支持block读取：

```c
# 命令最后的“$”符号表示读取最新的消息
> XREAD block 10000 Stream mymq $
(nil)
(10.00s)
```

还支持消费组进行读取：

```c
# 创建一个名为 group1 的消费组
> XGROUP create mymq group1 0
OK
```

被消费者读取后，就不会再被其他读取

```c
# 命令最后的参数“>”，表示从第一条尚未被消费的消息开始读取。
> XREADGROUP group group1 consumer1 Stream mymq >
1) 1) "mymq"
   2) 1) 1) "1654254953808-0"
         2) 1) "name"
            2) "xiaolin"
```

```c
> XREADGROUP group group1 consumer1 Stream mymq >
(nil)
```

### 可靠性保证

Streams 会自动使用内部队列（也称为 PENDING List）留存消费组里每个消费者读取的消息，直到消费者使用 XACK 命令通知 Streams“消息已经处理完成”。<br />如果消费者没有成功处理消息，它就不会给 Streams 发送 XACK 命令，消息仍然会留存。此时，**消费者可以在重启后，用 XPENDING 命令查看已读取、但尚未确认处理完成的消息**。

```c
127.0.0.1:6379> XPENDING mymq group2
1) (integer) 3
2) "1654254953808-0"  # 表示 group2 中所有消费者读取的消息最小 ID
3) "1654256271337-0"  # 表示 group2 中所有消费者读取的消息最大 ID
4) 1) 1) "consumer1"
      2) "1"
   2) 1) "consumer2"
      2) "1"
   3) 1) "consumer3"
      2) "1"
```

```c
# 查看 group2 里 consumer2 已从 mymq 消息队列中读取了哪些消息
> XPENDING mymq group2 - + 10 consumer2
1) 1) "1654256265584-0"
   2) "consumer2"
   3) (integer) 410700
   4) (integer) 1
```

### 可替代性讨论

一个专业的消息队列，必须要做到：消息不丢、消息可积堆。

- 三大块：**生产者、队列中间件、消费者**

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1702900882032-9da1864d-f969-499a-ba28-7b275565706f.png#averageHue=%23eddbda&clientId=ueaa68421-828d-4&from=paste&id=u2b37ca9a&originHeight=286&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=udb527232-b1aa-4e97-a8c9-d9f490008d3&title=)

> 消息会丢失吗？

- 生产者不会，因为失败可以重发。
- 消费者不会，因为XPENDING提供了支持。
- 队列中间会，不管是主从复制还是AOP，都存在延迟。
  > 消息可积堆吗？

Redis 的数据都存储在内存中，这就意味着一旦发生消息积压，则会导致 Redis 的内存持续增长，如果超过机器内存上限，就会面临被 OOM 的风险。所以 Redis 的 Stream 提供了可以指定队列最大长度的功能，就是为了避免这种情况发生。

> 总结。

- Redis 本身可能会丢数据；
- 面对消息挤压，内存资源会紧张；

故业务场景足够简单，对于数据丢失不敏感，而且消息积压概率比较小的情况下，把 Redis 当作队列是完全可以的。

---

# 总结

Redis 数据类型的底层数据结构随着版本的更新也有所不同，比如：

- 在 Redis 3.0 版本中 List 对象的底层数据结构由「双向链表」或「压缩表列表」实现，但是在 3.2 版本之后，List 数据类型底层数据结构是由 quicklist 实现的；
- 在最新的 Redis 代码中，压缩列表数据结构已经废弃了，交由 listpack 数据结构来实现了。

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1702901076651-7a5ca93b-bf13-45d6-8154-6aabbc577e48.png#averageHue=%23faf7ed&clientId=ueaa68421-828d-4&from=paste&id=u4513ff34&originHeight=663&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=ua99fe4d1-6047-4d24-838b-12b8dda434e&title=)<br />Redis 五种数据类型的应用场景：

- String 类型的应用场景：缓存对象、常规计数、分布式锁等。
- List 类型的应用场景：消息队列（有两个问题：1. 生产者需要自行实现全局唯一 ID；2. 不能以消费组形式消费数据）等。
- Hash 类型：缓存对象、购物车等。
- Set 类型：聚合计算（并集、交集、差集）场景，比如点赞、共同关注、抽奖活动等。
- Zset 类型：排序场景，比如排行榜、电话和姓名排序等。

Redis 后续版本又支持四种数据类型，它们的应用场景如下：

- BitMap（2.2 版新增）：二值状态统计的场景，比如签到、判断用户登陆状态、连续签到用户总数等；
- HyperLogLog（2.8 版新增）：海量数据基数统计的场景，比如百万级网页 UV 计数等；
- GEO（3.2 版新增）：存储地理位置信息的场景，比如滴滴叫车；
- Stream（5.0 版新增）：消息队列，相比于基于 List 类型实现的消息队列，有这两个特有的特性：自动生成全局唯一消息ID，支持以消费组形式消费数据。

针对 Redis 是否适合做消息队列，关键看你的业务场景：

- 如果你的业务场景足够简单，对于数据丢失不敏感，而且消息积压概率比较小的情况下，把 Redis 当作队列是完全可以的。
- 如果你的业务有海量消息，消息积压的概率比较大，并且不能接受数据丢失，那么还是用专业的消息队列中间件吧。

### 参考资源

- 《Redis 核心技术与实战》
- https://www.cnblogs.com/hunternet/p/12742390.html
- https://www.cnblogs.com/qdhxhz/p/15669348.html
- https://www.cnblogs.com/bbgs-xc/p/14376109.html
- http://kaito-kidd.com/2021/04/19/can-redis-be-used-as-a-queue/
