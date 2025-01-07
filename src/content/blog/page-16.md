---
title: 弄懂Redis数据结构和实战（上）
description: 系统总结Redis相关知识（第一弹）
pubDatetime: 2023-12-15
published: true
ogImage: ../../assets/16.png
language: cn
tags:
  - 后端技术
---

我们都知道 Redis 提供了丰富的数据类型，常见的有五种：**String（字符串），Hash（哈希），List（列表），Set（集合）、Zset（有序集合）**。<br />随着 Redis 版本的更新，后面又支持了四种数据类型：**BitMap（2.2 版新增）、HyperLogLog（2.8 版新增）、GEO（3.2 版新增）、Stream（5.0 版新增）**。

> 学习目标：能说出每种数据结构的大体底层实现，及其相关的应用场景！

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1700720278845-e002ddce-fda7-448a-aaac-99dc15ef3435.png#averageHue=%23efeedb&from=url&height=348&id=Q26Am&originHeight=348&originWidth=729&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=&width=729)

---

本文讲解的类型为Set、Zset。<br />一口吃不成胖子，慢工出细活，稳稳来！

# String

String 是最基本的 key-value 结构，key 是唯一标识，value 是具体的值，value其实不仅是字符串， 也可以是数字（整数或浮点数），value 最多可以容纳的数据长度是 **512M**。

> 大体的源码结构如下：

```c
struct sdshdr {

    // 记录 buf 数组中已使用字节的数量
    // 等于 SDS 所保存字符串的长度
    int len;

    // 记录 buf 数组中未使用字节的数量
    int free;

    // 字节数组，用于保存字符串
    char buf[];

};
```

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696655833191-ff14cff9-8795-4420-be68-2a02e22923d6.png?x-oss-process=image%2Fresize%2Cw_356%2Climit_0#averageHue=%23f5f5f5&from=url&id=Zqc6K&originHeight=234&originWidth=356&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

## 对比原生C字符串

SDS，简单动态字符串，和我们认为的C字符串不一样。

| C 字符串                                         | SDS                                              |
| ------------------------------------------------ | ------------------------------------------------ |
| 获取字符串长度的复杂度为 O(N) 。                 | 获取字符串长度的复杂度为 O(1) 。                 |
| API 是不安全的，可能会造成缓冲区溢出。           | API 是安全的，不会造成缓冲区溢出。               |
| 修改字符串长度 N 次必然需要执行 N 次内存重分配。 | 修改字符串长度 N 次最多需要执行 N 次内存重分配。 |
| 只能保存文本数据。                               | 可以保存文本或者二进制数据。                     |
| <br />                                           | <br />                                           |

> 为什么安全，且获取长度是O(1)，并且可以存二进制数据？

因为他通过**len长度和free长度来进行维护**判断是否结束，有无剩余空间，这样也不会造成缓冲区溢出。

> value其实不仅是字符串， 也可以是数字（整数或浮点数），如何实现多态性？

通过编码实现，有三种编码方式：**int，embstr，raw**。<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1702601258919-f3dbd479-4541-48c5-bcc0-aa4baf1f6f91.png#averageHue=%23df8832&clientId=uc996aacd-f268-4&from=paste&id=u50042114&originHeight=428&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u36cd362c-32ee-460d-aca7-5d874afb477&title=)<br />如下是每个情况的内存分布图：<br />这个字符申的长度小于等于 32 字节，使用embstr，否则使用raw格式。<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1702601381924-23fadd05-78f6-4b05-83ab-39009ba00a48.png#averageHue=%23f7e0e0&clientId=uc996aacd-f268-4&from=paste&id=u3261656d&originHeight=453&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u10631c42-2506-405f-96b0-ab1eebb94d8&title=)<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1702601387106-e8289025-dad8-443a-8a53-e6c6618eb065.png#averageHue=%23f6e7e7&clientId=uc996aacd-f268-4&from=paste&id=u76bf44ff&originHeight=155&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=uc73c69a1-5ccb-48f7-95e3-37a064735a5&title=)<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1702601390844-62285a83-9a65-4acc-9f06-b3a979928c5d.png#averageHue=%23f9eeee&clientId=uc996aacd-f268-4&from=paste&id=uc10e440c&originHeight=266&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u2c6e7b3d-f4ba-4a3e-aeb4-4bb4096281b&title=)

> 为什么使用embstr？（分配一块连续的内存空间来保存redisObject和SDS）

- 内存分配次数从 raw 编码的两次降低为一次；
- 只需要调用一次内存释放函数；
- 数据都保存在一块连续的内存里面可以更好的利用 CPU 缓存提升性能。

但是也有缺点。

