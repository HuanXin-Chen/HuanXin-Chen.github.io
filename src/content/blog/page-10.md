---
title: 分布式ID中的SnowFlake
description: 什么是雪花算法？
pubDatetime: 2023-08-28
published: true
ogImage: ../../assets/10.png
language: cn
tags:
  - 后端技术
---

> 雪花算法这一在分布式架构中很常见的玩意，但一般也不需要怎么去深入了解，一方面一般个人项目用不到分布式之类的大型架构，另一方面，就算要用到，市面上很多ID生成器也帮我们完成了这项工作。不过出于学习，本文也简单来介绍一下它的实现和原理。

## 分布式ID的特点

- 全局唯一性
- 递增性
- 高可用性
- 高性能性

对此的常见解决方案有UUID、SnowFlake、UidGenerator、Leaf。<br />我们今天主角便是SnowFlake。

## 起源

一般的雪花大约由10^19个水分子组成。在雪花形成过程中，会形成不同的结构分支，所以说大自然中不存在两片完全一样的雪花，每一片雪花都拥有自己漂亮独特的形状。<br />雪花算法表示生成的id如雪花般独一无二。snowflake是Twitter开源的分布式ID生成算法，结果是一个long型的ID。<br />其核心思想是：使用41bit作为毫秒数，10bit作为机器的ID（5个bit是数据中心，5个bit的机器ID），12bit作为毫秒内的流水号（意味着每个节点在每毫秒可以产生 4096 个 ID），最后还有一个符号位，永远是0。

## 具体介绍

他的原理分四部分：

- 1位是符号位，也就是最高位，始终是0，没有任何意义，**因为要是唯一计算机二进制补码中就是负数，0才是正数。**
- 41位是时间戳，具体到毫秒，**41位的二进制可以使用69年，因为时间理论上永恒递增**，所以根据这个排序是可以的。

```java
2^41/1000*60*60*24*365 = 69
```

- 10位是机器标识，可以全部用作机器ID，也可以用来标识机房ID + 机器ID，**10位最多可以表示1024台机器。**
- 12位是计数序列号，也就是同一台机器上同一时间，理论上还可以同时生成不同的ID，12位的序列号能够区分出4096个ID，所以**最大可以支持单节点差不多四百万的并发量，这个妥妥的够用了。**

