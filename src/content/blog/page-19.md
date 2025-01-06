---
title: 通过Redis讲缓存实战经验
description: 关于Redis缓存的一切知识
pubDatetime: 2023-12-21
published: true
ogImage: ../../assets/19.png
language: cn
tags:
  - 后端技术
---
# 缓存的特征
本文通过Redis讲解缓存实战经验，但是我们在进入篇章之前，需要细致的了解一些缓存的大体特征。<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703036104782-3df422d3-55ed-4c97-8ad6-418c9c823b38.png#averageHue=%23f6f3e2&clientId=ufaf23d8a-4412-4&from=paste&height=349&id=u7befee19&originHeight=524&originWidth=764&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=59292&status=done&style=none&taskId=u22894ec3-be4d-4bbc-a0f3-59b3a483851&title=&width=509.3333333333333)<br />在计算机系统中，默认有两种缓存：

- CPU的末级缓存，即LLC，缓存内存中的数据
- 内存中的高速页缓存，即page cache，用来缓存磁盘中的数据

可以发现，他们的量级都比前者更加快与高效。那么它便有如下的特征：

- 在一个层次化的系统中，缓存一定是一个快速子系统
- 缓存的容量大小总是小于后端慢速系统

**随之而来的问题是，缓存的工作原理、替换策略，异常处理和扩展机制。**<br />因为有限的空间，我们不可能把所有的数据都放入缓存中，那么对于Redis而言，我们要解决的问题如下：

- Redis 缓存具体是怎么工作的？ 
- Redis 缓存如果满了，该怎么办？ 
- 为什么会有缓存一致性、缓存穿透、缓存雪崩、缓存击穿等异常，该如何应对？
- Redis 的内存毕竟有限，如果用快速的固态硬盘来保存数据，可以增加缓存的数据量， 那么，Redis 缓存可以使用快速固态硬盘吗？  

---

# 缓存类型
对于缓存的结果来说，只有两种情况

- **缓存命中**
- **缓存缺失**

我们使用**Redis来做旁路缓存**，因为他是独立于原有系统的软件系统，我们与此交互的方式，只能通过在原来的基础上，增加代码去进行交互。<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703036086594-638ea304-05a4-47ee-ae3b-01a358a54db5.png#averageHue=%23fdfcfb&clientId=ufaf23d8a-4412-4&from=paste&height=221&id=uf5d4707c&originHeight=332&originWidth=869&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=59007&status=done&style=none&taskId=u8949c3f4-2a96-4202-941d-0cbd58f76d0&title=&width=579.3333333333334)<br />按照释放接受写请求，把缓存分为了只读缓存和读写缓存。
## 只读缓存
我们对Redis的操作只有读的操作，我们不会对其进行更新，当我们数据库有修改的时候，通过数据库更新，将Redis中的数据删除，通过缓存缺失再次拉取缓存。<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703036295186-8220b44b-2313-4180-a365-4066ab798bf1.png#averageHue=%23f7f4e5&clientId=ufaf23d8a-4412-4&from=paste&height=363&id=uf7ca6f4a&originHeight=545&originWidth=1088&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=161023&status=done&style=none&taskId=ub3224df4-7f42-4726-b552-294dd76b204&title=&width=725.3333333333334)<br />只读缓存的好处很明显：

- **数据库保证了可靠性！**

所有最新的数据都在数据库中，而数据库是提供数据可靠性保障的，这些数据不会有丢失的风险。当我们需要缓存图片、短视频这些用户只读的数据时，就可以使用只读缓存这个类型了。  
## 读写缓存
读写缓存，无非就是把所有的写请求，页发送到缓存中，在缓存中更新。但是风险也很明显，你**无法保证Redis集群的可靠性**，一旦宕机，缓存丢失，可能导致内存数据丢失，给应用业务带来风险。<br />根据业务应用对数据可靠性和缓存性能的不同要求，我们会有同步直写和异步写回两种策略。