- 如果字符串的长度增加需要重新分配内存时。
- 整个redisObject和sds都需要重新分配空间，所以embstr编码的字符串对象实际上是只读的，redis没有为embstr编码的字符串对象编写任何相应的修改程序。当我们对embstr编码的字符串对象执行任何修改命令（例如append）时，程序会先将对象的编码从embstr转换成raw，然后再执行修改命令。

## 常用指令

> 普通字符串的基本操作（SET/GET）

```c
# 设置 key-value 类型的值
> SET name lin
OK
# 根据 key 获得对应的 value
> GET name
"lin"
# 判断某个 key 是否存在
> EXISTS name
(integer) 1
# 返回 key 所储存的字符串值的长度
> STRLEN name
(integer) 3
# 删除某个 key 对应的值
> DEL name
(integer) 1
```

> 批处理设置（MSET/MGET）

```c
# 批量设置 key-value 类型的值
> MSET key1 value1 key2 value2
OK
# 批量获取多个 key 对应的 value
> MGET key1 key2
1) "value1"
2) "value2"
```

> 计数器（value为整数的时候使用）（INCRBY/DECRBY）

```c
# 设置 key-value 类型的值
> SET number 0
OK
# 将 key 中储存的数字值增一
> INCR number
(integer) 1
# 将key中存储的数字值加 10
> INCRBY number 10
(integer) 11
# 将 key 中储存的数字值减一
> DECR number
(integer) 10
# 将key中存储的数字值键 10
> DECRBY number 10
(integer) 0
```

> 过期（默认永远不会过期）（秒为单位）

EX表示存在则覆写。

```c
# 设置 key 在 60 秒后过期（该方法是针对已经存在的key设置过期时间）
> EXPIRE name  60
(integer) 1
# 查看数据还有多久过期
> TTL name
(integer) 51

#设置 key-value 类型的值，并设置该key的过期时间为 60 秒
> SET key  value EX 60
OK
> SETEX key  60 value
OK
```

> 不存在就插入

```c
# 不存在就插入（not exists）
>SETNX key value
(integer) 1
```

## 应用场景

### 缓存对象

使用String缓存对象有两种方式

- 直接缓存整个1对象的JSON
- 采用Key进行分离为user:ID:属性，用MSET/MGET批量处理。

```c
SET user:1 '{"name":"xiaolin", "age":18}'

MSET user:1:name xiaolin user:1:age 18 user:2:name xiaomei user:2:age 20
```

### 常规计数

> 注意：Redis的单线程，是针对于网络交互而言的单线程。

因为 Redis 处理命令是单线程，所以执行命令的过程是原子的。因此 String 数据类型适合计数场景，比如计算访问次数、点赞、转发、库存数量等等。

```c
# 初始化文章的阅读量
> SET aritcle:readcount:1001 0
OK
#阅读量+1
> INCR aritcle:readcount:1001
(integer) 1
#阅读量+1
> INCR aritcle:readcount:1001
(integer) 2
#阅读量+1
> INCR aritcle:readcount:1001
(integer) 3
# 获取对应文章的阅读量
> GET aritcle:readcount:1001
"3"
```

### 分布式锁

SET 命令有个 NX 参数可以实现「key不存在才插入」，可以用它来实现分布式锁：

- 如果 key 不存在，则显示插入成功，可以用来表示加锁成功；
- 如果 key 存在，则会显示插入失败，可以用来表示加锁失败。

```c
SET lock_key unique_value NX PX 10000
```

> 注意，下面这种写法是错误的，他设置和时间不是原子性的，会导致一个后果就是，时间命令没有执行，而前面锁却一直占用，导致死锁问题。

```c
setnx lkey lvalue expire lockKey 30
```

而对于解锁，要防止乱删，所以这个时候，要进行判断，这个是两个操作，要保证原子性，可以使用Lua脚本保证原子性。

```c
// 释放锁时，先比较 unique_value 是否相等，避免锁的误释放
if redis.call("get",KEYS[1]) == ARGV[1] then
    return redis.call("del",KEYS[1])
else
    return 0
end
```

---

# List

List 列表是简单的字符串列表，按照插入顺序排序，可以从头部或尾部向 List 列表添加元素。列表的最大长度为 2^32 - 1，也即每个列表支持超过 40 亿个元素。

> 用C语言描述，大体如下：

