---
title: 弄懂Redis数据结构和实战（中）
description: 系统总结Redis相关知识（第二弹）
pubDatetime: 2023-12-18
published: true
ogImage: ../../assets/17.png
language: cn
tags:
  - 后端技术
---
我们都知道 Redis 提供了丰富的数据类型，常见的有五种：**String（字符串），Hash（哈希），List（列表），Set（集合）、Zset（有序集合）**。<br />随着 Redis 版本的更新，后面又支持了四种数据类型：**BitMap（2.2 版新增）、HyperLogLog（2.8 版新增）、GEO（3.2 版新增）、Stream（5.0 版新增）**。
> 学习目标：能说出每种数据结构的大体底层实现，及其相关的应用场景！

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1700720278845-e002ddce-fda7-448a-aaac-99dc15ef3435.png#averageHue=%23efeedb&from=url&height=348&id=Q26Am&originHeight=348&originWidth=729&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=&width=729)

---

本文讲解的类型为Set、Zset。<br />一口吃不成胖子，慢工出细活，稳稳来！
# Set
Set 类型是一个无序并唯一的键值集合，它的存储顺序不会按照插入的先后顺序进行存储。一个集合最多可以存储 2^32-1 个元素。在数学和逻辑和计算机逻辑中，操作基本支持。
> 注意：只能存储非重复的元素！

## 实现细节
Set 类型的底层数据结构是由哈希表或整数集合实现的：

