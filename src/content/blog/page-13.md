---
title: 分布式Raft共识算法导读解析
description: 走近分布式经典！
pubDatetime: 2023-11-20
published: true
ogImage: ../../assets/13.png
language: cn
tags:
  - 后端技术
---
## 前言
在过去的时间，我一直在研究学习分布式相关的内容。我发现，现在很多系统设计，中间件的底层设计，都或多或少的利用了Raft的思想，所以我想把这个内容分享出来，希望对你有帮助。本文是 Raft 理论内容与落地方案的简单整合，我们重点结合 Raft 论文讲解 Raft 算法思路，并遵循 Raft 的模块化思想对难理解及容易误解的内容抽丝剥茧。

## 问题思考引入
> 在分布式上，我们要实现一致性，我们一起先思考在三个问题？

如何多快好省的对大规模数据集进行存储和计算? 

1. 更好的机器
2. 更多的机器

如何让跨网络的机器之间协调一致的工作? 

1. 状态的立即一致
2. 状态的最终一致

如何应对网络的不可靠以及节点的失效? 

1. 可读写
2. 可读
3. 不可用

何为一致性算法：组织机器使其状态最终一致并允许局部失败的算法称之为**一致性算法**. <br />raft为何被推荐：Paxos算法由来已久,目前是功能和性能最完善的一致性算法，然而他难以理解与实现，工程难以落地。 raft简化了paxos,它是以易于理解为首要目标,尽量提供与paxos一样的功能与性能。

---

在分布式系统中，为了消除单点提高系统可用性，通常会使用副本来进行容错，但这会带来另一个问题，即如何保证多个副本之间的一致性？
> **这里我们只讨论强一致性，即线性一致性。**弱一致性涵盖的范围较广，涉及根据实际场景进行诸多取舍，不在 Raft 系列的讨论目标范围内。

所谓的强一致性（线性一致性）并不是指集群中所有节点在任一时刻的状态必须完全一致，而是指一个目标，即让一个**分布式系统看起来只有一个数据副本**，并且读写操作都是原子的，这样应用层就可以忽略系统底层多个数据副本间的同步问题。也就是说，我们可以将一个强一致性分布式系统当成一个整体，一旦某个客户端成功的执行了写操作，那么所有客户端都一定能读出刚刚写入的值。即使发生网络分区故障，或者少部分节点发生异常，整个集群依然能够像单机一样提供服务。
> 对于共识算法（Consensus Algorithm），就是用来做这个事情的，它保证即使在小部分（≤ (N-1)/2）节点故障的情况下，系统仍然能正常对外提供服务。共识算法通常基于状态复制机（Replicated State Machine）模型，也就是**所有节点从同一个 state 出发，经过同样的操作 log，最终达到一致的 state。**


## Raft是什么？
> Raft is a consensus algorithm for managing a replicated log. It produces a result equivalent to (multi-)Paxos, and it is as efficient as Paxos, but its structure is different from Paxos; this makes Raft more understandable than Paxos and also provides a better foundation for building practical systems.
> --《In Search of an Understandable Consensus Algorithm》

Raft 是用于管理复制日志的一致性协议，与 Multi-Paxos 作用相同，效率相当，但是架构更简单，更容易实现。Raft 将共识算法的关键因素分为几个部分：

- Leader election 领导者选举
- Log replication 日志复制
- Safety 安全性

且 Raft 用了一种更强的共识性来减少要考虑的状态 state 的数量。<br />Raft 对比于现有的共识算法有几个新特性：

- **Strong leader（强领导性）**：相比于其他算法，Raft 使用了更强的领导形式。比如，日志条目只能从 leader 流向 follower（集群中除 leader 外其他的服务器）。这在使 Raft 更易懂的同时简化了日志复制的管理流程。
- **Leader election（领导选举）**：Raft 使用随机计时器来进行领导选举。任何共识算法都需要心跳机制（heartbeats），Raft 只需要在这个基础上，添加少量机制，就可以简单快速地解决冲突。
- **Membership changes（成员变更）**：Raft 在更改集群中服务器集的机制中使用了一个 联合共识（joint consensus）的方法。在联合共识（joint consensus）下，在集群配置的转换过程中，新旧两种配置大多数是重叠的，这使得集群在配置更改期间可以继续正常运行。