```c
//节点
typedef struct listNode {

    // 前置节点
    struct listNode *prev;

    // 后置节点
    struct listNode *next;

    // 节点的值
    void *value;

} listNode;

//链表
typedef struct list {

    // 表头节点
    listNode *head;

    // 表尾节点
    listNode *tail;

    // 链表所包含的节点数量
    unsigned long len;

    // 节点值复制函数
    void *(*dup)(void *ptr);

    // 节点值释放函数
    void (*free)(void *ptr);

    // 节点值对比函数
    int (*match)(void *ptr, void *key);

} list;
```

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696655854471-473abd86-aff7-41ab-939d-bfbc9b79c6c4.png?x-oss-process=image%2Fresize%2Cw_720%2Climit_0#averageHue=%23f7f7f7&from=url&id=dBQ7r&originHeight=431&originWidth=720&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

## 实现细节

List 类型的底层数据结构是由双向链表或压缩列表实现的：

- 如果列表的元素个数小于 512 个（默认值，可由 list-max-ziplist-entries 配置），列表每个元素的值都小于 64 字节（默认值，可由 list-max-ziplist-value 配置），Redis 会使用压缩列表作为 List 类型的底层数据结构；
- 如果列表的元素不满足上面的条件，Redis 会使用双向链表作为 List 类型的底层数据结构；

但是在 Redis 3.2 版本之后，List 数据类型底层数据结构就只由 quicklist 实现了，替代了双向链表和压缩列表。<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1702603692295-155755be-2273-4d41-b2d1-e64e390d3278.png#averageHue=%23fbf9f9&clientId=uc996aacd-f268-4&from=paste&id=u07297974&originHeight=382&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u144d2e03-4cc3-46a4-aeaa-b4f7ec455f1&title=)

## 常用命令

> PUSH、POP

```c
# 将一个或多个值value插入到key列表的表头(最左边)，最后的值在最前面
LPUSH key value [value ...]
# 将一个或多个值value插入到key列表的表尾(最右边)
RPUSH key value [value ...]
# 移除并返回key列表的头元素
LPOP key
# 移除并返回key列表的尾元素
RPOP key

# 返回列表key中指定区间内的元素，区间以偏移量start和stop指定，从0开始
LRANGE key start stop

# 从key列表表头弹出一个元素，没有就阻塞timeout秒，如果timeout=0则一直阻塞
BLPOP key [key ...] timeout
# 从key列表表尾弹出一个元素，没有就阻塞timeout秒，如果timeout=0则一直阻塞
BRPOP key [key ...] timeout
```

## 应用场景

双端队列模型，很适合用来做为消息队列，在实际情况中，我们也经常如此使用。

> 消息队列在存取消息时，必须要满足三个需求，分别是**消息保序、处理重复的消息和保证消息可靠性**。

### 1.做好消息保序

其实这点实现非常简单，只需要保证一方生产，一方消费即可。<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1702603930052-cac40959-ef98-4290-abd9-7b13238086b1.png#averageHue=%23f1f1f1&clientId=uc996aacd-f268-4&from=paste&id=udf6d69eb&originHeight=246&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=ue42ccd48-1c8a-4b8f-a875-9dad8321db6&title=)<br />但有一些问题，如果生产者没有数据，另外一端一直调用消费，会导致CPU的大量消耗。因为Redis提供了BROP命令。**BRPOP命令也称为阻塞式读取，客户端在没有读到队列数据时，自动阻塞，直到有新的数据写入队列，再开始读取新数据**。这样节省了CPU开销。<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1702604004319-fb988076-2d88-4738-868c-29a416da26c1.png#averageHue=%23fcf9f9&clientId=uc996aacd-f268-4&from=paste&id=ufa99610b&originHeight=628&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u807d7b1a-31fb-479d-8418-94d23848168&title=)

### 2、处理重复消息

实现重复消息，那核心点在于如何判断是否重复消息？为每条消息，生产一个全局ID。

```c
> LPUSH mq "111000102:stock:99"
(integer) 1
```

在处理的时候，和已处理的消费者ID去对比，即可。

### 3、保证消息可靠性

List若没有备份，如果消费者程序在处理消息的过程出现了故障或宕机，就会导致消息没有处理完成，那么，消费者程序再次启动后，就没法再次从 List 中读取消息了。

> 使用**BRPOPLPUSH **命令，这个命令的**作用是让消费者程序从一个 List 中读取消息，同时，Redis 会把这个消息再插入到另一个 List（可以叫作备份 List）留存**。

这样，有问题，可以从备份获取消息，从而再次处理。

### 4、生产消费不平衡

用List做生产消费者，有一个问题在于可能存在生产消费不平衡。而Redis的List不支持消费组实现。<br />解决方法只能从5.0版本开始说起来了，Stream 同样能够满足消息队列的三大需求，而且它还支持「消费组」形式的消息读取。

---

# Hash