- 同步直写优先保证数据可靠性
- 异步写回优先保证快速响应性

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703036693409-c1212a4a-eb90-4d4a-ae0c-907e238240dc.png#averageHue=%23f7f5e7&clientId=ufaf23d8a-4412-4&from=paste&height=370&id=u9153a377&originHeight=555&originWidth=1050&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=116933&status=done&style=none&taskId=uddcae9d5-1aa2-4834-a695-26e421a69d0&title=&width=700)
## 如何选择？
关于是选择只读缓存，还是读写缓存，主要看我们**对写请求是否有加速的需求。**

- 如果需要对写请求进行加速，我们选择读写缓存； 
- 如果写请求很少，或者是只需要提升读请求的响应速度的话，我们选择只读缓存。  

例子：商品大促的场景中，商品库存信息会被一直修改，这个时候每次修改都需要到数据库中处理，会拖慢整个应用，这个时候适合选择读写缓存比较好。但是，在短视频场景中，属性虽然多，但一般不会再修改，这个时候会读缓存比较好。<br />最后思考一个问题：使用只读缓存和直写策略的读写缓存对比？<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703048734238-5d28c3e7-53f4-49c7-bed1-d05e5727a263.png#averageHue=%23edd890&clientId=u8802fd62-87d0-4&from=paste&height=449&id=uf4951509&originHeight=449&originWidth=830&originalType=binary&ratio=1&rotation=0&showTitle=false&size=148674&status=done&style=none&taskId=u53b39455-7239-4fa3-bd74-1f0d97d5150&title=&width=830)

---

# 替换策略
讲完了缓存类型，我们知道缓存是有限的，这就意味着，我们的数据不可能无限制的存储，必须包含着淘汰。
## 如何处理淘汰数据？
**答：看是否干净！（我们可以通过对比来进行判断是否为干净数据）**<br /> 如果这个数据是干净数据，那么我们就直接删除；<br /> 如果这个数据是脏数据，我们需要把它写回数据库  ？<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703048976817-dd6c68f3-9547-4135-9a0c-03ea448a8d4e.png#averageHue=%23f7f3e5&clientId=u8802fd62-87d0-4&from=paste&height=323&id=u475aea96&originHeight=323&originWidth=508&originalType=binary&ratio=1&rotation=0&showTitle=false&size=44160&status=done&style=none&taskId=u0b9062fc-d1a2-43fc-ad43-94dd998da72&title=&width=508)<br />那这种策略，是属于哪种类型与策略？

- 答：读写缓存+异步回写策略。
## 缓存多大合适？
上面也讲到了不可能缓存全部，那么缓存设置多大合适，此外缓存哪些数据呢？<br />这里需要提到“二八原理“，80%的请求实际只访问了20%的数据。所以，用1TB 的内存做缓存，并没有必要。  <br />所以建议：** 把缓存容量设置为总数据量的15%到30%，兼顾访问性能和内存空间开销。  **<br />当然，要结合应用实际访问特性和成本开销，来进行一个综合考虑。
## 写满了淘汰策略
写满了是不可避免的，所以就有了淘汰策略：<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703049244579-1b80b9a7-2dc2-4f25-8287-ec048febb979.png#averageHue=%23f5f2e1&clientId=u8802fd62-87d0-4&from=paste&height=477&id=u45114777&originHeight=477&originWidth=1298&originalType=binary&ratio=1&rotation=0&showTitle=false&size=139561&status=done&style=none&taskId=u9185c873-3502-430b-b8fe-a26e5c9d2a7&title=&width=1298)<br />这里讲讲LRU， 在实际实现时，需要用链表管理所有的缓存数据，这会带来额外的空间开 销。而且，当有数据被访问时，需要在链表上把该数据移动到 MRU 端，如果有大量数据被访问，就会带来很多链表移动操作，会很耗时，进而会降低 Redis 缓存性能。  <br />所以**Redis对其进行了简化，以减轻数据淘汰对缓存性能的影响。**Redis 默认会记录每个数据的最近一次访问的时间戳（由键值对数据结构 RedisObject 中的 lru 字段记录）。然后，Redis 在决定淘汰的数据时，第一次会随机选出 N 个数据，把它们作为一个候选集合。接下来，Redis 会比较这 N 个数据的 lru 字段，把 lru 字段值最小的数据从缓存中淘汰出去。  
## 使用建议

