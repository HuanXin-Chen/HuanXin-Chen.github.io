---
title: Kafka三个实践之道分享
description: 分享一个我一直在用的消息系统实践之道！
pubDatetime: 2023-11-08
published: true
ogImage: ../../assets/12.png
language: cn
tags:
  - 后端技术
---

## 前言

有快一个月没有更新文章，今天抽空分享一个我一直在用的消息系统实践之道——Kafka。<br />大体分为三个部分，希望对你有帮助：

- 无消息丢失配置实现
- 交付可靠性保障及精确一次语义
- 多线程开发消费方案

## 无消息丢失配置实现

> Kafka 只对“已提交”的消息（committed message）做有限度的持久化保证。

那么如何理解这一句话呢？

- 已提交的消息：若干个Broker成功地收到一条消息并且写入日志文件后，会告诉生产者该消息已提交。
- 有限度的持久保证：不能保证任何情况都做不到不丢失，地球不存在，还能不丢失吗？

### 消息丢失案例分析

> 先总结：这些情况的分析非常简单，从生产者和消费者去考虑。
>
> - 生产者无法就是生产数据失败，无法传递到消费者
> - 消费者的话，无法就是消费失败，或者漏了一些内容
>
> 随之带来的问题，就是消息丢失，消息重复，多次消费等。

> 生产者程序丢失数据

> producer.send(msg)，fire and forger，发射后不管。

例如网络抖动，导致消息压根就没有发送到 Broker 端；或者消息本身不合格导致 Broker 拒绝接收（比如消息太大了，超过了 Broker 的承受能力）等。

> 解决方案：

**Producer永远要使用带有回调通知的发送API**,也就是说不要使用 producer..send(msg),而要使用producer..send(msg,callback)。不要小瞧这里的 callback(回调)，它能准确地告诉你消息是否真的提交成功了。一旦出现消息提交失败的情况，你就可以有针对性地进行处理。

> 消费者程序丢失数据

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1700276640982-782dfb92-d767-4328-96d5-4059043cd770.png#averageHue=%23d3e0e5&clientId=uef1293df-0cf2-4&from=paste&height=439&id=ucacbd3ef&originHeight=659&originWidth=1089&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=85668&status=done&style=none&taskId=u7ba9c682-b3da-4d50-bd0b-7fffddd0e20&title=&width=726)

> 这里的offset就是类似一个书签的概念。

如果更新书签和读取范围内容的顺序进行了颠倒，会导致很多问题发生。如果更新了，但是读一半，那么你后面的数据就丢失了。

> 解决方案：

维持先消费消息（阅读），再更新位移（书签）的顺序即可。这样就能最大限度地保证消息不丢失。<br />但是这样也有一个问题的出现，就是可能会带来消息重复处理。

> 多线程异步处理消费消息丢失

> 其中一个消费者消费失败，但是自动提交了位移。

如果是多线程异步处理消费消息，Consumer 程序不要开启自动提交位移，而是要应用程序手动提交位移。<br />注意：多线程说起来，但是实现起来很困难，你很有可能会导致消息进行重复消费。

> 新增主体感知顺序导致消息丢失

当增加主题分区后，在某段"不凑巧”的时间间隔后，Producer先于Consumer感知到新增加的分区，而 Consumer设置的是“从最新位移处”开始读取消息，因比在Consumer感知到新分区前，Producer发送的这些消息就全部"丢失"了。

> 解决方案：

程序停止再增加分区，如果不能停止那就找个通知机制了。只能通过牺牲高可用性，来保证更新的消息持久保证了。

### 最佳实践指南

> 接下来对一些实践配置内容进行一个总结。

> 可以结合raft算法去思考为什么，为什么会这些配置选项，为什么要这样进行设置。无非就是通过更多数量的保证，来保证运行过程中的可靠性。