## 复制状态机
> 复制状态机用于解决分布式系统中的各种容错问题，通常使用日志复制来实现。
> 如图，每个服务器保存一份含有一系列命令的日志，然后服务器上的复制状态机按顺序执行日志中的命令。每一份日志按相同顺序包含了相同的命令，因此每个状态机都能处理相同的命令序列。

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1699322074888-6fdab181-b78c-4725-b366-2b85c06edb8f.png#averageHue=%23dedfa4&from=url&id=Wxc2F&originHeight=307&originWidth=573&originalType=binary&ratio=1.5&rotation=0&showTitle=false&status=done&style=none&title=)<br />一致性算法的目标就是保证集群上所有节点的状态一致,节点要执行的指令可以分为两种,读与写。只有写指令会改变节点状态,因此为了保证集群各个节点状态的一致,那就必须将写指令同步给所有节点。 <br />理想状态下,我们期望**任意节点**发生写命令都会**立即**的在其他节点上变更状态,这其中没有任何时延,所有节点都好像是单机一样被变更状态。 <br />**网络延迟要远远慢于内存操作**, 写入命令不可能被同时执行,因此如果在不同节点发生不同的写命令,那么在其他节点上这些写命令被应用的顺序很可能完全不同。 <br />如果我们不要求所有节点的写命令立即被执行,而仅仅是保证所有的写命令在所有的节点上按同样的顺序最终被执行呢? 第一, 仅仅允许一个节点处理写命令,第二,所有的节点维护一份顺序一致的日志。 <br />每个节点上的状态机按照自己的节奏,逐条应用日志上的写命令来变更状态。
> 那如何实现，上面其实已经提供了解决方方案，你应该能想到如何解决，那么用计算机的思维，来探索应该如何实现。

#### 定义问题
> 1. 输入: 写入命令
> 2. 输出: 所有节点最终处于相同的状态
> 3. 约束
>    1. 网络不确定性: 在非拜占庭情况下,出现网络 分区/冗余/丢失/乱序 等问题下要保证正确。
>    2. 基本可用性: 集群中大部分节点能够保持相互通信,那么集群就应该能够正确响应客户端
>    3. 不依赖时序: 不依赖物理时钟或极端的消息延迟来保证一致性
>    4. 快速响应: 对客户端请求的响应不能依赖集群中最慢的节点

#### 一个可行解
> 1. 初始化的时候有一个领导者节点，负责发送日志到其他跟随者,并决定日志的顺序
> 2. 当读请求到来时,在任意节点都可以读,而写请求只能重定向到领导者进行
> 3. 领导者先写入自己的日志,然后同步给半数以上节点,跟随者表示都ok了,领导者才提交日志
> 4. 日志最终由领导者先按顺序应用于状态机,其他跟随者随机应用到状态机
> 5. 当领导者崩溃后,其他跟随者通过心跳感知并选举出新的领导者继续集群的正常运转
> 6. 当有新的节点加入或退出集群,需要将配置信息同步给整个集群


## Raft状态流转逻辑
我们知道集群每个节点的状态都只能是 leader、follower 或 candidate，那么节点什么时候会处于哪种状态呢？下图展示了一个节点可能发生的状态转换：<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1699323330251-d1bc0107-c936-4034-b11e-61e7869ac526.png#averageHue=%23c7cac4&from=url&id=WVjwX&originHeight=285&originWidth=635&originalType=binary&ratio=1.5&rotation=0&showTitle=false&status=done&style=none&title=)
> 注意：raft在超时的设置上，通过使用随机超时时间，从而防止了选举瓜分，使得有候选者被投为leader。这种策略非常常见，通过破坏公平性，来保证公平带来的问题。学过操作系统的话，有一个哲学家就餐问题，当时避免死锁的方式，其中一个方案就是破坏公平性。在分布式系统中，我们很多时候，也可以通过破坏公平性，来实现状态的稳定。