Hash 是一个键值对（key - value）集合，其中 value 的形式入：**value=[{field1，value1}，...{fieldN，valueN}]，适合进行对象存储。**<br />底层代码如下：

```c
//表定义
typedef struct dictht {

    // 哈希表数组
    dictEntry **table;

    // 哈希表大小
    unsigned long size;

    // 哈希表大小掩码，用于计算索引值
    // 总是等于 size - 1
    unsigned long sizemask;

    // 该哈希表已有节点的数量
    unsigned long used;

} dictht;

//节点
typedef struct dictEntry {

    // 键
    void *key;

    // 值
    union {
        void *val;
        uint64_t u64;
        int64_t s64;
    } v;

    // 指向下个哈希表节点，形成链表
    struct dictEntry *next;

} dictEntry;

```

```c
//字典的定义
typedef struct dict {

    // 类型特定函数
    dictType *type;

    // 私有数据
    void *privdata;

    // 哈希表
    dictht ht[2];

    // rehash 索引
    // 当 rehash 不在进行时，值为 -1
    int rehashidx; /* rehashing not in progress if rehashidx == -1 */

} dict;

//操作
typedef struct dictType {

    // 计算哈希值的函数
    unsigned int (*hashFunction)(const void *key);

    // 复制键的函数
    void *(*keyDup)(void *privdata, const void *key);

    // 复制值的函数
    void *(*valDup)(void *privdata, const void *obj);

    // 对比键的函数
    int (*keyCompare)(void *privdata, const void *key1, const void *key2);

    // 销毁键的函数
    void (*keyDestructor)(void *privdata, void *key);

    // 销毁值的函数
    void (*valDestructor)(void *privdata, void *obj);

} dictType;
```

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696649458227-2673a83b-2391-4485-8f5a-469da833838f.png?x-oss-process=image%2Fresize%2Cw_721%2Climit_0#averageHue=%23f6f6f6&from=url&id=RZiwB&originHeight=532&originWidth=721&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

## 实现细节

Hash 类型的底层数据结构是由压缩列表或哈希表实现的：

- 如果哈希类型元素个数小于 512 个（默认值，可由 hash-max-ziplist-entries 配置），所有值小于 64 字节（默认值，可由 hash-max-ziplist-value 配置）的话，Redis 会使用压缩列表作为 Hash 类型的底层数据结构；
- 如果哈希类型元素不满足上面条件，Redis 会使用哈希表作为 Hash 类型的 底层数据结构。

在 Redis 7.0 中，压缩列表数据结构已经废弃了，交由 listpack 数据结构来实现了。

### 渐进式ReHash

> 核心点：信号量+渐近式

可以发现，在上面，他多留出了一个空的字典，目的其实是为了ReHash，何时ReHash呢？

> 何时进行收缩与与扩展？看负载因子load factor

```c
# 负载因子 = 哈希表已保存节点数量 / 哈希表大小
load_factor = ht[0].used / ht[0].size
```

1. 服务器目前没有在执行 BGSAVE 命令或者 BGREWRITEAOF 命令， 并且哈希表的负载因子大于等于 1
2. 服务器目前正在执行 BGSAVE 命令或者 BGREWRITEAOF 命令， 并且哈希表的负载因子大于等于 5
3. 当哈希表的负载因子小于 0.1 时， 程序自动开始对哈希表执行收缩操作。

   > 如何进行ReHash？以2的n次方幂扩大和缩小。

4. 为字典的 ht[1] 哈希表分配空间， 这个哈希表的空间大小取决于要执行的操作， 以及 ht[0] 当前包含的键值对数量 （也即是 ht[0].used 属性的值）：
   - 如果执行的是扩展操作， 那么 ht[1] 的大小为第一个大于等于 ht[0].used \* 2 的 2^n （2 的 n 次方幂）；
   - 如果执行的是收缩操作， 那么 ht[1] 的大小为第一个大于等于 ht[0].used 的 2^n 。
5. 将保存在 ht[0] 中的所有键值对 rehash 到 ht[1] 上面： rehash 指的是重新计算键的哈希值和索引值， 然后将键值对放置到 ht[1] 哈希表的指定位置上。
6. 当 ht[0] 包含的所有键值对都迁移到了 ht[1] 之后 （ht[0] 变为空表）， 释放 ht[0] ， 将 ht[1] 设置为 ht[0] ， 并在 ht[1] 新创建一个空白哈希表， 为下一次 rehash 做准备。

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696655947925-81ec96ba-fac3-40ff-9109-239f83b48932.png?x-oss-process=image%2Fresize%2Cw_721%2Climit_0#averageHue=%23f4f4f4&from=url&id=sUJKD&originHeight=676&originWidth=721&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