1. 不要使用producer.send(msg),而要使用producer.send(msg,callback)。记住，一定要使用带有回调通知的send方法。
2. 设置acks=all。acks是Producer的一个参数，代表了你对"已提交”消息的定义。如果设置成al‖，则表明所有副本Broker都要接收到消息，该消息才算是“已提交”。这是最高等级的“已提交”定义。
3. 设置retries为一个较大的值。这里的retries同样是Producer的参数，对应前面提到的Producer自动重试。当出现网络的瞬时抖动时，消息发送可能会失败，比时配置了 retries>O的Producer能够自动重试消息发送，避免消息丢失。
4. 设置unclean.leader..election.enable=false。这是Broker端的参数，它控制的是哪些Broker有资格竞选分区的Leader。如果一个Broker落后原先的Leader太多，那么它一旦成为新的Leader,必然会造成消息的丢失。故一般都要将该参数设置成false,即不允许这种情况的发生。
5. 设置replication.factor>=3。这也是Broker端的参数。其实这里想表述的是，最好将消息多保存几份，毕竟目前防止消息丢失的主要机制就是冗余。
6. 设置min.insync.replicas>1。这依然是Broker端参数，控制的是消息至少要被写入到多少个副本才算是“已提交”。设置成大于1可以提升消息持久性。在实际环境中干万不要使用默认值1。
7. 确保replication.factor>min.insync.replicas.。如果两者相等，那么只要有一个副本挂机，整个分区就无法正常工作了。我们不仅要改善消息的持久性，防止数据丢失，还要在不降低可用性的基础上完成。推荐设置成replication.factor=min.insync.replicas+ 1。
8. 确保消息消费完成再提交。Consumer端有个参数enable.auto.commit,最好把它设置成false,并采用手动提交位移的方式。就像前面说的，这对于单Consumer多线程处理的场景而言是至关重要的。

## 交付可靠性保障及精确一次语义

### 常见的承诺

- 最多一次(at most once):消息可能会丢失，但绝不会被重复发送。
- 至少一次(at least once):消息不会丢失，但有可能被重复发送。
- 精确一次(exactly once):消息不会丢失，也不会被重复发送。

对于至少一次，其实也就是消息不丢失，前面已经讲过如何去实现。<br />对于最多一次，其实实现起来也很简单，只需要让 Producer禁止重试即可。<br />无论是至多一次还是最多一次，都不如精确一次来的吸引人。Producer 端重复发送了相同的消息，Broker 端也能做到自动去重。在下游 Consumer 看来，消息依然只有一条。

### 幂等性

> 何为幂等性？

不管进行多少次操作，都能保证状态不会被改变。<br />这样的优势，在于我们可以安全地重试任何幂等性操作，他不好破坏我们的系统状态。

> 幂等性Producer的配置

- props.put("enable.idempotence”, ture)
- props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG,true)
  > 底层的实现。

Kafka自动帮你做消息的重复去重。底层具体的原理很简单，就是经典的用空间去换时间的优化思路，即在 Broker端多保存一些字段。当Producer发送了具有相同字段值的消息后，Broker能够自动知晓这些消息已经重复了，于是可以在后台默默地把它们“丢弃”掉。

> 注意幂等性的作用范围。

Producer能够保证某个主题的一个分区上不出现重复消息，它无法实现多个分区的幂等性。其次，它只能实现单会话上的幂等性，不能实现跨会话的幂等性。这里的会话，你可以理解为Producer进程的一次运行。当你重启了 Producer进程之后，这种幂等性保证就丧失了。

### 事务

> 什么是ACID？

> Kafka的事务概念类似于我们熟知的数据库提供的事务。在数据库领域，事务提供的安全性保障是经典的ACID,即原子性(Atomicity)、一致性(Consistency)、隔离性(Isolation)和持久性(Durability)。

对于隔离级别，不同数据库厂商都有自己的理解，目前的话Kafka主要是在read committed隔离级别上做事情。它能保证多条消息原子性地写入到目标分区，同时也能保证 Consumer 只能看到事务成功提交的消息。

> 事务型Producer

事务型Producer能够保证将消息原子性地写入到多个分区中。这批比消息要么全部写入成功，要么全部失败。另外，事务型Producer也不惧进程的重启。Producer重启回来后，Kafka依然保证它们发送消息的精确一次处理。

- 和幂等性Producer一样，开启enable.idempotence= true.
- 设置Producer端参数transctional.id。最好为其设置一个有意义的名字
- 此外，你还需要在Producer代码中做一些调整，如下这段代码

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1700278818394-17d70c5c-fffd-4d64-a211-f67ed3f423f4.png#averageHue=%23fafaf9&clientId=uef1293df-0cf2-4&from=paste&height=185&id=uc6070d70&originHeight=277&originWidth=680&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=18247&status=done&style=none&taskId=uf1eac6ee-bf8d-490d-84f3-077a501b1fb&title=&width=453.3333333333333)

> 和普通代码的区别，在于调用了一些API：

调用了一些事务APl，<br />如initTransaction、 beginTransaction、commitTransaction和 abortTransaction,<br />它们分别对应事务的初始化、事务开始、事务提交以及事务终止。

> 事务型Consumer