- 如果集合中的元素都是整数且元素个数小于 512 （默认值，set-maxintset-entries配置）个，Redis 会使用整数集合作为 Set 类型的底层数据结构；
- 如果集合中的元素不满足上面条件，则 Redis 使用哈希表作为 Set 类型的底层数据结构。
## 关于整数集合
```python
//集合定义
typedef struct intset {

    // 编码方式
    uint32_t encoding;

    // 集合包含的元素数量
    uint32_t length;

    // 保存元素的数组
    int8_t contents[];

} intset;
```
![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696743880730-f51d6a12-db6c-4977-a532-3a96d07b975d.png?x-oss-process=image%2Fresize%2Cw_552%2Climit_0#averageHue=%23f2f2f2&from=url&id=pvKbg&originHeight=234&originWidth=552&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)
### 升级的好处
> **核心：控制编码实现优化。**

何为升级？即统一编码，存取更大的数。<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696744361822-2ad631df-b393-47d3-a5d9-050c3e349720.png?x-oss-process=image%2Fresize%2Cw_750%2Climit_0#averageHue=%23f0f0f0&from=url&id=lpC82&originHeight=189&originWidth=750&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)<br />有何好处？

- 提升整数集合的灵活性（不必在意于类型大小）。
- 尽可能地节约内存（用适合的内存存取数）。

有无降级操作？

- 一旦对数组进行了升级， 编码就会一直保持升级后的状态，但可以进行删除操作。
## 常用命令
> 分为两部分，即常用的操作和运算操作。

SADD/SREM
```c
# 往集合key中存入元素，元素存在则忽略，若key不存在则新建
SADD key member [member ...]
# 从集合key中删除元素
SREM key member [member ...] 
# 获取集合key中所有元素
SMEMBERS key
# 获取集合key中的元素个数
SCARD key

# 判断member元素是否存在于集合key中
SISMEMBER key member

# 从集合key中随机选出count个元素，元素不从key中删除
SRANDMEMBER key [count]
# 从集合key中随机选出count个元素，元素从key中删除
SPOP key [count]
```
```c
# 交集运算
SINTER key [key ...]
# 将交集结果存入新集合destination中
SINTERSTORE destination key [key ...]

# 并集运算
SUNION key [key ...]
# 将并集结果存入新集合destination中
SUNIONSTORE destination key [key ...]

# 差集运算
SDIFF key [key ...]
# 将差集结果存入新集合destination中
SDIFFSTORE destination key [key ...]
```
## 应用场景
因为Set本身的特性，可以用来数据去重的相关操作。
> 注意：**Set 的差集、并集和交集的计算复杂度较高，在数据量较大的情况下，如果直接执行这些计算，会导致 Redis 实例阻塞**。

在主从库集群中，我们可以选择从库来完成聚合统计，或者返回数据给客户端，让客户端做聚合统计。
### 点赞
保证点赞唯一：
```c
# uid:1 用户对文章 article:1 点赞
> SADD article:1 uid:1
(integer) 1
# uid:2 用户对文章 article:1 点赞
> SADD article:1 uid:2
(integer) 1
# uid:3 用户对文章 article:1 点赞
> SADD article:1 uid:3
(integer) 1
```
取消点赞：
```c
> SREM article:1 uid:1
(integer) 1
```
获取所有点赞用户：
```c
> SMEMBERS article:1
1) "uid:3"
2) "uid:2"
```
判断用户是否点赞
```c
> SISMEMBER article:1 uid:1
(integer) 0  # 返回0说明没点赞，返回1则说明点赞了
```
### 共同关注
```c
# 获取共同关注
> SINTER uid:1 uid:2
1) "7"
2) "8"
3) "9"
```
给uid:2推荐uid:1的关注：
```c
> SDIFF uid:1 uid:2
1) "5"
2) "6"
```
验证是否共同关注：
```c
> SISMEMBER uid:1 5
(integer) 1 # 返回0，说明关注了
> SISMEMBER uid:2 5
(integer) 0 # 返回0，说明没关注
```
### 抽奖活动
```c
>SADD lucky Tom Jerry John Sean Marry Lindy Sary Mark
(integer) 5
```
允许重复中奖
```c
# 抽取 1 个一等奖：
> SRANDMEMBER lucky 1
1) "Tom"
# 抽取 2 个二等奖：
> SRANDMEMBER lucky 2
1) "Mark"
2) "Jerry"
# 抽取 3 个三等奖：
> SRANDMEMBER lucky 3
1) "Sary"
2) "Tom"
3) "Jerry"
```
不允许重复中奖
```c
# 抽取一等奖1个
> SPOP lucky 1
1) "Sary"
# 抽取二等奖2个
> SPOP lucky 2
1) "Jerry"
2) "Mark"
# 抽取三等奖3个
> SPOP lucky 3
1) "John"
2) "Sean"
3) "Lindy"
```

---

# Zset
> 比Set多了一个score字段。

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1702875486936-fb31f853-f497-4998-a1bf-3f23293b7eaa.png#averageHue=%23faf7f7&clientId=ua7beb556-aae7-4&from=paste&id=u24f05427&originHeight=543&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=ud9274d00-d3e6-4aff-9efc-2b2ffe74ec5&title=)
## 实现细节
Zset 类型的底层数据结构是由压缩列表或跳表实现的：

- 如果有序集合的元素个数小于 128 个，并且每个元素的值小于 64 字节时，Redis 会使用压缩列表作为 Zset 类型的底层数据结构；
- 如果有序集合的元素不满足上面的条件，Redis 会使用跳表作为 Zset 类型的底层数据结构；

在 Redis 7.0 中，压缩列表数据结构已经废弃了，交由 listpack 数据结构来实现了。
### 关于跳表
> 核心：层数+链表索引。

```c
//节点定义
typedef struct zskiplistNode {

    // 后退指针
    struct zskiplistNode *backward;

    // 分值
    double score;

    // 成员对象
    robj *obj;

    // 层
    struct zskiplistLevel {

        // 前进指针
        struct zskiplistNode *forward;

        // 跨度
        unsigned int span;

    } level[];

} zskiplistNode;

//跳表结构定义
typedef struct zskiplist {

    // 表头节点和表尾节点
    struct zskiplistNode *header, *tail;

    // 表中节点的数量
    unsigned long length;

    // 表中层数最大的节点的层数
    int level;

} zskiplist;
```
![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696743690009-aee733b9-2cb1-4510-84c0-6924ee90f8b9.png?x-oss-process=image%2Fresize%2Cw_699%2Climit_0#averageHue=%23f4f4f4&from=url&id=VmGn5&originHeight=543&originWidth=699&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)
> 何为跳表？即链表上使用索引来进行更快的查找。

- 跳跃表是有序集合的底层实现之一， 除此之外它在 Redis 中没有其他应用。
- Redis 的跳跃表实现由 zskiplist 和 zskiplistNode 两个结构组成， 其中 zskiplist 用于保存跳跃表信息（比如表头节点、表尾节点、长度）， 而 zskiplistNode 则用于表示跳跃表节点。
- 每个跳跃表节点的层高都是 1 至 32 之间的随机数。
- 在同一个跳跃表中， 多个节点可以包含相同的分值， 但每个节点的成员对象必须是唯一的。
- 跳跃表中的节点按照分值大小进行排序， 当分值相同时， 节点按照成员对象的大小进行排序。
### 关于压缩列表
上面多次提到了这个压缩列表，但是它不是很符合我们对Redis这个数据结构的认识，所以放到这里来进行介绍。
> 列表构成

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696744930481-fd374728-c834-4cd8-8f4e-60e0147de8b0.png#averageHue=%23eeeeee&clientId=u2e4e8616-0f7f-4&from=paste&id=u9f1af756&originHeight=118&originWidth=509&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u98be6c09-d588-4f9f-90a6-1d203cec248&title=)

| 属性 | 类型 | 长度 | 用途 |
| --- | --- | --- | --- |
| zlbytes | uint32_t | 4 字节 | 记录整个压缩列表占用的内存字节数：在对压缩列表进行内存重分配， 或者计算 zlend 的位置时使用。 |
| zltail | uint32_t | 4 字节 | 记录压缩列表表尾节点距离压缩列表的起始地址有多少字节： 通过这个偏移量，程序无须遍历整个压缩列表就可以确定表尾节点的地址。 |
| zllen | uint16_t | 2 字节 | 记录了压缩列表包含的节点数量： 当这个属性的值小于 UINT16_MAX （65535）时， 这个属性的值就是压缩列表包含节点的数量； 当这个值等于 UINT16_MAX 时， 节点的真实数量需要遍历整个压缩列表才能计算得出。 |
| entryX | 列表节点 | 不定 | 压缩列表包含的各个节点，节点的长度由节点保存的内容决定。 |
| zlend | uint8_t | 1 字节 | 特殊值 0xFF （十进制 255 ），用于标记压缩列表的末端。 |

> 节点构成

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696745066599-efc2ec78-45ac-4945-b2e8-2d381eade96c.png#averageHue=%23ececec&clientId=u2e4e8616-0f7f-4&from=paste&id=u5a610444&originHeight=118&originWidth=366&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=uca16a4b0-507c-4312-997f-7f30a5ce5fb&title=)

- 节点的 previous_entry_length 属性以字节为单位， 记录了压缩列表中前一个节点的长度。
- 节点的 encoding 属性记录了节点的 content 属性所保存数据的类型以及长度。
- 节点的 content 属性负责保存节点的值， 节点值可以是一个字节数组或者整数， 值的类型和长度由节点的 encoding 属性决定。
> 关于连锁更新的思考：出现频率低，不会耗性能。

两种设想的更新情况：（记录长度要进行扩展更新），连锁更新的最坏复杂度为 O(N^2) <br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696745876434-d8edd6a1-1dae-4d3c-a961-45f99c20e378.png#averageHue=%23f3f3f3&clientId=u2e4e8616-0f7f-4&from=paste&id=u629eae42&originHeight=171&originWidth=511&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u565b9245-2595-4ee5-9012-0825511b85a&title=)<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696745892280-4f969374-6468-41a3-85b1-cfc153d018b2.png#averageHue=%23f3f3f3&clientId=u2e4e8616-0f7f-4&from=paste&id=u2fe4406a&originHeight=214&originWidth=565&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=ub9f6b736-719c-4ab1-85ed-d2a360e5db7&title=)<br />但是，现实这种情况基本不会出现，时间复杂度为O(N) 

- 首先， 压缩列表里要恰好有多个连续的、长度介于 250 字节至 253 字节之间的节点， 连锁更新才有可能被引发， 在实际中， 这种情况并不多见；
- 其次， 即使出现连锁更新， 但只要被更新的节点数量不多， 就不会对性能造成任何影响： 比如说， 对三五个节点进行连锁更新是绝对不会影响性能的；
## 常用命令
ZADD/ZREM
> 常用操作。

```c
# 往有序集合key中加入带分值元素
ZADD key score member [[score member]...]   
# 往有序集合key中删除元素
ZREM key member [member...]                 
# 返回有序集合key中元素member的分值
ZSCORE key member
# 返回有序集合key中元素个数
ZCARD key 

# 为有序集合key中元素member的分值加上increment
ZINCRBY key increment member 

# 正序获取有序集合key从start下标到stop下标的元素
ZRANGE key start stop [WITHSCORES]
# 倒序获取有序集合key从start下标到stop下标的元素
ZREVRANGE key start stop [WITHSCORES]

# 返回有序集合中指定分数区间内的成员，分数由低到高排序。
ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]

# 返回指定成员区间内的成员，按字典正序排列, 分数必须相同。
ZRANGEBYLEX key min max [LIMIT offset count]
# 返回指定成员区间内的成员，按字典倒序排列, 分数必须相同
ZREVRANGEBYLEX key max min [LIMIT offset count]
```
> Zset运算。

不支持差集运算。
```c
# 并集计算(相同元素分值相加)，numberkeys一共多少个key，WEIGHTS每个key对应的分值乘积
ZUNIONSTORE destkey numberkeys key [key...] 
# 交集计算(相同元素分值相加)，numberkeys一共多少个key，WEIGHTS每个key对应的分值乘积
ZINTERSTORE destkey numberkeys key [key...]
```
## 应用场景
在面对需要展示最新列表、排行榜等场景时，如果数据更新频繁或者需要分页显示，可以优先考虑使用 Sorted Set。
### 排行榜
```c
# arcticle:1 文章获得了200个赞
> ZADD user:xiaolin:ranking 200 arcticle:1
(integer) 1
# arcticle:2 文章获得了40个赞
> ZADD user:xiaolin:ranking 40 arcticle:2
(integer) 1
# arcticle:3 文章获得了100个赞
> ZADD user:xiaolin:ranking 100 arcticle:3
(integer) 1
# arcticle:4 文章获得了50个赞
> ZADD user:xiaolin:ranking 50 arcticle:4
(integer) 1
# arcticle:5 文章获得了150个赞
> ZADD user:xiaolin:ranking 150 arcticle:5
(integer) 1
```
新增：
```c
> ZINCRBY user:xiaolin:ranking 1 arcticle:4
"51"
```
查看
```c
> ZSCORE user:xiaolin:ranking arcticle:4
"50"
```
获赞最多
```c
# WITHSCORES 表示把 score 也显示出来
> ZREVRANGE user:xiaolin:ranking 0 2 WITHSCORES
1) "arcticle:1"
2) "200"
3) "arcticle:5"
4) "150"
5) "arcticle:3"
6) "10
```
100-200赞的文章
```c
> ZRANGEBYSCORE user:xiaolin:ranking 100 200 WITHSCORES
1) "arcticle:3"
2) "100"
3) "arcticle:5"
4) "150"
5) "arcticle:1"
6) "200"
```
### 电话、姓名排序
使用有序集合的 ZRANGEBYLEX 或 ZREVRANGEBYLEX 可以帮助我们实现电话号码或姓名的排序，我们以 ZRANGEBYLEX （返回指定成员区间内的成员，按 key 正序排列，分数必须相同）为例。<br />注意：不要在分数不一致的 SortSet 集合中去使用 ZRANGEBYLEX和 ZREVRANGEBYLEX 指令，因为获取的结果会不准确。
> 电话排序

可以将电话号码存储到SortSet中，然后根据需要来获取号段。
```c
> ZADD phone 0 13100111100 0 13110114300 0 13132110901 
(integer) 3
> ZADD phone 0 13200111100 0 13210414300 0 13252110901 
(integer) 3
> ZADD phone 0 13300111100 0 13310414300 0 13352110901 
(integer) 3
```
获取所有号码
```c
> ZRANGEBYLEX phone - +
1) "13100111100"
2) "13110114300"
3) "13132110901"
4) "13200111100"
5) "13210414300"
6) "13252110901"
7) "13300111100"
8) "13310414300"
9) "13352110901"
```
获取132号段的号码
```c
> ZRANGEBYLEX phone [132 (133
1) "13200111100"
2) "13210414300"
3) "13252110901"
```
获取132、133号段的号码
```c
> ZRANGEBYLEX phone [132 (134
1) "13200111100"
2) "13210414300"
3) "13252110901"
4) "13300111100"
5) "13310414300"
6) "13352110901"
```
> 姓名排序

```c
> zadd names 0 Toumas 0 Jake 0 Bluetuo 0 Gaodeng 0 Aimini 0 Aidehua 
(integer) 6
```
获取所有人名字
```c
> ZRANGEBYLEX names - +
1) "Aidehua"
2) "Aimini"
3) "Bluetuo"
4) "Gaodeng"
5) "Jake"
6) "Toumas"
```
获取所有名字大写字母A开头的所有人
```c
> ZRANGEBYLEX names [A (B
1) "Aidehua"
2) "Aimini"
```
获取所有大写字母C到Z的所有人
```c
> ZRANGEBYLEX names [C [Z
1) "Gaodeng"
2) "Jake"
3) "Toumas"
```
