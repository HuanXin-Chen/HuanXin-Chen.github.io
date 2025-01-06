---
title: 一文自顶向下串起MySQL
description: 一条龙MySQL
pubDatetime: 2023-10-09
published: true
ogImage: ../../assets/11.png
language: cn
tags:
  - 后端技术
---
> 说起MySQL，大家应该都会写sql语句，可是你知道MySQL是如何运行的吗？
> 本文，将从一条SQL语句开始，一步步，自顶向下串起MySQL。


---

## MySQL整体架构：SQL语句的执行流程
![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696818883219-0881f5f5-9a7a-4be9-9830-1adf20acd577.png#averageHue=%23ecefe2&clientId=u7fea0246-d7ac-4&from=paste&id=ud6389bf6&originHeight=1440&originWidth=1920&originalType=url&ratio=1.5&rotation=0&showTitle=false&size=609051&status=done&style=none&taskId=ue63f21a8-25b8-48c6-89d3-620d1e45f55&title=)
> 如上，是MySQL的整体架构。
> 我们的核心，是在优化器。
> 在正式进入讲解优化器之前，我们要了解说一下缓存。

MySQL 8.0版本直接将查询缓存的整块功能删掉了，也就是说8.0开始彻底没有这个功能了。<br />为什么要删除缓存，以及为什么不建议使用缓存？
> 查询缓存的失效非常频繁，只要有对一个表的更新，这个表上所有的查询缓存都会被清空。因此很可能你费劲地把结果存起来，还没使用呢，就被一个更新全清空了。


---


## MySQL索引模型：利用好B+树方法
> MySQL的索引模型是什么样的？

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696819419633-0e9c4927-d786-4ccb-baeb-27750d6da954.png#averageHue=%23fafafa&clientId=u7fea0246-d7ac-4&from=paste&id=uf771938c&originHeight=533&originWidth=1136&originalType=url&ratio=1.5&rotation=0&showTitle=false&size=61492&status=done&style=none&taskId=u099d3e2a-7cc4-406c-8dbe-b479b07ee0a&title=)<br />那么，为什么选择B+树，而非其他呢？

> - **更少的IO次数：** B+树的非叶节点只包含键，而不包含真实数据，因此每个节点存储的记录个数比B数多很多（即阶m更大），因此B+树的高度更低，**访问时所需要的IO次数更少**。此外，由于每个节点存储的记录数更多，所以对访问局部性原理的利用更好，缓存命中率更高。
> - **更适于范围查询：** 在B树中进行范围查询时，首先找到要查找的下限，然后对B树进行中序遍历，直到找到查找的上限；而B+树的范围查询，只需要对链表进行遍历即可。
> - **更稳定的查询效率：** B树的查询时间复杂度在1到树高之间(分别对应记录在根节点和叶节点)，而B+树的查询复杂度则稳定为树高，因为所有数据都在叶节点。

> 补充：一些数据结构的对比
> - 二叉查找树(BST)：**解决了排序的基本问题，但是由于无法保证平衡，可能退化为链表；**
> - 平衡二叉树(AVL)：**通过旋转解决了平衡的问题，但是旋转操作效率太低；**
> - 红黑树：**通过舍弃严格的平衡和引入红黑节点，解决了AVL旋转效率过低的问题，但是在磁盘等场景下，树仍然太高，IO次数太多**；
> - B树：**通过将二叉树改为多路平衡查找树，解决了树过高的问题**；<br />红黑节点，解决了AVL旋转效率过低的问题，但是在磁盘等场景下，树仍然太高，IO次数太多；
> - B树：**通过将二叉树改为多路平衡查找树，解决了树过高的问题**；
> - B+树：在**B树的基础上，将非叶节点改造为不存储数据的纯索引节点，进一步降低了树的高度；此外将叶节点使用指针连接成链表，范围查询更加高效。**

在设计算法和数据结构的时候，我们不能一味的只是考虑数据结构和算法本身的效率，应该结合硬件层面去思考。B+树降低了树高，减少了IO操作，极大的提高了效率。
### 索引的类型
> 索引有哪些类型？

- 聚簇索引：数据在叶子节点，索引即数据，数据即索引
- 二级索引：以其他列建一个索引，再进行回表

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696820139919-f56038f1-0bb6-40ec-b6cd-2323eafc4e7e.png#averageHue=%23fcfbfa&clientId=u7fea0246-d7ac-4&from=paste&height=391&id=u3a490074&originHeight=586&originWidth=1112&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=149190&status=done&style=none&taskId=u3cd391f9-0111-48e8-898c-7919d77dabf&title=&width=741.3333333333334)

- 联合索引：根据多个列依次对B树进行排序

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696820159778-5e326591-1438-4e9a-986e-042317cf77b2.png#averageHue=%23fcfbfa&clientId=u7fea0246-d7ac-4&from=paste&height=411&id=uc8dc97cc&originHeight=617&originWidth=1153&originalType=binary&ratio=1.5&rotation=0&showTitle=false&size=157611&status=done&style=none&taskId=u7b64eb19-473f-40b7-a407-83b4af17672&title=&width=768.6666666666666)
### 利用好索引：从B+排序和结构理解
> 上面我们讲类型，多次提高排序。
> B+树的排序，是根据键值声明，依次进行排序。
> 那么，从排序的角度思考，我们如何利用好这个点，进行一些性能优化。

> 全值查询：查询where条件命中索引全部列

能够命中所有索引列，当然会直接走索引查询。
> 最左原则
> - 匹配左边的列：如果我们想使用联合索引中尽可能多的列，搜索条件中的各个列必须是联合索引中从最左边连续的列。
> - 匹配列前缀：命中索引左边列的同时，且条件判断前缀可命中（WHERE name LIKE 'As%'）
> - 匹配范围值：命中左边列的范围匹配
> - 精确匹配某一列并范围匹配另外一列：命中左边列是前提

因为mysql是按照键的声明顺序进行排序的，也就是，只有命中靠左边的列，才能利用好B+树排序上的顺序，实现性能最佳，才会走索引查询。
> 那么B+树会进行排序，是不是我们也还可以利用B+树，来避免文件排序？
> 答案是可以的。但是也有一些限制条件要注意。

> 用于排序：对于需要排序的操作，用索引避免文件排序
> - ASC和DESC不能混用
> - 注意排序规则要符合索引排序，顺序，字段要相同
> - where子句不能出现非索引列
> - 不能修饰字段，要以单独列出现

因为本身B+树是有序的，要想利用他来进行排序，你的sql设计必须符合B+是的排序结构。
> 除了排序，还可以利用于分组，一个道理，因为B+树本身会把规则相似的集中排放。

> 用于分组：和排序一个道理，按照索引规则进行分组

> 除了排序这一个点可以利用，我们还能使用的点有就是本身的结构设计。
> 一般情况下，我们会通过索引去拿到表的更多信息。这需要进行一个回表操作，非常耗费OI。
> 但是如果能在一开始就在索引层拿到数据，就可以不用进行回表了。
> 这就是覆盖索引。

> 覆盖索引
> - 回表的代价：属于随机IO，非常耗性能
> - 最好在查询列表里只包含索引列，这样能减少回表

### 索引代价：回到硬件层面思考
> 任何提高性能的设计，本身又要带来一些新的性能损耗。

空间代价：每个节点都会占用16KB的存储空间<br />时间代价：当索引很多的时候，增删改都需要对各个索引树进行修改，包括页分裂等操作，拖垮性能
> 所以，在合适的场景使用索引，才能带来更好的性能！

常见的场景：
> - 全值匹配
> - 匹配左边的列
> - 匹配范围值
> - 精确匹配某一列并范围匹配另外一列
> - 用于排序
> - 用于分组

 为谁创建索引：
> - 只为用于搜索、排序或分组的列创建索引
> - 考虑列的基数，为基数大的列创建索引
> - 索引列的类型应该尽量小
> - 索引字符值前缀：减少内存开销，符合实际应用场景（尴尬，不支持排序）

除此之外，还有一个点，从插入的顺序上避免性能损耗：
> - 让主键具有AUTO_INCREMENT，让存储引擎自己为表生成主键，而不是我们手动插入

> 这在后续了解InnoDB页结构，就能理解为什么了。

当然，也要避免冗余索引，已经能实现某一个索引的单独功能，就没有必要再为某个索引创建索引。
> - 避免冗余索引：多个列，c1，c2，c3，这时候没必要再创建一个c1索引

### 索引补充：一些额外的知识
> 如果没有索引，是如何进行查找对比？

> 没有索引
> - 主键为搜索条件：二分法定位
> - 非主键搜索条件：依次遍历

为什么主键为条件，是进行二分法定位？后续更深的结构介绍，你将会知道为什么。
> InnoDB的B+树索引注意事项。

> - 根页面万年不动
> - 内节点中目录项记录的唯一性：目录项记录内容（列、主键、页号）
> - 一个页面至少存储2条记录（最好的查询性能保证）
> - 对比MyISAM：该引擎所有索引都是二级索引（列+行号的信息去回表）
> - 索引创建格式后面的声明格式：[INDEX|KEY] 索引名 (需要被索引的单个列或多个列);


---


## MySQL记录结构：底层是如何存信息的？
> 上面讲了索引模型，那具体到底层的存储实现，他是如何进行设计的？
> 为什么说依靠主键的搜索条件，是二分法？
> 下面我们具有介绍InnoDB的记录结构。

### InnoDB行格式（COMPACT为代表理解）
> 如下为一行信息的结构示意图。
> 我们只需要做到了解他大体的模样即可。里面的一些关键字段，我们后续会进行细讲。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696827911825-bdf13d24-c83e-432b-8deb-5121870f6836.png#averageHue=%23f7ebe4&clientId=ud38c2c1f-f5f2-4&from=paste&height=250&id=ub3388464&originHeight=250&originWidth=783&originalType=binary&ratio=1&rotation=0&showTitle=false&size=41097&status=done&style=none&taskId=u1e24ed8d-f9b4-4c69-8c51-e3f13517739&title=&width=783)
> 在真实记录的时候，还会写上一些隐藏额外的信息：
> - 行ID（可选，没有主键进行添加），事务ID，回滚指针
> 
这些具体是什么，我们后续细讲。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696827989222-b7c90229-ce11-47cc-8228-cbaf3a6e32c4.png#averageHue=%23f8eae2&clientId=ud38c2c1f-f5f2-4&from=paste&height=354&id=u46c759b1&originHeight=354&originWidth=1094&originalType=binary&ratio=1&rotation=0&showTitle=false&size=86721&status=done&style=none&taskId=u18040853-59d7-4d81-8823-f3c944bd2d3&title=&width=1094)
> 一条记录是有最大存储程度的，如果超出了最大存储程度，会如何？
> 对于Compact格式，他会进行页分散。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696828125986-0fac1812-d897-48e3-a9c5-89ee0a5e2b33.png#averageHue=%23fcfcfc&clientId=ud38c2c1f-f5f2-4&from=paste&height=213&id=ue3f5025c&originHeight=213&originWidth=951&originalType=binary&ratio=1&rotation=0&showTitle=false&size=32135&status=done&style=none&taskId=u6493f19c-b99d-4611-a776-e40620dfc76&title=&width=951)

### InnoDB数据页结构（页是如何组织行）
> 如果你对操作系统的内存管理有一定的了解，那么这一块理解将非常简单。
> 大多数系统的内存管理底层，都是通过链表来进行管理串联。

那么，一个数据页的样子是什么样的？
> 页中的信息存储方式，不断占用Free Space变成User Records来进行存储。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696828389162-d19660b2-1eef-4a0b-80fa-bdc0797f74e3.png#averageHue=%23e1dfc4&clientId=ud38c2c1f-f5f2-4&from=paste&height=475&id=u06141dfa&originHeight=475&originWidth=1272&originalType=binary&ratio=1&rotation=0&showTitle=false&size=127615&status=done&style=none&taskId=u5a27b0ff-4cdc-424e-821f-66cb84e5ebd&title=&width=1272)
> 对于多个页的管理，他们通过双链表的形式进行组织。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696828409836-93a9fadd-8348-4103-ac1a-373ef08d7141.png#averageHue=%23f3e1c6&clientId=ud38c2c1f-f5f2-4&from=paste&height=365&id=ueff343b1&originHeight=365&originWidth=898&originalType=binary&ratio=1&rotation=0&showTitle=false&size=83383&status=done&style=none&taskId=ucabeb137-e070-46e1-b2e0-8ce8d37c9f9&title=&width=898)
### InnoDB页与行的组织
> 上面，我们讲到对于没有索引的情况下，基于主键的查找对比，是通过二分法。这是为什么？
> 这就得来看看，页与行之间的组织关系。

> 看看记录头里面的内容：

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696828750798-782656ce-00f6-41a5-a7b7-a43471547639.png#averageHue=%23faf6f3&clientId=ud38c2c1f-f5f2-4&from=paste&height=474&id=uc8ef16f7&originHeight=474&originWidth=1121&originalType=binary&ratio=1&rotation=0&showTitle=false&size=70540&status=done&style=none&taskId=ud364fb3e-db6a-4376-85f5-672430af4ae&title=&width=1121)
> 对于多条行记录：通过链表的形式进行组织

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696828819971-5ba729c0-c1d3-4218-ae3b-4e3da2e80692.png#averageHue=%23f6ede4&clientId=ud38c2c1f-f5f2-4&from=paste&height=528&id=u43e46b6e&originHeight=528&originWidth=1032&originalType=binary&ratio=1&rotation=0&showTitle=false&size=112386&status=done&style=none&taskId=ud7fe7c24-2a0b-4d90-9360-e2545389a93&title=&width=1032)<br />注意：在标记删除的时候，并不会直接回收，而是弄成一个垃圾链表的形式，用于后续的空间复用。除此之外，还多维护了两条虚记录，一个最大与最小。这两条记录有什么作用，别急，往后看！
> 如果单纯的靠链表来进行管理，查找会非常耗费时间。
> 我们可以通过索引进行优化，实现有序的分组查找，事实上mysql也是这么做。
> 而最小与最大记录，就是记录是否分组的一个游标控制。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696828971747-ae578643-48e4-4975-a256-29c52de0e1d0.png#averageHue=%23ebf2e6&clientId=ud38c2c1f-f5f2-4&from=paste&height=638&id=u6dca8d31&originHeight=638&originWidth=1034&originalType=binary&ratio=1&rotation=0&showTitle=false&size=175309&status=done&style=none&taskId=u3e2e5e0e-4b24-4022-b12e-a1e9f10b5ab&title=&width=1034)

---


## MySQL事务模型：现实与生活的映射
> 上面我们在讲行结构的时候，说到了有隐藏列的数据。
> 这些隐藏列的信息，是用于什么的？答案就是我们的事务。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696829642122-307fb7db-45ce-473f-b7e3-8b77b62aea66.png#averageHue=%23f8dbca&clientId=ud38c2c1f-f5f2-4&from=paste&height=190&id=u561e659c&originHeight=190&originWidth=729&originalType=binary&ratio=1&rotation=0&showTitle=false&size=29245&status=done&style=none&taskId=u8361da88-b58c-44ed-ad31-eddfceb2e84&title=&width=729)
> 事务是现实生活的映射，我们需要保证核心性质（AICD）：
> - 原子性：操作不可分割，要么全做，要么全不做
> - 隔离性：其它的状态转换不会影响到本次状态转换
> - 一致性：与现实生活的映射一致，原子性+隔离性+数据库性质+业务代码保证
> - 持久性：状态永久保留

对于事务之间的状态迁移，如下（默认模式：读写模式）：<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696829790329-53d4830f-7bff-4026-92ac-2803c56e367c.png#averageHue=%23fcfcfc&clientId=ud38c2c1f-f5f2-4&from=paste&height=398&id=u92902b2b&originHeight=483&originWidth=791&originalType=binary&ratio=1&rotation=0&showTitle=false&size=67382&status=done&style=none&taskId=u237cd836-1d1e-4c92-b645-9e5452f8440&title=&width=651)
### MVCC实现
> 我们先从宏观的应用角度，来说说事务。

mysql的默认隔离级别如下：<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696829946546-c7e08574-35c7-4773-ac20-a5532e21af49.png#averageHue=%23ecebeb&clientId=ud38c2c1f-f5f2-4&from=paste&height=237&id=u67b1e6a2&originHeight=237&originWidth=1245&originalType=binary&ratio=1&rotation=0&showTitle=false&size=216521&status=done&style=none&taskId=u2755589e-1c57-4cfd-8fb6-7a7e0de93f5&title=&width=1245)<br />一条信息的组织信息如下，通过列表进行组织：（undo log，后续细讲）<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696829972355-1fbaeb81-ef07-430e-a33b-8de4901359d3.png#averageHue=%23f2f2f2&clientId=ud38c2c1f-f5f2-4&from=paste&height=549&id=u4f5f6506&originHeight=688&originWidth=654&originalType=binary&ratio=1&rotation=0&showTitle=false&size=72090&status=done&style=none&taskId=ud6205641-028d-4301-bbff-ab654843c57&title=&width=522)
> 在进行事务的时候，会生成一个ReadView，什么是ReadView？
> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696830043124-1de8faef-0779-4e8f-aef1-f4e0b3678214.png#averageHue=%23eeeeee&clientId=ud38c2c1f-f5f2-4&from=paste&height=245&id=u939da149&originHeight=245&originWidth=596&originalType=binary&ratio=1&rotation=0&showTitle=false&size=30356&status=done&style=none&taskId=u33289109-dd19-4ad0-90fe-f9135c2c9c4&title=&width=596)
> 他是快照读时候的MVCC数据依据。
> 注意：当前读Insert、Update、Delete等更新操作时候的读取方式，不会使用视图。

下面我们每种隔离级别下，读取数据容易产生的一些问题，来进行一个分析吧。
> - RC读已经提交：可以产生脏读、幻读，每次生成一个ReadView（如图一个张三、一个张小三）
> 
他是通过对比id大小以及是否在活跃列表，来进行数据读取可否确定

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696830403743-2fcd4d85-f17f-40a5-959e-67c3d54cca49.png#averageHue=%23f9f9f9&clientId=ud38c2c1f-f5f2-4&from=paste&height=521&id=u456b22e3&originHeight=521&originWidth=1307&originalType=binary&ratio=1&rotation=0&showTitle=false&size=92178&status=done&style=none&taskId=u4540c7d6-167b-4245-85a9-ed9ea2b80b8&title=&width=1307)
> - RR可重复读：不会脏读，在之下当前读时候可能会产生幻读，一般情况下复用ReadView（一直张三）

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696830476941-478078c6-cd60-4a20-8173-2b9b6e1c15be.png#averageHue=%23f9f9f9&clientId=ud38c2c1f-f5f2-4&from=paste&height=388&id=u33a95946&originHeight=388&originWidth=1151&originalType=binary&ratio=1&rotation=0&showTitle=false&size=67862&status=done&style=none&taskId=u21ce3066-ca5c-4617-8fd0-88b4987988b&title=&width=1151)
> 那么，RR会不会产生幻读？
> 答案是会的，如果进行了当前读的情况下，他会重新产生视图，所以会造成幻读。
> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696830530550-c027fb0b-8172-4324-933f-54afb71161be.png#averageHue=%23f9f9f9&clientId=ud38c2c1f-f5f2-4&from=paste&height=499&id=u1521c892&originHeight=499&originWidth=1021&originalType=binary&ratio=1&rotation=0&showTitle=false&size=58653&status=done&style=none&taskId=u048e0d85-2ea8-4226-8591-9e20555cec1&title=&width=1021)

### MySQL锁机制
上面mvcc机制，是针对于快照读。而除了快照读，还有当前读。<br />那么什么是当前读？我们再进行一个巩固了解。
> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696830597142-118f2883-7cfa-4301-9015-b44f7485a45d.png#averageHue=%23f3f3f2&clientId=ud38c2c1f-f5f2-4&from=paste&height=346&id=u7d2bc44c&originHeight=582&originWidth=772&originalType=binary&ratio=1&rotation=0&showTitle=false&size=223237&status=done&style=none&taskId=ua0b67e53-fa40-4752-b806-ceedc5be72f&title=&width=459)

上面说到共享读锁和独占写锁，他们的性质，要说到读锁与写锁的兼容问题。（红色代表禁止）
> ![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696830897713-bbb5de5c-e001-4303-be47-f75f503c208d.png#averageHue=%23f7f7f6&clientId=ud38c2c1f-f5f2-4&from=paste&height=236&id=u8bc6d29b&originHeight=383&originWidth=825&originalType=binary&ratio=1&rotation=0&showTitle=false&size=148629&status=done&style=none&taskId=u8545ab4e-e1db-401c-b8f6-bf0f1574485&title=&width=509)

> 那么接下来，我们来讲讲每种锁的具体性质吧。

> - 全局锁：锁定数据库所有的表（数据备份使用）
> - 表锁：锁住整张表，粒度大
> - 元数据锁：防止DML和DDL冲突，隐式加锁
> - 意向锁：避免加表锁时一行一行查看加锁情况，解决上述低效而引入的隐式加锁

> 除此之外，还有行级锁。

> - 行锁：对单个记录加锁，RC和RR都支持
> - 间隙锁：锁的是记录间隙，RR下才有（解决幻读）
> - 临键锁：锁的是当前记录+记录前的间隙（解决幻读）

这里的间隙锁和临建锁，用来做啥啊？<br />解决幻读，比如这种情况，查找id大于4的内容，我们在间隙和4进行加锁，这样就能避免插入数据。

---


## MySQL缓存设计：提升性能效果
> 上面我们所讲的内容，似乎都是在针对磁盘而言。但是我们知道，磁盘的IO操作是非常耗费时间的。
> 对于MySQL来说，一定有某种设计，来调节磁盘与CPU的矛盾。
> 而这种设计就是我们接下来要讲的缓存buffer_pool。

### Buffer Pool设计
> 他的组成如下：控制块+缓存页

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696832020129-1dd89d9e-d910-4f2d-8031-1c576968ea0b.png#averageHue=%23f6f4f3&clientId=ud38c2c1f-f5f2-4&from=paste&height=339&id=u50d1a8cf&originHeight=339&originWidth=1004&originalType=binary&ratio=1&rotation=0&showTitle=false&size=46937&status=done&style=none&taskId=ufec9d9f2-cce6-4322-a821-b80b7067e52&title=&width=1004)
> 那么他如何来确定哪个页可以用？
> 又是链表：Free链表

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696832056468-68ca104e-117d-4ef1-bec0-0364129619a9.png#averageHue=%23faf8f5&clientId=ud38c2c1f-f5f2-4&from=paste&height=606&id=ube1c7454&originHeight=606&originWidth=1010&originalType=binary&ratio=1&rotation=0&showTitle=false&size=123498&status=done&style=none&taskId=ud29a8d45-b275-4851-9844-d0ff9ccfc5e&title=&width=1010)
> 那当访问一个页的时候，如何确定他是否有缓存？有没有一种高效的判断方法？
> 答案的哈希处理！
> - 表空间号 + 页号作为key，缓存页作为value
> - 没有加载，并放到缓冲中

> 除此之后，什么时候会把更新了的缓存页，写回磁盘？

首先，对于更新了的列表，他有一个flush链表进行管理。<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696832267005-8c190360-9bfe-4da8-94eb-d0f91b7fd4c5.png#averageHue=%23faf8f4&clientId=ud38c2c1f-f5f2-4&from=paste&height=591&id=ubc1f23b8&originHeight=591&originWidth=1010&originalType=binary&ratio=1&rotation=0&showTitle=false&size=124140&status=done&style=none&taskId=ub80fea55-d79d-4dc0-ba32-0ece3c5a55b&title=&width=1010)
### 缓存写回策略
> 那么接下来缓存回磁盘的操作就非常简单了，他只需要进行后台刷新即可。
> - 从LRU链表的冷数据中刷新一部分页面到磁盘
> - 从flush链表中刷新一部分页面到磁盘
> - 无奈之下的刷新，实在没有缓冲页了，也没有可替代BUF_FLUSH_SINGLE_PAGE，拖垮请求速度
> - 速率取决于系统是否频繁

> 但是，仍热有一个问题，如果缓存空间不足了，如何进行淘汰？
> - 答案是：使用LRU淘汰，但是mysql的LRU做了一个分区处理？
> 
为什么使用分区处理，请等我慢慢道来。

因为InnoDB回进行预读处理，所以，Flush的数据，不一定是我们真正想要的。<br />我们真正想要的数据，是那些经常访问的数据。<br />所以，就有了分区规则。
> - 使用频率非常高的缓存页，叫热数据，或者称young区域
> - 使用频率不是很高的缓存页，叫冷数据，或者称old区域
> - 示意图：按比例划分节点数![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696832827521-5155d399-fc0b-457b-9b94-878e9429238f.png#averageHue=%23faf8f4&clientId=ud38c2c1f-f5f2-4&from=paste&id=u036381ec&originHeight=460&originWidth=1097&originalType=url&ratio=1&rotation=0&showTitle=false&size=121188&status=done&style=none&taskId=u5ad41e2f-65dd-4b47-a0a7-a24b5bc1081&title=)

那么，后续的添加规则，都先往old进行添加。

- 第一次访问，先加入old
- 后续间隔大于innodb_old_blocks_time，则加入young
- 解决的问题：避免全表开销破坏实际的维护
> 那么接下来的淘汰就非常方便了，只需要淘汰old不常用的即可。

当然，mysql还有很多美妙的设计，比如为了降低调整频率。<br />只有缓存页位于young区域的1/4的后边，才会被移动到LRU链表头部。
### 多个Buffer情况
> 在实际的运用场景中，不止有一个pool，我们可以多个pool，来实现并发性。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696833280036-f9cada36-7708-4392-a1ee-3e4474c10e7b.png#averageHue=%23cbd8b0&clientId=ud38c2c1f-f5f2-4&from=paste&height=444&id=ua6b40865&originHeight=444&originWidth=1089&originalType=binary&ratio=1&rotation=0&showTitle=false&size=81648&status=done&style=none&taskId=u049cbd6a-1b52-43e1-ab80-9b9f4d4d2bb&title=&width=1089)<br />mysql为了支持动态调整Buffer大小，且解决动态调整Buffer大小开销问题chunk，还设计了chunk结构。<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696833432699-4d32e6a3-3a91-4394-b2c5-00ad20692a9b.png#averageHue=%23c0d3ac&clientId=ud38c2c1f-f5f2-4&from=paste&height=553&id=u0750b616&originHeight=553&originWidth=1112&originalType=binary&ratio=1&rotation=0&showTitle=false&size=116305&status=done&style=none&taskId=u67609f66-302b-416c-b578-7ae2ed3c182&title=&width=1112)<br />这样我们可以以chunk的倍数，进行动态调整大小。
> - 注意要确保每个实例chunk数量一致，即整数倍关系，在实际内存分配中，会自动重新计算调整。


---


## MySQL日志实现：讲解三种日志
> 对于开发，日志是一个非常重要的模块。
> 对于mysql来说，他的日志有没有什么神奇的效果与魅力？
> 我们一起来探索吧！

### redo日志：说了什么
> **设计目的：**
> 让已经提交了的事务对数据库中数据所做的修改永久生效，即使后来系统崩溃，在重启后也能把这种修改恢复出来。同时，减少IO操作+减少大小。

> redo log是物理日志，他记录了数据，InnoDB特有。
> 他通过函数，实现逻辑特性。

他的通用结构如下：具体不同类型不进行细讲。<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696831748333-8f08e58d-b5e9-4727-a49d-f365bdd0243e.png#averageHue=%23faeae0&clientId=ud38c2c1f-f5f2-4&from=paste&height=253&id=u34b753a0&originHeight=253&originWidth=982&originalType=binary&ratio=1&rotation=0&showTitle=false&size=27830&status=done&style=none&taskId=ufb3d392c-d7e4-4e30-893c-0affc74f7d4&title=&width=982)<br />我们对数据库每一次操作，对于redo日志来说，他要进行记录，而每一次操作，对于日志系统来说，是一个事务。他也要保证原子性。
> 原子性保证：Mini-Transaction
> - 通过bit位标记是否为单原子操作，否则进行组划分MLOG_MULTI_REC_END
> 
对于一个事务来说，他的底层又是事务。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696833928228-24f28d40-2460-42a5-8c40-d1a11ff671e2.png#averageHue=%23fcfcfc&clientId=ud38c2c1f-f5f2-4&from=paste&height=559&id=u9b8babd1&originHeight=559&originWidth=619&originalType=binary&ratio=1&rotation=0&showTitle=false&size=24091&status=done&style=none&taskId=ud0977c7b-7b3f-457d-8362-42a9df14b61&title=&width=619)
> redo日志写入的实现：

他其实也是一种缓存实现![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696833997441-833b2503-04da-4197-806d-3b65bfa6cfde.png#averageHue=%23f9f0eb&clientId=ud38c2c1f-f5f2-4&from=paste&height=542&id=ua9b05214&originHeight=542&originWidth=842&originalType=binary&ratio=1&rotation=0&showTitle=false&size=90016&status=done&style=none&taskId=ufd01ee4c-bdea-443e-96ff-0b46974050d&title=&width=842)<br />那么对于多个mtr事务，如何实现隔离？（通过tmp再写回）<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696834032237-13a4ba0d-fd4e-4672-8291-14c053aaa14b.png#averageHue=%23fcf9f5&clientId=ud38c2c1f-f5f2-4&from=paste&height=507&id=u1b242b52&originHeight=507&originWidth=956&originalType=binary&ratio=1&rotation=0&showTitle=false&size=86183&status=done&style=none&taskId=u19f3a5b3-b6aa-42b5-b783-d6a208791ff&title=&width=956)
> 日志刷盘与缓存内存不足情况：
> - 刷盘时机：间不足，后台，服务关闭，事务提交，checkpoint，都会刷盘
> - 内存不足：进行刷盘，底层数据结构实现，循环数组

刷盘之后，write之后可以覆盖，小于checkpoint都可以覆盖<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696834293871-3ba4ad6e-edcc-4204-b15b-121486a99877.png#averageHue=%23f2f1eb&clientId=ud38c2c1f-f5f2-4&from=paste&id=u3ef567f1&originHeight=656&originWidth=1142&originalType=url&ratio=1&rotation=0&showTitle=false&size=153553&status=done&style=none&taskId=ua6a4315d-0202-49c5-b793-24d310abb0f&title=)
> 奔溃恢复：
> - 确定起点：最近发生的那次checkpoint的信息
> - 确定终点：LOG_BLOCK_HDR_DATA_LEN

当然，因为页不线性，为了解决线性恢复，又一次通过哈希进行处理，从而进行线性恢复，提升效率。<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696834391282-a505e16d-da10-4ba8-9c30-ced08407c4db.png#averageHue=%23fdf6f3&clientId=ud38c2c1f-f5f2-4&from=paste&height=634&id=ufb13d7b4&originHeight=634&originWidth=1112&originalType=binary&ratio=1&rotation=0&showTitle=false&size=136644&status=done&style=none&taskId=uee05ad7c-68d6-4f23-b488-3b4d09a25c6&title=&width=1112)
### binlog日志：做了什么
> MySQL整体来看，其实就有两块：一块是Server层，它主要做的是MySQL功能层面的事情；还有一块是引擎层，负责存储相关的具体事宜。上面我们聊到的粉板redo log是InnoDB引擎特有的日志，而Server层也有自己的日志，称为binlog（归档日志）。

> binlog是mysql特有的，与存储引擎无关。
> 他是通过追加写实现。

他通常和redo log进行配合，我们来看看他们的配合流程：<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696834786567-3076fff7-df3d-4faf-afd1-b6437358609c.png#averageHue=%23eaede0&clientId=ud38c2c1f-f5f2-4&from=paste&id=u65a815ea&originHeight=1522&originWidth=1142&originalType=url&ratio=1&rotation=0&showTitle=false&size=550680&status=done&style=none&taskId=u31009885-4fad-4a69-a214-9bca5c7732d&title=)
> 最后三步看上去有点“绕”，将redo log的写入拆成了两个步骤：prepare和commit。
> 这就是"两阶段提交"。

如果没有两阶段提交，任何一方没有写入，都会造成数据恢复的时候，出现不一致的情况！
### undo log：后悔了啊
> 在上面我们讲事务的时候，涉及到了undo log。同时我们在讲行结构的时候，也涉及到了隐藏列的信息。这些设计的目的，都是为了解决后悔问题，即实现事务回滚需求和事务隔离需求。

> id与日志的物理关系（维护全局变量（Max Trx ID））

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696835235475-2c82ac93-4d0b-4992-83e3-0d829e0a5c3a.png#averageHue=%2394a75b&clientId=ud38c2c1f-f5f2-4&from=paste&height=794&id=uba38b5f6&originHeight=794&originWidth=1857&originalType=binary&ratio=1&rotation=0&showTitle=false&size=164505&status=done&style=none&taskId=uf5b066a9-c0ae-44ee-9af8-3e68f379ddd&title=&width=1857)
> 对于多条日志记录，通过链表进行串联。注意删除时候，是进行标记删除。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696835274328-4abe3903-4bbe-4eed-8d5a-b7c24152b6fe.png#averageHue=%23a9c598&clientId=ud38c2c1f-f5f2-4&from=paste&height=542&id=uc56aac1f&originHeight=542&originWidth=672&originalType=binary&ratio=1&rotation=0&showTitle=false&size=61279&status=done&style=none&taskId=u2560750a-548f-4494-a85e-21a90cc9022&title=&width=672)
> 对于日志的空间分配，是按需分配。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696835322525-6e4043ba-e850-472e-9f85-e094acd7b717.png#averageHue=%23c0d8ad&clientId=ud38c2c1f-f5f2-4&from=paste&height=573&id=u83012222&originHeight=573&originWidth=1145&originalType=binary&ratio=1&rotation=0&showTitle=false&size=89343&status=done&style=none&taskId=u2b93833c-a869-4727-86c7-4ea54d489fe&title=&width=1145)
> 在实际的过程中，我们事务不止一个，回滚段会有很多，而他们通过这种树形结构进行关系组织

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696835654701-e40099b1-1d94-454d-9b07-61a56bfcfe9e.png#averageHue=%23fefefe&clientId=ud38c2c1f-f5f2-4&from=paste&height=618&id=u441324b0&originHeight=618&originWidth=1070&originalType=binary&ratio=1&rotation=0&showTitle=false&size=83006&status=done&style=none&taskId=uf34509e1-84c8-4a5f-a11b-a0a5dfdd2ec&title=&width=1070)

---


## MySQL单表访问：看待我们的访问
> 对于我们这些MySQL的使用者来说，MySQL其实就是一个软件，平时用的最多的就是查询功能。
> 时不时丢过来一些慢查询语句让优化，我们如果连查询是怎么执行的都不清楚还怎么做优化。

### 访问方法总结
> 下面是MySQL看待我们语句的一些方法情况。

> Const：通过主键或者唯一二级索引列来定位一条记录的访问方法。
> - 例：SELECT * FROM single_table WHERE key2 = 3841;

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696835990697-c6c08f4f-564e-4aed-be98-3c547fb4d749.png#averageHue=%23fcfbfa&clientId=ud38c2c1f-f5f2-4&from=paste&height=618&id=u58db5d82&originHeight=618&originWidth=845&originalType=binary&ratio=1&rotation=0&showTitle=false&size=100347&status=done&style=none&taskId=ue88556fe-a2fb-42ca-a942-a0f0618cfe6&title=&width=845)
> Ref：搜索条件为二级索引列与常数等值比较，采用二级索引来执行查询的访问方法。
> - 例：SELECT * FROM single_table WHERE key_part1 = 'god like' AND key_part2 = 'legendary' AND key_part3 = 'penta kill';

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696836027200-de35b700-6f1c-40b4-b0f9-a88118875265.png#averageHue=%23fbfaf9&clientId=ud38c2c1f-f5f2-4&from=paste&height=606&id=u1211fe36&originHeight=606&originWidth=762&originalType=binary&ratio=1&rotation=0&showTitle=false&size=100822&status=done&style=none&taskId=u05626ece-c546-48ea-a9dc-6230c949b86&title=&width=762)
> Ref_or_Null：二级索引列的值等于某个常数的记录，还想把该列的值为NULL的记录也找出来。
> - SELECT * FROM single_demo WHERE key1 = 'abc' OR key1 IS NULL;

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696836065229-dfc7a25f-7117-43ed-94bb-1cd8aeccdf79.png#averageHue=%23fbf9f7&clientId=ud38c2c1f-f5f2-4&from=paste&height=597&id=u9db0ed7f&originHeight=597&originWidth=757&originalType=binary&ratio=1&rotation=0&showTitle=false&size=114111&status=done&style=none&taskId=uc335de44-e0db-4262-a448-20041f8db74&title=&width=757)

> Range：索引列需要匹配某个或某些范围的值。
> - 例：SELECT * FROM single_table WHERE key2 IN (1438, 6328) OR (key2 >= 38 AND key2 <= 79);

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696836100511-e7b6d3a3-adbf-467d-bcc5-60c958b9f827.png#averageHue=%23fbfafa&clientId=ud38c2c1f-f5f2-4&from=paste&height=150&id=u00bde9fc&originHeight=150&originWidth=654&originalType=binary&ratio=1&rotation=0&showTitle=false&size=8493&status=done&style=none&taskId=u3de39505-6148-44b9-9c75-ab0582aa33e&title=&width=654)
> Index：搜索结果与搜索条件只命中索引，可以通过联合索引直接返回结果，不进行回表。
> - 例：SELECT key_part1, key_part2, key_part3 FROM single_table WHERE key_part2 = 'abc';

> All：全表扫描执行查询。

### 索引合并
> MySQL在一般情况下执行一个查询时最多只会用到单个二级索引，但不是还有特殊情况么，在这些特殊情况下也可能在一个查询中使用到多个二级索引，设计MySQL的大佬把这种使用到多个索引来完成一次查询的执行方法称之为：index merge，具体的索引合并算法有下面三种。

> Intersection合并：交集
> - 读取多个二级索引，取交集ID，On复杂度，减少回表随机OI操作

优化情况

- 情况一：二级索引列是等值匹配的情况，对于联合索引来说，在联合索引中的每个列都必须等值匹配，不能出现只匹配部分列的情况。
- 情况二：主键列可以是范围匹配（二级索引采用：索引列+值的方式）

联合索引代替

- 常结合两者情况，直接使用二级索引，加快效率，减少B+树的维护
> Union合并：并集

优化情况：

- 情况一：二级索引列是等值匹配的情况，对于联合索引来说，在联合索引中的每个列都必须等值匹配，不能出现只出现匹配部分列的情况。
- 情况二：主键列可以是范围匹配
- 情况三：使用Intersection索引合并的搜索条件
> Sort-Union合并：对主键ID排序合并

优化情况：

- 二级索引返回的ID较少的时候
> 注意： 真实情况的时候，不一定会按照此情况进行优化，只有索引结果比较少的时候，才会进行如此优化。同时，我们在设计sql语句的时候，可以控制单一条件，设置为TRUE，最后依次合并，看清逻辑，简化优化语句。


---


## MySQL连接原理：多表如何关联
> 上面我们讲了多表的情况，那么我们来讲了多表之间的情况。
> 可能会涉及一些线性代数的知识？但是不会也问题不大。

### 连接的过程与类型
> 连接的过程，依赖于驱动表。
> 驱动表一次，被驱动表可能访问多次

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696837035025-eed3a2c5-8cb8-4867-9be7-1536a2f26fa1.png#averageHue=%23fdfdfd&clientId=ud38c2c1f-f5f2-4&from=paste&height=435&id=u2e367744&originHeight=435&originWidth=1060&originalType=binary&ratio=1&rotation=0&showTitle=false&size=43400&status=done&style=none&taskId=uc27f46ba-57b6-47f6-89f2-d68a6219154&title=&width=1060)
> 对于连接类型来说，有内连接和外连接。

- 对于内连接的两个表，驱动表中的记录在被驱动表中找不到匹配的记录，该记录不会加入到最后的结果集
> 该情况下：驱动表与被驱动表可以互换，不影响结果

- 对于外连接的两个表，驱动表中的记录即使在被驱动表中没有匹配的记录，也仍然需要加入到结果集
> - SELECT * FROM t1 LEFT [OUTER] JOIN t2 ON 连接条件 [WHERE 普通过滤条件];
> - SELECT * FROM t1 RIGHT [OUTER] JOIN t2 ON 连接条件 [WHERE 普通过滤条件];Cop

> 连接条件：
> - on：会补充null
> - where

### 连接的原理
> 嵌套循环连接：听名字就知道是暴力循环进行匹配。

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696837172510-95f17ebd-2e7d-4e8f-aa9e-5d6e2017689b.png#averageHue=%23fcfcfc&clientId=ud38c2c1f-f5f2-4&from=paste&height=632&id=u5c2f27e6&originHeight=632&originWidth=1144&originalType=binary&ratio=1&rotation=0&showTitle=false&size=128722&status=done&style=none&taskId=u3292209d-65a7-4873-b650-3daaadfc847&title=&width=1144)
> 索引加快连接：index的访问方法来查询被驱动表

> 基于块的嵌套循环连接：把被驱动表读处理，匹配完之后再丢弃，减少IO访问

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696837209487-5e31475b-12ce-4578-8889-32f6f14d0477.png#averageHue=%23fbf8f5&clientId=ud38c2c1f-f5f2-4&from=paste&height=479&id=u02361667&originHeight=479&originWidth=826&originalType=binary&ratio=1&rotation=0&showTitle=false&size=55058&status=done&style=none&taskId=uc098d0d7-44c8-48fd-af4a-87b361f5efe&title=&width=826)
> 注意：不要把*作为查询列表，只需要把我们关心的列放到查询列表就好了，这样还可以在join buffer中放置更多的记录，而使用索引index的时候，也可以命中。


---


## MySQL查询工具：优化百科书
> 设计MySQL的大佬贴心的为我们提供了一些工具来帮助我们查看某个查询语句的具体执行计划，以及为什么这样执行。方便我们了解。下面我对其进行一个简单介绍。

### Explain简介
> 使用方式：EXPLAIN + 语句
> 更多信息，使用JSON：FORMAT=JSON
> 实际执行语句参考：SHOW WARNINGS

| **列名** | **描述** |
| --- | --- |
| id | 在一个大的查询语句中每个SELECT关键字都对应一个唯一的id |
| select_type | SELECT关键字对应的那个查询的类型 |
| table | 表名 |
| partitions | 匹配的分区信息 |
| type | 针对单表的访问方法 |
| possible_keys | 可能用到的索引 |
| key | 实际上使用的索引 |
| key_len | 实际使用到的索引长度 |
| ref | 当使用索引列等值查询时，与索引列进行等值匹配的对象信息 |
| rows | 预估的需要读取的记录条数 |
| filtered | 某个表经过搜索条件过滤后剩余记录条数的百分比 |
| Extra | 一些额外的信息 |

### Optimizer trace简介
> 使用方式如下：

```java
# 1. 打开optimizer trace功能 (默认情况下它是关闭的):
SET optimizer_trace="enabled=on";

# 2. 这里输入你自己的查询语句
SELECT ...; 

# 3. 从OPTIMIZER_TRACE表中查看上一个查询的优化过程
SELECT * FROM information_schema.OPTIMIZER_TRACE;

# 4. 可能你还要观察其他语句执行的优化过程，重复上面的第2、3步
...

# 5. 当你停止查看语句的优化过程时，把optimizer trace功能关闭
SET optimizer_trace="enabled=off";

```

- 对于单表关注：rows_estimation，方案成本
- 对于多表关注：considered_execution_plans，不同连接成本
> 他的信息有点多，我们主要关注成本？
> 啊，什么是成本？MySQL在进行方案选择的时候，会进行成本计算，最后选择最优的方案。
> 这种方案是一种基于历史数据的预估，大体了解即可，不细节规则。

```java
*************************** 1. row ***************************
# 分析的查询语句是什么
QUERY: SELECT * FROM s1 WHERE
    key1 > 'z' AND
    key2 < 1000000 AND
    key3 IN ('a', 'b', 'c') AND
    common_field = 'abc'

# 优化的具体过程
TRACE: {
  "steps": [
    {
      "join_preparation": {     # prepare阶段
        "select#": 1,
        "steps": [
          {
            "IN_uses_bisection": true
          },
          {
            "expanded_query": "/* select#1 */ select `s1`.`id` AS `id`,`s1`.`key1` AS `key1`,`s1`.`key2` AS `key2`,`s1`.`key3` AS `key3`,`s1`.`key_part1` AS `key_part1`,`s1`.`key_part2` AS `key_part2`,`s1`.`key_part3` AS `key_part3`,`s1`.`common_field` AS `common_field` from `s1` where ((`s1`.`key1` > 'z') and (`s1`.`key2` < 1000000) and (`s1`.`key3` in ('a','b','c')) and (`s1`.`common_field` = 'abc'))"
          }
        ] /* steps */
      } /* join_preparation */
    },
    {
      "join_optimization": {    # optimize阶段
        "select#": 1,
        "steps": [
          {
            "condition_processing": {   # 处理搜索条件
              "condition": "WHERE",
              # 原始搜索条件
              "original_condition": "((`s1`.`key1` > 'z') and (`s1`.`key2` < 1000000) and (`s1`.`key3` in ('a','b','c')) and (`s1`.`common_field` = 'abc'))",
              "steps": [
                {
                  # 等值传递转换
                  "transformation": "equality_propagation",
                  "resulting_condition": "((`s1`.`key1` > 'z') and (`s1`.`key2` < 1000000) and (`s1`.`key3` in ('a','b','c')) and (`s1`.`common_field` = 'abc'))"
                },
                {
                  # 常量传递转换    
                  "transformation": "constant_propagation",
                  "resulting_condition": "((`s1`.`key1` > 'z') and (`s1`.`key2` < 1000000) and (`s1`.`key3` in ('a','b','c')) and (`s1`.`common_field` = 'abc'))"
                },
                {
                  # 去除没用的条件
                  "transformation": "trivial_condition_removal",
                  "resulting_condition": "((`s1`.`key1` > 'z') and (`s1`.`key2` < 1000000) and (`s1`.`key3` in ('a','b','c')) and (`s1`.`common_field` = 'abc'))"
                }
              ] /* steps */
            } /* condition_processing */
          },
          {
            # 替换虚拟生成列
            "substitute_generated_columns": {
            } /* substitute_generated_columns */
          },
          {
            # 表的依赖信息
            "table_dependencies": [
              {
                "table": "`s1`",
                "row_may_be_null": false,
                "map_bit": 0,
                "depends_on_map_bits": [
                ] /* depends_on_map_bits */
              }
            ] /* table_dependencies */
          },
          {
            "ref_optimizer_key_uses": [
            ] /* ref_optimizer_key_uses */
          },
          {
          
            # 预估不同单表访问方法的访问成本
            "rows_estimation": [
              {
                "table": "`s1`",
                "range_analysis": {
                  "table_scan": {   # 全表扫描的行数以及成本
                    "rows": 9688,
                    "cost": 2036.7
                  } /* table_scan */,
                  
                  # 分析可能使用的索引
                  "potential_range_indexes": [
                    {
                      "index": "PRIMARY",   # 主键不可用
                      "usable": false,
                      "cause": "not_applicable"
                    },
                    {
                      "index": "idx_key2",  # idx_key2可能被使用
                      "usable": true,
                      "key_parts": [
                        "key2"
                      ] /* key_parts */
                    },
                    {
                      "index": "idx_key1",  # idx_key1可能被使用
                      "usable": true,
                      "key_parts": [
                        "key1",
                        "id"
                      ] /* key_parts */
                    },
                    {
                      "index": "idx_key3",  # idx_key3可能被使用
                      "usable": true,
                      "key_parts": [
                        "key3",
                        "id"
                      ] /* key_parts */
                    },
                    {
                      "index": "idx_key_part",  # idx_keypart不可用
                      "usable": false,
                      "cause": "not_applicable"
                    }
                  ] /* potential_range_indexes */,
                  "setup_range_conditions": [
                  ] /* setup_range_conditions */,
                  "group_index_range": {
                    "chosen": false,
                    "cause": "not_group_by_or_distinct"
                  } /* group_index_range */,
                  
                  # 分析各种可能使用的索引的成本
                  "analyzing_range_alternatives": {
                    "range_scan_alternatives": [
                      {
                        # 使用idx_key2的成本分析
                        "index": "idx_key2",
                        # 使用idx_key2的范围区间
                        "ranges": [
                          "NULL < key2 < 1000000"
                        ] /* ranges */,
                        "index_dives_for_eq_ranges": true,   # 是否使用index dive
                        "rowid_ordered": false,     # 使用该索引获取的记录是否按照主键排序
                        "using_mrr": false,     # 是否使用mrr
                        "index_only": false,    # 是否是索引覆盖访问
                        "rows": 12,     # 使用该索引获取的记录条数
                        "cost": 15.41,  # 使用该索引的成本
                        "chosen": true  # 是否选择该索引
                      },
                      {
                        # 使用idx_key1的成本分析
                        "index": "idx_key1",
                        # 使用idx_key1的范围区间
                        "ranges": [
                          "z < key1"
                        ] /* ranges */,
                        "index_dives_for_eq_ranges": true,   # 同上
                        "rowid_ordered": false,   # 同上
                        "using_mrr": false,   # 同上
                        "index_only": false,   # 同上
                        "rows": 266,   # 同上
                        "cost": 320.21,   # 同上
                        "chosen": false,   # 同上
                        "cause": "cost"   # 因为成本太大所以不选择该索引
                      },
                      {
                        # 使用idx_key3的成本分析
                        "index": "idx_key3",
                        # 使用idx_key3的范围区间
                        "ranges": [
                          "a <= key3 <= a",
                          "b <= key3 <= b",
                          "c <= key3 <= c"
                        ] /* ranges */,
                        "index_dives_for_eq_ranges": true,   # 同上
                        "rowid_ordered": false,   # 同上
                        "using_mrr": false,   # 同上
                        "index_only": false,   # 同上
                        "rows": 21,   # 同上
                        "cost": 28.21,   # 同上
                        "chosen": false,   # 同上
                        "cause": "cost"   # 同上
                      }
                    ] /* range_scan_alternatives */,
                    
                    # 分析使用索引合并的成本
                    "analyzing_roworder_intersect": {
                      "usable": false,
                      "cause": "too_few_roworder_scans"
                    } /* analyzing_roworder_intersect */
                  } /* analyzing_range_alternatives */,
                  
                  # 对于上述单表查询s1最优的访问方法
                  "chosen_range_access_summary": {
                    "range_access_plan": {
                      "type": "range_scan",
                      "index": "idx_key2",
                      "rows": 12,
                      "ranges": [
                        "NULL < key2 < 1000000"
                      ] /* ranges */
                    } /* range_access_plan */,
                    "rows_for_plan": 12,
                    "cost_for_plan": 15.41,
                    "chosen": true
                  } /* chosen_range_access_summary */
                } /* range_analysis */
              }
            ] /* rows_estimation */
          },
          {
            
            # 分析各种可能的执行计划
            #（对多表查询这可能有很多种不同的方案，单表查询的方案上面已经分析过了，直接选取idx_key2就好）
            "considered_execution_plans": [
              {
                "plan_prefix": [
                ] /* plan_prefix */,
                "table": "`s1`",
                "best_access_path": {
                  "considered_access_paths": [
                    {
                      "rows_to_scan": 12,
                      "access_type": "range",
                      "range_details": {
                        "used_index": "idx_key2"
                      } /* range_details */,
                      "resulting_rows": 12,
                      "cost": 17.81,
                      "chosen": true
                    }
                  ] /* considered_access_paths */
                } /* best_access_path */,
                "condition_filtering_pct": 100,
                "rows_for_plan": 12,
                "cost_for_plan": 17.81,
                "chosen": true
              }
            ] /* considered_execution_plans */
          },
          {
            # 尝试给查询添加一些其他的查询条件
            "attaching_conditions_to_tables": {
              "original_condition": "((`s1`.`key1` > 'z') and (`s1`.`key2` < 1000000) and (`s1`.`key3` in ('a','b','c')) and (`s1`.`common_field` = 'abc'))",
              "attached_conditions_computation": [
              ] /* attached_conditions_computation */,
              "attached_conditions_summary": [
                {
                  "table": "`s1`",
                  "attached": "((`s1`.`key1` > 'z') and (`s1`.`key2` < 1000000) and (`s1`.`key3` in ('a','b','c')) and (`s1`.`common_field` = 'abc'))"
                }
              ] /* attached_conditions_summary */
            } /* attaching_conditions_to_tables */
          },
          {
            # 再稍稍的改进一下执行计划
            "refine_plan": [
              {
                "table": "`s1`",
                "pushed_index_condition": "(`s1`.`key2` < 1000000)",
                "table_condition_attached": "((`s1`.`key1` > 'z') and (`s1`.`key3` in ('a','b','c')) and (`s1`.`common_field` = 'abc'))"
              }
            ] /* refine_plan */
          }
        ] /* steps */
      } /* join_optimization */
    },
    {
      "join_execution": {    # execute阶段
        "select#": 1,
        "steps": [
        ] /* steps */
      } /* join_execution */
    }
  ] /* steps */
}

# 因优化过程文本太多而丢弃的文本字节大小，值为0时表示并没有丢弃
MISSING_BYTES_BEYOND_MAX_MEM_SIZE: 0

# 权限字段
INSUFFICIENT_PRIVILEGES: 0

1 row in set (0.00 sec)

```

---


## MySQL表空间：浅赏数据结构美感
> 从 InnoDB存储引擎的逻辑存储结构看,所有数据都被逻辑地存放在一个空间中,称之为表空间( tablespace)。**表空间又由段(segment)、区( extent)、页(page)组成**。页在一些文档中有时也称为块( block), InnoDB存储引擎的逻辑存储结构大致如图所示。

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696839190387-45ed0102-1b6e-4e1c-8a8b-31c3552ba920.png#averageHue=%23dddddd&clientId=ud38c2c1f-f5f2-4&from=paste&id=uc1407cb6&originHeight=587&originWidth=896&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u1f3103b3-524a-4d0f-9d9d-40e3637bd61&title=)
> 为什么这样设计？
> 其实MySQL设计，为什么，完全都遵循着一套逻辑！
> 即提升性能、方便管理。
> 把相同的东西放在一起，在扫描的时候，就是线性IO，这种空间开销带来的性能提升，值得！！！

当然，如果你想更进一步了解底层，可以来看看下面这张表空间图，你会感受到数据结构美感！<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696839327828-63609e58-fa27-4e44-b6c1-c7f9b89fd42a.png#averageHue=%23f9f9f9&clientId=ud38c2c1f-f5f2-4&from=paste&height=3476&id=uc998b66e&originHeight=3476&originWidth=6102&originalType=binary&ratio=1&rotation=0&showTitle=false&size=3547524&status=done&style=none&taskId=u8253946b-703c-42a3-ba93-0a4c34cb7f6&title=&width=6102)

---


## MySQL高级运用：回归应用层
> 在上面的讲解中，我想大家大体都知道MySQL从上到下的一些大体设计以及运行逻辑。
> 接下来，我们来思考现实生活的一些常见应用案例。

### 读写分离
> 根据读写分离的名字，我们就可以知道：**读写分离主要是为了将对数据库的读写操作分散到不同的数据库节点上。** 这样的话，就能够小幅提升写性能，大幅提升读性能。

我们上面知道，读锁与写锁之间的兼容性问题，所以读写分离，我们就能极大提高性能，提高极大的并发性。<br />![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696839745214-ad5abcdd-8db2-484d-ba79-5cc0c03e0a56.png#averageHue=%23f9f8f6&clientId=ud38c2c1f-f5f2-4&from=paste&height=381&id=u07e4a30d&originHeight=381&originWidth=643&originalType=binary&ratio=1&rotation=0&showTitle=false&size=17577&status=done&style=none&taskId=ud52299d0-7b13-45d5-816c-36e8c2ec568&title=&width=643)<br />一般情况下，我们都会选择一主多从，也就是一台主数据库负责写，其他的从数据库负责读。主库和从库之间会进行数据同步，以保证从库中数据的准确性。这样的架构实现起来比较简单，并且也符合系统的写少读多的特点。
> 当然，读写分离之后，同步就成为了一个问题。
> 他是如何进行同步的？答案：binlog！是不是，这样就串起来了。

![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696839892840-37a3a345-e7bd-4d23-a92b-f7d0edc875d9.png#averageHue=%23ffffff&clientId=ud38c2c1f-f5f2-4&from=paste&id=ube2e7787&originHeight=1234&originWidth=1720&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u63bbcab2-a2b4-4360-b7e1-b6214125f2d&title=)
> - 主库将数据库中数据的变化写入到 binlog
> - 从库连接主库
> - 从库会创建一个 I/O 线程向主库请求更新的 binlog
> - 主库会创建一个 binlog dump 线程来发送 binlog ，从库中的 I/O 线程负责接收
> - 从库的 I/O 线程将接收的 binlog 写入到 relay log 中。
> - 从库的 SQL 线程读取 relay log 同步数据本地（也就是再执行一遍 SQL ）。

> 同步问题解决了，当时，主从同步延迟又应该如何解决？
> - 强制将请求路由到主库处理：即从主库读
> - 延迟读取：在同步之后才读取，但该方法会损失速度

### 分库分表
> 读写分离主要应对的是数据库读并发，没有解决数据库存储问题。试想一下：**如果 MySQL 一张表的数据量过大怎么办?**
> 换言之，**我们该如何解决 MySQL 的存储压力呢？**
> 答案之一就是 **分库分表**。

分库分表有两种维度：横向与纵向。<br />![](https://cdn.nlark.com/yuque/0/2023/png/29466846/1696840105827-79a688dc-c2dd-42c6-aef2-fbfac3cba0a0.png#averageHue=%23b3dad1&clientId=ud38c2c1f-f5f2-4&from=paste&id=u014db689&originHeight=504&originWidth=994&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u663e62b4-be09-44b8-b852-85ec578ef29&title=)
> 那么问题来了，如何分，何时需要分？

遇到下面几种场景可以考虑分库分表：

- 单表的数据达到千万级别以上，数据库读写速度比较缓慢。
- 数据库中的数据占用的空间越来越大，备份时间越来越长。
- 应用的并发量太大。

分片算法主要解决了数据被水平分片之后，数据究竟该存放在哪个表的问题。

- **哈希分片**：求指定 key（比如 id） 的哈希，然后根据哈希值确定数据应被放置在哪个表中。哈希分片比较适合随机读写的场景，不太适合经常需要范围查询的场景。
- **范围分片**：按照特性的范围区间（比如时间区间、ID 区间）来分配数据，比如 将 id 为 1~299999 的记录分到第一个库， 300000~599999 的分到第二个库。范围分片适合需要经常进行范围查找的场景，不太适合随机读写的场景（数据未被分散，容易出现热点数据的问题）。
- **地理位置分片**：很多 NewSQL 数据库都支持地理位置分片算法，也就是根据地理位置（如城市、地域）来分配数据。
- **融合算法**：灵活组合多种分片算法，比如将哈希分片和范围分片组合。
> 当然问题还不止这些，这涉及到分布式架构设计的很多思考，包括业务问题，分布式ID。这里就不进行细讲。因为可以扯很多。

> 最后，还有一个问题，数据如何进行迁移？即我们如何将老库（单库单表）的数据迁移到新库（分库分表后的数据库系统）呢？

比较简单同时也是非常常用的方案就是**停机迁移**，写个脚本老库的数据写到新库中。比如你在凌晨 2 点，系统使用的人数非常少的时候，挂一个公告说系统要维护升级预计 1 小时。然后，你写一个脚本将老库的数据都同步到新库中。<br />如果你不想停机迁移数据的话，也可以考虑**双写方案**。双写方案是针对那种不能停机迁移的场景，实现起来要稍微麻烦一些。具体原理是这样的：

- 我们对老库的更新操作（增删改），同时也要写入新库（双写）。如果操作的数据不存在于新库的话，需要插入到新库中。 这样就能保证，咱们新库里的数据是最新的。
- 在迁移过程，双写只会让被更新操作过的老库中的数据同步到新库，我们还需要自己写脚本将老库中的数据和新库的数据做比对。如果新库中没有，那咱们就把数据插入到新库。如果新库有，旧库没有，就把新库对应的数据删除（冗余数据清理）。
- 重复上一步的操作，直到老库和新库的数据一致为止。

想要在项目中实施双写还是比较麻烦的，很容易会出现问题。我们可以借助上面提到的数据库同步工具 Canal 做增量数据迁移（还是依赖 binlog，开发和维护成本较低）。
## MySQL总结
到此，我们自顶向下的串起了MySQL。我们要学会像MySQL执行过程一样，去思考每一天SQL语句是如何执行的。这样，在优化的时候，我们也知道从哪里进行切入。当然，MySQL的内容不止如此，我们的思考，都是在单一的服务器，单一的数据库上去进行思考。随着现在的发展，我们的数据库是一个庞大的集群，需要我们去学习更多知识，从而从更多的层面上去提升性能！笔者是个大二的后端小白，在努力学习更多知识。期待我能带来有价值的实战篇目吧！

> 参考：
> 《高性能MySQL》
> 《MySQL实战45讲》
> 《MySQL是怎样运行的》
> 《JavaGuide》