- 优先使用allkeys-lru策略，在有明显冷热的数据区分，其能发挥较好的性能。
- 如果业务有置顶需求，可以使用 volatile-lru 策略，然后不给置顶数据设置过期时间。

---

# 缓存异常解决方案
 缓存异常主要有4个方面：

- 缓存中的数据和数据库中的不一致；
- 缓存雪崩；
- 缓存击穿；
- 缓存穿透。  
## 如何解决数据不一致？
在探讨这个问题，需要明白何为一致？

- 缓存中有数据，那么，缓存的数据值需要和数据库中的值相同； 
- 缓存中本身没有数据，那么，数据库中的值必须是最新值。  

那么何时会不一致？

- 看业务流程是否能保证**原子性**！

在实际场景中，无论是先删除缓存再更新数据库看，还是先更新数据库再删缓存。都存在数据不一致的情况！

- 因为你无非保证这两个命令是原子性的！

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703049992698-6258ca03-c7c9-4d47-8e8b-693313258584.png#averageHue=%23d4d59a&clientId=u8802fd62-87d0-4&from=paste&height=199&id=u4e53abb7&originHeight=199&originWidth=639&originalType=binary&ratio=1&rotation=0&showTitle=false&size=75153&status=done&style=none&taskId=u4d5b8b85-8efd-45e0-b610-2bb5ac1e396&title=&width=639)
### 重试机制
重试机制是一种常见的解决缓存不一致的方案。将需要缓存的数据放入消息队列了，从而避免数据删除失败导致脏数据的存在。<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703085034698-39ca356c-5f6a-450d-a4db-978bbfba2f17.png#averageHue=%23f6f2e3&clientId=uf91c7d55-2c0f-4&from=paste&height=429&id=u4b53fcc8&originHeight=429&originWidth=688&originalType=binary&ratio=1&rotation=0&showTitle=false&size=69611&status=done&style=none&taskId=u5f5f0d19-8df4-446c-af6d-5e66357f904&title=&width=688)
### 并发下的数据一致
上面将到的方案，是针对于一个操作失败的情况，但是有大量并发请求，还是有可能读到不一致的数据。
#### 先删除缓存，再更新数据库
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703085256204-f9731435-1a67-40cf-acf9-f85fbc170cdc.png#averageHue=%23f0db94&clientId=uf91c7d55-2c0f-4&from=paste&height=326&id=ub5036f79&originHeight=326&originWidth=697&originalType=binary&ratio=1&rotation=0&showTitle=false&size=81503&status=done&style=none&taskId=ue71f5422-d55a-4ab6-8928-c2fc3c83976&title=&width=697)<br />两个线程的不同步，导致了读取到旧值。其本质原因是因为，缓存更新操作和数据库更新操作的频率不一致，所以要使得他们的频率一致，我们可以使用**延迟双删**的操作。通过给另外一个腾出时间，让自己休息后又一次把旧数据替换掉。<br />**在线程 A 更新完数据库值以后，我们可以让它先 sleep 一小段时间，再进行一次缓存删除操作。  **<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703085483893-2ca491c2-c82a-4e54-9314-64d6c9d0ff9c.png#averageHue=%23fefdfd&clientId=uf91c7d55-2c0f-4&from=paste&height=90&id=ub97176b3&originHeight=90&originWidth=484&originalType=binary&ratio=1&rotation=0&showTitle=false&size=9354&status=done&style=none&taskId=u854e4e3c-cacd-4537-8b31-7e9d236cca9&title=&width=484)
#### 先更新数据库值，再删除缓存值
这种情况，业务影响比较小，因为如果不是有很多并发请求的话，线程A是能很快完成操作并且更新缓存，其他数据库是不会读到旧信息的。<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703085663134-c3135438-7a23-41d3-887b-92a157d3666d.png#averageHue=%23f3de95&clientId=uf91c7d55-2c0f-4&from=paste&height=238&id=uade0d1ed&originHeight=238&originWidth=703&originalType=binary&ratio=1&rotation=0&showTitle=false&size=51101&status=done&style=none&taskId=u4ef93c9c-75c3-408f-90c5-6e28f519bd5&title=&width=703)
> 这种情况，很难发生，因为这个时候写回缓存通常在更新数据库之前！所以实际的方案中，我们通常会如此选择！