> 如何渐进式进行ReHash？（只迁不增，通过信号实现）

1. 为 ht[1] 分配空间， 让字典同时持有 ht[0] 和 ht[1] 两个哈希表。
2. 在字典中维持一个索引计数器变量 rehashidx ， 并将它的值设置为 0 ， 表示 rehash 工作正式开始。
3. 在 rehash 进行期间， 每次对字典执行添加、删除、查找或者更新操作时， 程序除了执行指定的操作以外， 还会顺带将 ht[0] 哈希表在 rehashidx 索引上的所有键值对 rehash 到 ht[1] ， 当 rehash 工作完成之后， 程序将 rehashidx 属性的值增一。
4. 随着字典操作的不断执行， 最终在某个时间点上， ht[0] 的所有键值对都会被 rehash 至 ht[1] ， 这时程序将 rehashidx 属性的值设为 -1 ， 表示 rehash 操作已完成。
   > 如何在ReHash过程CRUD？（两表CRUD）

因为在进行渐进式 rehash 的过程中， 字典会同时使用 ht[0] 和 ht[1] 两个哈希表， 所以在渐进式 rehash 进行期间， 字典的删除（delete）、查找（find）、更新（update）等操作会在两个哈希表上进行： 比如说， 要在字典里面查找一个键的话， 程序会先在 ht[0] 里面进行查找， 如果没找到的话， 就会继续到 ht[1] 里面进行查找， 诸如此类。<br />另外， 在渐进式 rehash 执行期间， 新添加到字典的键值对一律会被保存到 ht[1] 里面， 而 ht[0] 则不再进行任何添加操作： 这一措施保证了 ht[0] 包含的键值对数量会只减不增， 并随着 rehash 操作的执行而最终变成空表。

### 哈希算法

> 掩码保证范围在size-1

```c
# 使用字典设置的哈希函数，计算键 key 的哈希值
hash = dict->type->hashFunction(key);

# 使用哈希表的 sizemask 属性和哈希值，计算出索引值
# 根据情况不同， ht[x] 可以是 ht[0] 或者 ht[1]
index = hash & dict->ht[x].sizemask;
```

## 常用命令

> HSET/HGET

```c
# 存储一个哈希表key的键值
HSET key field value
# 获取哈希表key对应的field键值
HGET key field

# 在一个哈希表key中存储多个键值对
HMSET key field value [field value...]
# 批量获取哈希表key中多个field键值
HMGET key field [field ...]
# 删除哈希表key中的field键值
HDEL key field [field ...]

# 返回哈希表key中field的数量
HLEN key
# 返回哈希表key中所有的键值
HGETALL key

# 为哈希表key中field键的值加上增量n
HINCRBY key field n
```

### 应用场景

### 缓存对象

Hash类型，很适合结构与对象映射。<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1702610766256-964b073f-6d49-4429-9aee-47c247860d3f.png#averageHue=%23fcfcfc&clientId=uc996aacd-f268-4&from=paste&id=u5bab99e2&originHeight=123&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=uf4c2233d-c43c-41ba-87fc-0f662a79f78&title=)

```c
# 存储一个哈希表uid:1的键值
> HSET uid:1 name Tom age 15
2
# 存储一个哈希表uid:2的键值
> HSET uid:2 name Jerry age 13
2
# 获取哈希表用户id为1中所有的键值
> HGETALL uid:1
1) "name"
2) "Tom"
3) "age"
4) "15"
```

那么，上面在讲String也可以用JSON缓存对象，那应该如何选择？<br />**一般对象用 String + Json 存储，对象中某些频繁变化的属性可以考虑抽出来用 Hash 类型存储。**

### 购物车

以用户 id 为 key，商品 id 为 field，商品数量为 value，恰好构成了购物车的3个要素。<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1702610907020-f3116d47-5ee1-40ec-adb3-1337aee79d05.png#averageHue=%23eeecec&clientId=uc996aacd-f268-4&from=paste&id=ua8cca989&originHeight=1202&originWidth=1080&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=ub5c42618-c1cb-4279-8fe9-f39f0c55246&title=)<br />涉及的命令如下：

- 添加商品：HSET cart:{用户id} {商品id} 1
- 添加数量：HINCRBY cart:{用户id} {商品id} 1
- 商品总数：HLEN cart:{用户id}
- 删除商品：HDEL cart:{用户id} {商品id}
- 获取购物车所有商品：HGETALL cart:{用户id}

当前仅仅是将商品ID存储到了Redis 中，在回显商品具体信息的时候，还需要拿着商品 id 查询一次数据库，获取完整的商品的信息。