> 消费者也得做到事务型保证，所以也需要做一些修改。修改起来也非常简单，只需要设置一个属性的值，即隔离级别既可以了。

- read_uncommitted:这是默认值，表明Consumer能够读取到Kafka写入的任何消息，不论事务型Producer提交事务还是终止事务，其写入的消息都可以读取。很显然，如果你用了事务型Producer,那么对应的 Consumer就不要使用这个值。
- read_committed:表明Consumer只会读取事务型 Producer成功提交事务写入的消息。当然了，它也能看到非事务型Producer写入的所有消息。

## 多线程开发消费方案

### Kafka的双线程方案设计

> 用户主线程和心跳线程。

何谓用户主线程，就是你启动Consumer应用程序main方法的那个线程，而新引入的心跳线程(Heartbeat Thread)只负责定期给对应的Broker机器发送心跳请求，以标识消费者应用的存活性(liveness)。<br />引入这个心跳线程还有一个目的，那就是期望它能将心跳频率与主线程调用KafkaConsumer.poll方法的频率分开，从而解耦真实的消息处理逻辑与消费者组成员存活性管理。

### 多线程方案

> 方案一：消费者程序启动多个线程，每个线程维护专属的KafkaConsumer实例，负责完整的消息获取、消息处理流程。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1700280460666-78af9058-56c4-4e15-81ee-5d51a04244ea.png#averageHue=%23cce59d&clientId=uef1293df-0cf2-4&from=paste&height=370&id=u87edc0ee&originHeight=555&originWidth=1208&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=74759&status=done&style=none&taskId=u2c9e4e72-31ae-4792-a6e1-e864cafa3da&title=&width=805.3333333333334)

> 代码实现

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1700280495698-1ecdf135-1d4a-43d8-bd00-7f6a9d0b36be.png#averageHue=%23fcfcfb&clientId=uef1293df-0cf2-4&from=paste&height=528&id=u87176201&originHeight=792&originWidth=1091&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=88049&status=done&style=none&taskId=uf1267d39-a9be-41a5-b8d1-69a0e4feefb&title=&width=727.3333333333334)<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1700280502506-bd1dfb04-dd0b-4171-b686-f2b0debaa467.png#averageHue=%23fdfdfd&clientId=uef1293df-0cf2-4&from=paste&height=74&id=u86464d6d&originHeight=111&originWidth=1048&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=8178&status=done&style=none&taskId=u306b35d4-33f7-43a9-84ad-3ca342a2137&title=&width=698.6666666666666)<br />这段代码创建了一个Runnable类，表示执行消费获取和消费处理的逻辑。每个 KafkaConsumerRunner类都会创建一个专属的KafkaConsumer实例。在实际应用中，你可以创建多个KafkaConsumerRunner实例，并依次执行启动它们，以实现方案1的多线程架构。

> 方案二：消费者程序使用单或多线程获取消息，同时创建多个消费线程执行消息处理逻辑。获取消息的线程可以是一个，也可以是多个，每个线程维护专属的KafkaConsumer实例处理消息则交由特定的线程池来做，从而实现消息获取与消息处理的真正解耦。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1700280571610-219d32b7-a94b-4840-b2f8-ce6b2d90d80b.png#averageHue=%23cde3a1&clientId=uef1293df-0cf2-4&from=paste&height=616&id=u526e2069&originHeight=924&originWidth=1443&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=86969&status=done&style=none&taskId=u718ff0aa-1d82-424b-bac9-3e8f2e47d17&title=&width=962)

> 代码实现：

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1700280605475-4034f280-1e7e-4aa9-91c8-87bb0ca53878.png#averageHue=%23fdfcfb&clientId=uef1293df-0cf2-4&from=paste&height=463&id=ubdc4a16c&originHeight=695&originWidth=1148&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=74024&status=done&style=none&taskId=u3473b865-d416-4ab5-af73-af468cc3f2b&title=&width=765.3333333333334)<br />这段代码最重要的地方是我标为橙色的那个语句：当Consumer的poll方法返回消息后，由专门的线程池来负责处理具体的消息。调用po川方法的主线程不负责消息处理逻辑，这样就实现了方案2的多线程架构。

### 方案性能对比

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1700280656389-32459433-d549-4b19-9256-2d167a584141.png#averageHue=%23f2f0ed&clientId=uef1293df-0cf2-4&from=paste&height=651&id=u46451903&originHeight=976&originWidth=2148&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=168815&status=done&style=none&taskId=uba70ef34-0856-4cfd-9eb3-f246d303566&title=&width=1432)