### 方案总结

- 如果是删除缓存值或更新数据库失败导致的数据不一致，可以使用重试机制保证
- 如果是删除缓存和更新数据库的这两步操作中，且有并发操作，导致读取到旧值，可以使用是延迟双删。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703085799832-478ce9b8-db0c-4593-9df2-c37213f69f7e.png#averageHue=%23e9d48e&clientId=uf91c7d55-2c0f-4&from=paste&height=319&id=uc2ff3b65&originHeight=319&originWidth=676&originalType=binary&ratio=1&rotation=0&showTitle=false&size=129945&status=done&style=none&taskId=u113db4d2-3c17-4dd7-bf2e-0db33a72dd0&title=&width=676)<br />最后， 在大多数业务场景下，我们会把 Redis 作为只读缓存使用， 建议是优先使用先更新数据库再删除缓存的方法。

- 其一：先删缓存再更新数据库，可能因为缓存缺失访问数据库，给数据库带来压力。
- 其二：延迟双删等待时间不好设置，很难去做好一个业务评估。

最后，如果真的要求强一致性，可以在客户和缓存并发读请求，等待数据库更新完，缓存值删除后，再读取数据，从而保证数据一致性。
## 缓存雪崩
缓存雪崩是指大量的应用请求无法在 Redis 缓存中进行处理，紧接着，应用将大量请求发 送到数据库层，导致数据库层的压力激增。
### 事前
那它发生的原因有哪些？

- 其一：缓存中有**大量数据同时过期**，导致大量请求无法得到处理。
- 其二：Redis缓存实例发生**故障宕机。**

对于大量数据同时过期我们有两种方案：

- 其一：EXPIRE 命令给每个数据设置过期时间时，给这些数据的过期时间增加一个较小的**随机数**（例如，随机增加 1~3 分钟），打破规律性。
- 其二：**服务降级**，对不同数据采取不同处理方式，核心数据走数据库，非核心数据返回预定义信息，当然注意这是有损的行为！

对于大量Redis实例宕机的情况：<br />Redis通常支持数万级别的请求，而数据库只能支持数千级别的请求。故我们可以采取如下策略避免数据块压力过大：

- 业务系统中实现**服务熔断**（直接在客户端就做返回）或**请求限流机制**
- 检测Redis 缓存所在机器和数据库所在机器的负载指标，例 如每秒请求数、CPU 利用率、内存利用率等，如果忽然激增，我们可以在前台做好请求限流，缓解数据库压力。       
### 事后
前面都是事情发生之后采取的策略，那有什么策略可以在事情尽可能做好？

- **主从节点方式构建Redis缓存高可靠集群**
## 缓存击穿
缓存击穿是指，针对某个访问非常频繁的热点数据的请求，无法在缓存中进行处理，紧接着，访问该数据的大量请求，一下子都发送到了后端数据库，导致了数据库压力激增。<br />这种情况的发生，通过在**热点数据过期失效**时，解决方法也很简单：

- 对于访问特别频繁的热点数据，我们就不设置过期时间了

当然这种压力的影响，是要比缓存雪崩带来的压力小的。 
## 缓存穿透
缓存穿透是指要访问的数据既**不在Redis缓存中，也不在数据库**中，导致请求在访问缓存时，发生缓存缺失，再去访问数据库时，发现数据库中也没有要访问的数据。此时，应用也无法从数据库中读取数据再写入缓存，来服务后续请求，这样一来，缓存也就成了“摆设”。  <br />何时会发生：

- 业务层误操作
- 恶意攻击

解决方案：

- **缓存空值或缺省值**
- 使用**布隆过滤器**快速判断数据是否存在，避免从数据库中查询数据是否存在，减轻数据库压力
- 在请求入口的**前端进行请求检测**

注意，缓存穿透的影响是非常大的，要特别注意！
### 本质
扯到这里，来一个思考题吧！** 服务熔断、服务降级、请求限流的方法，可以用来应对缓存穿透吗？  **