![image.png](https://cdn.nlark.com/yuque/0/2023/png/29466846/1693235966800-8ea3de7e-513f-4d11-a3f2-e43325e06c20.png#averageHue=%23f9f8f8&clientId=u13ceb42f-59d1-4&from=paste&height=542&id=uae095c15&originHeight=542&originWidth=1214&originalType=binary&ratio=1&rotation=0&showTitle=false&size=139225&status=done&style=none&taskId=ud31944d2-4175-4afa-956c-04bbbec0106&title=&width=1214)

### 场景应用举例

我们通过对过滤器实现对所有请求自动生成雪花ID，从而方便线上定位问题。<br />因为雪花ID的特性，让我们可以追溯问题，定位错误。

- 唯一性：确保每个请求都有一个唯一的标识符。这对于线上定位问题非常重要，因为可以通过雪花ID追踪和区分不同的请求，帮助定位和分析问题。
- 可追溯性：雪花ID是基于时间戳生成的，因此可以通过雪花ID了解请求的发生时间。这对于排查问题、分析请求处理时间以及进行日志记录和审计非常有用。

如下，我们可以通过实现拦截器，生成雪花ID，附加到日志，这样后续定位问题将会非常方便。

```java

/**
 * 请求日志过滤器，用于记录所有用户请求信息
 */
@Slf4j
@Component
public class RequestLogFilter extends OncePerRequestFilter {

    @Resource
    SnowflakeIdGenerator generator;

    private final Set<String> ignores = Set.of("/swagger-ui", "/v3/api-docs");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        if(this.isIgnoreUrl(request.getServletPath())) {
            filterChain.doFilter(request, response);
        } else {
            long startTime = System.currentTimeMillis();
            this.logRequestStart(request);
            ContentCachingResponseWrapper wrapper = new ContentCachingResponseWrapper(response);
            filterChain.doFilter(request, wrapper);
            this.logRequestEnd(wrapper, startTime);
            wrapper.copyBodyToResponse();
        }
    }

    /**
     * 判定当前请求url是否不需要日志打印
     * @param url 路径
     * @return 是否忽略
     */
    private boolean isIgnoreUrl(String url){
        for (String ignore : ignores) {
            if(url.startsWith(ignore)) return true;
        }
        return false;
    }

    /**
     * 请求结束时的日志打印，包含处理耗时以及响应结果
     * @param wrapper 用于读取响应结果的包装类
     * @param startTime 起始时间
     */
    public void logRequestEnd(ContentCachingResponseWrapper wrapper, long startTime){
        long time = System.currentTimeMillis() - startTime;
        int status = wrapper.getStatus();
        String content = status != 200 ?
                status + " 错误" : new String(wrapper.getContentAsByteArray());
        log.info("请求处理耗时: {}ms | 响应结果: {}", time, content);
    }

    /**
     * 请求开始时的日志打印，包含请求全部信息，以及对应用户角色
     * @param request 请求
     */
    public void logRequestStart(HttpServletRequest request){
        long reqId = generator.nextId();
        MDC.put("reqId", String.valueOf(reqId));
        JSONObject object = new JSONObject();
        request.getParameterMap().forEach((k, v) -> object.put(k, v.length > 0 ? v[0] : null));
        Object id = request.getAttribute(Const.ATTR_USER_ID);
        if(id != null) {
            User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            log.info("请求URL: \"{}\" ({}) | 远程IP地址: {} │ 身份: {} (UID: {}) | 角色: {} | 请求参数列表: {}",
                    request.getServletPath(), request.getMethod(), request.getRemoteAddr(),
                    user.getUsername(), id, user.getAuthorities(), object);
        } else {
            log.info("请求URL: \"{}\" ({}) | 远程IP地址: {} │ 身份: 未验证 | 请求参数列表: {}",
                    request.getServletPath(), request.getMethod(), request.getRemoteAddr(), object);
        }
    }
}

```

## 雪花ID生成器实现

讲完雪花ID的应用，我们就来讲讲它的实现。<br />显然，它的原理非常简单，我们用代码自己实现一个雪花ID生成器。

```java
package com.example.utils;

import org.springframework.stereotype.Component;

/**
 * 雪花算法ID生成器
 */
//该雪花ID生成器可以生成唯一的、有序的分布式ID，其中包含了时间戳、数据中心ID、工作节点ID和序列号等信息。
@Component
public class SnowflakeIdGenerator {
    private static final long START_TIMESTAMP = 1691087910202L; //起始时间戳，用于计算时间戳部分。

    private static final long DATA_CENTER_ID_BITS = 5L; //数据中心ID的位数。
    private static final long WORKER_ID_BITS = 5L; //工作节点ID的位数。
    private static final long SEQUENCE_BITS = 12L; //序列号的位数。

    private static final long MAX_DATA_CENTER_ID = ~(-1L << DATA_CENTER_ID_BITS); //数据中心ID的最大值。
    private static final long MAX_WORKER_ID = ~(-1L << WORKER_ID_BITS); //工作节点ID的最大值。
    private static final long MAX_SEQUENCE = ~(-1L << SEQUENCE_BITS); //序列号的最大值。

    private static final long WORKER_ID_SHIFT = SEQUENCE_BITS; //工作节点ID的位移量。
    private static final long DATA_CENTER_ID_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS; //数据中心ID的位移量。
    private static final long TIMESTAMP_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS + DATA_CENTER_ID_BITS; //时间戳的位移量。

    //数据中心ID、工作节点ID、上一次生成ID的时间戳和序列号等属性。
    private final long dataCenterId;
    private final long workerId;
    private long lastTimestamp = -1L;
    private long sequence = 0L;

    public SnowflakeIdGenerator(){
        this(1, 1);
    }

    //构造函数中对数据中心ID和工作节点ID进行了合法性检查，并将它们赋值给对应的属性。
    private SnowflakeIdGenerator(long dataCenterId, long workerId) {
        if (dataCenterId > MAX_DATA_CENTER_ID || dataCenterId < 0) {
            throw new IllegalArgumentException("Data center ID can't be greater than " + MAX_DATA_CENTER_ID + " or less than 0");
        }
        if (workerId > MAX_WORKER_ID || workerId < 0) {
            throw new IllegalArgumentException("Worker ID can't be greater than " + MAX_WORKER_ID + " or less than 0");
        }
        this.dataCenterId = dataCenterId;
        this.workerId = workerId;
    }

    /**
     * 生成一个新的雪花算法ID加锁
     * @return 雪花ID
     */
    public synchronized long nextId() {
        long timestamp = getCurrentTimestamp();
        //首先获取当前的时间戳。如果时间戳小于上一次生成ID的时间戳，抛出异常，因为时间戳不应该后退。
        if (timestamp < lastTimestamp) {
            throw new IllegalStateException("Clock moved backwards. Refusing to generate ID.");
        }
        //如果时间戳与上一次生成ID的时间戳相同，递增序列号。如果序列号达到最大值，说明在同一毫秒内已经生成了足够多的ID，需要等待下一毫秒。
        if (timestamp == lastTimestamp) {
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) {
                timestamp = getNextTimestamp(lastTimestamp);
            }
        } else { //如果时间戳与上一次生成ID的时间戳不同，重置序列号为0。
            sequence = 0L;
        }
        //更新上一次生成ID的时间戳为当前时间戳。
        lastTimestamp = timestamp;
        //根据时间戳、数据中心ID、工作节点ID和序列号，通过位运算生成最终的雪花ID。
        return ((timestamp - START_TIMESTAMP) << TIMESTAMP_SHIFT) |
                (dataCenterId << DATA_CENTER_ID_SHIFT) |
                (workerId << WORKER_ID_SHIFT) |
                sequence;
    }

    //getCurrentTimestamp 方法用于获取当前的时间戳。
    private long getCurrentTimestamp() {
        return System.currentTimeMillis();
    }

    //getNextTimestamp 方法用于获取下一个时间戳，如果当前时间戳小于等于上一次生成ID的时间戳，就一直循环获取，直到获得一个更大的时间戳。
    private long getNextTimestamp(long lastTimestamp) {
        long timestamp = getCurrentTimestamp();
        while (timestamp <= lastTimestamp) {
            timestamp = getCurrentTimestamp();
        }
        return timestamp;
    }
}

```

代码注释都写得比较完善，其实就是把我们的原理和算法，用代码写出来。不过我们关注一下代码里面的一个细节。

### 为何要加锁

```java
    /**
     * 生成一个新的雪花算法ID加锁
     * @return 雪花ID
     */
    public synchronized long nextId() {
        long timestamp = getCurrentTimestamp();
        //首先获取当前的时间戳。如果时间戳小于上一次生成ID的时间戳，抛出异常，因为时间戳不应该后退。
        if (timestamp < lastTimestamp) {
            throw new IllegalStateException("Clock moved backwards. Refusing to generate ID.");
        }
        //如果时间戳与上一次生成ID的时间戳相同，递增序列号。如果序列号达到最大值，说明在同一毫秒内已经生成了足够多的ID，需要等待下一毫秒。
        if (timestamp == lastTimestamp) {
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) {
                timestamp = getNextTimestamp(lastTimestamp);
            }
        } else { //如果时间戳与上一次生成ID的时间戳不同，重置序列号为0。
            sequence = 0L;
        }
        //更新上一次生成ID的时间戳为当前时间戳。
        lastTimestamp = timestamp;
        //根据时间戳、数据中心ID、工作节点ID和序列号，通过位运算生成最终的雪花ID。
        return ((timestamp - START_TIMESTAMP) << TIMESTAMP_SHIFT) |
                (dataCenterId << DATA_CENTER_ID_SHIFT) |
                (workerId << WORKER_ID_SHIFT) |
                sequence;
    }
```

在生成雪花算法ID时加锁的目的是为了确保线程安全性，避免并发情况下出现冲突或不一致的问题。<br />雪花算法生成ID的过程中，涉及到共享的状态变量，比如上一次生成ID的时间戳和序列号。如果多个线程同时调用nextId()方法，没有加锁的情况下，可能会导致以下问题：

- 时间戳回退：在多线程环境下，如果某个线程的时间戳小于上一次生成ID的时间戳，就会抛出异常。这可能是由于系统时间被回拨或者不同的线程获取的系统时间存在差异。通过加锁，每次只有一个线程能够执行生成ID的逻辑，保证了时间戳的递增性。
- 序列号重复：如果多个线程在同一毫秒内生成ID，且没有加锁的情况下，可能会导致序列号重复。这是因为多个线程同时读取了相同的时间戳，然后递增序列号。通过加锁，每次只有一个线程能够递增序列号，确保了序列号的唯一性。

通过在nextId()方法上添加synchronized关键字，实现了对方法级别的互斥访问，即同一时间只有一个线程能够执行该方法，从而保证了生成的雪花ID的唯一性和正确性。

### 一些细节讨论

算法的核心思想很明显，在实际的应用过程中，我们可以根据项目的实际情况，进行适当的修改。

#### 调整比特位分布

很多公司在使用雪花算法时会根据自己的业务需求进行二次改造。<br />举个例子，假设你的公司的业务评估只需要运行10年，而不是默认的69年。然而，你的集群节点数量可能会超过1024个。在这种情况下，你可以对雪花算法进行调整。你可以将时间戳位数调整为39位，并将worker ID调整为12位。此外，你还可以根据业务需求或者机房划分等因素对worker ID进行拆分，比如根据业务拆分或者根据机房拆分等。。<br />通过调整时间戳和worker ID的位数，你可以根据具体需求来平衡雪花算法的时间范围和节点数量。这样可以更好地适应你的业务场景，并确保生成的ID满足要求。

#### workerid生成

方案有很多。比如可以通过jvm启动参数的方式传过来，应用启动的时候获取一个启动参数，保证每个节点启动的时候传入不同的启动参数即可。<br />启动参数一般是通过-D选项传入，示例：

```java
-Dname=value
```

```java
System.getProperty("name");
```

获取，或者通过 @value注解也能拿到。

#### 容器化部署的上述缺陷

现在很多部署都是基于k8s的[容器](https://cloud.tencent.com/product/tke?from_column=20065&from=20065)化部署，这种方案往往是基于同一个yaml文件一键部署多个容器。所以没法通过上面的方法每个节点传入不同的启动参数。这个问题可以通过在代码中根据一些规则计算workerid，比如根据节点的IP地址等。下面给出一个方案：

```java
private static long makeWorkerId() {
        try {
            String hostAddress = Inet4Address.getLocalHost().getHostAddress();
            int[] ips = StringUtils.toCodePoints(hostAddress);
            int sums = 0;
            for (int ip: ips) {
                sums += ip;
            }
            return (sums % 1024);
        } catch (UnknownHostException e) {
            return RandomUtils.nextLong(0, 1024);
        }
    }
```

这里其实是获取了节点的IP地址，然后把ip地址中的每个字节的ascii码值相加然后对最大值取模。当然这种方法是有可能产生重复的id的。

#### 时间回拨问题

在获取时间的时候，可能会出现时间回拨的问题，什么是时间回拨问题呢？就是服务器上的时间突然倒退到之前的时间。

1. 人为原因，把系统环境的时间改了。
2. 有时候不同的机器上需要同步时间，可能不同机器之间存在误差，那么可能会出现时间回拨问题。

对此百度的解决方案如下：（其他大厂也有自己的方案）

- UidGenerator以组件形式工作在应用项目中, 支持自定义workerId位数和初始化策略, 从而适用于[docker](https://link.zhihu.com/?target=https%3A//www.docker.com/)等虚拟化环境下实例自动重启、漂移等场景。 在实现上, UidGenerator通过借用未来时间来解决sequence天然存在的并发限制; 采用RingBuffer来缓存已生成的UID, 并行化UID的生产和消费, 同时对CacheLine补齐，避免了由RingBuffer带来的硬件级「伪共享」问题. 最终单机QPS可达600万。

## 总结

> **没有最好的设计方案，只有合适和不合适的方案。**

雪花算法依赖于时间的一致性，如果发生时间回拨，就可能导致生成的ID出现问题。为了解决这个问题，通常会采用拓展位的方式来增加时间戳的位数。通过增加时间戳位数，可以延长算法可用的时间范围。例如，将时间戳位数设置为42位可以使用139年的时间范围。然而，在实际应用中，很多公司在开始阶段更关注的是生存和发展，因此通常会选择使用较短的时间戳位数。<br />需要注意的是，雪花算法并不是一种完美的解决方案，它也有一些缺点。例如，在单机环境下生成的ID是递增的，但在多台机器上生成的ID只是大致呈递增趋势，并不能严格保证递增。这是因为多台机器之间的时钟可能存在差异，导致生成的ID不是严格按照时间顺序递增。然而，对于大多数应用场景而言，这种大致的递增趋势已经足够满足需求。<br />总而言之，雪花算法是一种常用的ID生成算法，通过时间戳和序列号的组合生成唯一的ID。通过拓展位可以增加时间戳的位数，延长算法可用的时间范围。然而，在实际应用中需要权衡时间戳位数和系统需求，同时也要注意雪花算法的局限性。