#### 1、Follower状态转换过程：**receives votes from majority of servers**
Raft 的选主基于一种心跳机制，集群中每个节点刚启动时都是 follower 身份（**Step: starts up**），leader 会周期性的向所有节点发送心跳包来维持自己的权威。<br />那么首个 leader 是如何被选举出来的呢？方法是如果一个 follower 在一段时间内没有收到任何心跳，也就是选举超时，那么它就会主观认为系统中没有可用的 leader，并发起新的选举（**Step: times out, starts election**）。<br />“选举超时时间”该如何制定？如果所有节点在同一时刻启动，经过同样的超时时间后同时发起选举，整个集群会变得低效不堪，极端情况下甚至会一直选不出一个主节点。**Raft 巧妙的使用了一个随机化的定时器，让每个节点的“超时时间”在一定范围内随机生成，这样就大大的降低了多个节点同时发起选举的可能性。**
#### 2、Candicate状态转换过程
> Follower 切换为 candidate 并向集群其他节点发送“请给自己投票”的消息后，接下来会有三种可能的结果：

- **选举成功（Step: receives votes from majority of servers）**

当candicate从整个集群的**大多数**（N/2+1）节点获得了针对同一 term 的选票时，它就赢得了这次选举，立刻将自己的身份转变为 leader 并开始向其它节点发送心跳来维持自己的权威。

- **选举失败（Step: discovers current leader or new term）**

Candidate 在等待投票回复的时候，可能会突然收到其它自称是 leader 的节点发送的心跳包，如果这个心跳包里携带的 term **不小于** candidate 当前的 term，那么 candidate 会承认这个 leader，并将身份切回 follower。这说明其它节点已经成功赢得了选举，我们只需立刻跟随即可。但如果心跳包中的 term 比自己小，candidate 会拒绝这次请求并保持选举状态。

- **选举超时（Step: times out, new election）**

第三种可能的结果是 candidate 既没有赢也没有输。如果有多个 follower 同时成为 candidate，选票是可能被瓜分的，如果没有任何一个 candidate 能得到大多数节点的支持，那么每一个 candidate 都会超时。此时 candidate 需要增加自己的 term，然后发起新一轮选举。如果这里不做一些特殊处理，选票可能会一直被瓜分，导致选不出 leader 来。这里的“特殊处理”指的就是前文所述的**随机化选举超时时间**。
#### 3、Leader状态转换过程：**discovers server with higher term**
当 leader 节点发生了宕机或网络断连，此时其它 follower 会收不到 leader 心跳，首个触发超时的节点会变为 candidate 并开始拉票（由于随机化各个 follower 超时时间不同），由于该 candidate 的 term 大于原 leader 的 term，因此所有 follower 都会投票给它，这名 candidate 会变为新的 leader。一段时间后原 leader 恢复了，收到了来自新leader 的心跳包，发现心跳中的 term 大于自己的 term，此时该节点会立刻切换为 follower 并跟随的新 leader。

## 日志复制数据结构
### 如何同步日志？
> 如何来同步日志？

**Raft 赋予了 leader 节点更强的领导力（Strong Leader）。**那么 Raft 保证 log 一致的方式就很容易理解了，即所有 log 都必须交给 leader 节点处理，并由 leader 节点复制给其它节点。这个过程，就叫做**日志复制**（**Log replication**）。
> 执行流程：一图胜千言