- 缓存穿透这个问题的**本质是查询了 Redis 和数据库中没有的数据。**
- 而**服务熔断、服务降级和请求限流的方法，本质上是为了解决 Redis 实例没有起到缓存层作用的问题**，缓存雪崩和缓存击穿都属于这类问题。

在缓存穿透的场景下，业务应用是要从 Redis 和数据库中读取不存在的数据，此时，如果没有人工介入，Redis 是无法发挥缓存作用的。

- 一个可行的办法就是**事前拦截**，不让这种查询 Redis 和数据库中都没有的数据的请求发送到数据库层。使用**布隆过滤器**也是一个方法，布隆过滤器在判别数据不存在时，是不会误判的，而且判断速度非常快，一旦判断数据不存在，就立即给客户端返回结果。使用布隆过滤器的好处是既降低了对 Redis 的查询压力，也避免了对数据库的无效访问。

另外，这里，有个地方需要注意下，对于缓存雪崩和击穿问题来说，服务熔断、服务降级和请求限流这三种方法属于**有损方法，会降低业务吞吐量、拖慢系统响应、降低用户体验**。不过，采用这些方法后，随着**数据慢慢地重新填充回 Redis，Redis 还是可以逐步恢复缓存层作用的**。 

---

# 缓存污染
访问少的数据留在内存中，白白浪费了空间！
> 这一部分主要是对比缓存污染的淘汰的策略。

在刚才，我们了解到了有如下几种策略：<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703049244579-1b80b9a7-2dc2-4f25-8287-ec048febb979.png?x-oss-process=image%2Fresize%2Cw_1125%2Climit_0#averageHue=%23f5f2e1&from=url&id=LOkoW&originHeight=413&originWidth=1125&originalType=binary&ratio=1.5&rotation=0&showTitle=false&status=done&style=none&title=)

- 随机：避免情况非常有限
- 时间：不能有效反应数据再次访问情况
- LRU：无法避免单词扫描的情况

所以结合上面的缺点，有了LRU，结合次数+时间判断！
## LFU
有一个很妙，它只是把原来 24bit 大小的 lru 字段，又进一 步拆分成了两部分。  

- ldt：前16bit，访问时间戳
- counter：后8bit，表示数据访问次数

这样用8个bit，即255可以吗？<br />注意，Redis在计数上，有了一个优化策略。<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703125305419-43eaf91c-64de-42bf-a171-33a75fc0c2e0.png#averageHue=%23fdfdfc&clientId=uc967f997-cf43-4&from=paste&height=87&id=u23cc35e3&originHeight=131&originWidth=810&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=22591&status=done&style=none&taskId=uc5d1abdc-0a51-4f22-9a05-43fb308aa2c&title=&width=540)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1703125315420-48ab4afa-161d-45ec-955d-14f62536f1c3.png#averageHue=%23f7e198&clientId=uc967f997-cf43-4&from=paste&height=155&id=ucf8255f3&originHeight=233&originWidth=954&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=79012&status=done&style=none&taskId=u29aed8b2-d30e-4004-984b-067c4143bae&title=&width=636)<br />这种非线性递增的计数方法，及时数据量很大，也能有很好的数据筛选表现。<br />当然，还有一些不好的点，比如按次数筛选，可能会有部分数据本身访问频次就一直很高，它一直留在内存中。所以Redis也对此有了一个优化：

- 使用了counter衰减机制

---

# 总结
在这篇文章中，我们介绍了：

- 缓存类型
- 替换策略
- 缓存异常方案
- 缓存污染

对于类型，要明白读缓存和读写缓存，他们之间存在的问题！

- 读缓存：数据库保证可靠性
- 读写缓存：同步直写和异步回写，保证响应性

对于替换策略：

- 随机
- 时间
- LRU/LFU

对于异常方案，要明白其下对应的策略：

- 数据不一致：重试机制、延迟双删
- 缓存雪崩：随机时间、服务降级、限流、服务熔断、部署集群
- 缓存击穿：热点数据不做过期
- 缓存穿透：缓存null值、布隆过滤器、请求拦截

对于缓存污染

- LFU较佳