![](https://cdn.nlark.com/yuque/0/2023/svg/29466846/1699323813754-f4ec76a2-a942-447b-a56a-8b808890abf4.svg#from=url&id=zp3Ai&originHeight=1633&originWidth=2923&originalType=binary&ratio=1.5&rotation=0&showTitle=false&status=done&style=none&title=)
> 注意：提交和应用的区别。
> 提交不是应用，中间有一段延迟，用来做buff，因为应用这个要根据具体业务来看，比如是要写入DB中，这可能是随机写性能会很差，提交的速度要远快于应用速度，为了防止阻塞。

### 日志复制机制解析
#### 整体工作流程

- Leader 为客户端提供服务，客户端的每个请求都包含一条即将被状态复制机执行的指令。
- Leader 把该指令作为一条新的日志附加到自身的日志集合，然后向其它节点发起**附加条目请求**（**AppendEntries RPC**），来要求它们将这条日志附加到各自本地的日志集合。
- 当这条日志已经确保被**安全的复制**，即大多数（N/2+1）节点都已经复制后，leader 会将该日志 **apply** 到它本地的状态机中，然后把操作成功的结果返回给客户端。
#### 结构详解
> 每条日志除了存储状态机的操作指令外，还会拥有一个**唯一的整数索引值**（**log index**）来表明它在日志集合中的位置。此外，每条日志还会存储一个 **term** 号（日志条目方块最上方的数字，相同颜色 term 号相同），该 term 表示 leader 收到这条指令时的当前任期，term 相同的 log 是由同一个 leader 在其任期内发送的。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1699336764990-291a12b5-7ead-4233-a554-3f247168100e.png#averageHue=%23bebfc0&clientId=u2527c9cf-1857-4&from=paste&height=276&id=u85f5475b&originHeight=276&originWidth=793&originalType=binary&ratio=1&rotation=0&showTitle=false&size=21341&status=done&style=none&taskId=ub0f10dd8-5177-4f37-b163-c21ca4a8142&title=&width=793)<br />**当 leader 得知这条日志被集群过半的节点复制成功时，则Commit。**Raft 保证所有 committed 日志都已经被**持久化**，且“**最终**”一定会被状态机apply。
> _这里的“最终”用词很微妙，它表明了一个特点：Raft 保证的只是集群内日志的一致性，而我们真正期望的集群对外的状态机一致性需要我们做一些额外工作_

### 日志不一致场景![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1699337966945-24fb2df1-ce6c-40b7-b542-a5fc3d76b12e.png#averageHue=%23edebe7&clientId=u2527c9cf-1857-4&from=paste&height=558&id=udfab9aab&originHeight=558&originWidth=836&originalType=binary&ratio=1&rotation=0&showTitle=false&size=228558&status=done&style=none&taskId=ue2f99cf7-3cb8-453d-85d3-361a49b1569&title=&width=836)

- **场景a~b. Follower 日志落后于 leader**

这种场景其实很简单，即 **follower 宕机了一段时间**，follower-a 从收到 (term6, index9) 后开始宕机，follower-b 从收到 (term4, index4) 后开始宕机。这里不再赘述。

- **场景c. Follower 日志比 leader 多 term6**

当 term6 的 leader 正在将 (term6, index11) 向 follower 同步时，该 leader 发生了宕机，且此时只有 follower-c 收到了这条日志的 AppendEntries RPC。然后经过一系列的选举，term7 可能是选举超时，也可能是 leader 刚上任就宕机了，最终 term8 的 leader 上任了，成就了我们看到的场景 c。

- **场景d. Follower 日志比 leader 多 term7**

当 term6 的 leader 将 (term6, index10) 成功 commit 后，发生了宕机。此时 term7 的 leader 走马上任，连续同步了两条日志给 follower，然而还没来得及 commit 就宕机了，随后集群选出了 term8 的 leader。

- **场景e. Follower 日志比 leader 少 term5 ~ 6，多 term4**

当 term4 的 leader 将 (term4, index7) 同步给 follower，且将 (term4, index5) 及之前的日志成功 commit 后，发生了宕机，紧接着 follower-e 也发生了宕机。这样在 term5~7 内发生的日志同步全都被 follower-e 错过了。当 follower-e 恢复后，term8 的 leader 也刚好上任了。

- **场景f. Follower 日志比 leader 少 term4 ~ 6，多 term2 ~ 3**

当 term2 的 leader 同步了一些日志（index4 ~ 6）给 follower 后，尚未来得及 commit 时发生了宕机，但它很快恢复过来了，又被选为了 term3 的 leader，它继续同步了一些日志（index7~11）给 follower，但同样未来得及 commit 就又发生了宕机，紧接着 follower-f 也发生了宕机，当 follower-f 醒来时，集群已经前进到 term8 了。
### 处理日志不一致场景
> 那么 Raft 是如何应对这么多不一致场景的呢？其实方式很简单暴力，想想 **Strong Leader** 这个词。

**Raft 强制要求 follower 必须复制 leader 的日志集合来解决不一致问题。**<br />也就是说，follower 节点上任何与 leader 不一致的日志，都会被 leader 节点上的日志所覆盖。这并不会产生什么问题，因为某些选举上的限制，如果 follower 上的日志与 leader 不一致，那么该日志在 follower 上**一定是未提交的**。未提交的日志并不会应用到状态机，也不会被外部的客户端感知到。<br />要使得 follower 的日志集合跟自己保持完全一致，leader 必须先找到二者间**最后一次**达成一致的地方。因为一旦这条日志达成一致，在这之前的日志一定也都一致（回忆下前文）。这个确认操作是在 AppendEntries RPC 的一致性检查步骤完成的。<br />Leader 针对每个 follower 都维护一个 **next index**，表示下一条需要发送给该follower 的日志索引。当一个 leader 刚刚上任时，它初始化所有 next index 值为自己最后一条日志的 index+1。但凡某个 follower 的日志跟 leader 不一致，那么下次 AppendEntries RPC 的一致性检查就会失败。在被 follower 拒绝这次 Append Entries RPC 后，leader 会减少 next index 的值并进行重试。<br />最终一定会存在一个 next index 使得 leader 和 follower 在这之前的日志都保持一致。极端情况下 next index 为1，表示 follower 没有任何日志与 leader 一致，leader 必须从第一条日志开始同步。<br />针对每个 follower，一旦确定了 next index 的值，leader 便开始从该 index 同步日志，follower 会删除掉现存的不一致的日志，保留 leader 最新同步过来的。<br />整个集群的日志会在这个简单的机制下自动趋于一致。此外要注意，**leader 从来不会覆盖或者删除自己的日志**，而是强制 follower 与它保持一致。
:::info
这就要求集群票选出的 leader 一定要具备“日志的正确性”，这也就关联到了：选举上的限制。
:::

## 安全性保障
### 五条公理
> 忽略证明过程。

| **特性** | **解释** |
| --- | --- |
| 选举安全特性 | 对于一个给定的任期号，最多只会有一个领导人被选举出来 |
| 领导人只附加原则 | 领导人绝对不会删除或者覆盖自己的日志，只会增加 |
| 日志匹配原则 | 如果两个日志在相同的索引位置的日志条目的任期号相同，那么我们就认为这个日志从头到这个索引位置之间全部完全相同 |
| 领导人完全特性 | 如果某个日志条目在某个任期号中已经被提交，那么这个条目必然出现在更大任期号的所有领导人中 |
| 状态机安全特性 | 如果一个领导人已经将给定的索引值位置的日志条目应用到状态机中，那么其他任何的服务器在这个索引位置不会应用一个不同的日志 |

### 选举和提交的限制
> 每一任的领导者 一定会有所有任期内领导者的全部已提交日志吗?

**每个 candidate 必须在 RequestVote RPC 中携带自己本地日志的最新 (term, index)，如果 follower 发现这个 candidate 的日志还没有自己的新，则拒绝投票给该 candidate。**<br />Candidate 想要赢得选举成为 leader，必须得到集群大多数节点的投票，那么**它的日志就一定至少不落后于大多数节点**。又因为一条日志只有复制到了大多数节点才能被 commit，因此**能赢得选举的 candidate 一定拥有所有 committed 日志**。<br />![33d40b82-6970-4c52-a3d8-585389a56301.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1699342620234-22cd5c2c-789c-4e8f-88c0-f39bc3bafb77.png#averageHue=%23ccc5ac&clientId=u2527c9cf-1857-4&from=paste&height=400&id=u23df7b1a&originHeight=600&originWidth=1280&originalType=binary&ratio=1&rotation=0&showTitle=false&size=453981&status=done&style=none&taskId=ub44f5a5f-0c24-4c80-aedc-9d295159a7a&title=&width=853.3333333333334)
> 1. 时刻a，Sl是任期2的领导人并且向部分节点（S1和S2）复制了2号位置的日志条目，然后宕机
> 2. 时刻b，S5获得了S3、S4( S5的日志与S3和S4的一样新，最新的日志的任期号都是1）和自己的选票赢得了选举，成了3号任期的领导人，并且在2号位置上写人了一条任期号为3的日志条目。在新日志条目复制到其他节点之前，S5若机了
> 3. 时刻c，S1重启，并且通过S2、S3、S4和自己的选票赢得了选举，成了4号任期的领导人，并且继续向S3复制2号位置的日志。此时，任期2的日志条目已经在大多数节点上完成了复制
> 4. 时刻d，S1发生故障，S5通过S2、S3、”的选票再次成为领导人（因为S5最后一条日志条目的任期号是3，比S2、S3、S4中任意一个节点上的日志都更加新），任期号为5。然后S5用自己的本地日志夜写了其他节点上的日志
> 5. 上面这个例子生动地说明了，即使日志条目被半数以上的节点写盘（复制）了，也并不代表它已经被提交（commited）到Raft集群了——因为一旦某条日志被提交，那么它将永远没法被删除或修改。这个例子同时也说明了，领导人无法单纯地依靠之前任期的日志条目信息判断它的提交状态
> 6. 因此，针对以上场景，Raft算法对日志提交条件增加了一个额外的限制：**要求Leader在当前任期至少有一条日志被提交，即被超过半数的节点写盘**
> 7. 正如上图中e描述的那样，S1作为Leader，在崩溃之前，将3号位置的日志（任期号为4）在大多数节点上复制了一条日志条目（指的是条目3，term 4），那么即使这时·S1若机了，S5也不可能赢得选举一一因为S2和S3最新日志条目的任期号为4，比S5的3要大，S3无法获得超过半数的选票。“无法赢得选举，这就意味着2号位置的日志条目不会被覆写 

**所以新上任的领导者在接受客户端写入命令之前 需要提交一个no-op(空命令)，携带自己任期号的日志复制到大多数集群节点上才能真正的保证选举限制的成立。**

## 工程优化
### 容错性保障
下面列举了一些问题以及解法：

1. 领导者崩溃通过选举可以解决,但跟随者与候选人崩溃呢?
> 基础的raft算法,通过无限次幂等的附加复制rpc进行重试来解决。

2. 当平均故障时间大于信息交换时间,系统将没有一个稳定的领导者,集群无法工作
> 广播时间   <<  心跳超时时间  << 平均故障时间

3. 客户端如何连接raft的server节点?
> 客户端随机选择一个节点去访问,如果是跟随者,跟随者会把自己知道的领导者告知客户端

4. 领导者提交后返回时崩溃,客户端重试不就导致相同的命令反复执行了吗?
> 客户端为每次请求标记唯一序列号,服务端在状态中维护客户端最新的序列号标记 进行幂等处理

5. 客户端给领导者set a=3 并进行了提交,此时客户端如果从一个未被同步的节点读取a 读不到写后的值
> 每个客户端应该维持一个latestIdx值,每个节点在接受读请求的时候与自己的lastApplied值比较,如果这个值大于自己的lastApplied,则拒绝此次请求,客户端重定向到一个lastApplied大于等于自己latestIdx的请求,并且每次读取请求都会返回这个节点的lastApplied值,客户端将latestIdx更新为此值,保证读取的线性一致。

6. 如果leader被孤立, 其他跟随者选举出leader,但是当前leader还是向外提供脏数据怎么办?
> 写入数据由于无法提交,因此会立即失败，但无法防止读到脏数据<br />解决办法是:心跳超过半数失败,leader感知到自己处于少数分区而被孤立进而拒绝提供读写服务。

7. 当出现网络分区后， 被孤立少数集合的节点无法选举，只会不断的增加自己的任期 分区恢复后由于失联的节点任期更大，会强行更新所有节点的任期,触发一次重新选举,而又因为其日志不够新，被孤立的节点不可能成为新的leader所以，其状态机是安全的，只是触发了一次重新选举，使得集群有一定时间的不可用。这是完全可以避免的
> 在跟随者成为候选人时，先发送一轮pre-vote rpc 来判断自己是否在大多数分区内(是否有半数节点回应自己），如果是则任期加1进行选举。否则的话就不断尝试pre-vote请求。

### 快照技术
正常情况下，Raft 的日志会随着请求的增加而不断增长，占用大量空间，当一个节点需要恢复到当前集群节点状态时，需要重新执行一遍 committed 的日志，如果这个日志很大，恢复耗时会很久。所以得用一定的方式来压缩日志，清除过时的信息。<br />最简单的方法就是快照技术（snapshotting），在某个时间点下的整个当前系统状态都会以快照的形式持久化，先前的日志就会被废除。<br />采用增量压缩方法（Incremental approaches to compaction），比如日志清理（log cleaning）和日志结构合并树（log-structured merge trees，熟知的 LSM-Tree），都是可行的。这些方法每次只对一部分的数据操作，分散了压缩的负载压力。首先选择一个积累了大量已删除数据和已覆写对象的区域，然后重写还存活的对象，释放该区域。比起快照技术，这种方式引入了大量额外机制和复杂性，而快照技术通过操作数据集来简化问题。当需要日志清理时，状态机会像快照技术一样使用相同的接口来实现 LSM 树。
### 一致性读写
> 其实要实现一致性读，无非核心思想就两点：

- 保证在读取时的最新 commit index 已经被 apply。
- 保证在读取时 leader 仍拥有领导权。

无论是 Read Index 还是 Lease Read，最终目的都是为了解决第二个问题。换句话说，读请求最终一定都是由 leader 来承载的。<br />那么读 follower 真的就不能满足线性一致吗？<br />其实不然，这里我们给出一个可行的读 follower 方案：**Follower 在收到客户端的读请求时，向 leader 询问当前最新的 commit index，反正所有日志条目最终一定会被同步到自己身上，follower 只需等待该日志被自己 commit 并 apply 到状态机后，返回给客户端本地状态机的结果即可**。这个方案叫做 **Follower Read**。<br />注意：Follower Read 并不意味着我们在读过程中完全不依赖 leader 了，在保证线性一致性的前提下完全不依赖 leader 理论上是不可能做到的。

## 总结
本文重点讲解了Raft关键信息，以及实现上的特性，以及抛砖引玉的列了一些工程经验。<br />关键因素：

- Leader election 领导者选举
- Log replication 日志复制
- Safety 安全性

特性：

- Strong leader（强领导性）
- Leader election（领导选举）
- Membership changes（成员变更）

因为内容过于深邃，笔者也只是一个初步窥探分布式的小白。分布式的知识涉及的内容太多了，从上层到底层，都有很多内容，也很有意思。感兴趣的同学，可以查原论文进行了解学习，推荐MIT的分布式课程，了解一些大型架构是如何去做设计的，以及底层用到了哪些思路。<br />希望文章对你有所帮助，感谢你的观看！

参考：

- 《In Search of an Understandable Consensus Algorithm》
- 《Raft 分布式一致性(共识)算法论文精读与ETCD源码分析》
